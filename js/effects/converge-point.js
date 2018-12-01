import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';

const EffectName = 'Converge to point';

class ConvergePointConfigUI extends ConfigUI {
  constructor() {
    super();
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
      </fieldset>
    `);
    const ui = this.element;

  }

  getElement() {
    return this.element;
  }

  getConfig() {
    const config = {};

    return config;
  }

  applyConfig(config) {
  }
}

export default class ConvergePointEffect extends Effect {
  static register(instance, props, uniforms, vertexShader) {
    const time = uniforms.addUniform('convergeTime', 'float', (ctx, props) => (props.clock.getTime() - instance.timeBegin) % instance.getPeriod());
    const speed = uniforms.addUniform('convergeSpeed', 'float', 2 * 2 / (instance.getPeriod() / 2 * instance.getPeriod() / 2));
    const maxTravelTime = uniforms.addUniform('convergeMaxTravelTime', 'float', instance.getPeriod() / 2);

    // eslint-disable-next-line no-param-reassign
    vertexShader.mainBody += `
      {
        vec2 screenTarget = vec2(0., 0.);
        vec2 target = (screenTarget + vec2(1.)) / vec2(2.);

        vec2 d = target - initialPosition.xy;
        float d_len = length(d);

        float stop_t = sqrt(2. * d_len / ${speed});

        vec2 result;

        if(${time} < stop_t) {
          float t = min(${time}, stop_t);
          result = .5 * d / d_len * ${speed} * t * t;
        } else if(${time} < ${maxTravelTime}) {
          result = d;
        } else {
          float t = ${time} - ${maxTravelTime};
          result = mix(d, vec2(0.), -cos(t / ${maxTravelTime} * PI) * .5 + .5);
        }

        position.xy += result;
      }
    `;
  }

  static getTranslationId() {
    return 'converge_point';
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new ConvergePointConfigUI();
    }

    return this._configUI;
  }

  static getDefaultConfig() {
    return {
    };
  }

  static getRandomConfig() {
    return {
    };
  }
}
