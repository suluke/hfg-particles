import EffectConfigDialog from './effect-config-dialog';
import { parseHtml, clearChildNodes } from './util';
import { effectsById } from '../effects/index';

class TimelineEntry {
  constructor(effect, timeline) {
    // Times are in milliseconds
    this.timeBegin = 0;
    this.timeEnd = 0;
    this.effect = effect;
    this.timeline = timeline;

    this.element = parseHtml(`
      <button type="button">${this.effect.getDisplayName()}</button>
    `);
    this.element.addEventListener('click', () => {
      this.timeline.effectConfigDialog.promptUser(this)
      .then(
        (newState) => {
          this.loadState(newState);
          this.timeline.renderStyles();
          this.timeline.notifyChange();
        },
        (deleted) => {
          if (deleted) {
            this.timeline.deleteEntry(this);
            this.timeline.notifyChange();
            this.timeline.renderHtml();
            this.timeline.renderStyles();
          }
        }
      );
    });
  }
  loadState(state) {
    this.timeBegin = state.timeBegin;
    this.timeEnd = state.timeEnd;
    this.config = state.config;
  }
  getElement() {
    return this.element;
  }
  getConfiguration() {
    return [this.effect.getId(), {
      timeBegin: this.timeBegin,
      timeEnd:   this.timeEnd,
      config:    this.config
    }];
  }
}

class TimelineTrack {
  constructor(trackNumber, timeline) {
    this.elements = [];
    this.timeline = timeline;
    this.elements.push(parseHtml(`
      <td>
        <h3>Track ${trackNumber}</h3>
      </td>
    `));
    this.elements.push(parseHtml(`
      <td width="99%">
        <ol>
        </ol>
      </td>
    `));
    this.entryListElm = this.elements[1].querySelector('ol');
    this.entryList = [];
    this.entryListElm.addEventListener('drop', (evt) => {
      [].map.call(evt.dataTransfer.items, (item) => {
        if (item.kind === 'string' && item.type === 'text/plain') {
          evt.preventDefault(); // TODO re-trigger evt if we don't accept it below
          item.getAsString((str) => {
            if (effectsById[str] !== undefined) {
              const entry = new TimelineEntry(effectsById[str], this.timeline);
              entry.loadState({
                timeBegin: 0, // TODO magic numbers, retrieve from drop position instead
                timeEnd:   1000, // or the place where css will put the box
                config:    effectsById[str].getDefaultConfig()
              });
              this.addEntry(entry);
              this.renderHtml();
              this.renderStyles(this.pxPerSecond);
              this.timeline.notifyChange();
            }
          });
        }
      });
    });
  }

  addEntry(entry) {
    this.entryList.push(entry);
  }

  getElements() {
    return this.elements;
  }

  renderHtml() {
    const lis = document.createDocumentFragment();
    for (let i = 0; i < this.entryList.length; i++) {
      const entry = this.entryList[i];
      const li = document.createElement('li');
      li.draggable = 'true';
      li.appendChild(entry.getElement());
      lis.appendChild(li);
    }
    clearChildNodes(this.entryListElm);
    this.entryListElm.appendChild(lis);
  }
  renderStyles(pxPerSecond) {
    this.pxPerSecond = pxPerSecond;
    for (let i = 0; i < this.entryList.length; i++) {
      const entry = this.entryList[i];
      const li = entry.getElement().parentNode;
      li.style.left = `${(entry.timeBegin / 1000) * pxPerSecond}px`;
      li.style.width = `${((entry.timeEnd - entry.timeBegin) / 1000) * pxPerSecond}px`;
    }
  }
}

export default class Timeline {
  constructor(menu) {
    this.menu = menu;
    this.element = document.querySelector('.menu-timeline-container');
    this.trackList = [];
    this.trackListElm = this.element.querySelector('.menu-timeline-tracks');
    this.pxPerSecond = 100;
    this.effectConfigDialog = new EffectConfigDialog();
  }
  loadTimeline(trackList) {
    this.trackList = [];
    for (let i = 0; i < trackList.length; i++) {
      const track = new TimelineTrack(i + 1, this);
      this.trackList.push(track);
      for (let j = 0; j < trackList[i].length; j++) {
        const entryDesc = trackList[i][j];
        const effectId = entryDesc[0];
        const entryState = entryDesc[1];
        const entry = new TimelineEntry(effectsById[effectId], this);
        entry.loadState(entryState);
        track.addEntry(entry);
      }
    }
    this.renderHtml();
    this.renderStyles();
  }

  renderHtml() {
    const rows = document.createDocumentFragment();
    for (let i = 0; i < this.trackList.length; i++) {
      const track = this.trackList[i];
      track.renderHtml();
      const row = document.createElement('tr');
      const trackElms = track.getElements();
      trackElms.forEach((elm) => row.appendChild(elm));
      rows.appendChild(row);
    }
    clearChildNodes(this.trackListElm);
    this.trackListElm.appendChild(rows);
  }
  renderStyles() {
    for (let i = 0; i < this.trackList.length; i++) {
      const track = this.trackList[i];
      track.renderStyles(this.pxPerSecond);
    }
  }
  forEachEntry(callback) {
    for (let i = 0; i < this.trackList.length; i++) {
      for (let j = 0; j < this.trackList[i].entryList.length; j++) {
        callback(this.trackList[i].entryList[j], this.trackList[i], j);
      }
    }
  }
  getEffects() {
    const configs = [];
    for (let i = 0; i < this.trackList.length; i++) {
      const track = [];
      configs.push(track);
      for (let j = 0; j < this.trackList[i].entryList.length; j++) {
        track.push(this.trackList[i].entryList[j].getConfiguration());
      }
    }

    return configs;
  }
  assertEmptyLastTrack() {
    let changed = false;
    const tracks = this.trackList;
    while (tracks.length > 1 &&
           tracks[tracks.length - 1].entryList.length === 0 &&
           tracks[tracks.length - 2].entryList.length === 0
    ) {
      tracks.splice(tracks.length - 1, 1);
      changed = true;
    }
    if (tracks[tracks.length - 1].entryList.length !== 0) {
      const track = new TimelineTrack(tracks.length + 1, this);
      tracks.push(track);
      changed = true;
    }
    if (changed) {
      // TODO probably inefficient
      this.renderHtml();
      this.renderStyles();
    }
  }
  notifyChange() {
    this.assertEmptyLastTrack();
    this.menu.notifyChange();
  }
  deleteEntry(remove) {
    this.forEachEntry((entry, track, trackIndex) => {
      if (entry === remove) {
        track.entryList.splice(trackIndex, 1);
      }
    });
  }
}
