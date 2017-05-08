import createRegl from 'regl';
import { PipelineBuilder, DbgBlit } from './shaders';

export default class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.regl = createRegl({ canvas });
    const regl = this.regl;
    console.log(`max texture size: ${regl.limits.maxTextureSize}`);
    console.log(`point size dims: ${regl.limits.pointSizeDims[0]} ${regl.limits.pointSizeDims[1]}`);
    this.imageData = null;
    this.state = {
      glClearColor: [0, 0, 0, 1],
      particleSize: 1
    };
    this.command = null;
    this.dbgBlitTextureCommand = regl({
      vert: DbgBlit.vert,
      frag: DbgBlit.frag,
      uniforms: { texture: regl.prop('texture') },
      viewport: { x: regl.prop('x'), y: regl.prop('y'), width: regl.prop('width'), height: regl.prop('height') },
      attributes: { texcoord: [[0, 0], [1, 0], [0, 1], [1, 1]] },
      primitive: 'triangle strip',
      count: 4
    });
    regl.frame(() => {
      if (this.command === null) {
        return;
      }
      regl.clear({ color: this.state.glClearColor });
      this.command();
    });
  }

  dbgBlitTexture(img) {
    const texture = this.regl.texture({ data: img, format: 'rgb', flipY: true });
    this.dbgBlitTextureCommand({
      texture, x: 0, y: 0, width: texture.width, height: texture.height
    });
  }

  loadImageData(img) {
    const dataCanvas = document.createElement('canvas');
    const dataContext = dataCanvas.getContext('2d');
    dataCanvas.width = img.naturalWidth;
    dataCanvas.height = img.naturalHeight;
    // flipped y-axis
    dataContext.translate(0, img.naturalHeight);
    dataContext.scale(1, -1);
    dataContext.drawImage(img, 0, 0);
    const imgData = dataContext.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
    const w = imgData.width;
    const h = imgData.height;

    const imagePixels = imgData.data;
    // this.dbgBlitTexture();

    const pixelIndices = Array.from(Array(w * h).keys());

    const texcoords = pixelIndices.map((i) => [((i % w) + 0.5) / w, (Math.floor(i / w) + 0.5) / h]);

    const rgb = pixelIndices.map((i) => {
      const pixel = imagePixels.slice(i * 4, (i * 4) + 4);

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

      return [_h * 60, d / cMax, cMax];
    });

    this.imageData = {
      width: w,
      height: h,
      texcoordsBuffer: this.regl.buffer(texcoords),
      rgbBuffer: this.regl.buffer(rgb),
      hsvBuffer: this.regl.buffer(hsv)
    };

    return this.imageData;
  }

  rebuildCommand() {
    const data = this.imageData;
    const pipeline = PipelineBuilder.build(this.state);
    const cmd = Object.assign(pipeline, {
      uniforms: {
        time(ctx) {
          return ctx.time;
        },
        aspect(/* ctx */) {
          return data.height / data.width;
        },
        VP(ctx) {
          return [2, 0, 0, 0,
            0, 2 * (ctx.viewportWidth / ctx.viewportHeight), 0, 0,
            0, 0, 1, 0,
            -1, -1, 0, 1];
        },
        particleSize(ctx) {
          return (ctx.viewportWidth / data.width) * 2 * this.state.particleSize;
        }
      },
      attributes: {
        texcoord: data.texcoordsBuffer,
        rgb: data.rgbBuffer,
        hsv: data.hsvBuffer
      },
      count: data.width * data.height
    });
    this.command = this.regl(cmd);
  }

  loadImage(img) {
    this.loadImageData(img);
    this.rebuildCommand();
  }

  setState(state) {
    const oldState = this.state;
    this.state = state;
    if (state.particleCollision !== oldState.particleCollision) {
      this.rebuildCommand();
    }
  }
}
