import createRegl from 'regl';
import CommandBuilder from './command-builder';
import { Framebuffer, FullscreenRectCommand, Shader, Uniforms } from './regl-utils';

class RendererClock {
  constructor() {
    this.time = -1;
    this.delta = 0;
    this.absTime = Date.now();
    this.period = 1000;
    this.paused = false;
    this.wrapListeners = [];
    this.pauseListeners = [];
  }
  frame() {
    if (this.paused || this.period === 0) {
      this.delta = 0;
      return;
    }
    if (this.time === -1) {
      // it was requested that we start at zero
      this.absTime = Date.now();
      this.time = 0;
    } else {
      const oldTime = this.absTime;
      this.absTime = Date.now();
      this.delta = this.absTime - oldTime;
      this.time += this.delta;
      while (this.time >= this.period) {
        this.time -= this.period;
        for (let i = 0; i < this.wrapListeners.length; i++) {
          window.setTimeout(() => this.wrapListeners[i](), 0);
        }
      }
    }
  }
  reset() {
    this.time = -1;
    this.delta = 0;
    this.absTime = Date.now();
  }
  setPeriod(p) {
    this.period = p;
  }
  getTime() {
    return this.time;
  }
  setTime(time) {
    this.time = time;
    this.delta = 0;
    this.absTime = Date.now();
  }
  getDelta() {
    return this.delta;
  }
  getAbsoluteTime() {
    return this.absTime;
  }
  setPaused(paused = true) {
    if (paused !== this.paused) {
      if (!paused) {
        // on unpause
        this.delta = 0;
        this.absTime = Date.now();
      }
      this.paused = paused;
      for (let i = 0; i < this.pauseListeners.length; i++) {
        this.pauseListeners[i](paused);
      }
    }
  }
  getPaused() {
    return this.paused;
  }
  addWrapListener(listener) {
    this.wrapListeners.push(listener);
  }
  removeWrapListener(listener) {
    this.wrapListeners.splice(this.wrapListeners.indexOf(listener), 1);
  }
  addPauseListener(listener) {
    this.pauseListeners.push(listener);
  }
  removePauseListener(listener) {
    this.pauseListeners.splice(this.pauseListeners.indexOf(listener), 1);
  }
}

class ParticleData {
  constructor(imageData, regl, width, height) {
    this.destroyed = false;
    
    const scalingCanvas = document.createElement('canvas');
    const scalingContext = scalingCanvas.getContext('2d');
    scalingCanvas.width = width;
    scalingCanvas.height = height;
    scalingContext.drawImage(imageData, 0, 0, scalingCanvas.width, scalingCanvas.height);
    const scaledData = scalingContext.getImageData(0, 0, scalingCanvas.width, scalingCanvas.height);

    const w = scaledData.width;
    const h = scaledData.height;

    const particlePixels = scaledData.data;

    const pixelIndices = Array.from(Array(w * h).keys());

    const texcoords = pixelIndices.map((i) => [((i % w) + 0.5) / w, (Math.floor(i / w) + 0.5) / h]);

    const rgb = pixelIndices.map((i) => {
      const pixel = particlePixels.slice(i * 4, (i * 4) + 4);

      return [pixel[0] / 255, pixel[1] / 255, pixel[2] / 255];
    });

    const hsv = pixelIndices.map((i) => {
      const pixel = rgb[i];

      const cMax = Math.max(pixel[0], pixel[1], pixel[2]);
      const cMin = Math.min(pixel[0], pixel[1], pixel[2]);
      const d = cMax - cMin;

      if (d < 0.00001 || cMax < 0.00001) {
        return [0, 0, cMax];
      }

      let _h;
      if (cMax === pixel[0]) {
        _h = (pixel[1] - pixel[2]) / d;
        if (_h < 0) {
          _h += 6;
        }
      } else if (cMax === pixel[1]) {
        _h = ((pixel[2] - pixel[0]) / d) + 2;
      } else {
        _h = ((pixel[0] - pixel[1]) / d) + 4;
      }

      return [_h * 60 * (Math.PI / 180), d / cMax, cMax];
    });
    this.width           = w;
    this.height          = h;
    this.aspectRatio     = imageData.width / imageData.height;
    this.texcoordsBuffer = regl.buffer(texcoords);
    this.rgbBuffer       = regl.buffer(rgb);
    this.hsvBuffer       = regl.buffer(hsv);
  }
  destroy() {
    if (!this.destroyed) {
      this.texcoordsBuffer.destroy();
      this.rgbBuffer.destroy();
      this.hsvBuffer.destroy();
      this.destroyed = true;
    }
  }
}

function domImgToCanvas(img) {
  const fullresCanvas = document.createElement('canvas');
  const fullresContext = fullresCanvas.getContext('2d');
  fullresCanvas.width = img.naturalWidth;
  fullresCanvas.height = img.naturalHeight;
  // flipped y-axis
  fullresContext.translate(0, img.naturalHeight);
  fullresContext.scale(1, -1);
  fullresContext.drawImage(img, 0, 0);
  return fullresCanvas;
}

class PaintResultCommand extends FullscreenRectCommand {
  constructor(getResult) {
    super();
    this.frag = `
      precision highp float;
      uniform sampler2D resultTexture;
      varying vec2 texcoord;
      void main() {
        vec3 color = texture2D(resultTexture, texcoord).rgb;
        gl_FragColor = vec4(color, 1);
      }
    `;
    this.uniforms = {
      resultTexture: () => getResult().texture,
    };
  }
}

class AccumulationCommand extends FullscreenRectCommand {
  constructor(getParticles, getHistory, getOutput, agents) {
    super();
    this.uniforms = {};
    const frag = new Shader();
    const stdUniforms = new Uniforms();
    stdUniforms.addUniform('particleTexture', 'sampler2D', () => getParticles().texture);
    stdUniforms.addUniform('historyTexture', 'sampler2D', () => getHistory().texture);
    stdUniforms.addUniform('globalTime', 'int', (ctx, props) => props.clock.getTime());
    stdUniforms.compile(frag, this.uniforms);
    frag.varyings += 'varying vec2 texcoord;\n'
    frag.mainBody = `
      vec3 historyColor = texture2D(historyTexture, texcoord).rgb;
      vec3 particleColor = texture2D(particleTexture, texcoord).rgb;
      vec3 accumulationResult = vec3(0.0);
      int activeAgents = 0;

      ${AccumulationCommand.fragmentCodeForAgents(agents, frag, this.uniforms)}

      if (activeAgents > 0) {
        accumulationResult /= float(activeAgents);
      } else {
        accumulationResult = particleColor;
      }

      gl_FragColor = vec4(accumulationResult, 1);
    `;
    this.frag = frag.compile();
    this.framebuffer = () => getOutput().framebuffer;
  }
  static fragmentCodeForAgents(agents, shader, uniforms) {
    const code = [];

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const agentUniforms = new Uniforms(i);
      code.push(`
        if (${agent.timeBegin} <= globalTime && globalTime <= ${agent.timeEnd}) {
          activeAgents++;
          ${agent.getFragmentCode(agentUniforms)}
        }
      `);
      agentUniforms.compile(shader, uniforms);
    }
    return code.join('\n');
  }
}

export class RendererPipeline {
  constructor(regl) {
    this.regl = regl;
    this.mainCommand = null;
    this.accumulationAgents = [];
    this.particleBuffer = new Framebuffer(this.regl);
    this.accuHistoryBuffer = new Framebuffer(this.regl);
    this.resultBuffer = new Framebuffer(this.regl);
    const getResult = () => this.resultBuffer;
    this.accumulationCommand = null;
    this.paintResultCommand = this.regl(new PaintResultCommand(getResult));
  }
  addAccumulationAgent(agent) {
    this.accumulationAgents.push(agent);
  }
  compile(cmd) {
    this.mainCommand = cmd;
    const getParticles = () => this.particleBuffer;
    const getHistory = () => this.accuHistoryBuffer;
    const getOut = () => this.resultBuffer;
    this.accumulationCommand = this.regl(
      new AccumulationCommand(getParticles, getHistory, getOut, this.accumulationAgents)
    );
  }
  reset(clearColor) {
    this.accumulationAgents.length = 0;
    this.mainCommand = null;
    this.clearColor = clearColor;
  }
  resize(width, height) {
    this.particleBuffer.resize(width, height);
    this.accuHistoryBuffer.resize(width, height);
    this.resultBuffer.resize(width, height);
  }
  run(props) {
    if (!this.mainCommand) {
      return;
    }
    if (this.accumulationAgents.length === 0 || props.clock.getPaused()) {
      this.regl.clear({ color: this.clearColor });
      this.mainCommand(props);
    } else { // Accumulation is active
      // Do NOT change the buffers AFTER paintResultCommand, because if we
      // pause at some point, the other if() branch above will have the
      // two buffers alrady swapped - which we don't want. resultBuffer
      // should still be resultBuffer
      [this.accuHistoryBuffer, this.resultBuffer] = [this.resultBuffer, this.accuHistoryBuffer];
      this.particleBuffer.framebuffer.use(() => {
        this.regl.clear({color: this.clearColor});
        this.mainCommand(props);
      });

      this.accumulationCommand(props);
      this.paintResultCommand(props);
    }
  }
  isValid() {
    return this.mainCommand !== null;
  }
}

/**
 * Encapsulates the parts of the render pipeline which are subject to
 * dynamic change, i.e. data that can be changed by effects.
 * 
 * In contrast to this, data inside a `config` object is always immutable
 * (as long as the user does not request changes to be applied - which
 * generates a new `config` object).
 * The most important thing to note is that both `state` *and* `config`
 * objects "live on" if the other object is changed, whereas only `state`
 * is ever influenced by `config` - never the other way around.
 * E.g. config's xParticleCount influences state's particleData.
 * On the other hand, `state` does not need to be serializable
 */
export class RendererState {
  constructor(regl) {
    this.regl = regl;
    this.pipeline = new RendererPipeline(regl);

    // Properties
    this.particleData = -1;
    this.particleDataStore = [[null, null]];
    this.hooks = [];
    this.width = 0;
    this.height = 0;
  }
  adaptToConfig(config) {
    this.pipeline.reset(config.backgroundColor);

    // Update default particle data
    const defaultImg = this.particleDataStore[0][0];
    if (defaultImg !== null) {
      const defaultParticleData = this.particleDataStore[0][1];
      if (defaultParticleData !== null) {
        defaultParticleData.destroy();
      }
      this.particleDataStore[0][1] = new ParticleData(
        defaultImg,
        this.regl,
        config.xParticlesCount || defaultImg.width,
        config.yParticlesCount || defaultImg.height
      );
    }
    // release resources
    for (let i = 1; i < this.particleDataStore.length; i++) {
      this.destroyParticleData(i);
    }
    this.particleDataStore.length = 1;
    this.particleData = 0;
    // run hooks
    for (let i = 0; i < this.hooks.length; i++) {
      this.hooks[i]();
    }
  }
  setParticleData(id) {
    this.particleData = id;
  }
  createParticleData(imgData, width, height) {
    this.particleDataStore.push([
      imgData,
      new ParticleData(
        imgData,
        this.regl,
        width,
        height
      )
    ]);
    return this.particleDataStore.length - 1;
  }
  createParticleDataFromDomImg(domImg, width, height) {
    return this.createParticleData(domImgToCanvas(domImg), width, height);
  }
  destroyParticleData(id) {
    if (this.particleDataStore[id][1]) {
      this.particleDataStore[id][1].destroy();
      this.particleDataStore[id] = [null, null];
    }
  }
  getCurrentParticleData() {
    if (this.particleData < 0) {
      return null;
    }
    return this.particleDataStore[this.particleData][1];
  }
  isValid() {
    return this.particleData >= 0 && this.pipeline.isValid();
  }
  setDefaultDomImage(domImage) {
    this.particleDataStore[0][0] = domImgToCanvas(domImage);
    this.particleData = 0;
  }
  addHook(hook) {
    this.hooks.push(hook);
  }
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.pipeline.resize(width, height);
  }
  getWidth() {
    return this.width;
  }
  getHeight() {
    return this.height;
  }
}

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
