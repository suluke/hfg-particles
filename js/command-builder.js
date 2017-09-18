import { effectsById } from './effects/index';
import { Shader, Uniforms, Attributes } from './regl-utils';

export default class CommandBuilder {
  buildCommand(props) {
    this.config = props.config;
    this.state = props.state;
    this.clock = props.clock;
    this.props = props;

    return this.assembleCommand();
  }

  createDefaultUniforms() {
    const uniforms = new Uniforms();
    uniforms.addUniform('invScreenAspectRatio', 'float', (ctx) => ctx.viewportHeight / ctx.viewportWidth);
    uniforms.addUniform('particleSize', 'float', (ctx) => (ctx.viewportWidth / this.state.getCurrentParticleData().width) * this.config.particleScaling);
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

  static prepareFragmentShader() {
    const fragmentShader = new Shader();
    fragmentShader.varyings += 'varying vec3 color;\n';
    fragmentShader.globals += 'const float PI = 3.14159265;\n';
    return fragmentShader;
  }

  assembleCommand() {
    return new Promise((res, rej) => {
      const uniforms = {};
      const attributes = {
        texcoord: () => this.state.getCurrentParticleData().texcoordsBuffer,
        rgb:      () => this.state.getCurrentParticleData().rgbBuffer,
        hsv:      () => this.state.getCurrentParticleData().hsvBuffer
      };
      const vert = CommandBuilder.prepareVertexShader();
      const frag = CommandBuilder.prepareFragmentShader();
      this.createDefaultUniforms().compile(vert, uniforms);

      const result = {
        primitive:  'points',
        // TODO This cannot be changed ad-hoc. A new command would be necessary.
        // regl.elements (http://regl.party/api#elements) could be an alternative here
        count:      this.config.xParticlesCount * this.config.yParticlesCount,
        attributes,
        uniforms,
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
        float pointSize = max(particleSize, 0.);

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
        const effectAttributes = new Attributes(globalId);
        const effectClass = effectConfig.getEffectClass();
        vert.mainBody += `if (${effectConfig.timeBegin} <= globalTime && globalTime <= ${effectConfig.timeEnd}) {`;
        effectClass.registerAsync(effectConfig, this.props, effectUniforms, vert, frag, effectAttributes)
        .then(() => {
          vert.mainBody += '}';

          effectUniforms.compile(vert, uniforms);
          effectAttributes.compile(vert, attributes);
          globalId += 1;
          registerEffects(res, rej);
        }, (err) => {
          // TODO
          console.error(`An error occurred in ${effectConfig.id}`);
          console.error(err);
          vert.mainBody += '}';

          effectUniforms.compile(vert, uniforms);
          effectAttributes.compile(vert, attributes);
          globalId += 1;
          registerEffects(res, rej);
        });
      };
      return new Promise(registerEffects).then(() => {
        vert.mainBody += `
          color = rgb;
          gl_PointSize = pointSize;
          gl_Position = vec4(vec2(2.) * position.xy - vec2(1.), 0., 1.);
        `;
        const particleShape = this.config.particleShape || 'circle';
        const particleFading = this.config.particleFading || 'fade-out';
        const particleOverlap =  this.config.particleOverlap || 'add';
        const insideShape = {
          circle: 'ceil(1. - dist)',
          square: '1.',
          // PI/3 = 60 degrees = inner angle of equilateral triangle
          triangle: 'gl_PointCoord.y < 0.933 && gl_PointCoord.y >= 0.067 + abs(pos.x/2.) * tan(PI/3.) ? 1. : 0.'
        }[particleShape];
        const fadingFactor = {
          none:       {circle: '1.', square: '1.', triangle: '1.'},
          'fade-out': {
            circle: '(cos(PI * dist) + 1.) / 2.',
            square: '1. - max(abs(pos.x), abs(pos.y))',
            triangle: '1. - length(vec2(.5, .289) - gl_PointCoord)'
          }
        }[particleFading][particleShape];
        const colorAssign = {
          add:           'gl_FragColor = vec4(color * fadingFactor, 1);\n',
          'alpha blend': 'gl_FragColor = vec4(color, fadingFactor);\n'
        }[particleOverlap];
        frag.mainBody += `
          vec2 pos = gl_PointCoord * vec2(2.) - vec2(1.);
          float dist = length(pos);
          float insideShape = ${insideShape};
          float fadingFactor = (${fadingFactor}) * insideShape;
          ${colorAssign}
        `;

        result.vert = vert.compile();
        result.frag = frag.compile();

        res(result);
      });
    });
  }
}
