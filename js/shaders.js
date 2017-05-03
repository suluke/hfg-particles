export const vert = `
  precision highp float;
  
  attribute vec2 texcoord;
  
  uniform sampler2D image;
  uniform float time;
  
  varying vec3 c;
  
  vec3 rgb_to_hsv(vec3 rgb)
  {
    float c_max = max(max(rgb.r, rgb.g), rgb.b), c_min = min(min(rgb.r, rgb.g), rgb.b);
  
    float d = c_max - c_min;

    if(d < 0.00001 || c_max < 0.00001) return vec3(0, 0, c_min);

    float h;
    if(c_max == rgb.r) { h = (rgb.g - rgb.b) / d; if(h < 0.) h += 6.; }
    else if(c_max == rgb.g) h = (rgb.b - rgb.r) / d + 2.;
    else h = (rgb.r - rgb.g) / d + 4.;

    return vec3(h * 60., d / c_max, c_max);
  }
  
  vec2 direction_vector(float angle)
  {
    return vec2(cos(angle), sin(angle));
  }
  
  void main()
  {
    vec2 tc = texcoord;
    tc.y = 1. - tc.y;
    c = texture2D(image, tc).rgb;

    vec3 p = vec3(texcoord * vec2(2) - vec2(1), 0);
    p.xy += ((sin(time * 3.14159265 / 2.) + 1.) / 2.) * direction_vector(rgb_to_hsv(c)[0] * 3.14159265 / 180.) * 0.2;

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
