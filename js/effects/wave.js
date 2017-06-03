import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';

const EffectName = 'Wave';

class WaveConfigUI extends ConfigUI {
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

export default class WaveEffect extends Effect {
  static register(instance, uniforms, vertexShader) {
    const time = uniforms.addUniform('time', 'float', (ctx, props) => fract((props.clock.getTime() - instance.timeBegin) / instance.getPeriod()));
    const rep = uniforms.addUniform('repetition', 'int', (ctx, props) => Math.floor((props.clock.getTime() - instance.timeBegin) / instance.getPeriod()));
    const multiplier = 2;
    const amplitude = 0.1;

    // goes from 0 (leftmost, begin) to 2 (leftmost, end)
    // but `reached` + `notOver` clamp it to 0 to 1
    const x = `(2. * ${time} - initialPosition.x)`;
    const curve = (x) => `(sin(${x} * float(${multiplier}) * 3. * PI - 0.5 * PI))`;
    const ease = `((cos((${x} * 2. - 1.) * PI) + 1.) / 2.)`;

    // eslint-disable-next-line no-param-reassign
    vertexShader.mainBody += `
      {
        float ease = 1.;
        if (${rep} == 0 && ${x} <= 0.5) {
          ease = ${ease};
        } else if (${rep} == ${instance.repetitions} - 1 && ${x} >= 0.5) {
          ease = ${ease};
        }
        float curve = ${curve(x)};
        float phase = ease * curve;
        float reached = (${x} >= 0.) ? 1. : 0.;
        if (${rep} != 0) {
          reached = 1.;
        }
        float notOver = (${x} <= 1.) ? 1. : 0.;
        if (${rep} != ${instance.repetitions} - 1) {
          notOver = 1.;
        }

        position.y += phase * reached * notOver * ${amplitude};
      }
    `;
  }

  static getDisplayName() {
    return EffectName;
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new WaveConfigUI();
    }

    return this._configUI;
  }

  static getDefaultConfig() {
    return {
    };
  }
}
