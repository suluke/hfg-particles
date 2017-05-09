export const vert = `
  precision highp float;

  attribute vec2 texcoord;
  attribute vec3 rgb;
  attribute vec3 hsv;

  uniform float invImageAspectRatio;

  uniform mat4 viewProjectionMatrix;

  uniform float particleSize;

  uniform float time;

  varying vec3 c;

  vec2 direction_vector(float angle)
  {
    return vec2(cos(angle), sin(angle));
  }

  void main()
  {
    c = rgb;

    vec3 p = vec3(texcoord * vec2(1, invImageAspectRatio), 0);
    p.xy += ((sin(time * 3.14159265 / 2.) + 1.) / 2.) * direction_vector(hsv.x * 3.14159265 / 180.) * 0.1;

    gl_PointSize = max(particleSize, 0.);
    gl_Position = viewProjectionMatrix * vec4(p, 1);
  }
`;

export const frag = `
  precision highp float;

  varying vec3 c;

  void main()
  {
    float v = pow(max(1. - 2. * length(gl_PointCoord - vec2(.5)), 0.), 1.5);
    gl_FragColor = vec4(c * v, 1);
  }
`;

export class ShaderBuilder {
  static buildDefault() {
    return { vert, frag };
  }
  static build(state) {
    const shaders = ShaderBuilder.buildDefault();
    if (state.renderMode === 'alpha blend') {
      shaders.frag = `
        precision highp float;

        varying vec3 c;

        void main()
        {
          float v = pow(max(1. - 2. * length(gl_PointCoord - vec2(.5)), 0.), 1.5);
          gl_FragColor = vec4(c, v);
        }
      `;
    }
    return shaders;
  }
}

export class PipelineBuilder {
  static buildDefault() {
    const shaders = ShaderBuilder.buildDefault();

    return {
      vert: shaders.vert,
      frag: shaders.frag,
      depth: { enable: false },
      blend: {
        enable: true,
        func: { srcRGB: 'one', srcAlpha: 'one', dstRGB: 'one', dstAlpha: 'one' },
        equation: { rgb: 'add', alpha: 'add' }
      },
      primitive: 'points'
    };
  }

  static build(state) {
    const dflt = PipelineBuilder.buildDefault();
    const shaders = ShaderBuilder.build(state);
    dflt.vert = shaders.vert;
    dflt.frag = shaders.frag;
    if (state.renderMode === 'alpha blend') {
      dflt.blend.func = { srcRGB: 'src alpha', srcAlpha: 1, dstRGB: 'one minus src alpha', dstAlpha: 1 };
    }
    return dflt;
  }
}
