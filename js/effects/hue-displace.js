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
    config.distance = parseInt(this.distanceInput.value, 10) / 100;
    config.period = parseInt(this.periodInput.value, 10) / 1000;
    config.scaleByValue = parseInt(this.scaleByValInput.value, 10) / 100;
    config.randomDirectionOffset = this.randomOffsetInput.checked;
    config.rotate = parseInt(this.rotateInput.value, 10) / 100;

    return config;
  }

  applyConfig(config) {
    this.distanceInput.value = config.distance * 100;
    this.periodInput.value = config.period * 1000;
    this.scaleByValInput.value = config.scaleByValue * 100;
    this.randomOffsetInput.checked = config.randomDirectionOffset;
    this.rotateInput.value = config.rotate * 100;
  }
}

export default class HueDisplaceEffect extends Effect {
  static getUniforms() {
    return [{
        name: 'hueDisplaceDistance',
        type: 'float',
        getValue: (instance) => instance.config.distance
      }, {
        name: 'hueDisplaceTime',
        type: 'float',
        getValue: (instance) => function(ctx) {
          return fract(ctx.time / instance.config.period) * 2 * Math.PI;
        }
      }, {
        name: 'hueDisplaceDirectionOffset',
        type: 'float',
        getValue: (instance) => function(ctx, props) {
          let result = instance.config.rotate *
            fract(ctx.time / instance.config.period) * 2 * Math.PI;
          if (instance.config.randomDirectionOffset) {
            if (instance.config.randomDirectionOffsetValue === undefined
              || Math.floor(props.oldTime / instance.config.period)
              !== Math.floor(props.currentTime / instance.config.period)
            ) {
              // eslint-disable-next-line no-param-reassign
              instance.config.randomDirectionOffsetValue = Math.random() * 2 * Math.PI;
            }
            result += instance.config.randomDirectionOffsetValue;
          }

          return result;
        }
      }, {
        name: 'hueDisplaceScaleByValue',
        type: 'float',
        getValue: (instance) => instance.config.scaleByValue
      }
    ];
  }

  static getCode() {
    const u = Effect.createUniformToken;

    return [`{
        float angle = hsv[0] + `, u('hueDisplaceDirectionOffset'), `;
        float offset = (-cos(`, u('hueDisplaceTime'), `) + 1.) / 2.;
        position.xy += offset * getDirectionVector(angle) * `, u('hueDisplaceDistance'), ` * (1. - `, u('hueDisplaceScaleByValue'), ` * (1. - hsv[2]));
      }`
    ];
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
      period:                3,
      scaleByValue:          0,
      randomDirectionOffset: false,
      rotate:                0
    };
  }
}
