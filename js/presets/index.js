import { effectList } from '../effects/index';
import EffectConfig from '../effects/effect-config';
import { create as createConfig } from './app-config';
const LISTED_PRESETS_ID_BEGIN = 1000; // better safe than sorry
const filePresets = [

];
const listedPresets = {};
for (let i = 0; i < filePresets.length; i++) {
  listedPresets[LISTED_PRESETS_ID_BEGIN + i] = filePresets[i];
}
function makePresetFromEffect(effect) {
  const config = createConfig();
  const timeline = config.effects;
  const track = [];
  timeline.push(track);
  track.push(new EffectConfig(effect.getId(), 0, 10000, 1, effect.getDefaultConfig()));
  return config;
}
const allPresets = Object.assign({}, listedPresets);
for (let i = 0; i < effectList.length; i++) {
  allPresets[i] = makePresetFromEffect(effectList[i]);
}

export { allPresets };
export { listedPresets };