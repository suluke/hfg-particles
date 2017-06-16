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
      vec3 color = 0.8 * texture2D(historyTexture, texcoord + smearDir * ${invTextureSize} * 8.).rgb;
      color += 0.2 * particleColor;
      accumulationResult += color;
    `;
  }
}

export default class SmearEffect extends AccumulationEffect {
  static getAgentClass() {
    return SmearAgent;
  }

  static getDisplayName() {
    return EffectName;
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new SmearConfigUI();
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
