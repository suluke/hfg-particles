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
  constructor(webgl) {
    this.webgl = webgl;
    this.regl = createRegl({ gl: webgl });
    console.info(`max texture size: ${this.regl.limits.maxTextureSize}`);
    console.info(`point size dims: ${this.regl.limits.pointSizeDims[0]} ${this.regl.limits.pointSizeDims[1]}`);
    console.info(`max uniforms: ${this.regl.limits.maxVertexUniforms} ${this.regl.limits.maxFragmentUniforms}`);
    this.state = new RendererState(this.regl);
    this.config = null;
    this.commandBuilder = new CommandBuilder();
    this.clock = new RendererClock();
    this.resizeListeners = [];
    this.frameListeners = [];
    // low pass filtered FPS measurement found on stackoverflow.com/a/5111475/1468532
    this.frameTime = 0;
    this.pipelineCfg = {config: null, state: null, clock: null};
    this.regl.frame(() => {
      if (!this.state.isValid() || this.clock.isPaused())
        return;
      this.renderFrame();
    });
    const OnPausedResize = () => {
      // Wait for the resize event to be applied everywhere
      window.setTimeout((() => this.renderFrame()), 0);
    }
    this.clock.addPauseListener((paused) => {
      if (paused)
        this.addResizeListener(OnPausedResize);
      else
        this.removeResizeListener(OnPausedResize);
    });
  }

  renderFrame() {
    const FILTER_STRENGTH = 20;
    this.clock.frame();
    if (!this.clock.isPaused())
      this.frameTime += (this.clock.getDelta() - this.frameTime) / FILTER_STRENGTH;
    this.pipelineCfg.config = this.config,
    this.pipelineCfg.state  = this.state,
    this.pipelineCfg.clock  = this.clock
    this.state.pipeline.run(this.pipelineCfg);
    for (let i = 0; i < this.frameListeners.length; i++)
      this.frameListeners[i](this.webgl.canvas, this.frameTime);
  }

  resize(width, height) {
    this.state.resize(width, height);
    for (let i = 0; i < this.resizeListeners.length; i++) {
      const listener = this.resizeListeners[i];
      listener(width, height);
    }
  }
  addResizeListener(listener) {
    this.resizeListeners.push(listener);
  }
  removeResizeListener(listener) {
    const idx = this.resizeListeners.indexOf(listener);
    if (idx > -1)
      this.resizeListeners.splice(idx, 1);
    else
      console.warn('Could not find resize listener to be removed');
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
      if (this.clock.isPaused())
        this.renderFrame();
    }, (error) => console.error(error));
  }

  getState() {
    return this.state;
  }

  getFPS() {
    if (this.frameTime === 0) {
      return '?';
    }
    return Math.round(1000 / this.frameTime);
  }

  addFrameListener(listener) {
    this.frameListeners.push(listener);
  }
  removeFrameListener(listener) {
    const pos = this.frameListeners.indexOf(listener);
    if (pos >= 0) {
      this.frameListeners.splice(pos, 1);
    } else {
      throw new Error('Could not find frame listener to be removed');
    }
  }
}
