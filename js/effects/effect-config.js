import { effectsById } from '../effects/index';

export default class EffectConfig {
  constructor(id, timeBegin, timeEnd, repetitions, config) {
    this.id = id;
    this.timeBegin = Math.round(timeBegin);
    this.timeEnd = Math.round(timeEnd);
    this.repetitions = repetitions;
    this.config = config;
  }
  getEffectClass() {
    const clazz = effectsById[this.id];
    if (!clazz) {
      throw new Error(`No such effect: ${this.id}`);
    }
    return clazz;
  }
  /// @return the amout of time in milliseconds in which the effect
  ///         should perform one single repetition
  getPeriod() {
    return (this.timeEnd - this.timeBegin) / this.repetitions;
  }
  static deserialize(obj) {
    if (obj.constructor.name === this.name) {
      return obj;
    } else {
      return new EffectConfig(obj.id, obj.timeBegin, obj.timeEnd, obj.repetitions, obj.config);
    }
  }
}
