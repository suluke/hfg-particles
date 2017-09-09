import { parseHtml } from './util';

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
          <fieldset>
            <legend>Image scaling</legend>
            <label>
              Image scaling:
              <select class="${classPrefix}-scaling-select">
                <option value="crop-to-viewport" title="Image might be cropped to fit the viewport" selected>crop to fit viewport</option>
                <option value="fit-image" title="Black borders might be visible">fit image</option>
                <option value="fit-width" title="Black borders might be visible at the top and bottom">fit width</option>
                <option value="fit-height" title="Black borders might be visible at the left or right edges">fit height</option>
                <option value="scale-to-viewport" title="The image's aspect ratio might be skewed">scale to fit viewport</option>
              </select>
            </label><br/>
            <label>
              Horizontal image cropping:
              <select class="${classPrefix}-crop-x-select">
                <option value="crop-both" title="Drop exceeding pixels on either side" selected>both sides</option>
                <option value="crop-left" title="Drop exceeding pixels on the leftern side">leftern side</option>
                <option value="crop-right" title="Drop exceeding pixels on the rightern side">rightern side</option>
              </select>
            </label><br/>
            <label>
              Vertical image cropping:
              <select class="${classPrefix}-crop-y-select">
                <option value="crop-both" title="Drop exceeding pixels on either edge" selected>both edges</option>
                <option value="crop-top" title="Drop exceeding pixels at the top">top edge</option>
                <option value="crop-bottom" title="Drop exceeding pixels at the bottom">bottom edge</option>
              </select>
            </label>
          </fieldset>
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
