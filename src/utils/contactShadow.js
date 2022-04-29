import {
  Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial,
  OrthographicCamera,
  PlaneBufferGeometry,
  ShaderMaterial,
  WebGLRenderTarget,
} from "three";

import { HorizontalBlurShader } from "@/utils/shaders/HorizontalBlurShader";
import { VerticalBlurShader } from "@/utils/shaders/VerticalBlurShader";

// 参数设置
const state = {
  shadow: {
    blur: 3,
    darkness: 1,
    opacity: 1,
  },
  plane: {
    color: "#ffffff",
    opacity: 1,
  },
};

let renderTarget,
  renderTargetBlur,
  shadowCamera,
  depthMaterial,
  horizontalBlurMaterial,
  verticalBlurMaterial,
  plane,
  blurPlane,
  fillPlane;

const blurShadow = (renderer, amount) => {
  blurPlane.visible = true;

  // blur horizontally and draw in the renderTargetBlur
  blurPlane.material = horizontalBlurMaterial;
  blurPlane.material.uniforms.tDiffuse.value = renderTarget.texture;
  horizontalBlurMaterial.uniforms.h.value = (amount * 1) / 256;

  renderer.setRenderTarget(renderTargetBlur);
  renderer.render(blurPlane, shadowCamera);

  // blur vertically and draw in the main renderTarget
  blurPlane.material = verticalBlurMaterial;
  blurPlane.material.uniforms.tDiffuse.value = renderTargetBlur.texture;
  verticalBlurMaterial.uniforms.v.value = (amount * 1) / 256;

  renderer.setRenderTarget(renderTarget);
  renderer.render(blurPlane, shadowCamera);

  blurPlane.visible = false;
};

export const createContactShadow = (scene, renderer, shadowGroup) => {
  // the render target that will show the shadows in the plane texture
  renderTarget = new WebGLRenderTarget(256, 256);
  renderTarget.texture.generateMipmaps = false;

  // the render target that we will use to blur the first render target
  renderTargetBlur = new WebGLRenderTarget(256, 256);
  renderTargetBlur.texture.generateMipmaps = false;

  // make a plane and make it face up
  const planeGeometry = new PlaneBufferGeometry(10, 10).rotateX(Math.PI / 2);
  const planeMaterial = new MeshBasicMaterial({
    map: renderTarget.texture,
    opacity: 1,
    transparent: true,
    depthWrite: false,
  });
  plane = new Mesh(planeGeometry, planeMaterial);

  // make sure it's rendered after the fillPlane
  plane.renderOrder = 1;
  shadowGroup.add(plane);

  // the y from the texture is flipped!
  plane.scale.y = -1;
  // plane.rotation.set(-Math.PI / 2, 0, 0);

  // the plane onto which to blur the texture/
  blurPlane = new Mesh(planeGeometry);

  blurPlane.visible = false;
  shadowGroup.add(blurPlane);

  // the plane with the color of the ground
  const fillPlaneMaterial = new MeshBasicMaterial({
    color: "#ffffff",
    opacity: 0,
    transparent: true,
    depthWrite: false,
  });
  fillPlane = new Mesh(planeGeometry, fillPlaneMaterial);
  fillPlane.rotateX(Math.PI);
  shadowGroup.add(fillPlane);

  // the camera to render the depth material from
  shadowCamera = new OrthographicCamera(-5, 5, 5, -5, 0, 10);
  // shadowCamera.position.y = 0;
  shadowCamera.rotation.x = Math.PI / 2; // get the camera to look up
  shadowGroup.add(shadowCamera);

  // like MeshDepthMaterial, but goes from black to transparent
  depthMaterial = new MeshDepthMaterial();
  depthMaterial.userData.darkness = { value: 1 };
  depthMaterial.onBeforeCompile = function (shader) {
    shader.uniforms.darkness = depthMaterial.userData.darkness;
    shader.fragmentShader = /* glsl */ `
						uniform float darkness;
						${shader.fragmentShader.replace(
              "gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );",
              "gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );"
            )}
					`;
  };

  depthMaterial.depthTest = false;
  depthMaterial.depthWrite = false;

  horizontalBlurMaterial = new ShaderMaterial(HorizontalBlurShader);
  horizontalBlurMaterial.depthTest = false;

  verticalBlurMaterial = new ShaderMaterial(VerticalBlurShader);
  verticalBlurMaterial.depthTest = false;

  // remove the background
  const initialBackground = scene.background;
  scene.background = null;

  // force the depthMaterial to everything
  const initialOverrideMaterial = scene.overrideMaterial;
  scene.overrideMaterial = depthMaterial;

  // set renderer clear alpha
  const initialClearAlpha = renderer.getClearAlpha();
  renderer.setClearAlpha(0);

  // render to the render target to get the depths
  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, shadowCamera);

  // and reset the override material
  scene.overrideMaterial = null;

  blurShadow(renderer, state.shadow.blur);

  // a second pass to reduce the artifacts
  // (0.4 is the minimum blur amout so that the artifacts are gone)
  blurShadow(renderer, state.shadow.blur * 0.4);

  // reset and render the normal scene
  renderer.setRenderTarget(null);
  renderer.setClearAlpha(initialClearAlpha);
  scene.background = initialBackground;
  scene.overrideMaterial = initialOverrideMaterial;
};
