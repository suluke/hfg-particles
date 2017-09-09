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

class ScalingInfo {
  constructor(particleCounts, imageScaling, imageCropping, viewport) {
    this.particleCounts = particleCounts; // {x, y}
    this.imageScaling = imageScaling;
    this.imageCropping = imageCropping; // {x, y}
    this.viewport = viewport; // {width, height}
  }
}

function getDefaultPixelParticleMappingParams(imageCanvas, scalingInfo) {
  const w = scalingInfo.particleCounts.x;
  const h = scalingInfo.particleCounts.y;
  const r = {
    sx: 0,
    sy: 0,
    sWidth: imageCanvas.width,
    sHeight: imageCanvas.height,
    dx: 0,
    dy: 0,
    dWidth: w,
    dHeight: h,
  };
  // particles aspect ratio
  r.dAspectRatio = (w / h);
  // source image aspect ratio
  r.sAspectRatio = imageCanvas.width / imageCanvas.height;
  // viewport aspect ratio
  r.vAspectRatio = scalingInfo.viewport.width / scalingInfo.viewport.height;
  // particle aspect ratio
  r.pAspectRatio = r.vAspectRatio / r.dAspectRatio;
  return r;
}

function getCropImageToViewportParams(imageCanvas, scalingInfo) {
  const r = getDefaultPixelParticleMappingParams(imageCanvas, scalingInfo);
  if (r.vAspectRatio > r.sAspectRatio) { // source height will exceed viewport height
    r.sHeight = r.sWidth / r.vAspectRatio;
    if (scalingInfo.imageCropping.y === 'crop-both') {
      r.sy = (imageCanvas.height - r.sHeight) / 2;
    } else if (scalingInfo.imageCropping.y === 'crop-top') {
      r.sy = imageCanvas.height - r.sHeight;
    } else if (scalingInfo.imageCropping.y === 'crop-bottom') {
      r.sy = 0;
    } else {
      throw new Error('Illegal value for scalingInfo.imageCropping.y: ' + scalingInfo.imageCropping.x);
    }
  } else { // source width will exceed dest width
    r.sWidth = r.sHeight * r.vAspectRatio;
    if (scalingInfo.imageCropping.x === 'crop-both') {
      r.sx = (imageCanvas.width - r.sWidth) / 2;
    } else if (scalingInfo.imageCropping.x === 'crop-left') {
      r.sx = imageCanvas.width - r.sWidth;
    } else if (scalingInfo.imageCropping.x === 'crop-right') {
      r.sx = 0;
    } else {
      throw new Error('Illegal value for scalingInfo.imageCropping.x: ' + scalingInfo.imageCropping.x);
    }
  }
  return r;
}

function getFitWidthParams(imageCanvas, scalingInfo) {
  const w = scalingInfo.particleCounts.x;
  const h = scalingInfo.particleCounts.y;
  const r = getDefaultPixelParticleMappingParams(imageCanvas, scalingInfo);
  if (r.vAspectRatio < r.sAspectRatio) { // the picture won't fill the particles. Some rows will remain black
    r.dHeight = w / r.sAspectRatio * r.pAspectRatio;
    if (scalingInfo.imageCropping.y === 'crop-both') {
      r.dy = (h - r.dHeight) / 2;
    } else if (scalingInfo.imageCropping.y === 'crop-top') {
      r.dy = h - r.dHeight;
    } else if (scalingInfo.imageCropping.y === 'crop-bottom') {
      r.dy = 0;
    } else {
      throw new Error('Illegal value for scalingInfo.imageCropping.y: ' + scalingInfo.imageCropping.y);
    }
  } else { // pixels rows at the top and/or bottom will need to be discarded
    r.sHeight = imageCanvas.width / r.vAspectRatio;
    if (scalingInfo.imageCropping.y === 'crop-both') {
      r.sy = (imageCanvas.height - r.sHeight) / 2;
    } else if (scalingInfo.imageCropping.y === 'crop-top') {
      r.sy = imageCanvas.height  - r.sHeight;
    } else if (scalingInfo.imageCropping.y === 'crop-bottom') {
      r.sy = 0;
    } else {
      throw new Error('Illegal value for scalingInfo.imageCropping.y: ' + scalingInfo.imageCropping.y);
    }
  }
  return r;
}

function getFitHeightParams(imageCanvas, scalingInfo) {
  const w = scalingInfo.particleCounts.x;
  const h = scalingInfo.particleCounts.y;
  const r = getDefaultPixelParticleMappingParams(imageCanvas, scalingInfo);
  if (r.vAspectRatio > r.sAspectRatio) { // the picture won't fill the particles. Some columns will remain black
    r.dWidth = h * r.sAspectRatio / r.pAspectRatio;
    if (scalingInfo.imageCropping.x === 'crop-both') {
      r.dx = (w - r.dWidth) / 2;
    } else if (scalingInfo.imageCropping.x === 'crop-left') {
      r.dx = w - r.dWidth;
    } else if (scalingInfo.imageCropping.x === 'crop-right') {
      r.dx = 0;
    } else {
      throw new Error('Illegal value for scalingInfo.imageCropping.x: ' + scalingInfo.imageCropping.x);
    }
  } else { // pixels columns to the left and/or right will need to be discarded
    r.sWidth = imageCanvas.height * r.vAspectRatio;
    if (scalingInfo.imageCropping.x === 'crop-both') {
      r.sx = (imageCanvas.width - r.sWidth) / 2;
    } else if (scalingInfo.imageCropping.x === 'crop-left') {
      r.sx = imageCanvas.width - r.sWidth;
    } else if (scalingInfo.imageCropping.x === 'crop-right') {
      r.sx = 0;
    } else {
      throw new Error('Illegal value for scalingInfo.imageCropping.x: ' + scalingInfo.imageCropping.x);
    }
  }
  return r;
}

function mapImageToParticles(imageCanvas, scalingInfo) {
  const w = scalingInfo.particleCounts.x;
  const h = scalingInfo.particleCounts.y;
  if (w < 1 || h < 1) {
    throw new Error('Illegal values for particle counts: x=' + w + ', y=' + h);
  }
  const scalingCanvas = document.createElement('canvas');
  const scalingContext = scalingCanvas.getContext('2d');
  let scalingParams = null;
  if (scalingInfo.imageScaling === 'crop-to-viewport') {
    scalingParams = getCropImageToViewportParams(imageCanvas, scalingInfo);
  } else if (scalingInfo.imageScaling === 'fit-image') {
    const vAspectRatio = scalingInfo.viewport.width / scalingInfo.viewport.height;
    if (imageCanvas.width / imageCanvas.height > vAspectRatio) {
      scalingParams = getFitWidthParams(imageCanvas, scalingInfo);
    } else {
      scalingParams = getFitHeightParams(imageCanvas, scalingInfo);
    }
  } else if (scalingInfo.imageScaling === 'fit-width') {
    scalingParams = getFitWidthParams(imageCanvas, scalingInfo);
  } else if (scalingInfo.imageScaling === 'fit-height') {
    scalingParams = getFitHeightParams(imageCanvas, scalingInfo);
  } else if (scalingInfo.imageScaling === 'scale-to-viewport') {
    scalingParams = getDefaultPixelParticleMappingParams();
  } else {
    throw new Error('Illegal value for scalingInfo.imageScaling: ' + scalingInfo.imageScaling);
  }
  scalingCanvas.width = w;
  scalingCanvas.height = h;
  const P = scalingParams;
  scalingContext.drawImage(imageCanvas, P.sx, P.sy, P.sWidth, P.sHeight, P.dx, P.dy, P.dWidth, P.dHeight);
  return scalingContext.getImageData(0, 0, scalingCanvas.width, scalingCanvas.height);
}

class ParticleData {
  constructor(imageData, regl, scalingInfo) {
    const w = scalingInfo.particleCounts.x || imageData.width;
    const h = scalingInfo.particleCounts.y || imageData.height;
    this.destroyed = false;
    
    const scaledData = mapImageToParticles(imageData, scalingInfo);

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
      const scalingInfo = new ScalingInfo(
        {x: config.xParticlesCount, y: config.yParticlesCount},
        config.imageScaling, config.imageCropping,
        {width: this.getWidth(), height: this.getHeight()}
      );
      this.particleDataStore[0][1] = new ParticleData(
        defaultImg,
        this.regl,
        scalingInfo
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
    const scalingInfo = new ScalingInfo(
      {x: this.config.xParticlesCount, y: this.config.yParticlesCount},
      this.config.imageScaling, this.config.imageCropping,
      {width: this.getWidth(), height: this.getHeight()}
    );
    this.particleDataStore.push([
      imgData,
      new ParticleData(
        imgData,
        this.regl,
        scalingInfo
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
