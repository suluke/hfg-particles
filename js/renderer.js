import createRegl from 'regl';
import CommandBuilder from './command-builder';
import RendererClock from './renderer/clock';
import RendererState from './renderer/state';

/**
 * The Renderer's job is to perform the following steps:
 * 1. Take a config object with the user's desired settings
 * 2. Inform the RendererState (state) about the new user config
 * 3. Create a new regl command for rendering frames according to the config
 * 4. Update the pipeline so that effects become available that require
 *    more than a single render pass.
 * 5. Inside the regl.frame callback (render loop), hydrate the regl
 *    command (the pipeline, to be more precise) with the current state
 *    and clock info (cf. RendererClock)
 */
export default class Renderer {
  constructor(canvas) {
    this.regl = createRegl({ canvas });
    console.info(`max texture size: ${this.regl.limits.maxTextureSize}`);
    console.info(`point size dims: ${this.regl.limits.pointSizeDims[0]} ${this.regl.limits.pointSizeDims[1]}`);
    console.info(`max uniforms: ${this.regl.limits.maxVertexUniforms} ${this.regl.limits.maxFragmentUniforms}`);
    this.state = new RendererState(this.regl);
    this.config = null;
    this.commandBuilder = new CommandBuilder();
    this.clock = new RendererClock();
    this.regl.frame(() => {
      if (!this.state.isValid()) {
        return;
      }
      this.clock.frame();
      this.state.pipeline.run({
        config: this.config,
        state:  this.state,
        clock:  this.clock
      });
    });
  }

  resize(width, height) {
    this.state.resize(width, height);
  }

  getClock() {
    return this.clock;
  }

  setConfig(config) {
    this.config = config;
    // TODO: rebuild command only when necessary
    this.state.adaptToConfig(config);
    this.commandBuilder.buildCommand({
        config: this.config,
        state:  this.state,
        clock:  this.clock
    })
    .then((command) => {
      this.clock.reset();
      this.clock.setPeriod(this.config.duration);
      this.state.pipeline.compile(this.regl(command));
    }, (error) => console.error(error));
  }

  getState() {
    return this.state;
  }
}
