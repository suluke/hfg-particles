import createRegl from 'regl';
import CommandBuilder from './command-builder';

class RendererClock {
  constructor() {
    this.time = -1;
    this.delta = 0;
    this.absTime = Date.now();
    this.period = 1000;
  }
  frame() {
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
  getDelta() {
    return this.delta;
  }
  getAbsoluteTime() {
    return this.absTime;
  }
}

export default class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.regl = createRegl({ canvas });
    console.log(`max texture size: ${this.regl.limits.maxTextureSize}`);
    console.log(`point size dims: ${this.regl.limits.pointSizeDims[0]} ${this.regl.limits.pointSizeDims[1]}`);
    console.log(`max uniforms: ${this.regl.limits.maxVertexUniforms} ${this.regl.limits.maxFragmentUniforms}`);
    this.particleData = null;
    this.config = null;
    this.command = null;
    this.commandBuilder = new CommandBuilder();
    this.clock = new RendererClock();
    this.regl.frame(() => {
      if (this.command === null) {
        return;
      }
      this.clock.frame();
      this.regl.clear({ color: this.config.backgroundColor });
      this.command({
        config:       this.config,
        particleData: this.particleData,
        clock:        this.clock
      });
    });
  }

  loadImageData(img) {
    const fullresCanvas = document.createElement('canvas');
    const fullresContext = fullresCanvas.getContext('2d');
    fullresCanvas.width = img.naturalWidth;
    fullresCanvas.height = img.naturalHeight;
    // flipped y-axis
    fullresContext.translate(0, img.naturalHeight);
    fullresContext.scale(1, -1);
    fullresContext.drawImage(img, 0, 0);
    this.imgData = fullresCanvas;
  }

  createParticleData() {
    this.destroyParticleData();

    const imgData = this.imgData;
    const scalingCanvas = document.createElement('canvas');
    const scalingContext = scalingCanvas.getContext('2d');
    scalingCanvas.width = this.config.xParticlesCount || imgData.width;
    scalingCanvas.height = this.config.yParticlesCount || imgData.height;
    scalingContext.drawImage(imgData, 0, 0, scalingCanvas.width, scalingCanvas.height);
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

    this.particleData = {
      width:           w,
      height:          h,
      aspectRatio:     imgData.width / imgData.height,
      texcoordsBuffer: this.regl.buffer(texcoords),
      rgbBuffer:       this.regl.buffer(rgb),
      hsvBuffer:       this.regl.buffer(hsv)
    };
  }

  destroyParticleData() {
    this.setCommand(null);
    if (this.particleData !== null) {
      this.particleData.texcoordsBuffer.destroy();
      this.particleData.rgbBuffer.destroy();
      this.particleData.hsvBuffer.destroy();
      this.particleData = null;
    }
  }

  setCommand(command) {
    this.clock.reset();
    this.clock.setPeriod(this.config.duration);
    this.command = command;
  }

  rebuildCommand() {
    const cmd = this.commandBuilder.buildCommand(this.particleData, this.config);
    this.setCommand(this.regl(cmd));
  }

  loadImage(img) {
    this.loadImageData(img);
    this.createParticleData();
    this.rebuildCommand();
  }

  setConfig(config) {
    this.config = config;
    // TODO: rebuild command only when necessary
    this.createParticleData();
    this.rebuildCommand();
  }
}
