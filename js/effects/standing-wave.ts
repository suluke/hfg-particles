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
          <input type="number" min="1" step="1" class="effect-standing-wave-wave-count" value="20" />
        </label><br/>
        <label>
          Dimension:
          <select class="effect-standing-wave-dimension" value="y">
            <option value="y">Y</option>
            <option value="x">X</option>
          </select>
        </label><br/>
        <label>
          Time interpolator:
          <select class="effect-standing-wave-time-interpolation" value="sine">
            <option value="sine">Sine</option>
            <option value="linear">Linear</option>
          </select>
        </label><br/>
        <label>
          Wave function:
          <select class="effect-standing-wave-function" value="sine">
            <option value="sine">Sine</option>
            <option value="linear">Triangle</option>
          </select>
        </label>
      </fieldset>
    `);
    const ui = this.element;
    this.maxAmplitudeInput = ui.querySelector('input.effect-standing-wave-max-amplitude');
    this.waveCountInput = ui.querySelector('input.effect-standing-wave-wave-count');
    this.timeInterpolationInput = ui.querySelector('select.effect-standing-wave-time-interpolation');
    this.functionInput = ui.querySelector('select.effect-standing-wave-function');
    this.dimensionInput = ui.querySelector('select.effect-standing-wave-dimension');

    this.maxAmplitudeInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.waveCountInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.timeInterpolationInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.functionInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.dimensionInput.addEventListener('change', () => {
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
    config.waveFunction = this.functionInput.value;
    config.dimension = this.dimensionInput.value;

    return config;
  }

  applyConfig(config) {
    this.maxAmplitudeInput.value = config.maxAmplitude;
    this.waveCountInput.value = config.waveCount;
    this.timeInterpolationInput.value = config.timeInterpolation;
    this.functionInput.value = config.waveFunction;
    this.dimensionInput.value = config.dimension;
  }
}

export default class StandingWaveEffect extends Effect {
  static register(instance, props, uniforms, vertexShader) {
    const maxAmplitude = instance.config.maxAmplitude || 0.05;
    const waveCount = instance.config.waveCount || 20;
    const timeInterpolation = instance.config.timeInterpolation || 'sine';
    const waveFunction = instance.config.waveFunction || 'sine';
    const dimension = instance.config.dimension || 'x';
    const otherDim = {x: 'y', y: 'x'}[dimension];
    if (maxAmplitude !== 0) {
      const time = uniforms.addUniform('time', 'float', (ctx, props) => fract((props.clock.getTime() - instance.timeBegin) / instance.getPeriod()));
      const timeInterpolations = {
        // 'linear' is a triangle function that interpolates the points (0,0),(0.25,1),(0.5,0),(0.75,-1),(1,0)
        // i.e. |/\___
        //      |  \/
        linear: `abs(fract(t + 0.75) - 0.5) * 4. - 1.`,
        sine: `sin(t * 2. * PI)`
      };
      const timeInterpolStr = timeInterpolations[timeInterpolation] || timeInterpolations['linear'];
      const waveFunctions = {
        linear: `abs(fract(x + 0.75) - 0.5) * 4. - 1.`,
        sine: `sin(x * 2. * PI)`
      };
      const waveFuncStr = waveFunctions[waveFunction] || waveFunctions['linear'];
      // eslint-disable-next-line no-param-reassign
      vertexShader.mainBody += `
        float t = ${time};
        float x = initialPosition.${otherDim} * float(${waveCount});
        float timeAmp = ${timeInterpolStr};
        float posAmp = ${waveFuncStr};
        float amplitude = ${instance.config.maxAmplitude} * posAmp * timeAmp;

        position.${dimension} += amplitude;
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
      timeInterpolation: 'linear',
      waveFunction: 'linear',
      dimension: 'y'
    };
  }

  static getRandomConfig() {
    return {
      maxAmplitude: Math.random() * 0.2,
      waveCount: 1 + Math.random() * 30,
      timeInterpolation: ['linear', 'sine'][Math.round(Math.random())],
      waveFunction: ['linear', 'sine'][Math.round(Math.random())],
      dimension: ['y', 'x'][Math.round(Math.random())]
    };
  }
}
