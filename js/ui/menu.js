import parseColor from 'parse-color'; // used by BgColorPicker
import config from '../config';
import Timeline from './timeline';
import { parseHtml } from './util';

import { effectList as effects } from '../effects/index';

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
  updateConfig(/* config */) {
    throw new Error('Method not implemented');
  }
  // eslint-disable-next-line class-methods-use-this
  applyConfig(/* config */) {
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
      this.menu.notifyChange();
    });
  }

  updateConfig(config) {
    // eslint-disable-next-line no-param-reassign
    config.backgroundColor = parseColor(this.input.value)
      .rgba.map((val, i) => (i === 3 ? val : val / 256));
  }

  applyConfig(config) {
    const [r, g, b, a] = config.backgroundColor.map((val, i) => (i === 3 ? val : val * 256));
    this.input.value = parseColor(`rgba(${r}, ${g}, ${b}, ${a})`).hex;
  }
}

/**
 *
 */
class ParticleCountControl extends Control {
  constructor(menu) {
    super(menu);
    this.xInput = document.getElementById('menu-particles-x');
    this.yInput = document.getElementById('menu-particles-y');

    this.xInput.addEventListener('change', () => {
      this.menu.notifyChange();
    });
    this.yInput.addEventListener('change', () => {
      this.menu.notifyChange();
    });
  }

  updateConfig(config) {
    // eslint-disable-next-line no-param-reassign
    config.xParticlesCount = parseInt(this.xInput.value, 10);
    // eslint-disable-next-line no-param-reassign
    config.yParticlesCount = parseInt(this.yInput.value, 10);
  }

  applyConfig(config) {
    this.xInput.value = config.xParticlesCount;
    this.yInput.value = config.yParticlesCount;
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
      this.menu.notifyChange();
    });
  }

  updateConfig(config) {
    // eslint-disable-next-line no-param-reassign
    config.particleScaling = parseInt(this.input.value, 10) / 100;
  }

  applyConfig(config) {
    this.input.value = config.particleScaling * 100;
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
      this.menu.notifyChange();
    });
  }

  updateConfig(config) {
    // eslint-disable-next-line no-param-reassign
    config.particleOverlap = this.select.value;
  }

  applyConfig(config) {
    this.select.value = config.particleOverlap;
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
      }, this.menu.submittedConfig);
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
  updateConfig(/* config */) {}
  // eslint-disable-next-line class-methods-use-this
  applyConfig(/* config */) {}
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
        this.menu.applyConfig(json);
        this.menu.submit();
        this.input.value = null;
      };
      this.FR.readAsText(file);
    });
  }
  // eslint-disable-next-line class-methods-use-this
  updateConfig(/* config */) {}
  // eslint-disable-next-line class-methods-use-this
  applyConfig(/* config */) {}
}

/**
 *
 */
class ResetAppstateButton extends Control {
  constructor(menu) {
    super(menu);
    this.elm = document.getElementById('menu-btn-resetstate');
    this.elm.addEventListener('click', () => {
      this.menu.applyConfig(this.menu.defaultConfig);
      this.menu.submit();
    });
  }
  // eslint-disable-next-line class-methods-use-this
  updateConfig(/* config */) {}
  // eslint-disable-next-line class-methods-use-this
  applyConfig(/* config */) {}
}

const ControlsList = [
  BgColorPicker, ParticleCountControl, ParticleScalingControl, ParticleOverlapControl,
  ExportAppstateButton, ImportAppstateButton, ResetAppstateButton
];

export default class MainMenu {
  constructor() {
    this.menu = document.getElementById('menu-container');
    this.timeline = new Timeline(this);
    this.menuContent = this.menu.querySelector('.menu-content');
    this.effectList = this.menu.querySelector('#menu-effect-list');
    this.toggle = document.getElementById('toggle-menu-visible');
    this.applyBtn = document.getElementById('menu-btn-apply');
    this.controls = [];
    this.changeListeners = [];
    this.submittedConfig = null; // defaults will be read later

    const menu = this.menu;
    const toggle = this.toggle;
    const applyBtn = this.applyBtn;

    // Close menu if clicked outside
    document.addEventListener('click', (evt) => {
      if (!menu.contains(evt.target) &&
          !document.getElementById('modal-container').contains(evt.target)
      ) {
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

    const effectListElms = document.createDocumentFragment();
    for (let effect in effects) {
      const elm = parseHtml(`
        <li draggable="true">${effects[effect].getId()}</li>
      `);
      effectListElms.appendChild(elm);
    }
    this.effectList.appendChild(effectListElms);

    this.timeline.loadTimeline([
      [[effects[0].getId(), { timeBegin: 0, timeEnd: 10000, config: effects[0].getDefaultConfig() }]],
      [[effects[1].getId(), { timeBegin: 0, timeEnd: 10000, config: effects[1].getDefaultConfig() }]],
      []
    ]);

    this.defaultConfig = this.readConfig();
    this.submittedConfig = this.defaultConfig;
  }

  applyConfig(config) {
    for (let i = 0; i < this.controls.length; i++) {
      this.controls[i].applyConfig(config);
    }
    this.timeline.loadTimeline(config.effects);
  }

  readConfig() {
    const config = {};
    for (let i = 0; i < this.controls.length; i++) {
      this.controls[i].updateConfig(config);
    }
    config.effects = this.timeline.getEffects();

    return config;
  }

  submit() {
    this.applyBtn.disabled = true;
    const config = this.readConfig();
    for (let i = 0; i < this.changeListeners.length; i++) {
      this.changeListeners[i](config);
    }
    this.submittedConfig = config;
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

  notifyChange() {
    this.applyBtn.disabled = false;
  }
}
