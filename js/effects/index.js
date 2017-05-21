import HueDisplaceEffect from './hue-displace';
import ConvergeEffect from './converge';

const effectList = [
  HueDisplaceEffect,
  ConvergeEffect
];
const byId = {};
for (let i = 0; i < effectList.length; i++) {
  byId[effectList[i].getId()] = effectList[i];
}

export default effectList;
export { effectList };
export { byId as effectsById };
