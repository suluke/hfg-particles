import HueDisplaceEffect from './hue-displace';
import ConvergePointEffect from './converge-point';
import ConvergeCircleEffect from './converge-circle';
import WaveEffect from './wave';
import ChangeImageEffect from './change-image';

const effectList = [
  HueDisplaceEffect,
  ConvergePointEffect,
  ConvergeCircleEffect,
  WaveEffect,
  ChangeImageEffect
];
const byId = {};
for (let i = 0; i < effectList.length; i++) {
  byId[effectList[i].getId()] = effectList[i];
}

export default effectList;
export { effectList };
export { byId as effectsById };
