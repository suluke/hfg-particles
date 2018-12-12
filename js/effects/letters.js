import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';
import Ease from './ease-mixins';

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

    Ease.extend(this, classPrefix);
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

const MAX_LINES_PER_LETTER = 8;
const NUM_LETTERS = 256;
const ELMTS_PER_LINE = 4;

function CreateFontData() {
  const letterLines = new Uint8Array(NUM_LETTERS * MAX_LINES_PER_LETTER * ELMTS_PER_LINE);
  function addChar(char, ...lines) {
    if (lines.length === 0)
      return;
    const charCode = char.charCodeAt(0);
    if (lines.length > MAX_LINES_PER_LETTER)
      throw new Error('Exceeded maximum number of lines per letter');
    let offset = MAX_LINES_PER_LETTER * ELMTS_PER_LINE * charCode;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length > ELMTS_PER_LINE)
        throw new Error('Unexpected line format');
      for (let j = 0; j < line.length; j++)
        letterLines[offset + i * ELMTS_PER_LINE + j] = Math.round((line[j] + 0.5) * 255);
    }
    const line = lines[lines.length - 1];
    for (let i = 0; i < MAX_LINES_PER_LETTER - lines.length; i++) {
      for (let j = 0; j < line.length; j++)
        letterLines[offset + (lines.length + i) * ELMTS_PER_LINE + j] = Math.round((line[j] + 0.5) * 255);
    }
  }
  addChar('0', /* l1 */[-.375, -.4, -.375, .4], /* l2 */[.375,  -.4, .375,  .4],
               /* l3 */[-.375,  .4,  .375, .4], /* l4 */[-.375, -.4, .375, -.4], /* l5 */[-.375, -.4, .375, .4]);
  addChar('1', [0., -.4, 0., .4], [0., .4, -.125, .3]);
  addChar('2', [-.375, .4, .375, .4], [-.375, 0., .375, 0.], [-.375, -.375, .375, -.375], [-.375, 0., -.375, -.375], [.375, 0., .4, .375]);
  addChar('3', [.375, .4, .375, -.375], [-.375, .4, .375, .4], [-.375, 0., .375, 0.], [-.375, -.375, .375, -.375], );
  addChar('4', [-.375, -.125, .375, -.125], [.2, .4, .2, -.375], [-.375, -.125, .2, .4]);
  addChar('5', [-.375, 0., -.375, .4], [-.375, .4, .375, .4], [-.375, 0., .375, 0.], [-.375, -.375, .375, -.375], [.375, -.375, .375, 0.]);
  addChar('6', [-.375, -.375, -.375, .4], [-.375, .4, .375, .4], [-.375, 0., .375, 0.], [-.375, -.375, .375, -.375], [.375, -.375, .375, 0.]);
  addChar('7', [-.375, .4, .375, .4], [.375, .4, -.375, -.375]);
  addChar('8', [-.375, -.4, -.375, .4], [.375, -.4, .375, .4], [-.375, .4, .375, .4], [-.375, -.4, .375, -.4], [-.375, 0., .375, 0.]);
  addChar('9', [-.375, 0., -.375, .4], [.375, -.4, .375, .4], [-.375, .4, .375, .4], [-.375, -.4, .375, -.4], [-.375, 0., .375, 0.]);
  addChar('A', [-.4, -.4, 0., .4], [0., .4, .4, -.4], [-.25, -.125, .25, -.125]);
  addChar('B', [-.375, -.4, -.375, .4], [-.375, .4, 0.125, .4], [-.375, .1, 0.25, .1], [-.375, -.4, 0.25, -.4], [0.125, .4, 0.125, .1], [0.25, .1, 0.25, -.4]);
  addChar('C', [-.375, -.375, -.375, .375], [-.375, .375, .375, .375], [-.375, -.375, .375, -.375]);
  addChar('D', [-.375, -.4, -.375, .4], [-.375, .4, .25, .4], [-.375, -.4, .25, -.4], [.25, .4, .375, 0.], [.25, -.4, .375, 0.]);
  addChar('E', [-.375, -.4, -.375, .4], [-.375, .4, .375, .4], [-.375, -.4, .375, -.4], [-.375, .1, .25, .1]);
  addChar('F', [-.375, -.4, -.375, .4], [-.375, .4, .375, .4], [-.375, 0., .25, 0.]);
  addChar('G', [-.375, -.375, -.375, .375], [-.375, .375, .375, .375], [-.375, -.375, .375, -.375], [.375, -.375, .375, 0.], [.375, 0., .1, 0.]);
  addChar('H', [-.375, -.4, -.375, .4], [.375, -.4, .375, .4], [-.375, 0., .375, 0.]);
  addChar('I', [0., -.4, 0., .4]);
  addChar('J', [-.125, .5, .125, .5], [0., -.2, 0., .5], [0., -.2, -.25, -.5]);
  addChar('K', [-.375, -.4, -.375, .4], [-.375, 0., .375, .4], [-.375, 0., .375, -.4]);
  addChar('L', [-.375, -.4, -.375, .4], [-.375, -.4, .25, -.4]);
  addChar('M', [-.375, -.4, -.375, .4], [.375, -.4, .375, .4], [-.375, .4, 0., 0.], [.375, .4, 0., 0.]);
  addChar('N', [-.375, -.4, -.375, .4], [.375, -.4, .375, .4], [-.375, .4, .375, -.4]);
  addChar('O', [-.375, -.4, -.375, .4], [.375, -.4, .375, .4], [-.375, .4, .375, .4], [-.375, -.4, .375, -.4]);
  addChar('P', [-.375, -.4, -.375, .4], [.375, .4, .375, 0.], [-.375, .4, .375, .4], [-.375, 0., .375, 0.]);
  addChar('Q', [-.375, -.4, -.375, .4], [.375, -.4, .375, .4], [-.375, .4, .375, .4], [-.375, -.4, .375, -.4], [.2, -.2, .5, -.5]);
  addChar('R', [-.375, -.4, -.375, .4], [.375, .4, .375, 0.], [-.375, .4, .375, .4], [-.375, 0., .375, 0.], [-.375, 0., .375, -.4]);
  addChar('S', [-.375, .4, .375, .4], [-.375, 0., .375, -0.], [-.375, -.4, .375, -.4], [-.375, .4, -.375, 0.], [.375, -.4, .375, 0.]);
  addChar('T', [0., -.4, 0., .4], [-.375, .4, .375, .4]);
  addChar('U', [-.375, -.4, -.375, .4], [.375, -.4, .375, .4], [-.375, -.4, .375, -.4]);
  addChar('V', [-.375, .4, 0., -.4], [.375, .4, 0., -.4]);
  addChar('W', [-.375, -.4, -.375, .4], [.375, -.4, .375, .4], [-.375, -.4, 0., 0.], [.375, -.4, 0., 0.]);
  addChar('X', [-.375, -.4, .375, .4], [-.375, .4, .375, -.4]);
  addChar('Y', [-.375, -.5, .375, .4], [-.375, .4, 0., 0.]);
  addChar('Z', [-.375, -.4, .375, -.4], [-.375, .4, .375, .4], [-.375, -.4, .375, .4]);
  return letterLines;
}

const LetterLines = CreateFontData();

export default class LettersEffect extends Effect {
  static register(instance, props, uniforms, vertexShader, fragmentShader, attributes, varyings) {
    const numLetterLines = NUM_LETTERS * MAX_LINES_PER_LETTER;
    const {id: linesId, texture: linesText} = props.state.createTexture({ data: LetterLines, width: numLetterLines, height: 1, format: 'rgba' });
    const linesUniform = uniforms.addUniform('LetterLines', 'sampler2D', linesText);
    const linesLenUniform = uniforms.addUniform('LetterLinesLength', 'float', numLetterLines);

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
    fragmentShader.addFunction('getLetterOpacity', `
      float getLetterOpacity(int letter, vec2 coord) {
        // Short-cut for whitespace characters
        if (letter == 9 || letter == 32)
          return 1.;
        float dist = 1.;
        float begin = float(letter * ${MAX_LINES_PER_LETTER});
        for (float i = 0.; i < ${MAX_LINES_PER_LETTER}.; i += 1.) {
          vec4 line = texture2D(${linesUniform}, vec2((i + begin + .5) / ${linesLenUniform}, .5));
          dist = min(dist, pointToLineDist(coord, line.xy - .5, line.zw - .5));
        }
        // Opacity is only the distance to the letter atm. Therefore we
        // do some mathematic magic to get to a more sensible opacity
        // value
        float tooFar = .1;
        float opacity = min(dist, tooFar * .99);
        opacity = 1. / ((opacity - tooFar) * 100.) + 1.1;
        return max(min(opacity, 1.), 0.);
      }
    `);
    const easeFunc = Ease.setupShaderEasing(instance, uniforms);
    fragmentShader.mainBody += `
      int letter = colorToLetter(rgb);
      float ease = ${easeFunc};
      rgb.rgb *= mix(1., getLetterOpacity(letter, point_coord), ease);
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
