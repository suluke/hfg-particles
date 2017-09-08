import RendererPipeline from './pipeline';

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

function mapImageToParticles(imageCanvas, config) {
  const w = config.xParticlesCount;
  const h = config.yParticlesCount;
  if (w < 1 || h < 1) {
    throw new Error('Illegal values for particle counts: x=' + w + ', y=' + h);
  }
  const dAspectRatio = w / h;
  const sAspectRatio = imageCanvas.width / imageCanvas.height;
  const scalingCanvas = document.createElement('canvas');
  const scalingContext = scalingCanvas.getContext('2d');
  let sx = 0;
  let sy = 0;
  let sWidth = imageCanvas.width;
  let sHeight = imageCanvas.height;
  let dx = 0;
  let dy = 0;
  let dWidth = w;
  let dHeight = h;
  switch (config.imageScaling) {
    case 'crop-to-viewport': {
      break;
    }
    case 'fit-image': {
      break;
    }
    case 'fit-width': {
      break;
    }
    case 'fit-height': {
      break;
    }
    case 'scale-to-viewport': {
      // Nothing to do. Default values are already the ones we need.
      break;
    }
    default:
      throw new Error('Illegal value for config.imageScaling: ' + config.imageScaling);
  }
  switch(config.imageCropping.x) {
    case 'crop-both': {
      break;
    }
    case 'crop-left': {
      break;
    }
    case 'crop-right': {
      break;
    }
    default:
      throw new Error('Illegal value for config.imageCropping.x: ' + config.imageCropping.x);
  }
  switch(config.imageCropping.y) {
    case 'crop-both': {
      break;
    }
    case 'crop-top': {
      break;
    }
    case 'crop-bottom': {
      break;
    }
    default:
      throw new Error('Illegal value for config.imageCropping.x: ' + config.imageCropping.x);
  }
  scalingCanvas.width = w;
  scalingCanvas.height = h;
  scalingContext.drawImage(imageCanvas, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
  return scalingContext.getImageData(0, 0, scalingCanvas.width, scalingCanvas.height);
}

class ParticleData {
  constructor(imageData, regl, config) {
    const w = config.xParticlesCount || imageData.width;
    const h = config.yParticlesCount || imageData.height;
    this.destroyed = false;
    
    const scaledData = mapImageToParticles(imageData, config);

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
export default class RendererState {
  constructor(regl) {
    this.regl = regl;
    this.pipeline = new RendererPipeline(regl);

    // Properties
    this.config = null;
    this.particleData = -1;
    this.particleDataStore = [[null, null]];
    this.buffers = [];
    this.hooks = [];
    this.width = 0;
    this.height = 0;
  }
  adaptToConfig(config) {
    this.config = config;
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
        config
      );
    }
    // release resources
    for (let i = 1; i < this.particleDataStore.length; i++) {
      this.destroyParticleData(i);
    }
    this.particleDataStore.length = 1;
    this.particleData = 0;

    for (let i = 0; i < this.buffers.length; i++) {
      this.buffers[i].destroy();
    }
    this.buffers.length = 0;
    // run hooks
    for (let i = 0; i < this.hooks.length; i++) {
      this.hooks[i]();
    }
  }
  setParticleData(id) {
    this.particleData = id;
  }
  createParticleData(imgData) {
    this.particleDataStore.push([
      imgData,
      new ParticleData(
        imgData,
        this.regl,
        this.config
      )
    ]);
    return this.particleDataStore.length - 1;
  }
  createParticleDataFromDomImg(domImg) {
    return this.createParticleData(domImgToCanvas(domImg));
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
  createBuffer(...args) {
    const buf = this.regl.buffer(...args);
    this.buffers.push(buf);
    return { id: this.buffers.length - 1, buffer: buf };
  }
  destroyBuffer(id) {
    if (id < 0 || id >= this.buffers.length) {
      throw new Error('Illegal buffer id given for destruction');
    }
    this.buffers[id].destroy();
    this.buffers.splice(id, 1);
  }
  isValid() {
    return this.particleData >= 0 && this.pipeline.isValid();
  }
  setDefaultDomImage(domImage) {
    this.particleDataStore[0][0] = domImgToCanvas(domImage);
    this.particleData = 0;
  }
  /// Hooks are run after the state has adapted to a new config object
  addHook(hook) {
    this.hooks.push(hook);
  }
  /// Changes the viewport dimension
  /// Not to be confused with the particle grid size. See
  /// config.xParticlesCount and config.yParticlesCount for that
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.pipeline.resize(width, height);
  }
  /// @return viewport width
  getWidth() {
    return this.width;
  }
  /// @return viewport height
  getHeight() {
    return this.height;
  }
}
