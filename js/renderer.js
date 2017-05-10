import createRegl from 'regl';

export default class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.regl = createRegl({ canvas });
    console.log(`max texture size: ${this.regl.limits.maxTextureSize}`);
    console.log(`point size dims: ${this.regl.limits.pointSizeDims[0]} ${this.regl.limits.pointSizeDims[1]}`);
    console.log(`max uniforms: ${this.regl.limits.maxVertexUniforms} ${this.regl.limits.maxFragmentUniforms}`);
    this.imageData = null;
    this.state = null;
    this.command = null;
    this.regl.frame(() => {
      this.oldTime = this.currentTime;
      this.currentTime = this.regl.now();
      if (this.command === null) {
        return;
      }
      this.regl.clear({ color: this.state.backgroundColor });
      this.command();
    });
  }

  createImageData(img) {
    this.destroyImageData();

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

      return [_h * 60 * (Math.PI / 180), d / cMax, cMax];
    });

    this.imageData = {
      width: w,
      height: h,
      aspectRatio: w / h,
      texcoordsBuffer: this.regl.buffer(texcoords),
      rgbBuffer: this.regl.buffer(rgb),
      hsvBuffer: this.regl.buffer(hsv)
    };
  }

  destroyImageData() {
    if (this.imageData !== null) {
      this.imageData.texcoordsBuffer.destroy();
      this.imageData.rgbBuffer.destroy();
      this.imageData.hsvBuffer.destroy();
      this.imageData = null;
    }
  }

  assembleVertexShader() {
    let result = `
      precision highp float;

      attribute vec2 texcoord;
      attribute vec3 rgb;
      attribute vec3 hsv;

      uniform float invImageAspectRatio;
      uniform mat4 viewProjectionMatrix;

      uniform float particleSize;

      uniform float hueDisplaceDistance;
      uniform float hueDisplaceTime;
      uniform float hueDisplaceDirectionOffset;
      uniform float hueDisplaceScaleByValue;
      uniform float hueDisplaceRotate;

      varying vec3 color;

      const float PI = 3.14159265;

      vec2 getDirectionVector(float angle) {
        return vec2(cos(angle), sin(angle));
      }

      void main() {
        vec3 position = vec3(texcoord, 0);
        position.y *= invImageAspectRatio;
    `;

    if (this.state.hueDisplaceDistance != 0) {
      result += `{
          float angle = hsv[0] + hueDisplaceDirectionOffset + hueDisplaceRotate * hueDisplaceTime;
          float offset = (-cos(hueDisplaceTime * 2. * PI) + 1.) / 2.;
          position.xy += offset * getDirectionVector(angle) * hueDisplaceDistance * (1. - hueDisplaceScaleByValue * (1. - hsv[2]));
        }
      `;
    }

    result += `
        color = rgb;
        gl_PointSize = max(particleSize, 0.);
        gl_Position = viewProjectionMatrix * vec4(position, 1.);
      }
    `;

    return result;
  }

  assembleFragmentShader() {
    let result = `
      precision highp float;

      varying vec3 color;

      void main() {
        float v = pow(max(1. - 2. * length(gl_PointCoord - vec2(.5)), 0.), 1.5);
    `;

    switch(this.state.particleOverlap) {
      case 'add':
      result += 'gl_FragColor = vec4(color * v, 1);\n';
      break;

      case 'alpha blend':
      result += 'gl_FragColor = vec4(color, v);\n';
      break;
    }

    result += `
      }
    `;

    return result;
  }

  assembleCommand() {
    console.log(this.state);

    const vert = this.assembleVertexShader();
    const frag = this.assembleFragmentShader();

    let result = {
      primitive: 'points',
      count: this.imageData.width * this.imageData.height,
      attributes: {
        texcoord: this.imageData.texcoordsBuffer,
        rgb: this.imageData.rgbBuffer,
        hsv: this.imageData.hsvBuffer
      },
      vert, frag,
      depth: { enable: false }
    }

    switch(this.state.particleOverlap) {
      case 'add':
      result.blend = {
        enable: true,
        func: { src: 'one', dst: 'one' }
      };
      break;

      case 'alpha blend':
      result.blend = {
        enable: true,
        func: { srcRGB: 'src alpha', srcAlpha: 1, dstRGB: 'one minus src alpha', dstAlpha: 1 }
      };
      break;
    }

    result.uniforms = {
      invImageAspectRatio: 1 / this.imageData.aspectRatio,
      viewProjectionMatrix(ctx) {
        const underscan = 1 - (ctx.viewportWidth / ctx.viewportHeight) / (this.imageData.width / this.imageData.height);
        return [2, 0, 0, 0,
          0, 2 * (ctx.viewportWidth / ctx.viewportHeight), 0, 0,
          0, 0, 1, 0,
          -1, underscan * 2 - 1, 0, 1];
      },
      particleSize(ctx) {
        return (ctx.viewportWidth / this.imageData.width) * 2 * this.state.particleScaling;
      },
      hueDisplaceDistance() {
        return this.state.hueDisplaceDistance;
      },
      hueDisplaceTime(ctx) {
        const t = ctx.time / this.state.hueDisplacePeriod;
        return t - Math.floor(t);
      },
      hueDisplaceDirectionOffset() {
        if (this.state.hueDisplaceRandomDirectionOffset) {
          if (this.hueDisplaceRandomDirectionOffsetValue === undefined
            || Math.floor(this.oldTime / this.state.hueDisplacePeriod) != Math.floor(this.currentTime / this.state.hueDisplacePeriod)) {
            this.hueDisplaceRandomDirectionOffsetValue = Math.random() * 2 * Math.PI;
          }
          return this.hueDisplaceRandomDirectionOffsetValue;
        } else {
          return 0;
        }
      },
      hueDisplaceScaleByValue() {
        return this.state.hueDisplaceScaleByValue;
      },
      hueDisplaceRotate() {
        return this.state.hueDisplaceRotate * 2 * Math.PI;
      },
    };

    return result;
  }

  rebuildCommand() {
    let cmd = this.assembleCommand();
    this.command = this.regl(cmd);
  }

  loadImage(img) {
    this.createImageData(img);
    this.rebuildCommand();
  }

  setState(state) {
    const oldState = this.state;
    this.state = state;
    if (this.imageData !== null /*&& state.particleOverlap !== oldState.particleOverlap*/) {
      this.rebuildCommand();
    }
  }
}
