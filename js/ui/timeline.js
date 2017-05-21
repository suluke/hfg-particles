import { parseHtml, clearChildNodes } from './util';
import { effectList, effectsById } from '../effects/index';

class TimelineEntry {
  constructor(effectClass) {
    // Times are in milliseconds
    this.timeBegin = 0;
    this.timeEnd = 0;
    this.effectClass = effectClass;

    this.element = parseHtml(`
      <button type="button">${this.effectClass.getId()}</button>
    `);
  }
  loadState(state) {
    this.timeBegin = state.timeBegin;
    this.timeEnd = state.timeEnd;
    this.config = state.config;
  }
  getElement() {
    return this.element;
  }
}

class TimelineTrack {
  constructor(trackNumber) {
    this.elements = [];
    this.elements.push(parseHtml(`
      <td>
        <h3>Track ${trackNumber}</h3>
      </td>
    `));
    this.elements.push(parseHtml(`
      <td>
        <ol>
        </ol>
      </td>
    `));
    this.entryListElm = this.elements[1].querySelector('ol');
    this.entryList = [];
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
    for (let i = 0; i < this.entryList.length; i++) {
      const entry = this.entryList[i];
      const li = entry.getElement().parentNode;
      li.style.left = `${entry.timeBegin / 1000 * pxPerSecond}px`;
      li.style.width = `${(entry.timeEnd - entry.timeBegin) / 1000 * pxPerSecond}px`;
    }
  }
}

export default class Timeline {
  constructor() {
    this.element = document.querySelector('.menu-timeline-container');
    this.trackList = [];
    this.trackListElm = this.element.querySelector('.menu-timeline-tracks');
    this.pxPerSecond = 100;
  }
  loadTimeline(trackList) {
    for (let i = 0; i < trackList.length; i++) {
      const track = new TimelineTrack(i + 1);
      this.trackList.push(track);
      for (let j = 0; j < trackList[i].length; j++) {
        const entryDesc = trackList[i][j];
        const effectId = entryDesc[0];
        const entryState = entryDesc[1];
        const entry = new TimelineEntry(effectsById[effectId]);
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
}
