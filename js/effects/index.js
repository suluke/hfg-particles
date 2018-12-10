import ChangeImageEffect from './change-image';
import ConvergeCircleEffect from './converge-circle';
import ConvergePointEffect from './converge-point';
import DummyEffect from './dummy';
import FlickrImageEffect from './flickr-image';
import FractalEffect from './fractal';
import HueDisplaceEffect from './hue-displace';
import ParticleDisplaceEffect from './particle-displace';
import ParticlesReduceEffect from './particles-reduce';
import ParticleSizeByHueEffect from './particle-size-by-hue';
import ParticleSpacingEffect from './particle-spacing';
import ResetDefaultImageEffect from './reset-default-image';
import SmearEffect from './smear';
import SmoothTrailsEffect from './smooth-trails';
import SparkleEffect from './sparkle';
import StandingWaveEffect from './standing-wave';
import TrailsEffect from './trails';
import VignetteEffect from './vignette';
import WaveEffect from './wave';
import WebcamEffect from './webcam';

const effectList = [
  ChangeImageEffect,
  ConvergePointEffect,
  ConvergeCircleEffect,
  DummyEffect,
  FlickrImageEffect,
  FractalEffect,
  HueDisplaceEffect,
  ParticleDisplaceEffect,
  ParticlesReduceEffect,
  ParticleSizeByHueEffect,
  ParticleSpacingEffect,
  ResetDefaultImageEffect,
  SmearEffect,
  SmoothTrailsEffect,
  SparkleEffect,
  StandingWaveEffect,
  TrailsEffect,
  VignetteEffect,
  WaveEffect,
  WebcamEffect
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
