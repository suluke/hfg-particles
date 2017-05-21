import { parseHtml } from './util';

export default class EffectConfigDialog {
  constructor() {
    const okBtnClass = 'effect-config-dialog-ok';
    const cancelBtnClass = 'effect-config-dialog-cancel';
    const deleteBtnClass = 'effect-config-dialog-delete';
    const startTimeInputClass = 'effect-config-dialog-starttime';
    const endTimeInputClass = 'effect-config-dialog-endtime';
    this.parentNode = document.getElementById('modal-container');
    this.element = parseHtml(`
      <div class="effect-config-dialog-backdrop">
        <div class="effect-config-dialog">
          Begin: <input type="number" class="${startTimeInputClass}"/><br/>
          End: <input type="number" class="${endTimeInputClass}"/><br/>
          <button type="button" class="${okBtnClass}">Ok</button>
          <button type="button" class="${cancelBtnClass}">Cancel</button>
          <button type="button" class="${deleteBtnClass}">Delete effect</button>
        </div>
      </div>
    `);
    this.okBtn = this.element.querySelector(`.${okBtnClass}`);
    this.cancelBtn = this.element.querySelector(`.${cancelBtnClass}`);
    this.deleteBtn = this.element.querySelector(`.${deleteBtnClass}`);
    this.dialog = this.element.querySelector('.effect-config-dialog');

    this.startTimeInput = this.element.querySelector(`.${startTimeInputClass}`);
    this.endTimeInput = this.element.querySelector(`.${endTimeInputClass}`);

    this.okBtn.addEventListener('click', (evt) => {
      evt.stopPropagation();
      this.hide();
      this.resolve({
        config:    this.ui.getConfig(),
        timeBegin: parseInt(this.startTimeInput.value, 10),
        timeEnd:   parseInt(this.endTimeInput.value, 10),
      });
    });
    this.cancelBtn.addEventListener('click', (evt) => {
      evt.stopPropagation();
      this.hide();
      this.reject(false);
    });
    this.deleteBtn.addEventListener('click', (evt) => {
      evt.stopPropagation();
      this.hide();
      this.reject(true);
    });
  }

  show() {
    this.parentNode.appendChild(this.element);
  }
  hide() {
    this.dialog.removeChild(this.ui.getElement());
    this.parentNode.removeChild(this.element);
  }
  promptUser(entry) {
    return new Promise((res, rej) => {
      this.resolve = res;
      this.reject = rej;
      const ui = entry.effect.getConfigUI();
      this.startTimeInput.value = entry.timeBegin;
      this.endTimeInput.value = entry.timeEnd;
      this.ui = ui;
      this.dialog.prepend(ui.getElement());
      this.show();
    });
  }
}
