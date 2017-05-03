const isFullscreen = () => {
  return document.fullscreen || document.mozFullScreen ||
    document.webkitIsFullScreen || document.msFullscreenElement;
};
const updateFullscreenClass = () => {
  const fullscreenClass = 'fullscreen';
  if (isFullscreen())
    document.documentElement.classList.add(fullscreenClass);
  else
    document.documentElement.classList.remove(fullscreenClass);
};

const toggleFullScreen = () => {
  if ((document.fullScreenElement && document.fullScreenElement !== null) ||
   (!document.mozFullScreen && !document.webkitIsFullScreen)) {
    if (document.documentElement.requestFullScreen) {
      document.documentElement.requestFullScreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullScreen) {
      document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  } else {
    if (document.cancelFullScreen) {
      document.cancelFullScreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitCancelFullScreen) {
      document.webkitCancelFullScreen();
    }
  }
};

export default class FullscreenButton {
  constructor() {
    [].forEach.call(document.getElementsByClassName('btn-fullscreen'), (elm) => {
      elm.addEventListener('click', toggleFullScreen);
    });

    document.addEventListener("fullscreenchange", updateFullscreenClass, false);
    document.addEventListener("mozfullscreenchange", updateFullscreenClass, false);
    document.addEventListener("webkitfullscreenchange", updateFullscreenClass, false);
    document.addEventListener("msfullscreenchange", updateFullscreenClass, false);
    updateFullscreenClass();
  }
};
