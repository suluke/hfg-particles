import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';
import AccumulationEffect, { AccumulationAgent } from './accumulation';

const EffectName = 'Smooth trails';

class SmoothTrailsConfigUI extends ConfigUI {
  constructor() {
    super();
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
        <label>
          Fade-in:
          <input type="number" class="effect-smooth-trails-fadein" value="100" />ms
        </label><br/>
        <label>
          Fade-out:
          <input type="number" class="effect-smooth-trails-fadeout" value="500" />ms
        </label>
      </fieldset>
    `);
    const ui = this.element;
    this.fadeinInput = ui.querySelector('.effect-smooth-trails-fadein');
    this.fadeoutInput = ui.querySelector('.effect-smooth-trails-fadeout');

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

class SmoothTrailsAgent extends AccumulationAgent {
  constructor(instance) {
    super(instance);
  }

  getFragmentCode(uniforms) {
    const kernelSize = uniforms.addUniform('kernelSize', 'vec2', (ctx, props) => {
      return [4 / props.state.getWidth(), 4 / props.state.getHeight()];
    });
    return `
      vec3 color = /* texture2D(historyTexture, vec2(texcoord.x, texcoord.y)).rgb * .2 + */
        texture2D(historyTexture, vec2(texcoord.x + ${kernelSize}.x, texcoord.y)).rgb * .25 +
        texture2D(historyTexture, vec2(texcoord.x - ${kernelSize}.x, texcoord.y)).rgb * .25 +
        texture2D(historyTexture, vec2(texcoord.x, texcoord.y + ${kernelSize}.y)).rgb * .25 +
        texture2D(historyTexture, vec2(texcoord.x, texcoord.y - ${kernelSize}.y)).rgb * .25;
      accumulationEffectResult = mix(particleColor, color, 0.8);
    `;
  }
}

export default class SmoothTrailsEffect extends AccumulationEffect {
  static getAgentClass() {
    return SmoothTrailsAgent;
  }

  static getTranslationId() {
    return 'smooth_trails';
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new SmoothTrailsConfigUI();
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
