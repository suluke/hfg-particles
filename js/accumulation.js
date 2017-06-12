export class Framebuffer {
  constructor(regl) {
    this.texture = regl.texture({ width: 1, height: 1, min: 'linear', mag: 'linear' }); // call resize before first use !
    this.framebuffer = regl.framebuffer({ color: this.texture, depth: false, stencil: false, depthStencil: false });
  }

  resize(width, height) {
    this.framebuffer.resize(width, height);
  }
}

class FullscreenRectCommand {
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

class TextureToFramebufferCommand extends FullscreenRectCommand {
  constructor(getReadTex, getWriteBuf) {
    super();
    this.uniforms = {
      texture: getReadTex
    };
    this.framebuffer = getWriteBuf;
  }
}

class TrailsStepCommand extends TextureToFramebufferCommand {
  constructor(getReadTex, getWriteBuf) {
    super(getReadTex, getWriteBuf);
    this.frag = `
      precision highp float;
      uniform sampler2D texture;
      varying vec2 texcoord;
      void main() {
        vec3 color = texture2D(texture, texcoord).rgb;
        color *= .9;
        gl_FragColor = vec4(color, 1);
      }
    `;
  }
}

class SmoothTrailsStepCommand extends TextureToFramebufferCommand {
  constructor(getReadTex, getWriteBuf) {
    super(getReadTex, getWriteBuf);
    this.frag = `
      precision highp float;
      uniform sampler2D texture;
      uniform vec2 kernelSize;
      varying vec2 texcoord;
      void main() {
        vec3 color = /* texture2D(texture, vec2(texcoord.x, texcoord.y)).rgb * .2 + */
          texture2D(texture, vec2(texcoord.x + kernelSize.x, texcoord.y)).rgb * .25 +
          texture2D(texture, vec2(texcoord.x - kernelSize.x, texcoord.y)).rgb * .25 +
          texture2D(texture, vec2(texcoord.x, texcoord.y + kernelSize.y)).rgb * .25 +
          texture2D(texture, vec2(texcoord.x, texcoord.y - kernelSize.y)).rgb * .25;
        color *= .98;
        gl_FragColor = vec4(color, 1);
      }
    `;
    this.uniforms.kernelSize = () => {
      const readTex = getReadTex();
      return [4 / readTex.width, 4 / readTex.height];
    };
  }
}

class SmearStepCommand extends TextureToFramebufferCommand {
  constructor(getReadTex, getWriteBuf) {
    super(getReadTex, getWriteBuf);
    this.frag = `
      precision highp float;
      uniform sampler2D texture;
      uniform vec2 invTextureSize;
      varying vec2 texcoord;
      void main() {
        vec2 smearDir = vec2(-texcoord.y + .5, texcoord.x - .5);
        vec3 color = texture2D(texture, texcoord + smearDir * invTextureSize * 8.).rgb;
        color *= .975;
        gl_FragColor = vec4(color, 1);
      }
    `;
    this.uniforms.invTextureSize = () => {
      const readTex = getReadTex();
      return [1 / readTex.width, 1 / readTex.height];
    };
  }
}

class ApplyParticleToAccumulationCommand extends TextureToFramebufferCommand {
  constructor(getReadTex, getWriteBuf) {
    super(getReadTex, getWriteBuf);
    this.frag = `
      precision highp float;
      uniform sampler2D texture;
      varying vec2 texcoord;
      void main() {
        vec3 color = texture2D(texture, texcoord).rgb;
        color *= .25;
        gl_FragColor = vec4(color, 1);
      }
    `;
    this.blend = {
      enable: true,
      func:   { src: 'one', dst: 'one' }
    };
  }
}

class CompositeParticleAccumulationCommand extends FullscreenRectCommand {
  constructor(getParticleTex, getAccumulationTex) {
    super();
    this.frag = `
      precision highp float;
      uniform sampler2D particleTexture;
      uniform sampler2D accumulationTexture;
      varying vec2 texcoord;
      void main() {
        vec3 particleColor = texture2D(particleTexture, texcoord).rgb;
        vec3 accumulationColor = texture2D(accumulationTexture, texcoord).rgb;
        vec3 color = particleColor * .5 + accumulationColor * .5;
        gl_FragColor = vec4(color, 1);
      }
    `;
    this.uniforms = {
      particleTexture: getParticleTex,
      accumulationTexture: getAccumulationTex
    };
  }
}

export default class Accumulation {
  constructor(regl, particleFramebuffer) {
    this.accumulationReadFramebuffer = new Framebuffer(regl);
    this.accumulationWriteFramebuffer = new Framebuffer(regl);

    const getReadTex = () => this.accumulationReadFramebuffer.texture;
    const getWriteTex = () => this.accumulationWriteFramebuffer.texture;
    const getWriteBuf = () => this.accumulationWriteFramebuffer.framebuffer;
    
    this.trailsAccumulationStepCommand = regl(new TrailsStepCommand(getReadTex, getWriteBuf));
    this.smoothTrailsAccumulationStepCommand = regl(new SmoothTrailsStepCommand(getReadTex, getWriteBuf));
    this.smearAccumulationStepCommand = regl(new SmearStepCommand(getReadTex, getWriteBuf));
    this.applyParticleToAccumulationCommand = regl(new ApplyParticleToAccumulationCommand(particleFramebuffer.texture, getWriteBuf));
    this.compositeParticleAccumulationCommand = regl(new CompositeParticleAccumulationCommand(particleFramebuffer.texture, getWriteTex));
  }
}
