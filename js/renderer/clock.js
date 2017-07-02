export default class RendererClock {
  constructor() {
    this.time = -1;
    this.delta = 0;
    this.absTime = Date.now();
    this.period = 1000;
    this.paused = false;
    this.wrapListeners = [];
    this.pauseListeners = [];
  }
  frame() {
    if (this.paused || this.period === 0) {
      this.delta = 0;
      return;
    }
    if (this.time === -1) {
      // it was requested that we start at zero
      this.absTime = Date.now();
      this.time = 0;
    } else {
      const oldTime = this.absTime;
      this.absTime = Date.now();
      this.delta = this.absTime - oldTime;
      this.time += this.delta;
      while (this.time >= this.period) {
        this.time -= this.period;
        for (let i = 0; i < this.wrapListeners.length; i++) {
          window.setTimeout(() => this.wrapListeners[i](), 0);
        }
      }
    }
  }
  reset() {
    this.time = -1;
    this.delta = 0;
    this.absTime = Date.now();
  }
  setPeriod(p) {
    this.period = p;
  }
  getTime() {
    return this.time;
  }
  setTime(time) {
    this.time = time;
    this.delta = 0;
    this.absTime = Date.now();
  }
  getDelta() {
    return this.delta;
  }
  getAbsoluteTime() {
    return this.absTime;
  }
  setPaused(paused = true) {
    if (paused !== this.paused) {
      if (!paused) {
        // on unpause
        this.delta = 0;
        this.absTime = Date.now();
      }
      this.paused = paused;
      for (let i = 0; i < this.pauseListeners.length; i++) {
        this.pauseListeners[i](paused);
      }
    }
  }
  getPaused() {
    return this.paused;
  }
  isPaused() {
    return this.paused;
  }
  addWrapListener(listener) {
    this.wrapListeners.push(listener);
  }
  removeWrapListener(listener) {
    this.wrapListeners.splice(this.wrapListeners.indexOf(listener), 1);
  }
  addPauseListener(listener) {
    this.pauseListeners.push(listener);
  }
  removePauseListener(listener) {
    this.pauseListeners.splice(this.pauseListeners.indexOf(listener), 1);
  }
}
