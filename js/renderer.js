import createRegl from 'regl';
import CommandBuilder from './command-builder';

class RendererClock {
  constructor() {
    this.time = -1;
    this.delta = 0;
    this.absTime = Date.now();
    this.period = 1000;
    this.paused = false;
  }
  frame() {
    if (this.paused) {
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
      this.time = (this.time + this.delta) % this.period;
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
    this.paused = paused;
  }
  getPaused() {
    return this.paused;
  }
}

export class ParticleData {
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

    // Properties
    this.sourceImageData = null;
    this.particleData = null;
  }
  adaptToConfig(config) {
    if (this.particleData !== null) {
      this.particleData.destroy();
    }
    this.particleData = new ParticleData(
      this.sourceImageData,
      this.regl,
      config.xParticlesCount || this.sourceImageData.width,
      config.yParticlesCount || this.sourceImageData.height
    );
  }
  isValid() {
    return this.particleData !== null;
  }
  setDefaultDomImage(domImage) {
    this.sourceImageData = domImgToCanvas(domImage);
  }
}

export default class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.regl = createRegl({ canvas });
    console.log(`max texture size: ${this.regl.limits.maxTextureSize}`);
    console.log(`point size dims: ${this.regl.limits.pointSizeDims[0]} ${this.regl.limits.pointSizeDims[1]}`);
    console.log(`max uniforms: ${this.regl.limits.maxVertexUniforms} ${this.regl.limits.maxFragmentUniforms}`);
    this.defaultParticleData = null;
    this.state = new RendererState(this.regl);
    this.config = null;
    this.command = null;
    this.commandBuilder = new CommandBuilder();
    this.clock = new RendererClock();
    this.regl.frame(() => {
      if (this.command === null || !this.state.isValid()) {
        return;
      }
      this.clock.frame();
      this.regl.clear({ color: this.config.backgroundColor });
      this.command({
        config: this.config,
        state:  this.state,
        clock:  this.clock
      });
    });
  }

  getClock() {
    return this.clock;
  }

  setConfig(config) {
    this.command = null;
    this.config = config;
    // TODO: rebuild command only when necessary
    this.clock.reset();
    this.clock.setPeriod(this.config.duration);
    this.state.adaptToConfig(config);
    this.command = this.regl(this.commandBuilder.buildCommand(this.config, this.state));
  }

  getState() {
    return this.state;
  }
}
