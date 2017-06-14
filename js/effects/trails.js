import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';
import AccumulationEffect, { AccumulationCommand } from './accumulation';

const EffectName = 'Trails';

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

class TrailsStepCommand extends AccumulationCommand {
  constructor() {
    super();
    this.frag = `
      precision highp float;
      uniform sampler2D texture;
      varying vec2 texcoord;
      void main() {
        vec3 color = texture2D(texture, texcoord).rgb;
        color *= .9;
        gl_FragColor = vec4(color, 1);
      }
    `;
  }
}

export default class TrailsEffect extends AccumulationEffect {
  static getEffectStepClass() {
    return TrailsStepCommand;
  }

  static getDisplayName() {
    return EffectName;
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
