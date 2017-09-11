import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';

const EffectName = 'Particle size by hue';
const EffectDescription = 'Particles will have different sizes depending on their color';

class ParticleSizeByHueConfigUI extends ConfigUI {
  constructor() {
    super();
    const classPrefix = 'effect-particle-size-by-hue';
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
        <label>
          Scaling factor:
          <input type="number" min="0" class="${classPrefix}-scaling" value="1" />
        </label><br/>
        <label>
          Hue rotation:
          <input type="number" min="0" max="100" step="1" class="${classPrefix}-rotation" value="0" />%
        </label><br/>
        <label>
          Ease in time:
          <input type="number" min="0" step="1" class="${classPrefix}-ease-in" value="1000" />
          ms
        </label><br/>
        <label>
          Ease out time:
          <input type="number" min="0" step="1" class="${classPrefix}-ease-out" value="1000" />
          ms
        </label><br/>
        <label>
          Ease function:
          <select class="${classPrefix}-ease-func" value="sine">
            <option value="sine" selected>Sine</option>
            <option value="linear">Linear</option>
            <option value="none">None</option>
          </select>
        </label>
      </fieldset>
    `);
    const ui = this.element;
    this.scalingInput = ui.querySelector(`input.${classPrefix}-scaling`);
    this.hueRotationInput = ui.querySelector(`input.${classPrefix}-rotation`);
    this.easeInInput = ui.querySelector(`input.${classPrefix}-ease-in`);
    this.easeOutInput = ui.querySelector(`input.${classPrefix}-ease-out`);
    this.easeFuncInput = ui.querySelector(`select.${classPrefix}-ease-func`);

    this.scalingInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.hueRotationInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.easeInInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.easeOutInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.easeFuncInput.addEventListener('change', () => {
      this.notifyChange();
    });
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    return {
      scaling: parseFloat(this.scalingInput.value),
      hueRotation: parseInt(this.hueRotationInput.value) / 100 * 2 * Math.PI,
      easeInTime: parseInt(this.easeInInput.value, 10),
      easeOutTime: parseInt(this.easeOutInput.value, 10),
      easeFunc: this.easeFuncInput.value
    };
  }

  applyConfig(config) {
    console.log(config);
    this.scalingInput.value = config.scaling;
    this.hueRotationInput.value = Math.round(config.hueRotation / 2 / Math.PI * 100);
    this.easeInInput.value = config.easeInTime || 1000;
    this.easeOutInput.value = config.easeOutTime || 1000;
    this.easeFuncInput.value = config.easeFunc || 'sine';
  }
}

export default class ParticleSizeByHueEffect extends Effect {
  static register(instance, props, uniforms, vertexShader) {
    const scaling = instance.config.scaling || 1;
    const hueRotation = instance.config.hueRotation || 0;
    const easeInTime = Math.min(instance.config.easeInTime || 1000, instance.getPeriod() / 2);
    const easeOutTime = Math.min(instance.config.easeOutTime || 1000, instance.getPeriod() - easeInTime);
    // starts at 0, goes down to 1
    const easeInProgress = uniforms.addUniform('easeInProgress', 'float', (ctx, props) => {
      const time = fract((props.clock.getTime() - instance.timeBegin) / instance.getPeriod());
      return Math.min(1, time / (easeInTime / instance.getPeriod()));
    });
    // starts at 1, goes down to 0
    const easeOutProgress = uniforms.addUniform('easeOutProgress', 'float', (ctx, props) => {
      const time = fract((props.clock.getTime() - instance.timeBegin) / instance.getPeriod());
      return Math.min(1, (1 - time) / (easeOutTime / instance.getPeriod()));
    });
    const easeFuncs = {
      none: '1.',
      sine: `(1. - cos(PI * min(${easeInProgress}, ${easeOutProgress}))) / 2.`,
      linear: `min(${easeInProgress}, ${easeOutProgress})`
    };
    const easeFunc = easeFuncs[instance.config.easeFunc || 'sine'];
    vertexShader.mainBody += `
      // Generate a number between 0 and 1 depending on position on hue wheel
      float huePosition = fract((hsv[0] + float(${hueRotation})) / (2. * PI));
      // A scaling value of 0.5 means a decrease by 50%
      float increase = (float(${scaling}) - 1.) * huePosition;
      float sizeDiff = increase * pointSize;
      float ease = ${easeFunc};
      pointSize += sizeDiff * ease;
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
      this._configUI = new ParticleSizeByHueConfigUI();
    }

    return this._configUI;
  }

  static getDefaultConfig() {
    return {
      scaling: 1,
      hueRotation: 0,
      easeInTime: 1000,
      easeOutTime: 1000,
      easeFunc: 'sine'
    };
  }

  static getRandomConfig() {
    return {
      scaling: Math.random() * 3,
      hueRotation: Math.random() * 2 * Math.PI,
      easeInTime: 1000,
      easeOutTime: 1000,
      easeFunc: ['sine', 'linear', 'none'][Math.floor(Math.random() * 3)]
    };
  }
}
