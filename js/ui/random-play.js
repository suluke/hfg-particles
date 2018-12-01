import EffectConfig from '../effects/effect-config';
import { effectList } from '../effects/index';
import { parseHtml } from './util';

class RandomPlayConfig {
  constructor(effects) {
    this.effects = effects;
  }

  static getDefault() {
    return new RandomPlayConfig(effectList);
  }
}

class TimelineConfigDialog {
  constructor() {
    this.onSubmit = null;
    this.onCancel = null;
    const okBtnClass = 'timeline-config-dialog-ok';
    const cancelBtnClass = 'timeline-config-dialog-cancel';
    const effectListContainerClass = 'timeline-config-randomized-effects';
    this.parentNode = document.getElementById('modal-container');
    this.element = parseHtml(`
      <div class="timeline-config-dialog-backdrop">
        <div class="timeline-config-dialog">
          <div class="timeline-config-dialog-content">
            <h2>Random Play Settings</h2>
            <fieldset>
              <legend>Randomized effects</legend>
              <ul class="${effectListContainerClass}"></ul>
            </fieldset>
            <button type="button" class="${okBtnClass}">Ok</button>
            <button type="button" class="${cancelBtnClass}">Cancel</button>
          </div>
        </div>
      </div>
    `);
    this.okBtn = this.element.querySelector(`.${okBtnClass}`);
    this.cancelBtn = this.element.querySelector(`.${cancelBtnClass}`);
    this.effectElements = [];

    const effectListContainer = this.element.querySelector(`.${effectListContainerClass}`);
    for (let i = 0; i < effectList.length; i++) {
      const effect = effectList[i];
      const elm = TimelineConfigDialog.createEntryForEffect(effect)
      this.effectElements.push(elm);
      effectListContainer.appendChild(elm);
    }

    this.okBtn.addEventListener('click', () => {
      this.hide();
      const config = this.readConfig();
      this.onSubmit(config);
    });
    this.cancelBtn.addEventListener('click', () => {
      this.hide();
      this.onCancel();
    });
  }
  static createEntryForEffect(effect) {
    const elm = parseHtml(`
      <li>
        <input type="checkbox" checked>
        <a href="#">
          ${effect.getDisplayName()}
        </a>
      </li>
    `);
    return elm;
  }

  readConfig() {
    const effects = [];
    for (let i = 0; i < effectList.length; i++) {
      const elm = this.effectElements[i].querySelector('input[type="checkbox"]');
      if (elm.checked) {
        effects.push(effectList[i]);
      }
    }
    return new RandomPlayConfig(effects);
  }

  show() {
    this.parentNode.appendChild(this.element);
  }
  hide() {
    this.parentNode.removeChild(this.element);
  }
  promptUser() {
    return new Promise((res, rej) => {
      this.onSubmit = res;
      this.onCancel = rej;
      this.show();
    });
  }
}

export class TimelineConfigButton {
  constructor(onChange) {
    this.onChange = onChange;
    this.configDialog = new TimelineConfigDialog(onChange);
    this.element = document.querySelector('.menu-timeline-settings');
    this.element.addEventListener('click', () => {
      this.configDialog.promptUser().then(onChange, () => { /* do nothing */ });
    });
  }
}

export class RandomplayButton {
  constructor(timeline) {
    this.menu = timeline.menu;
    const clock = this.menu.clock;
    this.onClockWrap = null;
    this.config = RandomPlayConfig.getDefault();
    this.element = document.getElementById('menu-timeline-randomplay');
    this.element.addEventListener('click', () => {
      if(this.onClockWrap === null) {
        this.onClockWrap = () => this.fillRandomTimeline();
        clock.addWrapListener(this.onClockWrap);
        this.fillRandomTimeline();
        timeline.setLocked(true);
        clock.setPaused(false);
      } else {
        clock.removeWrapListener(this.onClockWrap);
        this.onClockWrap = null;
        timeline.setLocked(false);
      }
    });
  }

  setConfig(config) {
    this.config = config;
  }

  fillRandomTimeline() {
    const config = this.generateRandomTimeline();
    this.menu.applyConfig(config);
    this.menu.submit();
  }

  static trimTimeline(timeline) {
    let earliest = Number.POSITIVE_INFINITY;
    for (let t = 0; t < timeline.length; t++) {
      const track = timeline[t];
      for (let e = 0; e < track.length; e++) {
        const effect = track[e];
        earliest = Math.min(effect.timeBegin, earliest);
      }
    }
    for (let t = 0; t < timeline.length; t++) {
      const track = timeline[t];
      for (let e = 0; e < track.length; e++) {
        const effect = track[e];
        effect.timeBegin -= earliest;
      }
    }
  }

  generateRandomTimeline() {
    console.log(this.config);
    const currentConfig = this.menu.submittedConfig;
    const config = Object.assign({}, currentConfig);

    config.effects = [];
    config.duration = 0;

    for (let i = 0; i < this.config.effects.length; i++) {
      const effect = this.config.effects[i];
      if (effect.getId() == "FlickrImageEffect") {
        continue;
      }

      const timeBegin = Math.round(Math.random() * 10000);
      const duration = Math.round(Math.random() * 9000 + 1000);

      config.effects.push([new EffectConfig(
        effect.getId(),
        timeBegin,
        timeBegin + duration,
        1,
        effect.getRandomConfig()
      )]);

      config.duration = Math.max(config.duration, timeBegin + duration);
    }
    RandomplayButton.trimTimeline(config.effects);

    //TODO: does not work...
    //config.effects.push([new EffectConfig("FlickrImageEffect", 0, config.duration, 1, { searchTerm: '' })]);

    return config;
  }
}
