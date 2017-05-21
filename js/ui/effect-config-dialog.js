import { parseHtml } from './util';

export default class EffectConfigDialog {
  constructor() {
    const parser = document.createElement('body');
    this.element = parseHtml(`
      <div class="effect-config-dialog">
        <fieldset>
          <legend class="effect-config-legend"></legend>
        </fieldset>
        <button type="button">Ok</button>
        <button type="button">Delete</button>
      </div>
    `);
    this.effectConfigContainer = this.element.querySelector('fieldset');
  }
}
