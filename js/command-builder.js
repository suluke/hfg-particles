import { effectsById } from './effects/index';

class Shader {
  constructor() {
    this.attributes = '';
    this.uniforms = '';
    this.varyings = '';
    this.globals = '';
    this.functions = '';
    this.mainBody = '';
  }

  compile() {
    return `
      precision highp float;
    
      // Attributes
      ${this.attributes}

      // Uniforms
      ${this.uniforms}

      // Varyings
      ${this.varyings}

      // Globals
      ${this.globals}

      // Functions
      ${this.functions}

      void main() {
        ${this.mainBody}
      }
    `;
  }
}

export default class CommandBuilder {
  buildCommand(particleData, config) {
    this.config = config;
    this.particleData = particleData;

    return this.assembleCommand();
  }

  getInstanceUniformName(name, instanceId) {
    return name + '_' + instanceId;
  }

  assembleVertexShader() {
    const vertexShader = new Shader();

    vertexShader.attributes += `
      attribute vec2 texcoord;
      attribute vec3 rgb;
      attribute vec3 hsv;
    `;
    vertexShader.uniforms += `
      uniform float invImageAspectRatio;
      uniform float invScreenAspectRatio;
      uniform mat4 viewProjectionMatrix;
      uniform mat4 invViewProjectionMatrix;

      uniform float particleSize;
    `;
    vertexShader.varyings += 'varying vec3 color;\n';
    vertexShader.globals += 'const float PI = 3.14159265;\n';
    // TODO make functions a dict (= set) so that users can add them on
    // demand without defining them more than once
    vertexShader.functions += `
      vec2 getDirectionVector(float angle) {
        return vec2(cos(angle), sin(angle));
      }
    `;
    vertexShader.mainBody += `
      vec3 initialPosition = vec3(texcoord, 0);
      initialPosition.y *= invImageAspectRatio;
      
      vec3 position = initialPosition;
    `;

    let instanceId = 0;
    for (let i = 0; i < this.config.effects.length; i++) {
      const track = this.config.effects[i];
      for (let j = 0; j < track.length; j++) {
        const effectId = track[j][0];
        const effectConfig = track[j][1];
        const effectClass = effectsById[effectId];
        const uniforms = effectClass.getUniforms();
        const code = effectClass.getCode();

        for(let uniformIndex = 0; uniformIndex < uniforms.length; uniformIndex++) {
          const uniform = uniforms[uniformIndex];
          vertexShader.uniforms += 'uniform ' + uniform.type + ' ' + this.getInstanceUniformName(uniform.name, instanceId) + ';\n';
        }

        for(let elementIndex = 0; elementIndex < code.length; elementIndex++) {
          const handleElement = (e) => {
            switch(typeof e) {
              case 'string':
              vertexShader.mainBody += e;
              break;

              case 'function':
              handleElement(e(effectConfig));
              break;

              case 'object':
              if (e instanceof Array) {
                for(let i=0; i<e.length; i++) handleElement(e[i]);
              } else if (e.what === 'uniform') {
                vertexShader.mainBody += this.getInstanceUniformName(e.name, instanceId);
              } else {
                throw new Error('Invaid object in effect code');
              }
              break;
            }
          }

          handleElement(code[elementIndex]);
        }

        instanceId++;
      }
    }

    vertexShader.mainBody += `
      color = rgb;
      gl_PointSize = max(particleSize, 0.);
      gl_Position = viewProjectionMatrix * vec4(position, 1.);
    `;

    return vertexShader.compile();
  }

  assembleFragmentShader() {
    const fragmentShader = new Shader();
    fragmentShader.varyings += 'varying vec3 color;\n';
    fragmentShader.mainBody += `
      float v = pow(max(1. - 2. * length(gl_PointCoord - vec2(.5)), 0.), 1.5);
    `;
    const colorAssign = {
      add:           'gl_FragColor = vec4(color * v, 1);\n',
      'alpha blend': 'gl_FragColor = vec4(color, v);\n'
    }[this.config.particleOverlap];
    if (!colorAssign) {
      throw new Error(`Unknown particle overlap mode: ${this.config.particleOverlap}`);
    }
    fragmentShader.mainBody += colorAssign;

    return fragmentShader.compile();
  }

  assembleCommand() {
    const vert = this.assembleVertexShader();
    const frag = this.assembleFragmentShader();

    const result = {
      primitive:  'points',
      count:      this.particleData.width * this.particleData.height,
      attributes: {
        texcoord: this.particleData.texcoordsBuffer,
        rgb:      this.particleData.rgbBuffer,
        hsv:      this.particleData.hsvBuffer
      },
      vert,
      frag,
      depth: { enable: false }
    };

    switch (this.config.particleOverlap) {
      case 'add':
        result.blend = {
          enable: true,
          func:   { src: 'one', dst: 'one' }
        };
        break;
      case 'alpha blend':
        result.blend = {
          enable: true,
          func:   { srcRGB: 'src alpha', srcAlpha: 1, dstRGB: 'one minus src alpha', dstAlpha: 1 }
        };
        break;
      default:
        throw new Error(`Unknown particle overlap mode: ${this.config.particleOverlap}`);
    }

    result.uniforms = {
      invImageAspectRatio: 1 / this.particleData.aspectRatio,
      invScreenAspectRatio(ctx) {
        return ctx.viewportHeight / ctx.viewportWidth;
      },
      viewProjectionMatrix(ctx) {
        const aspect = ctx.viewportWidth / ctx.viewportHeight;
        const underscan = 1 - ((ctx.viewportWidth / ctx.viewportHeight) /
                              (this.particleData.aspectRatio));

        return [
          2, 0, 0, 0,
          0, 2 * aspect, 0, 0,
          0, 0, 1, 0,
          -1, (underscan * 2) - 1, 0, 1
        ];
      },
      invViewProjectionMatrix(ctx) {
        const aspect = ctx.viewportWidth / ctx.viewportHeight;
        const underscan = 1 - ((ctx.viewportWidth / ctx.viewportHeight) /
                              (this.particleData.aspectRatio));

        return [
          0.5, 0, 0, 0,
          0, 0.5 / aspect, 0, 0,
          0, 0, 1, 0,
          0.5, (-0.5 * ((underscan * 2) - 1)) / aspect, 0, 1
        ];
      },
      particleSize(ctx) {
        return (ctx.viewportWidth / this.particleData.width) * 2 * this.config.particleScaling;
      },
    };

    let instanceId = 0;
    for (let i = 0; i < this.config.effects.length; i++) {
      const track = this.config.effects[i];
      for (let j = 0; j < track.length; j++) {
        const effectId = track[j][0];
        const effectConfig = track[j][1];
        const effectClass = effectsById[effectId];
        const uniforms = effectClass.getUniforms();

        for(let uniformIndex = 0; uniformIndex < uniforms.length; uniformIndex++) {
          const uniform = uniforms[uniformIndex];
          result.uniforms[this.getInstanceUniformName(uniform.name, instanceId)] = uniform.getValue(effectConfig);
        }

        instanceId++;
      }
    }

    return result;
  }
}
