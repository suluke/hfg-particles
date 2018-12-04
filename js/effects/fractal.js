import Effect, { ConfigUI, fract } from './effect';
import WorkerCode from './workers/fractal.wjs';
import { parseHtml } from '../ui/util';
import Ease from './ease-mixins';

const EffectName = 'Fractal';
const EffectDescription = 'Lets the particles converge towards a fractal shape';

class FractalConfigUI extends ConfigUI {
  constructor() {
    super();
    const classPrefix = 'effect-fractal';
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
      </fieldset>
    `);
    const ui = this.element;
    Ease.extend(this, classPrefix);
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    return {};
  }

  applyConfig(config) {
  }
}

class FractalFactory {
  constructor() {
    this.props = null;
    this.worker = new Worker(URL.createObjectURL(new Blob([WorkerCode], { type: "text/javascript" })));
  }

  createDisplacmentMap() {
    if (!this.props)
      throw new Error('Cannot create displacement map prior to setting props');
    const { props } = this;
    const { config } = props;
    return new Promise((resolve, reject) => {
      this.worker.onmessage = (e) => {
        resolve(e.data);
      }
      this.worker.postMessage({ action: 'push', params: { width: config.xParticlesCount, height: config.yParticlesCount } });
    }).then((pushed) => new Promise((resolve, reject) => {
      this.worker.onmessage = (e) => {
        const map = new Float32Array(e.data);
        resolve(map);
      }
      this.worker.postMessage({ action: 'pop', params: null });
    }));
  }

  setProps(props) {
    this.props = props;
  }
}

export default class FractalEffect extends Effect {
  static registerAsync(instance, props, uniforms, vertexShader, frag, attributes) {
    const factory = FractalEffect.getFactory(props);
    return factory.createDisplacmentMap().then((map) => {
      const { id, buffer } = props.state.createBuffer(map);
      const offset = attributes.add('offset', 'vec2', buffer);
      const easeFunc = Ease.setupShaderEasing(instance, uniforms);
      // eslint-disable-next-line no-param-reassign
      vertexShader.mainBody += `
        {
          float ease = ${easeFunc};
          position = position + ease * vec3(${offset}, 0.);
        }
      `;
    });
  }

  static getDisplayName() {
    return EffectName;
  }

  static getDescription() {
    return EffectDescription;
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new FractalConfigUI();
    }

    return this._configUI;
  }

  static getDefaultConfig() {
    return {};
  }

  static getRandomConfig() {
    return {};
  }

  static getFactory(props) {
    if (!this._factory) {
      this._factory = new FractalFactory();
    }
    this._factory.setProps(props);

    return this._factory;
  }
}
