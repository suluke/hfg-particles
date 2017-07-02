import EffectConfigDialog from './effect-config-dialog';
import { parseHtml, clearChildNodes } from './util';
import EffectConfig from '../effects/effect-config';
import { getColorClassnameForEffect } from '../effects/index';
import { RandomplayButton, TimelineConfigButton } from './random-play';

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
    this.clickPrevented = false;
    this.config = null;

    const beginHandleClass = 'timeline-entry-begin-time-adjust';
    const endHandleClass = 'timeline-entry-end-time-adjust';
    this.element = parseHtml(`
      <li class="${this.effect.isEventOnly() ? 'event' : ''}">
        <div class="${beginHandleClass}"></div>
        <button type="button" class="${getColorClassnameForEffect(this.effect)}">
          ${this.effect.getDisplayName()}
        </button>
        <div class="${endHandleClass}"></div>
      </li>
    `);
    this.setupTimeAdjustHandles();
    this.setupDragAndDrop();
    // Prevent a previous text selection from interfering with our custom
    // drag and drop
    this.element.addEventListener('mousedown', () => {
      if (document.selection) {
        document.selection.empty();
      } else if (window.getSelection) {
        window.getSelection().removeAllRanges();
      }
    });
    this.element.addEventListener('mousedown', (evt) => {
      // middle mouse button
      if (/* Middle mouse button: */ evt.which == 2 || evt.button == 4) {
        evt.preventDefault();
        this.remove();
      }
    });
    this.element.addEventListener('contextmenu', (evt) => {
      // right mouse button
      evt.preventDefault();
      this.remove();
    });

    this.openConfigBtn = this.element.querySelector('button');
    this.openConfigBtn.addEventListener('click', () => {
      if (this.clickPrevented) {
        this.clickPrevented = false;
        return;
      }
      this.timeline.effectConfigDialog.promptUser(this)
      .then(
        (newState) => {
          this.loadState(newState);
          this.timeline.notifyChange();
        },
        (deleted) => {
          if (deleted) {
            if (deleted !== true) {
              // Another error occurred
              throw deleted;
            }
            this.remove();
          }
        }
      );
    });
  }

  remove() {
    this.timeline.deleteEntry(this);
    this.timeline.renderHtml();
    this.timeline.notifyChange();
  }

  setupHorizontalDragging() {
    this.element.addEventListener('mousedown', (evt) => {
      if (evt.target.classList.contains('timeline-entry-begin-time-adjust') ||
          evt.target.classList.contains('timeline-entry-end-time-adjust')) {
        return;
      }
      const startX = evt.clientX;
      let prevX = startX;
      const thres = 5;
      let started = false;
      const onDrag = (evt) => {
        if (!started) {
          if (Math.abs(evt.clientX - startX) > thres) {
            started = true;
          }
        } else {
          const delta = evt.clientX - prevX;
          prevX = evt.clientX;
          const duration = this.timeEnd - this.timeBegin;
          this.timeBegin = Math.max(0, Math.round(this.timeBegin + ((delta / this.timeline.pxPerSecond) * 1000)));
          this.timeEnd = this.timeBegin + duration;
          this.timeline.notifyChange();
        }

        if (started) {
          this.clickPrevented = true;
        }
      };
      const onDragEnd = (evt) => {
        document.documentElement.removeEventListener('mousemove', onDrag);
        document.documentElement.removeEventListener('mouseup', onDragEnd);
      };
      document.documentElement.addEventListener('mousemove', onDrag);
      document.documentElement.addEventListener('mouseup', onDragEnd);
    });
  }

  setupVericalDragging() {
    return;
    // Cross-timeline dragging and dropping is more complicated, so we
    // handle it independently from horizontal dragging
    this.element.addEventListener('mousedown', (evt) => {
      if (evt.target.classList.contains('timeline-entry-begin-time-adjust') ||
          evt.target.classList.contains('timeline-entry-end-time-adjust')) {
        return;
      }
      const onDrag = (evt) => {
        // TODO
      };
      const onDragEnd = (evt) => {
        document.documentElement.removeEventListener('mousemove', onDrag);
        document.documentElement.removeEventListener('mouseup', onDragEnd);
      };
      document.documentElement.addEventListener('mousemove', onDrag);
      document.documentElement.addEventListener('mouseup', onDragEnd);
    });
  }

  setupDragAndDrop() {
    this.setupHorizontalDragging();
    this.setupVericalDragging();
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

  setupTimeAdjustHandles() {
    if (this.effect.isEventOnly()) {
      return;
    }

    const beginHandle = this.element.querySelector('.timeline-entry-begin-time-adjust');
    TimelineEntry.setupAdjustHandle(beginHandle, (delta) => {
      let newBegin = Math.max(0, this.timeBegin + ((delta / this.timeline.pxPerSecond) * 1000));
      if (newBegin < this.timeEnd) {
        this.timeBegin = Math.round(newBegin);
        this.timeline.notifyChange();
      }
    });
    const endHandle = this.element.querySelector('.timeline-entry-end-time-adjust');
    TimelineEntry.setupAdjustHandle(endHandle, (delta) => {
      const newEnd = this.timeEnd + ((delta / this.timeline.pxPerSecond) * 1000);
      if (newEnd > this.timeBegin) {
        this.timeEnd = Math.round(newEnd);
        this.timeline.notifyChange();
      }
    });
  }

  loadState(state) {
    this.timeBegin = state.timeBegin;
    this.timeEnd = state.timeEnd;
    this.repetitions = state.repetitions;
    this.config = state.config;
  }
  getElement() {
    return this.element;
  }
  getConfiguration() {
    return new EffectConfig(
      this.effect.getId(),
      this.timeBegin,
      this.timeEnd,
      this.repetitions,
      this.config
    );
  }
  renderStyles() {
    const li = this.getElement();
    const left = (this.timeBegin / 1000) * this.timeline.pxPerSecond;
    const width = ((this.timeEnd - this.timeBegin) / 1000) * this.timeline.pxPerSecond;
    li.style.left = `${left}px`;
    li.style.width = `${width}px`;
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
      <td>
        <ol>
        </ol>
      </td>
    `));
    this.entryListElm = this.elements[1].querySelector('ol');
    this.entryList = [];
    this.width = 0;
  }

  dropNewEffect(effect, clientX, clientY, width, height) {
    if (this.timeline.isLocked()) {
      return false;
    }

    const elm = this.getTrackElement();
    const rect = elm.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right &&
        clientY >= rect.top && clientY <= rect.bottom) {
      const entry = new TimelineEntry(effect, this.timeline);
      const timeBegin = Math.round(Math.max(0, clientX - (width / 2) - rect.left) / (this.timeline.pxPerSecond / 1000));
      entry.loadState({
        timeBegin,
        timeEnd:     timeBegin + 1000,
        repetitions: 1,
        config:      effect.getDefaultConfig()
      });
      this.addEntry(entry);
      this.renderHtml();
      this.timeline.notifyChange();
      return true;
    }
    return false;
  }

  addEntry(entry) {
    this.entryList.push(entry);
  }

  getElements() {
    return this.elements;
  }
  getTrackElement() {
    return this.elements[1];
  }
  renderHtml() {
    const lis = document.createDocumentFragment();
    for (let i = 0; i < this.entryList.length; i++) {
      const entry = this.entryList[i];
      const li = entry.getElement();
      lis.appendChild(li);
    }
    clearChildNodes(this.entryListElm);
    this.entryListElm.appendChild(lis);
  }
  renderStyles() {
    let maxEnd = 0;
    for (let i = 0; i < this.entryList.length; i++) {
      const entry = this.entryList[i];
      entry.renderStyles();
      maxEnd = Math.max(maxEnd, entry.timeEnd);
    }
    const width = Math.round(maxEnd / 1000 * this.timeline.pxPerSecond);
    if (width > this.width) {
      this.width = width;
      this.getTrackElement().style.minWidth = `${width}px`;
    }
  }
}

/**
 *
 */
class Timeticks {
  constructor(clock) {
    this.clock = clock;
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
    this.element.addEventListener('click', (evt) => {
      const left = Math.round(this.element.getBoundingClientRect().left);
      const x = Math.max(0, evt.clientX - left - this.getTimelineBorderWidth());
      const t = Math.min(this.duration, x / this.getPxPerSecond() * 1000);
      this.clock.setTime(t);
    });
  }
  getTimelineBorderWidth() {
    const tickWidth = this.firstTick.offsetWidth;
    return Math.round((tickWidth / 2) + 5);
  }
  adjustPosition() {
    const cssRules = this.stylesheet.cssRules;
    const borderWidth = this.getTimelineBorderWidth();
    const selectorPath = '.menu-timeline-container .menu-timeline-scrollable-container .menu-timeline-content';
    this.stylesheet.insertRule(`
      ${selectorPath} tr > th:first-child + th {
        border-left-width: ${borderWidth}px;
      }`, cssRules.length
    );
    this.stylesheet.insertRule(`
      ${selectorPath} tr > td:first-child + td {
        border-left-width: ${borderWidth}px;
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
  static msToStr(ms) {
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
        const tick = parseHtml(`<span class="menu-timeline-timetick">${Timeticks.msToStr(time)}</span>`);
        tick.style.left = `${pxPerMillis * time}px`;
        container.appendChild(tick);
        time += timeBetweenTicks;
      } while (time <= this.duration);
    }
  }
  getElement() {
    return this.element;
  }
}

class TimeIndicator {
  constructor(menu, timeticks) {
    this.menu = menu;
    this.clock = menu.clock;
    this.timeticks = timeticks;
    this.element = document.querySelector('.menu-timeline-container .menu-timeline-position-indicator');
    this.element.style.right = 'initial';

    if (!this.element) {
      throw new Error('Cannot find timeline position indicator element');
    }
    const updateLoop = () => {
      this.updateStyles();
      window.requestAnimationFrame(updateLoop);
    };
    updateLoop();
  }
  updateStyles() {
    if (!this.menu.isVisible()) {
      return;
    }
    this.element.style.left = '0px';
    const selfRect = this.element.getBoundingClientRect();
    const ticksElm = this.timeticks.getElement();
    const ticksBLW = window.getComputedStyle(ticksElm).borderLeftWidth;
    const ticksRect = ticksElm.getBoundingClientRect();
    const ticksBorder = parseInt(ticksBLW.substring(0, ticksBLW.length - 2), 10);
    const timePx = this.clock.getTime() * this.timeticks.getPxPerSecond() / 1000;
    this.element.style.left = `${ticksRect.left + ticksBorder - selfRect.left + timePx}px`;
  }
}

class PauseButton {
  constructor(clock) {
    this.clock = clock;
    this.element = document.querySelector('.menu-timeline-pause');
    this.element.addEventListener('click', () => {
      clock.setPaused(!clock.getPaused());
    });
    clock.addPauseListener((paused) => {
      const onPauseClass = 'paused';
      if (paused) {
        this.element.classList.add(onPauseClass);
      } else {
        this.element.classList.remove(onPauseClass);
      }
    });
    window.document.addEventListener('keydown', (e) => {
      if (e.key === ' ') {
        clock.tooglePause();
      }
    });
  }
}

class TimeDisplay {
  constructor(menu) {
    this.element = document.querySelector('.menu-timeline-current-time');
    this.menu = menu;
    this.clock = menu.clock;
    const updateLoop = () => {
      this.update();
      window.requestAnimationFrame(updateLoop);
    };
    updateLoop();
  }
  update() {
    if (!this.menu.isVisible()) {
      return;
    }
    let time = this.clock.getTime();
    if (time < 0) {
      time = 0;
    }
    if (!this.clock.isPaused()) {
      this.element.innerHTML = Timeticks.msToStr(time);
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
    this.locked = false;
    this.trackListElm = this.element.querySelector('.menu-timeline-tracks');
    this.effectConfigDialog = new EffectConfigDialog();
    this.timeticks = new Timeticks(menu.clock);
    this.timeDisplay = new TimeDisplay(menu);
    this.pauseButton = new PauseButton(menu.clock);
    this.randomplayButton = new RandomplayButton(this);
    this.timelineConfigBtn = new TimelineConfigButton((config) => {
      this.randomplayButton.setConfig(config);
    });
    this.positionIndicator = new TimeIndicator(menu, this.timeticks);
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
        const entryDesc = EffectConfig.deserialize(trackList[i][j]);
        try {
          const entry = new TimelineEntry(entryDesc.getEffectClass(), this);
          entry.loadState(entryDesc);
          track.addEntry(entry);
        } catch (e) {
          // Probably the effect hasn't been found due to a developer
          // switching branches
          console.warn(e);
        }
      }
    }
    this.assertEmptyLastTrack(false)
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
  assertEmptyLastTrack(render = true) {
    let changed = false;
    const tracks = this.trackList;
    while (tracks.length > 1 &&
           tracks[tracks.length - 1].entryList.length === 0 &&
           tracks[tracks.length - 2].entryList.length === 0
    ) {
      tracks.splice(tracks.length - 1, 1);
      changed = true;
    }
    if (tracks.length === 0 || tracks[tracks.length - 1].entryList.length !== 0) {
      const track = new TimelineTrack(tracks.length + 1, this);
      tracks.push(track);
      changed = true;
    }
    if (changed && render) {
      // TODO probably inefficient
      this.renderHtml();
      this.renderStyles();
    }
  }
  notifyChange() {
    this.timeticks.setDuration(this.getTotalDuration());
    this.assertEmptyLastTrack();
    this.renderStyles();
    this.menu.notifyChange();
  }
  deleteEntry(remove) {
    this.forEachEntry((entry, track, trackIndex) => {
      if (entry === remove) {
        track.entryList.splice(trackIndex, 1);
      }
    });
  }
  dropNewEffect(effect, clientX, clientY, width, height) {
    for (let i = 0; i < this.trackList.length; i++) {
      if (this.trackList[i].dropNewEffect(effect, clientX, clientY, width, height)) {
        return true;
      }
    }
    return false;
  }
  isLocked() {
    return this.locked;
  }
  setLocked(locked = true) {
    if (this.locked !== locked) {
      this.locked = locked;
      const lockedClass = 'locked';
      if (locked) {
        this.element.classList.add(lockedClass);
      } else {
        this.element.classList.remove(lockedClass);
      }
    }
  }
}
