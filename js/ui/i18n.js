import Control from './control';

import de_DE from './locales/de_DE.json';
import en_US from './locales/en_US.json';

const DefaultLocale = 'en_US';
const AvailableLocales = { de_DE, en_US };
const DomAttrName = 'data-hfg-i18n-id';

function translate(key, locale, domNode) {
  const parts = key.split('.');
  let text = locale;
  while (parts.length > 0) {
    const part = parts.shift();
    if (!text[part]) {
      console.warn(`Could not lookup key '${key}' on locale ${locale['_metadata_'].id}`);
      text = null;
      break;
    }
    text = text[part];
  }
  if (text !== null) {
    domNode.textContent = text;
  }
}

export default class LocalizationManager {
  constructor() {
    this.managedDomElements = {};
    this.localeKey = DefaultLocale;
  }

  setLocale(localeKey) {
    if (!AvailableLocales[localeKey]) {
      console.warn(`Locale not available: ${localeKey}`);
      return;
    }
    this.localeKey = localeKey;
    this.render();
  }
  getLocale() {
    return this.localeKey;
  }

  initialize() {
    this.manageStaticDOMElements();
    this.render();
  }

  render() {
    const keys = Object.keys(this.managedDomElements);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const elms = this.managedDomElements[key];
      for (let j = 0; j < elms.length; j++) {
        const elm = elms[j];
        translate(key, AvailableLocales[this.localeKey], elm);
      }
    }
  }

  manageStaticDOMElements() {
    const elms = document.querySelectorAll(`[${DomAttrName}]`);
    for (let i = 0; i < elms.length; i++) {
      const elm = elms[i];
      const key = elm.getAttribute(DomAttrName);
      if (!this.managedDomElements[key]) {
        this.managedDomElements[key] = [];
      }
      const elmsWithKey = this.managedDomElements[key];
      elmsWithKey.push(elm);
    }
  }

  static getAvailableLocales() {
    return AvailableLocales;
  }
}

export class LocalePicker extends Control {
  constructor(menu) {
    this.menu = menu;
    this.element = document.getElementById('menu-locale-control');
    this.select = this.element.querySelector('select');

    this.localizationManager = new LocalizationManager();

    const locales = LocalizationManager.getAvailableLocales();
    const localeKeys = Object.keys(locales);
    const opts = document.createDocumentFragment();
    for (let i = 0; i < localeKeys.length; i++) {
      const key = localeKeys[i];
      const locale = locales[key];
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = locale._metadata_.name;
      if (this.localizationManager.getLocale() === key) {
        opt.selected = true;
      }
      opts.appendChild(opt);
    }
    this.select.appendChild(opts);
    this.select.addEventListener('change', () => {
      this.localizationManager.setLocale(this.select.value);
    });

    this.localizationManager.initialize();
  }

  updateConfig(config) {
    // eslint-disable-next-line no-param-reassign
    config.locale = this.localizationManager.getLocale();
  }

  applyConfig(config) {
    if (config.locale) {
      this.localizationManager.setLocale(config.locale);
      const opt = this.select.querySelector(`[value="${config.locale}"]`);
      opt.selected = true;
    }
  }
}
