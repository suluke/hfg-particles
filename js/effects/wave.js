import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';

const EffectName = 'Wave';

class WaveConfigUI extends ConfigUI {
  constructor() {
    super();
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
        <label>
          Number of waves:
          <input type="number" min="1" step="1" value="1" class="effect-wave-count" />
        </label><br/>
        <label>
          Amplitude:
          <input type="number" value="0.05" class="effect-wave-amplitude" />
        </label>
      </fieldset>
    `);
    const ui = this.element;

    this.waveCountInput = ui.querySelector('input.effect-wave-count');
    this.waveCountInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.amplitudeInput = ui.querySelector('input.effect-wave-amplitude');
    this.amplitudeInput.addEventListener('change', () => {
      this.notifyChange();
    });
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    const config = {};

    config.multiplier = parseInt(this.waveCountInput.value, 10);
    config.amplitude = parseFloat(this.amplitudeInput.value, 10);
    
    return config;
  }

  applyConfig(config) {
    this.waveCountInput.value = config.multiplier;
    this.amplitudeInput.value = config.amplitude;
  }
}

export default class WaveEffect extends Effect {
  static register(instance, state, uniforms, vertexShader) {
    const time = uniforms.addUniform('time', 'float', (ctx, props) => fract((props.clock.getTime() - instance.timeBegin) / instance.getPeriod()));
    const rep = uniforms.addUniform('repetition', 'int', (ctx, props) => Math.floor((props.clock.getTime() - instance.timeBegin) / instance.getPeriod()));
    const multiplier = instance.config.multiplier;
    const amplitude = instance.config.amplitude;

    // goes from 0 (leftmost, begin) to 2 (leftmost, end)
    // but `reached` + `notOver` clamp it to 0 to 1
    const x = `(2. * ${time} - initialPosition.x)`;
    // Closed formula (with ease): (cos(​(x*​2-​1)*​π)+​1)/​2 * ​sin(​x*​3*​π-​0.5*​π)/​0.8
    const curve = (x) => `(sin(${x} * float(${multiplier}) * 3. * PI - 0.5 * PI))`;
    // The ease function is a cos spanning two negative peaks with a positive peak
    // in between. This is is then translated (+1, /2) to go from 0 to 1
    // Finally, because this will lower the actual peak height of `curve`
    // a compensation factor of 1.25 is applied
    const ease = `((cos((${x} * 2. - 1.) * PI) + 1.) * 0.5 * 1.25)`;

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

        position.y += phase * reached * notOver * float(${amplitude});
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
      multiplier: 1,
      amplitude: 0.05
    };
  }
}
