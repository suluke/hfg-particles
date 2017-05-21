import Effect, {ConfigUI, fract} from './effect';
import { parseHtml } from '../ui/util';

class ConvergeConfigUI extends ConfigUI {
  constructor() {
    super();
    this.element = parseHtml(`
      <fieldset>
        <legend>Converge</legend>
        <label>
          Enable:
          <input type="checkbox" class="effect-converge-enable"/>
        </label><br/>
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
    this.enableInput = ui.querySelector('input.effect-converge-enable');

    this.enableInput.addEventListener('change', () => {
      this.notifyStateChange();
    });
    this.speedInput.addEventListener('change', () => {
      this.notifyStateChange();
    });
    this.rotationSpeedInput.addEventListener('change', () => {
      this.notifyStateChange();
    });
    this.targetSelect.addEventListener('change', () => {
      this.notifyStateChange();
    });
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    const state = {};
    state.convergeTarget = this.targetSelect.value;
    state.convergeRotationSpeed = parseInt(this.rotationSpeedInput.value, 10) / 100;
    state.convergeSpeed = parseInt(this.speedInput.value, 10) / 1000;
    state.convergeEnable = this.enableInput.checked;
    return state;
  }

  applyConfig(config) {
    this.targetSelect.value = config.convergeTarget;
    this.rotationSpeedInput.checked = config.convergeRotationSpeed * 100;
    this.speedInput.checked = config.convergeSpeed * 1000;
    this.enableInput.checked = config.convergeEnable;
  }
}

export default class ConvergeEffect extends Effect {
  static insertIntoVertexShader(vertexShader, instance) {
    if (instance.config.convergeEnable) {
      vertexShader.uniforms += `
        uniform float convergeTime;
        uniform float convergeSpeed;
        uniform float convergeRotationSpeed;
        uniform float convergeMaxTravelTime;
      `;
      vertexShader.mainBody += `
        {
          vec2 screenTarget = ` + { "center": "vec2(0., 0.)", "color wheel": "getDirectionVector(hsv[0] + convergeTime * convergeRotationSpeed) * vec2(.8) * vec2(invScreenAspectRatio, 1.)" }[instance.config.convergeTarget] + `;
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
  }

  static insertUniforms(uniforms, instance) {
    uniforms.convergeTime = (ctx) => {
      const period = 2 * Math.sqrt(2 / instance.config.convergeSpeed);
      return fract(ctx.time / period) * period;
    };
    uniforms.convergeSpeed = () => {
      return instance.config.convergeSpeed;
    };
    uniforms.convergeRotationSpeed = () => {
      return instance.config.convergeRotationSpeed;
    };
    uniforms.convergeMaxTravelTime = () => {
      return Math.sqrt(2 / instance.config.convergeSpeed);
    };
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new ConvergeConfigUI();
    }
    return this._configUI;
  }

  static getDefaultConfig() {
    return {
      convergeTarget: 'center',
      convergeRotationSpeed: 0,
      convergeSpeed: 0.1,
      convergeEnable: false
    };
  }
}
