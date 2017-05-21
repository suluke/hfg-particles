import Effect, {ConfigUI, fract} from './effect';
import { parseHtml } from '../ui/util';

class HueDisplaceConfigUI extends ConfigUI {
  constructor() {
    this.element = parseHtml(`
      <fieldset>
        <legend>Displace by hue</legend>
        <label>
          Distance:
          <input type="number" class="effect-hue-displace-distance" value="10" />
        </label><br/>
        <label>
          Period:
          <input type="number" class="effect-hue-displace-period" value="3000" />ms
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
    this.periodInput = ui.querySelector('input.effect-hue-displace-period');
    this.scaleByValInput = ui.querySelector('input.effect-hue-displace-scale-by-value');
    this.randomOffsetInput = ui.querySelector('input.effect-hue-displace-random-direction-offset');
    this.rotateInput = ui.querySelector('input.effect-hue-displace-rotate');

    this.distanceInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.periodInput.addEventListener('change', () => {
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
    // eslint-disable-next-line no-param-reassign
    config.hueDisplaceDistance = parseInt(this.distanceInput.value, 10) / 100;
    // eslint-disable-next-line no-param-reassign
    config.hueDisplacePeriod = parseInt(this.periodInput.value, 10) / 1000;
    // eslint-disable-next-line no-param-reassign
    config.hueDisplaceScaleByValue = parseInt(this.scaleByValInput.value, 10) / 100;
    // eslint-disable-next-line no-param-reassign
    config.hueDisplaceRandomDirectionOffset = this.randomOffsetInput.checked;
     // eslint-disable-next-line no-param-reassign
    config.hueDisplaceRotate = parseInt(this.rotateInput.value, 10) / 100;
    return config;
  }

  applyConfig(config) {
    this.distanceInput.value = config.hueDisplaceDistance * 100;
    this.periodInput.value = config.hueDisplacePeriod * 1000;
    this.scaleByValInput.value = config.hueDisplaceScaleByValue * 100;
    this.randomOffsetInput.checked = config.hueDisplaceRandomDirectionOffset;
    this.rotateInput.value = config.hueDisplaceRotate * 100;
  }
}

export default class HueDisplaceEffect extends Effect {
  static insertIntoVertexShader(vertexShader, instance) {
    if (instance.config.hueDisplaceDistance !== 0) {
      vertexShader.uniforms += `
        uniform float hueDisplaceDistance;
        uniform float hueDisplaceTime;
        uniform float hueDisplaceDirectionOffset;
        uniform float hueDisplaceScaleByValue;
      `;
      vertexShader.mainBody += `
        {
          float angle = hsv[0] + hueDisplaceDirectionOffset;
          float offset = (-cos(hueDisplaceTime) + 1.) / 2.;
          position.xy += offset * getDirectionVector(angle) * hueDisplaceDistance * (1. - hueDisplaceScaleByValue * (1. - hsv[2]));
        }
      `;
    }
  }

  static insertUniforms(uniforms, instance) {
    uniforms.hueDisplaceDistance = () => {
      return instance.config.hueDisplaceDistance;
    };
    uniforms.hueDisplaceTime = (ctx) => {
      return fract(ctx.time / instance.config.hueDisplacePeriod) * 2 * Math.PI;
    };
    uniforms.hueDisplaceDirectionOffset = (ctx, props) => {
      let result = instance.config.hueDisplaceRotate * fract(ctx.time / instance.config.hueDisplacePeriod) * 2 * Math.PI;
      if (instance.config.hueDisplaceRandomDirectionOffset) {
        if (instance.config.hueDisplaceRandomDirectionOffsetValue === undefined
          || Math.floor(props.oldTime / instance.config.hueDisplacePeriod)
          !== Math.floor(props.currentTime / instance.config.hueDisplacePeriod)
        ) {
          instance.config.hueDisplaceRandomDirectionOffsetValue = Math.random() * 2 * Math.PI;
        }
        result += instance.config.hueDisplaceRandomDirectionOffsetValue;
      }

      return result;
    };
    uniforms.hueDisplaceScaleByValue = () => {
      return instance.config.hueDisplaceScaleByValue;
    };
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new HueDisplaceConfigUI();
    }
    return this._configUI;
  }

  static getDefaultConfig() {
    return {
      hueDisplaceDistance: 0.1,
      hueDisplacePeriod: 3,
      hueDisplaceScaleByValue: 0,
      hueDisplaceRandomDirectionOffset: false,
      hueDisplaceRotate: 0
    };
  }
}
