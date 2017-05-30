import { effectsById } from '../effects/index';

export default class EffectConfig {
  constructor(id, timeBegin, timeEnd, config) {
    this.id = id;
    this.timeBegin = timeBegin;
    this.timeEnd = timeEnd;
    this.period = timeEnd - timeBegin;
    this.config = config;
  }
  getEffectClass() {
    const clazz = effectsById[this.id];
    if (!clazz) {
      throw new Error(`No such effect: ${this.id}`);
    }
    return clazz;
  }
  static deserialize(obj) {
    if (obj.constructor.name === this.name) {
      return obj;
    } else {
      return new EffectConfig(obj.id, obj.timeBegin, obj.timeEnd, obj.config);
    }
  }
}