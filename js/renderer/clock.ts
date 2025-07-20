type WrapListener = () => void;
type PauseListener = (paused: boolean) => void;

export default class RendererClock {
  private time: number;

  private delta: number;

  private absTime: number;

  private period: number;

  private paused: boolean;

  private wrapListeners: WrapListener[];

  private pauseListeners: PauseListener[];

  constructor() {
    this.time = -1;
    this.delta = 0;
    this.absTime = Date.now();
    this.period = 1000;
    this.paused = false;
    this.wrapListeners = [];
    this.pauseListeners = [];
  }

  frame(): void {
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

  reset(): void {
    this.time = -1;
    this.delta = 0;
    this.absTime = Date.now();
  }

  setPeriod(p: number): void {
    this.period = p;
  }

  getTime(): number {
    return this.time;
  }

  setTime(time: number): void {
    this.time = time;
    this.delta = 0;
    this.absTime = Date.now();
  }

  getDelta(): number {
    return this.delta;
  }

  getAbsoluteTime(): number {
    return this.absTime;
  }

  setPaused(paused: boolean = true): void {
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

  tooglePause(): void {
    this.setPaused(!this.paused);
  }

  getPaused(): boolean {
    return this.paused;
  }

  isPaused(): boolean {
    return this.paused;
  }

  addWrapListener(listener: WrapListener): void {
    this.wrapListeners.push(listener);
  }

  removeWrapListener(listener: WrapListener): void {
    this.wrapListeners.splice(this.wrapListeners.indexOf(listener), 1);
  }

  addPauseListener(listener: PauseListener): void {
    this.pauseListeners.push(listener);
  }

  removePauseListener(listener: PauseListener): void {
    this.pauseListeners.splice(this.pauseListeners.indexOf(listener), 1);
  }
}
