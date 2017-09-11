import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';

const EffectName = 'Reset Default Image';
const EffectDescription = 'This effect changes the currently active image ' +
                          'back to the default image (i.e. what came from ' +
                          'the server or was uploaded by the user)';

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
      if (instance.timeBegin - props.clock.getTime() <= props.clock.getDelta()) {
        props.state.setParticleData(0);
      }
      window.requestAnimationFrame(checkTime);
    };
    checkTime();
    props.state.addHook(() => {
      alive = false;
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
