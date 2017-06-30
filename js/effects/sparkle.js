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

export default class SparkleEffect extends Effect {
  static register(instance, props, uniforms, vertexShader, frag, attributes) {
    // Params
    const scaleMin = 1;
    const scaleMax = 2;
    const sparklePercentage = 0.7;
    const sparkleTime = Math.round(instance.getPeriod() / 20);

    // The next line is supposed to calculate the likelyhood by which
    // particles have to start to sparkle if we want to have an average 
    // of <sparklePercentage> of all particles sparkling within 100 frames
    // FIXME the 100 frames are pretty arbitrary
    const prob = Math.pow(1 - sparklePercentage, 1 / 100);
    const shouldStart = () => {
      if (props.clock.getTime() + sparkleTime > instance.timeEnd)
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
          if (progresses[i] != 0 || shouldStart()) {
            progresses[i] += props.clock.getDelta() / sparkleTime;
            if (progresses[i] > 1) {
              progresses[i] = 0;
            }
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
      float dMin = 1. - float(${scaleMin});
      float dMax = float(${scaleMax}) - 1.;
      float a = (dMax - 3. * dMin + 2.) / 0.375;
      float b = 4. * dMin - 0.25 * a - 4.;
      float progressFun = 1. + sin(2. * PI * x) * (a * pow(x, 2.) + b * x + 1.);
    `;
    if (scaleMin >= 1) {
      progressFun = `
        float dMax = float(${scaleMax}) - 1.;
        float progressFun = 1. + (1. - cos(2. * PI * x)) * dMax / 2.;
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
    };
  }

  static getRandomConfig() {
    return this.getDefaultConfig();
  }
}
