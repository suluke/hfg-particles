import HueDisplaceEffect from './hue-displace';
import ConvergePointEffect from './converge-point';
import ConvergeCircleEffect from './converge-circle';
import WaveEffect from './wave';
import ChangeImageEffect from './change-image';
import FlickrImageEffect from './flickr-image';
import TrailsEffect from './trails';
import SmoothTrailsEffect from './smooth-trails';
import SmearEffect from './smear';

const effectList = [
  HueDisplaceEffect,
  ConvergePointEffect,
  ConvergeCircleEffect,
  WaveEffect,
  ChangeImageEffect,
  FlickrImageEffect,
  TrailsEffect,
  SmoothTrailsEffect,
  SmearEffect
];
const byId = {};
for (let i = 0; i < effectList.length; i++) {
  byId[effectList[i].getId()] = effectList[i];
}

export default effectList;
export { effectList };
export { byId as effectsById };
