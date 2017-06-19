export class Framebuffer {
  constructor(regl) {
    this.texture = regl.texture({ width: 1, height: 1, min: 'linear', mag: 'linear' }); // call resize before first use !
    this.framebuffer = regl.framebuffer({ color: this.texture, depth: false, stencil: false, depthStencil: false });
  }

  resize(width, height) {
    this.framebuffer.resize(width, height);
  }
}

export class FullscreenRectCommand {
  constructor() {
    this.vert = `
      precision highp float;
      attribute vec2 v_texcoord;
      varying vec2 texcoord;
      void main() {
        texcoord = v_texcoord;
        gl_Position = vec4(v_texcoord * vec2(2) - vec2(1), 0, 1);
      }
    `;
    this.attributes = {
      v_texcoord: [[0, 0], [1, 0], [0, 1], [1, 1]]
    };
    this.depth = false;
    this.primitive = 'triangle strip';
    this.count = 4;
  }
}

export class Shader {
  constructor() {
    this.attributes = '';
    this.uniforms = '';
    this.varyings = '';
    this.globals = '';
    this.functions = '';
    this.mainBody = '';
  }

  compile() {
    return `
      precision highp float;

      // Attributes
      ${this.attributes}

      // Uniforms
      ${this.uniforms}

      // Varyings
      ${this.varyings}

      // Globals
      ${this.globals}

      // Functions
      ${this.functions}

      void main() {
        ${this.mainBody}
      }
    `;
  }
}

export class Uniforms {
  constructor(id) {
    this.uniforms = [];
    this.id = id;
  }
  addUniform(name, type, value) {
    const uniform = { name, type, value };
    this.uniforms.push(uniform);

    return this.getNameFor(uniform);
  }
  getNameFor(uniform) {
    if (this.id === undefined) {
      return uniform.name;
    } else {
      return `${uniform.name}_${this.id}`;
    }
  }
  compile(shader, uniforms = null) {
    const shaderStr = [];
    for (let i = 0; i < this.uniforms.length; i++) {
      const uniform = this.uniforms[i];
      shaderStr.push(`uniform ${uniform.type} ${this.getNameFor(uniform)};`);
      if (uniforms !== null) {
        // eslint-disable-next-line no-param-reassign
        uniforms[this.getNameFor(uniform)] = uniform.value;
      }
    }
    // eslint-disable-next-line no-param-reassign
    shader.uniforms += shaderStr.join('\n') + '\n';
  }
}
