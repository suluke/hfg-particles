import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';

const EffectName = 'Sparkle';

class SparkleConfigUI extends ConfigUI {
  constructor() {
    super();
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
        <label>
          min scale: <input type="number" min="0" max="100" step="1" class="effect-sparkle-minscale">%
        </label><br/>
        <label>
          max scale: <input type="number" min="100" step="1" class="effect-sparkle-maxscale">%
        </label><br/>
        <label>
          sparkle ratio: <input type="number" min="0" step="1" class="effect-sparkle-ratio">%
        </label><br/>
        <label>
          sparkle duration: <input type="number" min="0" step="1" class="effect-sparkle-duration">ms
        </label>
      </fieldset>
    `);
    const ui = this.element;
    this.minScaleInput = ui.querySelector('.effect-sparkle-minscale');
    this.maxScaleInput = ui.querySelector('.effect-sparkle-maxscale');
    this.ratioInput = ui.querySelector('.effect-sparkle-ratio');
    this.durationInput = ui.querySelector('.effect-sparkle-duration');

    this.minScaleInput.addEventListener('input', () => {
      this.notifyChange();
    });
    this.maxScaleInput.addEventListener('input', () => {
      this.notifyChange();
    });
    this.ratioInput.addEventListener('input', () => {
      this.notifyChange();
    });
    this.durationInput.addEventListener('input', () => {
      this.notifyChange();
    });
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    const config = {};

    config.scaleMin = parseInt(this.minScaleInput.value, 10) / 100;
    config.scaleMax = parseInt(this.maxScaleInput.value, 10) / 100;
    config.ratio = parseInt(this.ratioInput.value, 10) / 100;
    config.duration = parseInt(this.durationInput.value);

    return config;
  }

  applyConfig(config) {
    this.minScaleInput.value = Math.round(config.scaleMin * 100);
    this.maxScaleInput.value = Math.round(config.scaleMax * 100);
    this.ratioInput.value = Math.round(config.ratio * 100);
    this.durationInput.value = config.duration;
  }
}

export default class SparkleEffect extends Effect {
  static register(instance, props, uniforms, vertexShader, frag, attributes) {
    // Params
    const { scaleMin, scaleMax, ratio, duration } = instance.config;

    if (scaleMin >= 1 && scaleMax <= 1) {
      return;
    }

    /* How does this work ?
    ProgressFun does some fancy animation on the point size. It does so
    by taking a x value which goes from 0 to 1 in duration time. This is
    a sawtooth function. Since we want the effect to look random, we
    employ a random period (which is based on the duration and the
    ratio) and offset the function by a random value dependent on the
    period. So it looks like this:
     x
    1      /|          /|
          / |         / |
         /  |        /  |
        /   |       /   |
       /    |      /    |
    0 ----+----------------
          0                t
      |  d  |        duration
      |     p     |  period
      | o |          offset

    Since the function differs for each particle, we need to make sure
    that we always display the complete animation and not start
    somewhere in the middle with x != 0 and always end with x == 1.
    */

    // Shader values
    const particlesCount = props.config.xParticlesCount * props.config.yParticlesCount;
    const periodData = new Float32Array(particlesCount);
    const offsetData = new Float32Array(particlesCount);
    for(let i = 0; i < particlesCount; i++) {
      // The period is based on duration (clear).
      // Divide by ratio to get a reduced effect with smaller ratios.
      // Randomize the period by shifting it a bit in any direction.
      periodData[i] = Math.max((1 + (Math.random() * 2 - 1) * .25) * duration / ratio, duration);
      offsetData[i] = Math.random() * periodData[i];
    }

    const { id: periodBufId, buffer: periodBuffer } = props.state.createBuffer(periodData);
    const { id: offsetBufId, buffer: offsetBuffer } = props.state.createBuffer(offsetData);

    const period = attributes.add('period', 'float', periodBuffer);
    const offset = attributes.add('offset', 'float', offsetBuffer);

    let progressFun = `
      float dMin = float(${scaleMin});
      float dMax = float(${scaleMax});
      float a = (2. * dMax - 6. * dMin + 4.);
      float b = 4. * dMin - 0.25 * a - 4.;
      float progressFun = 1. - sin(2. * PI * x) * (a * pow(x, 2.) + b * x + 1.);
    `;
    if (scaleMin >= 1) {
      progressFun = `
        float dMax = float(${scaleMax}) - 1.;
        float progressFun = 1. + (1. - cos(2. * PI * x)) * dMax / 2.;
      `
    } else if (scaleMax <= 1) {
      progressFun = `
        float dMin = 1. - float(${scaleMin});
        float progressFun = 1. + cos(2. * PI * x) * dMin / 2.;
      `
    } 

    // eslint-disable-next-line no-param-reassign
    vertexShader.mainBody += `
      {
        float firstPeriodBegin = float(${instance.timeBegin}) - ${offset};
        if (firstPeriodBegin < float(${instance.timeBegin})) firstPeriodBegin += ${period};
        float lastPeriodBegin = float(${instance.timeBegin}) + ceil(float(${instance.timeEnd - instance.timeBegin}) / ${period}) * ${period} - ${offset};
        if (lastPeriodBegin > float(${instance.timeEnd})) lastPeriodBegin -= ${period};
        float lastPeriodLength = float(${instance.timeEnd}) - lastPeriodBegin;
        if (float(globalTime) >= firstPeriodBegin
          && (lastPeriodLength >= float(${duration}) || float(globalTime) < lastPeriodBegin)) {
          float t = mod(float(globalTime) - float(${instance.timeBegin}) + ${offset}, ${period});
          float x = t > float(${duration}) ? 0. : t * ${1/duration};
          ${progressFun}
          pointSize *= progressFun;
          color *= progressFun;
        }
      }
    `;
  }

  static getTranslationId() {
    return 'sparkle';
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new SparkleConfigUI();
    }

    return this._configUI;
  }

  static getDefaultConfig() {
    return {
      scaleMin: 0.5,
      scaleMax: 2,
      ratio: 0.7,
      duration: 700
    };
  }

  static getRandomConfig() {
    return {
      scaleMin: parseFloat(Math.random().toFixed(3)),
      scaleMax: parseFloat(Math.max(1, Math.random() * 15).toFixed(3)),
      ratio: parseFloat(Math.random().toFixed(3)),
      duration: Math.max(500, Math.round(Math.random() * 5000))
    };
  }
}
