import { effectsById } from './effects/index';
import { Shader, Uniforms, Attributes } from './regl-utils';
import { reportError } from './error-manager';

const gl_rgb2hsv = `
      vec3 rgb2hsv(vec3 rgb) {
        float cmin = min(rgb.r, min(rgb.g, rgb.b));
        float cmax = max(rgb.r, max(rgb.g, rgb.b));
        float d = cmax - cmin;
        float eps = 0.00001;
        if (d < eps || cmax < eps) {
          return vec3(0, 0, cmax);
        }

        float _h;
        if (cmax == rgb.r) {
          _h = (rgb.g - rgb.b) / d;
          if (_h < 0.) {
            _h += 6.;
          }
        } else if (cmax == rgb.g) {
          _h = ((rgb.b - rgb.r) / d) + 2.;
        } else {
          _h = ((rgb.r - rgb.g) / d) + 4.;
        }

        return vec3(_h * 60. * (PI / 180.), d / cmax, cmax);
      }
`;

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
    uniforms.addUniform('particleSize', 'float', (ctx) => (ctx.viewportWidth / this.config.xParticlesCount) * this.config.particleScaling);
    uniforms.addUniform('globalTime', 'int', (ctx, props) => props.clock.getTime());
    uniforms.addUniform('viewport', 'vec2', (ctx) => [ctx.viewportWidth, ctx.viewportHeight]);
    uniforms.addUniform('background_color', 'vec4', () => this.config.backgroundColor);
    return uniforms;
  }

  static prepareVertexShader(uniforms) {
    const vertexShader = new Shader();

    vertexShader.attributes += `
      attribute vec2 texcoord;
      attribute vec4 rgba_int;
    `;
    vertexShader.varyings += 'varying vec3 color;\n';
    vertexShader.globals += 'const float PI = 3.14159265;\n';
    // Global library functions
    // TODO make functions a dict (= set) so that users can add them on
    // demand without defining them more than once
    vertexShader.functions += `
      vec2 getDirectionVector(float angle) {
        return vec2(cos(angle), sin(angle));
      }
      ${gl_rgb2hsv}
    `;

    return vertexShader;
  }

  static prepareFragmentShader() {
    const fragmentShader = new Shader();
    fragmentShader.varyings += 'varying vec3 color;\n';
    fragmentShader.globals += 'const float PI = 3.14159265;\n';
    fragmentShader.functions += gl_rgb2hsv
    return fragmentShader;
  }

  assembleCommand() {
    return new Promise((res, rej) => {
      const uniforms = {};
      const attributes = {
        texcoord: () => this.state.texcoordsBuffer,
        rgba_int: () => this.state.getColorBuffer()
      };
      const defaultUniforms = this.createDefaultUniforms();
      const vert = CommandBuilder.prepareVertexShader();
      defaultUniforms.compile(vert, uniforms);
      const frag = CommandBuilder.prepareFragmentShader();
      defaultUniforms.compile(frag, null); // default uniforms are already registered
                                           // in uniforms object, therefore pass null
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
        vec3 rgb = rgba_int.rgb / 255.;
        vec3 hsv = rgb2hsv(rgb);
        vec3 initialPosition = vec3(texcoord, 0);
        float pointSize = max(particleSize, 0.);

        vec3 position = initialPosition;
      `;
      frag.mainBody += `
        vec3 rgb = color;
        vec2 frag_coord = (gl_FragCoord.xy - vec2(.5)) / (viewport - vec2(1.));
        // gl_PointCoord coord system is edge-centered, but it's more
        // convenient if we center the system at the center of the
        // fragment (see point_dist below for example)
        vec2 point_coord = (gl_PointCoord * 2. - vec2(1.)) * vec2(1., -1.);
        float point_dist = length(point_coord);
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
        vert.mainBody += `if (${effectConfig.timeBegin} <= globalTime && globalTime <= ${effectConfig.timeEnd}) {\n`;
        frag.mainBody += `if (${effectConfig.timeBegin} <= globalTime && globalTime <= ${effectConfig.timeEnd}) {\n`;
        effectClass.registerAsync(effectConfig, this.props, effectUniforms, vert, frag, effectAttributes)
        .then(() => {
          vert.mainBody += '}\n';
          frag.mainBody += '}\n';

          effectUniforms.compile(vert, uniforms);
          effectAttributes.compile(vert, attributes);
          globalId += 1;
          registerEffects(res, rej);
        }, (err) => {
          reportError(err);
          vert.mainBody += '// error during registration\n}\n';
          frag.mainBody += '// error during registration\n}\n';

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
          circle: 'ceil(1. - point_dist)',
          square: '1.',
          // PI/3 = 60 degrees = inner angle of equilateral triangle
          triangle: 'gl_PointCoord.y < 0.933 && gl_PointCoord.y >= 0.067 + abs(point_coord.x/2.) * tan(PI/3.) ? 1. : 0.'
        }[particleShape];
        const fadingFactor = {
          none:       {circle: '1.', square: '1.', triangle: '1.'},
          'fade-out': {
            circle: '(cos(PI * point_dist) + 1.) / 2.',
            square: '1. - max(abs(point_coord.x), abs(point_coord.y))',
            triangle: '1. - length(vec2(.5, .289) - gl_PointCoord)'
          }
        }[particleFading][particleShape];
        const colorAssign = {
          add:           'gl_FragColor = vec4(rgb * fadingFactor, 1);\n',
          'alpha blend': 'gl_FragColor = vec4(rgb, fadingFactor);\n'
        }[particleOverlap];
        frag.mainBody += `
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
