/**
 * Interface for effects
 */
export default class Effect {
  static register(/* instance, props, uniforms, vertexShader */) {
    throw new Error('Method not implemented');
  }

  static registerAsync(instance, props, uniforms, vertexShader) {
    this.register(instance, props, uniforms, vertexShader);
    return Promise.resolve();
  }

  static getId() {
    // Static + this = JS <3
    return this.name;
  }

  static getDisplayName() {
    throw new Error('Method not implemented');
  }

  static getConfigUI() {
    throw new Error('Method not implemented');
  }

  static getDefaultConfig() {
    throw new Error('Method not implemented');
  }

  static getRandomConfig() {
    throw new Error('Method not implemented');
  }

  static getDescription() {
    throw new Error('Method not implemented');
  }

  static isEventOnly() {
    return false;
  }
}

/**
 * Interface for config UIs
 */
export class ConfigUI {
  // eslint-disable-next-line class-methods-use-this
  getElement() {
    throw new Error('Method not implemented');
  }
  // eslint-disable-next-line class-methods-use-this
  getConfig() {
    throw new Error('Method not implemented');
  }

  getConfigAsync() {
    return new Promise((resolve) => {
      resolve(this.getConfig());
    });
  }

  // eslint-disable-next-line class-methods-use-this
  applyConfig(/* config */) {
    throw new Error('Method not implemented');
  }

  // eslint-disable-next-line class-methods-use-this
  notifyChange() {
    // TODO
  }
}

export function fract(x) {
  return x - Math.floor(x);
}
