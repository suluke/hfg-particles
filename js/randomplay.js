import EffectConfig from './effects/effect-config';
import { effectList as effects } from './effects/index';

export function generateRandomTimeline(currentConfig) {
  const config = Object.assign({}, currentConfig);

  config.effects = [];
  config.duration = 0;

  for(let i=0; i<effects.length; ++i) {
    if(effects[i].getId() == "FlickrImageEffect") continue;

    const timeBegin = Math.round(Math.random() * 10000);
    const duration = Math.round(Math.random() * 9000 + 1000);

    config.effects[i] = [new EffectConfig(
      effects[i].getId(),
      timeBegin,
      timeBegin + duration,
      1,
      effects[i].getRandomConfig()
    )];

    config.duration = Math.max(config.duration, timeBegin + duration);
  }

  //TODO: does not work...
  //config.effects.push([new EffectConfig("FlickrImageEffect", 0, config.duration, 1, { searchTerm: '' })]);

  return config;
}
