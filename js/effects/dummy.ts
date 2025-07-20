import Effect, { ConfigUI, fract, EffectConfig } from './effect';
import { parseHtml } from '../ui/util';

const EffectName = 'Dummy';
const EffectDescription = 'An effect that has no effect - useful to extend the timeline length without having anything happen';

class DummyConfigUI extends ConfigUI {
  private element: HTMLElement;

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

  getElement(): HTMLElement {
    return this.element;
  }

  getConfig(): EffectConfig {
    return {};
  }

  applyConfig(config: EffectConfig): void {
  }
}

export default class DummyEffect extends Effect {
  private static _configUI: DummyConfigUI;

  static override register(instance: any, props: any, uniforms: any, vertexShader: string): void {
  }

  static override getDisplayName(): string {
    return EffectName;
  }

  static override getDescription(): string {
    return EffectDescription;
  }

  static override getConfigUI(): DummyConfigUI {
    if (!this._configUI) {
      this._configUI = new DummyConfigUI();
    }

    return this._configUI;
  }

  static override getDefaultConfig(): EffectConfig {
    return {};
  }

  static override getRandomConfig(): EffectConfig {
    return {};
  }
}
