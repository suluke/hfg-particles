import parseColor from 'parse-color'; // used by BgColorPicker
import config from './config';

/**
 * Base class of all controls participating in the main menu
 * This is rather for documenting the common interface than
 * offering concrete functionality for reuse.
 */
class Control {
  constructor(menu) {
    this.menu = menu;
  }
  // eslint-disable-next-line class-methods-use-this
  updateState(/* state */) {
    throw new Error('Method not implemented');
  }
  // eslint-disable-next-line class-methods-use-this
  applyState(/* state */) {
    throw new Error('Method not implemented');
  }
}

/**
 *
 */
class BgColorPicker extends Control {
  constructor(menu) {
    super(menu);
    this.elm = document.getElementById('menu-bg-color-control');
    this.input = this.elm.querySelector('input[type="color"]');

    this.input.addEventListener('change', () => {
      this.menu.notifyStateChange();
    });
  }

  updateState(state) {
    // eslint-disable-next-line no-param-reassign
    state.backgroundColor = parseColor(this.input.value)
      .rgba.map((val, i) => (i === 3 ? val : val / 256));
  }

  applyState(state) {
    const [r, g, b, a] = state.backgroundColor.map((val, i) => (i === 3 ? val : val * 256));
    this.input.value = parseColor(`rgba(${r}, ${g}, ${b}, ${a})`).hex;
  }
}

/**
 *
 */
class ParticleScalingControl extends Control {
  constructor(menu) {
    super(menu);
    this.elm = document.getElementById('menu-particle-scaling-control');
    this.input = this.elm.querySelector('input[type="number"]');

    this.input.addEventListener('change', () => {
      this.menu.notifyStateChange();
    });
  }

  updateState(state) {
    // eslint-disable-next-line no-param-reassign
    state.particleScaling = parseInt(this.input.value, 10) / 100;
  }

  applyState(state) {
    this.input.value = state.particleScaling * 100;
  }
}

/**
 *
 */
class ParticleOverlapControl extends Control {
  constructor(menu) {
    super(menu);
    this.elm = document.getElementById('menu-particle-overlap-control');
    this.select = this.elm.querySelector('select');

    this.select.addEventListener('change', () => {
      this.menu.notifyStateChange();
    });
  }

  updateState(state) {
    // eslint-disable-next-line no-param-reassign
    state.particleOverlap = this.select.value;
  }

  applyState(state) {
    this.select.value = state.particleOverlap;
  }
}

class HueDisplaceDistanceControl extends Control {
  constructor(menu) {
    super(menu);
    this.elm = document.getElementById('menu-hue-displace-distance');
    this.input = this.elm.querySelector('input');

    this.input.addEventListener('change', () => {
      this.menu.notifyStateChange();
    });
  }

  updateState(state) {
    state.hueDisplaceDistance = parseInt(this.input.value) / 100;
  }

  applyState(state) {
    this.input.value = state.hueDisplaceDistance * 100;
  }
}

class HueDisplacePeriodControl extends Control {
  constructor(menu) {
    super(menu);
    this.elm = document.getElementById('menu-hue-displace-period');
    this.input = this.elm.querySelector('input');

    this.input.addEventListener('change', () => {
      this.menu.notifyStateChange();
    });
  }

  updateState(state) {
    state.hueDisplacePeriod = parseInt(this.input.value) / 1000;
  }

  applyState(state) {
    this.input.value = state.hueDisplacePeriod * 1000;
  }
}

class HueDisplaceScaleByValueControl extends Control {
  constructor(menu) {
    super(menu);
    this.elm = document.getElementById('menu-hue-displace-scale-by-value');
    this.input = this.elm.querySelector('input');

    this.input.addEventListener('change', () => {
      this.menu.notifyStateChange();
    });
  }

  updateState(state) {
    state.hueDisplaceScaleByValue = parseInt(this.input.value) / 100;
  }

  applyState(state) {
    this.input.value = state.hueDisplaceScaleByValue * 100;
  }
}

class HueDisplaceRandomDirectionOffsetControl extends Control {
  constructor(menu) {
    super(menu);
    this.elm = document.getElementById('menu-hue-displace-random-direction-offset');
    this.input = this.elm.querySelector('input');

    this.input.addEventListener('change', () => {
      this.menu.notifyStateChange();
    });
  }

  updateState(state) {
    state.hueDisplaceRandomDirectionOffset = this.input.checked;
  }

  applyState(state) {
    this.input.checked = state.hueDisplaceRandomDirectionOffset;
  }
}

class HueDisplaceRotateControl extends Control {
  constructor(menu) {
    super(menu);
    this.elm = document.getElementById('menu-hue-displace-rotate');
    this.input = this.elm.querySelector('input');

    this.input.addEventListener('change', () => {
      this.menu.notifyStateChange();
    });
  }

  updateState(state) {
    state.hueDisplaceRotate = parseInt(this.input.value) / 100;
  }

  applyState(state) {
    this.input.value = state.hueDisplaceRotate * 100;
  }
}

class AttractEnableControl extends Control {
  constructor(menu) {
    super(menu);
    this.elm = document.getElementById('menu-attract-enable');
    this.input = this.elm.querySelector('input');

    this.input.addEventListener('change', () => {
      this.menu.notifyStateChange();
    });
  }

  updateState(state) {
    state.attractEnable = this.input.checked;
  }

  applyState(state) {
    this.input.checked = state.attractEnable;
  }
}

class AttractOffsetModeControl extends Control {
  constructor(menu) {
    super(menu);
    this.elm = document.getElementById('menu-attract-offset-mode');
    this.select = this.elm.querySelector('select');

    this.select.addEventListener('change', () => {
      this.menu.notifyStateChange();
    });
  }

  updateState(state) {
    state.attractOffsetMode = this.select.value;
  }

  applyState(state) {
    this.select.value = state.attractOffsetMode;
  }
}

class AttractOffsetStrengthControl extends Control {
  constructor(menu) {
    super(menu);
    this.elm = document.getElementById('menu-attract-offset-strength');
    this.input = this.elm.querySelector('input');

    this.input.addEventListener('change', () => {
      this.menu.notifyStateChange();
    });
  }

  updateState(state) {
    state.attractOffsetStrength = this.input.value;
  }

  applyState(state) {
    this.input.checked = state.attractOffsetStrength;
  }
}

class AttractTimeControl extends Control {
  constructor(menu) {
    super(menu);
    this.elm = document.getElementById('menu-attract-time');
    this.input = this.elm.querySelector('input');

    this.input.addEventListener('change', () => {
      this.menu.notifyStateChange();
    });
  }

  updateState(state) {
    state.attractTime = this.input.value / 1000;
  }

  applyState(state) {
    this.input.checked = state.attractTime * 1000;
  }
}

class AttractTargetControl extends Control {
  constructor(menu) {
    super(menu);
    this.elm = document.getElementById('menu-attract-target');
    this.select = this.elm.querySelector('select');

    this.select.addEventListener('change', () => {
      this.menu.notifyStateChange();
    });
  }

  updateState(state) {
    state.attractTarget = this.select.value;
  }

  applyState(state) {
    this.select.value = state.attractTarget;
  }
}

/**
 *
 */
class ExportAppstateButton extends Control {
  constructor(menu) {
    super(menu);
    this.elm = document.getElementById('menu-btn-exportstate');
    this.elm.addEventListener('click', () => {
      const toExport = Object.assign({
        schemaVersion: config.export_schema_version
      }, this.menu.submittedState);
      ExportAppstateButton.saveJson('particles.json', JSON.stringify(toExport, null, 2));
    });
  }
  static saveJson(filename, data) {
    const blob = new Blob([data], { type: 'application/json' });
    if (navigator.msSaveOrOpenBlob) {
      navigator.msSaveBlob(blob, filename);
    } else {
      const elm = document.createElement('a');
      elm.href = URL.createObjectURL(blob);
      elm.download = filename;
      document.body.appendChild(elm);
      elm.click();
      document.body.removeChild(elm);
    }
  }
  // eslint-disable-next-line class-methods-use-this
  updateState(/* state */) {}
  // eslint-disable-next-line class-methods-use-this
  applyState(/* state */) {}
}

/**
 *
 */
class ImportAppstateButton extends Control {
  constructor(menu) {
    super(menu);
    this.FR = new FileReader();
    this.elm = document.getElementById('menu-btn-importstate');
    this.input = this.elm.querySelector('input[type="file"]');
    this.input.addEventListener('change', (evt) => {
      let file = null;
      if (evt.target.files.length > 0) {
        file = evt.target.files[0];
      } else {
        return;
      }
      this.FR.onload = () => {
        const text = this.FR.result;
        let json = null;
        try {
          json = JSON.parse(text);
        } catch (e) {
          // TODO correct error handling
          console.log('Error reading user json file');
          console.log(e);

          return;
        }
        this.menu.applyState(json);
        this.menu.submit();
        this.input.value = null;
      };
      this.FR.readAsText(file);
    });
  }
  // eslint-disable-next-line class-methods-use-this
  updateState(/* state */) {}
  // eslint-disable-next-line class-methods-use-this
  applyState(/* state */) {}
}

/**
 *
 */
class ResetAppstateButton extends Control {
  constructor(menu) {
    super(menu);
    this.elm = document.getElementById('menu-btn-resetstate');
    this.elm.addEventListener('click', () => {
      this.menu.applyState(this.menu.defaultState);
      this.menu.submit();
    });
  }
  // eslint-disable-next-line class-methods-use-this
  updateState(/* state */) {}
  // eslint-disable-next-line class-methods-use-this
  applyState(/* state */) {}
}

const ControlsList = [
  BgColorPicker, ParticleScalingControl, ParticleOverlapControl,
  HueDisplaceDistanceControl, HueDisplacePeriodControl, HueDisplaceScaleByValueControl, HueDisplaceRandomDirectionOffsetControl, HueDisplaceRotateControl,
  AttractEnableControl, AttractOffsetModeControl, AttractOffsetStrengthControl, AttractTimeControl, AttractTargetControl,
  ExportAppstateButton, ImportAppstateButton, ResetAppstateButton
];

export default class MainMenu {
  constructor() {
    this.menu = document.getElementById('menu-container');
    this.menuContent = this.menu.querySelector('.menu-content');
    this.toggle = document.getElementById('toggle-menu-visible');
    this.applyBtn = document.getElementById('menu-btn-apply');
    this.controls = [];
    this.changeListeners = [];
    this.submittedState = null; // defaults will be read later

    const menu = this.menu;
    const toggle = this.toggle;
    const applyBtn = this.applyBtn;

    // Close menu if clicked outside
    document.addEventListener('click', (evt) => {
      if (!menu.contains(evt.target)) {
        toggle.checked = false;
      }
    });
    applyBtn.addEventListener('click', () => {
      // Apply closes menu if covering full width
      if (this.isCoverFullWidth()) {
        this.toggle.checked = false;
      }
      this.submit();
    });

    for (let i = 0; i < ControlsList.length; i++) {
      this.addControl(ControlsList[i]);
    }

    this.defaultState = this.readState();
    this.submittedState = this.defaultState;
  }

  applyState(state) {
    for (let i = 0; i < this.controls.length; i++) {
      this.controls[i].applyState(state);
    }
  }

  readState() {
    const state = {};
    for (let i = 0; i < this.controls.length; i++) {
      this.controls[i].updateState(state);
    }

    return state;
  }

  submit() {
    this.applyBtn.disabled = true;
    const state = this.readState();
    for (let i = 0; i < this.changeListeners.length; i++) {
      this.changeListeners[i](state);
    }
    this.submittedState = state;
  }

  addControl(CtrlClass) {
    const ctrl = new CtrlClass(this);
    this.controls.push(ctrl);
  }
  addChangeListener(listener) {
    this.changeListeners.push(listener);
  }

  isCoverFullWidth() {
    let menuWidth = document.defaultView.getComputedStyle(this.menuContent).width;
    // Remove "px"
    menuWidth = menuWidth.substring(0, menuWidth.length);

    return parseInt(menuWidth, 10) === window.innerWidth;
  }

  notifyStateChange() {
    this.applyBtn.disabled = false;
  }
}
