import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';

const EffectName = 'Sparkle';
const EffectDescription = 'Particle size and brightness increase randomly';

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

    // The next line is supposed to calculate the likelyhood by which
    // particles have to start to sparkle if we want to have an average 
    // of <ratio> of all particles sparkling within 100 frames
    // FIXME the 100 frames are pretty arbitrary
    const prob = Math.pow(1 - ratio, 1 / 100);
    const shouldStart = () => {
      if (props.clock.getTime() + duration > instance.timeEnd)
        return false;
      if (Math.random() < prob)
        return false;
      return true;
    };

    // Shader values
    const particlesCount = props.config.xParticlesCount * props.config.yParticlesCount;
    const progresses = new Float32Array(particlesCount);
    const { id: bufId, buffer } = props.state.createBuffer({
      usage: 'dynamic',
      type: 'float',
      length: particlesCount,
      data: progresses
    });
    
    const progress = attributes.add('progress', 'float', (ctx, props) => {
      const time = props.clock.getTime();
      if (instance.timeBegin <= time && time <= instance.timeEnd) {
        for (let i = 0; i < progresses.length; i++) {
          if (progresses[i] !== 0 || shouldStart()) {
            if (progresses[i] > 1) {
              progresses[i] = 0;
              continue;
            }
            progresses[i] += props.clock.getDelta() / duration;
          }
        }
        buffer({ data: progresses });
      } else if (instance.timeEnd < time && time - props.clock.getDelta() <= instance.timeEnd) {
        const progresses = new Float32Array(particlesCount);
        buffer({ data: progresses });
      }
      return buffer;
    });

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
        float x = ${progress};
        ${progressFun};
        pointSize *= progressFun;
        color *= progressFun;
      }
    `;
  }

  static getDisplayName() {
    return EffectName;
  }

  static getDescription() {
    return EffectDescription;
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
