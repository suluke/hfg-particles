import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';
import AccumulationEffect, { AccumulationAgent } from './accumulation';

const EffectName = 'Trails';
const EffectDescription = 'Enables an fading image echo';

class TrailsConfigUI extends ConfigUI {
  constructor() {
    super();
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
      </fieldset>
    `);
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    const config = {};
    return config;
  }

  applyConfig(config) {
  }
}

class TrailsAgent extends AccumulationAgent {
  constructor(instance) {
    super(instance);
  }
  getFragmentCode(uniforms) {
    return `
      vec3 color = 0.7 * historyColor + 0.3 * particleColor;
      accumulationResult += color;
    `;
  }
}

export default class TrailsEffect extends AccumulationEffect {
  static getAgentClass() {
    return TrailsAgent;
  }

  static getDisplayName() {
    return EffectName;
  }

  static getDescription() {
    return EffectDescription;
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new TrailsConfigUI();
    }

    return this._configUI;
  }

  static getDefaultConfig() {
    return {
    };
  }

  static getRandomConfig() {
    return {
    };
  }
}
