/**
 * Interface for effects
 */
export default class Effect {
  insertUniforms(/* uniforms */) {
    throw new Error('Method not implemented');
  }
  insertIntoVertexShader(/* vertexShader, state */) {
    throw new Error('Method not implemented');
  }
  static getId() {
    // Static + this = JS <3
    return this.name;
  }
}

export function fract(x) {
  return x - Math.floor(x);
}
