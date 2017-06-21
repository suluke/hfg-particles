import { parseHtml } from './util';

export default class EffectConfigDialog {
  constructor() {
    const okBtnClass = 'effect-config-dialog-ok';
    const cancelBtnClass = 'effect-config-dialog-cancel';
    const deleteBtnClass = 'effect-config-dialog-delete';
    const startTimeInputClass = 'effect-config-dialog-starttime';
    const endTimeInputClass = 'effect-config-dialog-endtime';
    const repetitionsInputClass = 'effect-config-dialog-repetitions';
    this.parentNode = document.getElementById('modal-container');
    this.element = parseHtml(`
      <div class="effect-config-dialog-backdrop">
        <div class="effect-config-dialog">
          <label>
            Begin: <input type="number" min="0" step="1" class="${startTimeInputClass}"/>ms
          </label><br/>
          <label>
            End: <input type="number" min="0" step="1" class="${endTimeInputClass}"/>ms
          </label><br/>
          <label>
            Repetitions: <input type="number" class="${repetitionsInputClass}"/>
          </label><br/>
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
    this.repetitionsInput = this.element.querySelector(`.${repetitionsInputClass}`);

    this.okBtn.addEventListener('click', (evt) => {
      evt.stopPropagation();
      this.hide();
      this.ui.getConfigAsync()
      .then((config) => {
        this.resolve({
          config:      config,
          timeBegin:   parseInt(this.startTimeInput.value, 10),
          timeEnd:     parseInt(this.endTimeInput.value, 10),
          repetitions: parseInt(this.repetitionsInput.value, 10),
        });
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
      ui.applyConfig(entry.config);
      this.startTimeInput.value = entry.timeBegin;
      this.endTimeInput.value = entry.timeEnd;
      this.repetitionsInput.value = entry.repetitions;
      if (entry.effect.isEventOnly()) {
        this.endTimeInput.parentNode.style.display = 'none';
        this.repetitionsInput.parentNode.style.display = 'none';
      } else {
        this.endTimeInput.parentNode.style.display = 'inline';
        this.repetitionsInput.parentNode.style.display =  entry.effect.supportsRepetition() ? 'inline' : 'none';
      }
      this.ui = ui;
      this.dialog.prepend(ui.getElement());
      this.show();
    });
  }
}
