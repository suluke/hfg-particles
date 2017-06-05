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

class Uniforms {
  constructor(id) {
    this.uniforms = [];
    this.id = id;
  }
  addUniform(name, type, value) {
    const uniform = { name, type, value };
    this.uniforms.push(uniform);

    return this.getNameFor(uniform);
  }
  getNameFor(uniform) {
    if (this.id === undefined) {
      return uniform.name;
    } else {
      return `${uniform.name}_${this.id}`;
    }
  }
  compile(shader, uniforms = null) {
    const shaderStr = [];
    for (let i = 0; i < this.uniforms.length; i++) {
      const uniform = this.uniforms[i];
      shaderStr.push(`uniform ${uniform.type} ${this.getNameFor(uniform)};`);
      if (uniforms !== null) {
        // eslint-disable-next-line no-param-reassign
        uniforms[this.getNameFor(uniform)] = uniform.value;
      }
    }
    // eslint-disable-next-line no-param-reassign
    shader.uniforms += shaderStr.join('\n') + '\n';
  }
}

export default class CommandBuilder {
  buildCommand(props) {
    this.config = props.config;
    this.state = props.state;
    this.clock = props.clock;
    this.props = props;

    return this.assembleCommand();
  }

  makeUniforms() {
    const uniforms = new Uniforms();
    uniforms.addUniform('invImageAspectRatio', 'float', () => 1 / this.state.getCurrentParticleData().aspectRatio);
    uniforms.addUniform('invScreenAspectRatio', 'float', (ctx) => ctx.viewportHeight / ctx.viewportWidth);
    uniforms.addUniform('viewProjectionMatrix', 'mat4', (ctx) => {
      const aspect = ctx.viewportWidth / ctx.viewportHeight;
      const underscan = 1 - ((ctx.viewportWidth / ctx.viewportHeight) /
                            (this.state.getCurrentParticleData().aspectRatio));

      return [
        2, 0, 0, 0,
        0, 2 * aspect, 0, 0,
        0, 0, 1, 0,
        -1, (underscan * 2) - 1, 0, 1
      ];
    });
    uniforms.addUniform('invViewProjectionMatrix', 'mat4', (ctx) => {
      const aspect = ctx.viewportWidth / ctx.viewportHeight;
      const underscan = 1 - ((ctx.viewportWidth / ctx.viewportHeight) /
                            (this.state.getCurrentParticleData().aspectRatio));

      return [
        0.5, 0, 0, 0,
        0, 0.5 / aspect, 0, 0,
        0, 0, 1, 0,
        0.5, (-0.5 * ((underscan * 2) - 1)) / aspect, 0, 1
      ];
    });
    uniforms.addUniform('particleSize', 'float', (ctx) => (ctx.viewportWidth / this.state.getCurrentParticleData().width) * 2 * this.config.particleScaling);
    uniforms.addUniform('globalTime', 'int', (ctx, props) => props.clock.getTime());
    return uniforms;
  }

  static prepareVertexShader(uniforms) {
    const vertexShader = new Shader();

    vertexShader.attributes += `
      attribute vec2 texcoord;
      attribute vec3 rgb;
      attribute vec3 hsv;
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

    return vertexShader;
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
    return new Promise((res, rej) => {
      const uniforms = {};
      const vert = CommandBuilder.prepareVertexShader();
      const frag = this.assembleFragmentShader();
      this.makeUniforms().compile(vert, uniforms);

      const result = {
        primitive:  'points',
        // TODO This cannot be changed ad-hoc. A new command would be necessary.
        // regl.elements (http://regl.party/api#elements) could be an alternative here
        count:      this.config.xParticlesCount * this.config.yParticlesCount,
        attributes: {
          texcoord: () => this.state.getCurrentParticleData().texcoordsBuffer,
          rgb:      () => this.state.getCurrentParticleData().rgbBuffer,
          hsv:      () => this.state.getCurrentParticleData().hsvBuffer
        },
        uniforms,
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

      vert.mainBody += `
        vec3 initialPosition = vec3(texcoord, 0);
        initialPosition.y *= invImageAspectRatio;

        vec3 position = initialPosition;
      `;
      const nextEffect = (() => {
        let i = 0;
        let j = 0;
        return () => {
          if (i === this.config.effects.length) {
            return null;
          }
          const track = this.config.effects[i];
          if (j === track.length) {
            i++;
            j = 0;
            return nextEffect();
          }
          const effect = track[j];
          j = j + 1;
          return effect;
        }
      })();
      let globalId = 0;
      const registerEffects = (res, rej) => {
        const effectConfig = nextEffect();
        if (effectConfig === null) {
          return res();
        }
        const effectUniforms = new Uniforms(globalId);
        const effectClass = effectConfig.getEffectClass();
        vert.mainBody += `if (${effectConfig.timeBegin} <= globalTime && globalTime <= ${effectConfig.timeEnd}) {`;
        effectClass.registerAsync(effectConfig, this.props, effectUniforms, vert)
        .then(() => {
          vert.mainBody += '}';

          effectUniforms.compile(vert, uniforms);
          globalId += 1;
          registerEffects(res, rej);
        });
      };
      return new Promise(registerEffects).then(() => {
        vert.mainBody += `
          color = rgb;
          gl_PointSize = max(particleSize, 0.);
          gl_Position = viewProjectionMatrix * vec4(position, 1.);
        `;

        result.vert = vert.compile();

        res(result);
      });
    });
  }
}
