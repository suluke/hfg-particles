import { effectList } from '../effects/index';
import EffectConfig from '../effects/effect-config';
import { create as createConfig, AppConfig } from './app-config';
import Preset1 from './preset-1.json';
import Preset2 from './preset-2.json';

const LISTED_PRESETS_ID_BEGIN = 1000; // better safe than sorry

// / This class encapsulates all data that describes a preset
class Preset {
  public name: string;

  public config: AppConfig;

  public id: number;

  constructor(name: string, config: AppConfig, id: number = -1) {
    this.name = name;
    this.config = config;
    this.id = id;
  }
}

// / Shorthand for preset construction
function preset(name: string, config: AppConfig, id: number = -1): Preset {
  return new Preset(name, config, id);
}
const filePresets: Preset[] = [
  // Import built-in presets here
  preset('Webcam + Effects', Preset1 as AppConfig),
  preset('Webcam + Standing wave', Preset2 as AppConfig),
];

// Create the exported listedPresets dict
const listedPresets: Record<number, Preset> = {};
for (let i = 0; i < filePresets.length; i++) {
  const preset = filePresets[i];
  preset.id = LISTED_PRESETS_ID_BEGIN + i;
  listedPresets[preset.id] = preset;
}

// / Helper function to create a preset only for one single effect
function makePresetFromEffect(effect: any): AppConfig {
  const config = createConfig();
  const timeline = config.effects;
  const track: any[] = [];
  timeline.push(track);
  track.push(new EffectConfig(effect.getId(), 0, 10000, 1, effect.getDefaultConfig()));
  return config;
}

// Create exported allPresets dict
const allPresets: Record<number, Preset> = Object.assign({}, listedPresets);
for (let i = 0; i < effectList.length; i++) {
  const effect = effectList[i];
  allPresets[i] = preset(effect.getId(), makePresetFromEffect(effect), i);
}

// Module exports
export { allPresets };
export { listedPresets };
