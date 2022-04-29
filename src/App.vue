<template>
  <div ref="canvas" class="scene">
    <div class="color-picker">
      <div class="light-color-picker color-picker-wrap">
        <div>
          <input v-model="backLightColor" type="color" />
        </div>
        <div>背景光</div>
      </div>
      <div class="car-color-picker color-picker-wrap">
        <div>
          <input v-model="carCoatColor" type="color" />
        </div>
        <div>车身色</div>
      </div>
    </div>
  </div>
</template>
<script setup>
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  SpotLight,
  AmbientLight,
  Group,
  WebGLCubeRenderTarget,
  CubeCamera,
  Mesh,
  Vector3,
  Color,
  SphereGeometry,
  MeshPhongMaterial,
  PlaneGeometry,
  Clock,
  HalfFloatType,
  ACESFilmicToneMapping,
  sRGBEncoding,
  PCFSoftShadowMap,
  DoubleSide,
} from "three";
import { GLTFLoader } from "@/utils/loaders/GLTFLoader";
import { DRACOLoader } from "@/utils/loaders/DRACOLoader";
import { OrbitControls } from "@/utils/controls/OrbitControls";

import {
  getMaterials,
  changModel,
  generateVirtualLight,
  createContactShadow,
  setMovingSpot,
  floatMesh,
  createCustomMaterial,
} from "@/utils/utils";
import { onMounted, onUnmounted, ref, watch } from "vue";

//屏幕长比
const RADIO = window.innerWidth / window.innerHeight;
// 当前显示设备的物理像素分辨率与CSS像素分辨率之比
const DPR = window.devicePixelRatio;

// canvas 容器
const canvas = ref();

// 场景对象
let scene;

// 虚拟场景对象
let virtualScene = new Scene();
// 虚拟背景
let virtualBackgroundMesh;
/**
 * 透视摄像机
 * @param fov 第一个参数是视野角度（FOV）。视野角度就是无论在什么时候，你所能在显示器上看到的场景的范围，它的单位是角度(与弧度区分开)
 * @param ratio 第二个参数是长宽比（aspect ratio）。 也就是你用一个物体的宽除以它的高的值。比如说，当你在一个宽屏电视上播放老电影时，可以看到图像仿佛是被压扁的。
 * @param near 近截面（near）。
 * @param far 远截面（far）。
 * @type {PerspectiveCamera}
 */
let camera = new PerspectiveCamera(30, RADIO);

// 聚光灯对象
const spotLight = new SpotLight();

// 环境光
const ambientLight = new AmbientLight(0x404040);

/**
 * 渲染器，用WebGL渲染出你精心制作的场景
 * 高性能
 * 抗锯齿
 * 开启alpha通道
 * @type {WebGLRenderer}
 */
const renderer = new WebGLRenderer({
  powerPreference: "high-performance",
  antialias: true,
  alpha: true,
});

// 3D 模型对象
let model;

// 模型的接触阴影对象
const shadowGroup = new Group();

// 车身颜色
let carCoatColor = ref();

// 背景光源颜色
let backLightColor = ref("#0000ff");

// 相机控制对象
let controls;

// 相机运动锁
let cameraMoveClock = false;
/**
 * @description 设置相机
 */

const setCamera = () => {
  camera.position.set(-10, 0, 15);
  camera.castShadow = true;

  scene.add(camera);
};

/**
 * @description 设置聚光灯
 */

const setSpotLight = () => {
  spotLight.position.set(0, 15, 0);
  //intensity - (可选参数) 光照强度。 缺省值 1。
  spotLight.intensity = 2;
  //聚光锥的半影衰减百分比。在0和1之间的值。默认为0。
  spotLight.penumbra = 1;
  //从聚光灯的位置以弧度表示聚光灯的最大范围。应该不超过 Math.PI/2。默认值为 Math.PI/3。
  spotLight.angle = 0.3;
  spotLight.shadow.bias = -0.0001;
  spotLight.castShadow = true;

  scene.add(spotLight);
};

/**
 * @description 设置环境光，环境光会均匀的照亮场景中的所有物体。
 */

const setAmbientLight = () => {
  //intensity - (参数可选)光照的强度。缺省值为 1。
  ambientLight.intensity = 0.2;
  scene.add(ambientLight);
};

/**
 * @description 设置渲染器
 */

const setRender = () => {
  renderer.shadowMap.enabled = true;
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(DPR);

  // GLTFLoader 将自动配置从 .gltf 或 .glb 文件引用的纹理。
  renderer.outputEncoding = sRGBEncoding;

  //是否使用物理上正确的光照模式。默认为false。
  // renderer.physicallyCorrectLights = true;

  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  // BakeShadows
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
};

/**
 * @description 加载 3D 模型
 * @returns {Promise<void>}
 */

const load3DModel = async () => {
  // glb 是压缩的gltf，需要使用 dracoLoader 解压缩
  const dracoLoader = new DRACOLoader().setDecoderPath("/libs/draco/");
  // gltf 加载器
  const gltfLoader = new GLTFLoader().setDRACOLoader(dracoLoader);

  // 加载模型获取，模型对象信息
  model = await gltfLoader.loadAsync("/911.glb");

  // 从模型中获取材料和节点对象，并添加至模型对象上
  if (model.scene) {
    const { materials, nodes } = getMaterials(model.scene);

    Object.values(nodes).forEach(
      (node) => (node.receiveShadow = node.castShadow = true)
    );
    Object.assign(model, { materials, nodes });
  }
};

/**
 * @description 自定义模型的样式和位置
 */

const customModel = () => {
  carCoatColor.value = "#" + model.materials.coat.color.getHexString();

  changModel(model, "rubber", {
    color: "#222",
    roughness: 0.6,
    roughnessMap: null,
    normalScale: [4, 4],
  });
  changModel(model, "window", {
    color: "black",
    roughness: 0,
    clearcoat: 0.1,
  });
  changModel(model, "coat", {
    envMapIntensity: 4,
    roughness: 0.5,
    metalness: 1,
  });
  changModel(model, "paint", {
    roughness: 0.5,
    metalness: 0.8,
    color: "#555",
    envMapIntensity: 2,
  });

  model.scene.scale.set(1.6, 1.6, 1.6);
  model.scene.position.set(-0.5, -0.18, 0);
  model.scene.rotation.set(0, Math.PI / 5, 0);

  scene.add(model.scene);
};

/**
 * @description 设置接触阴影,显得更真实
 */

const setContactShadow = () => {
  shadowGroup.position.set(0, -1.16, 0);
  shadowGroup.rotation.set(0, Math.PI / 2, 0);
  scene.add(shadowGroup);
  createContactShadow(scene, renderer, shadowGroup);
};

/**
 * @description 添加控制操作
 */

const addControls = () => {
  controls = new OrbitControls(camera, renderer.domElement);

  controls.addEventListener("start", () => (cameraMoveClock = true));
  controls.addEventListener("end", () => {
    cameraMoveClock = false;
  });
};

/**
 * @description 虚拟HDR环境，设置场景的环境
 * @param scene
 * @param resolution
 * @param frames
 * @param near
 * @param far
 * @param background
 */

const setEnvironment = (
  scene,
  resolution = 256,
  frames = 1,
  near = 1,
  far = 1000,
  background = false
) => {
  const fbo = new WebGLCubeRenderTarget(resolution);
  fbo.texture.type = HalfFloatType;
  const cubeCamera = new CubeCamera(near, far, fbo);

  virtualScene.add(cubeCamera);

  // 天花板灯
  const topLight = generateVirtualLight({
    intensity: 0.75,
    scale: [10, 10, 1],
    position: [0, 5, -9],
    rotation: [Math.PI / 2, 0, 0],
  });

  // 四周灯光
  const leftTopLight = generateVirtualLight({
    intensity: 4,
    scale: [20, 0.1, 1],
    position: [-5, 1, -1],
    rotation: [0, Math.PI / 2, 0],
  });
  const leftBottomLight = generateVirtualLight({
    intensity: 1,
    scale: [20, 0.5, 1],
    position: [-5, -1, -1],
    rotation: [0, Math.PI / 2, 0],
  });
  const rightTopLight = generateVirtualLight({
    intensity: 1,
    scale: [20, 1, 1],
    position: [10, 1, 0],
    rotation: [0, -Math.PI / 2, 0],
  });

  const floatLight = generateVirtualLight({
    form: "ring",
    color: "red",
    intensity: "1",
    scale: 10,
    position: [-15, 4, -18],
    target: [0, 0, 0],
  });

  virtualScene.add(topLight);
  virtualScene.add(leftTopLight);
  virtualScene.add(leftBottomLight);
  virtualScene.add(rightTopLight);
  virtualScene.add(floatLight);

  if (background !== "only") {
    scene.environment = fbo.texture;
  }
  if (background) {
    scene.background = fbo.texture;
  }

  // 模拟 MeshDepthMaterial 设置背景颜色，颜色不受光照影响

  const geometry = new SphereGeometry(1, 64, 64);
  const material = createCustomMaterial(backLightColor.value);

  virtualBackgroundMesh = new Mesh(geometry, material);
  virtualBackgroundMesh.scale.set(100, 100, 100);
  virtualScene.add(virtualBackgroundMesh);

  // 让环形网格运动起来
  floatMesh({
    group: floatLight,
    speed: 5,
    rotationIntensity: 2,
    floatIntensity: 2,
  });

  // 更新相机内容
  let count = 1;
  const virtualRender = () => {
    if (frames === Infinity || count < frames) {
      cubeCamera.update(renderer, virtualScene);
      count++;
    }
    requestAnimationFrame(virtualRender);
  };
  virtualRender();
};

/**
 * 设置相机的运动轨迹
 * @param camera
 * @param v
 */
let stopID;
const clock = new Clock();
const setCameraAnimate = () => {
  const vector = new Vector3();
  if (cameraMoveClock) {
    cancelAnimationFrame(stopID);
  } else {
    const t = clock.getElapsedTime();

    camera.position.lerp(
      vector.set(Math.sin(t / 5), 0, 10 + Math.cos(t / 5)),
      0.05
    );
    camera.lookAt(0, 0, 0);
  }

  stopID = requestAnimationFrame(setCameraAnimate);
};

/**
 * @description 为车设置聚光灯
 */

const setBigSpotLight = () => {
  scene.background = new Color("#0f0001");
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.outputEncoding = sRGBEncoding;
  const material = new MeshPhongMaterial({
    side: DoubleSide,
    color: "#5A0C0C",
    emissive: "#000000",
  });
  const FloorGeometry = new PlaneGeometry(200, 200);
  const floorMesh = new Mesh(FloorGeometry, material);

  floorMesh.rotation.x = Math.PI / 2;
  floorMesh.receiveShadow = true;
  floorMesh.position.set(0, -1.2, 0);

  const bigSpotLight = new SpotLight("#ffffff", 2);

  bigSpotLight.castShadow = true;
  bigSpotLight.angle = 0.3;
  bigSpotLight.penumbra = 0.2;
  bigSpotLight.decay = 2;
  bigSpotLight.distance = 50;

  bigSpotLight.position.set(0, 40, 35);

  scene.add(bigSpotLight);
  scene.add(floorMesh);
};

/**
 * @description 自动渲染，避免更改场景后，手动调用 renderer.render
 */

const autoRender = () => {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(autoRender);
};

/**
 * @description 初始化场景
 * @returns {Promise<void>}
 */
const initScene = async () => {
  // 创建场景
  // 场景是你放置物体、灯光和摄像机的地方,是Three.js 渲染对象。
  scene = new Scene();

  // 设置渲染器
  setRender();

  // 设置环境光照
  setAmbientLight();

  // 设置相机
  setCamera();

  // 设置聚光灯
  setSpotLight();

  // 加载3d模型
  await load3DModel();
  // 自定义3d模型
  customModel();

  // 增加接触阴影
  setContactShadow();

  // 生成虚拟HDR环境，布置场景环境
  setEnvironment(scene, 256, Infinity);

  // 添加运动光斑
  setMovingSpot(virtualScene);

  // 运动相机，改变观察视角
  setCameraAnimate(camera);

  // 增加鼠标控制
  addControls();

  // 设置聚光灯
  setBigSpotLight();

  // 将webgl渲染结果canvas写入dom元素
  canvas.value.appendChild(renderer.domElement);

  // 场景信息更新后，自动渲染
  autoRender();
  watchColorChange();
  listenPageSizeChange();
  setAdv();
};
const setAdv = () => {
  console.log(
    "%c我是 feilongzuo ,关注我，教你学会更多 Web 技术!",
    "font-size:16px;color:red;padding:15px 0;maring:0;"
  );
  console.log(
    "%c抖音号：feilong.code",
    "font-size:14px;color:#ff8400;padding:8px 0;"
  );
  console.log(
    "%c快手号：feilong-code",
    "font-size:14px;color:#ff8400;padding:8px 0;"
  );
};
/**
 * 监听颜色变化
 */

const watchColorChange = () => {
  //车身样色改变
  watch(carCoatColor, (val, old) => {
    requestAnimationFrame(() => {
      model.materials.coat.color.set(val);
      model.materials.coat.needsUpdate = true;
    });
  });

  // 灯光颜色改变
  watch(backLightColor, (val, old) => {
    requestAnimationFrame(() => {
      virtualBackgroundMesh.material = createCustomMaterial(val);
      virtualBackgroundMesh.material.needsUpdate = true;
    });
  });
};

/**
 * @description 重新设置渲染窗口大小
 */
const changeRenderSize = () => {
  requestAnimationFrame(() => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
  });
};

/**
 * 添加页面变化监听
 */
const listenPageSizeChange = () => {
  window.addEventListener("resize", changeRenderSize);
};

onMounted(() => {
  initScene();
});

onUnmounted(() => {
  window.removeEventListener("resize", changeRenderSize);
});
</script>

<style>
@import "./assets/style.css";
</style>
