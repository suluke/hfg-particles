import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';

class HueDisplaceConfigUI extends ConfigUI {
  constructor() {
    super();
    this.element = parseHtml(`
      <fieldset>
        <legend>Displace by hue</legend>
        <label>
          Distance:
          <input type="number" class="effect-hue-displace-distance" value="10" />
        </label><br/>
        <label>
          Scale by brightness:
          <input type="number" class="effect-hue-displace-scale-by-value" value="0" />%
        </label><br/>
        <label>
          Random direction offset:
          <input type="checkbox" class="effect-hue-displace-random-direction-offset"/>
        </label><br/>
        <label>
          Rotate:
          <input type="number" class="effect-hue-displace-rotate" value="0" />%
        </label>
      </fieldset>
    `);
    const ui = this.element;
    this.distanceInput = ui.querySelector('input.effect-hue-displace-distance');
    this.scaleByValInput = ui.querySelector('input.effect-hue-displace-scale-by-value');
    this.randomOffsetInput = ui.querySelector('input.effect-hue-displace-random-direction-offset');
    this.rotateInput = ui.querySelector('input.effect-hue-displace-rotate');

    this.distanceInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.scaleByValInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.randomOffsetInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.rotateInput.addEventListener('change', () => {
      this.notifyChange();
    });
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    const config = {};
    config.distance = parseInt(this.distanceInput.value, 10) / 100;
    config.scaleByValue = parseInt(this.scaleByValInput.value, 10) / 100;
    config.randomDirectionOffset = this.randomOffsetInput.checked;
    config.rotate = parseInt(this.rotateInput.value, 10) / 100;

    return config;
  }

  applyConfig(config) {
    this.distanceInput.value = config.distance * 100;
    this.scaleByValInput.value = config.scaleByValue * 100;
    this.randomOffsetInput.checked = config.randomDirectionOffset;
    this.rotateInput.value = config.rotate * 100;
  }
}

export default class HueDisplaceEffect extends Effect {
  static register(instance, uniforms, vertexShader) {
    if (instance.config.distance !== 0) {
      const distance = uniforms.addUniform('hueDisplaceDistance', 'float', () => instance.config.distance);
      const time = uniforms.addUniform('hueDisplaceTime', 'float', (ctx, props) =>
        fract(ctx.time / (instance.period / 1000)) * 2 * Math.PI);
      const directionOffset = uniforms.addUniform('hueDisplaceDirectionOffset', 'float', (ctx, props) => {
        let result = instance.config.rotate *
          fract(ctx.time / (instance.period / 1000)) * 2 * Math.PI;
        if (instance.config.randomDirectionOffset) {
          if (instance.config.randomDirectionOffsetValue === undefined) {
            // eslint-disable-next-line no-param-reassign
            instance.config.randomDirectionOffsetValue = Math.random() * 2 * Math.PI;
          }
          result += instance.config.randomDirectionOffsetValue;
        }

        return result;
      });
      const scaleByVal = uniforms.addUniform('hueDisplaceScaleByValue', 'float', () => instance.config.scaleByValue);
      // eslint-disable-next-line no-param-reassign
      vertexShader.mainBody += `
        {
          float angle = hsv[0] + ${directionOffset};
          float offset = (-cos(${time}) + 1.) / 2.;
          position.xy += offset * getDirectionVector(angle) * ${distance} * (1. - ${scaleByVal} * (1. - hsv[2]));
        }
      `;
    }
  }

  static getDisplayName() {
    return 'Hue Displace';
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new HueDisplaceConfigUI();
    }

    return this._configUI;
  }

  static getDefaultConfig() {
    return {
      distance:              0.1,
      scaleByValue:          0,
      randomDirectionOffset: false,
      rotate:                0
    };
  }
}
