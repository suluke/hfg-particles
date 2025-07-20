import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';
import Ease from './ease-mixins';

const EffectName = 'Particle Scaling';
const EffectDescription = 'Modifies the size of the ';

class ParticlesScalingConfigUI extends ConfigUI {
  constructor() {
    super();
    const classPrefix = 'effect-particles-scaling';
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
        <label>
          Scale to: <input type="number" min="1" step="1" value="100" class="${classPrefix}-scale">%
        </label>
        <br/>
      </fieldset>
    `);
    const ui = this.element;
    this.scaleInput = ui.querySelector(`.${classPrefix}-scale`);

    this.scaleInput.addEventListener('change', () => {
      this.notifyChange();
    });

    Ease.extend(this);
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    return {
      scale: parseInt(this.scaleInput.value || 100) / 100
    };
  }

  applyConfig(config) {
    const scale = config.scale || 1.;
    this.scaleInput.value = Math.round(scale * 100);
  }
}

export default class ParticlesScalingEffect extends Effect {
  static register(instance, props, uniforms, vertexShader) {
    const scale = instance.config.scale || 1.;
    const easeFunc = Ease.setupShaderEasing(instance, uniforms);
    vertexShader.mainBody += `
      float ease = ${easeFunc};
      pointSize *= mix(1., float(${scale}), ease);
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
      this._configUI = new ParticlesScalingConfigUI();
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
