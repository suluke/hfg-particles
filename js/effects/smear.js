import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';
import AccumulationEffect, { AccumulationAgent } from './accumulation';

const EffectName = 'Smear';

class SmearConfigUI extends ConfigUI {
  constructor() {
    super();
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
        <label>
          Fade-in:
          <input type="number" class="effect-smear-fadein" value="100" />ms
        </label><br/>
        <label>
          Fade-out:
          <input type="number" class="effect-smear-fadeout" value="500" />ms
        </label>
      </fieldset>
    `);
    const ui = this.element;
    this.fadeinInput = ui.querySelector('.effect-smear-fadein');
    this.fadeoutInput = ui.querySelector('.effect-smear-fadeout');

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

class SmearAgent extends AccumulationAgent {
  constructor(instance) {
    super(instance);
  }
  getFragmentCode(uniforms) {
    const invTextureSize = uniforms.addUniform('invTextureSize', 'vec2', (ctx, props) => {
      return [1 / props.state.getWidth(), 1 / props.state.getHeight()];
    });
    return `
      vec2 smearDir = vec2(-texcoord.y + .5, texcoord.x - .5);
      vec3 color = texture2D(historyTexture, texcoord + smearDir * ${invTextureSize} * 8.).rgb;
      accumulationEffectResult = mix(particleColor, color, 0.8);
    `;
  }
}

export default class SmearEffect extends AccumulationEffect {
  static getAgentClass() {
    return SmearAgent;
  }

  static getTranslationId() {
    return 'smear';
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new SmearConfigUI();
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
    return this.getDefaultConfig();
  }
}
