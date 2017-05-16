import createRegl from 'regl';

function fract(x) {
  return x - Math.floor(x);
}

export default class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.regl = createRegl({ canvas });
    console.log(`max texture size: ${this.regl.limits.maxTextureSize}`);
    console.log(`point size dims: ${this.regl.limits.pointSizeDims[0]} ${this.regl.limits.pointSizeDims[1]}`);
    console.log(`max uniforms: ${this.regl.limits.maxVertexUniforms} ${this.regl.limits.maxFragmentUniforms}`);
    this.particleData = null;
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
    scalingCanvas.width = this.state.xParticlesCount || imgData.width;
    scalingCanvas.height = this.state.yParticlesCount || imgData.height;
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
      width: w,
      height: h,
      aspectRatio: imgData.width / imgData.height,
      texcoordsBuffer: this.regl.buffer(texcoords),
      rgbBuffer: this.regl.buffer(rgb),
      hsvBuffer: this.regl.buffer(hsv)
    };
  }

  destroyParticleData() {
    if (this.particleData !== null) {
      this.particleData.texcoordsBuffer.destroy();
      this.particleData.rgbBuffer.destroy();
      this.particleData.hsvBuffer.destroy();
      this.particleData = null;
    }
  }

  assembleVertexShader() {
    let result = `
      precision highp float;

      attribute vec2 texcoord;
      attribute vec3 rgb;
      attribute vec3 hsv;

      uniform float invImageAspectRatio;
      uniform float invScreenAspectRatio;
      uniform mat4 viewProjectionMatrix;
      uniform mat4 invViewProjectionMatrix;

      uniform float particleSize;

      uniform float hueDisplaceDistance;
      uniform float hueDisplaceTime;
      uniform float hueDisplaceDirectionOffset;
      uniform float hueDisplaceScaleByValue;

      uniform float convergeTime;
      uniform float convergeSpeed;
      uniform float convergeRotationSpeed;
      uniform float convergeMaxTravelTime;

      varying vec3 color;

      const float PI = 3.14159265;

      vec2 getDirectionVector(float angle) {
        return vec2(cos(angle), sin(angle));
      }

      void main() {
        vec3 initialPosition = vec3(texcoord, 0);
        initialPosition.y *= invImageAspectRatio;
        
        vec3 position = initialPosition;
    `;

    if (this.state.hueDisplaceDistance !== 0) {
      result += `{
          float angle = hsv[0] + hueDisplaceDirectionOffset;
          float offset = (-cos(hueDisplaceTime) + 1.) / 2.;
          position.xy += offset * getDirectionVector(angle) * hueDisplaceDistance * (1. - hueDisplaceScaleByValue * (1. - hsv[2]));
        }
      `;
    }

    if (this.state.convergeEnable) {
      result += `{
          vec2 screenTarget = ` + { "center": "vec2(0., 0.)", "color wheel": "getDirectionVector(hsv[0] + convergeTime * convergeRotationSpeed) * vec2(.8) * vec2(invScreenAspectRatio, 1.)" }[this.state.convergeTarget] + `;
          vec2 target = (invViewProjectionMatrix * vec4(screenTarget, 0, 1)).xy;

          vec2 d = target - initialPosition.xy;
          float d_len = length(d);
          
          float stop_t = sqrt(2. * d_len / convergeSpeed);

          if(convergeTime < stop_t) {
            float t = min(convergeTime, stop_t);
            position.xy += .5 * d / d_len * convergeSpeed * t * t;
          } else if(convergeTime < convergeMaxTravelTime) {
            position.xy += d;
          } else {
            float t = convergeTime - convergeMaxTravelTime;
            //position.xy += mix(d, vec2(0.), 1. - (1.-t) * (1.-t));
            //position.xy += mix(d, vec2(0.), t * t);
            position.xy += mix(d, vec2(0.), -cos(t / convergeMaxTravelTime * PI) * .5 + .5);
          }
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

    switch (this.state.particleOverlap) {
      case 'add':
        result += 'gl_FragColor = vec4(color * v, 1);\n';
        break;
      case 'alpha blend':
        result += 'gl_FragColor = vec4(color, v);\n';
        break;
      default:
        throw new Error(`Unknown particle overlap mode: ${this.state.particleOverlap}`);
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

    const result = {
      primitive: 'points',
      count: this.particleData.width * this.particleData.height,
      attributes: {
        texcoord: this.particleData.texcoordsBuffer,
        rgb: this.particleData.rgbBuffer,
        hsv: this.particleData.hsvBuffer
      },
      vert,
      frag,
      depth: { enable: false }
    };

    switch (this.state.particleOverlap) {
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
      default:
        throw new Error(`Unknown particle overlap mode: ${this.state.particleOverlap}`);
    }

    result.uniforms = {
      invImageAspectRatio: 1 / this.particleData.aspectRatio,
      invScreenAspectRatio(ctx) {
        return ctx.viewportHeight / ctx.viewportWidth;
      },
      viewProjectionMatrix(ctx) {
        const aspect = ctx.viewportWidth / ctx.viewportHeight;
        const underscan = 1 - (ctx.viewportWidth / ctx.viewportHeight) /
                              (this.particleData.aspectRatio);

        return [
          2, 0, 0, 0,
          0, 2 * aspect, 0, 0,
          0, 0, 1, 0,
          -1, underscan * 2 - 1, 0, 1
        ];
      },
      invViewProjectionMatrix(ctx) {
        const aspect = ctx.viewportWidth / ctx.viewportHeight;
        const underscan = 1 - (ctx.viewportWidth / ctx.viewportHeight) /
                              (this.particleData.aspectRatio);

        return [
          .5, 0, 0, 0,
          0, .5 / aspect, 0, 0,
          0, 0, 1, 0,
          .5, -.5 * (underscan * 2 - 1) / aspect, 0, 1
        ];
      },
      particleSize(ctx) {
        return (ctx.viewportWidth / this.particleData.width) * 2 * this.state.particleScaling;
      },
      hueDisplaceDistance() {
        return this.state.hueDisplaceDistance;
      },
      hueDisplaceTime(ctx) {
        return fract(ctx.time / this.state.hueDisplacePeriod) * 2 * Math.PI;
      },
      hueDisplaceDirectionOffset(ctx) {
        let result = this.state.hueDisplaceRotate * fract(ctx.time / this.state.hueDisplacePeriod) * 2 * Math.PI;
        if (this.state.hueDisplaceRandomDirectionOffset) {
          if (this.hueDisplaceRandomDirectionOffsetValue === undefined
            || Math.floor(this.oldTime / this.state.hueDisplacePeriod)
            !== Math.floor(this.currentTime / this.state.hueDisplacePeriod)
          ) {
            this.hueDisplaceRandomDirectionOffsetValue = Math.random() * 2 * Math.PI;
          }
          result += this.hueDisplaceRandomDirectionOffsetValue;
        }

        return result;
      },
      hueDisplaceScaleByValue() {
        return this.state.hueDisplaceScaleByValue;
      },
      convergeTime(ctx) {
        const period = 2 * Math.sqrt(2 / this.state.convergeSpeed);
        return fract(ctx.time / period) * period;
      },
      convergeSpeed() {
        return this.state.convergeSpeed;
      },
      convergeRotationSpeed() {
        return this.state.convergeRotationSpeed;
      },
      convergeMaxTravelTime() {
        return Math.sqrt(2 / this.state.convergeSpeed);
      }
    };

    return result;
  }

  rebuildCommand() {
    const cmd = this.assembleCommand();
    this.command = this.regl(cmd);
  }

  loadImage(img) {
    this.loadImageData(img);
    this.createParticleData();
    this.rebuildCommand();
  }

  setState(state) {
    const oldState = this.state;
    this.state = state;
    // TODO: rebuild command only when necessary
    this.createParticleData();
    this.rebuildCommand();
  }
}
