import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';

const EffectName = 'Reset Default Image';

class ResetDefaultImageConfigUI extends ConfigUI {
  constructor() {
    super();
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
        Nothing to be configured :)
      </fieldset>
    `);
    const ui = this.element;
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

export default class ResetDefaultImageEffect extends Effect {
  static register(instance, props, uniforms, vertexShader) {
    let alive = true;
    let prevWasChange = false;
    const checkTime = () => {
      if (!alive) {
        return;
      }
      const tDist = props.clock.getTime() - instance.timeBegin;
      if (0 <= tDist && tDist <= props.clock.getDelta()) {
        props.state.setParticleData(0);
      }
      window.requestAnimationFrame(checkTime);
    };
    checkTime();
    props.state.addHook(() => {
      alive = false;
    });
  }

  static getTranslationId() {
    return 'reset_default_image';
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new ResetDefaultImageConfigUI();
    }

    return this._configUI;
  }

  static getDefaultConfig() {
    return {};
  }

  static getRandomConfig() {
    return {};
  }

  static isEventOnly() {
    return true;
  }
}
