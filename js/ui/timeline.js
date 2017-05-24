import EffectConfigDialog from './effect-config-dialog';
import { parseHtml, clearChildNodes } from './util';
import { effectsById } from '../effects/index';

/**
 *
 */
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

/**
 *
 */
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
      [].map.call(evt.dataTransfer.types, (type) => {
        if (type === 'text/plain') {
          evt.preventDefault(); // TODO re-trigger evt if we don't accept it below
          const str = evt.dataTransfer.getData(type);
          if (effectsById[str] !== undefined) {
            const entry = new TimelineEntry(effectsById[str], this.timeline);
            entry.loadState({
              timeBegin: 0, // TODO magic numbers, retrieve from drop position instead
              timeEnd:   1000, // or the place where css will put the box
              config:    effectsById[str].getDefaultConfig()
            });
            this.addEntry(entry);
            this.renderHtml();
            this.renderStyles();
            this.timeline.notifyChange();
          }
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

  static setupAdjustHandle(elm, onAdjustCallback) {
    elm.addEventListener('mousedown', (evt) => {
      evt.preventDefault(); // prevent dragging parent

      let prevX = evt.clientX;
      const onAdjust = (evt) => {
        onAdjustCallback(evt.clientX - prevX);
        prevX = evt.clientX;
      };
      const onStopAdjust = () => {
        document.documentElement.removeEventListener('mousemove', onAdjust);
        document.documentElement.removeEventListener('mouseup', onStopAdjust);
      };
      
      document.documentElement.addEventListener('mousemove', onAdjust);
      document.documentElement.addEventListener('mouseup', onStopAdjust);
    });
  }

  createBeginTimeAdjustHandle(entry) {
    const elm = parseHtml('<div class="timeline-entry-begin-time-adjust"></div>');
    TimelineTrack.setupAdjustHandle(elm, (delta) => {
      let newBegin = Math.max(0, entry.timeBegin + ((delta / this.timeline.pxPerSecond) * 1000));
      if (newBegin < entry.timeEnd) {
        entry.timeBegin = newBegin;
        this.renderStyles();
      }
    });
    return elm;
  }

  createEndTimeAdjustHandle(entry) {
    const elm = parseHtml('<div class="timeline-entry-end-time-adjust"></div>');
    TimelineTrack.setupAdjustHandle(elm, (delta) => {
      const newEnd = entry.timeEnd + ((delta / this.timeline.pxPerSecond) * 1000);
      if (newEnd > entry.timeBegin) {
        entry.timeEnd = newEnd;
        this.renderStyles();
      }
    });
    return elm;
  }

  renderHtml() {
    const lis = document.createDocumentFragment();
    for (let i = 0; i < this.entryList.length; i++) {
      const entry = this.entryList[i];
      const li = document.createElement('li');
      li.draggable = 'true';

      li.appendChild(this.createBeginTimeAdjustHandle(entry));
      li.appendChild(entry.getElement());
      li.appendChild(this.createEndTimeAdjustHandle(entry));

      li.addEventListener('dragstart', (evt) => {
        evt.dataTransfer.effectAllowed = "move";
      });
      
      lis.appendChild(li);
    }
    clearChildNodes(this.entryListElm);
    this.entryListElm.appendChild(lis);
  }
  renderStyles() {
    for (let i = 0; i < this.entryList.length; i++) {
      const entry = this.entryList[i];
      const li = entry.getElement().parentNode;
      li.style.left = `${(entry.timeBegin / 1000) * this.timeline.pxPerSecond}px`;
      li.style.width = `${((entry.timeEnd - entry.timeBegin) / 1000) * this.timeline.pxPerSecond}px`;
    }
  }
}

/**
 *
 */
class Timeticks {
  constructor() {
    this.element = document.querySelector('.menu-timeline-timeticks');
    this.styleElm = document.createElement('style');
    document.body.appendChild(this.styleElm);
    this.stylesheet = this.styleElm.sheet;
    this.firstTick = this.element.querySelector('.menu-timeline-timetick');
    this.adjustPosition();
    this.zoomLevel = 1;
    this.zoomInBtn = document.querySelector('.menu-timeline-zoom-in');
    this.zoomOutBtn = document.querySelector('.menu-timeline-zoom-out');
    this.scaleChangeListeners = [];

    const onZoomlevelChange = () => {
      this.render();
      for (let i = 0; i < this.scaleChangeListeners.length; i++) {
        this.scaleChangeListeners[i](this.getPxPerSecond());
      }
    }
    this.zoomInBtn.addEventListener('click', () => {
      this.zoomLevel *= 1.5;
      onZoomlevelChange();
    });
    this.zoomOutBtn.addEventListener('click', () => {
      this.zoomLevel /= 1.5;
      onZoomlevelChange();
    });
  }
  adjustPosition() {
    const firstTick = this.firstTick;
    const tickWidth = firstTick.offsetWidth;
    const cssRules = this.stylesheet.cssRules;
    this.stylesheet.insertRule(`
      .menu-timeline-container .menu-timeline-content tr > th:first-child + th {
        border-left-width: ${(tickWidth / 2) + 5}px;
      }`, cssRules.length
    );
    this.stylesheet.insertRule(`
      .menu-timeline-container .menu-timeline-content tr > td:first-child + td {
        border-left-width: ${(tickWidth / 2) + 5}px;
      }`, cssRules.length
    );
    this.stylesheet.insertRule(`
      .menu-timeline-timetick {
        transform: translateX(-50%);
      }
    `, cssRules.length);
  }
  /**
   * @return px
   */
  getOptimalTimetickSpace() {
    return 2 * this.firstTick.offsetWidth;
  }
  getPxPerSecond() {
    return this.getOptimalTimetickSpace() * this.zoomLevel;
  }
  /**
   * @return ms
   */
  getOptimalTimeBetweenTicks() {
    const tickSpace = this.getOptimalTimetickSpace();
    const pxPerMillis = (tickSpace * this.zoomLevel) / 1000;
    let time = 1000; // ms
    let multiplyNext = 5;
    while (time * pxPerMillis < tickSpace) {
      time *= multiplyNext;
      // alternate between 5 and 10
      multiplyNext = multiplyNext === 2 ? 5 : 2;
    }
    multiplyNext = 0.5;
    while (true) {
      if (time * multiplyNext * pxPerMillis <= tickSpace) {
        break;
      } else {
        time = time * multiplyNext;
        // alternate between 0.5 and 0.1
        multiplyNext = multiplyNext === 0.5 ? 0.2 : 0.5;
      }
    }
    return time;
  }
  addScaleChangeListener(listener) {
    this.scaleChangeListeners.push(listener);
  }
  setDuration(duration) {
    this.duration = duration;
    this.render();
  }
  msToStr(ms) {
    let zeroPad = function(num, places) {
      const zero = places - num.toString().length + 1;
      return Array(+(zero > 0 && zero)).join('0') + num;
    };
    let rem = ms;
    const m = Math.floor(rem / 1000 / 60);
    rem -= m * 1000 * 60;
    const s = Math.floor(rem / 1000);
    rem -= s * 1000;
    const cs = Math.floor(rem / 10);

    return `${zeroPad(m, 2)}:${zeroPad(s, 2)}:${zeroPad(cs, 2)}`;
  }
  render() {
    if (this.duration !== this.renderedDuration ||
        this.zoomLevel !== this.renderedZoomLevel) {
      this.renderedDuration = this.duration;
      this.renderedZoomLevel = this.zoomLevel;
      const container = this.firstTick.parentNode;
      clearChildNodes(container);
      container.appendChild(this.firstTick);
      const pxPerMillis = this.getPxPerSecond() / 1000;
      const timeBetweenTicks = this.getOptimalTimeBetweenTicks();
      let time = timeBetweenTicks;
      do {
        const tick = parseHtml(`<span class="menu-timeline-timetick">${this.msToStr(time)}</span>`);
        tick.style.left = `${pxPerMillis * time}px`;
        container.appendChild(tick);
        time += timeBetweenTicks;
      } while (time <= this.duration);
    }
  }
}

/**
 *
 */
export default class Timeline {
  constructor(menu) {
    this.menu = menu;
    this.element = document.querySelector('.menu-timeline-container');
    this.trackList = [];
    this.trackListElm = this.element.querySelector('.menu-timeline-tracks');
    this.effectConfigDialog = new EffectConfigDialog();
    this.timeticks = new Timeticks();
    this.pxPerSecond = this.timeticks.getOptimalTimetickSpace();
    this.timeticks.addScaleChangeListener(() => {
      this.pxPerSecond = this.timeticks.getPxPerSecond();
      this.renderStyles();
    });
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
    this.timeticks.setDuration(this.getTotalDuration());
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
      track.renderStyles();
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
  getTotalDuration() {
    let maxEnd = 0;
    this.forEachEntry((entry) => maxEnd = Math.max(maxEnd, entry.timeEnd));
    return maxEnd;
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
    this.timeticks.setDuration(this.getTotalDuration());
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
