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
