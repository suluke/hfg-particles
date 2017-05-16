/**
 * Interface for effects
 */
export default class Effect {
  insertUniforms(/* uniforms, ctx */) {
    throw new Error('Method not implemented');
  }
  insertIntoFragmentShader(/* fragmentShader, ctx */) {
    throw new Error('Method not implemented');
  }
  insertIntoVertexShader(/* vertexShader, ctx */) {
    throw new Error('Method not implemented');
  }
}

export function fract(x) {
  return x - Math.floor(x);
}
