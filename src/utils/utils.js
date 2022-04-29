import {
  BackSide,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  Vector3,
} from "three";
import { Depth, LayerMaterial } from "lamina/vanilla";

export { createContactShadow } from "./contactShadow";
export { setMovingSpot, floatMesh } from "./animate";

export const getMaterials = (scene) => {
  const data = {
    nodes: {},
    materials: {},
  };

  if (!scene) {
    return data;
  }

  scene.traverse((obj) => {
    if (obj.name) {
      data.nodes[obj.name] = obj;
    }

    if (obj.material && !data.materials[obj.material.name]) {
      data.materials[obj.material.name] = obj.material;
    }
  });

  return data;
};

export const changModel = (model, nodeName, options) => {
  model.materials[nodeName].setValues(options);
};

export const generateVirtualLight = ({
  form = "rect",
  intensity = 1,
  color = "white",
  scale = [1, 1, 1],
  toneMapped = false,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  target,
}) => {
  scale =
    Array.isArray(scale) && scale.length === 2
      ? [scale[0], scale[1], 1]
      : scale;

  let geometry;
  if (form === "circle") {
    geometry = new RingGeometry(0, 1, 64);
  }
  if (form === "ring") {
    geometry = new RingGeometry(0.5, 1, 64);
  }
  if (form === "rect") {
    geometry = new PlaneGeometry();
  }

  const material = new MeshBasicMaterial({
    toneMapped: toneMapped,
    side: DoubleSide,
    color: color,
  });

  material.color.multiplyScalar(intensity);

  const mesh = new Mesh(geometry, material);
  Array.isArray(scale)
    ? mesh.scale.set(...scale)
    : mesh.scale.set(scale, scale, scale);

  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  if (target) {
    mesh.lookAt(new Vector3(...target));
  }
  return mesh;
};

export const createCustomMaterial = (colorA = "white", colorB = "black") => {
  const material = new LayerMaterial({
    color: "#444",
    layers: [
      new Depth({
        colorA: colorA,
        colorB: colorB,
        alpha: 0.5,
        mode: "normal",
        near: 0,
        far: 300,
        origin: new Vector3(100, 100, 100),
      }),
    ],
  });
  material.side = BackSide;
  return material;
};
