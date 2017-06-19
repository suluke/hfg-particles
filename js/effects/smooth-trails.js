import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';
import AccumulationEffect, { AccumulationAgent } from './accumulation';

const EffectName = 'Smooth trails';
const EffectDescription = 'Enables an smoother fading image echo';

class SmoothTrailsConfigUI extends ConfigUI {
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
      color *= 0.8;
      color += 0.2 * particleColor;
      accumulationResult += color;
    `;
  }
}

export default class SmoothTrailsEffect extends AccumulationEffect {
  static getAgentClass() {
    return SmoothTrailsAgent;
  }

  static getDisplayName() {
    return EffectName;
  }

  static getDescription() {
    return EffectDescription;
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new SmoothTrailsConfigUI();
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
