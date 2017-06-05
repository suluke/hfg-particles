import HueDisplaceEffect from './hue-displace';
import ConvergePointEffect from './converge-point';
import ConvergeCircleEffect from './converge-circle';
import WaveEffect from './wave';
import FlickrImageEffect from './flickr-image';

const effectList = [
  HueDisplaceEffect,
  ConvergePointEffect,
  ConvergeCircleEffect,
  WaveEffect,
  FlickrImageEffect
];
const byId = {};
for (let i = 0; i < effectList.length; i++) {
  byId[effectList[i].getId()] = effectList[i];
}

export default effectList;
export { effectList };
export { byId as effectsById };
