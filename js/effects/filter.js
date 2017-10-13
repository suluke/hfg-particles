import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';
import * as filters from 'filterous/lib/filters';
import * as instaFilters from 'filterous/lib/instaFilters';

const EffectName = 'Image Filter';
const EffectDescription = 'Apply one of several available image filters on the image';

const importsFilter = (name) => { return name !== 'default' && name.charAt(0) !== '_' };
const filterNames = Object.keys(filters).filter(importsFilter);
const instaFilterNames = Object.keys(instaFilters).filter(importsFilter);

class FilterConfigUI extends ConfigUI {
  constructor() {
    super();
    const classPrefix = 'effect-filter';
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
        <select>

        </select>
      </fieldset>
    `);
    const options = document.createDocumentFragment();
    const placeholder = document.createElement('option');
    placeholder.innerHTML = '--- Select filter ---';
    placeholder.disabled = true;
    placeholder.selected = true;
    options.appendChild(placeholder);
    for (let i = 0; i < filterNames.length; i++) {
      const opt = document.createElement('option');
      opt.innerHTML = filterNames[i];
      opt.value = filterNames[i];
      options.appendChild(opt);
    }
    const instaDivider = document.createElement('option');
    instaDivider.innerHTML = '---';
    instaDivider.disabled = true;
    options.appendChild(instaDivider);
    for (let i = 0; i < instaFilterNames.length; i++) {
      const opt = document.createElement('option');
      opt.innerHTML = instaFilterNames[i];
      opt.value = instaFilterNames[i];
      options.appendChild(opt);
    }
    const ui = this.element;
    this.filterSelect = ui.querySelector('select');
    this.filterSelect.appendChild(options);
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    return {
      filter: this.filterSelect.value
    };
  }

  applyConfig(config) {
    this.filterSelect.value = config.filter || '';
  }
}

function getFilter(name) {
  if (filterNames.indexOf(name) >= 0) {
    return filters[name];
  } else if (instaFilterNames.indexOf(name) >= 0) {
    return instaFilters[name];
  } else {
    throw new Error(`Unknown filter: ${name}`);
  }
}

export default class FilterEffect extends Effect {
  static register(instance, props, uniforms, vertexShader) {
    const filter = getFilter(instance.config.filter);
    props.state.addColorFilter((pixels) => {
      let result = { data: pixels };
      const time = props.clock.getTime();
      if (instance.timeBegin <= time && time <= instance.timeEnd) {
        result = filter(result, 1);
      }
      return result.data;
    });
  }

  static getDisplayName() {
    return EffectName;
  }

  static getDescription() {
    return EffectDescription;
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new FilterConfigUI();
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
