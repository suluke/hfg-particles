export const dbgBlit = {
  vert: `
    precision highp float;
    attribute vec2 texcoord;
    varying vec2 f_texcoord;
    void main()
    {
      f_texcoord = texcoord;
      gl_Position = vec4(texcoord * vec2(2) - vec2(1), 0, 1);
    }
  `,

  frag: `
    precision highp float;
    uniform sampler2D texture;
    varying vec2 f_texcoord;
    void main()
    {
      gl_FragColor = texture2D(texture, f_texcoord);
    }
  `
};

export const vert = `
  precision highp float;

  attribute vec2 texcoord;
  attribute vec3 rgb;
  attribute vec3 hsv;

  uniform float time;

  varying vec3 c;

  vec2 direction_vector(float angle)
  {
    return vec2(cos(angle), sin(angle));
  }

  void main()
  {
    c = rgb;

    vec3 p = vec3(texcoord * vec2(2) - vec2(1), 0);
    p.xy += ((sin(time * 3.14159265 / 2.) + 1.) / 2.) * direction_vector(hsv.x * 3.14159265 / 180.) * 0.2;

    gl_PointSize = 16.;
    gl_Position = vec4(p, 1);
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
