import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';
import Ease from './ease-mixins';

const EffectName = 'Rotate';
const EffectDescription = 'Rotate all particles with a custom angle around a custom origin';

class RotateConfigUI extends ConfigUI {
  constructor() {
    super();
    const classPrefix = 'effect-rotate';
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
        <label>
          Rotation angle
          <input type="number" value="0" class="${classPrefix}-angle"/>
        </label>
        <select value="deg" class="${classPrefix}-angle-unit">
          <option value="deg" selected>degrees</option>
          <option value="rad">radians</option>
        </select>
        <br/>
        Origin:
        <label>
          x:
          <input type="number" value="0" class="${classPrefix}-origin-x"/>
        </label>
        <label>
          y:
          <input type="number" value="0" class="${classPrefix}-origin-y"/>
        </label>
        <br/>
      </fieldset>
    `);
    const ui = this.element;

    this.angleInput = ui.querySelector(`.${classPrefix}-angle`);
    this.angleUnitInput = ui.querySelector(`.${classPrefix}-angle-unit`);
    this.originXInput = ui.querySelector(`.${classPrefix}-origin-x`);
    this.originYInput = ui.querySelector(`.${classPrefix}-origin-y`);

    this.angleInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.angleUnitInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.originXInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.originYInput.addEventListener('change', () => {
      this.notifyChange();
    });

    Ease.extend(this);
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    return {
      angle: parseFloat(this.angleInput.value || 0),
      angleUnit: this.angleUnitInput.value || 'deg',
      originX: parseFloat(this.originXInput.value || 0),
      originY: parseFloat(this.originYInput.value || 0),
    };
  }

  applyConfig(config) {
    this.angleInput.value = config.angle || 0;
    this.angleUnitInput.value = config.angleUnit || 'deg';
    this.originXInput.value = config.originX || 0;
    this.originYInput.value = config.originY || 0;
  }
}

export default class RotateEffect extends Effect {
  static register(instance, props, uniforms, vertexShader) {
    let angle = instance.config.angle || 0;
    const angleUnit = instance.config.angleUnit || 'deg';
    if (angleUnit !== 'rad')
      angle = angle / 360 * 2 * Math.PI;
    const origX = instance.config.originX || 0;
    const origY = instance.config.originY || 0;
    // GL is column-major!
    const matAlloc = [0, 0, 0, 0, 0, 0, 0, 0, 1];
    const matrix = (ctx, props) => {
      const ease = Ease.getCurrentEase(instance, props);
      const teta = angle * ease;
      matAlloc[0] = Math.cos(teta);
      matAlloc[1] = Math.sin(teta);
      matAlloc[3] = -Math.sin(teta);
      matAlloc[4] = Math.cos(teta);
      return matAlloc;
    };
    const rotate = uniforms.addUniform('rotationMat', 'mat3', matrix);
    vertexShader.mainBody += `
      vec3 offset = vec3(float(${origX}) + .5, float(${origY}) + .5, 0.);
      vec3 rot = ${rotate} * (position - offset) + offset;
      position.xy = rot.xy;
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
      this._configUI = new RotateConfigUI();
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
