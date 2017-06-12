import Effect, { ConfigUI, fract } from './effect';
import { Framebuffer, FullscreenRectCommand } from '../regl-utils';
import { parseHtml } from '../ui/util';

const EffectName = 'Blur';
const Modes = ['trails', 'smooth_trails', 'smear'];

class AccumulationConfigUI extends ConfigUI {
  constructor() {
    super();
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
        <select>
          <option value="trails">trails</option>
          <option value="smooth_trails">smooth trails</option>
          <option value="smear">smear</option>
        </select>
      </fieldset>
    `);
    const ui = this.element;
    this.modeSelect = ui.querySelector('select');
    this.modeSelect.addEventListener('input', () => {
      this.notifyChange();
    });
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    const config = {};
    config.mode = this.element.querySelector('option:checked').value;
    return config;
  }

  applyConfig(config) {
    this.element.querySelector(`option[value="${config.mode}"]`).selected = true;
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

class ApplyParticleToAccumulationCommand extends FullscreenRectCommand {
  constructor(getWriteBuf) {
    super();
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
    this.uniforms = {
      texture: (ctx, props) => props.framebuffer.texture
    };
    this.framebuffer = getWriteBuf;
    this.blend = {
      enable: true,
      func:   { src: 'one', dst: 'one' }
    };
  }
}

class CompositeParticleAccumulationCommand extends FullscreenRectCommand {
  constructor(getAccumulationTex, getWriteBuf) {
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
      particleTexture: (ctx, props) => props.framebuffer.texture,
      accumulationTexture: getAccumulationTex
    };
    this.framebuffer = getWriteBuf;
  }
}

export default class Accumulation extends Effect {
  static register(instance, props) {
    let readFramebuffer = props.state.acquireFramebuffer();
    let writeFramebuffer = props.state.acquireFramebuffer();

    const getReadTex = () => readFramebuffer.texture;
    const getReadBuf = () => readFramebuffer.framebuffer;
    const getWriteBuf = () => writeFramebuffer.framebuffer;

    const regl = props.state.regl;
    const trailsAccumulationStepCommand = regl(new TrailsStepCommand(getReadTex, getWriteBuf));
    const smoothTrailsAccumulationStepCommand = regl(new SmoothTrailsStepCommand(getReadTex, getWriteBuf));
    const smearAccumulationStepCommand = regl(new SmearStepCommand(getReadTex, getWriteBuf));
    const applyParticleToAccumulationCommand = regl(new ApplyParticleToAccumulationCommand(getReadBuf));
    const compositeParticleAccumulationCommand = regl(new CompositeParticleAccumulationCommand(getReadTex, getWriteBuf));
    const stepCommands = {
      trails: trailsAccumulationStepCommand,
      smooth_trails: smoothTrailsAccumulationStepCommand,
      smear: smearAccumulationStepCommand
    }

    props.state.pipeline.addPrePass(stepCommands[instance.config.mode]);
    props.state.pipeline.addPostPass((props) => {
      // pre-pass is done. That means it's a good time to consider the
      // contents of the former writeFramebuffer as read-only
      [readFramebuffer, writeFramebuffer] = [writeFramebuffer, readFramebuffer];
      compositeParticleAccumulationCommand(props);
      applyParticleToAccumulationCommand(props);
      let outputBuf = writeFramebuffer;
      // assume ownership over the former input framebuffer
      writeFramebuffer = props.framebuffer;
      return outputBuf;
    });
  }

  static getDisplayName() {
    return EffectName;
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new AccumulationConfigUI();
    }

    return this._configUI;
  }

  static getDefaultConfig() {
    return {
      mode: 'trails'
    };
  }

  static getRandomConfig() {
    return {
      mode: Modes[Math.floor(Math.random() * modes.length)]
    };
  }
}
