import { parseHtml } from '../ui/util';
import { fract } from './effect';

export default class Ease {
  static makeConfigMarkup(classPrefix) {
    const markup = parseHtml(`
      <div>
        <label>
          Ease in time:
          <input type="number" min="0" step="1" class="${classPrefix}-ease-in" value="1000" />
          ms
        </label><br/>
        <label>
          Ease out time:
          <input type="number" min="0" step="1" class="${classPrefix}-ease-out" value="1000" />
          ms
        </label><br/>
        <label>
          Ease function:
          <select class="${classPrefix}-ease-func" value="sine">
            <option value="sine" selected>Sine</option>
            <option value="linear">Linear</option>
            <option value="none">None</option>
          </select>
        </label>
      </div>
    `);
    const fragment = document.createDocumentFragment();
    while (markup.childNodes.length > 0) {
      fragment.appendChild(markup.firstChild)
    }
    return fragment;
  }

  static extendWithConfigInputs(configUI, classPrefix) {
    const element = configUI.getElement();
    configUI.easeInInput = element.querySelector(`input.${classPrefix}-ease-in`);
    configUI.easeOutInput = element.querySelector(`input.${classPrefix}-ease-out`);
    configUI.easeFuncInput = element.querySelector(`select.${classPrefix}-ease-func`);
    configUI.easeInInput.addEventListener('change', () => {
      configUI.notifyChange();
    });
    configUI.easeOutInput.addEventListener('change', () => {
      configUI.notifyChange();
    });
    configUI.easeFuncInput.addEventListener('change', () => {
      configUI.notifyChange();
    });
  }

  static extendConfig(configUI, config) {
    config.easeInTime = parseInt(configUI.easeInInput.value, 10);
    config.easeOutTime = parseInt(configUI.easeOutInput.value, 10);
    config.easeFunc = configUI.easeFuncInput.value;
    return config;
  }

  static applyConfig(configUI, config) {
    configUI.easeInInput.value = config.easeInTime || 1000;
    configUI.easeOutInput.value = config.easeOutTime || 1000;
    configUI.easeFuncInput.value = config.easeFunc || 'sine';
  }

  static extend(configUI, classPrefix, appendInputsSelector = null) {
    let container = configUI.getElement();
    if (appendInputsSelector !== null) {
      container = container.querySelector(appendInputsSelector);
    }
    container.appendChild(Ease.makeConfigMarkup(classPrefix));
    Ease.extendWithConfigInputs(configUI, classPrefix);
    const oldGetConfig = configUI.getConfig;
    const oldApplyConfig = configUI.applyConfig;

    configUI.getConfig = function() {
      return Ease.extendConfig(configUI, oldGetConfig.call(configUI));
    };
    configUI.applyConfig = function(config) {
      Ease.applyConfig(configUI, config);
      oldApplyConfig.call(configUI, config);
    };
  }

  static setupShaderEasing(instance, uniforms) {
    const easeInTime = Math.min(instance.config.easeInTime || 1000, instance.getPeriod() / 2);
    const easeOutTime = Math.min(instance.config.easeOutTime || 1000, instance.getPeriod() - easeInTime);
    // starts at 0, goes down to 1
    const easeInProgress = uniforms.addUniform('easeInProgress', 'float', (ctx, props) => {
      const time = fract((props.clock.getTime() - instance.timeBegin) / instance.getPeriod());
      return Math.min(1, time / (easeInTime / instance.getPeriod()));
    });
    // starts at 1, goes down to 0
    const easeOutProgress = uniforms.addUniform('easeOutProgress', 'float', (ctx, props) => {
      const time = fract((props.clock.getTime() - instance.timeBegin) / instance.getPeriod());
      return Math.min(1, (1 - time) / (easeOutTime / instance.getPeriod()));
    });
    const easeFuncs = {
      none: '1.',
      sine: `(1. - cos(PI * min(${easeInProgress}, ${easeOutProgress}))) / 2.`,
      linear: `min(${easeInProgress}, ${easeOutProgress})`
    };
    const easeFunc = easeFuncs[instance.config.easeFunc || 'sine'];
    return easeFunc;
  }
}

