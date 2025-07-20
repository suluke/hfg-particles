import { effectsById } from '../effects/index';
import Effect, { EffectConfig as EffectConfigType } from './effect';

export default class EffectConfig {
  public id: string;
  public timeBegin: number;
  public timeEnd: number;
  public repetitions: number;
  public config: EffectConfigType;

  constructor(id: string, timeBegin: number, timeEnd: number, repetitions: number, config: EffectConfigType) {
    this.id = id;
    this.timeBegin = Math.round(timeBegin);
    this.timeEnd = Math.round(timeEnd);
    this.repetitions = repetitions;
    this.config = config;
  }

  getEffectClass(): typeof Effect {
    const clazz = (effectsById as any)[this.id];
    if (!clazz) {
      throw new Error(`No such effect: ${this.id}`);
    }
    return clazz;
  }

  /**
   * @return the amount of time in milliseconds in which the effect
   *         should perform one single repetition
   */
  getPeriod(): number {
    return (this.timeEnd - this.timeBegin) / this.repetitions;
  }

  static deserialize(obj: any): EffectConfig {
    if (obj.constructor.name === this.name) {
      return obj;
    } else {
      return new EffectConfig(obj.id, obj.timeBegin, obj.timeEnd, obj.repetitions, obj.config);
    }
  }
}
