import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';

const EffectName = 'Standing Wave';
const EffectDescription = 'A standing wave oscillates';

class StandingWaveConfigUI extends ConfigUI {
  constructor() {
    super();
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
        <label>
          Max Amplitude:
          <input type="number" class="effect-standing-wave-max-amplitude" value="0.05" />
        </label><br/>
        <label>
          Wave count:
          <input type="number" class="effect-standing-wave-wave-count" value="0.05" />
        </label><br/>
        <label>
          Time interpolator:
          <select class="effect-standing-wave-time-interpolation" value="sine">
            <option value="sine">Sine</option>
            <option value="linear">Linear</option>
          </select>
        </label><br/>
      </fieldset>
    `);
    const ui = this.element;
    this.maxAmplitudeInput = ui.querySelector('input.effect-standing-wave-max-amplitude');
    this.waveCountInput = ui.querySelector('input.effect-standing-wave-wave-count');
    this.timeInterpolationInput = ui.querySelector('select.effect-standing-wave-time-interpolation');

    this.maxAmplitudeInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.waveCountInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.timeInterpolationInput.addEventListener('change', () => {
      this.notifyChange();
    });
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    const config = {};
    config.maxAmplitude = parseFloat(this.maxAmplitudeInput.value, 10);
    config.waveCount = parseFloat(this.waveCountInput.value, 10);
    config.timeInterpolation = this.timeInterpolationInput.value;

    return config;
  }

  applyConfig(config) {
    this.maxAmplitudeInput.value = config.maxAmplitude;
    this.waveCountInput.value = config.waveCount;
    this.timeInterpolationInput.value = config.timeInterpolation;
  }
}

export default class StandingWaveEffect extends Effect {
  static register(instance, props, uniforms, vertexShader) {
    const maxAmplitude = instance.config.maxAmplitude;
    const waveCount = instance.config.waveCount;
    const timeInterpolation = instance.config.timeInterpolation;
    if (maxAmplitude !== 0) {
      const time = uniforms.addUniform('time', 'float', (ctx, props) => fract((props.clock.getTime() - instance.timeBegin) / instance.getPeriod()));
      const timeInterpolations = {
        linear: `abs(abs(mod(mod(${time} * 4. + 2., 4.) + 1., 4.)) - 2.) - 1.`, // no idea how I came up with this
        sine: `sin(${time} * 2. * PI)`
      };
      const timeInterpolStr = timeInterpolations[timeInterpolation] || timeInterpolations['linear'];
      // eslint-disable-next-line no-param-reassign
      vertexShader.mainBody += `
        float timeAmp = ${timeInterpolStr};
        float posAmp = sin(initialPosition.x * float(${waveCount}) * 2. * PI);
        float amplitude = ${instance.config.maxAmplitude} * posAmp * timeAmp;

        position.y += amplitude;
      `;
    }
  }

  static getDisplayName() {
    return EffectName;
  }

  static getDescription() {
    return EffectDescription;
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new StandingWaveConfigUI();
    }

    return this._configUI;
  }

  static getDefaultConfig() {
    return {
      maxAmplitude: 0.05,
      waveCount: 20,
      timeInterpolation: 'linear'
    };
  }

  static getRandomConfig() {
    return {
      maxAmplitude: 0.05,
      waveCount: 20,
      timeInterpolation: 'linear'
    };
  }
}
