import { parseHtml } from './util';

export default class EffectConfigDialog {
  constructor() {
    const parser = document.createElement('body');
    const okBtnClass = 'effect-config-dialog-ok';
    const cancelBtnClass = 'effect-config-dialog-cancel';
    const deleteBtnClass = 'effect-config-dialog-delete';
    this.element = parseHtml(`
      <div class="effect-config-dialog-backdrop">
        <div class="effect-config-dialog">
          <fieldset>
            <legend class="effect-config-legend"></legend>
          </fieldset>
          <button type="button" class="${okBtnClass}">Ok</button>
          <button type="button" class="${cancelBtnClass}">Cancel</button>
          <button type="button" class="${deleteBtnClass}">Delete effect</button>
        </div>
      </div>
    `);
    this.effectConfigContainer = this.element.querySelector('fieldset');
    this.okBtn = this.element.querySelector(`.${okBtnClass}`);
    this.cancelBtn = this.element.querySelector(`.${cancelBtnClass}`);
    this.deleteBtn = this.element.querySelector(`.${deleteBtnClass}`);

    this.okBtn.addEventListener('click', () => {
      this.hide();
      // TODO load form data and pass to resolve callback
      this.resolve();
    });
    this.cancelBtn.addEventListener('click', () => {
      this.hide();
      this.reject(false);
    });
    this.deleteBtn.addEventListener('click', () => {
      this.hide();
      this.reject(true);
    });
  }

  show() {
    document.body.appendChild(this.element);
  }
  hide() {
    document.body.removeChild(this.element);
  }
  promptUser(entry) {
    return new Promise((res, rej) => {
      this.resolve = res;
      this.reject = rej;
      // TODO render form elements 
      this.show();
    });
  }
}
