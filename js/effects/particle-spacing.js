import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';
import Easing from './ease-mixins';

const EffectName = 'Particle spacing';

class ParticleSpacingConfigUI extends ConfigUI {
  constructor() {
    super();
    const classPrefix = 'effect-particle-spacing';
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
        <label>
          X spacing factor
          <input type="number" class="${classPrefix}-xspread" value="1" />
        </label><br/>
        <label>
          Y spacing factor
          <input type="number" class="${classPrefix}-yspread" value="1" />
        </label><br/>
      </fieldset>
    `);
    const ui = this.element;
    this.xSpreadInput = ui.querySelector(`input.${classPrefix}-xspread`);
    this.ySpreadInput = ui.querySelector(`input.${classPrefix}-yspread`);

    this.xSpreadInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.ySpreadInput.addEventListener('change', () => {
      this.notifyChange();
    });

    Easing.extend(this, classPrefix);
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    return {
      xSpread: parseFloat(this.xSpreadInput.value, 10),
      ySpread: parseFloat(this.ySpreadInput.value, 10)
    };
  }

  applyConfig(config) {
    this.xSpreadInput.value = config.xSpread || 1;
    this.ySpreadInput.value = config.ySpread || 1;
  }
}

export default class ParticleSpacingEffect extends Effect {
  static register(instance, props, uniforms, vertexShader) {
    const xSpread = instance.config.xSpread || 1;
    const ySpread = instance.config.ySpread || 1;
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
      vec2 offset;
      offset.x = initialPosition.x * float(${xSpread}) - (float(${xSpread}) - 1.) / 2.;
      offset.y = initialPosition.y * float(${ySpread}) - (float(${ySpread}) - 1.) / 2.;
      offset -= initialPosition.xy;
      float ease = ${easeFunc};
      offset *= ease;
      position.xy += offset;
    `;
  }

  static getTranslationId() {
    return 'particle_spacing';
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new ParticleSpacingConfigUI();
    }

    return this._configUI;
  }

  static getDefaultConfig() {
    return {
      xSpread: 2,
      ySpread: 2,
      easeInTime: 1000,
      easeOutTime: 1000,
      easeFunc: 'sine'
    };
  }

  static getRandomConfig() {
    return {
      xSpread: Math.random() > 0.5 ? 0.5 : 1.5,
      ySpread: Math.random() > 0.5 ? 0.5 : 1.5,
      easeInTime: 1000,
      easeOutTime: 1000,
      easeFunc: ['sine', 'linear', 'none'][Math.floor(Math.random() * 3)]
    };
  }
}
