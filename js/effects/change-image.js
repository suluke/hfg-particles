import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';

const EffectName = 'Change Image';

class ChangeImageConfigUI extends ConfigUI {
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

export default class ChangeImageEffect extends Effect {
  static registerAsync(instance, props, uniforms, vertexShader) {
    return new Promise((res, rej) => {
      const srcImage = document.createElement('img');
      srcImage.crossOrigin = 'Anonymous'; // http://stackoverflow.com/a/27840082/1468532
      srcImage.src = 'https://i.imgur.com/f9PXrBM.jpg';
      srcImage.onload = () => {
        const particleData = props.state.createParticleDataFromDomImg(srcImage, props.config.xParticlesCount, props.config.yParticlesCount);
        let alive = true;
        let prevWasChange = false;
        const checkTime = () => {
          if (!alive) {
            return;
          }
          if (instance.timeBegin - props.clock.getTime() <= props.clock.getDelta()) {
            props.state.setParticleData(particleData);
          }
          window.requestAnimationFrame(checkTime);
        };
        checkTime();
        props.state.addHook(() => {
          alive = false;
        });
        res();
      };
    });
  }

  static getDisplayName() {
    return EffectName;
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new ChangeImageConfigUI();
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
