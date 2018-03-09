import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';
import Ease from './ease-mixins';

const EffectName = 'Reduce Particle Count';

class ParticlesReduceConfigUI extends ConfigUI {
  constructor() {
    super();
    const classPrefix = 'effect-particles-reduce';
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
        Remaining particles amount: <input class="${classPrefix}-reduction-amount" type="number" min="0" max="100" step="1" value="100"/>%
        <br>
        Hide particles by:
        <select class="${classPrefix}-reduction-animation">
          <option selected value="fade-out" title="fade-out exceeding particles">fading out</option>
          <option value="amount" title="gradually reduce number of visible particles">reducing amount</option>
        </select>
        <br>
      </fieldset>
    `);
    const ui = this.element;
    this.reductionAmountInput = ui.querySelector(`.${classPrefix}-reduction-amount`);
    this.reductionAnimationInput = ui.querySelector(`.${classPrefix}-reduction-animation`);

    this.reductionAmountInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.reductionAnimationInput.addEventListener('change', () => {
      this.notifyChange();
    });

    Ease.extend(this, classPrefix);
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    return {
      amount: parseFloat(this.reductionAmountInput.value) / 100,
      animation: this.reductionAnimationInput.value
    };
  }

  applyConfig(config) {
    this.reductionAmountInput.value = config.amount * 100;
    this.reductionAnimationInput.value = config.animation;
  }
}

export default class ParticlesReduceEffect extends Effect {
  static register(instance, props, uniforms, vertexShader) {
    const amount = instance.config.amount;
    const animation = instance.config.animation;
    if (amount < 1) {
      // This works as follows:
      // We assume we want to render a different particle grid which is
      // coarser than the one defined by {x,y}ParticlesCount but with a
      // similar aspect ratio. Since it's cells are bigger than the cells
      // in the original particle grid when rendered onto the same area,
      // we refer to it as "super-grid"
      const px = props.config.xParticlesCount;
      const py = props.config.yParticlesCount;
      const AR =  px / py;
      let newH = Math.sqrt(amount * py * py);
      const newW = Math.round(newH * AR);
      newH = Math.round(newH);
      // Now we know the super-grid's dimensions newW and newH. We can
      // also calculate the grid's cell's dimensions relative to the old
      // grid
      const cellSize = Math.min(px / newW, Math.max(px, py)); // FIXME handle 0% better

      const easeFunc = Ease.setupShaderEasing(instance, uniforms);

      const transitionByAmount = {'amount': true, 'fade-out': false}[animation];

      vertexShader.mainBody += `
        float ease = ${easeFunc};
        float cellSize = float(${cellSize});
        ${transitionByAmount ? 'cellSize = mix(1., cellSize, ease);' : ''}
        // subcellMid is the center of the sub-cell occupied by the current
        // vertex (a.k.a. particle)
        vec2 subcellMid = initialPosition.xy * vec2(float(${px}), float(${py}));
        // subcell is the 2d coord of this vertex' sub-cell
        vec2 subcell = floor(subcellMid);
        // translate the mid into super-grid coordinates
        vec2 cellMid = subcellMid / vec2(cellSize);
        // calculate the 2d coords of the super-cell this vertex falls into
        vec2 cell = floor(cellMid);
        // top left (TL) + bottom right (BR) of the super-cell in original grid coords
        vec2 TL = (cellMid - vec2(0.5)) * vec2(cellSize); 
        vec2 BR = (cellMid + vec2(0.5)) * vec2(cellSize);
        // Now we calculate the sub-cells that contain the super-cell's TL and BR 
        vec2 subcellTL = floor(TL);
        vec2 subcellBR = floor(BR);
        vec2 centerSubcell = mix(subcellTL, subcellBR, 0.5);
        // a sub-cell dominates a super-cell iff it's the centerSubcell
        bool dominatesCell = all(equal(subcell, centerSubcell));
        if (dominatesCell) {
          // The dominating cell's position should now be set to the center
          // of the super-cell it dominates
          vec2 superMid = (cell + vec2(0.5)) * cellSize / vec2(float(${px}), float(${py}));
          vec2 offset = superMid - initialPosition.xy;
          ${transitionByAmount ? '' : 'offset = offset * vec2(ease);'}
          position.xy += offset;
        } else {
          pointSize = ${transitionByAmount ? '0.' : '1. - ease'};
          rgb = ${transitionByAmount ? 'vec3(0.)' : 'rgb * vec3(1. - ease)'};
        }
      `;
    } 
  }

  static getTranslationId() {
    return 'particles_reduce';
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new ParticlesReduceConfigUI();
    }

    return this._configUI;
  }

  static getDefaultConfig() {
    return {
      amount: 0.5,
      animation: 'fade-out'
    };
  }

  static getRandomConfig() {
    return {
      amount: Math.random(),
      animation: ['fade-out', 'amount'][Math.floor(Math.random() * 2)]
    };
  }
}
