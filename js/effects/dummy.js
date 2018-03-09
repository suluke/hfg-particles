import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';

const EffectName = 'Dummy';

class DummyConfigUI extends ConfigUI {
  constructor() {
    super();
    const classPrefix = 'effect-dummy';
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

export default class DummyEffect extends Effect {
  static register(instance, props, uniforms, vertexShader) {
  }

  static getTranslationId() {
    return 'dummy';
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new DummyConfigUI();
    }

    return this._configUI;
  }

  static getDefaultConfig() {
    return {};
  }

  static getRandomConfig() {
    return {};
  }
}
