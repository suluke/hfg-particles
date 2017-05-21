import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';

class ConvergeConfigUI extends ConfigUI {
  constructor() {
    super();
    this.element = parseHtml(`
      <fieldset>
        <legend>Converge</legend>
        <label>
          Speed:
          <input type="number" class="effect-converge-speed" value="100" />
        </label><br/>
        <label>
          Rotation speed:
          <input type="number" class="effect-converge-rotation-speed" value="100" />
        </label><br/>
        <label>
          Attractor:
          <select class="effect-converge-target">
            <option value="center" selected>center</option>
            <option value="color wheel">wheel</option>
          </select>
        </label>
      </fieldset>
    `);
    const ui = this.element;

    this.targetSelect = ui.querySelector('select.effect-converge-target');
    this.rotationSpeedInput = ui.querySelector('input.effect-converge-rotation-speed');
    this.speedInput = ui.querySelector('input.effect-converge-speed');
    this.speedInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.rotationSpeedInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.targetSelect.addEventListener('change', () => {
      this.notifyChange();
    });
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    const config = {};
    config.target = this.targetSelect.value;
    config.rotationSpeed = parseInt(this.rotationSpeedInput.value, 10) / 100;
    config.speed = parseInt(this.speedInput.value, 10) / 1000;

    return config;
  }

  applyConfig(config) {
    this.targetSelect.value = config.target;
    this.rotationSpeedInput.checked = config.rotationSpeed * 100;
    this.speedInput.checked = config.speed * 1000;
  }
}

export default class ConvergeEffect extends Effect {
  static insertIntoVertexShader(vertexShader, instance) {
    // eslint-disable-next-line no-param-reassign, prefer-template
    vertexShader.uniforms += `
      uniform float convergeTime;
      uniform float convergeSpeed;
      uniform float convergeRotationSpeed;
      uniform float convergeMaxTravelTime;
    `;
    // eslint-disable-next-line no-param-reassign, prefer-template
    vertexShader.mainBody += `
      {
        vec2 screenTarget = ` + {
          center:        'vec2(0., 0.)',
          'color wheel': 'getDirectionVector(hsv[0] + convergeTime * convergeRotationSpeed) * vec2(.8) * vec2(invScreenAspectRatio, 1.)'
        }[instance.config.target] + `;
        vec2 target = (invViewProjectionMatrix * vec4(screenTarget, 0, 1)).xy;

        vec2 d = target - initialPosition.xy;
        float d_len = length(d);
        
        float stop_t = sqrt(2. * d_len / convergeSpeed);

        if(convergeTime < stop_t) {
          float t = min(convergeTime, stop_t);
          position.xy += .5 * d / d_len * convergeSpeed * t * t;
        } else if(convergeTime < convergeMaxTravelTime) {
          position.xy += d;
        } else {
          float t = convergeTime - convergeMaxTravelTime;
          //position.xy += mix(d, vec2(0.), 1. - (1.-t) * (1.-t));
          //position.xy += mix(d, vec2(0.), t * t);
          position.xy += mix(d, vec2(0.), -cos(t / convergeMaxTravelTime * PI) * .5 + .5);
        }
      }
    `;
  }

  static insertUniforms(uniforms, instance) {
    // eslint-disable-next-line no-param-reassign
    uniforms.convergeTime = (ctx) => {
      const period = 2 * Math.sqrt(2 / instance.config.speed);

      return fract(ctx.time / period) * period;
    };
    // eslint-disable-next-line no-param-reassign
    uniforms.convergeSpeed = () => instance.config.speed;
    // eslint-disable-next-line no-param-reassign
    uniforms.convergeRotationSpeed = () => instance.config.rotationSpeed;
    // eslint-disable-next-line no-param-reassign
    uniforms.convergeMaxTravelTime = () => Math.sqrt(2 / instance.config.speed);
  }

  static getDisplayName() {
    return 'Converge';
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new ConvergeConfigUI();
    }

    return this._configUI;
  }

  static getDefaultConfig() {
    return {
      target:        'center',
      rotationSpeed: 0,
      speed:         0.1,
    };
  }
}
