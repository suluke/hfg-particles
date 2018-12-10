import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';

const EffectName = 'Letters';
const EffectDescription = 'Render particles in the shape of letters';

class LettersConfigUI extends ConfigUI {
  constructor() {
    super();
    const classPrefix = 'effect-letters';
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
        Nothing to be configured :)
      </fieldset>
    `);
    const ui = this.element;
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    return {};
  }

  applyConfig(config) {
  }
}

export default class LettersEffect extends Effect {
  static register(instance, props, uniforms, vertexShader, fragmentShader) {
    fragmentShader.functions += `
      // https://stackoverflow.com/a/1501725/1468532
      float pointToLineDist(vec2 p, vec2 v, vec2 w) {
        // Return minimum distance between line segment vw and point p
        float l2 = pow(distance(v, w), 2.);  // i.e. |w-v|^2 -  avoid a sqrt
        if (l2 == 0.0) return distance(p, v);   // v == w case
        // Consider the line extending the segment, parameterized as v + t (w - v).
        // We find projection of point p onto the line.
        // It falls where t = [(p-v) . (w-v)] / |w-v|^2
        // We clamp t from [0,1] to handle points outside the segment vw.
        float t = max(0., min(1., dot(p - v, w - v) / l2));
        vec2 projection = v + t * (w - v);  // Projection falls on the segment
        return distance(p, projection);
      }
      int colorToLetter(vec3 color) {
        vec3 hsv = rgb2hsv(color);
        return int(65. + mod(floor(255. * hsv.x), 6.));
      }
      float getDistFromA(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.5, -.5),      vec2(0., .5));
        float d2 = pointToLineDist(coord, vec2(0., .5),        vec2(.5, -.5));
        float d3 = pointToLineDist(coord, vec2(-.3125, -.125), vec2(.3125, -.125));
        float dist = min(min(d1, d2), d3);
        return dist;
      }
      float getDistFromB(vec2 coord) {
        // Back line
        float d1 = pointToLineDist(coord, vec2(-.375, -.5),  vec2(-.375, .5));
        // horizontal lines
        float d2 = pointToLineDist(coord, vec2(-.375, .5),   vec2(0.125, .5));
        float d3 = pointToLineDist(coord, vec2(-.375, .1),   vec2(0.25, .1));
        float d4 = pointToLineDist(coord, vec2(-.375, -.5),  vec2(0.25, -.5));
        // vertical lines
        float d5 = pointToLineDist(coord, vec2(0.125, .5),    vec2(0.125, .1));
        float d6 = pointToLineDist(coord, vec2(0.25, .1), vec2(0.25, -.5));
        float dist = min(min(min(min(min(d1, d2), d3), d4), d5), d6);
        return dist;
      }
      float getDistFromC(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.375), vec2(-.375, .375));
        float d2 = pointToLineDist(coord, vec2(-.375, .375),  vec2(.375, .375));
        float d3 = pointToLineDist(coord, vec2(-.375, -.375), vec2(.375, -.375));
        float dist = min(min(d1, d2), d3);
        return dist;
      }
      float getDistFromD(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.4), vec2(-.375, .4));
        float d2 = pointToLineDist(coord, vec2(-.375, .4),  vec2(.25, .4));
        float d3 = pointToLineDist(coord, vec2(-.375, -.4), vec2(.25, -.4));
        float d4 = pointToLineDist(coord, vec2(.25, .4),    vec2(.375, 0.));
        float d5 = pointToLineDist(coord, vec2(.25, -.4),   vec2(.375, 0.));
        float dist = min(min(min(min(d1, d2), d3), d4), d5);
        return dist;
      }
      float getDistFromE(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.4), vec2(-.375, .4));
        float d2 = pointToLineDist(coord, vec2(-.375, .4),  vec2(.375, .4));
        float d3 = pointToLineDist(coord, vec2(-.375, -.4), vec2(.375, -.4));
        float d4 = pointToLineDist(coord, vec2(-.375, .1),  vec2(.25, .1));
        float dist = min(min(min(d1, d2), d3), d4);
        return dist;
      }
      float getDistFromF(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.4), vec2(-.375, .4));
        float d2 = pointToLineDist(coord, vec2(-.375, .4),  vec2(.375, .4));
        float d3 = pointToLineDist(coord, vec2(-.375, 0.),  vec2(.25, 0.));
        float dist = min(min(d1, d2), d3);
        return dist;
      }
      float getLetterOpacity(int letter, vec2 coord) {
        float dist = 0.;
        if (letter == 65)
          dist = getDistFromA(coord);
        else if (letter == 66)
          dist = getDistFromB(coord);
        else if (letter == 67)
          dist = getDistFromC(coord);
        else if (letter == 68)
          dist = getDistFromD(coord);
        else if (letter == 69)
          dist = getDistFromE(coord);
        else if (letter == 70)
          dist = getDistFromF(coord);
        // Opacity is only the distance to the letter atm. Therefore we
        // do some mathematic magic to get to a more sensible opacity
        // value
        float tooFar = .1;
        float opacity = min(dist, tooFar * .99);
        opacity = 1. / ((opacity - tooFar) * 100.) + 1.1;
        return max(min(opacity, 1.), 0.);
      }
    `;
    fragmentShader.mainBody += `
      int letter = colorToLetter(rgb);
      rgb.rgb *= getLetterOpacity(letter, point_coord);
    `;
  }

  static getDisplayName() {
    return EffectName;
  }

  static getDescription() {
    return EffectDescription;
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new LettersConfigUI();
    }

    return this._configUI;
  }

  static getDefaultConfig() {
    return {};
  }

  static getRandomConfig() {
    return {};
  }
}
