import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';

class ConvergePointConfigUI extends ConfigUI {
  constructor() {
    super();
    this.element = parseHtml(`
      <fieldset>
        <legend>Converge to point</legend>
        <label>
          Speed:
          <input type="number" class="effect-converge-speed" value="100" />
        </label>
      </fieldset>
    `);
    const ui = this.element;

    this.speedInput = ui.querySelector('input.effect-converge-speed');
    this.speedInput.addEventListener('change', () => {
      this.notifyChange();
    });
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    const config = {};
    config.speed = parseInt(this.speedInput.value, 10) / 1000;

    return config;
  }

  applyConfig(config) {
    this.speedInput.checked = config.speed * 1000;
  }
}

export default class ConvergePointEffect extends Effect {
  static register(instance, uniforms, vertexShader) {
    const time = uniforms.addUniform('convergeTime', 'float', (ctx) => {
      const period = 2 * Math.sqrt(2 / instance.config.speed);

      return fract(ctx.time / period) * period;
    });
    const speed = uniforms.addUniform('convergeSpeed', 'float', () => instance.config.speed);
    const rotationSpeed = uniforms.addUniform('convergeRotationSpeed', 'float', () => instance.config.rotationSpeed);
    const maxTravelTime = uniforms.addUniform('convergeMaxTravelTime', 'float', () => Math.sqrt(2 / instance.config.speed));

    // eslint-disable-next-line no-param-reassign
    vertexShader.mainBody += `
      {
        vec2 screenTarget = vec2(0., 0.);
        vec2 target = (invViewProjectionMatrix * vec4(screenTarget, 0, 1)).xy;

        vec2 d = target - initialPosition.xy;
        float d_len = length(d);

        float stop_t = sqrt(2. * d_len / ${speed});

        if(${time} < stop_t) {
          float t = min(${time}, stop_t);
          position.xy += .5 * d / d_len * ${speed} * t * t;
        } else if(${time} < ${maxTravelTime}) {
          position.xy += d;
        } else {
          float t = ${time} - ${maxTravelTime};
          //position.xy += mix(d, vec2(0.), 1. - (1.-t) * (1.-t));
          //position.xy += mix(d, vec2(0.), t * t);
          position.xy += mix(d, vec2(0.), -cos(t / ${maxTravelTime} * PI) * .5 + .5);
        }
      }
    `;
  }

  static getDisplayName() {
    return 'Converge to point';
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new ConvergePointConfigUI();
    }

    return this._configUI;
  }

  static getDefaultConfig() {
    return {
      speed: 0.1
    };
  }
}
