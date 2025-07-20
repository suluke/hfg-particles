/**
 * Base class of all controls participating in the main menu
 * This is rather for documenting the common interface than
 * offering concrete functionality for reuse.
 */
export default class Control {
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
