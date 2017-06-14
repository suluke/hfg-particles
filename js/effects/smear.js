import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';
import AccumulationEffect, { AccumulationCommand } from './accumulation';

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

class SmearStepCommand extends AccumulationCommand {
  constructor() {
    super();
    this.frag = `
      precision highp float;
      uniform sampler2D texture;
      uniform vec2 invTextureSize;
      varying vec2 texcoord;
      void main() {
        vec2 smearDir = vec2(-texcoord.y + .5, texcoord.x - .5);
        vec3 color = texture2D(texture, texcoord + smearDir * invTextureSize * 8.).rgb;
        color *= .975;
        gl_FragColor = vec4(color, 1);
      }
    `;
    this.uniforms.invTextureSize = (ctx, props) => {
      const readTex = props.accumulationReadFramebuffer.texture;
      return [1 / readTex.width, 1 / readTex.height];
    };
  }
}

export default class SmearEffect extends AccumulationEffect {
  static getEffectStepClass() {
    return SmearStepCommand;
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
