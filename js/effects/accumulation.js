import Effect, { ConfigUI, fract } from './effect';
import { Framebuffer, FullscreenRectCommand } from '../regl-utils';

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

export default class AccumulationEffect extends Effect {
  static getEffectStepClass() {
    throw new Error('Not implemented');
  }

  static register(instance, props) {
    let readFramebuffer = props.state.acquireFramebuffer();
    let writeFramebuffer = props.state.acquireFramebuffer();

    const getReadTex = () => readFramebuffer.texture;
    const getReadBuf = () => readFramebuffer.framebuffer;
    const getWriteBuf = () => writeFramebuffer.framebuffer;

    const regl = props.state.regl;
    const stepCommand = new this.getEffectStepClass();
    const applyParticleToAccumulationCommand = regl(new ApplyParticleToAccumulationCommand(getReadBuf));
    const compositeParticleAccumulationCommand = regl(new CompositeParticleAccumulationCommand(getReadTex, getWriteBuf));

    props.state.pipeline.addPrePass(stepCommand);
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
}
