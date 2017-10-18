import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';

const EffectName = 'Vignette';
const EffectDescription = 'Fade out the edges to make it look like an old crt tv';

class VignetteConfigUI extends ConfigUI {
  constructor() {
    super();
    const classPrefix = 'effect-vignette';
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
        Nothing to be configured :)
      </fieldset>
    `);
    const ui = this.element;
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    return {};
  }

  applyConfig(config) {
  }
}

export default class VignetteEffect extends Effect {
  static register(instance, props, uniforms, vertexShader, fragmentShader) {
    fragmentShader.mainBody += `
      // magic taken from https://www.shadertoy.com/view/MsXGD4
      vec2 uv = (frag_coord - 0.5) * 0.98;
      float vignette = clamp(pow(cos(uv.x * 3.1415), 1.2) * pow(cos(uv.y * 3.1415), 1.2) * 50.0, 0.0, 1.0);
      rgb = mix(background_color.rgb, rgb, vignette);
    `;
  }

  static getDisplayName() {
    return EffectName;
  }

  static getDescription() {
    return EffectDescription;
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new VignetteConfigUI();
    }

    return this._configUI;
  }

  static getDefaultConfig() {
    return {};
  }

  static getRandomConfig() {
    return {};
  }
}
