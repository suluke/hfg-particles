import parseColor from 'parse-color'; // used by BgColorPicker
import Config from '../config';
import Timeline from './timeline';
import Control from './control';
import PresetSelect from './menu-preset-select';
import { parseHtml } from './util';

import EffectConfig from '../effects/effect-config';
import { effectList as effects } from '../effects/index';

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
      .rgba.map((val, i) => (i === 3 ? val : val / 255));
  }

  applyConfig(config) {
    const [r, g, b, a] = config.backgroundColor.map((val, i) => (i === 3 ? val : val * 255));
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
 * This is an invisible menu item with the purpose of storing the default
 * image scaling parameters selected by the user
 */
class DefaultImageControl extends Control {
  constructor(menu) {
    super(menu);
    this.defaultImageScaling = 'crop-to-viewport';
    this.defaultImageCropping = {x: 'crop-both', y: 'crop-both'};
  }

  updateConfig(config) {
    // eslint-disable-next-line no-param-reassign
    config.defaultImageScaling = this.defaultImageScaling;
    // eslint-disable-next-line no-param-reassign
    config.defaultImageCropping = this.defaultImageCropping;
  }

  applyConfig(config) {
    this.defaultImageScaling = config.defaultImageScaling || 'crop-to-viewport';
    this.defaultImageCropping = config.defaultImageCropping || {x: 'crop-both', y: 'crop-both'};
  }
}

/**
 *
 */
class ParticleSizeControl extends Control {
  constructor(menu) {
    super(menu);
    this.elm = document.getElementById('menu-particle-size-control');
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
class ParticleShapeControl extends Control {
  constructor(menu) {
    super(menu);
    this.elm = document.getElementById('menu-particle-shape-control');
    this.select = this.elm.querySelector('select');

    this.select.addEventListener('change', () => {
      this.menu.notifyChange();
    });
  }

  updateConfig(config) {
    // eslint-disable-next-line no-param-reassign
    config.particleShape = this.select.value || 'circle';
  }

  applyConfig(config) {
    this.select.value = config.particleShape;
  }
}

/**
 *
 */
class ParticleEdgeFadeControl extends Control {
  constructor(menu) {
    super(menu);
    this.elm = document.getElementById('menu-particle-edge-fade-control');
    this.select = this.elm.querySelector('select');

    this.select.addEventListener('change', () => {
      this.menu.notifyChange();
    });
  }

  updateConfig(config) {
    // eslint-disable-next-line no-param-reassign
    config.particleFading = this.select.value;
  }

  applyConfig(config) {
    this.select.value = config.particleFading || 'fade out';
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
        schemaVersion: Config.export_schema_version
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
          console.error('Error reading user json file');
          console.error(e);

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
  BgColorPicker, ParticleCountControl, DefaultImageControl,
  ParticleSizeControl, ParticleShapeControl, ParticleEdgeFadeControl, ParticleOverlapControl,
  PresetSelect,
  ExportAppstateButton, ImportAppstateButton, ResetAppstateButton
];

class EffectListItem {
  constructor(effect, timeline) {
    this.effect = effect;
    this.timeline = timeline;
    this.element = parseHtml(`
      <li title="${effect.getDescription()}">${effect.getDisplayName()}</li>
    `);
    this.dragCopy = parseHtml(`
      <div class="effect-list-item drag-drop-copy">${effect.getDisplayName()}</div>
    `);
    
    const dragCopy = this.dragCopy;
    const showDragCopy = (x, y) => {
      document.getElementById('modal-container').appendChild(dragCopy);
      dragCopy.style.width = `${this.element.offsetWidth}px`;
      dragCopy.style.height = `${this.element.offsetHeight}px`;
      dragCopy.style.left = `${x - (this.element.offsetWidth / 2)}px`;
      dragCopy.style.top = `${y - (this.element.offsetHeight / 2)}px`;
    };
    const updateDragCopy = (x, y) => {
      dragCopy.style.left = `${x - (this.element.offsetWidth / 2)}px`;
      dragCopy.style.top = `${y - (this.element.offsetHeight / 2)}px`;
    };
    const hideDragCopy = () => {
      if (dragCopy.parentNode) {
        dragCopy.parentNode.removeChild(dragCopy);
      }
    };

    this.element.addEventListener('mousedown', (evt) => {
      showDragCopy(evt.clientX, evt.clientY);
      const onDrag = (evt) => updateDragCopy(evt.clientX, evt.clientY);
      const onDragend = (evt) => {
        document.documentElement.removeEventListener('mouseup', onDragend);
        document.documentElement.removeEventListener('mousemove', onDrag);
        hideDragCopy();
        this.timeline.dropNewEffect(
          this.effect, evt.clientX, evt.clientY, this.element.offsetWidth,
          this.element.offsetHeight
        );
      };
      document.documentElement.addEventListener('mouseup', onDragend);
      document.documentElement.addEventListener('mousemove', onDrag);
    });

    /**
     * Now for touch
     */
    const touchDragging = (evt) => {
      showDragCopy(evt.touches[0].clientX, evt.touches[0].clientY);
      const onDrag = (evt) => {
        if (evt.touches) {
          updateDragCopy(evt.touches[0].clientX, evt.touches[0].clientY);
        } else {
          updateDragCopy(evt.clientX, evt.clientY);
        }
      };
      const onDragend = (evt) => {
        document.documentElement.removeEventListener('touchend', onDragend);
        document.documentElement.removeEventListener('touchmove', onDrag);
        hideDragCopy();
        this.timeline.dropNewEffect(
          this.effect, evt.changedTouches[0].clientX, evt.changedTouches[0].clientY,
          this.element.offsetWidth, this.element.offsetHeight
        );
      };
      document.documentElement.addEventListener('touchend', onDragend);
      document.documentElement.addEventListener('touchmove', onDrag);
    };
    this.element.addEventListener('touchstart', (evt) => {
      touchDragging(evt);
    }, { passive: false });
    // Weird chrome behavior:
    // http://wilsonpage.co.uk/touch-events-in-chrome-android/
    // TODO this breaks scrolling - which is why I removed the timeout
    // (long press to drag) logic
    const preventCancel = (evt) => {
      if (evt.path[0] === this.element) {
        evt.preventDefault();
      }
    };
    document.documentElement.addEventListener('touchmove', preventCancel, { passive: false });
  }
  getElement() {
    return this.element;
  }
}

class EffectList {
  constructor(menu) {
    this.elm = menu.menu.querySelector('.menu-effects');
    this.effectList = this.elm.querySelector('ul.menu-effect-list');
    this.filterInput = this.elm.querySelector('input.menu-effects-filter');
    const effectListElms = document.createDocumentFragment();
    for (let i = 0; i < effects.length; i++) {
      const elm = new EffectListItem(effects[i], menu.timeline).getElement();
      effectListElms.appendChild(elm);
    }
    this.effectList.appendChild(effectListElms);
    const effectListItems = this.effectList.querySelectorAll('li');
    const applyFilter = () => {
      const filters = this.filterInput.value.toLowerCase().split(' ');
      console.log(filters);
      for (let i = 0; i < effects.length; i++) {
        const effect = effects[i];
        const name = effect.getDisplayName().toLowerCase();
        const desc = effect.getDescription().toLowerCase();
        let match = true;
        for (let j = 0; j < filters.length; j++) {
          const filter = filters[j];
          if (filter.length === 0)
            continue;
          const inName = name.indexOf(filter) >= 0;
          const inDesc = desc.indexOf(filter) >= 0;
          if (!inName && !inDesc) {
            match = false;
            break;
          }
        }
        const li = effectListItems[i];
        if (!match) {
          li.style.display = 'none';
        } else {
          li.style.display = '';
        }
      }
    };
    this.filterInput.addEventListener('input', applyFilter);
    this.filterInput.addEventListener('change', applyFilter);
    applyFilter();
  }
}

export default class MainMenu {
  constructor(clock) {
    this.menu = document.getElementById('menu-container');
    this.clock = clock;
    this.controls = [];
    this.changeListeners = [];
    this.defaultConfig = null; // defaults will be read later
    this.submittedConfig = null;

    this.menuContent = this.menu.querySelector('.menu-content');
    this.toggle = document.getElementById('toggle-menu-visible');
    this.applyBtn = document.getElementById('menu-btn-apply');

    this.timeline = new Timeline(this);
    this.effectList = new EffectList(this); // requires timeline

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
      if (this.submittedConfig.duration > 0)
        this.clock.setPaused(false);
    });

    for (let i = 0; i < ControlsList.length; i++) {
      this.addControl(ControlsList[i]);
    }

    this.defaultConfig = this.readConfig();

    // now populate the initial config (NOT defaultConfig) with some effects
    const effectLen = 2500;
    const tracks = [];
    for (let i = 0; i < effects.length; i++) {
      tracks.push([
        new EffectConfig(
          effects[i].getId(),
          i * effectLen,
          i * effectLen + effectLen,
          1,
          effects[i].getDefaultConfig()
        )
      ]);
    }
    this.timeline.loadTimeline(tracks);

    this.submittedConfig = this.readConfig();
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
    config.duration = this.timeline.getTotalDuration();

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

  isVisible() {
    return this.toggle.checked;
  }
}
