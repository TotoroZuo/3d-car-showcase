import { Clock, Group } from "three";
import { generateVirtualLight } from "@/utils/utils";

let clock = new Clock();

/**
 * 设置灯光的运动轨迹
 * @param clock
 * @param group 光斑组
 */

const spotAnimate = (clock, group) => {
  group.position.z += clock.getDelta() * 15;
  if (group.position.z > 60) {
    group.position.z = -60;
  }
  requestAnimationFrame(() => {
    spotAnimate(clock, group);
  });
};

/**
 * 车身设置移动的光斑
 * @param virtualScene
 */

export const setMovingSpot = (virtualScene) => {
  const groupWrap = new Group();
  const group = new Group();
  const clock = new Clock();

  const positions = [2, 0, 2, 0, 2, 0, 2, 0];

  positions.map((x, i) => {
    const lightOptions = {
      form: "circle",
      intensity: "4",
      scale: [3, 1, 1],
      position: [x, 4, i * 4],
    };
    const circleLight = generateVirtualLight(lightOptions);
    circleLight.rotation.set(Math.PI / 2, 0, 0);
    group.add(circleLight);
  });

  groupWrap.add(group);
  groupWrap.rotation.set(0, 0.5, 0);
  virtualScene.add(groupWrap);

  spotAnimate(clock, group);
};

// 随机数
const offset = Math.random() * 10;

/**
 * 让网格系统运动起来
 * @param group
 * @param speed
 * @param rotationIntensity
 * @param floatIntensity
 */
export const floatMesh = ({
  group,
  speed = 1,
  rotationIntensity = 1,
  floatIntensity = 1,
}) => {
  const t = offset + clock.getElapsedTime();
  group.rotation.x = (Math.cos((t / 4) * speed) / 8) * rotationIntensity;
  group.rotation.y = (Math.sin((t / 4) * speed) / 8) * rotationIntensity;
  group.rotation.z = (Math.sin((t / 4) * speed) / 20) * rotationIntensity;
  group.position.y = (Math.sin((t / 4) * speed) / 10) * floatIntensity;
  requestAnimationFrame(() => {
    floatMesh({ group, speed, rotationIntensity, floatIntensity });
  });
};
