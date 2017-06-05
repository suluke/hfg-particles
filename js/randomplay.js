import EffectConfig from './effects/effect-config';
import { effectList as effects } from './effects/index';

export function generateRandomTimeline(config) {
  config.effects = [[]];
  config.duration = 0;
  for(let i=0; i<effects.length; ++i) {
    config.effects[0].push(new EffectConfig(
      effects[i].getId(),
      Math.random() * 10000,
      Math.random() * 10000,
      1,
      effects[i].getRandomConfig()
    ));
    // HACK
    config.duration = Math.max(config.duration, config.effects[0][config.effects[0].length-1].timeEnd);
  }
  return config;
}
