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
        <label>
          Fade-in:
          <input type="number" class="effect-trails-fadein" value="100" />ms
        </label><br/>
        <label>
          Fade-out:
          <input type="number" class="effect-trails-fadeout" value="500" />ms
        </label>
      </fieldset>
    `);
    const ui = this.element;
    this.fadeinInput = ui.querySelector('.effect-trails-fadein');
    this.fadeoutInput = ui.querySelector('.effect-trails-fadeout');

    this.fadeinInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.fadeoutInput.addEventListener('change', () => {
      this.notifyChange();
    });
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    const config = {};
    config.fadein = parseInt(this.fadeinInput.value, 10);
    config.fadeout = parseInt(this.fadeoutInput.value, 10);

    return config;
  }

  applyConfig(config) {
    this.fadeinInput.value = config.fadein;
    this.fadeoutInput.value = config.fadeout;
  }
}

class TrailsAgent extends AccumulationAgent {
  constructor(instance) {
    super(instance);
  }
  getFragmentCode(uniforms) {
    return `
      accumulationEffectResult = mix(particleColor, historyColor, 0.7);
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
      fadein: 100,
      fadeout: 500
    };
  }

  static getRandomConfig() {
    return getDefaultConfig();
  }
}
