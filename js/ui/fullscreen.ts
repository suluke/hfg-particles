// Extend Document interface for fullscreen APIs
declare global {
  interface Document {
    mozFullScreen?: boolean;
    webkitIsFullScreen?: boolean;
    msFullscreenElement?: Element;
    fullScreenElement?: Element;
    mozRequestFullScreen?: () => Promise<void>;
    webkitRequestFullScreen?: (allowKeyboardInput?: number) => Promise<void>;
    cancelFullScreen?: () => Promise<void>;
    mozCancelFullScreen?: () => Promise<void>;
    webkitCancelFullScreen?: () => Promise<void>;
  }
  
  interface HTMLElement {
    mozRequestFullScreen?: () => Promise<void>;
    webkitRequestFullScreen?: (allowKeyboardInput?: number) => Promise<void>;
  }
  
  interface Element {
    ALLOW_KEYBOARD_INPUT?: number;
  }
}

function isFullscreen(): boolean {
  return !!(document.fullscreen || (document as any).mozFullScreen ||
    (document as any).webkitIsFullScreen || (document as any).msFullscreenElement);
}

function updateFullscreenClass(): void {
  const fullscreenClass = 'fullscreen';
  if (isFullscreen()) {
    document.documentElement.classList.add(fullscreenClass);
  } else {
    document.documentElement.classList.remove(fullscreenClass);
  }
}

function toggleFullScreen(): void {
  if ((document.fullScreenElement && document.fullScreenElement !== null) ||
   (!(document as any).mozFullScreen && !(document as any).webkitIsFullScreen)) {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if ((document.documentElement as any).mozRequestFullScreen) {
      (document.documentElement as any).mozRequestFullScreen();
    } else if ((document.documentElement as any).webkitRequestFullScreen) {
      (document.documentElement as any).webkitRequestFullScreen((Element as any).ALLOW_KEYBOARD_INPUT);
    }
  } else if ((document as any).cancelFullScreen) {
    (document as any).cancelFullScreen();
  } else if ((document as any).mozCancelFullScreen) {
    (document as any).mozCancelFullScreen();
  } else if ((document as any).webkitCancelFullScreen) {
    (document as any).webkitCancelFullScreen();
  }
}

export class FullscreenButton {
  constructor() {
    Array.from(document.getElementsByClassName('btn-fullscreen')).forEach((elm) => {
      elm.addEventListener('click', toggleFullScreen);
    });

    document.addEventListener('fullscreenchange', updateFullscreenClass, false);
    document.addEventListener('mozfullscreenchange', updateFullscreenClass, false);
    document.addEventListener('webkitfullscreenchange', updateFullscreenClass, false);
    document.addEventListener('msfullscreenchange', updateFullscreenClass, false);
    updateFullscreenClass();
  }
}

export class DoubleClickFullscreen {
  private element: HTMLElement;
  private clicks: number;
  private resetTimeout: number | false;

  constructor() {
    this.element = document.querySelector('.img-paste-box') as HTMLElement;
    this.clicks = 0;
    this.resetTimeout = false;
    
    if (!this.element) {
      throw new Error('Element with class .img-paste-box not found');
    }
    
    this.element.addEventListener('click', () => {
      this.clicks = this.clicks + 1;
      if (this.clicks > 1) {
        this.reset();
        toggleFullScreen();
      } else {
        this.startResetTimeout();
      }
    });
  }

  private startResetTimeout(): void {
    const DBL_CLICK_TIME = 400;
    if (this.resetTimeout) {
      window.clearTimeout(this.resetTimeout);
    }
    this.resetTimeout = window.setTimeout(() => this.reset(), DBL_CLICK_TIME);
  }

  private reset(): void {
    this.clicks = 0;
    if (this.resetTimeout) {
      window.clearTimeout(this.resetTimeout);
      this.resetTimeout = false;
    }
  }
}