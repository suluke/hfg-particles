import parseColor from 'parse-color'; // used by BgColorPicker

class Control {
  constructor(menu) {
    this.menu = menu;
  }
  // eslint-disable-next-line class-methods-use-this
  updateState(/* state */) {
    throw new Error('Method not implemented');
  }
}

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
}

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
}

class RenderModeControl extends Control {
  constructor(menu) {
    super(menu);
    this.elm = document.getElementById('menu-render-mode-control');
    this.select = this.elm.querySelector('select');

    this.select.addEventListener('change', () => {
      this.menu.notifyStateChange();
    });
  }

  updateState(state) {
    // eslint-disable-next-line no-param-reassign
    state.renderMode = this.select.value;
  }
}

const ControlsList = [BgColorPicker, ParticleScalingControl, RenderModeControl];

export default class MainMenu {
  constructor() {
    this.menu = document.getElementById('menu-container');
    this.menuContent = this.menu.querySelector('.menu-content');
    this.toggle = document.getElementById('toggle-menu-visible');
    this.applyBtn = document.getElementById('menu-btn-apply');
    this.controls = [];
    this.changeListeners = [];

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
      this.applyBtn.disabled = true;
      // Apply closes menu if covering full width
      if (this.isCoverFullWidth()) {
        toggle.checked = false;
      }
      const state = {};
      for (let i = 0; i < this.controls.length; i++) {
        this.controls[i].updateState(state);
      }
      for (let i = 0; i < this.changeListeners.length; i++) {
        this.changeListeners[i](state);
      }
    });

    for (let i = 0; i < ControlsList.length; i++) {
      this.addControl(ControlsList[i]);
    }
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
