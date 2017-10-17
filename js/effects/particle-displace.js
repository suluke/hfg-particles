import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';
import Ease from './ease-mixins';

const EffectName = 'Displace Particles';
const EffectDescription = 'Displaces all particles into a certain direction by the same distance';

class ParticleDisplaceConfigUI extends ConfigUI {
  constructor() {
    super();
    const classPrefix = 'effect-particle-displace';
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
        <label>
          Displace distance:
          <input type="number" min="0" class="${classPrefix}-distance" value="0.5" />
        </label><br/>
        <label>
          Displace direction:
          <input type="number" class="${classPrefix}-direction" value="135" />
        </label>
        <select class="${classPrefix}-direction-unit">
          <option value="degrees" selected>deg</option>
          <option value="radians">rad</option>
        </select>
        <br/>
      </fieldset>
    `);
    const ui = this.element;
    this.distanceInput = ui.querySelector(`input.${classPrefix}-distance`);
    this.directionInput = ui.querySelector(`input.${classPrefix}-direction`);
    this.directionUnitInput = ui.querySelector(`select.${classPrefix}-direction-unit`);

    this.distanceInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.directionInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.directionUnitInput.addEventListener('change', () => {
      this.notifyChange();
    });

    Ease.extend(this, classPrefix);
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    return {
      direction: parseFloat(this.directionInput.value),
      directionUnit: this.directionUnitInput.value,
      distance: parseFloat(this.distanceInput.value)
    };
  }

  applyConfig(config) {
    this.directionInput.value = config.direction || 135;
    this.directionUnitInput.value = config.directionUnit || 'degrees';
    this.distanceInput.value = config.distance || 0.5;
  }
}

export default class ParticleDisplaceEffect extends Effect {
  static register(instance, props, uniforms, vertexShader) {
    let angle = instance.config.direction || 135;
    if (instance.config.directionUnit !== 'radians') {
      angle = angle / 360 * 2 * Math.PI;
    }
    angle = (angle + 2 * Math.PI) % (2 * Math.PI);
    const distance = instance.config.distance || 0.5;
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
      offset.y = cos(float(${angle}));
      offset.x = sqrt(1. - pow(offset.y, 2.)) * (-2. * floor(float(${angle}) / PI) + 1.);
      offset *= float(${distance});
      float ease = ${easeFunc};
      offset *= ease;
      position.xy += offset;
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
      this._configUI = new ParticleDisplaceConfigUI();
    }

    return this._configUI;
  }

  static getDefaultConfig() {
    return {
      direction: 135,
      directionUnit: 'degrees',
      distance: 0.5,
      easeInTime: 1000,
      easeOutTime: 1000,
      easeFunc: 'sine'
    };
  }

  static getRandomConfig() {
    return {
      direction: Math.random() * 360,
      directionUnit: 'degrees',
      distance: Math.random() - 0.5,
      easeInTime: 1000,
      easeOutTime: 1000,
      easeFunc: ['sine', 'linear'][Math.floor(Math.random() * 2)]
    };
  }
}
