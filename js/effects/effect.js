/**
 * Interface for effects
 */
export default class Effect {
  static insertUniforms(/* uniforms */) {
    throw new Error('Method not implemented');
  }
  static insertIntoVertexShader(/* vertexShader, instance */) {
    throw new Error('Method not implemented');
  }
  static getId() {
    // Static + this = JS <3
    return this.name;
  }

  static getConfigUI() {
    throw new Error('Method not implemented');
  }

  static getDefaultConfig() {
    throw new Error('Method not implemented');
  }
}

/**
 * Interface for config UIs
 */
export class ConfigUI {
  getElement() {
    throw new Error('Method not implemented');
  }
  getConfig() {
    throw new Error('Method not implemented');
  }
  applyConfig(/* config */) {
    throw new Error('Method not implemented');
  }

  notifyChange() {
    // TODO
  }
}

export function fract(x) {
  return x - Math.floor(x);
}
