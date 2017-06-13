import Effect, { ConfigUI, fract } from './effect';
import AccumulationEffect from './accumulation';
import { Framebuffer, FullscreenRectCommand, AccumulationCommand } from '../regl-utils';
import { parseHtml } from '../ui/util';

const EffectName = 'Smooth trails';

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

class SmoothTrailsStepCommand extends AccumulationCommand {
  constructor() {
    super();
    this.frag = `
      precision highp float;
      uniform sampler2D texture;
      uniform vec2 kernelSize;
      varying vec2 texcoord;
      void main() {
        vec3 color = /* texture2D(texture, vec2(texcoord.x, texcoord.y)).rgb * .2 + */
          texture2D(texture, vec2(texcoord.x + kernelSize.x, texcoord.y)).rgb * .25 +
          texture2D(texture, vec2(texcoord.x - kernelSize.x, texcoord.y)).rgb * .25 +
          texture2D(texture, vec2(texcoord.x, texcoord.y + kernelSize.y)).rgb * .25 +
          texture2D(texture, vec2(texcoord.x, texcoord.y - kernelSize.y)).rgb * .25;
        color *= .98;
        gl_FragColor = vec4(color, 1);
      }
    `;
    this.uniforms.kernelSize = (ctx, props) => {
      const readTex = props.accumulationReadFramebuffer.texture;
      return [4 / readTex.width, 4 / readTex.height];
    };
  }
}

export default class SmoothTrailsEffect extends AccumulationEffect {
  static getEffectStepClass() {
    return SmoothTrailsStepCommand;
  }

  static getDisplayName() {
    return EffectName;
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
