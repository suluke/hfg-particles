import { parseHtml, imageScalingMarkup } from './util';

export default class LoadImgDialog {
  constructor() {
    const classPrefix = 'load-default-img';
    const loadBtnClass = `btn-${classPrefix}-load`;
    const cancelLoadBtnClass = `btn-${classPrefix}-cancel`;

    // Object properties
    this.parentNode = document.getElementById('modal-container');
    this.resolve = null;
    this.reject = null;
    this.elm = parseHtml(`
      <div class="${classPrefix}-backdrop">
        <div class="${classPrefix}-popup">
          ${imageScalingMarkup(classPrefix)}
          <button type="button" class="${loadBtnClass}">Load</button>
          <button type="button" class="${cancelLoadBtnClass}">Cancel</button>
        </div>
      </div>
    `);

    this.scalingSelect = this.elm.querySelector(`select.${classPrefix}-scaling-select`);
    this.cropXSelect = this.elm.querySelector(`select.${classPrefix}-crop-x-select`);
    this.cropYSelect = this.elm.querySelector(`select.${classPrefix}-crop-y-select`);

    const loadBtn = this.elm.querySelector(`.${loadBtnClass}`);
    loadBtn.addEventListener('click', () => {
      this.hide();
      this.resolve({
        imageScaling: this.scalingSelect.value,
        imageCropping: {
          x: this.cropXSelect.value,
          y: this.cropYSelect.value
        }
      });
    });
    const cancelBtn = this.elm.querySelector(`.${cancelLoadBtnClass}`);
    cancelBtn.addEventListener('click', () => {
      this.hide();
      this.reject();
    });
  }
  load(img) {
    return new Promise((res, rej) => {
      this.resolve = res;
      this.reject = rej;

      this.parentNode.appendChild(this.elm);
    });
  }
  hide() {
    this.parentNode.removeChild(this.elm);
  }
}
