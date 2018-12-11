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
        <label>
          Particle attribute used for selecting letter:
          <select class="${classPrefix}-select-letter-by" value="hue">
            <option value="hue" selected>Hue</option>
            <option value="brightness">Brightness</option>
            <option value="text">Text</option>
          </select><br/>
          <label>
            Text:
            <input type="text" class="${classPrefix}-text" value="HELLO WORLD "/>
          </label>
        </label>
      </fieldset>
    `);
    const ui = this.element;
    this.selectLetterByInput = ui.querySelector(`select.${classPrefix}-select-letter-by`);
    this.textInput = ui.querySelector(`input.${classPrefix}-text`);

    this.selectLetterByInput.addEventListener('change', () => {
      this.notifyChange();
    });
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    return {
      selectLetterBy: this.selectLetterByInput.value || 'hue',
      text: this.textInput.value || 'HELLO WORLD '
    };
  }

  applyConfig(config) {
    this.selectLetterByInput.value = config.selectLetterBy || 'hue';
    this.textInput.value = config.text ||  'HELLO WORLD ';
  }
}

export default class LettersEffect extends Effect {
  static register(instance, props, uniforms, vertexShader, fragmentShader, attributes, varyings) {
    const selectLetterBy = instance.config.selectLetterBy || 'hue';
    fragmentShader.addFunction('pointToLineDist', `
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
    `);
    if (selectLetterBy === 'hue')
      fragmentShader.addFunction('colorToLetter', `
        int colorToLetter(vec3 color) {
          vec3 hsv = rgb2hsv(color);
          return int(65. + mod(floor(26. * hsv.x), 26.));
        }
      `);
    else if (selectLetterBy === 'brightness')
      fragmentShader.addFunction('colorToLetter', `
        int colorToLetter(vec3 color) {
          vec3 hsv = rgb2hsv(color);
          return int(65. + mod(floor(26. * hsv.z), 26.));
        }
      `);
    else if (selectLetterBy === 'text') {
      const px = props.config.xParticlesCount;
      const py = props.config.yParticlesCount;
      const enc = new TextEncoder();
      let text = instance.config.text || 'HELLO WORLD ';
      text = text.toUpperCase();
      text = text.repeat(Math.ceil(px * py / text.length));
      text = text.substring(0, px * py);
      const textData = enc.encode(text);
      const { id, buffer: textBuffer } = props.state.createBuffer(textData);
      const charAttr = attributes.add('textCharacterAttr', 'float', textBuffer);
      const charVar = varyings.addVarying('textCharacter', 'float');
      vertexShader.mainBody += `${charVar} = float(${charAttr});`;
      fragmentShader.addFunction('colorToLetter', `
        int colorToLetter(vec3 color) {
          return int(${charVar});
        }
      `);
    } else
      throw new Error(`Unknown value for letter effect's select-letter-by option: ${selectLetterBy}`);
    fragmentShader.addFunction('getDistFromA', `
      float getDistFromA(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.4, -.4),      vec2(0., .4));
        float d2 = pointToLineDist(coord, vec2(0., .4),        vec2(.4, -.4));
        float d3 = pointToLineDist(coord, vec2(-.25, -.125), vec2(.25, -.125));
        float dist = min(min(d1, d2), d3);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromB', `
      float getDistFromB(vec2 coord) {
        // Back line
        float d1 = pointToLineDist(coord, vec2(-.375, -.4),  vec2(-.375, .4));
        // horizontal lines
        float d2 = pointToLineDist(coord, vec2(-.375, .4),   vec2(0.125, .4));
        float d3 = pointToLineDist(coord, vec2(-.375, .1),   vec2(0.25, .1));
        float d4 = pointToLineDist(coord, vec2(-.375, -.4),  vec2(0.25, -.4));
        // vertical lines
        float d5 = pointToLineDist(coord, vec2(0.125, .4),    vec2(0.125, .1));
        float d6 = pointToLineDist(coord, vec2(0.25, .1), vec2(0.25, -.4));
        float dist = min(min(min(min(min(d1, d2), d3), d4), d5), d6);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromC', `
      float getDistFromC(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.375), vec2(-.375, .375));
        float d2 = pointToLineDist(coord, vec2(-.375, .375),  vec2(.375, .375));
        float d3 = pointToLineDist(coord, vec2(-.375, -.375), vec2(.375, -.375));
        float dist = min(min(d1, d2), d3);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromD', `
      float getDistFromD(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.4), vec2(-.375, .4));
        float d2 = pointToLineDist(coord, vec2(-.375, .4),  vec2(.25, .4));
        float d3 = pointToLineDist(coord, vec2(-.375, -.4), vec2(.25, -.4));
        float d4 = pointToLineDist(coord, vec2(.25, .4),    vec2(.375, 0.));
        float d5 = pointToLineDist(coord, vec2(.25, -.4),   vec2(.375, 0.));
        float dist = min(min(min(min(d1, d2), d3), d4), d5);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromE', `
      float getDistFromE(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.4), vec2(-.375, .4));
        float d2 = pointToLineDist(coord, vec2(-.375, .4),  vec2(.375, .4));
        float d3 = pointToLineDist(coord, vec2(-.375, -.4), vec2(.375, -.4));
        float d4 = pointToLineDist(coord, vec2(-.375, .1),  vec2(.25, .1));
        float dist = min(min(min(d1, d2), d3), d4);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromF', `
      float getDistFromF(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.4), vec2(-.375, .4));
        float d2 = pointToLineDist(coord, vec2(-.375, .4),  vec2(.375, .4));
        float d3 = pointToLineDist(coord, vec2(-.375, 0.),  vec2(.25, 0.));
        float dist = min(min(d1, d2), d3);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromG', `
      float getDistFromG(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.375), vec2(-.375, .375));
        float d2 = pointToLineDist(coord, vec2(-.375, .375),  vec2(.375, .375));
        float d3 = pointToLineDist(coord, vec2(-.375, -.375), vec2(.375, -.375));
        float d4 = pointToLineDist(coord, vec2(.375, -.375), vec2(.375, 0.));
        float d5 = pointToLineDist(coord, vec2(.375, 0.), vec2(.1, 0.));
        float dist = min(min(min(min(d1, d2), d3), d4), d5);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromH', `
      float getDistFromH(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.4), vec2(-.375, .4));
        float d2 = pointToLineDist(coord, vec2(.375, -.4),  vec2(.375, .4));
        float d3 = pointToLineDist(coord, vec2(-.375, 0.), vec2(.375, 0.));
        float dist = min(min(d1, d2), d3);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromI', `
      float getDistFromI(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(0., -.4), vec2(0., .4));
        float dist = d1;
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromJ', `
      float getDistFromJ(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.125, .5), vec2(.125, .5));
        float d2 = pointToLineDist(coord, vec2(0., -.2), vec2(0., .5));
        float d3 = pointToLineDist(coord, vec2(0., -.2), vec2(-.25, -.5));
        float dist = min(min(d1, d2), d3);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromK', `
      float getDistFromK(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.4), vec2(-.375, .4));
        float d2 = pointToLineDist(coord, vec2(-.375, 0.), vec2(.375, .4));
        float d3 = pointToLineDist(coord, vec2(-.375, 0.), vec2(.375, -.4));
        float dist = min(min(d1, d2), d3);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromL', `
      float getDistFromL(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.4), vec2(-.375, .4));
        float d2 = pointToLineDist(coord, vec2(-.375, -.4), vec2(.25, -.4));
        float dist = min(d1, d2);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromM', `
      float getDistFromM(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.4), vec2(-.375, .4));
        float d2 = pointToLineDist(coord, vec2(.375, -.4),  vec2(.375, .4));
        float d3 = pointToLineDist(coord, vec2(-.375, .4),  vec2(0., 0.));
        float d4 = pointToLineDist(coord, vec2(.375, .4),   vec2(0., 0.));
        float dist = min(min(min(d1, d2), d3), d4);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromN', `
      float getDistFromN(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.4), vec2(-.375, .4));
        float d2 = pointToLineDist(coord, vec2(.375, -.4),  vec2(.375, .4));
        float d3 = pointToLineDist(coord, vec2(-.375, .4),  vec2(.375, -.4));
        float dist = min(min(d1, d2), d3);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromO', `
      float getDistFromO(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.4), vec2(-.375, .4));
        float d2 = pointToLineDist(coord, vec2(.375, -.4),  vec2(.375, .4));
        float d3 = pointToLineDist(coord, vec2(-.375, .4),  vec2(.375, .4));
        float d4 = pointToLineDist(coord, vec2(-.375, -.4), vec2(.375, -.4));
        float dist = min(min(min(d1, d2), d3), d4);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromP', `
      float getDistFromP(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.4), vec2(-.375, .4));
        float d2 = pointToLineDist(coord, vec2(.375, .4),   vec2(.375, 0.));
        float d3 = pointToLineDist(coord, vec2(-.375, .4),  vec2(.375, .4));
        float d4 = pointToLineDist(coord, vec2(-.375, 0.), vec2(.375, 0.));
        float dist = min(min(min(d1, d2), d3), d4);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromQ', `
      float getDistFromQ(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.4), vec2(-.375, .4));
        float d2 = pointToLineDist(coord, vec2(.375, -.4),  vec2(.375, .4));
        float d3 = pointToLineDist(coord, vec2(-.375, .4),  vec2(.375, .4));
        float d4 = pointToLineDist(coord, vec2(-.375, -.4), vec2(.375, -.4));
        float d5 = pointToLineDist(coord, vec2(.2, -.2), vec2(.5, -.5));
        float dist = min(min(min(min(d1, d2), d3), d4), d5);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromR', `
      float getDistFromR(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.4), vec2(-.375, .4));
        float d2 = pointToLineDist(coord, vec2(.375, .4),   vec2(.375, 0.));
        float d3 = pointToLineDist(coord, vec2(-.375, .4),  vec2(.375, .4));
        float d4 = pointToLineDist(coord, vec2(-.375, 0.), vec2(.375, 0.));
        float d5 = pointToLineDist(coord, vec2(-.375, 0.), vec2(.375, -.4));
        float dist = min(min(min(min(d1, d2), d3), d4), d5);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromS', `
      float getDistFromS(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, .4),  vec2(.375, .4));
        float d2 = pointToLineDist(coord, vec2(-.375, 0.),  vec2(.375, -0.));
        float d3 = pointToLineDist(coord, vec2(-.375, -.4), vec2(.375, -.4));
        float d4 = pointToLineDist(coord, vec2(-.375, .4),  vec2(-.375, 0.));
        float d5 = pointToLineDist(coord, vec2(.375, -.4),  vec2(.375, 0.));
        float dist = min(min(min(min(d1, d2), d3), d4), d5);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromT', `
      float getDistFromT(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(0., -.4),   vec2(0., .4));
        float d2 = pointToLineDist(coord, vec2(-.375, .4), vec2(.375, .4));
        float dist = min(d1, d2);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromU', `
      float getDistFromU(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.4), vec2(-.375, .4));
        float d2 = pointToLineDist(coord, vec2(.375, -.4),  vec2(.375, .4));
        float d3 = pointToLineDist(coord, vec2(-.375, -.4), vec2(.375, -.4));
        float dist = min(min(d1, d2), d3);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromV', `
      float getDistFromV(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, .4), vec2(0., -.4));
        float d2 = pointToLineDist(coord, vec2(.375, .4),  vec2(0., -.4));
        float dist = min(d1, d2);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromW', `
      float getDistFromW(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.4), vec2(-.375, .4));
        float d2 = pointToLineDist(coord, vec2(.375, -.4),  vec2(.375, .4));
        float d3 = pointToLineDist(coord, vec2(-.375, -.4),  vec2(0., 0.));
        float d4 = pointToLineDist(coord, vec2(.375, -.4),   vec2(0., 0.));
        float dist = min(min(min(d1, d2), d3), d4);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromX', `
      float getDistFromX(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.4), vec2(.375, .4));
        float d2 = pointToLineDist(coord, vec2(-.375, .4), vec2(.375, -.4));
        float dist = min(d1, d2);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromY', `
      float getDistFromY(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.5), vec2(.375, .4));
        float d2 = pointToLineDist(coord, vec2(-.375, .4), vec2(0., 0.));
        float dist = min(d1, d2);
        return dist;
      }
    `);
    fragmentShader.addFunction('getDistFromZ', `
      float getDistFromZ(vec2 coord) {
        float d1 = pointToLineDist(coord, vec2(-.375, -.4), vec2(.375, -.4));
        float d2 = pointToLineDist(coord, vec2(-.375, .4),  vec2(.375, .4));
        float d3 = pointToLineDist(coord, vec2(-.375, -.4), vec2(.375, .4));
        float dist = min(min(d1, d2), d3);
        return dist;
      }
    `);
    fragmentShader.addFunction('getLetterOpacity', `
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
        else if (letter == 71)
          dist = getDistFromG(coord);
        else if (letter == 72)
          dist = getDistFromH(coord);
        else if (letter == 73)
          dist = getDistFromI(coord);
        else if (letter == 74)
          dist = getDistFromJ(coord);
        else if (letter == 75)
          dist = getDistFromK(coord);
        else if (letter == 76)
          dist = getDistFromL(coord);
        else if (letter == 77)
          dist = getDistFromM(coord);
        else if (letter == 78)
          dist = getDistFromN(coord);
        else if (letter == 79)
          dist = getDistFromO(coord);
        else if (letter == 80)
          dist = getDistFromP(coord);
        else if (letter == 81)
          dist = getDistFromQ(coord);
        else if (letter == 82)
          dist = getDistFromR(coord);
        else if (letter == 83)
          dist = getDistFromS(coord);
        else if (letter == 84)
          dist = getDistFromT(coord);
        else if (letter == 85)
          dist = getDistFromU(coord);
        else if (letter == 86)
          dist = getDistFromV(coord);
        else if (letter == 87)
          dist = getDistFromW(coord);
        else if (letter == 88)
          dist = getDistFromX(coord);
        else if (letter == 89)
          dist = getDistFromY(coord);
        else if (letter == 90)
          dist = getDistFromZ(coord);
        else if (letter == 9 || letter == 32)
          dist = 1.;
        // Opacity is only the distance to the letter atm. Therefore we
        // do some mathematic magic to get to a more sensible opacity
        // value
        float tooFar = .1;
        float opacity = min(dist, tooFar * .99);
        opacity = 1. / ((opacity - tooFar) * 100.) + 1.1;
        return max(min(opacity, 1.), 0.);
      }
    `);
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
