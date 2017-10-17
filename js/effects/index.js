import HueDisplaceEffect from './hue-displace';
import ConvergePointEffect from './converge-point';
import ConvergeCircleEffect from './converge-circle';
import WaveEffect from './wave';
import ChangeImageEffect from './change-image';
import FlickrImageEffect from './flickr-image';
import TrailsEffect from './trails';
import SmoothTrailsEffect from './smooth-trails';
import SmearEffect from './smear';
import StandingWaveEffect from './standing-wave';
import SparkleEffect from './sparkle';
import ParticleSpacingEffect from './particle-spacing';
import ParticleDisplaceEffect from './particle-displace';
import ParticleSizeByHueEffect from './particle-size-by-hue';
import ResetDefaultImageEffect from './reset-default-image';
import WebcamEffect from './webcam';
import ParticlesReduceEffect from './particles-reduce';

// should be last
import DummyEffect from './dummy';

const effectList = [
  HueDisplaceEffect,
  ConvergePointEffect,
  ConvergeCircleEffect,
  WaveEffect,
  ChangeImageEffect,
  FlickrImageEffect,
  TrailsEffect,
  SmoothTrailsEffect,
  SmearEffect,
  StandingWaveEffect,
  SparkleEffect,
  ParticleSpacingEffect,
  ParticleDisplaceEffect,
  ParticleSizeByHueEffect,
  ParticlesReduceEffect,
  ResetDefaultImageEffect,
  WebcamEffect,

  // Should be last
  DummyEffect
];
const byId = {};
for (let i = 0; i < effectList.length; i++) {
  byId[effectList[i].getId()] = effectList[i];
}

// Best website: http://tools.medialab.sciences-po.fr/iwanthue/index.php
const Colors = [
  [211,79,52],
  [98,112,225],
  [90,183,78],
  [176,95,211],
  [219,156,54],
  [209,78,175],
  [79,182,148],
  [219,68,120],
  [82,119,51],
  [110,85,168],
  [150,174,62],
  [75,121,187],
  [163,175,104],
  [156,84,154],
  [171,117,61],
  [80,179,221],
  [204,109,101],
  [164,152,224],
  [159,68,100],
  [221,135,188]
];
function getColorIndexForEffect(effect) {
  const idx = effectList.indexOf(effect);
  if (idx < 0) {
    throw new Error('Cannot get color for unregistered effect');
  }
  if (idx >= Colors.length) {
    console.warn('Not enough colors');
    return Colors.length - 1;
  }
  return idx;
}
function getColorClassnameForEffect(effect) {
  return `effect-color-${getColorIndexForEffect(effect) + 1}`;
}
function getColorForEffect(effect) {
  return Colors[getColorIndexForEffect(effect)];
}

export default effectList;
export { effectList };
export { byId as effectsById };
export { getColorIndexForEffect, getColorClassnameForEffect, getColorForEffect };
