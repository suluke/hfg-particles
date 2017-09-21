import { Control } from './menu';
import { listedPresets } from '../presets/index';

export default class MenuPresetSelectControl {
  constructor(menu) {
    this.menu = menu;
    this.elm = document.querySelector('.menu-select-preset-control');
    const select = this.elm.querySelector('select');
    let IDs = Object.keys(listedPresets);
    const options = document.createDocumentFragment();
    for (let i = 0; i < IDs.length; i++) {
      const preset = listedPresets[IDs[i]];
      const option = document.createElement('option');
      option.value = preset.id;
      option.innerHTML = preset.name;
      options.appendChild(option);
    }
    select.appendChild(options);
    select.addEventListener('change', (e) => {
      menu.applyConfig(listedPresets[select.value].config);
      menu.notifyChange();
    });
    menu.addChangeListener(() => {
      select.value = '';
    });
  }
  // eslint-disable-next-line class-methods-use-this
  updateConfig(config) {
  }
  // eslint-disable-next-line class-methods-use-this
  applyConfig(config) {
  }
}