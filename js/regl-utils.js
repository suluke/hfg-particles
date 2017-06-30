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

class ShaderData {
  constructor(id, type) {
    this.data = [];
    this.id = id;
    this.type = type;
  }
  add(name, type, value) {
    const entry = { name, type, value };
    this.data.push(entry);

    return this.getNameFor(entry);
  }
  getNameFor(entry) {
    if (this.id === undefined) {
      return entry.name;
    } else {
      return `${entry.name}_${this.id}`;
    }
  }
  getCompiled(shader, storage = null) {
    const shaderStr = [];
    for (let i = 0; i < this.data.length; i++) {
      const entry = this.data[i];
      shaderStr.push(`${this.type} ${entry.type} ${this.getNameFor(entry)};`);
      if (storage !== null) {
        // eslint-disable-next-line no-param-reassign
        storage[this.getNameFor(entry)] = entry.value;
      }
    }
    return shaderStr.join('\n') + '\n';
  }
}

export class Uniforms extends ShaderData {
  constructor(id) {
    super(id, 'uniform');
  }
  addUniform(name, type, value) {
    return this.add(name, type, value);
  }
  compile(shader, uniforms = null) {
    // eslint-disable-next-line no-param-reassign
    shader.uniforms += this.getCompiled(shader, uniforms);
  }
}

export class Attributes extends ShaderData {
  constructor(id) {
    super(id, 'attribute');
  }
  addAttribute(name, type, value) {
    return this.add(name, type, value);
  }
  compile(shader, attributes = null) {
    // eslint-disable-next-line no-param-reassign
    shader.attributes += this.getCompiled(shader, attributes);
  }
}
