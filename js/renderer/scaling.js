/// The functions in this file are mainly responsible for interpreting
/// ScalingInfo when mapping image/canvas pixel data onto the particle
/// grid. ScalingInfo itself is a simple description format to give
/// users the possibility to describe this mapping in an intuitive yet
/// limited fashion.

export class ScalingInfo {
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

export function mapImageToParticles(imageCanvas, scalingInfo) {
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
    throw new Error('Illegal value for scalingInfo.imageScaling: "' + scalingInfo.imageScaling + '"');
  }
  scalingCanvas.width = w;
  scalingCanvas.height = h;
  const P = scalingParams;
  scalingContext.drawImage(imageCanvas, P.sx, P.sy, P.sWidth, P.sHeight, P.dx, P.dy, P.dWidth, P.dHeight);
  return scalingContext.getImageData(0, 0, scalingCanvas.width, scalingCanvas.height);
}