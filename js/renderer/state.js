import RendererPipeline from './pipeline';
import { ScalingInfo, mapImageToParticles } from './scaling';

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

class ParticleData {
  constructor(imageData, regl, scalingInfo) {
    this.rgba = mapImageToParticles(imageData, scalingInfo).data;
  }
}

class ParticleDataStoreEntry {
  constructor(imageCanvas, imageScaling, imageCropping, particleData) {
    this.imageCanvas = imageCanvas || null;
    this.imageScaling = imageScaling;
    this.imageCropping = imageCropping;
    this.particleData = particleData || null;
  }
  destroy() {
    if (this.particleData !== null) {
      this.particleData = null;
    }
    this.imageCanvas = null;
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
    this.particleDataStore = [new ParticleDataStoreEntry(null, '', {x: '', y: ''}, null)];
    this.buffers = [];
    this.hooks = [];
    this.width = 0;
    this.height = 0;
    this.texcoordsBuffer = null;
    this.colorFilters = [];
    this.colorBuffer = null;
  }
  adaptToConfig(config) {
    this.config = config;
    this.pipeline.reset(config.backgroundColor);
    this.colorFilters = [];

    const pw = config.xParticlesCount;
    const ph = config.yParticlesCount;

    // texcoordsBuffer
    if (this.texcoordsBuffer !== null) {
      this.texcoordsBuffer.destroy();
    }
    const pixelIndices = Array.from(Array(pw * ph).keys());
    const texcoords = pixelIndices.map((i) => [((i % pw) + 0.5) / pw, (Math.floor(i / pw) + 0.5) / ph]);
    this.texcoordsBuffer = this.regl.buffer(texcoords);
    // colorBuffer
    if (this.colorBuffer !== null) {
      this.colorBuffer.destroy();
    }
    this.colorBuffer = this.regl.buffer({usage: 'stream', type: 'uint8', length: 4 * ph * pw});

    // Update default particle data
    const DPD = this.particleDataStore[0];
    const defaultImg = DPD.imageCanvas;
    if (defaultImg !== null) {
      const scalingInfo = new ScalingInfo(
        {x: pw, y: ph},
        DPD.imageScaling, DPD.imageCropping,
        {width: this.getWidth(), height: this.getHeight()}
      );
      DPD.destroy();
      this.particleDataStore[0] = new ParticleDataStoreEntry(
        defaultImg, scalingInfo.imageScaling, scalingInfo.imageCropping,
        new ParticleData(defaultImg, this.regl, scalingInfo)
      );
    }
    // release resources
    for (let i = 1; i < this.particleDataStore.length; i++) {
      this.particleDataStore[i].destroy();
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
  createParticleData(imgData, imageScaling, imageCropping) {
    if (!imageScaling) {
      console.warn('No imageScaling given. Falling back to default value');
      imageScaling = 'crop-to-viewport'
    }
    if (!imageCropping) {
      console.warn('No imageCropping given. Falling back to default value');
      imageCropping = {x: 'crop-both', y: 'crop-both'};
    }
    const scalingInfo = new ScalingInfo(
      {x: this.config.xParticlesCount, y: this.config.yParticlesCount},
      imageScaling, imageCropping,
      {width: this.getWidth(), height: this.getHeight()}
    );
    this.particleDataStore.push(new ParticleDataStoreEntry(
      imgData, imageScaling, imageCropping,
      new ParticleData(imgData, this.regl, scalingInfo)
    ));
    return this.particleDataStore.length - 1;
  }
  createParticleDataFromDomImg(domImg, imageScaling, imageCropping) {
    return this.createParticleData(domImgToCanvas(domImg), imageScaling, imageCropping);
  }
  destroyParticleData(id) {
    this.particleDataStore[id].destroy();
  }
  addColorFilter(filter) {
    this.colorFilters.push(filter);
  }
  getColorBuffer() {
    if (this.particleData < 0) {
      return null;
    }
    const original = this.particleDataStore[this.particleData].particleData.rgba;
    let copy = Uint8Array.from(original);
    for (let i = 0; i < this.colorFilters.length; i++) {
      copy = this.colorFilters[i](copy);
    }
    this.colorBuffer(copy);
    return this.colorBuffer;
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
  /// Sets the image, but will not change the current default particle
  /// data. Rebuilding the default particle data will only happen on
  /// adaptToConfig
  setDefaultDomImage(domImage, imageScaling, imageCropping) {
    const DefaultEntry = this.particleDataStore[0];
    DefaultEntry.imageCanvas = domImgToCanvas(domImage);
    DefaultEntry.imageScaling = imageScaling;
    DefaultEntry.imageCropping = imageCropping;
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
