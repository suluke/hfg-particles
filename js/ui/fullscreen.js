function isFullscreen() {
  return document.fullscreen || document.mozFullScreen ||
    document.webkitIsFullScreen || document.msFullscreenElement;
}

function updateFullscreenClass() {
  const fullscreenClass = 'fullscreen';
  if (isFullscreen()) {
    document.documentElement.classList.add(fullscreenClass);
  } else {
    document.documentElement.classList.remove(fullscreenClass);
  }
}

function toggleFullScreen() {
  if ((document.fullScreenElement && document.fullScreenElement !== null) ||
   (!document.mozFullScreen && !document.webkitIsFullScreen)) {
    if (document.documentElement.requestFullScreen) {
      document.documentElement.requestFullScreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullScreen) {
      document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  } else if (document.cancelFullScreen) {
    document.cancelFullScreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitCancelFullScreen) {
    document.webkitCancelFullScreen();
  }
}

export class FullscreenButton {
  constructor() {
    [].forEach.call(document.getElementsByClassName('btn-fullscreen'), (elm) => {
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
  constructor() {
    this.element = document.querySelector('.img-paste-box');
    this.clicks = 0;
    this.resetTimeout = false;
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
  startResetTimeout() {
    const DBL_CLICK_TIME = 400;
    if (this.resetTimeout) {
      window.clearTimeout(this.resetTimeout);
    }
    this.resetTimeout = window.setTimeout(() => this.reset(), DBL_CLICK_TIME);
  }
  reset() {
    this.clicks = 0;
    if (this.resetTimeout) {
      window.clearTimeout(this.resetTimeout);
      this.resetTimeout = false;
    }
  }
}