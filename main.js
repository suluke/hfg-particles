(function () {
'use strict';

// Source: https://gist.github.com/k-gun/c2ea7c49edf7b757fe9561ba37cb19ca
(function setupClasslistPolyfill() {
  // helpers
  var regExp = function (name) { return new RegExp(("(^| )" + name + "( |$)")); };
  var forEach = function (list, fn, scope) {
    for (var i = 0; i < list.length; i++) {
      fn.call(scope, list[i]);
    }
  };

  // class list object with basic methods
  function ClassList(element) {
    this.element = element;
  }

  ClassList.prototype = {
    add: function add() {
      var this$1 = this;
      var args = [], len = arguments.length;
      while ( len-- ) args[ len ] = arguments[ len ];

      forEach(args, function (name) {
        if (!this$1.contains(name)) {
          this$1.element.className += this$1.element.className.length > 0 ? (" " + name) : name;
        }
      }, this);
    },
    remove: function remove() {
      var this$1 = this;
      var args = [], len = arguments.length;
      while ( len-- ) args[ len ] = arguments[ len ];

      forEach(args, function (name) {
        this$1.element.className =
          this$1.element.className.replace(regExp(name), '');
      }, this);
    },
    toggle: function toggle(name) {
      return this.contains(name)
        ? (this.remove(name), false) : (this.add(name), true);
    },
    contains: function contains(name) {
      return regExp(name).test(this.element.className);
    },
    // bonus..
    replace: function replace(oldName, newName) {
      this.remove(oldName);
      this.add(newName);
    }
  };

  // IE8/9, Safari
  if (!('classList' in Element.prototype)) {
    Object.defineProperty(Element.prototype, 'classList', {
      get: function get() {
        return new ClassList(this);
      }
    });
  }

  // replace() support for others
  if (window.DOMTokenList && DOMTokenList.prototype.replace == null) {
    DOMTokenList.prototype.replace = ClassList.prototype.replace;
  }
}());

function isFullscreen() {
  return document.fullscreen || document.mozFullScreen ||
    document.webkitIsFullScreen || document.msFullscreenElement;
}

function updateFullscreenClass() {
  var fullscreenClass = 'fullscreen';
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

var FullscreenButton = function FullscreenButton() {
  [].forEach.call(document.getElementsByClassName('btn-fullscreen'), function (elm) {
    elm.addEventListener('click', toggleFullScreen);
  });

  document.addEventListener('fullscreenchange', updateFullscreenClass, false);
  document.addEventListener('mozfullscreenchange', updateFullscreenClass, false);
  document.addEventListener('webkitfullscreenchange', updateFullscreenClass, false);
  document.addEventListener('msfullscreenchange', updateFullscreenClass, false);
  updateFullscreenClass();
};

var DoubleClickFullscreen = function DoubleClickFullscreen() {
  var this$1 = this;

  this.element = document.querySelector('.img-paste-box');
  this.clicks = 0;
  this.resetTimeout = false;
  this.element.addEventListener('click', function () {
    this$1.clicks = this$1.clicks + 1;
    if (this$1.clicks > 1) {
      this$1.reset();
      toggleFullScreen();
    } else {
      this$1.startResetTimeout();
    }
  });
};
DoubleClickFullscreen.prototype.startResetTimeout = function startResetTimeout () {
    var this$1 = this;

  var DBL_CLICK_TIME = 400;
  if (this.resetTimeout) {
    window.clearTimeout(this.resetTimeout);
  }
  this.resetTimeout = window.setTimeout(function () { return this$1.reset(); }, DBL_CLICK_TIME);
};
DoubleClickFullscreen.prototype.reset = function reset () {
  this.clicks = 0;
  if (this.resetTimeout) {
    window.clearTimeout(this.resetTimeout);
    this.resetTimeout = false;
  }
};

if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
  throw new Error('The File APIs are not fully supported in this browser.');
}

var ImgSelect = function ImgSelect() {
  var this$1 = this;

  // properties:
  this.changeListeners = [];
  this.input = document.getElementById('btn-file-select');
  this.FR = new FileReader();

  // drag-n-drop support
  var html = document.documentElement;
  var input = this.input;
  var dragClass = 'dragging-file';
  html.addEventListener('dragenter', function (e) {
    html.classList.add(dragClass);
    e.stopPropagation();
    e.preventDefault();
  });
  html.addEventListener('dragleave', function (e) {
    if (e.clientX === 0 && e.clientY === 0) {
      html.classList.remove(dragClass);
    }
    e.stopPropagation();
    e.preventDefault();
  });
  // needed to prevent browser redirect to dropped file:
  // http://stackoverflow.com/a/6756680/1468532
  html.addEventListener('dragover', function (e) {
    e.preventDefault();
  });
  html.addEventListener('drop', function (e) {
    html.classList.remove(dragClass);
    var fileItem = [].find.call(e.dataTransfer.items, function (item) { return item.kind === 'file'; });
    if (fileItem) {
      this$1.fileToUrl(fileItem.getAsFile())
      .then(function (url) {
        this$1.changeListeners.forEach(function (listener) { return listener(url); });
      }, function (msg) {
        // TODO
        console.error(msg);
      });
      e.preventDefault();

      return;
    }
    var urlItem = [].find.call(e.dataTransfer.items, function (item) { return (item.kind === 'string' && item.type === 'text/uri-list'); });
    if (urlItem) {
      urlItem.getAsString(function (url) {
        this$1.changeListeners.forEach(function (listener) { return listener(url); });
      });
      e.preventDefault();
    }
  });

  // Try to catch clipboard pastes
  [].forEach.call(document.body.querySelectorAll('.img-paste-box'), function (box) {
    box.addEventListener('paste', function (e) {
      var fileItem = [].find.call(e.clipboardData.items, function (item) { return item.kind === 'file'; });
      if (fileItem) {
        this$1.fileToUrl(fileItem.getAsFile())
        .then(function (url) {
          this$1.changeListeners.forEach(function (listener) { return listener(url); });
        }, function (msg) {
          // TODO
          console.error(msg);
        });
      }
      e.preventDefault();
    });
    // Also undo effects of contenteditable="true" - we really only
    // want it for "paste" option in context menu
    box.addEventListener('keydown', function (e) {
      if (e.key.length > 1) { // no text input
        return;
      }
      e.preventDefault();
    });
    // Touch devices might fire up a virtual keyboard, which is confusing
    // so in this case, we need to completely disable this feature :(
    box.addEventListener('touchend', function (e) {
      box.readonly = true; // Force keyboard to hide on input field.
      box.disabled = true; // Force keyboard to hide on textarea field.
      setTimeout(function () {
        box.blur();//actually close the keyboard
        // Remove readonly attribute after keyboard is hidden.
        box.readonly = false;
        box.disabled = false;
      }, 100);
    });
  });

  // catch the change event
  input.addEventListener('change', function (evt) {
    var file = evt.target.files[0];
    if (file) {
      this$1.fileToUrl(file)
      .then(function (url) {
        this$1.changeListeners.forEach(function (listener) { return listener(url); });
      }, function (msg) {
        // TODO
        console.error(msg);
      });
    }
  });
};

ImgSelect.prototype.fileToUrl = function fileToUrl (file) {
    var this$1 = this;

  return new Promise(function (res, rej) {
    // TODO why would this be null?
    if (file === null) {
      rej('File was null');
    }
    if (this$1.FR.readyState === 1) {
      this$1.FR.abort();
    }
    this$1.FR.onload = function () {
      res(this$1.FR.result);
    };
    this$1.FR.onerror = rej;
    this$1.FR.readAsDataURL(file);
  });
};

ImgSelect.prototype.addChangeListener = function addChangeListener (listener) {
  this.changeListeners.push(listener);
};
ImgSelect.prototype.clear = function clear () {
  this.input.value = null;
};

var InactivityMonitor = function InactivityMonitor() {
  var this$1 = this;

  this.timeout = undefined;

  var inactivityTimeout = 3000;
  var inactivityClass = 'user-inactive';

  var onInactivity = function () {
    document.documentElement.classList.add(inactivityClass);
  };
  var onActivity = function () {
    if (this$1.timeout !== undefined) {
      window.clearTimeout(this$1.timeout);
    }
    this$1.timeout = window.setTimeout(onInactivity, inactivityTimeout);
    document.documentElement.classList.remove(inactivityClass);
  };
  window.onload = onActivity;
  // DOM Events
  document.addEventListener('mousemove', onActivity);
  document.addEventListener('keypress', onActivity);
  // Touch devices don't have (or at least make us of) mouses or keys
  document.addEventListener('click', onActivity);
};

function parseHtml(html) {
  // eslint-disable-next-line no-param-reassign
  html = html.trim();
  /* code adapted from jQuery */
  var wrapper = function (depth, open, close) { return ({ depth: depth, open: open, close: close }); };
  var wrapMap = {
    option: wrapper(1, "<select multiple='multiple'>", '</select>'),
    legend: wrapper(1, '<fieldset>', '</fieldset>'),
    area:   wrapper(1, '<map>', '</map>'),
    param:  wrapper(1, '<object>', '</object>'),
    thead:  wrapper(1, '<table>', '</table>'),
    tr:     wrapper(2, '<table><tbody>', '</tbody></table>'),
    col:    wrapper(2, '<table><tbody></tbody><colgroup>', '</colgroup></table>'),
    td:     wrapper(3, '<table><tbody><tr>', '</tr></tbody></table>'),

    // IE6-8 can't serialize link, script, style, or any html5 (NoScope) tags,
    // unless wrapped in a div with non-breaking characters in front of it.
    _default: wrapper(1, '<div>', '</div>')
  };
  wrapMap.optgroup = wrapMap.option;
  wrapMap.tbody = wrapMap.thead;
  wrapMap.tfoot = wrapMap.thead;
  wrapMap.colgroup = wrapMap.thead;
  wrapMap.caption = wrapMap.thead;
  wrapMap.th = wrapMap.td;
  var element = document.createElement('div');
  var match = /<\s*(\w+).*?>/g.exec(html);
  if (match != null) {
    var tag = match[1];
    var wrap = wrapMap[tag] || wrapMap._default;
    // eslint-disable-next-line no-param-reassign
    html = "" + (wrap.open) + html + (wrap.close);
    element.innerHTML = html;
    // Descend through wrappers to the right content
    var depth = wrap.depth + 1;
    for (var d = 0; d < depth; d++) {
      if (element.firstChild !== element.lastChild) {
        throw new Error(
          'util.parseHtml requires one single top level element.' +
          'NOTE: This error might also occur if your tag structure ' +
          'is nested illegaly.'
        );
      }
      element = element.lastChild;
    }
  } else {
    // if only text is passed
    element.innerHTML = html;
    element = element.lastChild;
  }

  return element;
}

function clearChildNodes(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function imageScalingMarkup(classPrefix) {
  return ("\n    <fieldset>\n      <legend>Image scaling</legend>\n      <label>\n        Image scaling:\n        <select class=\"" + classPrefix + "-scaling-select\">\n          <option value=\"crop-to-viewport\" title=\"Image might be cropped to fit the viewport\" selected>crop to fit viewport</option>\n          <option value=\"fit-image\" title=\"Black borders might be visible\">fit image</option>\n          <option value=\"fit-width\" title=\"Black borders might be visible at the top and bottom\">fit width</option>\n          <option value=\"fit-height\" title=\"Black borders might be visible at the left or right edges\">fit height</option>\n          <option value=\"scale-to-viewport\" title=\"The image's aspect ratio might be skewed\">scale to fit viewport</option>\n        </select>\n      </label><br/>\n      <label>\n        Horizontal image cropping:\n        <select class=\"" + classPrefix + "-crop-x-select\">\n          <option value=\"crop-both\" title=\"Drop exceeding pixels on either side\" selected>both sides</option>\n          <option value=\"crop-left\" title=\"Drop exceeding pixels on the leftern side\">leftern side</option>\n          <option value=\"crop-right\" title=\"Drop exceeding pixels on the rightern side\">rightern side</option>\n        </select>\n      </label><br/>\n      <label>\n        Vertical image cropping:\n        <select class=\"" + classPrefix + "-crop-y-select\">\n          <option value=\"crop-both\" title=\"Drop exceeding pixels on either edge\" selected>both edges</option>\n          <option value=\"crop-top\" title=\"Drop exceeding pixels at the top\">top edge</option>\n          <option value=\"crop-bottom\" title=\"Drop exceeding pixels at the bottom\">bottom edge</option>\n        </select>\n      </label>\n    </fieldset>\n  ")
}

var LoadImgDialog = function LoadImgDialog() {
  var this$1 = this;

  var classPrefix = 'load-default-img';
  var loadBtnClass = "btn-" + classPrefix + "-load";
  var cancelLoadBtnClass = "btn-" + classPrefix + "-cancel";

  // Object properties
  this.parentNode = document.getElementById('modal-container');
  this.resolve = null;
  this.reject = null;
  this.elm = parseHtml(("\n      <div class=\"" + classPrefix + "-backdrop\">\n        <div class=\"" + classPrefix + "-popup\">\n          " + (imageScalingMarkup(classPrefix)) + "\n          <button type=\"button\" class=\"" + loadBtnClass + "\">Load</button>\n          <button type=\"button\" class=\"" + cancelLoadBtnClass + "\">Cancel</button>\n        </div>\n      </div>\n    "));

  this.scalingSelect = this.elm.querySelector(("select." + classPrefix + "-scaling-select"));
  this.cropXSelect = this.elm.querySelector(("select." + classPrefix + "-crop-x-select"));
  this.cropYSelect = this.elm.querySelector(("select." + classPrefix + "-crop-y-select"));

  var loadBtn = this.elm.querySelector(("." + loadBtnClass));
  loadBtn.addEventListener('click', function () {
    this$1.hide();
    this$1.resolve({
      imageScaling: this$1.scalingSelect.value,
      imageCropping: {
        x: this$1.cropXSelect.value,
        y: this$1.cropYSelect.value
      }
    });
  });
  var cancelBtn = this.elm.querySelector(("." + cancelLoadBtnClass));
  cancelBtn.addEventListener('click', function () {
    this$1.hide();
    this$1.reject();
  });
};
LoadImgDialog.prototype.load = function load (img) {
    var this$1 = this;

  return new Promise(function (res, rej) {
    this$1.resolve = res;
    this$1.reject = rej;

    this$1.parentNode.appendChild(this$1.elm);
  });
};
LoadImgDialog.prototype.hide = function hide () {
  this.parentNode.removeChild(this.elm);
};

/* MIT license */

var conversions = {
  rgb2hsl: rgb2hsl,
  rgb2hsv: rgb2hsv,
  rgb2hwb: rgb2hwb,
  rgb2cmyk: rgb2cmyk,
  rgb2keyword: rgb2keyword,
  rgb2xyz: rgb2xyz,
  rgb2lab: rgb2lab,
  rgb2lch: rgb2lch,

  hsl2rgb: hsl2rgb,
  hsl2hsv: hsl2hsv,
  hsl2hwb: hsl2hwb,
  hsl2cmyk: hsl2cmyk,
  hsl2keyword: hsl2keyword,

  hsv2rgb: hsv2rgb,
  hsv2hsl: hsv2hsl,
  hsv2hwb: hsv2hwb,
  hsv2cmyk: hsv2cmyk,
  hsv2keyword: hsv2keyword,

  hwb2rgb: hwb2rgb,
  hwb2hsl: hwb2hsl,
  hwb2hsv: hwb2hsv,
  hwb2cmyk: hwb2cmyk,
  hwb2keyword: hwb2keyword,

  cmyk2rgb: cmyk2rgb,
  cmyk2hsl: cmyk2hsl,
  cmyk2hsv: cmyk2hsv,
  cmyk2hwb: cmyk2hwb,
  cmyk2keyword: cmyk2keyword,

  keyword2rgb: keyword2rgb,
  keyword2hsl: keyword2hsl,
  keyword2hsv: keyword2hsv,
  keyword2hwb: keyword2hwb,
  keyword2cmyk: keyword2cmyk,
  keyword2lab: keyword2lab,
  keyword2xyz: keyword2xyz,

  xyz2rgb: xyz2rgb,
  xyz2lab: xyz2lab,
  xyz2lch: xyz2lch,

  lab2xyz: lab2xyz,
  lab2rgb: lab2rgb,
  lab2lch: lab2lch,

  lch2lab: lch2lab,
  lch2xyz: lch2xyz,
  lch2rgb: lch2rgb
};


function rgb2hsl(rgb) {
  var r = rgb[0]/255,
      g = rgb[1]/255,
      b = rgb[2]/255,
      min = Math.min(r, g, b),
      max = Math.max(r, g, b),
      delta = max - min,
      h, s, l;

  if (max == min)
    { h = 0; }
  else if (r == max)
    { h = (g - b) / delta; }
  else if (g == max)
    { h = 2 + (b - r) / delta; }
  else if (b == max)
    { h = 4 + (r - g)/ delta; }

  h = Math.min(h * 60, 360);

  if (h < 0)
    { h += 360; }

  l = (min + max) / 2;

  if (max == min)
    { s = 0; }
  else if (l <= 0.5)
    { s = delta / (max + min); }
  else
    { s = delta / (2 - max - min); }

  return [h, s * 100, l * 100];
}

function rgb2hsv(rgb) {
  var r = rgb[0],
      g = rgb[1],
      b = rgb[2],
      min = Math.min(r, g, b),
      max = Math.max(r, g, b),
      delta = max - min,
      h, s, v;

  if (max == 0)
    { s = 0; }
  else
    { s = (delta/max * 1000)/10; }

  if (max == min)
    { h = 0; }
  else if (r == max)
    { h = (g - b) / delta; }
  else if (g == max)
    { h = 2 + (b - r) / delta; }
  else if (b == max)
    { h = 4 + (r - g) / delta; }

  h = Math.min(h * 60, 360);

  if (h < 0)
    { h += 360; }

  v = ((max / 255) * 1000) / 10;

  return [h, s, v];
}

function rgb2hwb(rgb) {
  var r = rgb[0],
      g = rgb[1],
      b = rgb[2],
      h = rgb2hsl(rgb)[0],
      w = 1/255 * Math.min(r, Math.min(g, b)),
      b = 1 - 1/255 * Math.max(r, Math.max(g, b));

  return [h, w * 100, b * 100];
}

function rgb2cmyk(rgb) {
  var r = rgb[0] / 255,
      g = rgb[1] / 255,
      b = rgb[2] / 255,
      c, m, y, k;

  k = Math.min(1 - r, 1 - g, 1 - b);
  c = (1 - r - k) / (1 - k) || 0;
  m = (1 - g - k) / (1 - k) || 0;
  y = (1 - b - k) / (1 - k) || 0;
  return [c * 100, m * 100, y * 100, k * 100];
}

function rgb2keyword(rgb) {
  return reverseKeywords[JSON.stringify(rgb)];
}

function rgb2xyz(rgb) {
  var r = rgb[0] / 255,
      g = rgb[1] / 255,
      b = rgb[2] / 255;

  // assume sRGB
  r = r > 0.04045 ? Math.pow(((r + 0.055) / 1.055), 2.4) : (r / 12.92);
  g = g > 0.04045 ? Math.pow(((g + 0.055) / 1.055), 2.4) : (g / 12.92);
  b = b > 0.04045 ? Math.pow(((b + 0.055) / 1.055), 2.4) : (b / 12.92);

  var x = (r * 0.4124) + (g * 0.3576) + (b * 0.1805);
  var y = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
  var z = (r * 0.0193) + (g * 0.1192) + (b * 0.9505);

  return [x * 100, y *100, z * 100];
}

function rgb2lab(rgb) {
  var xyz = rgb2xyz(rgb),
        x = xyz[0],
        y = xyz[1],
        z = xyz[2],
        l, a, b;

  x /= 95.047;
  y /= 100;
  z /= 108.883;

  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16 / 116);
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16 / 116);
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16 / 116);

  l = (116 * y) - 16;
  a = 500 * (x - y);
  b = 200 * (y - z);

  return [l, a, b];
}

function rgb2lch(args) {
  return lab2lch(rgb2lab(args));
}

function hsl2rgb(hsl) {
  var h = hsl[0] / 360,
      s = hsl[1] / 100,
      l = hsl[2] / 100,
      t1, t2, t3, rgb, val;

  if (s == 0) {
    val = l * 255;
    return [val, val, val];
  }

  if (l < 0.5)
    { t2 = l * (1 + s); }
  else
    { t2 = l + s - l * s; }
  t1 = 2 * l - t2;

  rgb = [0, 0, 0];
  for (var i = 0; i < 3; i++) {
    t3 = h + 1 / 3 * - (i - 1);
    t3 < 0 && t3++;
    t3 > 1 && t3--;

    if (6 * t3 < 1)
      { val = t1 + (t2 - t1) * 6 * t3; }
    else if (2 * t3 < 1)
      { val = t2; }
    else if (3 * t3 < 2)
      { val = t1 + (t2 - t1) * (2 / 3 - t3) * 6; }
    else
      { val = t1; }

    rgb[i] = val * 255;
  }

  return rgb;
}

function hsl2hsv(hsl) {
  var h = hsl[0],
      s = hsl[1] / 100,
      l = hsl[2] / 100,
      sv, v;

  if(l === 0) {
      // no need to do calc on black
      // also avoids divide by 0 error
      return [0, 0, 0];
  }

  l *= 2;
  s *= (l <= 1) ? l : 2 - l;
  v = (l + s) / 2;
  sv = (2 * s) / (l + s);
  return [h, sv * 100, v * 100];
}

function hsl2hwb(args) {
  return rgb2hwb(hsl2rgb(args));
}

function hsl2cmyk(args) {
  return rgb2cmyk(hsl2rgb(args));
}

function hsl2keyword(args) {
  return rgb2keyword(hsl2rgb(args));
}


function hsv2rgb(hsv) {
  var h = hsv[0] / 60,
      s = hsv[1] / 100,
      v = hsv[2] / 100,
      hi = Math.floor(h) % 6;

  var f = h - Math.floor(h),
      p = 255 * v * (1 - s),
      q = 255 * v * (1 - (s * f)),
      t = 255 * v * (1 - (s * (1 - f))),
      v = 255 * v;

  switch(hi) {
    case 0:
      return [v, t, p];
    case 1:
      return [q, v, p];
    case 2:
      return [p, v, t];
    case 3:
      return [p, q, v];
    case 4:
      return [t, p, v];
    case 5:
      return [v, p, q];
  }
}

function hsv2hsl(hsv) {
  var h = hsv[0],
      s = hsv[1] / 100,
      v = hsv[2] / 100,
      sl, l;

  l = (2 - s) * v;
  sl = s * v;
  sl /= (l <= 1) ? l : 2 - l;
  sl = sl || 0;
  l /= 2;
  return [h, sl * 100, l * 100];
}

function hsv2hwb(args) {
  return rgb2hwb(hsv2rgb(args))
}

function hsv2cmyk(args) {
  return rgb2cmyk(hsv2rgb(args));
}

function hsv2keyword(args) {
  return rgb2keyword(hsv2rgb(args));
}

// http://dev.w3.org/csswg/css-color/#hwb-to-rgb
function hwb2rgb(hwb) {
  var h = hwb[0] / 360,
      wh = hwb[1] / 100,
      bl = hwb[2] / 100,
      ratio = wh + bl,
      i, v, f, n;

  // wh + bl cant be > 1
  if (ratio > 1) {
    wh /= ratio;
    bl /= ratio;
  }

  i = Math.floor(6 * h);
  v = 1 - bl;
  f = 6 * h - i;
  if ((i & 0x01) != 0) {
    f = 1 - f;
  }
  n = wh + f * (v - wh);  // linear interpolation

  switch (i) {
    default:
    case 6:
    case 0: r = v; g = n; b = wh; break;
    case 1: r = n; g = v; b = wh; break;
    case 2: r = wh; g = v; b = n; break;
    case 3: r = wh; g = n; b = v; break;
    case 4: r = n; g = wh; b = v; break;
    case 5: r = v; g = wh; b = n; break;
  }

  return [r * 255, g * 255, b * 255];
}

function hwb2hsl(args) {
  return rgb2hsl(hwb2rgb(args));
}

function hwb2hsv(args) {
  return rgb2hsv(hwb2rgb(args));
}

function hwb2cmyk(args) {
  return rgb2cmyk(hwb2rgb(args));
}

function hwb2keyword(args) {
  return rgb2keyword(hwb2rgb(args));
}

function cmyk2rgb(cmyk) {
  var c = cmyk[0] / 100,
      m = cmyk[1] / 100,
      y = cmyk[2] / 100,
      k = cmyk[3] / 100,
      r, g, b;

  r = 1 - Math.min(1, c * (1 - k) + k);
  g = 1 - Math.min(1, m * (1 - k) + k);
  b = 1 - Math.min(1, y * (1 - k) + k);
  return [r * 255, g * 255, b * 255];
}

function cmyk2hsl(args) {
  return rgb2hsl(cmyk2rgb(args));
}

function cmyk2hsv(args) {
  return rgb2hsv(cmyk2rgb(args));
}

function cmyk2hwb(args) {
  return rgb2hwb(cmyk2rgb(args));
}

function cmyk2keyword(args) {
  return rgb2keyword(cmyk2rgb(args));
}


function xyz2rgb(xyz) {
  var x = xyz[0] / 100,
      y = xyz[1] / 100,
      z = xyz[2] / 100,
      r, g, b;

  r = (x * 3.2406) + (y * -1.5372) + (z * -0.4986);
  g = (x * -0.9689) + (y * 1.8758) + (z * 0.0415);
  b = (x * 0.0557) + (y * -0.2040) + (z * 1.0570);

  // assume sRGB
  r = r > 0.0031308 ? ((1.055 * Math.pow(r, 1.0 / 2.4)) - 0.055)
    : r = (r * 12.92);

  g = g > 0.0031308 ? ((1.055 * Math.pow(g, 1.0 / 2.4)) - 0.055)
    : g = (g * 12.92);

  b = b > 0.0031308 ? ((1.055 * Math.pow(b, 1.0 / 2.4)) - 0.055)
    : b = (b * 12.92);

  r = Math.min(Math.max(0, r), 1);
  g = Math.min(Math.max(0, g), 1);
  b = Math.min(Math.max(0, b), 1);

  return [r * 255, g * 255, b * 255];
}

function xyz2lab(xyz) {
  var x = xyz[0],
      y = xyz[1],
      z = xyz[2],
      l, a, b;

  x /= 95.047;
  y /= 100;
  z /= 108.883;

  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16 / 116);
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16 / 116);
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16 / 116);

  l = (116 * y) - 16;
  a = 500 * (x - y);
  b = 200 * (y - z);

  return [l, a, b];
}

function xyz2lch(args) {
  return lab2lch(xyz2lab(args));
}

function lab2xyz(lab) {
  var l = lab[0],
      a = lab[1],
      b = lab[2],
      x, y, z, y2;

  if (l <= 8) {
    y = (l * 100) / 903.3;
    y2 = (7.787 * (y / 100)) + (16 / 116);
  } else {
    y = 100 * Math.pow((l + 16) / 116, 3);
    y2 = Math.pow(y / 100, 1/3);
  }

  x = x / 95.047 <= 0.008856 ? x = (95.047 * ((a / 500) + y2 - (16 / 116))) / 7.787 : 95.047 * Math.pow((a / 500) + y2, 3);

  z = z / 108.883 <= 0.008859 ? z = (108.883 * (y2 - (b / 200) - (16 / 116))) / 7.787 : 108.883 * Math.pow(y2 - (b / 200), 3);

  return [x, y, z];
}

function lab2lch(lab) {
  var l = lab[0],
      a = lab[1],
      b = lab[2],
      hr, h, c;

  hr = Math.atan2(b, a);
  h = hr * 360 / 2 / Math.PI;
  if (h < 0) {
    h += 360;
  }
  c = Math.sqrt(a * a + b * b);
  return [l, c, h];
}

function lab2rgb(args) {
  return xyz2rgb(lab2xyz(args));
}

function lch2lab(lch) {
  var l = lch[0],
      c = lch[1],
      h = lch[2],
      a, b, hr;

  hr = h / 360 * 2 * Math.PI;
  a = c * Math.cos(hr);
  b = c * Math.sin(hr);
  return [l, a, b];
}

function lch2xyz(args) {
  return lab2xyz(lch2lab(args));
}

function lch2rgb(args) {
  return lab2rgb(lch2lab(args));
}

function keyword2rgb(keyword) {
  return cssKeywords[keyword];
}

function keyword2hsl(args) {
  return rgb2hsl(keyword2rgb(args));
}

function keyword2hsv(args) {
  return rgb2hsv(keyword2rgb(args));
}

function keyword2hwb(args) {
  return rgb2hwb(keyword2rgb(args));
}

function keyword2cmyk(args) {
  return rgb2cmyk(keyword2rgb(args));
}

function keyword2lab(args) {
  return rgb2lab(keyword2rgb(args));
}

function keyword2xyz(args) {
  return rgb2xyz(keyword2rgb(args));
}

var cssKeywords = {
  aliceblue:  [240,248,255],
  antiquewhite: [250,235,215],
  aqua: [0,255,255],
  aquamarine: [127,255,212],
  azure:  [240,255,255],
  beige:  [245,245,220],
  bisque: [255,228,196],
  black:  [0,0,0],
  blanchedalmond: [255,235,205],
  blue: [0,0,255],
  blueviolet: [138,43,226],
  brown:  [165,42,42],
  burlywood:  [222,184,135],
  cadetblue:  [95,158,160],
  chartreuse: [127,255,0],
  chocolate:  [210,105,30],
  coral:  [255,127,80],
  cornflowerblue: [100,149,237],
  cornsilk: [255,248,220],
  crimson:  [220,20,60],
  cyan: [0,255,255],
  darkblue: [0,0,139],
  darkcyan: [0,139,139],
  darkgoldenrod:  [184,134,11],
  darkgray: [169,169,169],
  darkgreen:  [0,100,0],
  darkgrey: [169,169,169],
  darkkhaki:  [189,183,107],
  darkmagenta:  [139,0,139],
  darkolivegreen: [85,107,47],
  darkorange: [255,140,0],
  darkorchid: [153,50,204],
  darkred:  [139,0,0],
  darksalmon: [233,150,122],
  darkseagreen: [143,188,143],
  darkslateblue:  [72,61,139],
  darkslategray:  [47,79,79],
  darkslategrey:  [47,79,79],
  darkturquoise:  [0,206,209],
  darkviolet: [148,0,211],
  deeppink: [255,20,147],
  deepskyblue:  [0,191,255],
  dimgray:  [105,105,105],
  dimgrey:  [105,105,105],
  dodgerblue: [30,144,255],
  firebrick:  [178,34,34],
  floralwhite:  [255,250,240],
  forestgreen:  [34,139,34],
  fuchsia:  [255,0,255],
  gainsboro:  [220,220,220],
  ghostwhite: [248,248,255],
  gold: [255,215,0],
  goldenrod:  [218,165,32],
  gray: [128,128,128],
  green:  [0,128,0],
  greenyellow:  [173,255,47],
  grey: [128,128,128],
  honeydew: [240,255,240],
  hotpink:  [255,105,180],
  indianred:  [205,92,92],
  indigo: [75,0,130],
  ivory:  [255,255,240],
  khaki:  [240,230,140],
  lavender: [230,230,250],
  lavenderblush:  [255,240,245],
  lawngreen:  [124,252,0],
  lemonchiffon: [255,250,205],
  lightblue:  [173,216,230],
  lightcoral: [240,128,128],
  lightcyan:  [224,255,255],
  lightgoldenrodyellow: [250,250,210],
  lightgray:  [211,211,211],
  lightgreen: [144,238,144],
  lightgrey:  [211,211,211],
  lightpink:  [255,182,193],
  lightsalmon:  [255,160,122],
  lightseagreen:  [32,178,170],
  lightskyblue: [135,206,250],
  lightslategray: [119,136,153],
  lightslategrey: [119,136,153],
  lightsteelblue: [176,196,222],
  lightyellow:  [255,255,224],
  lime: [0,255,0],
  limegreen:  [50,205,50],
  linen:  [250,240,230],
  magenta:  [255,0,255],
  maroon: [128,0,0],
  mediumaquamarine: [102,205,170],
  mediumblue: [0,0,205],
  mediumorchid: [186,85,211],
  mediumpurple: [147,112,219],
  mediumseagreen: [60,179,113],
  mediumslateblue:  [123,104,238],
  mediumspringgreen:  [0,250,154],
  mediumturquoise:  [72,209,204],
  mediumvioletred:  [199,21,133],
  midnightblue: [25,25,112],
  mintcream:  [245,255,250],
  mistyrose:  [255,228,225],
  moccasin: [255,228,181],
  navajowhite:  [255,222,173],
  navy: [0,0,128],
  oldlace:  [253,245,230],
  olive:  [128,128,0],
  olivedrab:  [107,142,35],
  orange: [255,165,0],
  orangered:  [255,69,0],
  orchid: [218,112,214],
  palegoldenrod:  [238,232,170],
  palegreen:  [152,251,152],
  paleturquoise:  [175,238,238],
  palevioletred:  [219,112,147],
  papayawhip: [255,239,213],
  peachpuff:  [255,218,185],
  peru: [205,133,63],
  pink: [255,192,203],
  plum: [221,160,221],
  powderblue: [176,224,230],
  purple: [128,0,128],
  rebeccapurple: [102, 51, 153],
  red:  [255,0,0],
  rosybrown:  [188,143,143],
  royalblue:  [65,105,225],
  saddlebrown:  [139,69,19],
  salmon: [250,128,114],
  sandybrown: [244,164,96],
  seagreen: [46,139,87],
  seashell: [255,245,238],
  sienna: [160,82,45],
  silver: [192,192,192],
  skyblue:  [135,206,235],
  slateblue:  [106,90,205],
  slategray:  [112,128,144],
  slategrey:  [112,128,144],
  snow: [255,250,250],
  springgreen:  [0,255,127],
  steelblue:  [70,130,180],
  tan:  [210,180,140],
  teal: [0,128,128],
  thistle:  [216,191,216],
  tomato: [255,99,71],
  turquoise:  [64,224,208],
  violet: [238,130,238],
  wheat:  [245,222,179],
  white:  [255,255,255],
  whitesmoke: [245,245,245],
  yellow: [255,255,0],
  yellowgreen:  [154,205,50]
};

var reverseKeywords = {};
for (var key in cssKeywords) {
  reverseKeywords[JSON.stringify(cssKeywords[key])] = key;
}

var convert = function() {
   return new Converter();
};

for (var func in conversions) {
  // export Raw versions
  convert[func + "Raw"] =  (function(func) {
    // accept array or plain args
    return function(arg) {
      if (typeof arg == "number")
        { arg = Array.prototype.slice.call(arguments); }
      return conversions[func](arg);
    }
  })(func);

  var pair = /(\w+)2(\w+)/.exec(func),
      from = pair[1],
      to = pair[2];

  // export rgb2hsl and ["rgb"]["hsl"]
  convert[from] = convert[from] || {};

  convert[from][to] = convert[func] = (function(func) { 
    return function(arg) {
      if (typeof arg == "number")
        { arg = Array.prototype.slice.call(arguments); }
      
      var val = conversions[func](arg);
      if (typeof val == "string" || val === undefined)
        { return val; } // keyword

      for (var i = 0; i < val.length; i++)
        { val[i] = Math.round(val[i]); }
      return val;
    }
  })(func);
}


/* Converter does lazy conversion and caching */
var Converter = function() {
   this.convs = {};
};

/* Either get the values for a space or
  set the values for a space, depending on args */
Converter.prototype.routeSpace = function(space, args) {
   var values = args[0];
   if (values === undefined) {
      // color.rgb()
      return this.getValues(space);
   }
   // color.rgb(10, 10, 10)
   if (typeof values == "number") {
      values = Array.prototype.slice.call(args);        
   }

   return this.setValues(space, values);
};
  
/* Set the values for a space, invalidating cache */
Converter.prototype.setValues = function(space, values) {
   this.space = space;
   this.convs = {};
   this.convs[space] = values;
   return this;
};

/* Get the values for a space. If there's already
  a conversion for the space, fetch it, otherwise
  compute it */
Converter.prototype.getValues = function(space) {
   var vals = this.convs[space];
   if (!vals) {
      var fspace = this.space,
          from = this.convs[fspace];
      vals = convert[fspace][space](from);

      this.convs[space] = vals;
   }
  return vals;
};

["rgb", "hsl", "hsv", "cmyk", "keyword"].forEach(function(space) {
   Converter.prototype[space] = function(vals) {
      return this.routeSpace(space, arguments);
   };
});

var index$1 = convert;

var index = function (cstr) {
    var m, conv, parts, alpha;
    if (m = /^((?:rgb|hs[lv]|cmyk|xyz|lab)a?)\s*\(([^\)]*)\)/.exec(cstr)) {
        var name = m[1];
        var base = name.replace(/a$/, '');
        var size = base === 'cmyk' ? 4 : 3;
        conv = index$1[base];
        
        parts = m[2].replace(/^\s+|\s+$/g, '')
            .split(/\s*,\s*/)
            .map(function (x, i) {
                if (/%$/.test(x) && i === size) {
                    return parseFloat(x) / 100;
                }
                else if (/%$/.test(x)) {
                    return parseFloat(x);
                }
                return parseFloat(x);
            })
        ;
        if (name === base) { parts.push(1); }
        alpha = parts[size] === undefined ? 1 : parts[size];
        parts = parts.slice(0, size);
        
        conv[base] = function () { return parts };
    }
    else if (/^#[A-Fa-f0-9]+$/.test(cstr)) {
        var base = cstr.replace(/^#/,'');
        var size = base.length;
        conv = index$1.rgb;
        parts = base.split(size === 3 ? /(.)/ : /(..)/);
        parts = parts.filter(Boolean)
            .map(function (x) {
                if (size === 3) {
                    return parseInt(x + x, 16);
                }
                else {
                    return parseInt(x, 16)
                }
            })
        ;
        alpha = 1;
        conv.rgb = function () { return parts };
        if (!parts[0]) { parts[0] = 0; }
        if (!parts[1]) { parts[1] = 0; }
        if (!parts[2]) { parts[2] = 0; }
    }
    else {
        conv = index$1.keyword;
        conv.keyword = function () { return cstr };
        parts = cstr;
        alpha = 1;
    }
    
    var res = {
        rgb: undefined,
        hsl: undefined,
        hsv: undefined,
        cmyk: undefined,
        keyword: undefined,
        hex: undefined
    };
    try { res.rgb = conv.rgb(parts); } catch (e) {}
    try { res.hsl = conv.hsl(parts); } catch (e) {}
    try { res.hsv = conv.hsv(parts); } catch (e) {}
    try { res.cmyk = conv.cmyk(parts); } catch (e) {}
    try { res.keyword = conv.keyword(parts); } catch (e) {}
    
    if (res.rgb) { res.hex = '#' + res.rgb.map(function (x) {
        var s = x.toString(16);
        if (s.length === 1) { return '0' + s; }
        return s;
    }).join(''); }
    
    if (res.rgb) { res.rgba = res.rgb.concat(alpha); }
    if (res.hsl) { res.hsla = res.hsl.concat(alpha); }
    if (res.hsv) { res.hsva = res.hsv.concat(alpha); }
    if (res.cmyk) { res.cmyka = res.cmyk.concat(alpha); }
    
    return res;
};

var Config = {
  timestamp:             '2017-10-21T19:12:10.627Z',
  git_rev:               'a0b881b',
  export_schema_version: 0
};

var EffectConfigDialog = function EffectConfigDialog() {
  var this$1 = this;

  var okBtnClass = 'effect-config-dialog-ok';
  var cancelBtnClass = 'effect-config-dialog-cancel';
  var deleteBtnClass = 'effect-config-dialog-delete';
  var startTimeInputClass = 'effect-config-dialog-starttime';
  var endTimeInputClass = 'effect-config-dialog-endtime';
  var repetitionsInputClass = 'effect-config-dialog-repetitions';
  this.parentNode = document.getElementById('modal-container');
  this.element = parseHtml(("\n      <div class=\"effect-config-dialog-backdrop\">\n        <div class=\"effect-config-dialog\">\n          <label>\n            Begin: <input type=\"number\" min=\"0\" step=\"1\" class=\"" + startTimeInputClass + "\"/>ms\n          </label><br/>\n          <label>\n            End: <input type=\"number\" min=\"0\" step=\"1\" class=\"" + endTimeInputClass + "\"/>ms\n          </label><br/>\n          <label>\n            Repetitions: <input type=\"number\" class=\"" + repetitionsInputClass + "\"/>\n          </label><br/>\n          <button type=\"button\" class=\"" + okBtnClass + "\">Ok</button>\n          <button type=\"button\" class=\"" + cancelBtnClass + "\">Cancel</button>\n          <button type=\"button\" class=\"" + deleteBtnClass + "\">Delete effect</button>\n        </div>\n      </div>\n    "));
  this.okBtn = this.element.querySelector(("." + okBtnClass));
  this.cancelBtn = this.element.querySelector(("." + cancelBtnClass));
  this.deleteBtn = this.element.querySelector(("." + deleteBtnClass));
  this.dialog = this.element.querySelector('.effect-config-dialog');

  this.startTimeInput = this.element.querySelector(("." + startTimeInputClass));
  this.endTimeInput = this.element.querySelector(("." + endTimeInputClass));
  this.repetitionsInput = this.element.querySelector(("." + repetitionsInputClass));

  this.okBtn.addEventListener('click', function (evt) {
    evt.stopPropagation();
    this$1.hide();
    this$1.ui.getConfigAsync()
    .then(function (config) {
      this$1.resolve({
        config:    config,
        timeBegin: parseInt(this$1.startTimeInput.value, 10),
        timeEnd:   parseInt(this$1.endTimeInput.value, 10),
        repetitions: parseInt(this$1.repetitionsInput.value, 10),
      });
    });
  });
  this.cancelBtn.addEventListener('click', function (evt) {
    evt.stopPropagation();
    this$1.hide();
    this$1.reject(false);
  });
  this.deleteBtn.addEventListener('click', function (evt) {
    evt.stopPropagation();
    this$1.hide();
    this$1.reject(true);
  });
};

EffectConfigDialog.prototype.show = function show () {
  this.parentNode.appendChild(this.element);
};
EffectConfigDialog.prototype.hide = function hide () {
  this.dialog.removeChild(this.ui.getElement());
  this.parentNode.removeChild(this.element);
};
EffectConfigDialog.prototype.promptUser = function promptUser (entry) {
    var this$1 = this;

  return new Promise(function (res, rej) {
    this$1.resolve = res;
    this$1.reject = rej;
    var ui = entry.effect.getConfigUI();
    ui.applyConfig(entry.config);
    this$1.startTimeInput.value = entry.timeBegin;
    this$1.endTimeInput.value = entry.timeEnd;
    this$1.repetitionsInput.value = entry.repetitions;
    if (entry.effect.isEventOnly()) {
      this$1.endTimeInput.parentNode.style.display = 'none';
      this$1.repetitionsInput.parentNode.style.display = 'none';
    } else {
      this$1.endTimeInput.parentNode.style.display = 'inline';
      this$1.repetitionsInput.parentNode.style.display =entry.effect.supportsRepetition() ? 'inline' : 'none';
    }
    this$1.ui = ui;
    this$1.dialog.prepend(ui.getElement());
    this$1.show();
  });
};

/**
 * Interface for effects
 */
var Effect = function Effect () {};

Effect.register = function register (/* instance, props, uniforms, vertexShader, fragmentShader, attributes */) {
  throw new Error('Method not implemented');
};

Effect.registerAsync = function registerAsync (instance, props, uniforms, vertexShader, fragmentShader, attributes) {
  this.register(instance, props, uniforms, vertexShader, fragmentShader, attributes);
  return Promise.resolve();
};

Effect.getId = function getId () {
  // Static + this = JS <3
  return this.name;
};

Effect.getDisplayName = function getDisplayName () {
  throw new Error('Method not implemented');
};

Effect.getConfigUI = function getConfigUI () {
  throw new Error('Method not implemented');
};

Effect.getDefaultConfig = function getDefaultConfig () {
  throw new Error('Method not implemented');
};

Effect.getRandomConfig = function getRandomConfig () {
  throw new Error('Method not implemented');
};

Effect.getDescription = function getDescription () {
  throw new Error('Method not implemented');
};

Effect.supportsRepetition = function supportsRepetition () {
  return true;
};

Effect.isEventOnly = function isEventOnly () {
  return false;
};

/**
 * Interface for config UIs
 */
var ConfigUI = function ConfigUI () {};

ConfigUI.prototype.getElement = function getElement () {
  throw new Error('Method not implemented');
};
// eslint-disable-next-line class-methods-use-this
ConfigUI.prototype.getConfig = function getConfig () {
  throw new Error('Method not implemented');
};

ConfigUI.prototype.getConfigAsync = function getConfigAsync () {
    var this$1 = this;

  return new Promise(function (resolve) {
    resolve(this$1.getConfig());
  });
};

// eslint-disable-next-line class-methods-use-this
ConfigUI.prototype.applyConfig = function applyConfig (/* config */) {
  throw new Error('Method not implemented');
};

// eslint-disable-next-line class-methods-use-this
ConfigUI.prototype.notifyChange = function notifyChange () {
  // TODO
};

function fract(x) {
  return x - Math.floor(x);
}

var EffectName = 'Displace by hue';
var EffectDescription = 'Particles move into different directions depending on their hue';

var HueDisplaceConfigUI = (function (ConfigUI$$1) {
  function HueDisplaceConfigUI() {
    var this$1 = this;

    ConfigUI$$1.call(this);
    this.element = parseHtml(("\n      <fieldset>\n        <legend>" + EffectName + "</legend>\n        <label>\n          Distance:\n          <input type=\"number\" class=\"effect-hue-displace-distance\" value=\"10\" />\n        </label><br/>\n        <label>\n          Scale by brightness:\n          <input type=\"number\" class=\"effect-hue-displace-scale-by-value\" value=\"0\" />%\n        </label><br/>\n        <label>\n          Random direction offset:\n          <input type=\"checkbox\" class=\"effect-hue-displace-random-direction-offset\"/>\n        </label><br/>\n        <label>\n          Rotate:\n          <input type=\"number\" class=\"effect-hue-displace-rotate\" value=\"0\" />%\n        </label>\n      </fieldset>\n    "));
    var ui = this.element;
    this.distanceInput = ui.querySelector('input.effect-hue-displace-distance');
    this.scaleByValInput = ui.querySelector('input.effect-hue-displace-scale-by-value');
    this.randomOffsetInput = ui.querySelector('input.effect-hue-displace-random-direction-offset');
    this.rotateInput = ui.querySelector('input.effect-hue-displace-rotate');

    this.distanceInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.scaleByValInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.randomOffsetInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.rotateInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
  }

  if ( ConfigUI$$1 ) HueDisplaceConfigUI.__proto__ = ConfigUI$$1;
  HueDisplaceConfigUI.prototype = Object.create( ConfigUI$$1 && ConfigUI$$1.prototype );
  HueDisplaceConfigUI.prototype.constructor = HueDisplaceConfigUI;

  HueDisplaceConfigUI.prototype.getElement = function getElement () {
    return this.element;
  };

  HueDisplaceConfigUI.prototype.getConfig = function getConfig () {
    var config = {};
    config.distance = parseInt(this.distanceInput.value, 10) / 100;
    config.scaleByValue = parseInt(this.scaleByValInput.value, 10) / 100;
    config.randomDirectionOffset = this.randomOffsetInput.checked;
    config.rotate = parseInt(this.rotateInput.value, 10) / 100;

    return config;
  };

  HueDisplaceConfigUI.prototype.applyConfig = function applyConfig (config) {
    this.distanceInput.value = config.distance * 100;
    this.scaleByValInput.value = config.scaleByValue * 100;
    this.randomOffsetInput.checked = config.randomDirectionOffset;
    this.rotateInput.value = config.rotate * 100;
  };

  return HueDisplaceConfigUI;
}(ConfigUI));

var HueDisplaceEffect = (function (Effect$$1) {
  function HueDisplaceEffect () {
    Effect$$1.apply(this, arguments);
  }

  if ( Effect$$1 ) HueDisplaceEffect.__proto__ = Effect$$1;
  HueDisplaceEffect.prototype = Object.create( Effect$$1 && Effect$$1.prototype );
  HueDisplaceEffect.prototype.constructor = HueDisplaceEffect;

  HueDisplaceEffect.register = function register (instance, props, uniforms, vertexShader) {
    if (instance.config.distance !== 0) {
      var distance = uniforms.addUniform('hueDisplaceDistance', 'float', instance.config.distance);
      var time = uniforms.addUniform('hueDisplaceTime', 'float', function (ctx, props) { return ((props.clock.getTime() - instance.timeBegin) / instance.getPeriod()) * 2 * Math.PI; });
      var directionOffset = uniforms.addUniform('hueDisplaceDirectionOffset', 'float', function (ctx, props) {
        var result = instance.config.rotate *
          ((props.clock.getTime() - instance.timeBegin) / instance.getPeriod()) * 2 * Math.PI;
        if (instance.config.randomDirectionOffset) {
          if (instance.config.randomDirectionOffsetValue === undefined) {
            // eslint-disable-next-line no-param-reassign
            instance.config.randomDirectionOffsetValue = Math.random() * 2 * Math.PI;
          }
          result += instance.config.randomDirectionOffsetValue;
        }

        return result;
      });
      var scaleByVal = uniforms.addUniform('hueDisplaceScaleByValue', 'float', instance.config.scaleByValue);
      // eslint-disable-next-line no-param-reassign
      vertexShader.mainBody += "\n        float angle = hsv[0] + " + directionOffset + ";\n        float offset = (-cos(" + time + ") + 1.) / 2.;\n        position.xy += offset * getDirectionVector(angle) * " + distance + " * (1. - " + scaleByVal + " * (1. - hsv[2]));\n      ";
    }
  };

  HueDisplaceEffect.getDisplayName = function getDisplayName () {
    return EffectName;
  };

  HueDisplaceEffect.getDescription = function getDescription () {
    return EffectDescription;
  };

  HueDisplaceEffect.getConfigUI = function getConfigUI () {
    if (!this._configUI) {
      this._configUI = new HueDisplaceConfigUI();
    }

    return this._configUI;
  };

  HueDisplaceEffect.getDefaultConfig = function getDefaultConfig () {
    return {
      distance:              0.1,
      scaleByValue:          0,
      randomDirectionOffset: false,
      rotate:                0
    };
  };

  HueDisplaceEffect.getRandomConfig = function getRandomConfig () {
    return {
      distance:              Math.random(),
      scaleByValue:          Math.random(),
      randomDirectionOffset: Math.random() > .5 ? true : false,
      rotate:                Math.random()
    };
  };

  return HueDisplaceEffect;
}(Effect));

var EffectName$1 = 'Converge to point';
var EffectDescription$1 = 'Particles are attracted towards the center of the screen';

var ConvergePointConfigUI = (function (ConfigUI$$1) {
  function ConvergePointConfigUI() {
    ConfigUI$$1.call(this);
    this.element = parseHtml(("\n      <fieldset>\n        <legend>" + EffectName$1 + "</legend>\n      </fieldset>\n    "));
    var ui = this.element;

  }

  if ( ConfigUI$$1 ) ConvergePointConfigUI.__proto__ = ConfigUI$$1;
  ConvergePointConfigUI.prototype = Object.create( ConfigUI$$1 && ConfigUI$$1.prototype );
  ConvergePointConfigUI.prototype.constructor = ConvergePointConfigUI;

  ConvergePointConfigUI.prototype.getElement = function getElement () {
    return this.element;
  };

  ConvergePointConfigUI.prototype.getConfig = function getConfig () {
    var config = {};

    return config;
  };

  ConvergePointConfigUI.prototype.applyConfig = function applyConfig (config) {
  };

  return ConvergePointConfigUI;
}(ConfigUI));

var ConvergePointEffect = (function (Effect$$1) {
  function ConvergePointEffect () {
    Effect$$1.apply(this, arguments);
  }

  if ( Effect$$1 ) ConvergePointEffect.__proto__ = Effect$$1;
  ConvergePointEffect.prototype = Object.create( Effect$$1 && Effect$$1.prototype );
  ConvergePointEffect.prototype.constructor = ConvergePointEffect;

  ConvergePointEffect.register = function register (instance, props, uniforms, vertexShader) {
    var time = uniforms.addUniform('convergeTime', 'float', function (ctx, props) { return (props.clock.getTime() - instance.timeBegin) % instance.getPeriod(); });
    var speed = uniforms.addUniform('convergeSpeed', 'float', 2 * 2 / (instance.getPeriod() / 2 * instance.getPeriod() / 2));
    var maxTravelTime = uniforms.addUniform('convergeMaxTravelTime', 'float', instance.getPeriod() / 2);

    // eslint-disable-next-line no-param-reassign
    vertexShader.mainBody += "\n      {\n        vec2 screenTarget = vec2(0., 0.);\n        vec2 target = (screenTarget + vec2(1.)) / vec2(2.);\n\n        vec2 d = target - initialPosition.xy;\n        float d_len = length(d);\n\n        float stop_t = sqrt(2. * d_len / " + speed + ");\n\n        vec2 result;\n\n        if(" + time + " < stop_t) {\n          float t = min(" + time + ", stop_t);\n          result = .5 * d / d_len * " + speed + " * t * t;\n        } else if(" + time + " < " + maxTravelTime + ") {\n          result = d;\n        } else {\n          float t = " + time + " - " + maxTravelTime + ";\n          result = mix(d, vec2(0.), -cos(t / " + maxTravelTime + " * PI) * .5 + .5);\n        }\n\n        position.xy += result;\n      }\n    ";
  };

  ConvergePointEffect.getDisplayName = function getDisplayName () {
    return EffectName$1;
  };

  ConvergePointEffect.getDescription = function getDescription () {
    return EffectDescription$1;
  };

  ConvergePointEffect.getConfigUI = function getConfigUI () {
    if (!this._configUI) {
      this._configUI = new ConvergePointConfigUI();
    }

    return this._configUI;
  };

  ConvergePointEffect.getDefaultConfig = function getDefaultConfig () {
    return {
    };
  };

  ConvergePointEffect.getRandomConfig = function getRandomConfig () {
    return {
    };
  };

  return ConvergePointEffect;
}(Effect));

var EffectName$2 = 'Converge to circle';
var EffectDescription$2 = 'Particles are attracted towards their position on an HSV color wheel centered around the center of the screen';

var ConvergeCircleConfigUI = (function (ConfigUI$$1) {
  function ConvergeCircleConfigUI() {
    var this$1 = this;

    ConfigUI$$1.call(this);
    this.element = parseHtml(("\n      <fieldset>\n        <legend>" + EffectName$2 + "</legend>\n        <label>\n          Rotation speed:\n          <input type=\"number\" class=\"effect-converge-rotation-speed\" value=\"0\" />\n        </label>\n      </fieldset>\n    "));
    var ui = this.element;

    this.rotationSpeedInput = ui.querySelector('input.effect-converge-rotation-speed');
    this.rotationSpeedInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
  }

  if ( ConfigUI$$1 ) ConvergeCircleConfigUI.__proto__ = ConfigUI$$1;
  ConvergeCircleConfigUI.prototype = Object.create( ConfigUI$$1 && ConfigUI$$1.prototype );
  ConvergeCircleConfigUI.prototype.constructor = ConvergeCircleConfigUI;

  ConvergeCircleConfigUI.prototype.getElement = function getElement () {
    return this.element;
  };

  ConvergeCircleConfigUI.prototype.getConfig = function getConfig () {
    var config = {};
    config.rotationSpeed = parseInt(this.rotationSpeedInput.value, 10) / 100;

    return config;
  };

  ConvergeCircleConfigUI.prototype.applyConfig = function applyConfig (config) {
    this.rotationSpeedInput.checked = config.rotationSpeed * 100;
  };

  return ConvergeCircleConfigUI;
}(ConfigUI));

var ConvergeCircleEffect = (function (Effect$$1) {
  function ConvergeCircleEffect () {
    Effect$$1.apply(this, arguments);
  }

  if ( Effect$$1 ) ConvergeCircleEffect.__proto__ = Effect$$1;
  ConvergeCircleEffect.prototype = Object.create( Effect$$1 && Effect$$1.prototype );
  ConvergeCircleEffect.prototype.constructor = ConvergeCircleEffect;

  ConvergeCircleEffect.register = function register (instance, props, uniforms, vertexShader) {
    var time = uniforms.addUniform('convergeTime', 'float', function (ctx, props) { return (props.clock.getTime() - instance.timeBegin) % instance.getPeriod(); });
    var speed = uniforms.addUniform('convergeSpeed', 'float', 2 * 2 / (instance.getPeriod() / 2 * instance.getPeriod() / 2));
    var rotationSpeed = uniforms.addUniform('convergeRotationSpeed', 'float', instance.config.rotationSpeed / 1000);
    var maxTravelTime = uniforms.addUniform('convergeMaxTravelTime', 'float', instance.getPeriod() / 2);

    // eslint-disable-next-line no-param-reassign
    vertexShader.mainBody += "\n      {\n        vec2 screenTarget = getDirectionVector(hsv[0] + " + time + " * " + rotationSpeed + ") * vec2(.8) * vec2(invScreenAspectRatio, 1.);\n        vec2 target = (screenTarget.xy + vec2(1.)) / vec2(2.);\n\n        vec2 d = target - initialPosition.xy;\n        float d_len = length(d);\n        \n        float stop_t = sqrt(2. * d_len / " + speed + ");\n\n        vec2 result;\n\n        if(" + time + " < stop_t) {\n          float t = min(" + time + ", stop_t);\n          result = .5 * d / d_len * " + speed + " * t * t;\n        } else if(" + time + " < " + maxTravelTime + ") {\n          result = d;\n        } else {\n          float t = " + time + " - " + maxTravelTime + ";\n          //result = mix(d, vec2(0.), 1. - (1.-t) * (1.-t));\n          //result = mix(d, vec2(0.), t * t);\n          result = mix(d, vec2(0.), -cos(t / " + maxTravelTime + " * PI) * .5 + .5);\n        }\n\n        position.xy += result;\n      }\n    ";
  };

  ConvergeCircleEffect.getDisplayName = function getDisplayName () {
    return EffectName$2;
  };

  ConvergeCircleEffect.getDescription = function getDescription () {
    return EffectDescription$2;
  };

  ConvergeCircleEffect.getConfigUI = function getConfigUI () {
    if (!this._configUI) {
      this._configUI = new ConvergeCircleConfigUI();
    }

    return this._configUI;
  };

  ConvergeCircleEffect.getDefaultConfig = function getDefaultConfig () {
    return {
      rotationSpeed: 0
    };
  };

  ConvergeCircleEffect.getRandomConfig = function getRandomConfig () {
    return {
      rotationSpeed: Math.random()
    }
  };

  return ConvergeCircleEffect;
}(Effect));

var EffectName$3 = 'Wave';
var EffectDescription$3 = 'A wave passes through the particles from left to right over the screen';

var WaveConfigUI = (function (ConfigUI$$1) {
  function WaveConfigUI() {
    var this$1 = this;

    ConfigUI$$1.call(this);
    this.element = parseHtml(("\n      <fieldset>\n        <legend>" + EffectName$3 + "</legend>\n        <label>\n          Number of waves:\n          <input type=\"number\" min=\"1\" step=\"1\" value=\"1\" class=\"effect-wave-count\" />\n        </label><br/>\n        <label>\n          Amplitude:\n          <input type=\"number\" value=\"0.05\" class=\"effect-wave-amplitude\" />\n        </label>\n      </fieldset>\n    "));
    var ui = this.element;

    this.waveCountInput = ui.querySelector('input.effect-wave-count');
    this.waveCountInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.amplitudeInput = ui.querySelector('input.effect-wave-amplitude');
    this.amplitudeInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
  }

  if ( ConfigUI$$1 ) WaveConfigUI.__proto__ = ConfigUI$$1;
  WaveConfigUI.prototype = Object.create( ConfigUI$$1 && ConfigUI$$1.prototype );
  WaveConfigUI.prototype.constructor = WaveConfigUI;

  WaveConfigUI.prototype.getElement = function getElement () {
    return this.element;
  };

  WaveConfigUI.prototype.getConfig = function getConfig () {
    var config = {};

    config.multiplier = parseInt(this.waveCountInput.value, 10);
    config.amplitude = parseFloat(this.amplitudeInput.value, 10);
    
    return config;
  };

  WaveConfigUI.prototype.applyConfig = function applyConfig (config) {
    this.waveCountInput.value = config.multiplier;
    this.amplitudeInput.value = config.amplitude;
  };

  return WaveConfigUI;
}(ConfigUI));

var WaveEffect = (function (Effect$$1) {
  function WaveEffect () {
    Effect$$1.apply(this, arguments);
  }

  if ( Effect$$1 ) WaveEffect.__proto__ = Effect$$1;
  WaveEffect.prototype = Object.create( Effect$$1 && Effect$$1.prototype );
  WaveEffect.prototype.constructor = WaveEffect;

  WaveEffect.register = function register (instance, props, uniforms, vertexShader) {
    var time = uniforms.addUniform('time', 'float', function (ctx, props) { return fract((props.clock.getTime() - instance.timeBegin) / instance.getPeriod()); });
    var rep = uniforms.addUniform('repetition', 'int', function (ctx, props) { return Math.floor((props.clock.getTime() - instance.timeBegin) / instance.getPeriod()); });
    var multiplier = instance.config.multiplier;
    var amplitude = instance.config.amplitude;

    // goes from 0 (leftmost, begin) to 2 (leftmost, end)
    // but `reached` + `notOver` clamp it to 0 to 1
    var x = "(2. * " + time + " - initialPosition.x)";
    // Closed formula (with ease): (cos(​(x*​2-​1)*​π)+​1)/​2 * ​sin(​x*​3*​π-​0.5*​π)/​0.8
    var curve = function (x) { return ("(sin(" + x + " * float(" + multiplier + ") * 3. * PI - 0.5 * PI))"); };
    // The ease function is a cos spanning two negative peaks with a positive peak
    // in between. This is is then translated (+1, /2) to go from 0 to 1
    // Finally, because this will lower the actual peak height of `curve`
    // a compensation factor of 1.25 is applied
    var ease = "((cos((" + x + " * 2. - 1.) * PI) + 1.) * 0.5 * 1.25)";

    // eslint-disable-next-line no-param-reassign
    vertexShader.mainBody += "\n      {\n        float ease = 1.;\n        if (" + rep + " == 0 && " + x + " <= 0.5) {\n          ease = " + ease + ";\n        } else if (" + rep + " == " + (instance.repetitions) + " - 1 && " + x + " >= 0.5) {\n          ease = " + ease + ";\n        }\n        float curve = " + (curve(x)) + ";\n        float phase = ease * curve;\n        float reached = (" + x + " >= 0.) ? 1. : 0.;\n        if (" + rep + " != 0) {\n          reached = 1.;\n        }\n        float notOver = (" + x + " <= 1.) ? 1. : 0.;\n        if (" + rep + " != " + (instance.repetitions) + " - 1) {\n          notOver = 1.;\n        }\n\n        position.y += phase * reached * notOver * float(" + amplitude + ");\n      }\n    ";
  };

  WaveEffect.getDisplayName = function getDisplayName () {
    return EffectName$3;
  };

  WaveEffect.getDescription = function getDescription () {
    return EffectDescription$3;
  };

  WaveEffect.getConfigUI = function getConfigUI () {
    if (!this._configUI) {
      this._configUI = new WaveConfigUI();
    }

    return this._configUI;
  };

  WaveEffect.getDefaultConfig = function getDefaultConfig () {
    return {
      multiplier: 1,
      amplitude: 0.05
    };
  };

  WaveEffect.getRandomConfig = function getRandomConfig () {
    return {
      multiplier: Math.random(),
      amplitude: Math.random()
    };
  };

  return WaveEffect;
}(Effect));

var NonFatalError = (function (Error) {
  function NonFatalError(msg, data) {
    Error.call(this);
    this.msg = msg;
    this.data = data;
  }

  if ( Error ) NonFatalError.__proto__ = Error;
  NonFatalError.prototype = Object.create( Error && Error.prototype );
  NonFatalError.prototype.constructor = NonFatalError;

  return NonFatalError;
}(Error));

var ErrorManager = function ErrorManager(onload) {
  var this$1 = this;

  try {
    window.onerror = function (event, script, line, col, err) {
      this$1.handleError(event, script, line, col, err);
    };
    onload();
  } catch (err) {
    this.handleError(err.message, 'main.bundle', -1, -1, err);
  }
};
ErrorManager.prototype.handleError = function handleError (msg, script, line, col, err) {
  console.log(err);
};



function reportError(error) {
  // assert that this doesn't get lost inside some promise
  window.setTimeout(function() { throw error; }, 0);
}

var EffectName$4 = 'Change Image';
var EffectDescription$4 = 'Changes the particle data to a configurable image (file or url)';

var States = {
  INVALID: 0,
  VALID: 1,
  LOADING: 2
};

var ChangeImageConfigUI = (function (ConfigUI$$1) {
  function ChangeImageConfigUI() {
    var this$1 = this;

    ConfigUI$$1.call(this);
    var classPrefix = 'effect-change-image';
    this.element = parseHtml(("\n      <fieldset class=\"effect-change-image-config\">\n        <legend>" + EffectName$4 + "</legend>\n        <input type=\"radio\" name=\"effect-change-image-source-type\" value=\"file\" checked>\n          Upload own image\n        </input>\n        <input type=\"radio\" name=\"effect-change-image-source-type\" value=\"url\">\n          Load image from URL\n        </input>\n        <br/>\n        <label class=\"effect-change-image-file-tab\">\n          <input type=\"file\" accept=\"image/*\"/>\n        </label>\n        <label class=\"effect-change-image-url-tab\">\n          Enter image url\n          <input type=\"url\"/>\n        </label>\n        <br/>\n        " + (imageScalingMarkup(classPrefix)) + "\n        <img class=\"effect-change-image-preview\">\n      </fieldset>\n    "));
    var ui = this.element;
    this.scalingSelect = ui.querySelector(("select." + classPrefix + "-scaling-select"));
    this.scalingSelect.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.cropXSelect = ui.querySelector(("select." + classPrefix + "-crop-x-select"));
    this.cropXSelect.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.cropYSelect = ui.querySelector(("select." + classPrefix + "-crop-y-select"));
    this.cropYSelect.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.radioButtons = ui.querySelectorAll('input[type="radio"][name="effect-change-image-source-type"]');
    this.fileInput = ui.querySelector('.effect-change-image-file-tab input[type="file"]');
    this.urlInput = ui.querySelector('.effect-change-image-url-tab input[type="url"]');
    this.previewImg = ui.querySelector('img.effect-change-image-preview');
    this.FR = new FileReader();
    this.state = States.INVALID;
    this.onload = null;

    this.fileInput.addEventListener('change', function (evt) {
      this$1.state = States.LOADING;
      var file = this$1.fileInput.files[0];
      if (file) {
        this$1.FR.onload = function () {
          this$1.previewImg.src = this$1.FR.result;
        };
        this$1.FR.onerror = function () {};
        this$1.FR.readAsDataURL(file);
      }
    });
    this.urlInput.addEventListener('input', function (evt) {
      this$1.state = States.LOADING;
      this$1.previewImg.src = this$1.urlInput.value;
    });
    this.previewImg.addEventListener('load', function () {
      this$1.state = States.VALID;
      if (this$1.onload !== null) {
        this$1.onload();
        this$1.onload = null;
      }
    });
    this.previewImg.addEventListener('error', function () {
      this$1.state = States.INVALID;
      if (this$1.onload !== null) {
        this$1.onload();
        this$1.onload = null;
      }
    });
  }

  if ( ConfigUI$$1 ) ChangeImageConfigUI.__proto__ = ConfigUI$$1;
  ChangeImageConfigUI.prototype = Object.create( ConfigUI$$1 && ConfigUI$$1.prototype );
  ChangeImageConfigUI.prototype.constructor = ChangeImageConfigUI;

  ChangeImageConfigUI.prototype.getElement = function getElement () {
    return this.element;
  };

  ChangeImageConfigUI.prototype.getConfigAsync = function getConfigAsync () {
    var this$1 = this;

    var sourceTy = [].find.call(this.radioButtons, function (btn) { return btn.checked; }).value;
    var imageScaling = this.scalingSelect.value;
    var imageCropping = {
      x: this.cropXSelect.value,
      y: this.cropYSelect.value
    };
    if (this.state === States.VALID) {
      return Promise.resolve({
        sourceTy: sourceTy,
        imageScaling: imageScaling,
        imageCropping: imageCropping,
        url: this.previewImg.src
      });
    } else if (this.state === States.INVALID) {
      return Promise.resolve({
        sourceTy: sourceTy,
        imageScaling: imageScaling,
        imageCropping: imageCropping,
        url: null
      });
    }
    return new Promise(function (res) {
      this$1.onload = function () { return this$1.getConfigAsync().then(res); };
    });
  };

  ChangeImageConfigUI.prototype.applyConfig = function applyConfig (config) {
    if (config.url === null || config.url === '#') {
      this.previewImg.src = '#'; // https://stackoverflow.com/a/13726621/1468532
      this.state = States.INVALID;
    } else {
      this.previewImg.src = config.url;
      this.state = States.VALID;
    }
    [].forEach.call(this.radioButtons, function (btn) {
      btn.checked = (btn.value === config.sourceTy);
    });
    this.scalingSelect.value = config.imageScaling || 'crop-to-viewport';
    var imageCropping = config.imageCropping || {x: 'crop-both', y: 'crop-both'};
    this.cropXSelect.value = imageCropping.x;
    this.cropYSelect.value = imageCropping.y;
  };

  return ChangeImageConfigUI;
}(ConfigUI));

var ChangeImageEffect = (function (Effect$$1) {
  function ChangeImageEffect () {
    Effect$$1.apply(this, arguments);
  }

  if ( Effect$$1 ) ChangeImageEffect.__proto__ = Effect$$1;
  ChangeImageEffect.prototype = Object.create( Effect$$1 && Effect$$1.prototype );
  ChangeImageEffect.prototype.constructor = ChangeImageEffect;

  ChangeImageEffect.registerAsync = function registerAsync (instance, props, uniforms, vertexShader) {
    return new Promise(function (res, rej) {
      var srcImage = document.createElement('img');
      srcImage.crossOrigin = 'Anonymous'; // http://stackoverflow.com/a/27840082/1468532
      srcImage.src = instance.config.url;
      srcImage.onload = function () {
        var particleData = props.state.createParticleDataFromDomImg(
          srcImage, instance.config.imageScaling, instance.config.imageCropping
        );
        var alive = true;
        var prevWasChange = false;
        var checkTime = function () {
          if (!alive) {
            return;
          }
          var tDist = props.clock.getTime() - instance.timeBegin;
          if (0 <= tDist && tDist <= props.clock.getDelta()) {
            props.state.setParticleData(particleData);
          }
          window.requestAnimationFrame(checkTime);
        };
        checkTime();
        props.state.addHook(function () {
          alive = false;
        });
        res();
      };
      srcImage.onerror = function (err) {
        rej(new NonFatalError(("Could not load image for " + EffectName$4), err));
      };
    });
  };

  ChangeImageEffect.getDisplayName = function getDisplayName () {
    return EffectName$4;
  };

  ChangeImageEffect.getDescription = function getDescription () {
    return EffectDescription$4;
  };

  ChangeImageEffect.getConfigUI = function getConfigUI () {
    if (!this._configUI) {
      this._configUI = new ChangeImageConfigUI();
    }

    return this._configUI;
  };

  ChangeImageEffect.getDefaultConfig = function getDefaultConfig () {
    return {
      sourceTy: 'file',
      url: '#',
      imageScaling: 'crop-to-viewport',
      imageCropping: {
        x: 'crop-both',
        y: 'crop-both'
      }
    };
  };

  ChangeImageEffect.getRandomConfig = function getRandomConfig () {
    return this.getDefaultConfig();
  };

  ChangeImageEffect.isEventOnly = function isEventOnly () {
    return true;
  };

  return ChangeImageEffect;
}(Effect));

(function() {
 var Utils = {};
Utils.encodeRFC5987ValueChars = function (str) {
      return encodeURIComponent(str).
      replace(/['()!]/g, escape).
      replace(/\*/g, '%2A').
      replace(/%(?:7C|60|5E)/g, unescape);
    };
Utils.formQueryString = function (queryArguments) {
      var Utils = this,
          args = [],
          append = function(key) {
            args.push(key + "=" + Utils.encodeRFC5987ValueChars(queryArguments[key]));
          };
      Object.keys(queryArguments).sort().forEach(append);
      return args.join("&");
    };
Utils.checkRequirements = function (method_name, required, callOptions, callback) {
    required = required || [];
    for(var r=0, last=required.length, arg; r<last; r++) {
      arg = required[r];
      if(arg.name === "api_key") { continue; }
      if(!callOptions.hasOwnProperty(arg.name)) {
        return callback(new Error("missing required argument '"+arg.name+"' in call to "+method_name));
      }
    }
  };
Utils.generateAPIFunction = function (method) {
    return function(callOptions, callback) {
      if(callOptions && !callback) { callback = callOptions; callOptions = {}; }
      var queryArguments = Utils.generateQueryArguments(method.name, this.flickrOptions, callOptions);
      Utils.queryFlickr(queryArguments, this.flickrOptions, method.security, callback);
    };
  };
Utils.generateAPIDevFunction = function (method) {
    return function(callOptions, callback) {
      if(callOptions && !callback) { callback = callOptions; callOptions = {}; }
      Utils.checkRequirements(method.name, method.required, callOptions, callback);
      var queryArguments = Utils.generateQueryArguments(method.name, this.flickrOptions, callOptions);
      Utils.queryFlickr(queryArguments, this.flickrOptions, method.security, callback, method.errors);
    };
  };
Utils.generateQueryArguments = function (method_name, flickrOptions, callOptions) {
    // set up authorized method access
    var queryArguments = {
      method: method_name,
      format: "json",
    };
    if(flickrOptions.api_key) {
      queryArguments.api_key = flickrOptions.api_key;
    }
    // set up bindings for method-specific args
    Object.keys(callOptions).forEach(function(key) {
      queryArguments[key] = callOptions[key];
    });
    return queryArguments;
  };
Utils.queryFlickr = function (queryArguments, flickrOptions, security, processResult) {
    if(flickrOptions.endpoint) {
      return this.queryProxyEndpoint(queryArguments, flickrOptions, processResult);
    }
    return this.queryFlickrAPI(queryArguments, flickrOptions, security, processResult);
  };
Utils.upload = function (uploadOptions, flickrOptions, processResult) {
    return processResult(new Error("Uploading directly from the browser is not supported"));
  };
Utils.queryFlickrAPI = function (queryArguments, flickrOptions, security, processResult) {
    var url = "https://api.flickr.com/services/rest/",
        queryString = this.formQueryString(queryArguments),
        flickrURL = url + "?" + queryString;
    // Do we need special permissions? (read private, 1, write, 2, or delete, 3)?
    // if so, those are currently not supported. Send an error-notification.
    if(security.requiredperms > 0) {
      return processResult(new Error("signed calls (write/delete) currently not supported"));
    }
    this.handleURLRequest("GET", flickrURL, processResult);
  };
Utils.queryProxyEndpoint = function (queryArguments, flickrOptions, processResult) {
    var queryString = this.formQueryString(queryArguments),
        url = flickrOptions.endpoint + "?" + queryString;
    this.handleURLRequest("POST", url, processResult, queryArguments);
  };
Utils.handleURLRequest = function (verb, url, processResult, postdata) {
    var xhr = new XMLHttpRequest();
    xhr.open(verb, url, true);
    if(postdata) {
      xhr.setRequestHeader("Content-Type", "application/json");
    }
    xhr.onreadystatechange = function() {
      if(xhr.readyState === 4) {
        if(xhr.status == 200) {
          var error = false,
              body = xhr.responseText;
          // we get a response, but there's no response body. That's a problem.
          if(!body) {
            error = "HTTP Error " + response.statusCode + " (" + statusCodes[response.statusCode] + ")";
            return processResult(error);
          }
          // we get a response, and there were no errors
          if(!error) {
            try {
              body = body.trim().replace(/^jsonFlickrApi\(/,'').replace(/\}\)$/,'}');
              body = JSON.parse(body);
              if(body.stat !== "ok") {
                // There was a request error, and the JSON .stat property
                // will tell us what that error was.
                return processResult(body.message);
              }
            } catch (e) {
              // general JSON error
              return processResult("could not parse body as JSON");
            }
          }
          // Some kind of other error occurred. Simply call the process
          // handler blindly with both the error and error body.
          processResult(error, body);
        }
        else { processResult("HTTP status not 200 (received "+xhr.status+")"); }
      }
    };
    xhr.send(postdata ? JSON.stringify(postdata) : null);
  };
 Utils.errors = {
    "95": {
        "code": 95,
        "message": "SSL is required",
        "_content": "SSL is required to access the Flickr API."
    },
    "96": {
        "code": 96,
        "message": "Invalid signature",
        "_content": "The passed signature was invalid."
    },
    "97": {
        "code": 97,
        "message": "Missing signature",
        "_content": "The call required signing but no signature was sent."
    },
    "98": {
        "code": 98,
        "message": "Login failed / Invalid auth token",
        "_content": "The login details or auth token passed were invalid."
    },
    "99": {
        "code": 99,
        "message": "User not logged in / Insufficient permissions",
        "_content": "The method requires user authentication but the user was not logged in, or the authenticated method call did not have the required permissions."
    },
    "100": {
        "code": 100,
        "message": "Invalid API Key",
        "_content": "The API key passed was not valid or has expired."
    },
    "105": {
        "code": 105,
        "message": "Service currently unavailable",
        "_content": "The requested service is temporarily unavailable."
    },
    "106": {
        "code": 106,
        "message": "Write operation failed",
        "_content": "The requested operation failed due to a temporary issue."
    },
    "108": {
        "code": "108",
        "message": "Invalid frob",
        "_content": "The specified frob does not exist or has already been used."
    },
    "111": {
        "code": 111,
        "message": "Format \"xxx\" not found",
        "_content": "The requested response format was not found."
    },
    "112": {
        "code": 112,
        "message": "Method \"xxx\" not found",
        "_content": "The requested method was not found."
    },
    "114": {
        "code": 114,
        "message": "Invalid SOAP envelope",
        "_content": "The SOAP envelope send in the request could not be parsed."
    },
    "115": {
        "code": 115,
        "message": "Invalid XML-RPC Method Call",
        "_content": "The XML-RPC request document could not be parsed."
    },
    "116": {
        "code": 116,
        "message": "Bad URL found",
        "_content": "One or more arguments contained a URL that has been used for abuse on Flickr."
    }
};
 var Flickr = function (flickrOptions) {
  this.bindOptions(flickrOptions);
};
 Flickr.prototype = {};
 Flickr.methods = {
 "flickr.activity.userComments": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.activity.userComments"
 },
 "flickr.activity.userPhotos": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.activity.userPhotos"
 },
 "flickr.auth.checkToken": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.auth.checkToken"
 },
 "flickr.auth.getFrob": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.auth.getFrob"
 },
 "flickr.auth.getFullToken": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.auth.getFullToken"
 },
 "flickr.auth.getToken": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.auth.getToken"
 },
 "flickr.auth.oauth.checkToken": {
  "security": {
   "needslogin": 0,
   "needssigning": 1,
   "requiredperms": 0
  },
  "name": "flickr.auth.oauth.checkToken"
 },
 "flickr.auth.oauth.getAccessToken": {
  "security": {
   "needslogin": 0,
   "needssigning": 1,
   "requiredperms": 0
  },
  "name": "flickr.auth.oauth.getAccessToken"
 },
 "flickr.blogs.getList": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.blogs.getList"
 },
 "flickr.blogs.getServices": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.blogs.getServices"
 },
 "flickr.blogs.postPhoto": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.blogs.postPhoto"
 },
 "flickr.cameras.getBrandModels": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.cameras.getBrandModels"
 },
 "flickr.cameras.getBrands": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.cameras.getBrands"
 },
 "flickr.collections.getInfo": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.collections.getInfo"
 },
 "flickr.collections.getTree": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.collections.getTree"
 },
 "flickr.commons.getInstitutions": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.commons.getInstitutions"
 },
 "flickr.contacts.getList": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.contacts.getList"
 },
 "flickr.contacts.getListRecentlyUploaded": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.contacts.getListRecentlyUploaded"
 },
 "flickr.contacts.getPublicList": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.contacts.getPublicList"
 },
 "flickr.contacts.getTaggingSuggestions": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.contacts.getTaggingSuggestions"
 },
 "flickr.favorites.add": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.favorites.add"
 },
 "flickr.favorites.getContext": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.favorites.getContext"
 },
 "flickr.favorites.getList": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.favorites.getList"
 },
 "flickr.favorites.getPublicList": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.favorites.getPublicList"
 },
 "flickr.favorites.remove": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.favorites.remove"
 },
 "flickr.galleries.addPhoto": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.galleries.addPhoto"
 },
 "flickr.galleries.create": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.galleries.create"
 },
 "flickr.galleries.editMeta": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.galleries.editMeta"
 },
 "flickr.galleries.editPhoto": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.galleries.editPhoto"
 },
 "flickr.galleries.editPhotos": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.galleries.editPhotos"
 },
 "flickr.galleries.getInfo": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.galleries.getInfo"
 },
 "flickr.galleries.getList": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.galleries.getList"
 },
 "flickr.galleries.getListForPhoto": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.galleries.getListForPhoto"
 },
 "flickr.galleries.getPhotos": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.galleries.getPhotos"
 },
 "flickr.groups.browse": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.groups.browse"
 },
 "flickr.groups.discuss.replies.add": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.groups.discuss.replies.add"
 },
 "flickr.groups.discuss.replies.delete": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 3
  },
  "name": "flickr.groups.discuss.replies.delete"
 },
 "flickr.groups.discuss.replies.edit": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.groups.discuss.replies.edit"
 },
 "flickr.groups.discuss.replies.getInfo": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.groups.discuss.replies.getInfo"
 },
 "flickr.groups.discuss.replies.getList": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.groups.discuss.replies.getList"
 },
 "flickr.groups.discuss.topics.add": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.groups.discuss.topics.add"
 },
 "flickr.groups.discuss.topics.getInfo": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.groups.discuss.topics.getInfo"
 },
 "flickr.groups.discuss.topics.getList": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.groups.discuss.topics.getList"
 },
 "flickr.groups.getInfo": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.groups.getInfo"
 },
 "flickr.groups.join": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.groups.join"
 },
 "flickr.groups.joinRequest": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.groups.joinRequest"
 },
 "flickr.groups.leave": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 3
  },
  "name": "flickr.groups.leave"
 },
 "flickr.groups.members.getList": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.groups.members.getList"
 },
 "flickr.groups.pools.add": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.groups.pools.add"
 },
 "flickr.groups.pools.getContext": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.groups.pools.getContext"
 },
 "flickr.groups.pools.getGroups": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.groups.pools.getGroups"
 },
 "flickr.groups.pools.getPhotos": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.groups.pools.getPhotos"
 },
 "flickr.groups.pools.remove": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.groups.pools.remove"
 },
 "flickr.groups.search": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.groups.search"
 },
 "flickr.interestingness.getList": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.interestingness.getList"
 },
 "flickr.machinetags.getNamespaces": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.machinetags.getNamespaces"
 },
 "flickr.machinetags.getPairs": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.machinetags.getPairs"
 },
 "flickr.machinetags.getPredicates": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.machinetags.getPredicates"
 },
 "flickr.machinetags.getRecentValues": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.machinetags.getRecentValues"
 },
 "flickr.machinetags.getValues": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.machinetags.getValues"
 },
 "flickr.panda.getList": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.panda.getList"
 },
 "flickr.panda.getPhotos": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.panda.getPhotos"
 },
 "flickr.people.findByEmail": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.people.findByEmail"
 },
 "flickr.people.findByUsername": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.people.findByUsername"
 },
 "flickr.people.getGroups": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.people.getGroups"
 },
 "flickr.people.getInfo": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.people.getInfo"
 },
 "flickr.people.getLimits": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.people.getLimits"
 },
 "flickr.people.getPhotos": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.people.getPhotos"
 },
 "flickr.people.getPhotosOf": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.people.getPhotosOf"
 },
 "flickr.people.getPublicGroups": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.people.getPublicGroups"
 },
 "flickr.people.getPublicPhotos": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.people.getPublicPhotos"
 },
 "flickr.people.getUploadStatus": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.people.getUploadStatus"
 },
 "flickr.photos.addTags": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.addTags"
 },
 "flickr.photos.comments.addComment": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.comments.addComment"
 },
 "flickr.photos.comments.deleteComment": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.comments.deleteComment"
 },
 "flickr.photos.comments.editComment": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.comments.editComment"
 },
 "flickr.photos.comments.getList": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.photos.comments.getList"
 },
 "flickr.photos.comments.getRecentForContacts": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.photos.comments.getRecentForContacts"
 },
 "flickr.photos.delete": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 3
  },
  "name": "flickr.photos.delete"
 },
 "flickr.photos.geo.batchCorrectLocation": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.geo.batchCorrectLocation"
 },
 "flickr.photos.geo.correctLocation": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.geo.correctLocation"
 },
 "flickr.photos.geo.getLocation": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.photos.geo.getLocation"
 },
 "flickr.photos.geo.getPerms": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.photos.geo.getPerms"
 },
 "flickr.photos.geo.photosForLocation": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.photos.geo.photosForLocation"
 },
 "flickr.photos.geo.removeLocation": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.geo.removeLocation"
 },
 "flickr.photos.geo.setContext": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.geo.setContext"
 },
 "flickr.photos.geo.setLocation": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.geo.setLocation"
 },
 "flickr.photos.geo.setPerms": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.geo.setPerms"
 },
 "flickr.photos.getAllContexts": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.photos.getAllContexts"
 },
 "flickr.photos.getContactsPhotos": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.photos.getContactsPhotos"
 },
 "flickr.photos.getContactsPublicPhotos": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.photos.getContactsPublicPhotos"
 },
 "flickr.photos.getContext": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.photos.getContext"
 },
 "flickr.photos.getCounts": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.photos.getCounts"
 },
 "flickr.photos.getExif": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.photos.getExif"
 },
 "flickr.photos.getFavorites": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.photos.getFavorites"
 },
 "flickr.photos.getInfo": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.photos.getInfo"
 },
 "flickr.photos.getNotInSet": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.photos.getNotInSet"
 },
 "flickr.photos.getPerms": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.photos.getPerms"
 },
 "flickr.photos.getRecent": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.photos.getRecent"
 },
 "flickr.photos.getSizes": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.photos.getSizes"
 },
 "flickr.photos.getUntagged": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.photos.getUntagged"
 },
 "flickr.photos.getWithGeoData": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.photos.getWithGeoData"
 },
 "flickr.photos.getWithoutGeoData": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.photos.getWithoutGeoData"
 },
 "flickr.photos.licenses.getInfo": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.photos.licenses.getInfo"
 },
 "flickr.photos.licenses.setLicense": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.licenses.setLicense"
 },
 "flickr.photos.notes.add": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.notes.add"
 },
 "flickr.photos.notes.delete": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.notes.delete"
 },
 "flickr.photos.notes.edit": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.notes.edit"
 },
 "flickr.photos.people.add": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.people.add"
 },
 "flickr.photos.people.delete": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.people.delete"
 },
 "flickr.photos.people.deleteCoords": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.people.deleteCoords"
 },
 "flickr.photos.people.editCoords": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.people.editCoords"
 },
 "flickr.photos.people.getList": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.photos.people.getList"
 },
 "flickr.photos.recentlyUpdated": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.photos.recentlyUpdated"
 },
 "flickr.photos.removeTag": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.removeTag"
 },
 "flickr.photos.search": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.photos.search"
 },
 "flickr.photos.setContentType": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.setContentType"
 },
 "flickr.photos.setDates": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.setDates"
 },
 "flickr.photos.setMeta": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.setMeta"
 },
 "flickr.photos.setPerms": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.setPerms"
 },
 "flickr.photos.setSafetyLevel": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.setSafetyLevel"
 },
 "flickr.photos.setTags": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.setTags"
 },
 "flickr.photos.suggestions.approveSuggestion": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.suggestions.approveSuggestion"
 },
 "flickr.photos.suggestions.getList": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.photos.suggestions.getList"
 },
 "flickr.photos.suggestions.rejectSuggestion": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.suggestions.rejectSuggestion"
 },
 "flickr.photos.suggestions.removeSuggestion": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.suggestions.removeSuggestion"
 },
 "flickr.photos.suggestions.suggestLocation": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.suggestions.suggestLocation"
 },
 "flickr.photos.transform.rotate": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photos.transform.rotate"
 },
 "flickr.photos.upload.checkTickets": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.photos.upload.checkTickets"
 },
 "flickr.photosets.addPhoto": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photosets.addPhoto"
 },
 "flickr.photosets.comments.addComment": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photosets.comments.addComment"
 },
 "flickr.photosets.comments.deleteComment": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photosets.comments.deleteComment"
 },
 "flickr.photosets.comments.editComment": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photosets.comments.editComment"
 },
 "flickr.photosets.comments.getList": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.photosets.comments.getList"
 },
 "flickr.photosets.create": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photosets.create"
 },
 "flickr.photosets.delete": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photosets.delete"
 },
 "flickr.photosets.editMeta": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photosets.editMeta"
 },
 "flickr.photosets.editPhotos": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photosets.editPhotos"
 },
 "flickr.photosets.getContext": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.photosets.getContext"
 },
 "flickr.photosets.getInfo": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.photosets.getInfo"
 },
 "flickr.photosets.getList": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.photosets.getList"
 },
 "flickr.photosets.getPhotos": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.photosets.getPhotos"
 },
 "flickr.photosets.orderSets": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photosets.orderSets"
 },
 "flickr.photosets.removePhoto": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photosets.removePhoto"
 },
 "flickr.photosets.removePhotos": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photosets.removePhotos"
 },
 "flickr.photosets.reorderPhotos": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photosets.reorderPhotos"
 },
 "flickr.photosets.setPrimaryPhoto": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 2
  },
  "name": "flickr.photosets.setPrimaryPhoto"
 },
 "flickr.places.find": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.places.find"
 },
 "flickr.places.findByLatLon": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.places.findByLatLon"
 },
 "flickr.places.getChildrenWithPhotosPublic": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.places.getChildrenWithPhotosPublic"
 },
 "flickr.places.getInfo": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.places.getInfo"
 },
 "flickr.places.getInfoByUrl": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.places.getInfoByUrl"
 },
 "flickr.places.getPlaceTypes": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.places.getPlaceTypes"
 },
 "flickr.places.getShapeHistory": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.places.getShapeHistory"
 },
 "flickr.places.getTopPlacesList": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.places.getTopPlacesList"
 },
 "flickr.places.placesForBoundingBox": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.places.placesForBoundingBox"
 },
 "flickr.places.placesForContacts": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.places.placesForContacts"
 },
 "flickr.places.placesForTags": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.places.placesForTags"
 },
 "flickr.places.placesForUser": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.places.placesForUser"
 },
 "flickr.places.resolvePlaceId": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.places.resolvePlaceId"
 },
 "flickr.places.resolvePlaceURL": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.places.resolvePlaceURL"
 },
 "flickr.places.tagsForPlace": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.places.tagsForPlace"
 },
 "flickr.prefs.getContentType": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.prefs.getContentType"
 },
 "flickr.prefs.getGeoPerms": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.prefs.getGeoPerms"
 },
 "flickr.prefs.getHidden": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.prefs.getHidden"
 },
 "flickr.prefs.getPrivacy": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.prefs.getPrivacy"
 },
 "flickr.prefs.getSafetyLevel": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.prefs.getSafetyLevel"
 },
 "flickr.push.getSubscriptions": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.push.getSubscriptions"
 },
 "flickr.push.getTopics": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.push.getTopics"
 },
 "flickr.push.subscribe": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.push.subscribe"
 },
 "flickr.push.unsubscribe": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.push.unsubscribe"
 },
 "flickr.reflection.getMethodInfo": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.reflection.getMethodInfo"
 },
 "flickr.reflection.getMethods": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.reflection.getMethods"
 },
 "flickr.stats.getCollectionDomains": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.stats.getCollectionDomains"
 },
 "flickr.stats.getCollectionReferrers": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.stats.getCollectionReferrers"
 },
 "flickr.stats.getCollectionStats": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.stats.getCollectionStats"
 },
 "flickr.stats.getCSVFiles": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.stats.getCSVFiles"
 },
 "flickr.stats.getPhotoDomains": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.stats.getPhotoDomains"
 },
 "flickr.stats.getPhotoReferrers": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.stats.getPhotoReferrers"
 },
 "flickr.stats.getPhotosetDomains": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.stats.getPhotosetDomains"
 },
 "flickr.stats.getPhotosetReferrers": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.stats.getPhotosetReferrers"
 },
 "flickr.stats.getPhotosetStats": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.stats.getPhotosetStats"
 },
 "flickr.stats.getPhotoStats": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.stats.getPhotoStats"
 },
 "flickr.stats.getPhotostreamDomains": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.stats.getPhotostreamDomains"
 },
 "flickr.stats.getPhotostreamReferrers": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.stats.getPhotostreamReferrers"
 },
 "flickr.stats.getPhotostreamStats": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.stats.getPhotostreamStats"
 },
 "flickr.stats.getPopularPhotos": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.stats.getPopularPhotos"
 },
 "flickr.stats.getTotalViews": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.stats.getTotalViews"
 },
 "flickr.tags.getClusterPhotos": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.tags.getClusterPhotos"
 },
 "flickr.tags.getClusters": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.tags.getClusters"
 },
 "flickr.tags.getHotList": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.tags.getHotList"
 },
 "flickr.tags.getListPhoto": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.tags.getListPhoto"
 },
 "flickr.tags.getListUser": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.tags.getListUser"
 },
 "flickr.tags.getListUserPopular": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.tags.getListUserPopular"
 },
 "flickr.tags.getListUserRaw": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.tags.getListUserRaw"
 },
 "flickr.tags.getMostFrequentlyUsed": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.tags.getMostFrequentlyUsed"
 },
 "flickr.tags.getRelated": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.tags.getRelated"
 },
 "flickr.test.echo": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.test.echo"
 },
 "flickr.test.login": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.test.login"
 },
 "flickr.test.null": {
  "security": {
   "needslogin": 1,
   "needssigning": 1,
   "requiredperms": 1
  },
  "name": "flickr.test.null"
 },
 "flickr.urls.getGroup": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.urls.getGroup"
 },
 "flickr.urls.getUserPhotos": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.urls.getUserPhotos"
 },
 "flickr.urls.getUserProfile": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.urls.getUserProfile"
 },
 "flickr.urls.lookupGallery": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.urls.lookupGallery"
 },
 "flickr.urls.lookupGroup": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.urls.lookupGroup"
 },
 "flickr.urls.lookupUser": {
  "security": {
   "needslogin": 0,
   "needssigning": 0,
   "requiredperms": 0
  },
  "name": "flickr.urls.lookupUser"
 }
};

(function () {
  Object.keys(Flickr.methods).forEach(function(method) {
    var level = method.split(".").slice(1);
    var e = Flickr.prototype, key;
    while(level.length > 1) {
      key = level.splice(0,1)[0];
      if(!e[key]) { e[key] = {}; }
      e = e[key];
    }
    e[level] = Utils.generateAPIFunction(Flickr.methods[method]);
  });
}());

 Flickr.prototype.bindOptions = function (flickrOptions) {
  this.flickrOptions = flickrOptions;
  (function bindOptions(obj, props) {
    Object.keys(props).forEach(function(key) {
      if (key === "flickrOptions") { return; }
      if (typeof obj[key] === "object") {
        bindOptions(obj[key], props[key]);
        obj[key].flickrOptions = flickrOptions;
      }
    });
  }(this, Flickr.prototype));
};

 window.Flickr = Flickr;
}());

/**
 * Since the flickrapi package is neither a module (it sets a global)
 * nor does it export promisified functions, we have our own little
 * wrapper here
 */
var Flickr = window.Flickr;
delete window.Flickr;

var ApiKey = 'bbd60ce148c0a1dedcaaffd228a03264';

var FlickrP = (function (Flickr) {
  function FlickrP() {
    var args = [], len = arguments.length;
    while ( len-- ) args[ len ] = arguments[ len ];

    Flickr.apply(this, args);
  }

  if ( Flickr ) FlickrP.__proto__ = Flickr;
  FlickrP.prototype = Object.create( Flickr && Flickr.prototype );
  FlickrP.prototype.constructor = FlickrP;

  return FlickrP;
}(Flickr));

function recursivePromisify(obj) {
  var res = {};
  var loop = function ( prop ) {
    if (!obj.hasOwnProperty(prop)) {
      return;
    }
    if (typeof obj[prop] === 'function') {
      res[prop] = function() {
        var this$1 = this;
        var args = [], len = arguments.length;
        while ( len-- ) args[ len ] = arguments[ len ];

        return new Promise(function (res, rej) {
          (ref = obj[prop]).call.apply(ref, [ this$1 ].concat( args,[function (error, response) {
            if (error) {
              rej(error);
            } else {
              res(response);
            }
          }] ));
          var ref;
        });
      };
    } else if (typeof obj[prop] === 'object') {
      res[prop] = recursivePromisify(obj[prop]);
    } else {
      res[prop] = obj[prop];
    }
  };

  for (var prop in obj) loop( prop );
  return res;
}
FlickrP.prototype = recursivePromisify(Flickr.prototype);

var EffectName$5 = 'Flickr Image';
var EffectDescription$5 = 'Changes the underlying image to one loaded from Flickr\'s recent images feed';
var Attribution = 'This product uses the Flickr API but is not endorsed or certified by Flickr.';

var FlickrImageConfigUI = (function (ConfigUI$$1) {
  function FlickrImageConfigUI() {
    var this$1 = this;

    ConfigUI$$1.call(this);
    var classPrefix = 'effect-flickr-img';
    var searchInputClass = classPrefix + "-search-term";
    this.element = parseHtml(("\n      <div>\n        " + Attribution + "\n        <fieldset>\n          <legend>" + EffectName$5 + "</legend>\n          <label>\n            Search term:\n            <input type=\"text\" class=\"" + searchInputClass + "\"/>\n          </label>\n          " + (imageScalingMarkup(classPrefix)) + "\n        </fieldset>\n      </div>\n    "));
    var ui = this.element;
    this.scalingSelect = ui.querySelector(("select." + classPrefix + "-scaling-select"));
    this.scalingSelect.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.cropXSelect = ui.querySelector(("select." + classPrefix + "-crop-x-select"));
    this.cropXSelect.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.cropYSelect = ui.querySelector(("select." + classPrefix + "-crop-y-select"));
    this.cropYSelect.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.searchTermInput = this.element.querySelector(("." + searchInputClass));
    this.searchTermInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
  }

  if ( ConfigUI$$1 ) FlickrImageConfigUI.__proto__ = ConfigUI$$1;
  FlickrImageConfigUI.prototype = Object.create( ConfigUI$$1 && ConfigUI$$1.prototype );
  FlickrImageConfigUI.prototype.constructor = FlickrImageConfigUI;

  FlickrImageConfigUI.prototype.getElement = function getElement () {
    return this.element;
  };

  FlickrImageConfigUI.prototype.getConfig = function getConfig () {
    var config = {};

    config.searchTerm = this.searchTermInput.value;
    config.imageScaling = this.scalingSelect.value;
    config.imageCropping = {
      x: this.cropXSelect.value,
      y: this.cropYSelect.value
    };

    return config;
  };

  FlickrImageConfigUI.prototype.applyConfig = function applyConfig (config) {
    this.searchTermInput.value = config.searchTerm;
    this.scalingSelect.value = config.imageScaling || 'crop-to-viewport';
    var imageCropping = config.imageCropping || { x: 'crop-both', y: 'crop-both' };
    this.cropXSelect.value = imageCropping.x;
    this.cropYSelect.value = imageCropping.y;
  };

  return FlickrImageConfigUI;
}(ConfigUI));

/// This constant is used both for defining how many images the
/// FlickrImageCache will pre-load for a given search term as well as
/// how many images a FlickrImageEffect will reserve for future use
var prefetchCount = 5;

var FlickrCacheEntry = function FlickrCacheEntry() {
  /// The current position in the stream of photos that this entry
  /// loads images for
  this.page = 1;
  /// Needed to keep track of where the ever growing stream of images
  /// started for us. We can't just assume that "page #1" will always
  /// stay the same, or we risk loading the same image multiple times.
  this.initialQueryTime = Math.floor(Date.now() / 1000);
  /// Pending queries need to be taken into account when deciding whether
  /// or not new flickr api calls should be made
  this.loadsInProgress = 0;
  /// This is the acutal image cache
  this.loadedImgs = [];
  /// If a query cannot be answered right away by this cache entry, we
  /// queue it in this array. So when a new image finishes loading, we
  /// resolve the request at the front of this queue with it.
  this.requests = [];
};

/**
 * The FlickrImageCache manages the process of loading images from flickr.
 * Therefore, it has to select "new" images from flickr and then download
 * the best version available. For efficiency, FlickrImageCache also kicks
 * off the loading process for multiple images at once, so that future
 * queries for the same search term may be resolved faster.
 */
var FlickrImageCache = function FlickrImageCache() {
  this.flickr = new FlickrP({ api_key: ApiKey });
  /// a dictionary mapping search queries to FlickrCachEntries
  this.byQuery = {};
};

/// Props will be used to select versions of images which best match
/// the particle grid dimensions (xParticlesCount/yParticlesCount)
FlickrImageCache.prototype.setProps = function setProps (props) {
  this.props = props;
};

/// @return a promise that resolves to flickr api return values
FlickrImageCache.prototype.runFlickrQuery = function runFlickrQuery (searchTerm) {
  var entry = this.getEntryForSearchTerm(searchTerm);

  var onResponse = function (response) {
    // since page is 1-indexed, a real greater is necessary
    if (entry.page > response.photos.pages) {
      entry.page = 1;
    }
    return response;
  };
  // Two different flickr apis, depending on search string content
  var query = null;
  if (searchTerm === '') {
    query = this.flickr
    .photos
    .getRecent({
      per_page: prefetchCount,
      page: entry.page,
      max_upload_date: entry.initialQueryTime
    }).then(onResponse);
  } else {
    query = this.flickr
    .photos
    .search({
      text: searchTerm,
      per_page: prefetchCount,
      page: entry.page,
      max_upload_date: entry.initialQueryTime
    }).then(onResponse);
  }
  entry.loadsInProgress += prefetchCount;
  entry.page = entry.page + 1;
  return query;
};

/// For each photo in a flickr query response, request the image (i.e.
/// the versions available on flickr), select the best version for the
/// current rendering configuration and load the image from flickr.
///
/// @return a list of promises each representing a loading process. I.e.
///       when one of the promises resolves, either a pending request
///       will have been resolved or a new image is pushed into the
///       image cache.
FlickrImageCache.prototype.processSearchQueryResponse = function processSearchQueryResponse (response, entry) {
    var this$1 = this;

  var loadQueue = [];
  for (var i = 0; i < response.photos.photo.length; i++) {
    loadQueue.push(this$1.processPhoto(response.photos.photo[i], entry));
  }
  return loadQueue;
};

/// We want to exclude all cropped versions (= all versions cropped
/// to squares) and we don't want to load higher resoultions than
/// necessary
FlickrImageCache.prototype.selectBestImageVersion = function selectBestImageVersion (sizes) {
    var this$1 = this;

  var best = sizes.sizes.size.find(function (size) {
    if (size.label.indexOf('Square') >= 0) {
      return false;
    }
    return size.width >= this$1.props.config.xParticlesCount;
  }) || sizes.sizes.size[sizes.sizes.size.length - 1];
  return best;
};

/// Kicks of the loading process for a given flickr photo. I.e., request
/// the list of available image versions, select the most appropriate
/// version and load that. Finally, resolve a pending cache request
/// with it or push the result into the cache
///
/// @return a promise representing the loading process for @p photo
FlickrImageCache.prototype.processPhoto = function processPhoto (photo, entry) {
    var this$1 = this;

  return this.flickr.photos.getSizes({
    photo_id: photo.id
  }).then(function (sizes) {
    var original = this$1.selectBestImageVersion(sizes);
    var url = original.source;
    var loader = document.createElement('img');
    loader.crossOrigin = 'Anonymous';
    loader.src = url;
    loader.onload = function () {
      entry.loadsInProgress = entry.loadsInProgress - 1;
      if (entry.requests.length > 0) {
        // resolve pending request directly
        var request = entry.requests.shift();
        request(loader);
      } else {
        entry.loadedImgs.push(loader);
      }
    };
  });
};

/// Looks up and returns the FlickrCacheEntry corresponding to the given
/// @p searchTerm
FlickrImageCache.prototype.getEntryForSearchTerm = function getEntryForSearchTerm (searchTerm) {
  if (!this.byQuery[searchTerm]) {
    this.byQuery[searchTerm] = new FlickrCacheEntry();
  }
  return this.byQuery[searchTerm];
};

/// Decides whether the loading process of new images for a search term
/// (represented by the corresponding @p entry) should be kicked off,
/// depending of how many loaded images are still available and how
/// many images are still in-flight.
FlickrImageCache.prototype.shouldFireNewQuery = function shouldFireNewQuery (entry) {
  if (entry.loadsInProgress + entry.loadedImgs.length -
      entry.requests.length < prefetchCount
  ) {
    return true;
  }
  return false;
};

/// This is FlickrImageCache's main api: Give this method a @p
/// searchTerm and it returns a promise that will eventually resolve to
/// a DOM Image matching the @p searchTerm.
///
/// @return a Promise that will resolve to a DOM Image object matching
///       the given @p searchTerm
FlickrImageCache.prototype.getImageForSearchTerm = function getImageForSearchTerm (searchTerm) {
    var this$1 = this;

  var entry = this.getEntryForSearchTerm(searchTerm);
  if (entry.loadedImgs.length === 0) {
    return new Promise(function (res, rej) {
      entry.requests.push(res);
      if (this$1.shouldFireNewQuery(entry)) {
        this$1.runFlickrQuery(searchTerm, entry)
        .then(function (response) { return this$1.processSearchQueryResponse(response, entry); });
      }
    });
  } else {
    return Promise.resolve(entry.loadedImgs.shift());
  }
};

var FlickrImageEffect = (function (Effect$$1) {
  function FlickrImageEffect () {
    Effect$$1.apply(this, arguments);
  }

  if ( Effect$$1 ) FlickrImageEffect.__proto__ = Effect$$1;
  FlickrImageEffect.prototype = Object.create( Effect$$1 && Effect$$1.prototype );
  FlickrImageEffect.prototype.constructor = FlickrImageEffect;

  FlickrImageEffect.registerAsync = function registerAsync (instance, props) {
    var cache = FlickrImageEffect.getCache(props);
    var img2pd = function (image) {
      return props.state.createParticleDataFromDomImg(
        image, instance.config.imageScaling, instance.config.imageCropping
      );
    };
    return cache.getImageForSearchTerm(instance.config.searchTerm)
    .then(function (image) {
      var particleData = img2pd(image);
      var particleDataQueue = [particleData];
      // We want to have some images pre-allocated to this effect
      for (var i = 1; i < prefetchCount; i++) {
        cache.getImageForSearchTerm(instance.config.searchTerm)
        .then(function (image) {
          var particleData = img2pd(image);
          particleDataQueue.push(particleData);
        });
      }

      var alive = true;
      var displayed = -1;
      // Run this in a loop to check if we need to update the image
      var checkTime = function () {
        if (!alive) {
          return;
        }
        var tDist = props.clock.getTime() - instance.timeBegin;
        if (tDist >= 0 && tDist <= props.clock.getDelta()) {
          // free unneeded resources when we proceed to the next image
          var freed = -1;
          if (displayed !== -1 && particleDataQueue.length > 1) {
            freed = particleDataQueue.shift();
          }
          displayed = particleDataQueue[0];
          props.state.setParticleData(displayed);
          // do the free AFTER we setParticleData to a new one
          if (freed !== -1) {
            props.state.destroyParticleData(freed);
            // also look for a replacement
            cache.getImageForSearchTerm(instance.config.searchTerm)
            .then(function (image) {
              var particleData = img2pd(image);
              particleDataQueue.push(particleData);
            });
          }
        }
        window.requestAnimationFrame(checkTime);
      };
      checkTime();
      props.state.addHook(function () {
        alive = false;
      });
    });
  };

  FlickrImageEffect.getDisplayName = function getDisplayName () {
    return EffectName$5;
  };

  FlickrImageEffect.getDescription = function getDescription () {
    return EffectDescription$5;
  };

  FlickrImageEffect.getConfigUI = function getConfigUI () {
    if (!this._configUI) {
      this._configUI = new FlickrImageConfigUI();
    }

    return this._configUI;
  };

  FlickrImageEffect.getDefaultConfig = function getDefaultConfig () {
    return {
      searchTerm: '',
      imageScaling: 'crop-to-viewport',
      imageCropping: {
        x: 'crop-both',
        y: 'crop-both'
      }
    };
  };

  FlickrImageEffect.getRandomConfig = function getRandomConfig () {
    return this.getDefaultConfig();
  };

  FlickrImageEffect.getCache = function getCache (props) {
    if (!this._cache) {
      this._cache = new FlickrImageCache();
    }
    this._cache.setProps(props);

    return this._cache;
  };

  FlickrImageEffect.isEventOnly = function isEventOnly () {
    return true;
  };

  return FlickrImageEffect;
}(Effect));

var Framebuffer = function Framebuffer(regl) {
  this.texture = regl.texture({ width: 1, height: 1, min: 'linear', mag: 'linear' }); // call resize before first use !
  this.framebuffer = regl.framebuffer({ color: this.texture, depth: false, stencil: false, depthStencil: false });
};

Framebuffer.prototype.resize = function resize (width, height) {
  this.framebuffer.resize(width, height);
};

var FullscreenRectCommand = function FullscreenRectCommand() {
  this.vert = "\n      precision highp float;\n      attribute vec2 v_texcoord;\n      varying vec2 texcoord;\n      void main() {\n        texcoord = v_texcoord;\n        gl_Position = vec4(v_texcoord * vec2(2) - vec2(1), 0, 1);\n      }\n    ";
  this.attributes = {
    v_texcoord: [[0, 0], [1, 0], [0, 1], [1, 1]]
  };
  this.depth = false;
  this.primitive = 'triangle strip';
  this.count = 4;
};

var Shader = function Shader() {
  this.attributes = '';
  this.uniforms = '';
  this.varyings = '';
  this.globals = '';
  this.functions = '';
  this.mainBody = '';
};

Shader.prototype.compile = function compile () {
  return ("\n      precision highp float;\n      precision highp int;\n\n      // Attributes\n      " + (this.attributes) + "\n\n      // Uniforms\n      " + (this.uniforms) + "\n\n      // Varyings\n      " + (this.varyings) + "\n\n      // Globals\n      " + (this.globals) + "\n\n      // Functions\n      " + (this.functions) + "\n\n      void main() {\n        " + (this.mainBody) + "\n      }\n    ");
};

var ShaderData = function ShaderData(id, type) {
  this.data = [];
  this.id = id;
  this.type = type;
};
ShaderData.prototype.add = function add (name, type, value) {
  var entry = { name: name, type: type, value: value };
  this.data.push(entry);

  return this.getNameFor(entry);
};
ShaderData.prototype.getNameFor = function getNameFor (entry) {
  if (this.id === undefined) {
    return entry.name;
  } else {
    return ((entry.name) + "_" + (this.id));
  }
};
ShaderData.prototype.getCompiled = function getCompiled (shader, storage) {
    var this$1 = this;
    if ( storage === void 0 ) storage = null;

  var shaderStr = [];
  for (var i = 0; i < this.data.length; i++) {
    var entry = this$1.data[i];
    shaderStr.push(((this$1.type) + " " + (entry.type) + " " + (this$1.getNameFor(entry)) + ";"));
    if (storage !== null) {
      // eslint-disable-next-line no-param-reassign
      storage[this$1.getNameFor(entry)] = entry.value;
    }
  }
  return shaderStr.join('\n') + '\n';
};

var Uniforms = (function (ShaderData) {
  function Uniforms(id) {
    ShaderData.call(this, id, 'uniform');
  }

  if ( ShaderData ) Uniforms.__proto__ = ShaderData;
  Uniforms.prototype = Object.create( ShaderData && ShaderData.prototype );
  Uniforms.prototype.constructor = Uniforms;
  Uniforms.prototype.addUniform = function addUniform (name, type, value) {
    return this.add(name, type, value);
  };
  Uniforms.prototype.compile = function compile (shader, uniforms) {
    if ( uniforms === void 0 ) uniforms = null;

    // eslint-disable-next-line no-param-reassign
    shader.uniforms += this.getCompiled(shader, uniforms);
  };

  return Uniforms;
}(ShaderData));

var Attributes = (function (ShaderData) {
  function Attributes(id) {
    ShaderData.call(this, id, 'attribute');
  }

  if ( ShaderData ) Attributes.__proto__ = ShaderData;
  Attributes.prototype = Object.create( ShaderData && ShaderData.prototype );
  Attributes.prototype.constructor = Attributes;
  Attributes.prototype.addAttribute = function addAttribute (name, type, value) {
    return this.add(name, type, value);
  };
  Attributes.prototype.compile = function compile (shader, attributes) {
    if ( attributes === void 0 ) attributes = null;

    // eslint-disable-next-line no-param-reassign
    shader.attributes += this.getCompiled(shader, attributes);
  };

  return Attributes;
}(ShaderData));

var AccumulationAgent = function AccumulationAgent(instance) {
  this.instance = instance;
};
AccumulationAgent.prototype.getFragmentCode = function getFragmentCode () {
  throw new Error('Not implemented');
};

var AccumulationEffect = (function (Effect$$1) {
  function AccumulationEffect () {
    Effect$$1.apply(this, arguments);
  }

  if ( Effect$$1 ) AccumulationEffect.__proto__ = Effect$$1;
  AccumulationEffect.prototype = Object.create( Effect$$1 && Effect$$1.prototype );
  AccumulationEffect.prototype.constructor = AccumulationEffect;

  AccumulationEffect.getAgentClass = function getAgentClass (/* instance */) {
    throw new Error('Not implemented');
  };

  AccumulationEffect.register = function register (instance, props) {
    var AgentClass = this.getAgentClass();
    var agent = new AgentClass(instance);
    props.state.pipeline.addAccumulationAgent(agent);
  };

  AccumulationEffect.supportsRepetition = function supportsRepetition () {
    return false;
  };

  return AccumulationEffect;
}(Effect));

var EffectName$6 = 'Trails';
var EffectDescription$6 = 'Enables an fading image echo';

var TrailsConfigUI = (function (ConfigUI$$1) {
  function TrailsConfigUI() {
    var this$1 = this;

    ConfigUI$$1.call(this);
    this.element = parseHtml(("\n      <fieldset>\n        <legend>" + EffectName$6 + "</legend>\n        <label>\n          Fade-in:\n          <input type=\"number\" class=\"effect-trails-fadein\" value=\"100\" />ms\n        </label><br/>\n        <label>\n          Fade-out:\n          <input type=\"number\" class=\"effect-trails-fadeout\" value=\"500\" />ms\n        </label>\n      </fieldset>\n    "));
    var ui = this.element;
    this.fadeinInput = ui.querySelector('.effect-trails-fadein');
    this.fadeoutInput = ui.querySelector('.effect-trails-fadeout');

    this.fadeinInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.fadeoutInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
  }

  if ( ConfigUI$$1 ) TrailsConfigUI.__proto__ = ConfigUI$$1;
  TrailsConfigUI.prototype = Object.create( ConfigUI$$1 && ConfigUI$$1.prototype );
  TrailsConfigUI.prototype.constructor = TrailsConfigUI;

  TrailsConfigUI.prototype.getElement = function getElement () {
    return this.element;
  };

  TrailsConfigUI.prototype.getConfig = function getConfig () {
    var config = {};
    config.fadein = parseInt(this.fadeinInput.value, 10);
    config.fadeout = parseInt(this.fadeoutInput.value, 10);

    return config;
  };

  TrailsConfigUI.prototype.applyConfig = function applyConfig (config) {
    this.fadeinInput.value = config.fadein;
    this.fadeoutInput.value = config.fadeout;
  };

  return TrailsConfigUI;
}(ConfigUI));

var TrailsAgent = (function (AccumulationAgent$$1) {
  function TrailsAgent(instance) {
    AccumulationAgent$$1.call(this, instance);
  }

  if ( AccumulationAgent$$1 ) TrailsAgent.__proto__ = AccumulationAgent$$1;
  TrailsAgent.prototype = Object.create( AccumulationAgent$$1 && AccumulationAgent$$1.prototype );
  TrailsAgent.prototype.constructor = TrailsAgent;
  TrailsAgent.prototype.getFragmentCode = function getFragmentCode (uniforms) {
    return "\n      accumulationEffectResult = mix(particleColor, historyColor, 0.7);\n    ";
  };

  return TrailsAgent;
}(AccumulationAgent));

var TrailsEffect = (function (AccumulationEffect$$1) {
  function TrailsEffect () {
    AccumulationEffect$$1.apply(this, arguments);
  }

  if ( AccumulationEffect$$1 ) TrailsEffect.__proto__ = AccumulationEffect$$1;
  TrailsEffect.prototype = Object.create( AccumulationEffect$$1 && AccumulationEffect$$1.prototype );
  TrailsEffect.prototype.constructor = TrailsEffect;

  TrailsEffect.getAgentClass = function getAgentClass () {
    return TrailsAgent;
  };

  TrailsEffect.getDisplayName = function getDisplayName () {
    return EffectName$6;
  };

  TrailsEffect.getDescription = function getDescription () {
    return EffectDescription$6;
  };

  TrailsEffect.getConfigUI = function getConfigUI () {
    if (!this._configUI) {
      this._configUI = new TrailsConfigUI();
    }

    return this._configUI;
  };

  TrailsEffect.getDefaultConfig = function getDefaultConfig () {
    return {
      fadein: 100,
      fadeout: 500
    };
  };

  TrailsEffect.getRandomConfig = function getRandomConfig () {
    return this.getDefaultConfig();
  };

  return TrailsEffect;
}(AccumulationEffect));

var EffectName$7 = 'Smooth trails';
var EffectDescription$7 = 'Enables an smoother fading image echo';

var SmoothTrailsConfigUI = (function (ConfigUI$$1) {
  function SmoothTrailsConfigUI() {
    var this$1 = this;

    ConfigUI$$1.call(this);
    this.element = parseHtml(("\n      <fieldset>\n        <legend>" + EffectName$7 + "</legend>\n        <label>\n          Fade-in:\n          <input type=\"number\" class=\"effect-smooth-trails-fadein\" value=\"100\" />ms\n        </label><br/>\n        <label>\n          Fade-out:\n          <input type=\"number\" class=\"effect-smooth-trails-fadeout\" value=\"500\" />ms\n        </label>\n      </fieldset>\n    "));
    var ui = this.element;
    this.fadeinInput = ui.querySelector('.effect-smooth-trails-fadein');
    this.fadeoutInput = ui.querySelector('.effect-smooth-trails-fadeout');

    this.fadeinInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.fadeoutInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
  }

  if ( ConfigUI$$1 ) SmoothTrailsConfigUI.__proto__ = ConfigUI$$1;
  SmoothTrailsConfigUI.prototype = Object.create( ConfigUI$$1 && ConfigUI$$1.prototype );
  SmoothTrailsConfigUI.prototype.constructor = SmoothTrailsConfigUI;

  SmoothTrailsConfigUI.prototype.getElement = function getElement () {
    return this.element;
  };

  SmoothTrailsConfigUI.prototype.getConfig = function getConfig () {
    var config = {};
    config.fadein = parseInt(this.fadeinInput.value, 10);
    config.fadeout = parseInt(this.fadeoutInput.value, 10);

    return config;
  };

  SmoothTrailsConfigUI.prototype.applyConfig = function applyConfig (config) {
    this.fadeinInput.value = config.fadein;
    this.fadeoutInput.value = config.fadeout;
  };

  return SmoothTrailsConfigUI;
}(ConfigUI));

var SmoothTrailsAgent = (function (AccumulationAgent$$1) {
  function SmoothTrailsAgent(instance) {
    AccumulationAgent$$1.call(this, instance);
  }

  if ( AccumulationAgent$$1 ) SmoothTrailsAgent.__proto__ = AccumulationAgent$$1;
  SmoothTrailsAgent.prototype = Object.create( AccumulationAgent$$1 && AccumulationAgent$$1.prototype );
  SmoothTrailsAgent.prototype.constructor = SmoothTrailsAgent;

  SmoothTrailsAgent.prototype.getFragmentCode = function getFragmentCode (uniforms) {
    var kernelSize = uniforms.addUniform('kernelSize', 'vec2', function (ctx, props) {
      return [4 / props.state.getWidth(), 4 / props.state.getHeight()];
    });
    return ("\n      vec3 color = /* texture2D(historyTexture, vec2(texcoord.x, texcoord.y)).rgb * .2 + */\n        texture2D(historyTexture, vec2(texcoord.x + " + kernelSize + ".x, texcoord.y)).rgb * .25 +\n        texture2D(historyTexture, vec2(texcoord.x - " + kernelSize + ".x, texcoord.y)).rgb * .25 +\n        texture2D(historyTexture, vec2(texcoord.x, texcoord.y + " + kernelSize + ".y)).rgb * .25 +\n        texture2D(historyTexture, vec2(texcoord.x, texcoord.y - " + kernelSize + ".y)).rgb * .25;\n      accumulationEffectResult = mix(particleColor, color, 0.8);\n    ");
  };

  return SmoothTrailsAgent;
}(AccumulationAgent));

var SmoothTrailsEffect = (function (AccumulationEffect$$1) {
  function SmoothTrailsEffect () {
    AccumulationEffect$$1.apply(this, arguments);
  }

  if ( AccumulationEffect$$1 ) SmoothTrailsEffect.__proto__ = AccumulationEffect$$1;
  SmoothTrailsEffect.prototype = Object.create( AccumulationEffect$$1 && AccumulationEffect$$1.prototype );
  SmoothTrailsEffect.prototype.constructor = SmoothTrailsEffect;

  SmoothTrailsEffect.getAgentClass = function getAgentClass () {
    return SmoothTrailsAgent;
  };

  SmoothTrailsEffect.getDisplayName = function getDisplayName () {
    return EffectName$7;
  };

  SmoothTrailsEffect.getDescription = function getDescription () {
    return EffectDescription$7;
  };

  SmoothTrailsEffect.getConfigUI = function getConfigUI () {
    if (!this._configUI) {
      this._configUI = new SmoothTrailsConfigUI();
    }

    return this._configUI;
  };

  SmoothTrailsEffect.getDefaultConfig = function getDefaultConfig () {
    return {
      fadein: 100,
      fadeout: 500
    };
  };

  SmoothTrailsEffect.getRandomConfig = function getRandomConfig () {
    return this.getDefaultConfig();
  };

  return SmoothTrailsEffect;
}(AccumulationEffect));

var EffectName$8 = 'Smear';
var EffectDescription$8 = 'Smears the image in a circular way';

var SmearConfigUI = (function (ConfigUI$$1) {
  function SmearConfigUI() {
    var this$1 = this;

    ConfigUI$$1.call(this);
    this.element = parseHtml(("\n      <fieldset>\n        <legend>" + EffectName$8 + "</legend>\n        <label>\n          Fade-in:\n          <input type=\"number\" class=\"effect-smear-fadein\" value=\"100\" />ms\n        </label><br/>\n        <label>\n          Fade-out:\n          <input type=\"number\" class=\"effect-smear-fadeout\" value=\"500\" />ms\n        </label>\n      </fieldset>\n    "));
    var ui = this.element;
    this.fadeinInput = ui.querySelector('.effect-smear-fadein');
    this.fadeoutInput = ui.querySelector('.effect-smear-fadeout');

    this.fadeinInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.fadeoutInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
  }

  if ( ConfigUI$$1 ) SmearConfigUI.__proto__ = ConfigUI$$1;
  SmearConfigUI.prototype = Object.create( ConfigUI$$1 && ConfigUI$$1.prototype );
  SmearConfigUI.prototype.constructor = SmearConfigUI;

  SmearConfigUI.prototype.getElement = function getElement () {
    return this.element;
  };

  SmearConfigUI.prototype.getConfig = function getConfig () {
    var config = {};
    config.fadein = parseInt(this.fadeinInput.value, 10);
    config.fadeout = parseInt(this.fadeoutInput.value, 10);

    return config;
  };

  SmearConfigUI.prototype.applyConfig = function applyConfig (config) {
    this.fadeinInput.value = config.fadein;
    this.fadeoutInput.value = config.fadeout;
  };

  return SmearConfigUI;
}(ConfigUI));

var SmearAgent = (function (AccumulationAgent$$1) {
  function SmearAgent(instance) {
    AccumulationAgent$$1.call(this, instance);
  }

  if ( AccumulationAgent$$1 ) SmearAgent.__proto__ = AccumulationAgent$$1;
  SmearAgent.prototype = Object.create( AccumulationAgent$$1 && AccumulationAgent$$1.prototype );
  SmearAgent.prototype.constructor = SmearAgent;
  SmearAgent.prototype.getFragmentCode = function getFragmentCode (uniforms) {
    var invTextureSize = uniforms.addUniform('invTextureSize', 'vec2', function (ctx, props) {
      return [1 / props.state.getWidth(), 1 / props.state.getHeight()];
    });
    return ("\n      vec2 smearDir = vec2(-texcoord.y + .5, texcoord.x - .5);\n      vec3 color = texture2D(historyTexture, texcoord + smearDir * " + invTextureSize + " * 8.).rgb;\n      accumulationEffectResult = mix(particleColor, color, 0.8);\n    ");
  };

  return SmearAgent;
}(AccumulationAgent));

var SmearEffect = (function (AccumulationEffect$$1) {
  function SmearEffect () {
    AccumulationEffect$$1.apply(this, arguments);
  }

  if ( AccumulationEffect$$1 ) SmearEffect.__proto__ = AccumulationEffect$$1;
  SmearEffect.prototype = Object.create( AccumulationEffect$$1 && AccumulationEffect$$1.prototype );
  SmearEffect.prototype.constructor = SmearEffect;

  SmearEffect.getAgentClass = function getAgentClass () {
    return SmearAgent;
  };

  SmearEffect.getDisplayName = function getDisplayName () {
    return EffectName$8;
  };

  SmearEffect.getDescription = function getDescription () {
    return EffectDescription$8;
  };

  SmearEffect.getConfigUI = function getConfigUI () {
    if (!this._configUI) {
      this._configUI = new SmearConfigUI();
    }

    return this._configUI;
  };

  SmearEffect.getDefaultConfig = function getDefaultConfig () {
    return {
      fadein: 100,
      fadeout: 500
    };
  };

  SmearEffect.getRandomConfig = function getRandomConfig () {
    return this.getDefaultConfig();
  };

  return SmearEffect;
}(AccumulationEffect));

var EffectName$9 = 'Standing Wave';
var EffectDescription$9 = 'A standing wave oscillates';

var StandingWaveConfigUI = (function (ConfigUI$$1) {
  function StandingWaveConfigUI() {
    var this$1 = this;

    ConfigUI$$1.call(this);
    this.element = parseHtml(("\n      <fieldset>\n        <legend>" + EffectName$9 + "</legend>\n        <label>\n          Max Amplitude:\n          <input type=\"number\" class=\"effect-standing-wave-max-amplitude\" value=\"0.05\" />\n        </label><br/>\n        <label>\n          Wave count:\n          <input type=\"number\" min=\"1\" step=\"1\" class=\"effect-standing-wave-wave-count\" value=\"20\" />\n        </label><br/>\n        <label>\n          Dimension:\n          <select class=\"effect-standing-wave-dimension\" value=\"y\">\n            <option value=\"y\">Y</option>\n            <option value=\"x\">X</option>\n          </select>\n        </label><br/>\n        <label>\n          Time interpolator:\n          <select class=\"effect-standing-wave-time-interpolation\" value=\"sine\">\n            <option value=\"sine\">Sine</option>\n            <option value=\"linear\">Linear</option>\n          </select>\n        </label><br/>\n        <label>\n          Wave function:\n          <select class=\"effect-standing-wave-function\" value=\"sine\">\n            <option value=\"sine\">Sine</option>\n            <option value=\"linear\">Triangle</option>\n          </select>\n        </label>\n      </fieldset>\n    "));
    var ui = this.element;
    this.maxAmplitudeInput = ui.querySelector('input.effect-standing-wave-max-amplitude');
    this.waveCountInput = ui.querySelector('input.effect-standing-wave-wave-count');
    this.timeInterpolationInput = ui.querySelector('select.effect-standing-wave-time-interpolation');
    this.functionInput = ui.querySelector('select.effect-standing-wave-function');
    this.dimensionInput = ui.querySelector('select.effect-standing-wave-dimension');

    this.maxAmplitudeInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.waveCountInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.timeInterpolationInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.functionInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.dimensionInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
  }

  if ( ConfigUI$$1 ) StandingWaveConfigUI.__proto__ = ConfigUI$$1;
  StandingWaveConfigUI.prototype = Object.create( ConfigUI$$1 && ConfigUI$$1.prototype );
  StandingWaveConfigUI.prototype.constructor = StandingWaveConfigUI;

  StandingWaveConfigUI.prototype.getElement = function getElement () {
    return this.element;
  };

  StandingWaveConfigUI.prototype.getConfig = function getConfig () {
    var config = {};
    config.maxAmplitude = parseFloat(this.maxAmplitudeInput.value, 10);
    config.waveCount = parseFloat(this.waveCountInput.value, 10);
    config.timeInterpolation = this.timeInterpolationInput.value;
    config.waveFunction = this.functionInput.value;
    config.dimension = this.dimensionInput.value;

    return config;
  };

  StandingWaveConfigUI.prototype.applyConfig = function applyConfig (config) {
    this.maxAmplitudeInput.value = config.maxAmplitude;
    this.waveCountInput.value = config.waveCount;
    this.timeInterpolationInput.value = config.timeInterpolation;
    this.functionInput.value = config.waveFunction;
    this.dimensionInput.value = config.dimension;
  };

  return StandingWaveConfigUI;
}(ConfigUI));

var StandingWaveEffect = (function (Effect$$1) {
  function StandingWaveEffect () {
    Effect$$1.apply(this, arguments);
  }

  if ( Effect$$1 ) StandingWaveEffect.__proto__ = Effect$$1;
  StandingWaveEffect.prototype = Object.create( Effect$$1 && Effect$$1.prototype );
  StandingWaveEffect.prototype.constructor = StandingWaveEffect;

  StandingWaveEffect.register = function register (instance, props, uniforms, vertexShader) {
    var maxAmplitude = instance.config.maxAmplitude || 0.05;
    var waveCount = instance.config.waveCount || 20;
    var timeInterpolation = instance.config.timeInterpolation || 'sine';
    var waveFunction = instance.config.waveFunction || 'sine';
    var dimension = instance.config.dimension || 'x';
    var otherDim = {x: 'y', y: 'x'}[dimension];
    if (maxAmplitude !== 0) {
      var time = uniforms.addUniform('time', 'float', function (ctx, props) { return fract((props.clock.getTime() - instance.timeBegin) / instance.getPeriod()); });
      var timeInterpolations = {
        // 'linear' is a triangle function that interpolates the points (0,0),(0.25,1),(0.5,0),(0.75,-1),(1,0)
        // i.e. |/\___
        //      |  \/
        linear: "abs(fract(t + 0.75) - 0.5) * 4. - 1.",
        sine: "sin(t * 2. * PI)"
      };
      var timeInterpolStr = timeInterpolations[timeInterpolation] || timeInterpolations['linear'];
      var waveFunctions = {
        linear: "abs(fract(x + 0.75) - 0.5) * 4. - 1.",
        sine: "sin(x * 2. * PI)"
      };
      var waveFuncStr = waveFunctions[waveFunction] || waveFunctions['linear'];
      // eslint-disable-next-line no-param-reassign
      vertexShader.mainBody += "\n        float t = " + time + ";\n        float x = initialPosition." + otherDim + " * float(" + waveCount + ");\n        float timeAmp = " + timeInterpolStr + ";\n        float posAmp = " + waveFuncStr + ";\n        float amplitude = " + (instance.config.maxAmplitude) + " * posAmp * timeAmp;\n\n        position." + dimension + " += amplitude;\n      ";
    }
  };

  StandingWaveEffect.getDisplayName = function getDisplayName () {
    return EffectName$9;
  };

  StandingWaveEffect.getDescription = function getDescription () {
    return EffectDescription$9;
  };

  StandingWaveEffect.getConfigUI = function getConfigUI () {
    if (!this._configUI) {
      this._configUI = new StandingWaveConfigUI();
    }

    return this._configUI;
  };

  StandingWaveEffect.getDefaultConfig = function getDefaultConfig () {
    return {
      maxAmplitude: 0.05,
      waveCount: 20,
      timeInterpolation: 'linear',
      waveFunction: 'linear',
      dimension: 'y'
    };
  };

  StandingWaveEffect.getRandomConfig = function getRandomConfig () {
    return {
      maxAmplitude: Math.random() * 0.2,
      waveCount: 1 + Math.random() * 30,
      timeInterpolation: ['linear', 'sine'][Math.round(Math.random())],
      waveFunction: ['linear', 'sine'][Math.round(Math.random())],
      dimension: ['y', 'x'][Math.round(Math.random())]
    };
  };

  return StandingWaveEffect;
}(Effect));

var EffectName$10 = 'Sparkle';
var EffectDescription$10 = 'Particle size and brightness increase randomly';

var SparkleConfigUI = (function (ConfigUI$$1) {
  function SparkleConfigUI() {
    var this$1 = this;

    ConfigUI$$1.call(this);
    this.element = parseHtml(("\n      <fieldset>\n        <legend>" + EffectName$10 + "</legend>\n        <label>\n          min scale: <input type=\"number\" min=\"0\" max=\"100\" step=\"1\" class=\"effect-sparkle-minscale\">%\n        </label><br/>\n        <label>\n          max scale: <input type=\"number\" min=\"100\" step=\"1\" class=\"effect-sparkle-maxscale\">%\n        </label><br/>\n        <label>\n          sparkle ratio: <input type=\"number\" min=\"0\" step=\"1\" class=\"effect-sparkle-ratio\">%\n        </label><br/>\n        <label>\n          sparkle duration: <input type=\"number\" min=\"0\" step=\"1\" class=\"effect-sparkle-duration\">ms\n        </label>\n      </fieldset>\n    "));
    var ui = this.element;
    this.minScaleInput = ui.querySelector('.effect-sparkle-minscale');
    this.maxScaleInput = ui.querySelector('.effect-sparkle-maxscale');
    this.ratioInput = ui.querySelector('.effect-sparkle-ratio');
    this.durationInput = ui.querySelector('.effect-sparkle-duration');

    this.minScaleInput.addEventListener('input', function () {
      this$1.notifyChange();
    });
    this.maxScaleInput.addEventListener('input', function () {
      this$1.notifyChange();
    });
    this.ratioInput.addEventListener('input', function () {
      this$1.notifyChange();
    });
    this.durationInput.addEventListener('input', function () {
      this$1.notifyChange();
    });
  }

  if ( ConfigUI$$1 ) SparkleConfigUI.__proto__ = ConfigUI$$1;
  SparkleConfigUI.prototype = Object.create( ConfigUI$$1 && ConfigUI$$1.prototype );
  SparkleConfigUI.prototype.constructor = SparkleConfigUI;

  SparkleConfigUI.prototype.getElement = function getElement () {
    return this.element;
  };

  SparkleConfigUI.prototype.getConfig = function getConfig () {
    var config = {};

    config.scaleMin = parseInt(this.minScaleInput.value, 10) / 100;
    config.scaleMax = parseInt(this.maxScaleInput.value, 10) / 100;
    config.ratio = parseInt(this.ratioInput.value, 10) / 100;
    config.duration = parseInt(this.durationInput.value);

    return config;
  };

  SparkleConfigUI.prototype.applyConfig = function applyConfig (config) {
    this.minScaleInput.value = Math.round(config.scaleMin * 100);
    this.maxScaleInput.value = Math.round(config.scaleMax * 100);
    this.ratioInput.value = Math.round(config.ratio * 100);
    this.durationInput.value = config.duration;
  };

  return SparkleConfigUI;
}(ConfigUI));

var SparkleEffect = (function (Effect$$1) {
  function SparkleEffect () {
    Effect$$1.apply(this, arguments);
  }

  if ( Effect$$1 ) SparkleEffect.__proto__ = Effect$$1;
  SparkleEffect.prototype = Object.create( Effect$$1 && Effect$$1.prototype );
  SparkleEffect.prototype.constructor = SparkleEffect;

  SparkleEffect.register = function register (instance, props, uniforms, vertexShader, frag, attributes) {
    // Params
    var ref = instance.config;
    var scaleMin = ref.scaleMin;
    var scaleMax = ref.scaleMax;
    var ratio = ref.ratio;
    var duration = ref.duration;

    if (scaleMin >= 1 && scaleMax <= 1) {
      return;
    }

    /* How does this work ?
    ProgressFun does some fancy animation on the point size. It does so
    by taking a x value which goes from 0 to 1 in duration time. This is
    a sawtooth function. Since we want the effect to look random, we
    employ a random period (which is based on the duration and the
    ratio) and offset the function by a random value dependent on the
    period. So it looks like this:
     x
    1      /|          /|
          / |         / |
         /  |        /  |
        /   |       /   |
       /    |      /    |
    0 ----+----------------
          0                t
      |  d  |        duration
      |     p     |  period
      | o |          offset

    Since the function differs for each particle, we need to make sure
    that we always display the complete animation and not start
    somewhere in the middle with x != 0 and always end with x == 1.
    */

    // Shader values
    var particlesCount = props.config.xParticlesCount * props.config.yParticlesCount;
    var periodData = new Float32Array(particlesCount);
    var offsetData = new Float32Array(particlesCount);
    for(var i = 0; i < particlesCount; i++) {
      // The period is based on duration (clear).
      // Divide by ratio to get a reduced effect with smaller ratios.
      // Randomize the period by shifting it a bit in any direction.
      periodData[i] = Math.max((1 + (Math.random() * 2 - 1) * .25) * duration / ratio, duration);
      offsetData[i] = Math.random() * periodData[i];
    }

    var ref$1 = props.state.createBuffer(periodData);
    var periodBufId = ref$1.id;
    var periodBuffer = ref$1.buffer;
    var ref$2 = props.state.createBuffer(offsetData);
    var offsetBufId = ref$2.id;
    var offsetBuffer = ref$2.buffer;

    var period = attributes.add('period', 'float', periodBuffer);
    var offset = attributes.add('offset', 'float', offsetBuffer);

    var progressFun = "\n      float dMin = float(" + scaleMin + ");\n      float dMax = float(" + scaleMax + ");\n      float a = (2. * dMax - 6. * dMin + 4.);\n      float b = 4. * dMin - 0.25 * a - 4.;\n      float progressFun = 1. - sin(2. * PI * x) * (a * pow(x, 2.) + b * x + 1.);\n    ";
    if (scaleMin >= 1) {
      progressFun = "\n        float dMax = float(" + scaleMax + ") - 1.;\n        float progressFun = 1. + (1. - cos(2. * PI * x)) * dMax / 2.;\n      ";
    } else if (scaleMax <= 1) {
      progressFun = "\n        float dMin = 1. - float(" + scaleMin + ");\n        float progressFun = 1. + cos(2. * PI * x) * dMin / 2.;\n      ";
    } 

    // eslint-disable-next-line no-param-reassign
    vertexShader.mainBody += "\n      {\n        float firstPeriodBegin = float(" + (instance.timeBegin) + ") - " + offset + ";\n        if (firstPeriodBegin < float(" + (instance.timeBegin) + ")) firstPeriodBegin += " + period + ";\n        float lastPeriodBegin = float(" + (instance.timeBegin) + ") + ceil(float(" + (instance.timeEnd - instance.timeBegin) + ") / " + period + ") * " + period + " - " + offset + ";\n        if (lastPeriodBegin > float(" + (instance.timeEnd) + ")) lastPeriodBegin -= " + period + ";\n        float lastPeriodLength = float(" + (instance.timeEnd) + ") - lastPeriodBegin;\n        if (float(globalTime) >= firstPeriodBegin\n          && (lastPeriodLength >= float(" + duration + ") || float(globalTime) < lastPeriodBegin)) {\n          float t = mod(float(globalTime) - float(" + (instance.timeBegin) + ") + " + offset + ", " + period + ");\n          float x = t > float(" + duration + ") ? 0. : t * " + (1/duration) + ";\n          " + progressFun + "\n          pointSize *= progressFun;\n          color *= progressFun;\n        }\n      }\n    ";
  };

  SparkleEffect.getDisplayName = function getDisplayName () {
    return EffectName$10;
  };

  SparkleEffect.getDescription = function getDescription () {
    return EffectDescription$10;
  };

  SparkleEffect.getConfigUI = function getConfigUI () {
    if (!this._configUI) {
      this._configUI = new SparkleConfigUI();
    }

    return this._configUI;
  };

  SparkleEffect.getDefaultConfig = function getDefaultConfig () {
    return {
      scaleMin: 0.5,
      scaleMax: 2,
      ratio: 0.7,
      duration: 700
    };
  };

  SparkleEffect.getRandomConfig = function getRandomConfig () {
    return {
      scaleMin: parseFloat(Math.random().toFixed(3)),
      scaleMax: parseFloat(Math.max(1, Math.random() * 15).toFixed(3)),
      ratio: parseFloat(Math.random().toFixed(3)),
      duration: Math.max(500, Math.round(Math.random() * 5000))
    };
  };

  return SparkleEffect;
}(Effect));

var Ease = function Ease () {};

Ease.makeConfigMarkup = function makeConfigMarkup (classPrefix) {
  var markup = parseHtml(("\n      <div>\n        <label>\n          Ease in time:\n          <input type=\"number\" min=\"0\" step=\"1\" class=\"" + classPrefix + "-ease-in\" value=\"1000\" />\n          ms\n        </label><br/>\n        <label>\n          Ease out time:\n          <input type=\"number\" min=\"0\" step=\"1\" class=\"" + classPrefix + "-ease-out\" value=\"1000\" />\n          ms\n        </label><br/>\n        <label>\n          Ease function:\n          <select class=\"" + classPrefix + "-ease-func\" value=\"sine\">\n            <option value=\"sine\" selected>Sine</option>\n            <option value=\"linear\">Linear</option>\n            <option value=\"none\">None</option>\n          </select>\n        </label>\n      </div>\n    "));
  var fragment = document.createDocumentFragment();
  while (markup.childNodes.length > 0) {
    fragment.appendChild(markup.firstChild);
  }
  return fragment;
};

Ease.extendWithConfigInputs = function extendWithConfigInputs (configUI, classPrefix) {
  var element = configUI.getElement();
  configUI.easeInInput = element.querySelector(("input." + classPrefix + "-ease-in"));
  configUI.easeOutInput = element.querySelector(("input." + classPrefix + "-ease-out"));
  configUI.easeFuncInput = element.querySelector(("select." + classPrefix + "-ease-func"));
  configUI.easeInInput.addEventListener('change', function () {
    configUI.notifyChange();
  });
  configUI.easeOutInput.addEventListener('change', function () {
    configUI.notifyChange();
  });
  configUI.easeFuncInput.addEventListener('change', function () {
    configUI.notifyChange();
  });
};

Ease.extendConfig = function extendConfig (configUI, config) {
  config.easeInTime = parseInt(configUI.easeInInput.value, 10);
  config.easeOutTime = parseInt(configUI.easeOutInput.value, 10);
  config.easeFunc = configUI.easeFuncInput.value;
  return config;
};

Ease.applyConfig = function applyConfig (configUI, config) {
  configUI.easeInInput.value = config.easeInTime || 1000;
  configUI.easeOutInput.value = config.easeOutTime || 1000;
  configUI.easeFuncInput.value = config.easeFunc || 'sine';
};

Ease.extend = function extend (configUI, classPrefix, appendInputsSelector) {
    if ( appendInputsSelector === void 0 ) appendInputsSelector = null;

  var container = configUI.getElement();
  if (appendInputsSelector !== null) {
    container = container.querySelector(appendInputsSelector);
  }
  container.appendChild(Ease.makeConfigMarkup(classPrefix));
  Ease.extendWithConfigInputs(configUI, classPrefix);
  var oldGetConfig = configUI.getConfig;
  var oldApplyConfig = configUI.applyConfig;

  configUI.getConfig = function() {
    return Ease.extendConfig(configUI, oldGetConfig.call(configUI));
  };
  configUI.applyConfig = function(config) {
    Ease.applyConfig(configUI, config);
    oldApplyConfig.call(configUI, config);
  };
};

Ease.setupShaderEasing = function setupShaderEasing (instance, uniforms) {
  var easeInTime = Math.min(instance.config.easeInTime || 1000, instance.getPeriod() / 2);
  var easeOutTime = Math.min(instance.config.easeOutTime || 1000, instance.getPeriod() - easeInTime);
  // starts at 0, goes down to 1
  var easeInProgress = uniforms.addUniform('easeInProgress', 'float', function (ctx, props) {
    var time = fract((props.clock.getTime() - instance.timeBegin) / instance.getPeriod());
    return Math.min(1, time / (easeInTime / instance.getPeriod()));
  });
  // starts at 1, goes down to 0
  var easeOutProgress = uniforms.addUniform('easeOutProgress', 'float', function (ctx, props) {
    var time = fract((props.clock.getTime() - instance.timeBegin) / instance.getPeriod());
    return Math.min(1, (1 - time) / (easeOutTime / instance.getPeriod()));
  });
  var easeFuncs = {
    none: '1.',
    sine: ("(1. - cos(PI * min(" + easeInProgress + ", " + easeOutProgress + "))) / 2."),
    linear: ("min(" + easeInProgress + ", " + easeOutProgress + ")")
  };
  var easeFunc = easeFuncs[instance.config.easeFunc || 'sine'];
  return easeFunc;
};

var EffectName$11 = 'Particle spacing';
var EffectDescription$11 = 'Adds or removes space between particles';

var ParticleSpacingConfigUI = (function (ConfigUI$$1) {
  function ParticleSpacingConfigUI() {
    var this$1 = this;

    ConfigUI$$1.call(this);
    var classPrefix = 'effect-particle-spacing';
    this.element = parseHtml(("\n      <fieldset>\n        <legend>" + EffectName$11 + "</legend>\n        <label>\n          X spacing factor\n          <input type=\"number\" class=\"" + classPrefix + "-xspread\" value=\"1\" />\n        </label><br/>\n        <label>\n          Y spacing factor\n          <input type=\"number\" class=\"" + classPrefix + "-yspread\" value=\"1\" />\n        </label><br/>\n      </fieldset>\n    "));
    var ui = this.element;
    this.xSpreadInput = ui.querySelector(("input." + classPrefix + "-xspread"));
    this.ySpreadInput = ui.querySelector(("input." + classPrefix + "-yspread"));

    this.xSpreadInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.ySpreadInput.addEventListener('change', function () {
      this$1.notifyChange();
    });

    Ease.extend(this, classPrefix);
  }

  if ( ConfigUI$$1 ) ParticleSpacingConfigUI.__proto__ = ConfigUI$$1;
  ParticleSpacingConfigUI.prototype = Object.create( ConfigUI$$1 && ConfigUI$$1.prototype );
  ParticleSpacingConfigUI.prototype.constructor = ParticleSpacingConfigUI;

  ParticleSpacingConfigUI.prototype.getElement = function getElement () {
    return this.element;
  };

  ParticleSpacingConfigUI.prototype.getConfig = function getConfig () {
    return {
      xSpread: parseFloat(this.xSpreadInput.value, 10),
      ySpread: parseFloat(this.ySpreadInput.value, 10)
    };
  };

  ParticleSpacingConfigUI.prototype.applyConfig = function applyConfig (config) {
    this.xSpreadInput.value = config.xSpread || 1;
    this.ySpreadInput.value = config.ySpread || 1;
  };

  return ParticleSpacingConfigUI;
}(ConfigUI));

var ParticleSpacingEffect = (function (Effect$$1) {
  function ParticleSpacingEffect () {
    Effect$$1.apply(this, arguments);
  }

  if ( Effect$$1 ) ParticleSpacingEffect.__proto__ = Effect$$1;
  ParticleSpacingEffect.prototype = Object.create( Effect$$1 && Effect$$1.prototype );
  ParticleSpacingEffect.prototype.constructor = ParticleSpacingEffect;

  ParticleSpacingEffect.register = function register (instance, props, uniforms, vertexShader) {
    var xSpread = instance.config.xSpread || 1;
    var ySpread = instance.config.ySpread || 1;
    var easeInTime = Math.min(instance.config.easeInTime || 1000, instance.getPeriod() / 2);
    var easeOutTime = Math.min(instance.config.easeOutTime || 1000, instance.getPeriod() - easeInTime);

    // starts at 0, goes down to 1
    var easeInProgress = uniforms.addUniform('easeInProgress', 'float', function (ctx, props) {
      var time = fract((props.clock.getTime() - instance.timeBegin) / instance.getPeriod());
      return Math.min(1, time / (easeInTime / instance.getPeriod()));
    });
    // starts at 1, goes down to 0
    var easeOutProgress = uniforms.addUniform('easeOutProgress', 'float', function (ctx, props) {
      var time = fract((props.clock.getTime() - instance.timeBegin) / instance.getPeriod());
      return Math.min(1, (1 - time) / (easeOutTime / instance.getPeriod()));
    });
    var easeFuncs = {
      none: '1.',
      sine: ("(1. - cos(PI * min(" + easeInProgress + ", " + easeOutProgress + "))) / 2."),
      linear: ("min(" + easeInProgress + ", " + easeOutProgress + ")")
    };
    var easeFunc = easeFuncs[instance.config.easeFunc || 'sine'];
    vertexShader.mainBody += "\n      vec2 offset;\n      offset.x = initialPosition.x * float(" + xSpread + ") - (float(" + xSpread + ") - 1.) / 2.;\n      offset.y = initialPosition.y * float(" + ySpread + ") - (float(" + ySpread + ") - 1.) / 2.;\n      offset -= initialPosition.xy;\n      float ease = " + easeFunc + ";\n      offset *= ease;\n      position.xy += offset;\n    ";
  };

  ParticleSpacingEffect.getDisplayName = function getDisplayName () {
    return EffectName$11;
  };

  ParticleSpacingEffect.getDescription = function getDescription () {
    return EffectDescription$11;
  };

  ParticleSpacingEffect.getConfigUI = function getConfigUI () {
    if (!this._configUI) {
      this._configUI = new ParticleSpacingConfigUI();
    }

    return this._configUI;
  };

  ParticleSpacingEffect.getDefaultConfig = function getDefaultConfig () {
    return {
      xSpread: 2,
      ySpread: 2,
      easeInTime: 1000,
      easeOutTime: 1000,
      easeFunc: 'sine'
    };
  };

  ParticleSpacingEffect.getRandomConfig = function getRandomConfig () {
    return {
      xSpread: Math.random() > 0.5 ? 0.5 : 1.5,
      ySpread: Math.random() > 0.5 ? 0.5 : 1.5,
      easeInTime: 1000,
      easeOutTime: 1000,
      easeFunc: ['sine', 'linear', 'none'][Math.floor(Math.random() * 3)]
    };
  };

  return ParticleSpacingEffect;
}(Effect));

var EffectName$12 = 'Displace Particles';
var EffectDescription$12 = 'Displaces all particles into a certain direction by the same distance';

var ParticleDisplaceConfigUI = (function (ConfigUI$$1) {
  function ParticleDisplaceConfigUI() {
    var this$1 = this;

    ConfigUI$$1.call(this);
    var classPrefix = 'effect-particle-displace';
    this.element = parseHtml(("\n      <fieldset>\n        <legend>" + EffectName$12 + "</legend>\n        <label>\n          Displace distance:\n          <input type=\"number\" min=\"0\" class=\"" + classPrefix + "-distance\" value=\"0.5\" />\n        </label><br/>\n        <label>\n          Displace direction:\n          <input type=\"number\" class=\"" + classPrefix + "-direction\" value=\"135\" />\n        </label>\n        <select class=\"" + classPrefix + "-direction-unit\">\n          <option value=\"degrees\" selected>deg</option>\n          <option value=\"radians\">rad</option>\n        </select>\n        <br/>\n      </fieldset>\n    "));
    var ui = this.element;
    this.distanceInput = ui.querySelector(("input." + classPrefix + "-distance"));
    this.directionInput = ui.querySelector(("input." + classPrefix + "-direction"));
    this.directionUnitInput = ui.querySelector(("select." + classPrefix + "-direction-unit"));

    this.distanceInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.directionInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.directionUnitInput.addEventListener('change', function () {
      this$1.notifyChange();
    });

    Ease.extend(this, classPrefix);
  }

  if ( ConfigUI$$1 ) ParticleDisplaceConfigUI.__proto__ = ConfigUI$$1;
  ParticleDisplaceConfigUI.prototype = Object.create( ConfigUI$$1 && ConfigUI$$1.prototype );
  ParticleDisplaceConfigUI.prototype.constructor = ParticleDisplaceConfigUI;

  ParticleDisplaceConfigUI.prototype.getElement = function getElement () {
    return this.element;
  };

  ParticleDisplaceConfigUI.prototype.getConfig = function getConfig () {
    return {
      direction: parseFloat(this.directionInput.value),
      directionUnit: this.directionUnitInput.value,
      distance: parseFloat(this.distanceInput.value)
    };
  };

  ParticleDisplaceConfigUI.prototype.applyConfig = function applyConfig (config) {
    this.directionInput.value = config.direction || 135;
    this.directionUnitInput.value = config.directionUnit || 'degrees';
    this.distanceInput.value = config.distance || 0.5;
  };

  return ParticleDisplaceConfigUI;
}(ConfigUI));

var ParticleDisplaceEffect = (function (Effect$$1) {
  function ParticleDisplaceEffect () {
    Effect$$1.apply(this, arguments);
  }

  if ( Effect$$1 ) ParticleDisplaceEffect.__proto__ = Effect$$1;
  ParticleDisplaceEffect.prototype = Object.create( Effect$$1 && Effect$$1.prototype );
  ParticleDisplaceEffect.prototype.constructor = ParticleDisplaceEffect;

  ParticleDisplaceEffect.register = function register (instance, props, uniforms, vertexShader) {
    var angle = instance.config.direction || 135;
    if (instance.config.directionUnit !== 'radians') {
      angle = angle / 360 * 2 * Math.PI;
    }
    angle = (angle + 2 * Math.PI) % (2 * Math.PI);
    var distance = instance.config.distance || 0.5;
    var easeFunc = Ease.setupShaderEasing(instance, uniforms);
    vertexShader.mainBody += "\n      vec2 offset;\n      offset.y = cos(float(" + angle + "));\n      offset.x = sqrt(1. - pow(offset.y, 2.)) * (-2. * floor(float(" + angle + ") / PI) + 1.);\n      offset *= float(" + distance + ");\n      float ease = " + easeFunc + ";\n      offset *= ease;\n      position.xy += offset;\n    ";
  };

  ParticleDisplaceEffect.getDisplayName = function getDisplayName () {
    return EffectName$12;
  };

  ParticleDisplaceEffect.getDescription = function getDescription () {
    return EffectDescription$12;
  };

  ParticleDisplaceEffect.getConfigUI = function getConfigUI () {
    if (!this._configUI) {
      this._configUI = new ParticleDisplaceConfigUI();
    }

    return this._configUI;
  };

  ParticleDisplaceEffect.getDefaultConfig = function getDefaultConfig () {
    return {
      direction: 135,
      directionUnit: 'degrees',
      distance: 0.5,
      easeInTime: 1000,
      easeOutTime: 1000,
      easeFunc: 'sine'
    };
  };

  ParticleDisplaceEffect.getRandomConfig = function getRandomConfig () {
    return {
      direction: Math.random() * 360,
      directionUnit: 'degrees',
      distance: Math.random() - 0.5,
      easeInTime: 1000,
      easeOutTime: 1000,
      easeFunc: ['sine', 'linear'][Math.floor(Math.random() * 2)]
    };
  };

  return ParticleDisplaceEffect;
}(Effect));

var EffectName$13 = 'Particle size by hue';
var EffectDescription$13 = 'Particles will have different sizes depending on their color';

var ParticleSizeByHueConfigUI = (function (ConfigUI$$1) {
  function ParticleSizeByHueConfigUI() {
    var this$1 = this;

    ConfigUI$$1.call(this);
    var classPrefix = 'effect-particle-size-by-hue';
    this.element = parseHtml(("\n      <fieldset>\n        <legend>" + EffectName$13 + "</legend>\n        <label>\n          Scaling factor:\n          <input type=\"number\" min=\"0\" class=\"" + classPrefix + "-scaling\" value=\"2\" />\n        </label><br/>\n        <label>\n          Hue rotation:\n          <input type=\"number\" min=\"0\" max=\"100\" step=\"1\" class=\"" + classPrefix + "-rotation\" value=\"0\" />%\n        </label><br/>\n      </fieldset>\n    "));
    var ui = this.element;
    this.scalingInput = ui.querySelector(("input." + classPrefix + "-scaling"));
    this.hueRotationInput = ui.querySelector(("input." + classPrefix + "-rotation"));

    this.scalingInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.hueRotationInput.addEventListener('change', function () {
      this$1.notifyChange();
    });

    Ease.extend(this, classPrefix);
  }

  if ( ConfigUI$$1 ) ParticleSizeByHueConfigUI.__proto__ = ConfigUI$$1;
  ParticleSizeByHueConfigUI.prototype = Object.create( ConfigUI$$1 && ConfigUI$$1.prototype );
  ParticleSizeByHueConfigUI.prototype.constructor = ParticleSizeByHueConfigUI;

  ParticleSizeByHueConfigUI.prototype.getElement = function getElement () {
    return this.element;
  };

  ParticleSizeByHueConfigUI.prototype.getConfig = function getConfig () {
    var config = {
      scaling: parseFloat(this.scalingInput.value),
      hueRotation: parseInt(this.hueRotationInput.value) / 100 * 2 * Math.PI,
    };
    return config;
  };

  ParticleSizeByHueConfigUI.prototype.applyConfig = function applyConfig (config) {
    this.scalingInput.value = config.scaling;
    this.hueRotationInput.value = Math.round(config.hueRotation / 2 / Math.PI * 100);
  };

  return ParticleSizeByHueConfigUI;
}(ConfigUI));

var ParticleSizeByHueEffect = (function (Effect$$1) {
  function ParticleSizeByHueEffect () {
    Effect$$1.apply(this, arguments);
  }

  if ( Effect$$1 ) ParticleSizeByHueEffect.__proto__ = Effect$$1;
  ParticleSizeByHueEffect.prototype = Object.create( Effect$$1 && Effect$$1.prototype );
  ParticleSizeByHueEffect.prototype.constructor = ParticleSizeByHueEffect;

  ParticleSizeByHueEffect.register = function register (instance, props, uniforms, vertexShader) {
    var scaling = instance.config.scaling || 1;
    var hueRotation = instance.config.hueRotation || 0;
    var easeInTime = Math.min(instance.config.easeInTime || 1000, instance.getPeriod() / 2);
    var easeOutTime = Math.min(instance.config.easeOutTime || 1000, instance.getPeriod() - easeInTime);
    // starts at 0, goes down to 1
    var easeInProgress = uniforms.addUniform('easeInProgress', 'float', function (ctx, props) {
      var time = fract((props.clock.getTime() - instance.timeBegin) / instance.getPeriod());
      return Math.min(1, time / (easeInTime / instance.getPeriod()));
    });
    // starts at 1, goes down to 0
    var easeOutProgress = uniforms.addUniform('easeOutProgress', 'float', function (ctx, props) {
      var time = fract((props.clock.getTime() - instance.timeBegin) / instance.getPeriod());
      return Math.min(1, (1 - time) / (easeOutTime / instance.getPeriod()));
    });
    var easeFuncs = {
      none: '1.',
      sine: ("(1. - cos(PI * min(" + easeInProgress + ", " + easeOutProgress + "))) / 2."),
      linear: ("min(" + easeInProgress + ", " + easeOutProgress + ")")
    };
    var easeFunc = easeFuncs[instance.config.easeFunc || 'sine'];
    vertexShader.mainBody += "\n      // Generate a number between 0 and 1 depending on position on hue wheel\n      float huePosition = fract((hsv[0] + float(" + hueRotation + ")) / (2. * PI));\n      // A scaling value of 0.5 means a decrease by 50%\n      float increase = (float(" + scaling + ") - 1.) * huePosition;\n      float sizeDiff = increase * pointSize;\n      float ease = " + easeFunc + ";\n      pointSize += sizeDiff * ease;\n    ";
  };

  ParticleSizeByHueEffect.getDisplayName = function getDisplayName () {
    return EffectName$13;
  };

  ParticleSizeByHueEffect.getDescription = function getDescription () {
    return EffectDescription$13;
  };

  ParticleSizeByHueEffect.getConfigUI = function getConfigUI () {
    if (!this._configUI) {
      this._configUI = new ParticleSizeByHueConfigUI();
    }

    return this._configUI;
  };

  ParticleSizeByHueEffect.getDefaultConfig = function getDefaultConfig () {
    return {
      scaling: 2,
      hueRotation: 0,
      easeInTime: 1000,
      easeOutTime: 1000,
      easeFunc: 'sine'
    };
  };

  ParticleSizeByHueEffect.getRandomConfig = function getRandomConfig () {
    return {
      scaling: Math.random() * 3,
      hueRotation: Math.random() * 2 * Math.PI,
      easeInTime: 1000,
      easeOutTime: 1000,
      easeFunc: ['sine', 'linear', 'none'][Math.floor(Math.random() * 3)]
    };
  };

  return ParticleSizeByHueEffect;
}(Effect));

var EffectName$14 = 'Reset Default Image';
var EffectDescription$14 = 'This effect changes the currently active image ' +
                          'back to the default image (i.e. what came from ' +
                          'the server or was uploaded by the user)';

var ResetDefaultImageConfigUI = (function (ConfigUI$$1) {
  function ResetDefaultImageConfigUI() {
    ConfigUI$$1.call(this);
    this.element = parseHtml(("\n      <fieldset>\n        <legend>" + EffectName$14 + "</legend>\n        Nothing to be configured :)\n      </fieldset>\n    "));
    var ui = this.element;
  }

  if ( ConfigUI$$1 ) ResetDefaultImageConfigUI.__proto__ = ConfigUI$$1;
  ResetDefaultImageConfigUI.prototype = Object.create( ConfigUI$$1 && ConfigUI$$1.prototype );
  ResetDefaultImageConfigUI.prototype.constructor = ResetDefaultImageConfigUI;

  ResetDefaultImageConfigUI.prototype.getElement = function getElement () {
    return this.element;
  };

  ResetDefaultImageConfigUI.prototype.getConfig = function getConfig () {
    return {};
  };

  ResetDefaultImageConfigUI.prototype.applyConfig = function applyConfig (config) {
  };

  return ResetDefaultImageConfigUI;
}(ConfigUI));

var ResetDefaultImageEffect = (function (Effect$$1) {
  function ResetDefaultImageEffect () {
    Effect$$1.apply(this, arguments);
  }

  if ( Effect$$1 ) ResetDefaultImageEffect.__proto__ = Effect$$1;
  ResetDefaultImageEffect.prototype = Object.create( Effect$$1 && Effect$$1.prototype );
  ResetDefaultImageEffect.prototype.constructor = ResetDefaultImageEffect;

  ResetDefaultImageEffect.register = function register (instance, props, uniforms, vertexShader) {
    var alive = true;
    var prevWasChange = false;
    var checkTime = function () {
      if (!alive) {
        return;
      }
      var tDist = props.clock.getTime() - instance.timeBegin;
      if (0 <= tDist && tDist <= props.clock.getDelta()) {
        props.state.setParticleData(0);
      }
      window.requestAnimationFrame(checkTime);
    };
    checkTime();
    props.state.addHook(function () {
      alive = false;
    });
  };

  ResetDefaultImageEffect.getDisplayName = function getDisplayName () {
    return EffectName$14;
  };

  ResetDefaultImageEffect.getDescription = function getDescription () {
    return EffectDescription$14;
  };

  ResetDefaultImageEffect.getConfigUI = function getConfigUI () {
    if (!this._configUI) {
      this._configUI = new ResetDefaultImageConfigUI();
    }

    return this._configUI;
  };

  ResetDefaultImageEffect.getDefaultConfig = function getDefaultConfig () {
    return {};
  };

  ResetDefaultImageEffect.getRandomConfig = function getRandomConfig () {
    return {};
  };

  ResetDefaultImageEffect.isEventOnly = function isEventOnly () {
    return true;
  };

  return ResetDefaultImageEffect;
}(Effect));

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};





function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var imagecapture = createCommonjsModule(function (module, exports) {
(function (global, factory) {
  if (typeof undefined === "function" && undefined.amd) {
    undefined(['exports'], factory);
  } else {
    factory(exports);
  }
})(commonjsGlobal, function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) { descriptor.writable = true; }
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) { defineProperties(Constructor.prototype, protoProps); }
      if (staticProps) { defineProperties(Constructor, staticProps); }
      return Constructor;
    };
  }();

  /**
   * MediaStream ImageCapture polyfill
   *
   * @license
   * Copyright 2017 Google Inc.
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */

  var ImageCapture = exports.ImageCapture = window.ImageCapture;

  if (typeof ImageCapture === 'undefined') {
    exports.ImageCapture = ImageCapture = function () {

      /**
       * TODO https://www.w3.org/TR/image-capture/#constructors
       *
       * @param {MediaStreamTrack} videoStreamTrack - A MediaStreamTrack of the 'video' kind
       */
      function ImageCapture(videoStreamTrack) {
        _classCallCheck(this, ImageCapture);

        if (videoStreamTrack.kind !== 'video') { throw new DOMException('NotSupportedError'); }

        this._videoStreamTrack = videoStreamTrack;
        if (!('readyState' in this._videoStreamTrack)) {
          // Polyfill for Firefox
          this._videoStreamTrack.readyState = 'live';
        }

        // MediaStream constructor not available until Chrome 55 - https://www.chromestatus.com/feature/5912172546752512
        this._previewStream = new MediaStream([videoStreamTrack]);
        this.videoElement = document.createElement('video');
        this.videoElement.src = URL.createObjectURL(this._previewStream);
        this.videoElement.muted = true;
        this.videoElement.play(); // required by Firefox

        this.canvasElement = document.createElement('canvas');
        // TODO Firefox has https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
        this.canvas2dContext = this.canvasElement.getContext('2d');
      }

      /**
       * https://w3c.github.io/mediacapture-image/index.html#dom-imagecapture-videostreamtrack
       * @return {MediaStreamTrack} The MediaStreamTrack passed into the constructor
       */


      _createClass(ImageCapture, [{
        key: 'getPhotoCapabilities',


        /**
         * Implements https://www.w3.org/TR/image-capture/#dom-imagecapture-getphotocapabilities
         * @return {Promise<PhotoCapabilities>} Fulfilled promise with [PhotoCapabilities](https://www.w3.org/TR/image-capture/#idl-def-photocapabilities) object on success, rejected promise on failure
         */
        value: function getPhotoCapabilities() {
          return new Promise(function executorGPC(resolve, reject) {
            // TODO see https://github.com/w3c/mediacapture-image/issues/97
            var MediaSettingsRange = {
              current: 0, min: 0, max: 0
            };
            resolve({
              exposureCompensation: MediaSettingsRange,
              exposureMode: 'none',
              fillLightMode: 'none',
              focusMode: 'none',
              imageHeight: MediaSettingsRange,
              imageWidth: MediaSettingsRange,
              iso: MediaSettingsRange,
              redEyeReduction: false,
              whiteBalanceMode: 'none',
              zoom: MediaSettingsRange
            });
            reject(new DOMException('OperationError'));
          });
        }

        /**
         * Implements https://www.w3.org/TR/image-capture/#dom-imagecapture-setoptions
         * @param {Object} photoSettings - Photo settings dictionary, https://www.w3.org/TR/image-capture/#idl-def-photosettings
         * @return {Promise<void>} Fulfilled promise on success, rejected promise on failure
         */

      }, {
        key: 'setOptions',
        value: function setOptions() {
          var photoSettings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

          return new Promise(function executorSO(resolve, reject) {
            // TODO
          });
        }

        /**
         * TODO
         * Implements https://www.w3.org/TR/image-capture/#dom-imagecapture-takephoto
         * @return {Promise<Blob>} Fulfilled promise with [Blob](https://www.w3.org/TR/FileAPI/#blob) argument on success; rejected promise on failure
         */

      }, {
        key: 'takePhoto',
        value: function takePhoto() {
          var self = this;
          return new Promise(function executorTP(resolve, reject) {
            // `If the readyState of the MediaStreamTrack provided in the constructor is not live,
            // return a promise rejected with a new DOMException whose name is "InvalidStateError".`
            if (self._videoStreamTrack.readyState === 'live') {
              // -- however, checking for `live` alone doesn't guarantee the video is ready
              if (self.videoElement.videoWidth) {
                try {
                  self.canvasElement.width = self.videoElement.videoWidth;
                  self.canvasElement.height = self.videoElement.videoHeight;
                  self.canvas2dContext.drawImage(self.videoElement, 0, 0);
                  self.canvasElement.toBlob(function (blob) {
                    resolve(blob);
                  });
                } catch (error) {
                  reject(new DOMException('UnknownError'));
                }
              } else {
                reject(new DOMException('UnknownError'));
              }
            } else {
              reject(new DOMException('InvalidStateError'));
            }
          });
        }

        /**
         * Implements https://www.w3.org/TR/image-capture/#dom-imagecapture-grabframe
         * @return {Promise<ImageBitmap>} Fulfilled promise with [ImageBitmap](https://www.w3.org/TR/html51/webappapis.html#webappapis-images) argument on success; rejected promise on failure
         */

      }, {
        key: 'grabFrame',
        value: function grabFrame() {
          var self = this;
          return new Promise(function executorGF(resolve, reject) {
            if (self._videoStreamTrack.readyState === 'live') {
              if (self.videoElement.videoWidth) {
                try {
                  // videoWidth is available after videoElement.onloadedmetadata fires
                  self.canvasElement.width = self.videoElement.videoWidth;
                  self.canvasElement.height = self.videoElement.videoHeight;
                  // The video has an image after videoElement.oncanplay triggers
                  self.canvas2dContext.drawImage(self.videoElement, 0, 0);
                  // TODO polyfill https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmapFactories/createImageBitmap for IE
                  resolve(window.createImageBitmap(self.canvasElement));
                } catch (error) {
                  reject(new DOMException('UnknownError'));
                }
              } else {
                reject(new DOMException('UnknownError'));
              }
            } else {
              reject(new DOMException('InvalidStateError'));
            }
          });
        }
      }, {
        key: 'videoStreamTrack',
        get: function get() {
          return this._videoStreamTrack;
        }
      }]);

      return ImageCapture;
    }();
  }
});
});

var imagecapture_1 = imagecapture.ImageCapture;

var EffectName$15 = 'Webcam';
var EffectDescription$15 = 'Make use of the user\'s webcam as the particles\' color values';

var WebcamConfigUI = (function (ConfigUI$$1) {
  function WebcamConfigUI() {
    var this$1 = this;

    ConfigUI$$1.call(this);
    var classPrefix = 'effect-webcam';
    this.element = parseHtml(("\n      <fieldset>\n        <legend>" + EffectName$15 + "</legend>\n        Especially in Firefox, it is sometimes necessary to wait some time\n        before webcam images can be retrieved. It may also be helpful to\n        retry connecting to the webcam several times.\n        <br />\n        <label>\n          Max number of retries:\n          <input type=\"number\" min=\"0\" max=\"10\" step=\"1\" value=\"3\" class=\"" + classPrefix + "-retries\" />\n        </label>\n        <br/>\n        <label>\n          Delay between retries:\n          <input type=\"number\" min=\"0\" max=\"10000\" step=\"1\" value=\"1000\" class=\"" + classPrefix + "-retry-timeout\" />ms\n        </label>\n        <br/>\n        " + (imageScalingMarkup(classPrefix)) + "\n      </fieldset>\n    "));
    var ui = this.element;
    this.maxRetriesInput = ui.querySelector(("." + classPrefix + "-retries"));
    this.retryTimeoutInput = ui.querySelector(("." + classPrefix + "-retry-timeout"));

    this.maxRetriesInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.retryTimeoutInput.addEventListener('change', function () {
      this$1.notifyChange();
    });

    this.scalingSelect = ui.querySelector(("select." + classPrefix + "-scaling-select"));
    this.scalingSelect.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.cropXSelect = ui.querySelector(("select." + classPrefix + "-crop-x-select"));
    this.cropXSelect.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.cropYSelect = ui.querySelector(("select." + classPrefix + "-crop-y-select"));
    this.cropYSelect.addEventListener('change', function () {
      this$1.notifyChange();
    });
  }

  if ( ConfigUI$$1 ) WebcamConfigUI.__proto__ = ConfigUI$$1;
  WebcamConfigUI.prototype = Object.create( ConfigUI$$1 && ConfigUI$$1.prototype );
  WebcamConfigUI.prototype.constructor = WebcamConfigUI;

  WebcamConfigUI.prototype.getElement = function getElement () {
    return this.element;
  };

  WebcamConfigUI.prototype.getConfig = function getConfig () {
    var imageScaling = this.scalingSelect.value;
    var imageCropping = {
      x: this.cropXSelect.value,
      y: this.cropYSelect.value
    };
    return {
      maxRetries: parseInt(this.maxRetriesInput.value, 10),
      retryTimeout: parseInt(this.retryTimeoutInput.value, 10),
      imageScaling: imageScaling,
      imageCropping: imageCropping
    };
  };

  WebcamConfigUI.prototype.applyConfig = function applyConfig (config) {
    this.maxRetriesInput.value = config.maxRetries || 3;
    this.retryTimeoutInput.value = config.retryTimeout || 1000;
    this.scalingSelect.value = config.imageScaling || 'crop-to-viewport';
    var imageCropping = config.imageCropping || {x: 'crop-both', y: 'crop-both'};
    this.cropXSelect.value = imageCropping.x;
    this.cropYSelect.value = imageCropping.y;
  };

  return WebcamConfigUI;
}(ConfigUI));

var WebcamEffectImpl = function WebcamEffectImpl(instance, props) {
  this.instance = instance;
  this.props = props;

  this.alive = false;
  this.retries = 0;
  this.canvas = document.createElement('canvas');
  this.stream = null;
  this.track = null;
  this.capture = null;
  this.particleData = -1;
};

WebcamEffectImpl.prototype.isActive = function isActive () {
  var instance = this.instance;
  var clock = this.props.clock;
  var time = clock.getTime();
  return this.isAlive() && !clock.isPaused() && instance.timeBegin <= time && time <= instance.timeEnd;
};
WebcamEffectImpl.prototype.isAlive = function isAlive () {
  return this.alive;
};
WebcamEffectImpl.prototype.start = function start () {
    var this$1 = this;

  this.alive = true;
  // Shutdown hook
  this.props.state.addHook(function () { return this$1.kill(); });
  return this.createStream()
  .then(function (stream) { this$1.stream = stream; return this$1.createTrack(); },
        function (err) { return Promise.reject(err); })
  .then(function (track) { this$1.track = track; this$1.capture = new imagecapture_1(this$1.track); return this$1.tryStartGrabbing(); },
        function (err) { return Promise.reject(err); });
};
WebcamEffectImpl.prototype.kill = function kill () {
  this.alive = false;
  // FIXME understand and document when this can happen.
  // E.g. when the getUserMedia() request is ignored in icognito
  // mode
  var stream = this.stream;
  if (stream !== null) {
    var allTracks = stream.getTracks();
    for (var i = 0; i < allTracks.length; i++) {
      allTracks[i].stop();
    }
  }
  this.stream = null;
};
WebcamEffectImpl.prototype.grabLoop = function grabLoop () {
    var this$1 = this;

  // When we are sure grabbing images works (which happens further
  // below) we call this function to grab frames repeatedly in a loop
  if (this.isAlive()) {
    var track = this.track;
    var capture = this.capture;
    if (track.muted) {
      this.kill();
      console.warn('Video stream muted. Spinning up new WebcamEffectImpl...');
      new WebcamEffectImpl(this.instance, this.props).start();
      return;
    }
    // FIXME if we don't grab frames, Chrome will soon make the
    // track invalid, causing the next grabFrame to throw an error
    // Otherwise, we could test here if we are active and do a
    // no-op instead of grabFrame
    capture.grabFrame()
    .then(function (frame) {
      this$1.processFrame(frame);
      // Queue this into the next animation frame so we don't
      // explode the call stack with recursive calls
      window.requestAnimationFrame(function () { return this$1.grabLoop(); });
    }, function (err) {
      // Throw this error into the global scope
      window.setTimeout(function () { throw new Error('Cannot grab images from the camera'); }, 0);
    });
  }
};
WebcamEffectImpl.prototype.tryStartGrabbing = function tryStartGrabbing () {
    var this$1 = this;

  // As it turns out, having the video alone is not a guarantee that
  // we can actually grab images (at least on FF). So let's make sure
  // it works at least one time
  return new Promise(function (res, rej) {
    var testGrab = function (err) {
      this$1.capture.grabFrame()
      .then(function (frame) {
        // Success, resolve and start grabbing!
        this$1.processFrame(frame);
        this$1.grabLoop();
        res();
      }, function (err) {
        // Aw, no image :( Maybe try again?
        if (this$1.retries < this$1.instance.config.maxRetries) {
          this$1.retries = this$1.retries + 1;
          window.setTimeout(testGrab, this$1.instance.config.retryTimeout);
        } else {
          // We finally have to give up :/
          rej(new Error('Cannot grab images from camera'));
        }
      });
    };
    testGrab();
  });
};
WebcamEffectImpl.prototype.processFrame = function processFrame (image) {
  // This is where the magic happens
  if (this.isActive()) {
    var canvas = this.canvas;
    var state = this.props.state;
    var config = this.instance.config;
    var w = image.width;
    var h = image.height;
    // FIXME the camera resolution shouldn't change all that often
    //     Maybe we can do this only once. Or we keep relying on
    //     the browser to optimize.
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.scale(-1, -1);
    ctx.drawImage(image, 0, 0, -w, -h);
    var pd = state.createParticleData(canvas, config.imageScaling, config.imageCropping);
    state.setParticleData(pd);
    if (this.particleData !== -1) {
      state.destroyParticleData(this.particleData);
    }
    this.particleData = pd;
  }
};
WebcamEffectImpl.prototype.createStream = function createStream () {
  var mediaConstraints = {
    audio: false,
    video: true // we want video
  };
  // Let's ask the browser if we can haz video
  return navigator.mediaDevices.getUserMedia(mediaConstraints);
};
WebcamEffectImpl.prototype.createTrack = function createTrack () {
  var videoTracks = this.stream.getVideoTracks();
  if (videoTracks.length === 0) {
    return Promise.reject('No video tracks in user media');
  }
  // We got a video feed!
  // Let's try to adapt it to our needs a little bit more
  var videoTrack = videoTracks[0];
  var state = this.props.state;
  var constraints = {
    width: state.getWidth(),
    height: state.getHeight(),
    aspectRatio: state.getWidth() / state.getHeight(),
    facingMode: 'user'
  };
  // According to MDN, this shouldn't ever reject.
  // TODO maybe add an assertion for that
  return videoTrack.applyConstraints(constraints)
    .then(function () { return Promise.resolve(videoTrack); }, function (err) { return Promise.reject(err); });
};

var WebcamEffect = (function (Effect$$1) {
  function WebcamEffect () {
    Effect$$1.apply(this, arguments);
  }

  if ( Effect$$1 ) WebcamEffect.__proto__ = Effect$$1;
  WebcamEffect.prototype = Object.create( Effect$$1 && Effect$$1.prototype );
  WebcamEffect.prototype.constructor = WebcamEffect;

  WebcamEffect.registerAsync = function registerAsync (instance, props) {
    return new WebcamEffectImpl(instance, props).start();
  };

  WebcamEffect.getDisplayName = function getDisplayName () {
    return EffectName$15;
  };

  WebcamEffect.getDescription = function getDescription () {
    return EffectDescription$15;
  };

  WebcamEffect.getConfigUI = function getConfigUI () {
    if (!this._configUI) {
      this._configUI = new WebcamConfigUI();
    }

    return this._configUI;
  };

  WebcamEffect.getDefaultConfig = function getDefaultConfig () {
    return {
      maxRetries: 3,
      retryTimeout: 1000,
      imageScaling: 'crop-to-viewport',
      imageCropping: {x: 'crop-both', y: 'crop-both'}
    };
  };

  WebcamEffect.getRandomConfig = function getRandomConfig () {
    return WebcamEffect.getDefaultConfig();
  };

  WebcamEffect.supportsRepetition = function supportsRepetition () {
    return false;
  };

  return WebcamEffect;
}(Effect));

var EffectName$16 = 'Reduce Particle Count';
var EffectDescription$16 = 'Drops the given amount of particles';

var ParticlesReduceConfigUI = (function (ConfigUI$$1) {
  function ParticlesReduceConfigUI() {
    var this$1 = this;

    ConfigUI$$1.call(this);
    var classPrefix = 'effect-particles-reduce';
    this.element = parseHtml(("\n      <fieldset>\n        <legend>" + EffectName$16 + "</legend>\n        Remaining particles amount: <input class=\"" + classPrefix + "-reduction-amount\" type=\"number\" min=\"0\" max=\"100\" step=\"1\" value=\"100\"/>%\n        <br>\n        Hide particles by:\n        <select class=\"" + classPrefix + "-reduction-animation\">\n          <option selected value=\"fade-out\" title=\"fade-out exceeding particles\">fading out</option>\n          <option value=\"amount\" title=\"gradually reduce number of visible particles\">reducing amount</option>\n        </select>\n        <br>\n      </fieldset>\n    "));
    var ui = this.element;
    this.reductionAmountInput = ui.querySelector(("." + classPrefix + "-reduction-amount"));
    this.reductionAnimationInput = ui.querySelector(("." + classPrefix + "-reduction-animation"));

    this.reductionAmountInput.addEventListener('change', function () {
      this$1.notifyChange();
    });
    this.reductionAnimationInput.addEventListener('change', function () {
      this$1.notifyChange();
    });

    Ease.extend(this, classPrefix);
  }

  if ( ConfigUI$$1 ) ParticlesReduceConfigUI.__proto__ = ConfigUI$$1;
  ParticlesReduceConfigUI.prototype = Object.create( ConfigUI$$1 && ConfigUI$$1.prototype );
  ParticlesReduceConfigUI.prototype.constructor = ParticlesReduceConfigUI;

  ParticlesReduceConfigUI.prototype.getElement = function getElement () {
    return this.element;
  };

  ParticlesReduceConfigUI.prototype.getConfig = function getConfig () {
    return {
      amount: parseFloat(this.reductionAmountInput.value) / 100,
      animation: this.reductionAnimationInput.value
    };
  };

  ParticlesReduceConfigUI.prototype.applyConfig = function applyConfig (config) {
    this.reductionAmountInput.value = config.amount * 100;
    this.reductionAnimationInput.value = config.animation;
  };

  return ParticlesReduceConfigUI;
}(ConfigUI));

var ParticlesReduceEffect = (function (Effect$$1) {
  function ParticlesReduceEffect () {
    Effect$$1.apply(this, arguments);
  }

  if ( Effect$$1 ) ParticlesReduceEffect.__proto__ = Effect$$1;
  ParticlesReduceEffect.prototype = Object.create( Effect$$1 && Effect$$1.prototype );
  ParticlesReduceEffect.prototype.constructor = ParticlesReduceEffect;

  ParticlesReduceEffect.register = function register (instance, props, uniforms, vertexShader) {
    var amount = instance.config.amount;
    var animation = instance.config.animation;
    if (amount < 1) {
      // This works as follows:
      // We assume we want to render a different particle grid which is
      // coarser than the one defined by {x,y}ParticlesCount but with a
      // similar aspect ratio. Since it's cells are bigger than the cells
      // in the original particle grid when rendered onto the same area,
      // we refer to it as "super-grid"
      var px = props.config.xParticlesCount;
      var py = props.config.yParticlesCount;
      var AR =  px / py;
      var newH = Math.sqrt(amount * py * py);
      var newW = Math.round(newH * AR);
      newH = Math.round(newH);
      // Now we know the super-grid's dimensions newW and newH. We can
      // also calculate the grid's cell's dimensions relative to the old
      // grid
      var cellSize = Math.min(px / newW, Math.max(px, py)); // FIXME handle 0% better

      var easeFunc = Ease.setupShaderEasing(instance, uniforms);

      var transitionByAmount = {'amount': true, 'fade-out': false}[animation];

      vertexShader.mainBody += "\n        float ease = " + easeFunc + ";\n        float cellSize = float(" + cellSize + ");\n        " + (transitionByAmount ? 'cellSize = mix(1., cellSize, ease);' : '') + "\n        // subcellMid is the center of the sub-cell occupied by the current\n        // vertex (a.k.a. particle)\n        vec2 subcellMid = initialPosition.xy * vec2(float(" + px + "), float(" + py + "));\n        // subcell is the 2d coord of this vertex' sub-cell\n        vec2 subcell = floor(subcellMid);\n        // translate the mid into super-grid coordinates\n        vec2 cellMid = subcellMid / vec2(cellSize);\n        // calculate the 2d coords of the super-cell this vertex falls into\n        vec2 cell = floor(cellMid);\n        // top left (TL) + bottom right (BR) of the super-cell in original grid coords\n        vec2 TL = (cellMid - vec2(0.5)) * vec2(cellSize); \n        vec2 BR = (cellMid + vec2(0.5)) * vec2(cellSize);\n        // Now we calculate the sub-cells that contain the super-cell's TL and BR \n        vec2 subcellTL = floor(TL);\n        vec2 subcellBR = floor(BR);\n        vec2 centerSubcell = mix(subcellTL, subcellBR, 0.5);\n        // a sub-cell dominates a super-cell iff it's the centerSubcell\n        bool dominatesCell = all(equal(subcell, centerSubcell));\n        if (dominatesCell) {\n          // The dominating cell's position should now be set to the center\n          // of the super-cell it dominates\n          vec2 superMid = (cell + vec2(0.5)) * cellSize / vec2(float(" + px + "), float(" + py + "));\n          vec2 offset = superMid - initialPosition.xy;\n          " + (transitionByAmount ? '' : 'offset = offset * vec2(ease);') + "\n          position.xy += offset;\n        } else {\n          pointSize = " + (transitionByAmount ? '0.' : '1. - ease') + ";\n          rgb = " + (transitionByAmount ? 'vec3(0.)' : 'rgb * vec3(1. - ease)') + ";\n        }\n      ";
    } 
  };

  ParticlesReduceEffect.getDisplayName = function getDisplayName () {
    return EffectName$16;
  };

  ParticlesReduceEffect.getDescription = function getDescription () {
    return EffectDescription$16;
  };

  ParticlesReduceEffect.getConfigUI = function getConfigUI () {
    if (!this._configUI) {
      this._configUI = new ParticlesReduceConfigUI();
    }

    return this._configUI;
  };

  ParticlesReduceEffect.getDefaultConfig = function getDefaultConfig () {
    return {
      amount: 0.5,
      animation: 'fade-out'
    };
  };

  ParticlesReduceEffect.getRandomConfig = function getRandomConfig () {
    return {
      amount: Math.random(),
      animation: ['fade-out', 'amount'][Math.floor(Math.random() * 2)]
    };
  };

  return ParticlesReduceEffect;
}(Effect));

var EffectName$17 = 'Vignette';
var EffectDescription$17 = 'Fade out the edges to make it look like an old crt tv';

var VignetteConfigUI = (function (ConfigUI$$1) {
  function VignetteConfigUI() {
    ConfigUI$$1.call(this);
    var classPrefix = 'effect-vignette';
    this.element = parseHtml(("\n      <fieldset>\n        <legend>" + EffectName$17 + "</legend>\n        Nothing to be configured :)\n      </fieldset>\n    "));
    var ui = this.element;
  }

  if ( ConfigUI$$1 ) VignetteConfigUI.__proto__ = ConfigUI$$1;
  VignetteConfigUI.prototype = Object.create( ConfigUI$$1 && ConfigUI$$1.prototype );
  VignetteConfigUI.prototype.constructor = VignetteConfigUI;

  VignetteConfigUI.prototype.getElement = function getElement () {
    return this.element;
  };

  VignetteConfigUI.prototype.getConfig = function getConfig () {
    return {};
  };

  VignetteConfigUI.prototype.applyConfig = function applyConfig (config) {
  };

  return VignetteConfigUI;
}(ConfigUI));

var VignetteEffect = (function (Effect$$1) {
  function VignetteEffect () {
    Effect$$1.apply(this, arguments);
  }

  if ( Effect$$1 ) VignetteEffect.__proto__ = Effect$$1;
  VignetteEffect.prototype = Object.create( Effect$$1 && Effect$$1.prototype );
  VignetteEffect.prototype.constructor = VignetteEffect;

  VignetteEffect.register = function register (instance, props, uniforms, vertexShader, fragmentShader) {
    fragmentShader.mainBody += "\n      // magic taken from https://www.shadertoy.com/view/MsXGD4\n      vec2 uv = (frag_coord - 0.5) * 0.98;\n      float vignette = clamp(pow(cos(uv.x * 3.1415), 1.2) * pow(cos(uv.y * 3.1415), 1.2) * 50.0, 0.0, 1.0);\n      rgb = mix(background_color.rgb, rgb, vignette);\n    ";
  };

  VignetteEffect.getDisplayName = function getDisplayName () {
    return EffectName$17;
  };

  VignetteEffect.getDescription = function getDescription () {
    return EffectDescription$17;
  };

  VignetteEffect.getConfigUI = function getConfigUI () {
    if (!this._configUI) {
      this._configUI = new VignetteConfigUI();
    }

    return this._configUI;
  };

  VignetteEffect.getDefaultConfig = function getDefaultConfig () {
    return {};
  };

  VignetteEffect.getRandomConfig = function getRandomConfig () {
    return {};
  };

  return VignetteEffect;
}(Effect));

var EffectName$18 = 'Dummy';
var EffectDescription$18 = 'An effect that has no effect - useful to extend the timeline length without having anything happen';

var DummyConfigUI = (function (ConfigUI$$1) {
  function DummyConfigUI() {
    ConfigUI$$1.call(this);
    var classPrefix = 'effect-dummy';
    this.element = parseHtml(("\n      <fieldset>\n        <legend>" + EffectName$18 + "</legend>\n        Nothing to be configured :)\n      </fieldset>\n    "));
    var ui = this.element;
  }

  if ( ConfigUI$$1 ) DummyConfigUI.__proto__ = ConfigUI$$1;
  DummyConfigUI.prototype = Object.create( ConfigUI$$1 && ConfigUI$$1.prototype );
  DummyConfigUI.prototype.constructor = DummyConfigUI;

  DummyConfigUI.prototype.getElement = function getElement () {
    return this.element;
  };

  DummyConfigUI.prototype.getConfig = function getConfig () {
    return {};
  };

  DummyConfigUI.prototype.applyConfig = function applyConfig (config) {
  };

  return DummyConfigUI;
}(ConfigUI));

var DummyEffect = (function (Effect$$1) {
  function DummyEffect () {
    Effect$$1.apply(this, arguments);
  }

  if ( Effect$$1 ) DummyEffect.__proto__ = Effect$$1;
  DummyEffect.prototype = Object.create( Effect$$1 && Effect$$1.prototype );
  DummyEffect.prototype.constructor = DummyEffect;

  DummyEffect.register = function register (instance, props, uniforms, vertexShader) {
  };

  DummyEffect.getDisplayName = function getDisplayName () {
    return EffectName$18;
  };

  DummyEffect.getDescription = function getDescription () {
    return EffectDescription$18;
  };

  DummyEffect.getConfigUI = function getConfigUI () {
    if (!this._configUI) {
      this._configUI = new DummyConfigUI();
    }

    return this._configUI;
  };

  DummyEffect.getDefaultConfig = function getDefaultConfig () {
    return {};
  };

  DummyEffect.getRandomConfig = function getRandomConfig () {
    return {};
  };

  return DummyEffect;
}(Effect));

// should be last
var effectList = [
  HueDisplaceEffect,
  ConvergePointEffect,
  ConvergeCircleEffect,
  WaveEffect,
  ChangeImageEffect,
  FlickrImageEffect,
  TrailsEffect,
  SmoothTrailsEffect,
  SmearEffect,
  StandingWaveEffect,
  SparkleEffect,
  ParticleSpacingEffect,
  ParticleDisplaceEffect,
  ParticleSizeByHueEffect,
  ParticlesReduceEffect,
  ResetDefaultImageEffect,
  WebcamEffect,
  VignetteEffect,

  // Should be last
  DummyEffect
];
var byId = {};
for (var i = 0; i < effectList.length; i++) {
  byId[effectList[i].getId()] = effectList[i];
}

// Best website: http://tools.medialab.sciences-po.fr/iwanthue/index.php
var Colors = [
  [211,79,52],
  [98,112,225],
  [90,183,78],
  [176,95,211],
  [219,156,54],
  [209,78,175],
  [79,182,148],
  [219,68,120],
  [82,119,51],
  [110,85,168],
  [150,174,62],
  [75,121,187],
  [163,175,104],
  [156,84,154],
  [171,117,61],
  [80,179,221],
  [204,109,101],
  [164,152,224],
  [159,68,100],
  [221,135,188]
];
function getColorIndexForEffect(effect) {
  var idx = effectList.indexOf(effect);
  if (idx < 0) {
    throw new Error('Cannot get color for unregistered effect');
  }
  if (idx >= Colors.length) {
    console.warn('Not enough colors');
    return Colors.length - 1;
  }
  return idx;
}
function getColorClassnameForEffect(effect) {
  return ("effect-color-" + (getColorIndexForEffect(effect) + 1));
}

var EffectConfig = function EffectConfig(id, timeBegin, timeEnd, repetitions, config) {
  this.id = id;
  this.timeBegin = Math.round(timeBegin);
  this.timeEnd = Math.round(timeEnd);
  this.repetitions = repetitions;
  this.config = config;
};
EffectConfig.prototype.getEffectClass = function getEffectClass () {
  var clazz = byId[this.id];
  if (!clazz) {
    throw new Error(("No such effect: " + (this.id)));
  }
  return clazz;
};
/// @return the amout of time in milliseconds in which the effect
///       should perform one single repetition
EffectConfig.prototype.getPeriod = function getPeriod () {
  return (this.timeEnd - this.timeBegin) / this.repetitions;
};
EffectConfig.deserialize = function deserialize (obj) {
  if (obj.constructor.name === this.name) {
    return obj;
  } else {
    return new EffectConfig(obj.id, obj.timeBegin, obj.timeEnd, obj.repetitions, obj.config);
  }
};

/**
 *
 */
var TimelineEntry = function TimelineEntry(effect, timeline) {
  var this$1 = this;

  // Times are in milliseconds
  this.timeBegin = 0;
  this.timeEnd = 0;
  this.effect = effect;
  this.timeline = timeline;
  this.clickPrevented = false;
  this.config = null;

  var beginHandleClass = 'timeline-entry-begin-time-adjust';
  var endHandleClass = 'timeline-entry-end-time-adjust';
  this.element = parseHtml(("\n      <li class=\"" + (this.effect.isEventOnly() ? 'event' : '') + "\">\n        <div class=\"" + beginHandleClass + "\"></div>\n        <button type=\"button\" class=\"" + (getColorClassnameForEffect(this.effect)) + "\">\n          " + (this.effect.getDisplayName()) + "\n        </button>\n        <div class=\"" + endHandleClass + "\"></div>\n      </li>\n    "));
  this.setupTimeAdjustHandles();
  this.setupDragAndDrop();
  // Prevent a previous text selection from interfering with our custom
  // drag and drop
  this.element.addEventListener('mousedown', function () {
    if (document.selection) {
      document.selection.empty();
    } else if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
  });
  this.element.addEventListener('mousedown', function (evt) {
    // middle mouse button
    if (/* Middle mouse button: */ evt.which == 2 || evt.button == 4) {
      evt.preventDefault();
      this$1.remove();
    }
  });
  this.element.addEventListener('contextmenu', function (evt) {
    // right mouse button
    evt.preventDefault();
    this$1.remove();
  });

  this.openConfigBtn = this.element.querySelector('button');
  this.openConfigBtn.addEventListener('click', function () {
    if (this$1.clickPrevented) {
      this$1.clickPrevented = false;
      return;
    }
    this$1.timeline.effectConfigDialog.promptUser(this$1)
    .then(
      function (newState) {
        this$1.loadState(newState);
        this$1.timeline.notifyChange();
      },
      function (deleted) {
        if (deleted) {
          if (deleted !== true) {
            // Another error occurred
            throw deleted;
          }
          this$1.remove();
        }
      }
    );
  });
};

TimelineEntry.prototype.remove = function remove () {
  this.timeline.deleteEntry(this);
  this.timeline.renderHtml();
  this.timeline.notifyChange();
};

TimelineEntry.prototype.setupHorizontalDragging = function setupHorizontalDragging () {
    var this$1 = this;

  this.element.addEventListener('mousedown', function (evt) {
    if (evt.target.classList.contains('timeline-entry-begin-time-adjust') ||
        evt.target.classList.contains('timeline-entry-end-time-adjust')) {
      return;
    }
    var startX = evt.clientX;
    var prevX = startX;
    var thres = 5;
    var started = false;
    var onDrag = function (evt) {
      if (!started) {
        if (Math.abs(evt.clientX - startX) > thres) {
          started = true;
        }
      } else {
        var delta = evt.clientX - prevX;
        prevX = evt.clientX;
        var duration = this$1.timeEnd - this$1.timeBegin;
        this$1.timeBegin = Math.max(0, Math.round(this$1.timeBegin + ((delta / this$1.timeline.pxPerSecond) * 1000)));
        this$1.timeEnd = this$1.timeBegin + duration;
        this$1.timeline.notifyChange();
      }

      if (started) {
        this$1.clickPrevented = true;
      }
    };
    var onDragEnd = function (evt) {
      document.documentElement.removeEventListener('mousemove', onDrag);
      document.documentElement.removeEventListener('mouseup', onDragEnd);
    };
    document.documentElement.addEventListener('mousemove', onDrag);
    document.documentElement.addEventListener('mouseup', onDragEnd);
  });
};

TimelineEntry.prototype.setupVericalDragging = function setupVericalDragging () {
  return;
  // Cross-timeline dragging and dropping is more complicated, so we
  // handle it independently from horizontal dragging
  this.element.addEventListener('mousedown', function (evt) {
    if (evt.target.classList.contains('timeline-entry-begin-time-adjust') ||
        evt.target.classList.contains('timeline-entry-end-time-adjust')) {
      return;
    }
    var onDrag = function (evt) {
      // TODO
    };
    var onDragEnd = function (evt) {
      document.documentElement.removeEventListener('mousemove', onDrag);
      document.documentElement.removeEventListener('mouseup', onDragEnd);
    };
    document.documentElement.addEventListener('mousemove', onDrag);
    document.documentElement.addEventListener('mouseup', onDragEnd);
  });
};

TimelineEntry.prototype.setupDragAndDrop = function setupDragAndDrop () {
  this.setupHorizontalDragging();
  this.setupVericalDragging();
};

TimelineEntry.setupAdjustHandle = function setupAdjustHandle (elm, onAdjustCallback) {
  elm.addEventListener('mousedown', function (evt) {
    evt.preventDefault(); // prevent dragging parent

    var prevX = evt.clientX;
    var onAdjust = function (evt) {
      onAdjustCallback(evt.clientX - prevX);
      prevX = evt.clientX;
    };
    var onStopAdjust = function () {
      document.documentElement.removeEventListener('mousemove', onAdjust);
      document.documentElement.removeEventListener('mouseup', onStopAdjust);
    };

    document.documentElement.addEventListener('mousemove', onAdjust);
    document.documentElement.addEventListener('mouseup', onStopAdjust);
  });
};

TimelineEntry.prototype.setupTimeAdjustHandles = function setupTimeAdjustHandles () {
    var this$1 = this;

  if (this.effect.isEventOnly()) {
    return;
  }

  var beginHandle = this.element.querySelector('.timeline-entry-begin-time-adjust');
  TimelineEntry.setupAdjustHandle(beginHandle, function (delta) {
    var newBegin = Math.max(0, this$1.timeBegin + ((delta / this$1.timeline.pxPerSecond) * 1000));
    if (newBegin < this$1.timeEnd) {
      this$1.timeBegin = Math.round(newBegin);
      this$1.timeline.notifyChange();
    }
  });
  var endHandle = this.element.querySelector('.timeline-entry-end-time-adjust');
  TimelineEntry.setupAdjustHandle(endHandle, function (delta) {
    var newEnd = this$1.timeEnd + ((delta / this$1.timeline.pxPerSecond) * 1000);
    if (newEnd > this$1.timeBegin) {
      this$1.timeEnd = Math.round(newEnd);
      this$1.timeline.notifyChange();
    }
  });
};

TimelineEntry.prototype.loadState = function loadState (state) {
  this.timeBegin = state.timeBegin;
  this.timeEnd = state.timeEnd;
  this.repetitions = state.repetitions;
  this.config = state.config;
};
TimelineEntry.prototype.getElement = function getElement () {
  return this.element;
};
TimelineEntry.prototype.getConfiguration = function getConfiguration () {
  return new EffectConfig(
    this.effect.getId(),
    this.timeBegin,
    this.timeEnd,
    this.repetitions,
    this.config
  );
};
TimelineEntry.prototype.renderStyles = function renderStyles () {
  var li = this.getElement();
  var left = (this.timeBegin / 1000) * this.timeline.pxPerSecond;
  var width = ((this.timeEnd - this.timeBegin) / 1000) * this.timeline.pxPerSecond;
  li.style.left = left + "px";
  li.style.width = width + "px";
};

/**
 *
 */
var TimelineTrack = function TimelineTrack(trackNumber, timeline) {
  this.elements = [];
  this.timeline = timeline;
  this.elements.push(parseHtml(("\n      <td>\n        <h3>Track " + trackNumber + "</h3>\n      </td>\n    ")));
  this.elements.push(parseHtml("\n      <td>\n        <ol>\n        </ol>\n      </td>\n    "));
  this.entryListElm = this.elements[1].querySelector('ol');
  this.entryList = [];
  this.width = 0;
};

TimelineTrack.prototype.dropNewEffect = function dropNewEffect (effect, clientX, clientY, width, height) {
  if (this.timeline.isLocked()) {
    return false;
  }

  var elm = this.getTrackElement();
  var rect = elm.getBoundingClientRect();
  if (clientX >= rect.left && clientX <= rect.right &&
      clientY >= rect.top && clientY <= rect.bottom) {
    var entry = new TimelineEntry(effect, this.timeline);
    var timeBegin = Math.round(Math.max(0, clientX - (width / 2) - rect.left) / (this.timeline.pxPerSecond / 1000));
    entry.loadState({
      timeBegin: timeBegin,
      timeEnd:   timeBegin + 1000,
      repetitions: 1,
      config:    effect.getDefaultConfig()
    });
    this.addEntry(entry);
    this.renderHtml();
    this.timeline.notifyChange();
    return true;
  }
  return false;
};

TimelineTrack.prototype.addEntry = function addEntry (entry) {
  this.entryList.push(entry);
};

TimelineTrack.prototype.getElements = function getElements () {
  return this.elements;
};
TimelineTrack.prototype.getTrackElement = function getTrackElement () {
  return this.elements[1];
};
TimelineTrack.prototype.renderHtml = function renderHtml () {
    var this$1 = this;

  var lis = document.createDocumentFragment();
  for (var i = 0; i < this.entryList.length; i++) {
    var entry = this$1.entryList[i];
    var li = entry.getElement();
    lis.appendChild(li);
  }
  clearChildNodes(this.entryListElm);
  this.entryListElm.appendChild(lis);
};
TimelineTrack.prototype.renderStyles = function renderStyles () {
    var this$1 = this;

  var maxEnd = 0;
  for (var i = 0; i < this.entryList.length; i++) {
    var entry = this$1.entryList[i];
    entry.renderStyles();
    maxEnd = Math.max(maxEnd, entry.timeEnd);
  }
  var width = Math.round(maxEnd / 1000 * this.timeline.pxPerSecond);
  if (width > this.width) {
    this.width = width;
    this.getTrackElement().style.minWidth = width + "px";
  }
};

/**
 *
 */
var Timeticks = function Timeticks(clock) {
  var this$1 = this;

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

  var onZoomlevelChange = function () {
    this$1.render();
    for (var i = 0; i < this$1.scaleChangeListeners.length; i++) {
      this$1.scaleChangeListeners[i](this$1.getPxPerSecond());
    }
  };
  this.zoomInBtn.addEventListener('click', function () {
    this$1.zoomLevel *= 1.5;
    onZoomlevelChange();
  });
  this.zoomOutBtn.addEventListener('click', function () {
    this$1.zoomLevel /= 1.5;
    onZoomlevelChange();
  });
  this.element.addEventListener('click', function (evt) {
    var left = Math.round(this$1.element.getBoundingClientRect().left);
    var x = Math.max(0, evt.clientX - left - this$1.getTimelineBorderWidth());
    var t = Math.min(this$1.duration, x / this$1.getPxPerSecond() * 1000);
    this$1.clock.setTime(t);
  });
};
Timeticks.prototype.getTimelineBorderWidth = function getTimelineBorderWidth () {
  var tickWidth = this.firstTick.offsetWidth;
  return Math.round((tickWidth / 2) + 5);
};
Timeticks.prototype.adjustPosition = function adjustPosition () {
  var cssRules = this.stylesheet.cssRules;
  var borderWidth = this.getTimelineBorderWidth();
  var selectorPath = '.menu-timeline-container .menu-timeline-scrollable-container .menu-timeline-content';
  this.stylesheet.insertRule(("\n      " + selectorPath + " tr > th:first-child + th {\n        border-left-width: " + borderWidth + "px;\n      }"), cssRules.length
  );
  this.stylesheet.insertRule(("\n      " + selectorPath + " tr > td:first-child + td {\n        border-left-width: " + borderWidth + "px;\n      }"), cssRules.length
  );
  this.stylesheet.insertRule("\n      .menu-timeline-timetick {\n        transform: translateX(-50%);\n      }\n    ", cssRules.length);
};
/**
 * @return px
 */
Timeticks.prototype.getOptimalTimetickSpace = function getOptimalTimetickSpace () {
  return 2 * this.firstTick.offsetWidth;
};
Timeticks.prototype.getPxPerSecond = function getPxPerSecond () {
  return this.getOptimalTimetickSpace() * this.zoomLevel;
};
/**
 * @return ms
 */
Timeticks.prototype.getOptimalTimeBetweenTicks = function getOptimalTimeBetweenTicks () {
  var tickSpace = this.getOptimalTimetickSpace();
  var pxPerMillis = (tickSpace * this.zoomLevel) / 1000;
  var time = 1000; // ms
  var multiplyNext = 5;
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
};
Timeticks.prototype.addScaleChangeListener = function addScaleChangeListener (listener) {
  this.scaleChangeListeners.push(listener);
};
Timeticks.prototype.setDuration = function setDuration (duration) {
  this.duration = duration;
  this.render();
};
Timeticks.msToStr = function msToStr (ms) {
  var zeroPad = function(num, places) {
    var zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join('0') + num;
  };
  var rem = ms;
  var m = Math.floor(rem / 1000 / 60);
  rem -= m * 1000 * 60;
  var s = Math.floor(rem / 1000);
  rem -= s * 1000;
  var cs = Math.floor(rem / 10);

  return ((zeroPad(m, 2)) + ":" + (zeroPad(s, 2)) + ":" + (zeroPad(cs, 2)));
};
Timeticks.prototype.render = function render () {
  if (this.duration !== this.renderedDuration ||
      this.zoomLevel !== this.renderedZoomLevel) {
    this.renderedDuration = this.duration;
    this.renderedZoomLevel = this.zoomLevel;
    var container = this.firstTick.parentNode;
    clearChildNodes(container);
    container.appendChild(this.firstTick);
    var pxPerMillis = this.getPxPerSecond() / 1000;
    var timeBetweenTicks = this.getOptimalTimeBetweenTicks();
    var time = timeBetweenTicks;
    do {
      var tick = parseHtml(("<span class=\"menu-timeline-timetick\">" + (Timeticks.msToStr(time)) + "</span>"));
      tick.style.left = (pxPerMillis * time) + "px";
      container.appendChild(tick);
      time += timeBetweenTicks;
    } while (time <= this.duration);
  }
};
Timeticks.prototype.getElement = function getElement () {
  return this.element;
};

var TimeIndicator = function TimeIndicator(menu, timeticks) {
  var this$1 = this;

  this.menu = menu;
  this.clock = menu.clock;
  this.timeticks = timeticks;
  this.element = document.querySelector('.menu-timeline-container .menu-timeline-position-indicator');
  this.element.style.right = 'initial';

  if (!this.element) {
    throw new Error('Cannot find timeline position indicator element');
  }
  var updateLoop = function () {
    this$1.updateStyles();
    window.requestAnimationFrame(updateLoop);
  };
  updateLoop();
};
TimeIndicator.prototype.updateStyles = function updateStyles () {
  if (!this.menu.isVisible()) {
    return;
  }
  this.element.style.left = '0px';
  var selfRect = this.element.getBoundingClientRect();
  var ticksElm = this.timeticks.getElement();
  var ticksBLW = window.getComputedStyle(ticksElm).borderLeftWidth;
  var ticksRect = ticksElm.getBoundingClientRect();
  var ticksBorder = parseInt(ticksBLW.substring(0, ticksBLW.length - 2), 10);
  var timePx = this.clock.getTime() * this.timeticks.getPxPerSecond() / 1000;
  this.element.style.left = (ticksRect.left + ticksBorder - selfRect.left + timePx) + "px";
};

var PauseButton = function PauseButton(clock) {
  var this$1 = this;

  this.clock = clock;
  this.element = document.querySelector('.menu-timeline-pause');
  this.element.addEventListener('click', function () {
    clock.setPaused(!clock.getPaused());
  });
  clock.addPauseListener(function (paused) {
    var onPauseClass = 'paused';
    if (paused) {
      this$1.element.classList.add(onPauseClass);
    } else {
      this$1.element.classList.remove(onPauseClass);
    }
  });
  window.document.addEventListener('keydown', function (e) {
    if (e.key === ' ') {
      clock.tooglePause();
    }
  });
};

var RandomplayButton = function RandomplayButton(timeline) {
  var this$1 = this;

  this.timeline = timeline;
  this.menu = timeline.menu;
  this.clock = this.menu.clock;
  this.onClockWrap = null;
  this.element = document.getElementById('menu-timeline-randomplay');
  this.didJustCreateNewTimeline = false;
  this.element.addEventListener('click', function () {
    if (this$1.onClockWrap === null) {
      this$1.start();
    } else {
      this$1.stop();
    }
  });
  this.menu.addChangeListener(function () {
    if (this$1.didJustCreateNewTimeline) {
      this$1.didJustCreateNewTimeline = false;
    } else {
      this$1.stop();
    }
  });
};
RandomplayButton.prototype.start = function start () {
    var this$1 = this;

  if (this.onClockWrap === null) {
    this.element.checked = true;
    this.onClockWrap = function () { return this$1.fillRandomTimeline(); };
    this.clock.addWrapListener(this.onClockWrap);
    this.fillRandomTimeline();
    this.timeline.setLocked(true);
    this.clock.setPaused(false);
  }
};
RandomplayButton.prototype.stop = function stop () {
  if (this.onClockWrap !== null) {
    this.element.checked = false;
    this.clock.removeWrapListener(this.onClockWrap);
    this.onClockWrap = null;
    this.timeline.setLocked(false);
  }
};

RandomplayButton.prototype.fillRandomTimeline = function fillRandomTimeline () {
  var config = RandomplayButton.generateRandomTimeline(this.menu.submittedConfig);
  this.didJustCreateNewTimeline = true;
  this.menu.applyConfig(config);
  this.menu.submit();
};

RandomplayButton.trimTimeline = function trimTimeline (timeline) {
  var earliest = Number.POSITIVE_INFINITY;
  for (var t = 0; t < timeline.length; t++) {
    var track = timeline[t];
    for (var e = 0; e < track.length; e++) {
      var effect = track[e];
      earliest = Math.min(effect.timeBegin, earliest);
    }
  }
  for (var t$1 = 0; t$1 < timeline.length; t$1++) {
    var track$1 = timeline[t$1];
    for (var e$1 = 0; e$1 < track$1.length; e$1++) {
      var effect$1 = track$1[e$1];
      effect$1.timeBegin -= earliest;
    }
  }
};

RandomplayButton.generateRandomTimeline = function generateRandomTimeline (currentConfig) {
  var config = Object.assign({}, currentConfig);

  config.effects = [];
  config.duration = 0;

  for (var i = 0; i < effectList.length; i++) {
    if (effectList[i].getId() == "FlickrImageEffect") {
      continue;
    }

    var timeBegin = Math.round(Math.random() * 10000);
    var duration = Math.round(Math.random() * 9000 + 1000);

    config.effects.push([new EffectConfig(
      effectList[i].getId(),
      timeBegin,
      timeBegin + duration,
      1,
      effectList[i].getRandomConfig()
    )]);

    config.duration = Math.max(config.duration, timeBegin + duration);
  }
  RandomplayButton.trimTimeline(config.effects);

  //TODO: does not work...
  //config.effects.push([new EffectConfig("FlickrImageEffect", 0, config.duration, 1, { searchTerm: '' })]);

  return config;
};

var TimeDisplay = function TimeDisplay(menu) {
  var this$1 = this;

  this.element = document.querySelector('.menu-timeline-current-time');
  this.menu = menu;
  this.clock = menu.clock;
  var updateLoop = function () {
    this$1.update();
    window.requestAnimationFrame(updateLoop);
  };
  updateLoop();
};
TimeDisplay.prototype.update = function update () {
  if (!this.menu.isVisible()) {
    return;
  }
  var time = this.clock.getTime();
  if (time < 0) {
    time = 0;
  }
  if (!this.clock.isPaused()) {
    this.element.innerHTML = Timeticks.msToStr(time);
  }
};

/**
 *
 */
var Timeline = function Timeline(menu) {
  var this$1 = this;

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
  this.positionIndicator = new TimeIndicator(menu, this.timeticks);
  this.pxPerSecond = this.timeticks.getOptimalTimetickSpace();
  this.timeticks.addScaleChangeListener(function () {
    this$1.pxPerSecond = this$1.timeticks.getPxPerSecond();
    this$1.renderStyles();
  });
};
Timeline.prototype.loadTimeline = function loadTimeline (trackList) {
    var this$1 = this;

  this.trackList = [];
  for (var i = 0; i < trackList.length; i++) {
    var track = new TimelineTrack(i + 1, this$1);
    this$1.trackList.push(track);
    for (var j = 0; j < trackList[i].length; j++) {
      var entryDesc = EffectConfig.deserialize(trackList[i][j]);
      try {
        var entry = new TimelineEntry(entryDesc.getEffectClass(), this$1);
        entry.loadState(entryDesc);
        track.addEntry(entry);
      } catch (e) {
        // Probably the effect hasn't been found due to a developer
        // switching branches
        console.warn(e);
      }
    }
  }
  this.assertEmptyLastTrack(false);
  this.renderHtml();
  this.renderStyles();
  this.timeticks.setDuration(this.getTotalDuration());
};

Timeline.prototype.renderHtml = function renderHtml () {
    var this$1 = this;

  var rows = document.createDocumentFragment();
  var loop = function ( i ) {
    var track = this$1.trackList[i];
    track.renderHtml();
    var row = document.createElement('tr');
    var trackElms = track.getElements();
    trackElms.forEach(function (elm) { return row.appendChild(elm); });
    rows.appendChild(row);
  };

    for (var i = 0; i < this.trackList.length; i++) loop( i );
  clearChildNodes(this.trackListElm);
  this.trackListElm.appendChild(rows);
};
Timeline.prototype.renderStyles = function renderStyles () {
    var this$1 = this;

  for (var i = 0; i < this.trackList.length; i++) {
    var track = this$1.trackList[i];
    track.renderStyles();
  }
};
Timeline.prototype.forEachEntry = function forEachEntry (callback) {
    var this$1 = this;

  for (var i = 0; i < this.trackList.length; i++) {
    for (var j = 0; j < this.trackList[i].entryList.length; j++) {
      callback(this$1.trackList[i].entryList[j], this$1.trackList[i], j);
    }
  }
};
Timeline.prototype.getEffects = function getEffects () {
    var this$1 = this;

  var configs = [];
  for (var i = 0; i < this.trackList.length; i++) {
    var track = [];
    configs.push(track);
    for (var j = 0; j < this.trackList[i].entryList.length; j++) {
      track.push(this$1.trackList[i].entryList[j].getConfiguration());
    }
  }

  return configs;
};
Timeline.prototype.getTotalDuration = function getTotalDuration () {
  var maxEnd = 0;
  this.forEachEntry(function (entry) { return maxEnd = Math.max(maxEnd, entry.timeEnd); });
  return maxEnd;
};
Timeline.prototype.assertEmptyLastTrack = function assertEmptyLastTrack (render) {
    if ( render === void 0 ) render = true;

  var changed = false;
  var tracks = this.trackList;
  while (tracks.length > 1 &&
         tracks[tracks.length - 1].entryList.length === 0 &&
         tracks[tracks.length - 2].entryList.length === 0
  ) {
    tracks.splice(tracks.length - 1, 1);
    changed = true;
  }
  if (tracks.length === 0 || tracks[tracks.length - 1].entryList.length !== 0) {
    var track = new TimelineTrack(tracks.length + 1, this);
    tracks.push(track);
    changed = true;
  }
  if (changed && render) {
    // TODO probably inefficient
    this.renderHtml();
    this.renderStyles();
  }
};
Timeline.prototype.notifyChange = function notifyChange () {
  this.timeticks.setDuration(this.getTotalDuration());
  this.assertEmptyLastTrack();
  this.renderStyles();
  this.menu.notifyChange();
};
Timeline.prototype.deleteEntry = function deleteEntry (remove) {
  this.forEachEntry(function (entry, track, trackIndex) {
    if (entry === remove) {
      track.entryList.splice(trackIndex, 1);
    }
  });
};
Timeline.prototype.dropNewEffect = function dropNewEffect (effect, clientX, clientY, width, height) {
    var this$1 = this;

  for (var i = 0; i < this.trackList.length; i++) {
    if (this$1.trackList[i].dropNewEffect(effect, clientX, clientY, width, height)) {
      return true;
    }
  }
  return false;
};
Timeline.prototype.isLocked = function isLocked () {
  return this.locked;
};
Timeline.prototype.setLocked = function setLocked (locked) {
    if ( locked === void 0 ) locked = true;

  if (this.locked !== locked) {
    this.locked = locked;
    var lockedClass = 'locked';
    if (locked) {
      this.element.classList.add(lockedClass);
    } else {
      this.element.classList.remove(lockedClass);
    }
  }
};

function create() {
  return {
    "schemaVersion": 0,
    "backgroundColor": [
      0,
      0,
      0,
      1
    ],
    "xParticlesCount": 200,
    "yParticlesCount": 125,
    "defaultImageScaling": "crop-to-viewport",
    "defaultImageCropping": {
      "x": "crop-both",
      "y": "crop-both"
    },
    "particleScaling": 1,
    "particleShape": "circle",
    "particleFading": "none",
    "particleOverlap": "alpha blend",
    "effects": [
    ],
    "duration": 10000
  };
}

var schemaVersion = 0;
var backgroundColor = [0,0,0,1];
var xParticlesCount = 200;
var yParticlesCount = 125;
var defaultImageScaling = "crop-to-viewport";
var defaultImageCropping = {"x":"crop-both","y":"crop-both"};
var particleScaling = 1;
var particleShape = "circle";
var particleFading = "none";
var particleOverlap = "alpha blend";
var effects = [[{"id":"HueDisplaceEffect","timeBegin":8592,"timeEnd":10613,"repetitions":1,"config":{"distance":0.7319085067626532,"scaleByValue":0.4112831056504884,"randomDirectionOffset":false,"rotate":0.6353214673534142}}],[{"id":"ConvergePointEffect","timeBegin":2189,"timeEnd":6844,"repetitions":1,"config":{}}],[{"id":"ConvergeCircleEffect","timeBegin":9297,"timeEnd":13311,"repetitions":1,"config":{"rotationSpeed":0.32695472212132115}}],[{"id":"WaveEffect","timeBegin":0,"timeEnd":2015,"repetitions":1,"config":{"multiplier":0.3148697308748081,"amplitude":0.11115075915060912}}],[{"id":"TrailsEffect","timeBegin":7827,"timeEnd":14610,"repetitions":1,"config":{"fadein":100,"fadeout":500}}],[{"id":"SmoothTrailsEffect","timeBegin":2845,"timeEnd":5692,"repetitions":1,"config":{"fadein":100,"fadeout":500}}],[{"id":"SmearEffect","timeBegin":5041,"timeEnd":13056,"repetitions":1,"config":{"fadein":100,"fadeout":500}}],[{"id":"StandingWaveEffect","timeBegin":9065,"timeEnd":13188,"repetitions":1,"config":{"maxAmplitude":0.11655939598142143,"waveCount":12.072390651463863,"timeInterpolation":"linear","waveFunction":"sine","dimension":"x"}}],[{"id":"SparkleEffect","timeBegin":4482,"timeEnd":10731,"repetitions":1,"config":{"scaleMin":0.685,"scaleMax":2.563,"ratio":0.275,"duration":1485}}],[{"id":"ParticleSpacingEffect","timeBegin":5162,"timeEnd":13696,"repetitions":1,"config":{"xSpread":0.5,"ySpread":1.5,"easeInTime":1000,"easeOutTime":1000,"easeFunc":"sine"}}],[{"id":"ParticleDisplaceEffect","timeBegin":3543,"timeEnd":6774,"repetitions":1,"config":{"direction":224.4457831353151,"directionUnit":"degrees","distance":0.023417750859263453,"easeInTime":1000,"easeOutTime":1000,"easeFunc":"none"}}],[{"id":"ParticleSizeByHueEffect","timeBegin":1877,"timeEnd":11750,"repetitions":1,"config":{"scaling":2.582142277304504,"hueRotation":4.761756559852353,"easeInTime":1000,"easeOutTime":1000,"easeFunc":"linear"}}],[{"id":"WebcamEffect","timeBegin":0,"timeEnd":14610,"repetitions":1,"config":{"maxRetries":3,"retryTimeout":1000,"imageScaling":"crop-to-viewport","imageCropping":{"x":"crop-both","y":"crop-both"}}}],[]];
var duration = 14610;
var Preset1 = {
	schemaVersion: schemaVersion,
	backgroundColor: backgroundColor,
	xParticlesCount: xParticlesCount,
	yParticlesCount: yParticlesCount,
	defaultImageScaling: defaultImageScaling,
	defaultImageCropping: defaultImageCropping,
	particleScaling: particleScaling,
	particleShape: particleShape,
	particleFading: particleFading,
	particleOverlap: particleOverlap,
	effects: effects,
	duration: duration
};

var schemaVersion$1 = 0;
var backgroundColor$1 = [0,0,0,1];
var xParticlesCount$1 = 200;
var yParticlesCount$1 = 125;
var defaultImageScaling$1 = "crop-to-viewport";
var defaultImageCropping$1 = {"x":"crop-both","y":"crop-both"};
var particleScaling$1 = 1;
var particleShape$1 = "circle";
var particleFading$1 = "none";
var particleOverlap$1 = "alpha blend";
var effects$1 = [[{"id":"WebcamEffect","timeBegin":0,"timeEnd":2152,"repetitions":1,"config":{"maxRetries":3,"retryTimeout":1000,"imageScaling":"crop-to-viewport","imageCropping":{"x":"crop-both","y":"crop-both"}}}],[{"id":"StandingWaveEffect","timeBegin":0,"timeEnd":2143,"repetitions":1,"config":{"maxAmplitude":0.05,"waveCount":20,"timeInterpolation":"linear","waveFunction":"sine","dimension":"y"}}],[]];
var duration$1 = 2152;
var Preset2 = {
	schemaVersion: schemaVersion$1,
	backgroundColor: backgroundColor$1,
	xParticlesCount: xParticlesCount$1,
	yParticlesCount: yParticlesCount$1,
	defaultImageScaling: defaultImageScaling$1,
	defaultImageCropping: defaultImageCropping$1,
	particleScaling: particleScaling$1,
	particleShape: particleShape$1,
	particleFading: particleFading$1,
	particleOverlap: particleOverlap$1,
	effects: effects$1,
	duration: duration$1
};

var LISTED_PRESETS_ID_BEGIN = 1000; // better safe than sorry

/// This class encapsulates all data that describes a preset
var Preset = function Preset(name, config, id) {
  this.name = name;
  this.config = config;
  this.id = id;
};

/// Shorthand for preset construction
function preset(name, config, id) {
  if ( id === void 0 ) id = -1;

  return new Preset(name, config, id);
}
var filePresets = [
  // Import built-in presets here
  preset('Webcam + Effects', Preset1),
  preset('Webcam + Standing wave', Preset2)
];

// Create the exported listedPresets dict
var listedPresets = {};
for (var i$1 = 0; i$1 < filePresets.length; i$1++) {
  var preset$1 = filePresets[i$1];
  preset$1.id = LISTED_PRESETS_ID_BEGIN + i$1;
  listedPresets[preset$1.id] = preset$1;
}

/// Helper function to create a preset only for one single effect
function makePresetFromEffect(effect) {
  var config = create();
  var timeline = config.effects;
  var track = [];
  timeline.push(track);
  track.push(new EffectConfig(effect.getId(), 0, 10000, 1, effect.getDefaultConfig()));
  return config;
}

// Create exported allPresets dict
var allPresets = Object.assign({}, listedPresets);
for (var i$1$1 = 0; i$1$1 < effectList.length; i$1$1++) {
  var effect = effectList[i$1$1];
  allPresets[i$1$1] = preset(effect.getId(), makePresetFromEffect(effect), i$1$1);
}

var MenuPresetSelectControl = function MenuPresetSelectControl(menu) {
  this.menu = menu;
  this.elm = document.querySelector('.menu-select-preset-control');
  var select = this.elm.querySelector('select');
  var IDs = Object.keys(listedPresets);
  var options = document.createDocumentFragment();
  for (var i = 0; i < IDs.length; i++) {
    var preset = listedPresets[IDs[i]];
    var option = document.createElement('option');
    option.value = preset.id;
    option.innerHTML = preset.name;
    options.appendChild(option);
  }
  select.appendChild(options);
  select.addEventListener('change', function (e) {
    menu.applyConfig(listedPresets[select.value].config);
    menu.notifyChange();
  });
  menu.addChangeListener(function () {
    select.value = '';
  });
};
// eslint-disable-next-line class-methods-use-this
MenuPresetSelectControl.prototype.updateConfig = function updateConfig (config) {
};
// eslint-disable-next-line class-methods-use-this
MenuPresetSelectControl.prototype.applyConfig = function applyConfig (config) {
};

/**
 * Base class of all controls participating in the main menu
 * This is rather for documenting the common interface than
 * offering concrete functionality for reuse.
 */
var Control = function Control(menu) {
  this.menu = menu;
};
// eslint-disable-next-line class-methods-use-this
Control.prototype.updateConfig = function updateConfig (/* config */) {
  throw new Error('Method not implemented');
};
// eslint-disable-next-line class-methods-use-this
Control.prototype.applyConfig = function applyConfig (/* config */) {
  throw new Error('Method not implemented');
};

/**
 *
 */
var BgColorPicker = (function (Control) {
  function BgColorPicker(menu) {
    var this$1 = this;

    Control.call(this, menu);
    this.elm = document.getElementById('menu-bg-color-control');
    this.input = this.elm.querySelector('input[type="color"]');

    this.input.addEventListener('change', function () {
      this$1.menu.notifyChange();
    });
  }

  if ( Control ) BgColorPicker.__proto__ = Control;
  BgColorPicker.prototype = Object.create( Control && Control.prototype );
  BgColorPicker.prototype.constructor = BgColorPicker;

  BgColorPicker.prototype.updateConfig = function updateConfig (config) {
    // eslint-disable-next-line no-param-reassign
    config.backgroundColor = index(this.input.value)
      .rgba.map(function (val, i) { return (i === 3 ? val : val / 255); });
  };

  BgColorPicker.prototype.applyConfig = function applyConfig (config) {
    var ref = config.backgroundColor.map(function (val, i) { return (i === 3 ? val : val * 255); });
    var r = ref[0];
    var g = ref[1];
    var b = ref[2];
    var a = ref[3];
    this.input.value = index(("rgba(" + r + ", " + g + ", " + b + ", " + a + ")")).hex;
  };

  return BgColorPicker;
}(Control));

/**
 *
 */
var ParticleCountControl = (function (Control) {
  function ParticleCountControl(menu) {
    var this$1 = this;

    Control.call(this, menu);
    this.xInput = document.getElementById('menu-particles-x');
    this.yInput = document.getElementById('menu-particles-y');

    this.xInput.addEventListener('change', function () {
      this$1.menu.notifyChange();
    });
    this.yInput.addEventListener('change', function () {
      this$1.menu.notifyChange();
    });
  }

  if ( Control ) ParticleCountControl.__proto__ = Control;
  ParticleCountControl.prototype = Object.create( Control && Control.prototype );
  ParticleCountControl.prototype.constructor = ParticleCountControl;

  ParticleCountControl.prototype.updateConfig = function updateConfig (config) {
    // eslint-disable-next-line no-param-reassign
    config.xParticlesCount = parseInt(this.xInput.value, 10);
    // eslint-disable-next-line no-param-reassign
    config.yParticlesCount = parseInt(this.yInput.value, 10);
  };

  ParticleCountControl.prototype.applyConfig = function applyConfig (config) {
    this.xInput.value = config.xParticlesCount;
    this.yInput.value = config.yParticlesCount;
  };

  return ParticleCountControl;
}(Control));

/**
 * This is an invisible menu item with the purpose of storing the default
 * image scaling parameters selected by the user
 */
var DefaultImageControl = (function (Control) {
  function DefaultImageControl(menu) {
    Control.call(this, menu);
    this.defaultImageScaling = 'crop-to-viewport';
    this.defaultImageCropping = {x: 'crop-both', y: 'crop-both'};
  }

  if ( Control ) DefaultImageControl.__proto__ = Control;
  DefaultImageControl.prototype = Object.create( Control && Control.prototype );
  DefaultImageControl.prototype.constructor = DefaultImageControl;

  DefaultImageControl.prototype.updateConfig = function updateConfig (config) {
    // eslint-disable-next-line no-param-reassign
    config.defaultImageScaling = this.defaultImageScaling;
    // eslint-disable-next-line no-param-reassign
    config.defaultImageCropping = this.defaultImageCropping;
  };

  DefaultImageControl.prototype.applyConfig = function applyConfig (config) {
    this.defaultImageScaling = config.defaultImageScaling || 'crop-to-viewport';
    this.defaultImageCropping = config.defaultImageCropping || {x: 'crop-both', y: 'crop-both'};
  };

  return DefaultImageControl;
}(Control));

/**
 *
 */
var ParticleSizeControl = (function (Control) {
  function ParticleSizeControl(menu) {
    var this$1 = this;

    Control.call(this, menu);
    this.elm = document.getElementById('menu-particle-size-control');
    this.input = this.elm.querySelector('input[type="number"]');

    this.input.addEventListener('change', function () {
      this$1.menu.notifyChange();
    });
  }

  if ( Control ) ParticleSizeControl.__proto__ = Control;
  ParticleSizeControl.prototype = Object.create( Control && Control.prototype );
  ParticleSizeControl.prototype.constructor = ParticleSizeControl;

  ParticleSizeControl.prototype.updateConfig = function updateConfig (config) {
    // eslint-disable-next-line no-param-reassign
    config.particleScaling = parseInt(this.input.value, 10) / 100;
  };

  ParticleSizeControl.prototype.applyConfig = function applyConfig (config) {
    this.input.value = config.particleScaling * 100;
  };

  return ParticleSizeControl;
}(Control));

/**
 *
 */
var ParticleShapeControl = (function (Control) {
  function ParticleShapeControl(menu) {
    var this$1 = this;

    Control.call(this, menu);
    this.elm = document.getElementById('menu-particle-shape-control');
    this.select = this.elm.querySelector('select');

    this.select.addEventListener('change', function () {
      this$1.menu.notifyChange();
    });
  }

  if ( Control ) ParticleShapeControl.__proto__ = Control;
  ParticleShapeControl.prototype = Object.create( Control && Control.prototype );
  ParticleShapeControl.prototype.constructor = ParticleShapeControl;

  ParticleShapeControl.prototype.updateConfig = function updateConfig (config) {
    // eslint-disable-next-line no-param-reassign
    config.particleShape = this.select.value || 'circle';
  };

  ParticleShapeControl.prototype.applyConfig = function applyConfig (config) {
    this.select.value = config.particleShape;
  };

  return ParticleShapeControl;
}(Control));

/**
 *
 */
var ParticleEdgeFadeControl = (function (Control) {
  function ParticleEdgeFadeControl(menu) {
    var this$1 = this;

    Control.call(this, menu);
    this.elm = document.getElementById('menu-particle-edge-fade-control');
    this.select = this.elm.querySelector('select');

    this.select.addEventListener('change', function () {
      this$1.menu.notifyChange();
    });
  }

  if ( Control ) ParticleEdgeFadeControl.__proto__ = Control;
  ParticleEdgeFadeControl.prototype = Object.create( Control && Control.prototype );
  ParticleEdgeFadeControl.prototype.constructor = ParticleEdgeFadeControl;

  ParticleEdgeFadeControl.prototype.updateConfig = function updateConfig (config) {
    // eslint-disable-next-line no-param-reassign
    config.particleFading = this.select.value;
  };

  ParticleEdgeFadeControl.prototype.applyConfig = function applyConfig (config) {
    this.select.value = config.particleFading || 'fade out';
  };

  return ParticleEdgeFadeControl;
}(Control));

/**
 *
 */
var ParticleOverlapControl = (function (Control) {
  function ParticleOverlapControl(menu) {
    var this$1 = this;

    Control.call(this, menu);
    this.elm = document.getElementById('menu-particle-overlap-control');
    this.select = this.elm.querySelector('select');

    this.select.addEventListener('change', function () {
      this$1.menu.notifyChange();
    });
  }

  if ( Control ) ParticleOverlapControl.__proto__ = Control;
  ParticleOverlapControl.prototype = Object.create( Control && Control.prototype );
  ParticleOverlapControl.prototype.constructor = ParticleOverlapControl;

  ParticleOverlapControl.prototype.updateConfig = function updateConfig (config) {
    // eslint-disable-next-line no-param-reassign
    config.particleOverlap = this.select.value;
  };

  ParticleOverlapControl.prototype.applyConfig = function applyConfig (config) {
    this.select.value = config.particleOverlap;
  };

  return ParticleOverlapControl;
}(Control));

/**
 *
 */
var ExportAppstateButton = (function (Control) {
  function ExportAppstateButton(menu) {
    var this$1 = this;

    Control.call(this, menu);
    this.elm = document.getElementById('menu-btn-exportstate');
    this.elm.addEventListener('click', function () {
      var toExport = Object.assign({
        schemaVersion: Config.export_schema_version
      }, this$1.menu.submittedConfig);
      ExportAppstateButton.saveJson('particles.json', JSON.stringify(toExport, null, 2));
    });
  }

  if ( Control ) ExportAppstateButton.__proto__ = Control;
  ExportAppstateButton.prototype = Object.create( Control && Control.prototype );
  ExportAppstateButton.prototype.constructor = ExportAppstateButton;
  ExportAppstateButton.saveJson = function saveJson (filename, data) {
    var blob = new Blob([data], { type: 'application/json' });
    if (navigator.msSaveOrOpenBlob) {
      navigator.msSaveBlob(blob, filename);
    } else {
      var elm = document.createElement('a');
      elm.href = URL.createObjectURL(blob);
      elm.download = filename;
      document.body.appendChild(elm);
      elm.click();
      document.body.removeChild(elm);
    }
  };
  // eslint-disable-next-line class-methods-use-this
  ExportAppstateButton.prototype.updateConfig = function updateConfig (/* config */) {};
  // eslint-disable-next-line class-methods-use-this
  ExportAppstateButton.prototype.applyConfig = function applyConfig (/* config */) {};

  return ExportAppstateButton;
}(Control));

/**
 *
 */
var ImportAppstateButton = (function (Control) {
  function ImportAppstateButton(menu) {
    var this$1 = this;

    Control.call(this, menu);
    this.FR = new FileReader();
    this.elm = document.getElementById('menu-btn-importstate');
    this.input = this.elm.querySelector('input[type="file"]');
    this.input.addEventListener('change', function (evt) {
      var file = null;
      if (evt.target.files.length > 0) {
        file = evt.target.files[0];
      } else {
        return;
      }
      this$1.FR.onload = function () {
        var text = this$1.FR.result;
        var json = null;
        try {
          json = JSON.parse(text);
        } catch (e) {
          // TODO correct error handling
          console.error('Error reading user json file');
          console.error(e);

          return;
        }
        this$1.menu.applyConfig(json);
        this$1.menu.submit();
        this$1.input.value = null;
      };
      this$1.FR.readAsText(file);
    });
  }

  if ( Control ) ImportAppstateButton.__proto__ = Control;
  ImportAppstateButton.prototype = Object.create( Control && Control.prototype );
  ImportAppstateButton.prototype.constructor = ImportAppstateButton;
  // eslint-disable-next-line class-methods-use-this
  ImportAppstateButton.prototype.updateConfig = function updateConfig (/* config */) {};
  // eslint-disable-next-line class-methods-use-this
  ImportAppstateButton.prototype.applyConfig = function applyConfig (/* config */) {};

  return ImportAppstateButton;
}(Control));

/**
 *
 */
var ResetAppstateButton = (function (Control) {
  function ResetAppstateButton(menu) {
    var this$1 = this;

    Control.call(this, menu);
    this.elm = document.getElementById('menu-btn-resetstate');
    this.elm.addEventListener('click', function () {
      this$1.menu.applyConfig(this$1.menu.defaultConfig);
      this$1.menu.submit();
    });
  }

  if ( Control ) ResetAppstateButton.__proto__ = Control;
  ResetAppstateButton.prototype = Object.create( Control && Control.prototype );
  ResetAppstateButton.prototype.constructor = ResetAppstateButton;
  // eslint-disable-next-line class-methods-use-this
  ResetAppstateButton.prototype.updateConfig = function updateConfig (/* config */) {};
  // eslint-disable-next-line class-methods-use-this
  ResetAppstateButton.prototype.applyConfig = function applyConfig (/* config */) {};

  return ResetAppstateButton;
}(Control));

var ControlsList = [
  BgColorPicker, ParticleCountControl, DefaultImageControl,
  ParticleSizeControl, ParticleShapeControl, ParticleEdgeFadeControl, ParticleOverlapControl,
  MenuPresetSelectControl,
  ExportAppstateButton, ImportAppstateButton, ResetAppstateButton
];

var EffectListItem = function EffectListItem(effect, timeline) {
  var this$1 = this;

  this.effect = effect;
  this.timeline = timeline;
  this.element = parseHtml(("\n      <li title=\"" + (effect.getDescription()) + "\">" + (effect.getDisplayName()) + "</li>\n    "));
  this.dragCopy = parseHtml(("\n      <div class=\"effect-list-item drag-drop-copy\">" + (effect.getDisplayName()) + "</div>\n    "));
    
  var dragCopy = this.dragCopy;
  var showDragCopy = function (x, y) {
    document.getElementById('modal-container').appendChild(dragCopy);
    dragCopy.style.width = (this$1.element.offsetWidth) + "px";
    dragCopy.style.height = (this$1.element.offsetHeight) + "px";
    dragCopy.style.left = (x - (this$1.element.offsetWidth / 2)) + "px";
    dragCopy.style.top = (y - (this$1.element.offsetHeight / 2)) + "px";
  };
  var updateDragCopy = function (x, y) {
    dragCopy.style.left = (x - (this$1.element.offsetWidth / 2)) + "px";
    dragCopy.style.top = (y - (this$1.element.offsetHeight / 2)) + "px";
  };
  var hideDragCopy = function () {
    if (dragCopy.parentNode) {
      dragCopy.parentNode.removeChild(dragCopy);
    }
  };

  this.element.addEventListener('mousedown', function (evt) {
    showDragCopy(evt.clientX, evt.clientY);
    var onDrag = function (evt) { return updateDragCopy(evt.clientX, evt.clientY); };
    var onDragend = function (evt) {
      document.documentElement.removeEventListener('mouseup', onDragend);
      document.documentElement.removeEventListener('mousemove', onDrag);
      hideDragCopy();
      this$1.timeline.dropNewEffect(
        this$1.effect, evt.clientX, evt.clientY, this$1.element.offsetWidth,
        this$1.element.offsetHeight
      );
    };
    document.documentElement.addEventListener('mouseup', onDragend);
    document.documentElement.addEventListener('mousemove', onDrag);
  });

  /**
   * Now for touch
   */
  var touchDragging = function (evt) {
    showDragCopy(evt.touches[0].clientX, evt.touches[0].clientY);
    var onDrag = function (evt) {
      if (evt.touches) {
        updateDragCopy(evt.touches[0].clientX, evt.touches[0].clientY);
      } else {
        updateDragCopy(evt.clientX, evt.clientY);
      }
    };
    var onDragend = function (evt) {
      document.documentElement.removeEventListener('touchend', onDragend);
      document.documentElement.removeEventListener('touchmove', onDrag);
      hideDragCopy();
      this$1.timeline.dropNewEffect(
        this$1.effect, evt.changedTouches[0].clientX, evt.changedTouches[0].clientY,
        this$1.element.offsetWidth, this$1.element.offsetHeight
      );
    };
    document.documentElement.addEventListener('touchend', onDragend);
    document.documentElement.addEventListener('touchmove', onDrag);
  };
  this.element.addEventListener('touchstart', function (evt) {
    touchDragging(evt);
  }, { passive: false });
  // Weird chrome behavior:
  // http://wilsonpage.co.uk/touch-events-in-chrome-android/
  // TODO this breaks scrolling - which is why I removed the timeout
  // (long press to drag) logic
  var preventCancel = function (evt) {
    if (evt.path[0] === this$1.element) {
      evt.preventDefault();
    }
  };
  document.documentElement.addEventListener('touchmove', preventCancel, { passive: false });
};
EffectListItem.prototype.getElement = function getElement () {
  return this.element;
};

var MainMenu = function MainMenu(clock) {
  var this$1 = this;

  this.menu = document.getElementById('menu-container');
  this.clock = clock;
  this.controls = [];
  this.changeListeners = [];
  this.defaultConfig = null; // defaults will be read later
  this.submittedConfig = null;

  this.menuContent = this.menu.querySelector('.menu-content');
  this.effectList = this.menu.querySelector('.menu-effect-list');
  this.toggle = document.getElementById('toggle-menu-visible');
  this.applyBtn = document.getElementById('menu-btn-apply');

  this.timeline = new Timeline(this);

  var menu = this.menu;
  var toggle = this.toggle;
  var applyBtn = this.applyBtn;

  // Close menu if clicked outside
  document.addEventListener('click', function (evt) {
    if (!menu.contains(evt.target) &&
        !document.getElementById('modal-container').contains(evt.target)
    ) {
      toggle.checked = false;
    }
  });
  applyBtn.addEventListener('click', function () {
    // Apply closes menu if covering full width
    if (this$1.isCoverFullWidth()) {
      this$1.toggle.checked = false;
    }
    this$1.submit();
    this$1.clock.setPaused(false);
  });

  for (var i = 0; i < ControlsList.length; i++) {
    this$1.addControl(ControlsList[i]);
  }

  var effectListElms = document.createDocumentFragment();
  for (var i$1 = 0; i$1 < effectList.length; i$1++) {
    var elm = new EffectListItem(effectList[i$1], this$1.timeline).getElement();
    effectListElms.appendChild(elm);
  }
  this.effectList.appendChild(effectListElms);

  this.defaultConfig = this.readConfig();

  // now populate the initial config (NOT defaultConfig) with some effects
  var effectLen = 2500;
  var tracks = [];
  for (var i$2 = 0; i$2 < effectList.length; i$2++) {
    tracks.push([
      new EffectConfig(
        effectList[i$2].getId(),
        i$2 * effectLen,
        i$2 * effectLen + effectLen,
        1,
        effectList[i$2].getDefaultConfig()
      )
    ]);
  }
  this.timeline.loadTimeline(tracks);

  this.submittedConfig = this.readConfig();
};

MainMenu.prototype.applyConfig = function applyConfig (config) {
    var this$1 = this;

  for (var i = 0; i < this.controls.length; i++) {
    this$1.controls[i].applyConfig(config);
  }
  this.timeline.loadTimeline(config.effects);
};

MainMenu.prototype.readConfig = function readConfig () {
    var this$1 = this;

  var config = {};
  for (var i = 0; i < this.controls.length; i++) {
    this$1.controls[i].updateConfig(config);
  }
  config.effects = this.timeline.getEffects();
  config.duration = this.timeline.getTotalDuration();

  return config;
};

MainMenu.prototype.submit = function submit () {
    var this$1 = this;

  this.applyBtn.disabled = true;
  var config = this.readConfig();
  for (var i = 0; i < this.changeListeners.length; i++) {
    this$1.changeListeners[i](config);
  }
  this.submittedConfig = config;
};

MainMenu.prototype.addControl = function addControl (CtrlClass) {
  var ctrl = new CtrlClass(this);
  this.controls.push(ctrl);
};
MainMenu.prototype.addChangeListener = function addChangeListener (listener) {
  this.changeListeners.push(listener);
};

MainMenu.prototype.isCoverFullWidth = function isCoverFullWidth () {
  var menuWidth = document.defaultView.getComputedStyle(this.menuContent).width;
  // Remove "px"
  menuWidth = menuWidth.substring(0, menuWidth.length);

  return parseInt(menuWidth, 10) === window.innerWidth;
};

MainMenu.prototype.notifyChange = function notifyChange () {
  this.applyBtn.disabled = false;
};

MainMenu.prototype.isVisible = function isVisible () {
  return this.toggle.checked;
};

var regl = createCommonjsModule(function (module, exports) {
(function (global, factory) {
	module.exports = factory();
}(commonjsGlobal, (function () { 'use strict';

var arrayTypes = {
	"[object Int8Array]": 5120,
	"[object Int16Array]": 5122,
	"[object Int32Array]": 5124,
	"[object Uint8Array]": 5121,
	"[object Uint8ClampedArray]": 5121,
	"[object Uint16Array]": 5123,
	"[object Uint32Array]": 5125,
	"[object Float32Array]": 5126,
	"[object Float64Array]": 5121,
	"[object ArrayBuffer]": 5121
};

var isTypedArray = function (x) {
  return Object.prototype.toString.call(x) in arrayTypes
};

var extend = function (base, opts) {
  var keys = Object.keys(opts);
  for (var i = 0; i < keys.length; ++i) {
    base[keys[i]] = opts[keys[i]];
  }
  return base
};

// Error checking and parameter validation.
//
// Statements for the form `check.someProcedure(...)` get removed by
// a browserify transform for optimized/minified bundles.
//
/* globals btoa */
// only used for extracting shader names.  if btoa not present, then errors
// will be slightly crappier
function decodeB64 (str) {
  if (typeof btoa !== 'undefined') {
    return btoa(str)
  }
  return 'base64:' + str
}

function raise (message) {
  var error = new Error('(regl) ' + message);
  console.error(error);
  throw error
}

function check (pred, message) {
  if (!pred) {
    raise(message);
  }
}

function encolon (message) {
  if (message) {
    return ': ' + message
  }
  return ''
}

function checkParameter (param, possibilities, message) {
  if (!(param in possibilities)) {
    raise('unknown parameter (' + param + ')' + encolon(message) +
          '. possible values: ' + Object.keys(possibilities).join());
  }
}

function checkIsTypedArray (data, message) {
  if (!isTypedArray(data)) {
    raise(
      'invalid parameter type' + encolon(message) +
      '. must be a typed array');
  }
}

function checkTypeOf (value, type, message) {
  if (typeof value !== type) {
    raise(
      'invalid parameter type' + encolon(message) +
      '. expected ' + type + ', got ' + (typeof value));
  }
}

function checkNonNegativeInt (value, message) {
  if (!((value >= 0) &&
        ((value | 0) === value))) {
    raise('invalid parameter type, (' + value + ')' + encolon(message) +
          '. must be a nonnegative integer');
  }
}

function checkOneOf (value, list, message) {
  if (list.indexOf(value) < 0) {
    raise('invalid value' + encolon(message) + '. must be one of: ' + list);
  }
}

var constructorKeys = [
  'gl',
  'canvas',
  'container',
  'attributes',
  'pixelRatio',
  'extensions',
  'optionalExtensions',
  'profile',
  'onDone'
];

function checkConstructor (obj) {
  Object.keys(obj).forEach(function (key) {
    if (constructorKeys.indexOf(key) < 0) {
      raise('invalid regl constructor argument "' + key + '". must be one of ' + constructorKeys);
    }
  });
}

function leftPad (str, n) {
  str = str + '';
  while (str.length < n) {
    str = ' ' + str;
  }
  return str
}

function ShaderFile () {
  this.name = 'unknown';
  this.lines = [];
  this.index = {};
  this.hasErrors = false;
}

function ShaderLine (number, line) {
  this.number = number;
  this.line = line;
  this.errors = [];
}

function ShaderError (fileNumber, lineNumber, message) {
  this.file = fileNumber;
  this.line = lineNumber;
  this.message = message;
}

function guessCommand () {
  var error = new Error();
  var stack = (error.stack || error).toString();
  var pat = /compileProcedure.*\n\s*at.*\((.*)\)/.exec(stack);
  if (pat) {
    return pat[1]
  }
  var pat2 = /compileProcedure.*\n\s*at\s+(.*)(\n|$)/.exec(stack);
  if (pat2) {
    return pat2[1]
  }
  return 'unknown'
}

function guessCallSite () {
  var error = new Error();
  var stack = (error.stack || error).toString();
  var pat = /at REGLCommand.*\n\s+at.*\((.*)\)/.exec(stack);
  if (pat) {
    return pat[1]
  }
  var pat2 = /at REGLCommand.*\n\s+at\s+(.*)\n/.exec(stack);
  if (pat2) {
    return pat2[1]
  }
  return 'unknown'
}

function parseSource (source, command) {
  var lines = source.split('\n');
  var lineNumber = 1;
  var fileNumber = 0;
  var files = {
    unknown: new ShaderFile(),
    0: new ShaderFile()
  };
  files.unknown.name = files[0].name = command || guessCommand();
  files.unknown.lines.push(new ShaderLine(0, ''));
  for (var i = 0; i < lines.length; ++i) {
    var line = lines[i];
    var parts = /^\s*\#\s*(\w+)\s+(.+)\s*$/.exec(line);
    if (parts) {
      switch (parts[1]) {
        case 'line':
          var lineNumberInfo = /(\d+)(\s+\d+)?/.exec(parts[2]);
          if (lineNumberInfo) {
            lineNumber = lineNumberInfo[1] | 0;
            if (lineNumberInfo[2]) {
              fileNumber = lineNumberInfo[2] | 0;
              if (!(fileNumber in files)) {
                files[fileNumber] = new ShaderFile();
              }
            }
          }
          break
        case 'define':
          var nameInfo = /SHADER_NAME(_B64)?\s+(.*)$/.exec(parts[2]);
          if (nameInfo) {
            files[fileNumber].name = (nameInfo[1]
                ? decodeB64(nameInfo[2])
                : nameInfo[2]);
          }
          break
      }
    }
    files[fileNumber].lines.push(new ShaderLine(lineNumber++, line));
  }
  Object.keys(files).forEach(function (fileNumber) {
    var file = files[fileNumber];
    file.lines.forEach(function (line) {
      file.index[line.number] = line;
    });
  });
  return files
}

function parseErrorLog (errLog) {
  var result = [];
  errLog.split('\n').forEach(function (errMsg) {
    if (errMsg.length < 5) {
      return
    }
    var parts = /^ERROR\:\s+(\d+)\:(\d+)\:\s*(.*)$/.exec(errMsg);
    if (parts) {
      result.push(new ShaderError(
        parts[1] | 0,
        parts[2] | 0,
        parts[3].trim()));
    } else if (errMsg.length > 0) {
      result.push(new ShaderError('unknown', 0, errMsg));
    }
  });
  return result
}

function annotateFiles (files, errors) {
  errors.forEach(function (error) {
    var file = files[error.file];
    if (file) {
      var line = file.index[error.line];
      if (line) {
        line.errors.push(error);
        file.hasErrors = true;
        return
      }
    }
    files.unknown.hasErrors = true;
    files.unknown.lines[0].errors.push(error);
  });
}

function checkShaderError (gl, shader, source, type, command) {
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    var errLog = gl.getShaderInfoLog(shader);
    var typeName = type === gl.FRAGMENT_SHADER ? 'fragment' : 'vertex';
    checkCommandType(source, 'string', typeName + ' shader source must be a string', command);
    var files = parseSource(source, command);
    var errors = parseErrorLog(errLog);
    annotateFiles(files, errors);

    Object.keys(files).forEach(function (fileNumber) {
      var file = files[fileNumber];
      if (!file.hasErrors) {
        return
      }

      var strings = [''];
      var styles = [''];

      function push (str, style) {
        strings.push(str);
        styles.push(style || '');
      }

      push('file number ' + fileNumber + ': ' + file.name + '\n', 'color:red;text-decoration:underline;font-weight:bold');

      file.lines.forEach(function (line) {
        if (line.errors.length > 0) {
          push(leftPad(line.number, 4) + '|  ', 'background-color:yellow; font-weight:bold');
          push(line.line + '\n', 'color:red; background-color:yellow; font-weight:bold');

          // try to guess token
          var offset = 0;
          line.errors.forEach(function (error) {
            var message = error.message;
            var token = /^\s*\'(.*)\'\s*\:\s*(.*)$/.exec(message);
            if (token) {
              var tokenPat = token[1];
              message = token[2];
              switch (tokenPat) {
                case 'assign':
                  tokenPat = '=';
                  break
              }
              offset = Math.max(line.line.indexOf(tokenPat, offset), 0);
            } else {
              offset = 0;
            }

            push(leftPad('| ', 6));
            push(leftPad('^^^', offset + 3) + '\n', 'font-weight:bold');
            push(leftPad('| ', 6));
            push(message + '\n', 'font-weight:bold');
          });
          push(leftPad('| ', 6) + '\n');
        } else {
          push(leftPad(line.number, 4) + '|  ');
          push(line.line + '\n', 'color:red');
        }
      });
      if (typeof document !== 'undefined') {
        styles[0] = strings.join('%c');
        console.log.apply(console, styles);
      } else {
        console.log(strings.join(''));
      }
    });

    check.raise('Error compiling ' + typeName + ' shader, ' + files[0].name);
  }
}

function checkLinkError (gl, program, fragShader, vertShader, command) {
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    var errLog = gl.getProgramInfoLog(program);
    var fragParse = parseSource(fragShader, command);
    var vertParse = parseSource(vertShader, command);

    var header = 'Error linking program with vertex shader, "' +
      vertParse[0].name + '", and fragment shader "' + fragParse[0].name + '"';

    if (typeof document !== 'undefined') {
      console.log('%c' + header + '\n%c' + errLog,
        'color:red;text-decoration:underline;font-weight:bold',
        'color:red');
    } else {
      console.log(header + '\n' + errLog);
    }
    check.raise(header);
  }
}

function saveCommandRef (object) {
  object._commandRef = guessCommand();
}

function saveDrawCommandInfo (opts, uniforms, attributes, stringStore) {
  saveCommandRef(opts);

  function id (str) {
    if (str) {
      return stringStore.id(str)
    }
    return 0
  }
  opts._fragId = id(opts.static.frag);
  opts._vertId = id(opts.static.vert);

  function addProps (dict, set) {
    Object.keys(set).forEach(function (u) {
      dict[stringStore.id(u)] = true;
    });
  }

  var uniformSet = opts._uniformSet = {};
  addProps(uniformSet, uniforms.static);
  addProps(uniformSet, uniforms.dynamic);

  var attributeSet = opts._attributeSet = {};
  addProps(attributeSet, attributes.static);
  addProps(attributeSet, attributes.dynamic);

  opts._hasCount = (
    'count' in opts.static ||
    'count' in opts.dynamic ||
    'elements' in opts.static ||
    'elements' in opts.dynamic);
}

function commandRaise (message, command) {
  var callSite = guessCallSite();
  raise(message +
    ' in command ' + (command || guessCommand()) +
    (callSite === 'unknown' ? '' : ' called from ' + callSite));
}

function checkCommand (pred, message, command) {
  if (!pred) {
    commandRaise(message, command || guessCommand());
  }
}

function checkParameterCommand (param, possibilities, message, command) {
  if (!(param in possibilities)) {
    commandRaise(
      'unknown parameter (' + param + ')' + encolon(message) +
      '. possible values: ' + Object.keys(possibilities).join(),
      command || guessCommand());
  }
}

function checkCommandType (value, type, message, command) {
  if (typeof value !== type) {
    commandRaise(
      'invalid parameter type' + encolon(message) +
      '. expected ' + type + ', got ' + (typeof value),
      command || guessCommand());
  }
}

function checkOptional (block) {
  block();
}

function checkFramebufferFormat (attachment, texFormats, rbFormats) {
  if (attachment.texture) {
    checkOneOf(
      attachment.texture._texture.internalformat,
      texFormats,
      'unsupported texture format for attachment');
  } else {
    checkOneOf(
      attachment.renderbuffer._renderbuffer.format,
      rbFormats,
      'unsupported renderbuffer format for attachment');
  }
}

var GL_CLAMP_TO_EDGE = 0x812F;

var GL_NEAREST = 0x2600;
var GL_NEAREST_MIPMAP_NEAREST = 0x2700;
var GL_LINEAR_MIPMAP_NEAREST = 0x2701;
var GL_NEAREST_MIPMAP_LINEAR = 0x2702;
var GL_LINEAR_MIPMAP_LINEAR = 0x2703;

var GL_BYTE = 5120;
var GL_UNSIGNED_BYTE = 5121;
var GL_SHORT = 5122;
var GL_UNSIGNED_SHORT = 5123;
var GL_INT = 5124;
var GL_UNSIGNED_INT = 5125;
var GL_FLOAT = 5126;

var GL_UNSIGNED_SHORT_4_4_4_4 = 0x8033;
var GL_UNSIGNED_SHORT_5_5_5_1 = 0x8034;
var GL_UNSIGNED_SHORT_5_6_5 = 0x8363;
var GL_UNSIGNED_INT_24_8_WEBGL = 0x84FA;

var GL_HALF_FLOAT_OES = 0x8D61;

var TYPE_SIZE = {};

TYPE_SIZE[GL_BYTE] =
TYPE_SIZE[GL_UNSIGNED_BYTE] = 1;

TYPE_SIZE[GL_SHORT] =
TYPE_SIZE[GL_UNSIGNED_SHORT] =
TYPE_SIZE[GL_HALF_FLOAT_OES] =
TYPE_SIZE[GL_UNSIGNED_SHORT_5_6_5] =
TYPE_SIZE[GL_UNSIGNED_SHORT_4_4_4_4] =
TYPE_SIZE[GL_UNSIGNED_SHORT_5_5_5_1] = 2;

TYPE_SIZE[GL_INT] =
TYPE_SIZE[GL_UNSIGNED_INT] =
TYPE_SIZE[GL_FLOAT] =
TYPE_SIZE[GL_UNSIGNED_INT_24_8_WEBGL] = 4;

function pixelSize (type, channels) {
  if (type === GL_UNSIGNED_SHORT_5_5_5_1 ||
      type === GL_UNSIGNED_SHORT_4_4_4_4 ||
      type === GL_UNSIGNED_SHORT_5_6_5) {
    return 2
  } else if (type === GL_UNSIGNED_INT_24_8_WEBGL) {
    return 4
  } else {
    return TYPE_SIZE[type] * channels
  }
}

function isPow2 (v) {
  return !(v & (v - 1)) && (!!v)
}

function checkTexture2D (info, mipData, limits) {
  var i;
  var w = mipData.width;
  var h = mipData.height;
  var c = mipData.channels;

  // Check texture shape
  check(w > 0 && w <= limits.maxTextureSize &&
        h > 0 && h <= limits.maxTextureSize,
        'invalid texture shape');

  // check wrap mode
  if (info.wrapS !== GL_CLAMP_TO_EDGE || info.wrapT !== GL_CLAMP_TO_EDGE) {
    check(isPow2(w) && isPow2(h),
      'incompatible wrap mode for texture, both width and height must be power of 2');
  }

  if (mipData.mipmask === 1) {
    if (w !== 1 && h !== 1) {
      check(
        info.minFilter !== GL_NEAREST_MIPMAP_NEAREST &&
        info.minFilter !== GL_NEAREST_MIPMAP_LINEAR &&
        info.minFilter !== GL_LINEAR_MIPMAP_NEAREST &&
        info.minFilter !== GL_LINEAR_MIPMAP_LINEAR,
        'min filter requires mipmap');
    }
  } else {
    // texture must be power of 2
    check(isPow2(w) && isPow2(h),
      'texture must be a square power of 2 to support mipmapping');
    check(mipData.mipmask === (w << 1) - 1,
      'missing or incomplete mipmap data');
  }

  if (mipData.type === GL_FLOAT) {
    if (limits.extensions.indexOf('oes_texture_float_linear') < 0) {
      check(info.minFilter === GL_NEAREST && info.magFilter === GL_NEAREST,
        'filter not supported, must enable oes_texture_float_linear');
    }
    check(!info.genMipmaps,
      'mipmap generation not supported with float textures');
  }

  // check image complete
  var mipimages = mipData.images;
  for (i = 0; i < 16; ++i) {
    if (mipimages[i]) {
      var mw = w >> i;
      var mh = h >> i;
      check(mipData.mipmask & (1 << i), 'missing mipmap data');

      var img = mipimages[i];

      check(
        img.width === mw &&
        img.height === mh,
        'invalid shape for mip images');

      check(
        img.format === mipData.format &&
        img.internalformat === mipData.internalformat &&
        img.type === mipData.type,
        'incompatible type for mip image');

      if (img.compressed) {
        // TODO: check size for compressed images
      } else if (img.data) {
        // check(img.data.byteLength === mw * mh *
        // Math.max(pixelSize(img.type, c), img.unpackAlignment),
        var rowSize = Math.ceil(pixelSize(img.type, c) * mw / img.unpackAlignment) * img.unpackAlignment;
        check(img.data.byteLength === rowSize * mh,
          'invalid data for image, buffer size is inconsistent with image format');
      } else if (img.element) {
        // TODO: check element can be loaded
      } else if (img.copy) {
        // TODO: check compatible format and type
      }
    } else if (!info.genMipmaps) {
      check((mipData.mipmask & (1 << i)) === 0, 'extra mipmap data');
    }
  }

  if (mipData.compressed) {
    check(!info.genMipmaps,
      'mipmap generation for compressed images not supported');
  }
}

function checkTextureCube (texture, info, faces, limits) {
  var w = texture.width;
  var h = texture.height;
  var c = texture.channels;

  // Check texture shape
  check(
    w > 0 && w <= limits.maxTextureSize && h > 0 && h <= limits.maxTextureSize,
    'invalid texture shape');
  check(
    w === h,
    'cube map must be square');
  check(
    info.wrapS === GL_CLAMP_TO_EDGE && info.wrapT === GL_CLAMP_TO_EDGE,
    'wrap mode not supported by cube map');

  for (var i = 0; i < faces.length; ++i) {
    var face = faces[i];
    check(
      face.width === w && face.height === h,
      'inconsistent cube map face shape');

    if (info.genMipmaps) {
      check(!face.compressed,
        'can not generate mipmap for compressed textures');
      check(face.mipmask === 1,
        'can not specify mipmaps and generate mipmaps');
    } else {
      // TODO: check mip and filter mode
    }

    var mipmaps = face.images;
    for (var j = 0; j < 16; ++j) {
      var img = mipmaps[j];
      if (img) {
        var mw = w >> j;
        var mh = h >> j;
        check(face.mipmask & (1 << j), 'missing mipmap data');
        check(
          img.width === mw &&
          img.height === mh,
          'invalid shape for mip images');
        check(
          img.format === texture.format &&
          img.internalformat === texture.internalformat &&
          img.type === texture.type,
          'incompatible type for mip image');

        if (img.compressed) {
          // TODO: check size for compressed images
        } else if (img.data) {
          check(img.data.byteLength === mw * mh *
            Math.max(pixelSize(img.type, c), img.unpackAlignment),
            'invalid data for image, buffer size is inconsistent with image format');
        } else if (img.element) {
          // TODO: check element can be loaded
        } else if (img.copy) {
          // TODO: check compatible format and type
        }
      }
    }
  }
}

var check$1 = extend(check, {
  optional: checkOptional,
  raise: raise,
  commandRaise: commandRaise,
  command: checkCommand,
  parameter: checkParameter,
  commandParameter: checkParameterCommand,
  constructor: checkConstructor,
  type: checkTypeOf,
  commandType: checkCommandType,
  isTypedArray: checkIsTypedArray,
  nni: checkNonNegativeInt,
  oneOf: checkOneOf,
  shaderError: checkShaderError,
  linkError: checkLinkError,
  callSite: guessCallSite,
  saveCommandRef: saveCommandRef,
  saveDrawInfo: saveDrawCommandInfo,
  framebufferFormat: checkFramebufferFormat,
  guessCommand: guessCommand,
  texture2D: checkTexture2D,
  textureCube: checkTextureCube
});

var VARIABLE_COUNTER = 0;

var DYN_FUNC = 0;

function DynamicVariable (type, data) {
  this.id = (VARIABLE_COUNTER++);
  this.type = type;
  this.data = data;
}

function escapeStr (str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function splitParts (str) {
  if (str.length === 0) {
    return []
  }

  var firstChar = str.charAt(0);
  var lastChar = str.charAt(str.length - 1);

  if (str.length > 1 &&
      firstChar === lastChar &&
      (firstChar === '"' || firstChar === "'")) {
    return ['"' + escapeStr(str.substr(1, str.length - 2)) + '"']
  }

  var parts = /\[(false|true|null|\d+|'[^']*'|"[^"]*")\]/.exec(str);
  if (parts) {
    return (
      splitParts(str.substr(0, parts.index))
      .concat(splitParts(parts[1]))
      .concat(splitParts(str.substr(parts.index + parts[0].length)))
    )
  }

  var subparts = str.split('.');
  if (subparts.length === 1) {
    return ['"' + escapeStr(str) + '"']
  }

  var result = [];
  for (var i = 0; i < subparts.length; ++i) {
    result = result.concat(splitParts(subparts[i]));
  }
  return result
}

function toAccessorString (str) {
  return '[' + splitParts(str).join('][') + ']'
}

function defineDynamic (type, data) {
  return new DynamicVariable(type, toAccessorString(data + ''))
}

function isDynamic (x) {
  return (typeof x === 'function' && !x._reglType) ||
         x instanceof DynamicVariable
}

function unbox (x, path) {
  if (typeof x === 'function') {
    return new DynamicVariable(DYN_FUNC, x)
  }
  return x
}

var dynamic = {
  DynamicVariable: DynamicVariable,
  define: defineDynamic,
  isDynamic: isDynamic,
  unbox: unbox,
  accessor: toAccessorString
};

/* globals requestAnimationFrame, cancelAnimationFrame */
var raf = {
  next: typeof requestAnimationFrame === 'function'
    ? function (cb) { return requestAnimationFrame(cb) }
    : function (cb) { return setTimeout(cb, 16) },
  cancel: typeof cancelAnimationFrame === 'function'
    ? function (raf) { return cancelAnimationFrame(raf) }
    : clearTimeout
};

/* globals performance */
var clock = (typeof performance !== 'undefined' && performance.now)
  ? function () { return performance.now() }
  : function () { return +(new Date()) };

function createStringStore () {
  var stringIds = {'': 0};
  var stringValues = [''];
  return {
    id: function (str) {
      var result = stringIds[str];
      if (result) {
        return result
      }
      result = stringIds[str] = stringValues.length;
      stringValues.push(str);
      return result
    },

    str: function (id) {
      return stringValues[id]
    }
  }
}

// Context and canvas creation helper functions
function createCanvas (element, onDone, pixelRatio) {
  var canvas = document.createElement('canvas');
  extend(canvas.style, {
    border: 0,
    margin: 0,
    padding: 0,
    top: 0,
    left: 0
  });
  element.appendChild(canvas);

  if (element === document.body) {
    canvas.style.position = 'absolute';
    extend(element.style, {
      margin: 0,
      padding: 0
    });
  }

  function resize () {
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (element !== document.body) {
      var bounds = element.getBoundingClientRect();
      w = bounds.right - bounds.left;
      h = bounds.bottom - bounds.top;
    }
    canvas.width = pixelRatio * w;
    canvas.height = pixelRatio * h;
    extend(canvas.style, {
      width: w + 'px',
      height: h + 'px'
    });
  }

  window.addEventListener('resize', resize, false);

  function onDestroy () {
    window.removeEventListener('resize', resize);
    element.removeChild(canvas);
  }

  resize();

  return {
    canvas: canvas,
    onDestroy: onDestroy
  }
}

function createContext (canvas, contexAttributes) {
  function get (name) {
    try {
      return canvas.getContext(name, contexAttributes)
    } catch (e) {
      return null
    }
  }
  return (
    get('webgl') ||
    get('experimental-webgl') ||
    get('webgl-experimental')
  )
}

function isHTMLElement (obj) {
  return (
    typeof obj.nodeName === 'string' &&
    typeof obj.appendChild === 'function' &&
    typeof obj.getBoundingClientRect === 'function'
  )
}

function isWebGLContext (obj) {
  return (
    typeof obj.drawArrays === 'function' ||
    typeof obj.drawElements === 'function'
  )
}

function parseExtensions (input) {
  if (typeof input === 'string') {
    return input.split()
  }
  check$1(Array.isArray(input), 'invalid extension array');
  return input
}

function getElement (desc) {
  if (typeof desc === 'string') {
    check$1(typeof document !== 'undefined', 'not supported outside of DOM');
    return document.querySelector(desc)
  }
  return desc
}

function parseArgs (args_) {
  var args = args_ || {};
  var element, container, canvas, gl;
  var contextAttributes = {};
  var extensions = [];
  var optionalExtensions = [];
  var pixelRatio = (typeof window === 'undefined' ? 1 : window.devicePixelRatio);
  var profile = false;
  var onDone = function (err) {
    if (err) {
      check$1.raise(err);
    }
  };
  var onDestroy = function () {};
  if (typeof args === 'string') {
    check$1(
      typeof document !== 'undefined',
      'selector queries only supported in DOM enviroments');
    element = document.querySelector(args);
    check$1(element, 'invalid query string for element');
  } else if (typeof args === 'object') {
    if (isHTMLElement(args)) {
      element = args;
    } else if (isWebGLContext(args)) {
      gl = args;
      canvas = gl.canvas;
    } else {
      check$1.constructor(args);
      if ('gl' in args) {
        gl = args.gl;
      } else if ('canvas' in args) {
        canvas = getElement(args.canvas);
      } else if ('container' in args) {
        container = getElement(args.container);
      }
      if ('attributes' in args) {
        contextAttributes = args.attributes;
        check$1.type(contextAttributes, 'object', 'invalid context attributes');
      }
      if ('extensions' in args) {
        extensions = parseExtensions(args.extensions);
      }
      if ('optionalExtensions' in args) {
        optionalExtensions = parseExtensions(args.optionalExtensions);
      }
      if ('onDone' in args) {
        check$1.type(
          args.onDone, 'function',
          'invalid or missing onDone callback');
        onDone = args.onDone;
      }
      if ('profile' in args) {
        profile = !!args.profile;
      }
      if ('pixelRatio' in args) {
        pixelRatio = +args.pixelRatio;
        check$1(pixelRatio > 0, 'invalid pixel ratio');
      }
    }
  } else {
    check$1.raise('invalid arguments to regl');
  }

  if (element) {
    if (element.nodeName.toLowerCase() === 'canvas') {
      canvas = element;
    } else {
      container = element;
    }
  }

  if (!gl) {
    if (!canvas) {
      check$1(
        typeof document !== 'undefined',
        'must manually specify webgl context outside of DOM environments');
      var result = createCanvas(container || document.body, onDone, pixelRatio);
      if (!result) {
        return null
      }
      canvas = result.canvas;
      onDestroy = result.onDestroy;
    }
    gl = createContext(canvas, contextAttributes);
  }

  if (!gl) {
    onDestroy();
    onDone('webgl not supported, try upgrading your browser or graphics drivers http://get.webgl.org');
    return null
  }

  return {
    gl: gl,
    canvas: canvas,
    container: container,
    extensions: extensions,
    optionalExtensions: optionalExtensions,
    pixelRatio: pixelRatio,
    profile: profile,
    onDone: onDone,
    onDestroy: onDestroy
  }
}

function createExtensionCache (gl, config) {
  var extensions = {};

  function tryLoadExtension (name_) {
    check$1.type(name_, 'string', 'extension name must be string');
    var name = name_.toLowerCase();
    var ext;
    try {
      ext = extensions[name] = gl.getExtension(name);
    } catch (e) {}
    return !!ext
  }

  for (var i = 0; i < config.extensions.length; ++i) {
    var name = config.extensions[i];
    if (!tryLoadExtension(name)) {
      config.onDestroy();
      config.onDone('"' + name + '" extension is not supported by the current WebGL context, try upgrading your system or a different browser');
      return null
    }
  }

  config.optionalExtensions.forEach(tryLoadExtension);

  return {
    extensions: extensions,
    restore: function () {
      Object.keys(extensions).forEach(function (name) {
        if (!tryLoadExtension(name)) {
          throw new Error('(regl): error restoring extension ' + name)
        }
      });
    }
  }
}

var GL_SUBPIXEL_BITS = 0x0D50;
var GL_RED_BITS = 0x0D52;
var GL_GREEN_BITS = 0x0D53;
var GL_BLUE_BITS = 0x0D54;
var GL_ALPHA_BITS = 0x0D55;
var GL_DEPTH_BITS = 0x0D56;
var GL_STENCIL_BITS = 0x0D57;

var GL_ALIASED_POINT_SIZE_RANGE = 0x846D;
var GL_ALIASED_LINE_WIDTH_RANGE = 0x846E;

var GL_MAX_TEXTURE_SIZE = 0x0D33;
var GL_MAX_VIEWPORT_DIMS = 0x0D3A;
var GL_MAX_VERTEX_ATTRIBS = 0x8869;
var GL_MAX_VERTEX_UNIFORM_VECTORS = 0x8DFB;
var GL_MAX_VARYING_VECTORS = 0x8DFC;
var GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS = 0x8B4D;
var GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS = 0x8B4C;
var GL_MAX_TEXTURE_IMAGE_UNITS = 0x8872;
var GL_MAX_FRAGMENT_UNIFORM_VECTORS = 0x8DFD;
var GL_MAX_CUBE_MAP_TEXTURE_SIZE = 0x851C;
var GL_MAX_RENDERBUFFER_SIZE = 0x84E8;

var GL_VENDOR = 0x1F00;
var GL_RENDERER = 0x1F01;
var GL_VERSION = 0x1F02;
var GL_SHADING_LANGUAGE_VERSION = 0x8B8C;

var GL_MAX_TEXTURE_MAX_ANISOTROPY_EXT = 0x84FF;

var GL_MAX_COLOR_ATTACHMENTS_WEBGL = 0x8CDF;
var GL_MAX_DRAW_BUFFERS_WEBGL = 0x8824;

var wrapLimits = function (gl, extensions) {
  var maxAnisotropic = 1;
  if (extensions.ext_texture_filter_anisotropic) {
    maxAnisotropic = gl.getParameter(GL_MAX_TEXTURE_MAX_ANISOTROPY_EXT);
  }

  var maxDrawbuffers = 1;
  var maxColorAttachments = 1;
  if (extensions.webgl_draw_buffers) {
    maxDrawbuffers = gl.getParameter(GL_MAX_DRAW_BUFFERS_WEBGL);
    maxColorAttachments = gl.getParameter(GL_MAX_COLOR_ATTACHMENTS_WEBGL);
  }

  return {
    // drawing buffer bit depth
    colorBits: [
      gl.getParameter(GL_RED_BITS),
      gl.getParameter(GL_GREEN_BITS),
      gl.getParameter(GL_BLUE_BITS),
      gl.getParameter(GL_ALPHA_BITS)
    ],
    depthBits: gl.getParameter(GL_DEPTH_BITS),
    stencilBits: gl.getParameter(GL_STENCIL_BITS),
    subpixelBits: gl.getParameter(GL_SUBPIXEL_BITS),

    // supported extensions
    extensions: Object.keys(extensions).filter(function (ext) {
      return !!extensions[ext]
    }),

    // max aniso samples
    maxAnisotropic: maxAnisotropic,

    // max draw buffers
    maxDrawbuffers: maxDrawbuffers,
    maxColorAttachments: maxColorAttachments,

    // point and line size ranges
    pointSizeDims: gl.getParameter(GL_ALIASED_POINT_SIZE_RANGE),
    lineWidthDims: gl.getParameter(GL_ALIASED_LINE_WIDTH_RANGE),
    maxViewportDims: gl.getParameter(GL_MAX_VIEWPORT_DIMS),
    maxCombinedTextureUnits: gl.getParameter(GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS),
    maxCubeMapSize: gl.getParameter(GL_MAX_CUBE_MAP_TEXTURE_SIZE),
    maxRenderbufferSize: gl.getParameter(GL_MAX_RENDERBUFFER_SIZE),
    maxTextureUnits: gl.getParameter(GL_MAX_TEXTURE_IMAGE_UNITS),
    maxTextureSize: gl.getParameter(GL_MAX_TEXTURE_SIZE),
    maxAttributes: gl.getParameter(GL_MAX_VERTEX_ATTRIBS),
    maxVertexUniforms: gl.getParameter(GL_MAX_VERTEX_UNIFORM_VECTORS),
    maxVertexTextureUnits: gl.getParameter(GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS),
    maxVaryingVectors: gl.getParameter(GL_MAX_VARYING_VECTORS),
    maxFragmentUniforms: gl.getParameter(GL_MAX_FRAGMENT_UNIFORM_VECTORS),

    // vendor info
    glsl: gl.getParameter(GL_SHADING_LANGUAGE_VERSION),
    renderer: gl.getParameter(GL_RENDERER),
    vendor: gl.getParameter(GL_VENDOR),
    version: gl.getParameter(GL_VERSION)
  }
};

function isNDArrayLike (obj) {
  return (
    !!obj &&
    typeof obj === 'object' &&
    Array.isArray(obj.shape) &&
    Array.isArray(obj.stride) &&
    typeof obj.offset === 'number' &&
    obj.shape.length === obj.stride.length &&
    (Array.isArray(obj.data) ||
      isTypedArray(obj.data)))
}

var values = function (obj) {
  return Object.keys(obj).map(function (key) { return obj[key] })
};

function loop (n, f) {
  var result = Array(n);
  for (var i = 0; i < n; ++i) {
    result[i] = f(i);
  }
  return result
}

var GL_BYTE$1 = 5120;
var GL_UNSIGNED_BYTE$2 = 5121;
var GL_SHORT$1 = 5122;
var GL_UNSIGNED_SHORT$1 = 5123;
var GL_INT$1 = 5124;
var GL_UNSIGNED_INT$1 = 5125;
var GL_FLOAT$2 = 5126;

var bufferPool = loop(8, function () {
  return []
});

function nextPow16 (v) {
  for (var i = 16; i <= (1 << 28); i *= 16) {
    if (v <= i) {
      return i
    }
  }
  return 0
}

function log2 (v) {
  var r, shift;
  r = (v > 0xFFFF) << 4;
  v >>>= r;
  shift = (v > 0xFF) << 3;
  v >>>= shift; r |= shift;
  shift = (v > 0xF) << 2;
  v >>>= shift; r |= shift;
  shift = (v > 0x3) << 1;
  v >>>= shift; r |= shift;
  return r | (v >> 1)
}

function alloc (n) {
  var sz = nextPow16(n);
  var bin = bufferPool[log2(sz) >> 2];
  if (bin.length > 0) {
    return bin.pop()
  }
  return new ArrayBuffer(sz)
}

function free (buf) {
  bufferPool[log2(buf.byteLength) >> 2].push(buf);
}

function allocType (type, n) {
  var result = null;
  switch (type) {
    case GL_BYTE$1:
      result = new Int8Array(alloc(n), 0, n);
      break
    case GL_UNSIGNED_BYTE$2:
      result = new Uint8Array(alloc(n), 0, n);
      break
    case GL_SHORT$1:
      result = new Int16Array(alloc(2 * n), 0, n);
      break
    case GL_UNSIGNED_SHORT$1:
      result = new Uint16Array(alloc(2 * n), 0, n);
      break
    case GL_INT$1:
      result = new Int32Array(alloc(4 * n), 0, n);
      break
    case GL_UNSIGNED_INT$1:
      result = new Uint32Array(alloc(4 * n), 0, n);
      break
    case GL_FLOAT$2:
      result = new Float32Array(alloc(4 * n), 0, n);
      break
    default:
      return null
  }
  if (result.length !== n) {
    return result.subarray(0, n)
  }
  return result
}

function freeType (array) {
  free(array.buffer);
}

var pool = {
  alloc: alloc,
  free: free,
  allocType: allocType,
  freeType: freeType
};

var flattenUtils = {
  shape: arrayShape$1,
  flatten: flattenArray
};

function flatten1D (array, nx, out) {
  for (var i = 0; i < nx; ++i) {
    out[i] = array[i];
  }
}

function flatten2D (array, nx, ny, out) {
  var ptr = 0;
  for (var i = 0; i < nx; ++i) {
    var row = array[i];
    for (var j = 0; j < ny; ++j) {
      out[ptr++] = row[j];
    }
  }
}

function flatten3D (array, nx, ny, nz, out, ptr_) {
  var ptr = ptr_;
  for (var i = 0; i < nx; ++i) {
    var row = array[i];
    for (var j = 0; j < ny; ++j) {
      var col = row[j];
      for (var k = 0; k < nz; ++k) {
        out[ptr++] = col[k];
      }
    }
  }
}

function flattenRec (array, shape, level, out, ptr) {
  var stride = 1;
  for (var i = level + 1; i < shape.length; ++i) {
    stride *= shape[i];
  }
  var n = shape[level];
  if (shape.length - level === 4) {
    var nx = shape[level + 1];
    var ny = shape[level + 2];
    var nz = shape[level + 3];
    for (i = 0; i < n; ++i) {
      flatten3D(array[i], nx, ny, nz, out, ptr);
      ptr += stride;
    }
  } else {
    for (i = 0; i < n; ++i) {
      flattenRec(array[i], shape, level + 1, out, ptr);
      ptr += stride;
    }
  }
}

function flattenArray (array, shape, type, out_) {
  var sz = 1;
  if (shape.length) {
    for (var i = 0; i < shape.length; ++i) {
      sz *= shape[i];
    }
  } else {
    sz = 0;
  }
  var out = out_ || pool.allocType(type, sz);
  switch (shape.length) {
    case 0:
      break
    case 1:
      flatten1D(array, shape[0], out);
      break
    case 2:
      flatten2D(array, shape[0], shape[1], out);
      break
    case 3:
      flatten3D(array, shape[0], shape[1], shape[2], out, 0);
      break
    default:
      flattenRec(array, shape, 0, out, 0);
  }
  return out
}

function arrayShape$1 (array_) {
  var shape = [];
  for (var array = array_; array.length; array = array[0]) {
    shape.push(array.length);
  }
  return shape
}

var int8 = 5120;
var int16 = 5122;
var int32 = 5124;
var uint8 = 5121;
var uint16 = 5123;
var uint32 = 5125;
var float = 5126;
var float32 = 5126;
var glTypes = {
	int8: int8,
	int16: int16,
	int32: int32,
	uint8: uint8,
	uint16: uint16,
	uint32: uint32,
	float: float,
	float32: float32
};

var dynamic$1 = 35048;
var stream = 35040;
var usageTypes = {
	dynamic: dynamic$1,
	stream: stream,
	"static": 35044
};

var arrayFlatten = flattenUtils.flatten;
var arrayShape = flattenUtils.shape;

var GL_STATIC_DRAW = 0x88E4;
var GL_STREAM_DRAW = 0x88E0;

var GL_UNSIGNED_BYTE$1 = 5121;
var GL_FLOAT$1 = 5126;

var DTYPES_SIZES = [];
DTYPES_SIZES[5120] = 1; // int8
DTYPES_SIZES[5122] = 2; // int16
DTYPES_SIZES[5124] = 4; // int32
DTYPES_SIZES[5121] = 1; // uint8
DTYPES_SIZES[5123] = 2; // uint16
DTYPES_SIZES[5125] = 4; // uint32
DTYPES_SIZES[5126] = 4; // float32

function typedArrayCode (data) {
  return arrayTypes[Object.prototype.toString.call(data)] | 0
}

function copyArray (out, inp) {
  for (var i = 0; i < inp.length; ++i) {
    out[i] = inp[i];
  }
}

function transpose (
  result, data, shapeX, shapeY, strideX, strideY, offset) {
  var ptr = 0;
  for (var i = 0; i < shapeX; ++i) {
    for (var j = 0; j < shapeY; ++j) {
      result[ptr++] = data[strideX * i + strideY * j + offset];
    }
  }
}

function wrapBufferState (gl, stats, config, attributeState) {
  var bufferCount = 0;
  var bufferSet = {};

  function REGLBuffer (type) {
    this.id = bufferCount++;
    this.buffer = gl.createBuffer();
    this.type = type;
    this.usage = GL_STATIC_DRAW;
    this.byteLength = 0;
    this.dimension = 1;
    this.dtype = GL_UNSIGNED_BYTE$1;

    this.persistentData = null;

    if (config.profile) {
      this.stats = {size: 0};
    }
  }

  REGLBuffer.prototype.bind = function () {
    gl.bindBuffer(this.type, this.buffer);
  };

  REGLBuffer.prototype.destroy = function () {
    destroy(this);
  };

  var streamPool = [];

  function createStream (type, data) {
    var buffer = streamPool.pop();
    if (!buffer) {
      buffer = new REGLBuffer(type);
    }
    buffer.bind();
    initBufferFromData(buffer, data, GL_STREAM_DRAW, 0, 1, false);
    return buffer
  }

  function destroyStream (stream$$1) {
    streamPool.push(stream$$1);
  }

  function initBufferFromTypedArray (buffer, data, usage) {
    buffer.byteLength = data.byteLength;
    gl.bufferData(buffer.type, data, usage);
  }

  function initBufferFromData (buffer, data, usage, dtype, dimension, persist) {
    var shape;
    buffer.usage = usage;
    if (Array.isArray(data)) {
      buffer.dtype = dtype || GL_FLOAT$1;
      if (data.length > 0) {
        var flatData;
        if (Array.isArray(data[0])) {
          shape = arrayShape(data);
          var dim = 1;
          for (var i = 1; i < shape.length; ++i) {
            dim *= shape[i];
          }
          buffer.dimension = dim;
          flatData = arrayFlatten(data, shape, buffer.dtype);
          initBufferFromTypedArray(buffer, flatData, usage);
          if (persist) {
            buffer.persistentData = flatData;
          } else {
            pool.freeType(flatData);
          }
        } else if (typeof data[0] === 'number') {
          buffer.dimension = dimension;
          var typedData = pool.allocType(buffer.dtype, data.length);
          copyArray(typedData, data);
          initBufferFromTypedArray(buffer, typedData, usage);
          if (persist) {
            buffer.persistentData = typedData;
          } else {
            pool.freeType(typedData);
          }
        } else if (isTypedArray(data[0])) {
          buffer.dimension = data[0].length;
          buffer.dtype = dtype || typedArrayCode(data[0]) || GL_FLOAT$1;
          flatData = arrayFlatten(
            data,
            [data.length, data[0].length],
            buffer.dtype);
          initBufferFromTypedArray(buffer, flatData, usage);
          if (persist) {
            buffer.persistentData = flatData;
          } else {
            pool.freeType(flatData);
          }
        } else {
          check$1.raise('invalid buffer data');
        }
      }
    } else if (isTypedArray(data)) {
      buffer.dtype = dtype || typedArrayCode(data);
      buffer.dimension = dimension;
      initBufferFromTypedArray(buffer, data, usage);
      if (persist) {
        buffer.persistentData = new Uint8Array(new Uint8Array(data.buffer));
      }
    } else if (isNDArrayLike(data)) {
      shape = data.shape;
      var stride = data.stride;
      var offset = data.offset;

      var shapeX = 0;
      var shapeY = 0;
      var strideX = 0;
      var strideY = 0;
      if (shape.length === 1) {
        shapeX = shape[0];
        shapeY = 1;
        strideX = stride[0];
        strideY = 0;
      } else if (shape.length === 2) {
        shapeX = shape[0];
        shapeY = shape[1];
        strideX = stride[0];
        strideY = stride[1];
      } else {
        check$1.raise('invalid shape');
      }

      buffer.dtype = dtype || typedArrayCode(data.data) || GL_FLOAT$1;
      buffer.dimension = shapeY;

      var transposeData = pool.allocType(buffer.dtype, shapeX * shapeY);
      transpose(transposeData,
        data.data,
        shapeX, shapeY,
        strideX, strideY,
        offset);
      initBufferFromTypedArray(buffer, transposeData, usage);
      if (persist) {
        buffer.persistentData = transposeData;
      } else {
        pool.freeType(transposeData);
      }
    } else {
      check$1.raise('invalid buffer data');
    }
  }

  function destroy (buffer) {
    stats.bufferCount--;

    var handle = buffer.buffer;
    check$1(handle, 'buffer must not be deleted already');

    // fix dangling enabled vertex attrib arrays
    for (var i = 0; i < attributeState.state.length; ++i) {
      var binding = attributeState.state[i];
      if (binding.buffer === buffer) {
        gl.disableVertexAttribArray(i);
        binding.buffer = null;
      }
    }

    gl.deleteBuffer(handle);
    buffer.buffer = null;
    delete bufferSet[buffer.id];
  }

  function createBuffer (options, type, deferInit, persistent) {
    stats.bufferCount++;

    var buffer = new REGLBuffer(type);
    bufferSet[buffer.id] = buffer;

    function reglBuffer (options) {
      var usage = GL_STATIC_DRAW;
      var data = null;
      var byteLength = 0;
      var dtype = 0;
      var dimension = 1;
      if (Array.isArray(options) ||
          isTypedArray(options) ||
          isNDArrayLike(options)) {
        data = options;
      } else if (typeof options === 'number') {
        byteLength = options | 0;
      } else if (options) {
        check$1.type(
          options, 'object',
          'buffer arguments must be an object, a number or an array');

        if ('data' in options) {
          check$1(
            data === null ||
            Array.isArray(data) ||
            isTypedArray(data) ||
            isNDArrayLike(data),
            'invalid data for buffer');
          data = options.data;
        }

        if ('usage' in options) {
          check$1.parameter(options.usage, usageTypes, 'invalid buffer usage');
          usage = usageTypes[options.usage];
        }

        if ('type' in options) {
          check$1.parameter(options.type, glTypes, 'invalid buffer type');
          dtype = glTypes[options.type];
        }

        if ('dimension' in options) {
          check$1.type(options.dimension, 'number', 'invalid dimension');
          dimension = options.dimension | 0;
        }

        if ('length' in options) {
          check$1.nni(byteLength, 'buffer length must be a nonnegative integer');
          byteLength = options.length | 0;
        }
      }

      buffer.bind();
      if (!data) {
        gl.bufferData(buffer.type, byteLength, usage);
        buffer.dtype = dtype || GL_UNSIGNED_BYTE$1;
        buffer.usage = usage;
        buffer.dimension = dimension;
        buffer.byteLength = byteLength;
      } else {
        initBufferFromData(buffer, data, usage, dtype, dimension, persistent);
      }

      if (config.profile) {
        buffer.stats.size = buffer.byteLength * DTYPES_SIZES[buffer.dtype];
      }

      return reglBuffer
    }

    function setSubData (data, offset) {
      check$1(offset + data.byteLength <= buffer.byteLength,
        'invalid buffer subdata call, buffer is too small. ' + ' Can\'t write data of size ' + data.byteLength + ' starting from offset ' + offset + ' to a buffer of size ' + buffer.byteLength);

      gl.bufferSubData(buffer.type, offset, data);
    }

    function subdata (data, offset_) {
      var offset = (offset_ || 0) | 0;
      var shape;
      buffer.bind();
      if (Array.isArray(data)) {
        if (data.length > 0) {
          if (typeof data[0] === 'number') {
            var converted = pool.allocType(buffer.dtype, data.length);
            copyArray(converted, data);
            setSubData(converted, offset);
            pool.freeType(converted);
          } else if (Array.isArray(data[0]) || isTypedArray(data[0])) {
            shape = arrayShape(data);
            var flatData = arrayFlatten(data, shape, buffer.dtype);
            setSubData(flatData, offset);
            pool.freeType(flatData);
          } else {
            check$1.raise('invalid buffer data');
          }
        }
      } else if (isTypedArray(data)) {
        setSubData(data, offset);
      } else if (isNDArrayLike(data)) {
        shape = data.shape;
        var stride = data.stride;

        var shapeX = 0;
        var shapeY = 0;
        var strideX = 0;
        var strideY = 0;
        if (shape.length === 1) {
          shapeX = shape[0];
          shapeY = 1;
          strideX = stride[0];
          strideY = 0;
        } else if (shape.length === 2) {
          shapeX = shape[0];
          shapeY = shape[1];
          strideX = stride[0];
          strideY = stride[1];
        } else {
          check$1.raise('invalid shape');
        }
        var dtype = Array.isArray(data.data)
          ? buffer.dtype
          : typedArrayCode(data.data);

        var transposeData = pool.allocType(dtype, shapeX * shapeY);
        transpose(transposeData,
          data.data,
          shapeX, shapeY,
          strideX, strideY,
          data.offset);
        setSubData(transposeData, offset);
        pool.freeType(transposeData);
      } else {
        check$1.raise('invalid data for buffer subdata');
      }
      return reglBuffer
    }

    if (!deferInit) {
      reglBuffer(options);
    }

    reglBuffer._reglType = 'buffer';
    reglBuffer._buffer = buffer;
    reglBuffer.subdata = subdata;
    if (config.profile) {
      reglBuffer.stats = buffer.stats;
    }
    reglBuffer.destroy = function () { destroy(buffer); };

    return reglBuffer
  }

  function restoreBuffers () {
    values(bufferSet).forEach(function (buffer) {
      buffer.buffer = gl.createBuffer();
      gl.bindBuffer(buffer.type, buffer.buffer);
      gl.bufferData(
        buffer.type, buffer.persistentData || buffer.byteLength, buffer.usage);
    });
  }

  if (config.profile) {
    stats.getTotalBufferSize = function () {
      var total = 0;
      // TODO: Right now, the streams are not part of the total count.
      Object.keys(bufferSet).forEach(function (key) {
        total += bufferSet[key].stats.size;
      });
      return total
    };
  }

  return {
    create: createBuffer,

    createStream: createStream,
    destroyStream: destroyStream,

    clear: function () {
      values(bufferSet).forEach(destroy);
      streamPool.forEach(destroy);
    },

    getBuffer: function (wrapper) {
      if (wrapper && wrapper._buffer instanceof REGLBuffer) {
        return wrapper._buffer
      }
      return null
    },

    restore: restoreBuffers,

    _initBuffer: initBufferFromData
  }
}

var points = 0;
var point = 0;
var lines = 1;
var line = 1;
var triangles = 4;
var triangle = 4;
var primTypes = {
	points: points,
	point: point,
	lines: lines,
	line: line,
	triangles: triangles,
	triangle: triangle,
	"line loop": 2,
	"line strip": 3,
	"triangle strip": 5,
	"triangle fan": 6
};

var GL_POINTS = 0;
var GL_LINES = 1;
var GL_TRIANGLES = 4;

var GL_BYTE$2 = 5120;
var GL_UNSIGNED_BYTE$3 = 5121;
var GL_SHORT$2 = 5122;
var GL_UNSIGNED_SHORT$2 = 5123;
var GL_INT$2 = 5124;
var GL_UNSIGNED_INT$2 = 5125;

var GL_ELEMENT_ARRAY_BUFFER = 34963;

var GL_STREAM_DRAW$1 = 0x88E0;
var GL_STATIC_DRAW$1 = 0x88E4;

function wrapElementsState (gl, extensions, bufferState, stats) {
  var elementSet = {};
  var elementCount = 0;

  var elementTypes = {
    'uint8': GL_UNSIGNED_BYTE$3,
    'uint16': GL_UNSIGNED_SHORT$2
  };

  if (extensions.oes_element_index_uint) {
    elementTypes.uint32 = GL_UNSIGNED_INT$2;
  }

  function REGLElementBuffer (buffer) {
    this.id = elementCount++;
    elementSet[this.id] = this;
    this.buffer = buffer;
    this.primType = GL_TRIANGLES;
    this.vertCount = 0;
    this.type = 0;
  }

  REGLElementBuffer.prototype.bind = function () {
    this.buffer.bind();
  };

  var bufferPool = [];

  function createElementStream (data) {
    var result = bufferPool.pop();
    if (!result) {
      result = new REGLElementBuffer(bufferState.create(
        null,
        GL_ELEMENT_ARRAY_BUFFER,
        true,
        false)._buffer);
    }
    initElements(result, data, GL_STREAM_DRAW$1, -1, -1, 0, 0);
    return result
  }

  function destroyElementStream (elements) {
    bufferPool.push(elements);
  }

  function initElements (
    elements,
    data,
    usage,
    prim,
    count,
    byteLength,
    type) {
    elements.buffer.bind();
    if (data) {
      var predictedType = type;
      if (!type && (
          !isTypedArray(data) ||
         (isNDArrayLike(data) && !isTypedArray(data.data)))) {
        predictedType = extensions.oes_element_index_uint
          ? GL_UNSIGNED_INT$2
          : GL_UNSIGNED_SHORT$2;
      }
      bufferState._initBuffer(
        elements.buffer,
        data,
        usage,
        predictedType,
        3);
    } else {
      gl.bufferData(GL_ELEMENT_ARRAY_BUFFER, byteLength, usage);
      elements.buffer.dtype = dtype || GL_UNSIGNED_BYTE$3;
      elements.buffer.usage = usage;
      elements.buffer.dimension = 3;
      elements.buffer.byteLength = byteLength;
    }

    var dtype = type;
    if (!type) {
      switch (elements.buffer.dtype) {
        case GL_UNSIGNED_BYTE$3:
        case GL_BYTE$2:
          dtype = GL_UNSIGNED_BYTE$3;
          break

        case GL_UNSIGNED_SHORT$2:
        case GL_SHORT$2:
          dtype = GL_UNSIGNED_SHORT$2;
          break

        case GL_UNSIGNED_INT$2:
        case GL_INT$2:
          dtype = GL_UNSIGNED_INT$2;
          break

        default:
          check$1.raise('unsupported type for element array');
      }
      elements.buffer.dtype = dtype;
    }
    elements.type = dtype;

    // Check oes_element_index_uint extension
    check$1(
      dtype !== GL_UNSIGNED_INT$2 ||
      !!extensions.oes_element_index_uint,
      '32 bit element buffers not supported, enable oes_element_index_uint first');

    // try to guess default primitive type and arguments
    var vertCount = count;
    if (vertCount < 0) {
      vertCount = elements.buffer.byteLength;
      if (dtype === GL_UNSIGNED_SHORT$2) {
        vertCount >>= 1;
      } else if (dtype === GL_UNSIGNED_INT$2) {
        vertCount >>= 2;
      }
    }
    elements.vertCount = vertCount;

    // try to guess primitive type from cell dimension
    var primType = prim;
    if (prim < 0) {
      primType = GL_TRIANGLES;
      var dimension = elements.buffer.dimension;
      if (dimension === 1) { primType = GL_POINTS; }
      if (dimension === 2) { primType = GL_LINES; }
      if (dimension === 3) { primType = GL_TRIANGLES; }
    }
    elements.primType = primType;
  }

  function destroyElements (elements) {
    stats.elementsCount--;

    check$1(elements.buffer !== null, 'must not double destroy elements');
    delete elementSet[elements.id];
    elements.buffer.destroy();
    elements.buffer = null;
  }

  function createElements (options, persistent) {
    var buffer = bufferState.create(null, GL_ELEMENT_ARRAY_BUFFER, true);
    var elements = new REGLElementBuffer(buffer._buffer);
    stats.elementsCount++;

    function reglElements (options) {
      if (!options) {
        buffer();
        elements.primType = GL_TRIANGLES;
        elements.vertCount = 0;
        elements.type = GL_UNSIGNED_BYTE$3;
      } else if (typeof options === 'number') {
        buffer(options);
        elements.primType = GL_TRIANGLES;
        elements.vertCount = options | 0;
        elements.type = GL_UNSIGNED_BYTE$3;
      } else {
        var data = null;
        var usage = GL_STATIC_DRAW$1;
        var primType = -1;
        var vertCount = -1;
        var byteLength = 0;
        var dtype = 0;
        if (Array.isArray(options) ||
            isTypedArray(options) ||
            isNDArrayLike(options)) {
          data = options;
        } else {
          check$1.type(options, 'object', 'invalid arguments for elements');
          if ('data' in options) {
            data = options.data;
            check$1(
                Array.isArray(data) ||
                isTypedArray(data) ||
                isNDArrayLike(data),
                'invalid data for element buffer');
          }
          if ('usage' in options) {
            check$1.parameter(
              options.usage,
              usageTypes,
              'invalid element buffer usage');
            usage = usageTypes[options.usage];
          }
          if ('primitive' in options) {
            check$1.parameter(
              options.primitive,
              primTypes,
              'invalid element buffer primitive');
            primType = primTypes[options.primitive];
          }
          if ('count' in options) {
            check$1(
              typeof options.count === 'number' && options.count >= 0,
              'invalid vertex count for elements');
            vertCount = options.count | 0;
          }
          if ('type' in options) {
            check$1.parameter(
              options.type,
              elementTypes,
              'invalid buffer type');
            dtype = elementTypes[options.type];
          }
          if ('length' in options) {
            byteLength = options.length | 0;
          } else {
            byteLength = vertCount;
            if (dtype === GL_UNSIGNED_SHORT$2 || dtype === GL_SHORT$2) {
              byteLength *= 2;
            } else if (dtype === GL_UNSIGNED_INT$2 || dtype === GL_INT$2) {
              byteLength *= 4;
            }
          }
        }
        initElements(
          elements,
          data,
          usage,
          primType,
          vertCount,
          byteLength,
          dtype);
      }

      return reglElements
    }

    reglElements(options);

    reglElements._reglType = 'elements';
    reglElements._elements = elements;
    reglElements.subdata = function (data, offset) {
      buffer.subdata(data, offset);
      return reglElements
    };
    reglElements.destroy = function () {
      destroyElements(elements);
    };

    return reglElements
  }

  return {
    create: createElements,
    createStream: createElementStream,
    destroyStream: destroyElementStream,
    getElements: function (elements) {
      if (typeof elements === 'function' &&
          elements._elements instanceof REGLElementBuffer) {
        return elements._elements
      }
      return null
    },
    clear: function () {
      values(elementSet).forEach(destroyElements);
    }
  }
}

var FLOAT = new Float32Array(1);
var INT = new Uint32Array(FLOAT.buffer);

var GL_UNSIGNED_SHORT$4 = 5123;

function convertToHalfFloat (array) {
  var ushorts = pool.allocType(GL_UNSIGNED_SHORT$4, array.length);

  for (var i = 0; i < array.length; ++i) {
    if (isNaN(array[i])) {
      ushorts[i] = 0xffff;
    } else if (array[i] === Infinity) {
      ushorts[i] = 0x7c00;
    } else if (array[i] === -Infinity) {
      ushorts[i] = 0xfc00;
    } else {
      FLOAT[0] = array[i];
      var x = INT[0];

      var sgn = (x >>> 31) << 15;
      var exp = ((x << 1) >>> 24) - 127;
      var frac = (x >> 13) & ((1 << 10) - 1);

      if (exp < -24) {
        // round non-representable denormals to 0
        ushorts[i] = sgn;
      } else if (exp < -14) {
        // handle denormals
        var s = -14 - exp;
        ushorts[i] = sgn + ((frac + (1 << 10)) >> s);
      } else if (exp > 15) {
        // round overflow to +/- Infinity
        ushorts[i] = sgn + 0x7c00;
      } else {
        // otherwise convert directly
        ushorts[i] = sgn + ((exp + 15) << 10) + frac;
      }
    }
  }

  return ushorts
}

function isArrayLike (s) {
  return Array.isArray(s) || isTypedArray(s)
}

var GL_COMPRESSED_TEXTURE_FORMATS = 0x86A3;

var GL_TEXTURE_2D = 0x0DE1;
var GL_TEXTURE_CUBE_MAP = 0x8513;
var GL_TEXTURE_CUBE_MAP_POSITIVE_X = 0x8515;

var GL_RGBA = 0x1908;
var GL_ALPHA = 0x1906;
var GL_RGB = 0x1907;
var GL_LUMINANCE = 0x1909;
var GL_LUMINANCE_ALPHA = 0x190A;

var GL_RGBA4 = 0x8056;
var GL_RGB5_A1 = 0x8057;
var GL_RGB565 = 0x8D62;

var GL_UNSIGNED_SHORT_4_4_4_4$1 = 0x8033;
var GL_UNSIGNED_SHORT_5_5_5_1$1 = 0x8034;
var GL_UNSIGNED_SHORT_5_6_5$1 = 0x8363;
var GL_UNSIGNED_INT_24_8_WEBGL$1 = 0x84FA;

var GL_DEPTH_COMPONENT = 0x1902;
var GL_DEPTH_STENCIL = 0x84F9;

var GL_SRGB_EXT = 0x8C40;
var GL_SRGB_ALPHA_EXT = 0x8C42;

var GL_HALF_FLOAT_OES$1 = 0x8D61;

var GL_COMPRESSED_RGB_S3TC_DXT1_EXT = 0x83F0;
var GL_COMPRESSED_RGBA_S3TC_DXT1_EXT = 0x83F1;
var GL_COMPRESSED_RGBA_S3TC_DXT3_EXT = 0x83F2;
var GL_COMPRESSED_RGBA_S3TC_DXT5_EXT = 0x83F3;

var GL_COMPRESSED_RGB_ATC_WEBGL = 0x8C92;
var GL_COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL = 0x8C93;
var GL_COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL = 0x87EE;

var GL_COMPRESSED_RGB_PVRTC_4BPPV1_IMG = 0x8C00;
var GL_COMPRESSED_RGB_PVRTC_2BPPV1_IMG = 0x8C01;
var GL_COMPRESSED_RGBA_PVRTC_4BPPV1_IMG = 0x8C02;
var GL_COMPRESSED_RGBA_PVRTC_2BPPV1_IMG = 0x8C03;

var GL_COMPRESSED_RGB_ETC1_WEBGL = 0x8D64;

var GL_UNSIGNED_BYTE$4 = 0x1401;
var GL_UNSIGNED_SHORT$3 = 0x1403;
var GL_UNSIGNED_INT$3 = 0x1405;
var GL_FLOAT$3 = 0x1406;

var GL_TEXTURE_WRAP_S = 0x2802;
var GL_TEXTURE_WRAP_T = 0x2803;

var GL_REPEAT = 0x2901;
var GL_CLAMP_TO_EDGE$1 = 0x812F;
var GL_MIRRORED_REPEAT = 0x8370;

var GL_TEXTURE_MAG_FILTER = 0x2800;
var GL_TEXTURE_MIN_FILTER = 0x2801;

var GL_NEAREST$1 = 0x2600;
var GL_LINEAR = 0x2601;
var GL_NEAREST_MIPMAP_NEAREST$1 = 0x2700;
var GL_LINEAR_MIPMAP_NEAREST$1 = 0x2701;
var GL_NEAREST_MIPMAP_LINEAR$1 = 0x2702;
var GL_LINEAR_MIPMAP_LINEAR$1 = 0x2703;

var GL_GENERATE_MIPMAP_HINT = 0x8192;
var GL_DONT_CARE = 0x1100;
var GL_FASTEST = 0x1101;
var GL_NICEST = 0x1102;

var GL_TEXTURE_MAX_ANISOTROPY_EXT = 0x84FE;

var GL_UNPACK_ALIGNMENT = 0x0CF5;
var GL_UNPACK_FLIP_Y_WEBGL = 0x9240;
var GL_UNPACK_PREMULTIPLY_ALPHA_WEBGL = 0x9241;
var GL_UNPACK_COLORSPACE_CONVERSION_WEBGL = 0x9243;

var GL_BROWSER_DEFAULT_WEBGL = 0x9244;

var GL_TEXTURE0 = 0x84C0;

var MIPMAP_FILTERS = [
  GL_NEAREST_MIPMAP_NEAREST$1,
  GL_NEAREST_MIPMAP_LINEAR$1,
  GL_LINEAR_MIPMAP_NEAREST$1,
  GL_LINEAR_MIPMAP_LINEAR$1
];

var CHANNELS_FORMAT = [
  0,
  GL_LUMINANCE,
  GL_LUMINANCE_ALPHA,
  GL_RGB,
  GL_RGBA
];

var FORMAT_CHANNELS = {};
FORMAT_CHANNELS[GL_LUMINANCE] =
FORMAT_CHANNELS[GL_ALPHA] =
FORMAT_CHANNELS[GL_DEPTH_COMPONENT] = 1;
FORMAT_CHANNELS[GL_DEPTH_STENCIL] =
FORMAT_CHANNELS[GL_LUMINANCE_ALPHA] = 2;
FORMAT_CHANNELS[GL_RGB] =
FORMAT_CHANNELS[GL_SRGB_EXT] = 3;
FORMAT_CHANNELS[GL_RGBA] =
FORMAT_CHANNELS[GL_SRGB_ALPHA_EXT] = 4;

function objectName (str) {
  return '[object ' + str + ']'
}

var CANVAS_CLASS = objectName('HTMLCanvasElement');
var CONTEXT2D_CLASS = objectName('CanvasRenderingContext2D');
var IMAGE_CLASS = objectName('HTMLImageElement');
var VIDEO_CLASS = objectName('HTMLVideoElement');

var PIXEL_CLASSES = Object.keys(arrayTypes).concat([
  CANVAS_CLASS,
  CONTEXT2D_CLASS,
  IMAGE_CLASS,
  VIDEO_CLASS
]);

// for every texture type, store
// the size in bytes.
var TYPE_SIZES = [];
TYPE_SIZES[GL_UNSIGNED_BYTE$4] = 1;
TYPE_SIZES[GL_FLOAT$3] = 4;
TYPE_SIZES[GL_HALF_FLOAT_OES$1] = 2;

TYPE_SIZES[GL_UNSIGNED_SHORT$3] = 2;
TYPE_SIZES[GL_UNSIGNED_INT$3] = 4;

var FORMAT_SIZES_SPECIAL = [];
FORMAT_SIZES_SPECIAL[GL_RGBA4] = 2;
FORMAT_SIZES_SPECIAL[GL_RGB5_A1] = 2;
FORMAT_SIZES_SPECIAL[GL_RGB565] = 2;
FORMAT_SIZES_SPECIAL[GL_DEPTH_STENCIL] = 4;

FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_S3TC_DXT1_EXT] = 0.5;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_S3TC_DXT1_EXT] = 0.5;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_S3TC_DXT3_EXT] = 1;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_S3TC_DXT5_EXT] = 1;

FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_ATC_WEBGL] = 0.5;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL] = 1;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL] = 1;

FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_PVRTC_4BPPV1_IMG] = 0.5;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_PVRTC_2BPPV1_IMG] = 0.25;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_PVRTC_4BPPV1_IMG] = 0.5;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_PVRTC_2BPPV1_IMG] = 0.25;

FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_ETC1_WEBGL] = 0.5;

function isNumericArray (arr) {
  return (
    Array.isArray(arr) &&
    (arr.length === 0 ||
    typeof arr[0] === 'number'))
}

function isRectArray (arr) {
  if (!Array.isArray(arr)) {
    return false
  }
  var width = arr.length;
  if (width === 0 || !isArrayLike(arr[0])) {
    return false
  }
  return true
}

function classString (x) {
  return Object.prototype.toString.call(x)
}

function isCanvasElement (object) {
  return classString(object) === CANVAS_CLASS
}

function isContext2D (object) {
  return classString(object) === CONTEXT2D_CLASS
}

function isImageElement (object) {
  return classString(object) === IMAGE_CLASS
}

function isVideoElement (object) {
  return classString(object) === VIDEO_CLASS
}

function isPixelData (object) {
  if (!object) {
    return false
  }
  var className = classString(object);
  if (PIXEL_CLASSES.indexOf(className) >= 0) {
    return true
  }
  return (
    isNumericArray(object) ||
    isRectArray(object) ||
    isNDArrayLike(object))
}

function typedArrayCode$1 (data) {
  return arrayTypes[Object.prototype.toString.call(data)] | 0
}

function convertData (result, data) {
  var n = data.length;
  switch (result.type) {
    case GL_UNSIGNED_BYTE$4:
    case GL_UNSIGNED_SHORT$3:
    case GL_UNSIGNED_INT$3:
    case GL_FLOAT$3:
      var converted = pool.allocType(result.type, n);
      converted.set(data);
      result.data = converted;
      break

    case GL_HALF_FLOAT_OES$1:
      result.data = convertToHalfFloat(data);
      break

    default:
      check$1.raise('unsupported texture type, must specify a typed array');
  }
}

function preConvert (image, n) {
  return pool.allocType(
    image.type === GL_HALF_FLOAT_OES$1
      ? GL_FLOAT$3
      : image.type, n)
}

function postConvert (image, data) {
  if (image.type === GL_HALF_FLOAT_OES$1) {
    image.data = convertToHalfFloat(data);
    pool.freeType(data);
  } else {
    image.data = data;
  }
}

function transposeData (image, array, strideX, strideY, strideC, offset) {
  var w = image.width;
  var h = image.height;
  var c = image.channels;
  var n = w * h * c;
  var data = preConvert(image, n);

  var p = 0;
  for (var i = 0; i < h; ++i) {
    for (var j = 0; j < w; ++j) {
      for (var k = 0; k < c; ++k) {
        data[p++] = array[strideX * j + strideY * i + strideC * k + offset];
      }
    }
  }

  postConvert(image, data);
}

function getTextureSize (format, type, width, height, isMipmap, isCube) {
  var s;
  if (typeof FORMAT_SIZES_SPECIAL[format] !== 'undefined') {
    // we have a special array for dealing with weird color formats such as RGB5A1
    s = FORMAT_SIZES_SPECIAL[format];
  } else {
    s = FORMAT_CHANNELS[format] * TYPE_SIZES[type];
  }

  if (isCube) {
    s *= 6;
  }

  if (isMipmap) {
    // compute the total size of all the mipmaps.
    var total = 0;

    var w = width;
    while (w >= 1) {
      // we can only use mipmaps on a square image,
      // so we can simply use the width and ignore the height:
      total += s * w * w;
      w /= 2;
    }
    return total
  } else {
    return s * width * height
  }
}

function createTextureSet (
  gl, extensions, limits, reglPoll, contextState, stats, config) {
  // -------------------------------------------------------
  // Initialize constants and parameter tables here
  // -------------------------------------------------------
  var mipmapHint = {
    "don't care": GL_DONT_CARE,
    'dont care': GL_DONT_CARE,
    'nice': GL_NICEST,
    'fast': GL_FASTEST
  };

  var wrapModes = {
    'repeat': GL_REPEAT,
    'clamp': GL_CLAMP_TO_EDGE$1,
    'mirror': GL_MIRRORED_REPEAT
  };

  var magFilters = {
    'nearest': GL_NEAREST$1,
    'linear': GL_LINEAR
  };

  var minFilters = extend({
    'mipmap': GL_LINEAR_MIPMAP_LINEAR$1,
    'nearest mipmap nearest': GL_NEAREST_MIPMAP_NEAREST$1,
    'linear mipmap nearest': GL_LINEAR_MIPMAP_NEAREST$1,
    'nearest mipmap linear': GL_NEAREST_MIPMAP_LINEAR$1,
    'linear mipmap linear': GL_LINEAR_MIPMAP_LINEAR$1
  }, magFilters);

  var colorSpace = {
    'none': 0,
    'browser': GL_BROWSER_DEFAULT_WEBGL
  };

  var textureTypes = {
    'uint8': GL_UNSIGNED_BYTE$4,
    'rgba4': GL_UNSIGNED_SHORT_4_4_4_4$1,
    'rgb565': GL_UNSIGNED_SHORT_5_6_5$1,
    'rgb5 a1': GL_UNSIGNED_SHORT_5_5_5_1$1
  };

  var textureFormats = {
    'alpha': GL_ALPHA,
    'luminance': GL_LUMINANCE,
    'luminance alpha': GL_LUMINANCE_ALPHA,
    'rgb': GL_RGB,
    'rgba': GL_RGBA,
    'rgba4': GL_RGBA4,
    'rgb5 a1': GL_RGB5_A1,
    'rgb565': GL_RGB565
  };

  var compressedTextureFormats = {};

  if (extensions.ext_srgb) {
    textureFormats.srgb = GL_SRGB_EXT;
    textureFormats.srgba = GL_SRGB_ALPHA_EXT;
  }

  if (extensions.oes_texture_float) {
    textureTypes.float32 = textureTypes.float = GL_FLOAT$3;
  }

  if (extensions.oes_texture_half_float) {
    textureTypes['float16'] = textureTypes['half float'] = GL_HALF_FLOAT_OES$1;
  }

  if (extensions.webgl_depth_texture) {
    extend(textureFormats, {
      'depth': GL_DEPTH_COMPONENT,
      'depth stencil': GL_DEPTH_STENCIL
    });

    extend(textureTypes, {
      'uint16': GL_UNSIGNED_SHORT$3,
      'uint32': GL_UNSIGNED_INT$3,
      'depth stencil': GL_UNSIGNED_INT_24_8_WEBGL$1
    });
  }

  if (extensions.webgl_compressed_texture_s3tc) {
    extend(compressedTextureFormats, {
      'rgb s3tc dxt1': GL_COMPRESSED_RGB_S3TC_DXT1_EXT,
      'rgba s3tc dxt1': GL_COMPRESSED_RGBA_S3TC_DXT1_EXT,
      'rgba s3tc dxt3': GL_COMPRESSED_RGBA_S3TC_DXT3_EXT,
      'rgba s3tc dxt5': GL_COMPRESSED_RGBA_S3TC_DXT5_EXT
    });
  }

  if (extensions.webgl_compressed_texture_atc) {
    extend(compressedTextureFormats, {
      'rgb atc': GL_COMPRESSED_RGB_ATC_WEBGL,
      'rgba atc explicit alpha': GL_COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL,
      'rgba atc interpolated alpha': GL_COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL
    });
  }

  if (extensions.webgl_compressed_texture_pvrtc) {
    extend(compressedTextureFormats, {
      'rgb pvrtc 4bppv1': GL_COMPRESSED_RGB_PVRTC_4BPPV1_IMG,
      'rgb pvrtc 2bppv1': GL_COMPRESSED_RGB_PVRTC_2BPPV1_IMG,
      'rgba pvrtc 4bppv1': GL_COMPRESSED_RGBA_PVRTC_4BPPV1_IMG,
      'rgba pvrtc 2bppv1': GL_COMPRESSED_RGBA_PVRTC_2BPPV1_IMG
    });
  }

  if (extensions.webgl_compressed_texture_etc1) {
    compressedTextureFormats['rgb etc1'] = GL_COMPRESSED_RGB_ETC1_WEBGL;
  }

  // Copy over all texture formats
  var supportedCompressedFormats = Array.prototype.slice.call(
    gl.getParameter(GL_COMPRESSED_TEXTURE_FORMATS));
  Object.keys(compressedTextureFormats).forEach(function (name) {
    var format = compressedTextureFormats[name];
    if (supportedCompressedFormats.indexOf(format) >= 0) {
      textureFormats[name] = format;
    }
  });

  var supportedFormats = Object.keys(textureFormats);
  limits.textureFormats = supportedFormats;

  // associate with every format string its
  // corresponding GL-value.
  var textureFormatsInvert = [];
  Object.keys(textureFormats).forEach(function (key) {
    var val = textureFormats[key];
    textureFormatsInvert[val] = key;
  });

  // associate with every type string its
  // corresponding GL-value.
  var textureTypesInvert = [];
  Object.keys(textureTypes).forEach(function (key) {
    var val = textureTypes[key];
    textureTypesInvert[val] = key;
  });

  var magFiltersInvert = [];
  Object.keys(magFilters).forEach(function (key) {
    var val = magFilters[key];
    magFiltersInvert[val] = key;
  });

  var minFiltersInvert = [];
  Object.keys(minFilters).forEach(function (key) {
    var val = minFilters[key];
    minFiltersInvert[val] = key;
  });

  var wrapModesInvert = [];
  Object.keys(wrapModes).forEach(function (key) {
    var val = wrapModes[key];
    wrapModesInvert[val] = key;
  });

  // colorFormats[] gives the format (channels) associated to an
  // internalformat
  var colorFormats = supportedFormats.reduce(function (color, key) {
    var glenum = textureFormats[key];
    if (glenum === GL_LUMINANCE ||
        glenum === GL_ALPHA ||
        glenum === GL_LUMINANCE ||
        glenum === GL_LUMINANCE_ALPHA ||
        glenum === GL_DEPTH_COMPONENT ||
        glenum === GL_DEPTH_STENCIL) {
      color[glenum] = glenum;
    } else if (glenum === GL_RGB5_A1 || key.indexOf('rgba') >= 0) {
      color[glenum] = GL_RGBA;
    } else {
      color[glenum] = GL_RGB;
    }
    return color
  }, {});

  function TexFlags () {
    // format info
    this.internalformat = GL_RGBA;
    this.format = GL_RGBA;
    this.type = GL_UNSIGNED_BYTE$4;
    this.compressed = false;

    // pixel storage
    this.premultiplyAlpha = false;
    this.flipY = false;
    this.unpackAlignment = 1;
    this.colorSpace = 0;

    // shape info
    this.width = 0;
    this.height = 0;
    this.channels = 0;
  }

  function copyFlags (result, other) {
    result.internalformat = other.internalformat;
    result.format = other.format;
    result.type = other.type;
    result.compressed = other.compressed;

    result.premultiplyAlpha = other.premultiplyAlpha;
    result.flipY = other.flipY;
    result.unpackAlignment = other.unpackAlignment;
    result.colorSpace = other.colorSpace;

    result.width = other.width;
    result.height = other.height;
    result.channels = other.channels;
  }

  function parseFlags (flags, options) {
    if (typeof options !== 'object' || !options) {
      return
    }

    if ('premultiplyAlpha' in options) {
      check$1.type(options.premultiplyAlpha, 'boolean',
        'invalid premultiplyAlpha');
      flags.premultiplyAlpha = options.premultiplyAlpha;
    }

    if ('flipY' in options) {
      check$1.type(options.flipY, 'boolean',
        'invalid texture flip');
      flags.flipY = options.flipY;
    }

    if ('alignment' in options) {
      check$1.oneOf(options.alignment, [1, 2, 4, 8],
        'invalid texture unpack alignment');
      flags.unpackAlignment = options.alignment;
    }

    if ('colorSpace' in options) {
      check$1.parameter(options.colorSpace, colorSpace,
        'invalid colorSpace');
      flags.colorSpace = colorSpace[options.colorSpace];
    }

    if ('type' in options) {
      var type = options.type;
      check$1(extensions.oes_texture_float ||
        !(type === 'float' || type === 'float32'),
        'you must enable the OES_texture_float extension in order to use floating point textures.');
      check$1(extensions.oes_texture_half_float ||
        !(type === 'half float' || type === 'float16'),
        'you must enable the OES_texture_half_float extension in order to use 16-bit floating point textures.');
      check$1(extensions.webgl_depth_texture ||
        !(type === 'uint16' || type === 'uint32' || type === 'depth stencil'),
        'you must enable the WEBGL_depth_texture extension in order to use depth/stencil textures.');
      check$1.parameter(type, textureTypes,
        'invalid texture type');
      flags.type = textureTypes[type];
    }

    var w = flags.width;
    var h = flags.height;
    var c = flags.channels;
    var hasChannels = false;
    if ('shape' in options) {
      check$1(Array.isArray(options.shape) && options.shape.length >= 2,
        'shape must be an array');
      w = options.shape[0];
      h = options.shape[1];
      if (options.shape.length === 3) {
        c = options.shape[2];
        check$1(c > 0 && c <= 4, 'invalid number of channels');
        hasChannels = true;
      }
      check$1(w >= 0 && w <= limits.maxTextureSize, 'invalid width');
      check$1(h >= 0 && h <= limits.maxTextureSize, 'invalid height');
    } else {
      if ('radius' in options) {
        w = h = options.radius;
        check$1(w >= 0 && w <= limits.maxTextureSize, 'invalid radius');
      }
      if ('width' in options) {
        w = options.width;
        check$1(w >= 0 && w <= limits.maxTextureSize, 'invalid width');
      }
      if ('height' in options) {
        h = options.height;
        check$1(h >= 0 && h <= limits.maxTextureSize, 'invalid height');
      }
      if ('channels' in options) {
        c = options.channels;
        check$1(c > 0 && c <= 4, 'invalid number of channels');
        hasChannels = true;
      }
    }
    flags.width = w | 0;
    flags.height = h | 0;
    flags.channels = c | 0;

    var hasFormat = false;
    if ('format' in options) {
      var formatStr = options.format;
      check$1(extensions.webgl_depth_texture ||
        !(formatStr === 'depth' || formatStr === 'depth stencil'),
        'you must enable the WEBGL_depth_texture extension in order to use depth/stencil textures.');
      check$1.parameter(formatStr, textureFormats,
        'invalid texture format');
      var internalformat = flags.internalformat = textureFormats[formatStr];
      flags.format = colorFormats[internalformat];
      if (formatStr in textureTypes) {
        if (!('type' in options)) {
          flags.type = textureTypes[formatStr];
        }
      }
      if (formatStr in compressedTextureFormats) {
        flags.compressed = true;
      }
      hasFormat = true;
    }

    // Reconcile channels and format
    if (!hasChannels && hasFormat) {
      flags.channels = FORMAT_CHANNELS[flags.format];
    } else if (hasChannels && !hasFormat) {
      if (flags.channels !== CHANNELS_FORMAT[flags.format]) {
        flags.format = flags.internalformat = CHANNELS_FORMAT[flags.channels];
      }
    } else if (hasFormat && hasChannels) {
      check$1(
        flags.channels === FORMAT_CHANNELS[flags.format],
        'number of channels inconsistent with specified format');
    }
  }

  function setFlags (flags) {
    gl.pixelStorei(GL_UNPACK_FLIP_Y_WEBGL, flags.flipY);
    gl.pixelStorei(GL_UNPACK_PREMULTIPLY_ALPHA_WEBGL, flags.premultiplyAlpha);
    gl.pixelStorei(GL_UNPACK_COLORSPACE_CONVERSION_WEBGL, flags.colorSpace);
    gl.pixelStorei(GL_UNPACK_ALIGNMENT, flags.unpackAlignment);
  }

  // -------------------------------------------------------
  // Tex image data
  // -------------------------------------------------------
  function TexImage () {
    TexFlags.call(this);

    this.xOffset = 0;
    this.yOffset = 0;

    // data
    this.data = null;
    this.needsFree = false;

    // html element
    this.element = null;

    // copyTexImage info
    this.needsCopy = false;
  }

  function parseImage (image, options) {
    var data = null;
    if (isPixelData(options)) {
      data = options;
    } else if (options) {
      check$1.type(options, 'object', 'invalid pixel data type');
      parseFlags(image, options);
      if ('x' in options) {
        image.xOffset = options.x | 0;
      }
      if ('y' in options) {
        image.yOffset = options.y | 0;
      }
      if (isPixelData(options.data)) {
        data = options.data;
      }
    }

    check$1(
      !image.compressed ||
      data instanceof Uint8Array,
      'compressed texture data must be stored in a uint8array');

    if (options.copy) {
      check$1(!data, 'can not specify copy and data field for the same texture');
      var viewW = contextState.viewportWidth;
      var viewH = contextState.viewportHeight;
      image.width = image.width || (viewW - image.xOffset);
      image.height = image.height || (viewH - image.yOffset);
      image.needsCopy = true;
      check$1(image.xOffset >= 0 && image.xOffset < viewW &&
            image.yOffset >= 0 && image.yOffset < viewH &&
            image.width > 0 && image.width <= viewW &&
            image.height > 0 && image.height <= viewH,
            'copy texture read out of bounds');
    } else if (!data) {
      image.width = image.width || 1;
      image.height = image.height || 1;
      image.channels = image.channels || 4;
    } else if (isTypedArray(data)) {
      image.channels = image.channels || 4;
      image.data = data;
      if (!('type' in options) && image.type === GL_UNSIGNED_BYTE$4) {
        image.type = typedArrayCode$1(data);
      }
    } else if (isNumericArray(data)) {
      image.channels = image.channels || 4;
      convertData(image, data);
      image.alignment = 1;
      image.needsFree = true;
    } else if (isNDArrayLike(data)) {
      var array = data.data;
      if (!Array.isArray(array) && image.type === GL_UNSIGNED_BYTE$4) {
        image.type = typedArrayCode$1(array);
      }
      var shape = data.shape;
      var stride = data.stride;
      var shapeX, shapeY, shapeC, strideX, strideY, strideC;
      if (shape.length === 3) {
        shapeC = shape[2];
        strideC = stride[2];
      } else {
        check$1(shape.length === 2, 'invalid ndarray pixel data, must be 2 or 3D');
        shapeC = 1;
        strideC = 1;
      }
      shapeX = shape[0];
      shapeY = shape[1];
      strideX = stride[0];
      strideY = stride[1];
      image.alignment = 1;
      image.width = shapeX;
      image.height = shapeY;
      image.channels = shapeC;
      image.format = image.internalformat = CHANNELS_FORMAT[shapeC];
      image.needsFree = true;
      transposeData(image, array, strideX, strideY, strideC, data.offset);
    } else if (isCanvasElement(data) || isContext2D(data)) {
      if (isCanvasElement(data)) {
        image.element = data;
      } else {
        image.element = data.canvas;
      }
      image.width = image.element.width;
      image.height = image.element.height;
      image.channels = 4;
    } else if (isImageElement(data)) {
      image.element = data;
      image.width = data.naturalWidth;
      image.height = data.naturalHeight;
      image.channels = 4;
    } else if (isVideoElement(data)) {
      image.element = data;
      image.width = data.videoWidth;
      image.height = data.videoHeight;
      image.channels = 4;
    } else if (isRectArray(data)) {
      var w = image.width || data[0].length;
      var h = image.height || data.length;
      var c = image.channels;
      if (isArrayLike(data[0][0])) {
        c = c || data[0][0].length;
      } else {
        c = c || 1;
      }
      var arrayShape = flattenUtils.shape(data);
      var n = 1;
      for (var dd = 0; dd < arrayShape.length; ++dd) {
        n *= arrayShape[dd];
      }
      var allocData = preConvert(image, n);
      flattenUtils.flatten(data, arrayShape, '', allocData);
      postConvert(image, allocData);
      image.alignment = 1;
      image.width = w;
      image.height = h;
      image.channels = c;
      image.format = image.internalformat = CHANNELS_FORMAT[c];
      image.needsFree = true;
    }

    if (image.type === GL_FLOAT$3) {
      check$1(limits.extensions.indexOf('oes_texture_float') >= 0,
        'oes_texture_float extension not enabled');
    } else if (image.type === GL_HALF_FLOAT_OES$1) {
      check$1(limits.extensions.indexOf('oes_texture_half_float') >= 0,
        'oes_texture_half_float extension not enabled');
    }

    // do compressed texture  validation here.
  }

  function setImage (info, target, miplevel) {
    var element = info.element;
    var data = info.data;
    var internalformat = info.internalformat;
    var format = info.format;
    var type = info.type;
    var width = info.width;
    var height = info.height;

    setFlags(info);

    if (element) {
      gl.texImage2D(target, miplevel, format, format, type, element);
    } else if (info.compressed) {
      gl.compressedTexImage2D(target, miplevel, internalformat, width, height, 0, data);
    } else if (info.needsCopy) {
      reglPoll();
      gl.copyTexImage2D(
        target, miplevel, format, info.xOffset, info.yOffset, width, height, 0);
    } else {
      gl.texImage2D(
        target, miplevel, format, width, height, 0, format, type, data);
    }
  }

  function setSubImage (info, target, x, y, miplevel) {
    var element = info.element;
    var data = info.data;
    var internalformat = info.internalformat;
    var format = info.format;
    var type = info.type;
    var width = info.width;
    var height = info.height;

    setFlags(info);

    if (element) {
      gl.texSubImage2D(
        target, miplevel, x, y, format, type, element);
    } else if (info.compressed) {
      gl.compressedTexSubImage2D(
        target, miplevel, x, y, internalformat, width, height, data);
    } else if (info.needsCopy) {
      reglPoll();
      gl.copyTexSubImage2D(
        target, miplevel, x, y, info.xOffset, info.yOffset, width, height);
    } else {
      gl.texSubImage2D(
        target, miplevel, x, y, width, height, format, type, data);
    }
  }

  // texImage pool
  var imagePool = [];

  function allocImage () {
    return imagePool.pop() || new TexImage()
  }

  function freeImage (image) {
    if (image.needsFree) {
      pool.freeType(image.data);
    }
    TexImage.call(image);
    imagePool.push(image);
  }

  // -------------------------------------------------------
  // Mip map
  // -------------------------------------------------------
  function MipMap () {
    TexFlags.call(this);

    this.genMipmaps = false;
    this.mipmapHint = GL_DONT_CARE;
    this.mipmask = 0;
    this.images = Array(16);
  }

  function parseMipMapFromShape (mipmap, width, height) {
    var img = mipmap.images[0] = allocImage();
    mipmap.mipmask = 1;
    img.width = mipmap.width = width;
    img.height = mipmap.height = height;
    img.channels = mipmap.channels = 4;
  }

  function parseMipMapFromObject (mipmap, options) {
    var imgData = null;
    if (isPixelData(options)) {
      imgData = mipmap.images[0] = allocImage();
      copyFlags(imgData, mipmap);
      parseImage(imgData, options);
      mipmap.mipmask = 1;
    } else {
      parseFlags(mipmap, options);
      if (Array.isArray(options.mipmap)) {
        var mipData = options.mipmap;
        for (var i = 0; i < mipData.length; ++i) {
          imgData = mipmap.images[i] = allocImage();
          copyFlags(imgData, mipmap);
          imgData.width >>= i;
          imgData.height >>= i;
          parseImage(imgData, mipData[i]);
          mipmap.mipmask |= (1 << i);
        }
      } else {
        imgData = mipmap.images[0] = allocImage();
        copyFlags(imgData, mipmap);
        parseImage(imgData, options);
        mipmap.mipmask = 1;
      }
    }
    copyFlags(mipmap, mipmap.images[0]);

    // For textures of the compressed format WEBGL_compressed_texture_s3tc
    // we must have that
    //
    // "When level equals zero width and height must be a multiple of 4.
    // When level is greater than 0 width and height must be 0, 1, 2 or a multiple of 4. "
    //
    // but we do not yet support having multiple mipmap levels for compressed textures,
    // so we only test for level zero.

    if (mipmap.compressed &&
        (mipmap.internalformat === GL_COMPRESSED_RGB_S3TC_DXT1_EXT) ||
        (mipmap.internalformat === GL_COMPRESSED_RGBA_S3TC_DXT1_EXT) ||
        (mipmap.internalformat === GL_COMPRESSED_RGBA_S3TC_DXT3_EXT) ||
        (mipmap.internalformat === GL_COMPRESSED_RGBA_S3TC_DXT5_EXT)) {
      check$1(mipmap.width % 4 === 0 &&
            mipmap.height % 4 === 0,
            'for compressed texture formats, mipmap level 0 must have width and height that are a multiple of 4');
    }
  }

  function setMipMap (mipmap, target) {
    var images = mipmap.images;
    for (var i = 0; i < images.length; ++i) {
      if (!images[i]) {
        return
      }
      setImage(images[i], target, i);
    }
  }

  var mipPool = [];

  function allocMipMap () {
    var result = mipPool.pop() || new MipMap();
    TexFlags.call(result);
    result.mipmask = 0;
    for (var i = 0; i < 16; ++i) {
      result.images[i] = null;
    }
    return result
  }

  function freeMipMap (mipmap) {
    var images = mipmap.images;
    for (var i = 0; i < images.length; ++i) {
      if (images[i]) {
        freeImage(images[i]);
      }
      images[i] = null;
    }
    mipPool.push(mipmap);
  }

  // -------------------------------------------------------
  // Tex info
  // -------------------------------------------------------
  function TexInfo () {
    this.minFilter = GL_NEAREST$1;
    this.magFilter = GL_NEAREST$1;

    this.wrapS = GL_CLAMP_TO_EDGE$1;
    this.wrapT = GL_CLAMP_TO_EDGE$1;

    this.anisotropic = 1;

    this.genMipmaps = false;
    this.mipmapHint = GL_DONT_CARE;
  }

  function parseTexInfo (info, options) {
    if ('min' in options) {
      var minFilter = options.min;
      check$1.parameter(minFilter, minFilters);
      info.minFilter = minFilters[minFilter];
      if (MIPMAP_FILTERS.indexOf(info.minFilter) >= 0) {
        info.genMipmaps = true;
      }
    }

    if ('mag' in options) {
      var magFilter = options.mag;
      check$1.parameter(magFilter, magFilters);
      info.magFilter = magFilters[magFilter];
    }

    var wrapS = info.wrapS;
    var wrapT = info.wrapT;
    if ('wrap' in options) {
      var wrap = options.wrap;
      if (typeof wrap === 'string') {
        check$1.parameter(wrap, wrapModes);
        wrapS = wrapT = wrapModes[wrap];
      } else if (Array.isArray(wrap)) {
        check$1.parameter(wrap[0], wrapModes);
        check$1.parameter(wrap[1], wrapModes);
        wrapS = wrapModes[wrap[0]];
        wrapT = wrapModes[wrap[1]];
      }
    } else {
      if ('wrapS' in options) {
        var optWrapS = options.wrapS;
        check$1.parameter(optWrapS, wrapModes);
        wrapS = wrapModes[optWrapS];
      }
      if ('wrapT' in options) {
        var optWrapT = options.wrapT;
        check$1.parameter(optWrapT, wrapModes);
        wrapT = wrapModes[optWrapT];
      }
    }
    info.wrapS = wrapS;
    info.wrapT = wrapT;

    if ('anisotropic' in options) {
      var anisotropic = options.anisotropic;
      check$1(typeof anisotropic === 'number' &&
         anisotropic >= 1 && anisotropic <= limits.maxAnisotropic,
        'aniso samples must be between 1 and ');
      info.anisotropic = options.anisotropic;
    }

    if ('mipmap' in options) {
      var hasMipMap = false;
      switch (typeof options.mipmap) {
        case 'string':
          check$1.parameter(options.mipmap, mipmapHint,
            'invalid mipmap hint');
          info.mipmapHint = mipmapHint[options.mipmap];
          info.genMipmaps = true;
          hasMipMap = true;
          break

        case 'boolean':
          hasMipMap = info.genMipmaps = options.mipmap;
          break

        case 'object':
          check$1(Array.isArray(options.mipmap), 'invalid mipmap type');
          info.genMipmaps = false;
          hasMipMap = true;
          break

        default:
          check$1.raise('invalid mipmap type');
      }
      if (hasMipMap && !('min' in options)) {
        info.minFilter = GL_NEAREST_MIPMAP_NEAREST$1;
      }
    }
  }

  function setTexInfo (info, target) {
    gl.texParameteri(target, GL_TEXTURE_MIN_FILTER, info.minFilter);
    gl.texParameteri(target, GL_TEXTURE_MAG_FILTER, info.magFilter);
    gl.texParameteri(target, GL_TEXTURE_WRAP_S, info.wrapS);
    gl.texParameteri(target, GL_TEXTURE_WRAP_T, info.wrapT);
    if (extensions.ext_texture_filter_anisotropic) {
      gl.texParameteri(target, GL_TEXTURE_MAX_ANISOTROPY_EXT, info.anisotropic);
    }
    if (info.genMipmaps) {
      gl.hint(GL_GENERATE_MIPMAP_HINT, info.mipmapHint);
      gl.generateMipmap(target);
    }
  }

  // -------------------------------------------------------
  // Full texture object
  // -------------------------------------------------------
  var textureCount = 0;
  var textureSet = {};
  var numTexUnits = limits.maxTextureUnits;
  var textureUnits = Array(numTexUnits).map(function () {
    return null
  });

  function REGLTexture (target) {
    TexFlags.call(this);
    this.mipmask = 0;
    this.internalformat = GL_RGBA;

    this.id = textureCount++;

    this.refCount = 1;

    this.target = target;
    this.texture = gl.createTexture();

    this.unit = -1;
    this.bindCount = 0;

    this.texInfo = new TexInfo();

    if (config.profile) {
      this.stats = {size: 0};
    }
  }

  function tempBind (texture) {
    gl.activeTexture(GL_TEXTURE0);
    gl.bindTexture(texture.target, texture.texture);
  }

  function tempRestore () {
    var prev = textureUnits[0];
    if (prev) {
      gl.bindTexture(prev.target, prev.texture);
    } else {
      gl.bindTexture(GL_TEXTURE_2D, null);
    }
  }

  function destroy (texture) {
    var handle = texture.texture;
    check$1(handle, 'must not double destroy texture');
    var unit = texture.unit;
    var target = texture.target;
    if (unit >= 0) {
      gl.activeTexture(GL_TEXTURE0 + unit);
      gl.bindTexture(target, null);
      textureUnits[unit] = null;
    }
    gl.deleteTexture(handle);
    texture.texture = null;
    texture.params = null;
    texture.pixels = null;
    texture.refCount = 0;
    delete textureSet[texture.id];
    stats.textureCount--;
  }

  extend(REGLTexture.prototype, {
    bind: function () {
      var texture = this;
      texture.bindCount += 1;
      var unit = texture.unit;
      if (unit < 0) {
        for (var i = 0; i < numTexUnits; ++i) {
          var other = textureUnits[i];
          if (other) {
            if (other.bindCount > 0) {
              continue
            }
            other.unit = -1;
          }
          textureUnits[i] = texture;
          unit = i;
          break
        }
        if (unit >= numTexUnits) {
          check$1.raise('insufficient number of texture units');
        }
        if (config.profile && stats.maxTextureUnits < (unit + 1)) {
          stats.maxTextureUnits = unit + 1; // +1, since the units are zero-based
        }
        texture.unit = unit;
        gl.activeTexture(GL_TEXTURE0 + unit);
        gl.bindTexture(texture.target, texture.texture);
      }
      return unit
    },

    unbind: function () {
      this.bindCount -= 1;
    },

    decRef: function () {
      if (--this.refCount <= 0) {
        destroy(this);
      }
    }
  });

  function createTexture2D (a, b) {
    var texture = new REGLTexture(GL_TEXTURE_2D);
    textureSet[texture.id] = texture;
    stats.textureCount++;

    function reglTexture2D (a, b) {
      var texInfo = texture.texInfo;
      TexInfo.call(texInfo);
      var mipData = allocMipMap();

      if (typeof a === 'number') {
        if (typeof b === 'number') {
          parseMipMapFromShape(mipData, a | 0, b | 0);
        } else {
          parseMipMapFromShape(mipData, a | 0, a | 0);
        }
      } else if (a) {
        check$1.type(a, 'object', 'invalid arguments to regl.texture');
        parseTexInfo(texInfo, a);
        parseMipMapFromObject(mipData, a);
      } else {
        // empty textures get assigned a default shape of 1x1
        parseMipMapFromShape(mipData, 1, 1);
      }

      if (texInfo.genMipmaps) {
        mipData.mipmask = (mipData.width << 1) - 1;
      }
      texture.mipmask = mipData.mipmask;

      copyFlags(texture, mipData);

      check$1.texture2D(texInfo, mipData, limits);
      texture.internalformat = mipData.internalformat;

      reglTexture2D.width = mipData.width;
      reglTexture2D.height = mipData.height;

      tempBind(texture);
      setMipMap(mipData, GL_TEXTURE_2D);
      setTexInfo(texInfo, GL_TEXTURE_2D);
      tempRestore();

      freeMipMap(mipData);

      if (config.profile) {
        texture.stats.size = getTextureSize(
          texture.internalformat,
          texture.type,
          mipData.width,
          mipData.height,
          texInfo.genMipmaps,
          false);
      }
      reglTexture2D.format = textureFormatsInvert[texture.internalformat];
      reglTexture2D.type = textureTypesInvert[texture.type];

      reglTexture2D.mag = magFiltersInvert[texInfo.magFilter];
      reglTexture2D.min = minFiltersInvert[texInfo.minFilter];

      reglTexture2D.wrapS = wrapModesInvert[texInfo.wrapS];
      reglTexture2D.wrapT = wrapModesInvert[texInfo.wrapT];

      return reglTexture2D
    }

    function subimage (image, x_, y_, level_) {
      check$1(!!image, 'must specify image data');

      var x = x_ | 0;
      var y = y_ | 0;
      var level = level_ | 0;

      var imageData = allocImage();
      copyFlags(imageData, texture);
      imageData.width = 0;
      imageData.height = 0;
      parseImage(imageData, image);
      imageData.width = imageData.width || ((texture.width >> level) - x);
      imageData.height = imageData.height || ((texture.height >> level) - y);

      check$1(
        texture.type === imageData.type &&
        texture.format === imageData.format &&
        texture.internalformat === imageData.internalformat,
        'incompatible format for texture.subimage');
      check$1(
        x >= 0 && y >= 0 &&
        x + imageData.width <= texture.width &&
        y + imageData.height <= texture.height,
        'texture.subimage write out of bounds');
      check$1(
        texture.mipmask & (1 << level),
        'missing mipmap data');
      check$1(
        imageData.data || imageData.element || imageData.needsCopy,
        'missing image data');

      tempBind(texture);
      setSubImage(imageData, GL_TEXTURE_2D, x, y, level);
      tempRestore();

      freeImage(imageData);

      return reglTexture2D
    }

    function resize (w_, h_) {
      var w = w_ | 0;
      var h = (h_ | 0) || w;
      if (w === texture.width && h === texture.height) {
        return reglTexture2D
      }

      reglTexture2D.width = texture.width = w;
      reglTexture2D.height = texture.height = h;

      tempBind(texture);
      for (var i = 0; texture.mipmask >> i; ++i) {
        gl.texImage2D(
          GL_TEXTURE_2D,
          i,
          texture.format,
          w >> i,
          h >> i,
          0,
          texture.format,
          texture.type,
          null);
      }
      tempRestore();

      // also, recompute the texture size.
      if (config.profile) {
        texture.stats.size = getTextureSize(
          texture.internalformat,
          texture.type,
          w,
          h,
          false,
          false);
      }

      return reglTexture2D
    }

    reglTexture2D(a, b);

    reglTexture2D.subimage = subimage;
    reglTexture2D.resize = resize;
    reglTexture2D._reglType = 'texture2d';
    reglTexture2D._texture = texture;
    if (config.profile) {
      reglTexture2D.stats = texture.stats;
    }
    reglTexture2D.destroy = function () {
      texture.decRef();
    };

    return reglTexture2D
  }

  function createTextureCube (a0, a1, a2, a3, a4, a5) {
    var texture = new REGLTexture(GL_TEXTURE_CUBE_MAP);
    textureSet[texture.id] = texture;
    stats.cubeCount++;

    var faces = new Array(6);

    function reglTextureCube (a0, a1, a2, a3, a4, a5) {
      var i;
      var texInfo = texture.texInfo;
      TexInfo.call(texInfo);
      for (i = 0; i < 6; ++i) {
        faces[i] = allocMipMap();
      }

      if (typeof a0 === 'number' || !a0) {
        var s = (a0 | 0) || 1;
        for (i = 0; i < 6; ++i) {
          parseMipMapFromShape(faces[i], s, s);
        }
      } else if (typeof a0 === 'object') {
        if (a1) {
          parseMipMapFromObject(faces[0], a0);
          parseMipMapFromObject(faces[1], a1);
          parseMipMapFromObject(faces[2], a2);
          parseMipMapFromObject(faces[3], a3);
          parseMipMapFromObject(faces[4], a4);
          parseMipMapFromObject(faces[5], a5);
        } else {
          parseTexInfo(texInfo, a0);
          parseFlags(texture, a0);
          if ('faces' in a0) {
            var face_input = a0.faces;
            check$1(Array.isArray(face_input) && face_input.length === 6,
              'cube faces must be a length 6 array');
            for (i = 0; i < 6; ++i) {
              check$1(typeof face_input[i] === 'object' && !!face_input[i],
                'invalid input for cube map face');
              copyFlags(faces[i], texture);
              parseMipMapFromObject(faces[i], face_input[i]);
            }
          } else {
            for (i = 0; i < 6; ++i) {
              parseMipMapFromObject(faces[i], a0);
            }
          }
        }
      } else {
        check$1.raise('invalid arguments to cube map');
      }

      copyFlags(texture, faces[0]);
      if (texInfo.genMipmaps) {
        texture.mipmask = (faces[0].width << 1) - 1;
      } else {
        texture.mipmask = faces[0].mipmask;
      }

      check$1.textureCube(texture, texInfo, faces, limits);
      texture.internalformat = faces[0].internalformat;

      reglTextureCube.width = faces[0].width;
      reglTextureCube.height = faces[0].height;

      tempBind(texture);
      for (i = 0; i < 6; ++i) {
        setMipMap(faces[i], GL_TEXTURE_CUBE_MAP_POSITIVE_X + i);
      }
      setTexInfo(texInfo, GL_TEXTURE_CUBE_MAP);
      tempRestore();

      if (config.profile) {
        texture.stats.size = getTextureSize(
          texture.internalformat,
          texture.type,
          reglTextureCube.width,
          reglTextureCube.height,
          texInfo.genMipmaps,
          true);
      }

      reglTextureCube.format = textureFormatsInvert[texture.internalformat];
      reglTextureCube.type = textureTypesInvert[texture.type];

      reglTextureCube.mag = magFiltersInvert[texInfo.magFilter];
      reglTextureCube.min = minFiltersInvert[texInfo.minFilter];

      reglTextureCube.wrapS = wrapModesInvert[texInfo.wrapS];
      reglTextureCube.wrapT = wrapModesInvert[texInfo.wrapT];

      for (i = 0; i < 6; ++i) {
        freeMipMap(faces[i]);
      }

      return reglTextureCube
    }

    function subimage (face, image, x_, y_, level_) {
      check$1(!!image, 'must specify image data');
      check$1(typeof face === 'number' && face === (face | 0) &&
        face >= 0 && face < 6, 'invalid face');

      var x = x_ | 0;
      var y = y_ | 0;
      var level = level_ | 0;

      var imageData = allocImage();
      copyFlags(imageData, texture);
      imageData.width = 0;
      imageData.height = 0;
      parseImage(imageData, image);
      imageData.width = imageData.width || ((texture.width >> level) - x);
      imageData.height = imageData.height || ((texture.height >> level) - y);

      check$1(
        texture.type === imageData.type &&
        texture.format === imageData.format &&
        texture.internalformat === imageData.internalformat,
        'incompatible format for texture.subimage');
      check$1(
        x >= 0 && y >= 0 &&
        x + imageData.width <= texture.width &&
        y + imageData.height <= texture.height,
        'texture.subimage write out of bounds');
      check$1(
        texture.mipmask & (1 << level),
        'missing mipmap data');
      check$1(
        imageData.data || imageData.element || imageData.needsCopy,
        'missing image data');

      tempBind(texture);
      setSubImage(imageData, GL_TEXTURE_CUBE_MAP_POSITIVE_X + face, x, y, level);
      tempRestore();

      freeImage(imageData);

      return reglTextureCube
    }

    function resize (radius_) {
      var radius = radius_ | 0;
      if (radius === texture.width) {
        return
      }

      reglTextureCube.width = texture.width = radius;
      reglTextureCube.height = texture.height = radius;

      tempBind(texture);
      for (var i = 0; i < 6; ++i) {
        for (var j = 0; texture.mipmask >> j; ++j) {
          gl.texImage2D(
            GL_TEXTURE_CUBE_MAP_POSITIVE_X + i,
            j,
            texture.format,
            radius >> j,
            radius >> j,
            0,
            texture.format,
            texture.type,
            null);
        }
      }
      tempRestore();

      if (config.profile) {
        texture.stats.size = getTextureSize(
          texture.internalformat,
          texture.type,
          reglTextureCube.width,
          reglTextureCube.height,
          false,
          true);
      }

      return reglTextureCube
    }

    reglTextureCube(a0, a1, a2, a3, a4, a5);

    reglTextureCube.subimage = subimage;
    reglTextureCube.resize = resize;
    reglTextureCube._reglType = 'textureCube';
    reglTextureCube._texture = texture;
    if (config.profile) {
      reglTextureCube.stats = texture.stats;
    }
    reglTextureCube.destroy = function () {
      texture.decRef();
    };

    return reglTextureCube
  }

  // Called when regl is destroyed
  function destroyTextures () {
    for (var i = 0; i < numTexUnits; ++i) {
      gl.activeTexture(GL_TEXTURE0 + i);
      gl.bindTexture(GL_TEXTURE_2D, null);
      textureUnits[i] = null;
    }
    values(textureSet).forEach(destroy);

    stats.cubeCount = 0;
    stats.textureCount = 0;
  }

  if (config.profile) {
    stats.getTotalTextureSize = function () {
      var total = 0;
      Object.keys(textureSet).forEach(function (key) {
        total += textureSet[key].stats.size;
      });
      return total
    };
  }

  function restoreTextures () {
    values(textureSet).forEach(function (texture) {
      texture.texture = gl.createTexture();
      gl.bindTexture(texture.target, texture.texture);
      for (var i = 0; i < 32; ++i) {
        if ((texture.mipmask & (1 << i)) === 0) {
          continue
        }
        if (texture.target === GL_TEXTURE_2D) {
          gl.texImage2D(GL_TEXTURE_2D,
            i,
            texture.internalformat,
            texture.width >> i,
            texture.height >> i,
            0,
            texture.internalformat,
            texture.type,
            null);
        } else {
          for (var j = 0; j < 6; ++j) {
            gl.texImage2D(GL_TEXTURE_CUBE_MAP_POSITIVE_X + j,
              i,
              texture.internalformat,
              texture.width >> i,
              texture.height >> i,
              0,
              texture.internalformat,
              texture.type,
              null);
          }
        }
      }
      setTexInfo(texture.texInfo, texture.target);
    });
  }

  return {
    create2D: createTexture2D,
    createCube: createTextureCube,
    clear: destroyTextures,
    getTexture: function (wrapper) {
      return null
    },
    restore: restoreTextures
  }
}

var GL_RENDERBUFFER = 0x8D41;

var GL_RGBA4$1 = 0x8056;
var GL_RGB5_A1$1 = 0x8057;
var GL_RGB565$1 = 0x8D62;
var GL_DEPTH_COMPONENT16 = 0x81A5;
var GL_STENCIL_INDEX8 = 0x8D48;
var GL_DEPTH_STENCIL$1 = 0x84F9;

var GL_SRGB8_ALPHA8_EXT = 0x8C43;

var GL_RGBA32F_EXT = 0x8814;

var GL_RGBA16F_EXT = 0x881A;
var GL_RGB16F_EXT = 0x881B;

var FORMAT_SIZES = [];

FORMAT_SIZES[GL_RGBA4$1] = 2;
FORMAT_SIZES[GL_RGB5_A1$1] = 2;
FORMAT_SIZES[GL_RGB565$1] = 2;

FORMAT_SIZES[GL_DEPTH_COMPONENT16] = 2;
FORMAT_SIZES[GL_STENCIL_INDEX8] = 1;
FORMAT_SIZES[GL_DEPTH_STENCIL$1] = 4;

FORMAT_SIZES[GL_SRGB8_ALPHA8_EXT] = 4;
FORMAT_SIZES[GL_RGBA32F_EXT] = 16;
FORMAT_SIZES[GL_RGBA16F_EXT] = 8;
FORMAT_SIZES[GL_RGB16F_EXT] = 6;

function getRenderbufferSize (format, width, height) {
  return FORMAT_SIZES[format] * width * height
}

var wrapRenderbuffers = function (gl, extensions, limits, stats, config) {
  var formatTypes = {
    'rgba4': GL_RGBA4$1,
    'rgb565': GL_RGB565$1,
    'rgb5 a1': GL_RGB5_A1$1,
    'depth': GL_DEPTH_COMPONENT16,
    'stencil': GL_STENCIL_INDEX8,
    'depth stencil': GL_DEPTH_STENCIL$1
  };

  if (extensions.ext_srgb) {
    formatTypes['srgba'] = GL_SRGB8_ALPHA8_EXT;
  }

  if (extensions.ext_color_buffer_half_float) {
    formatTypes['rgba16f'] = GL_RGBA16F_EXT;
    formatTypes['rgb16f'] = GL_RGB16F_EXT;
  }

  if (extensions.webgl_color_buffer_float) {
    formatTypes['rgba32f'] = GL_RGBA32F_EXT;
  }

  var formatTypesInvert = [];
  Object.keys(formatTypes).forEach(function (key) {
    var val = formatTypes[key];
    formatTypesInvert[val] = key;
  });

  var renderbufferCount = 0;
  var renderbufferSet = {};

  function REGLRenderbuffer (renderbuffer) {
    this.id = renderbufferCount++;
    this.refCount = 1;

    this.renderbuffer = renderbuffer;

    this.format = GL_RGBA4$1;
    this.width = 0;
    this.height = 0;

    if (config.profile) {
      this.stats = {size: 0};
    }
  }

  REGLRenderbuffer.prototype.decRef = function () {
    if (--this.refCount <= 0) {
      destroy(this);
    }
  };

  function destroy (rb) {
    var handle = rb.renderbuffer;
    check$1(handle, 'must not double destroy renderbuffer');
    gl.bindRenderbuffer(GL_RENDERBUFFER, null);
    gl.deleteRenderbuffer(handle);
    rb.renderbuffer = null;
    rb.refCount = 0;
    delete renderbufferSet[rb.id];
    stats.renderbufferCount--;
  }

  function createRenderbuffer (a, b) {
    var renderbuffer = new REGLRenderbuffer(gl.createRenderbuffer());
    renderbufferSet[renderbuffer.id] = renderbuffer;
    stats.renderbufferCount++;

    function reglRenderbuffer (a, b) {
      var w = 0;
      var h = 0;
      var format = GL_RGBA4$1;

      if (typeof a === 'object' && a) {
        var options = a;
        if ('shape' in options) {
          var shape = options.shape;
          check$1(Array.isArray(shape) && shape.length >= 2,
            'invalid renderbuffer shape');
          w = shape[0] | 0;
          h = shape[1] | 0;
        } else {
          if ('radius' in options) {
            w = h = options.radius | 0;
          }
          if ('width' in options) {
            w = options.width | 0;
          }
          if ('height' in options) {
            h = options.height | 0;
          }
        }
        if ('format' in options) {
          check$1.parameter(options.format, formatTypes,
            'invalid renderbuffer format');
          format = formatTypes[options.format];
        }
      } else if (typeof a === 'number') {
        w = a | 0;
        if (typeof b === 'number') {
          h = b | 0;
        } else {
          h = w;
        }
      } else if (!a) {
        w = h = 1;
      } else {
        check$1.raise('invalid arguments to renderbuffer constructor');
      }

      // check shape
      check$1(
        w > 0 && h > 0 &&
        w <= limits.maxRenderbufferSize && h <= limits.maxRenderbufferSize,
        'invalid renderbuffer size');

      if (w === renderbuffer.width &&
          h === renderbuffer.height &&
          format === renderbuffer.format) {
        return
      }

      reglRenderbuffer.width = renderbuffer.width = w;
      reglRenderbuffer.height = renderbuffer.height = h;
      renderbuffer.format = format;

      gl.bindRenderbuffer(GL_RENDERBUFFER, renderbuffer.renderbuffer);
      gl.renderbufferStorage(GL_RENDERBUFFER, format, w, h);

      if (config.profile) {
        renderbuffer.stats.size = getRenderbufferSize(renderbuffer.format, renderbuffer.width, renderbuffer.height);
      }
      reglRenderbuffer.format = formatTypesInvert[renderbuffer.format];

      return reglRenderbuffer
    }

    function resize (w_, h_) {
      var w = w_ | 0;
      var h = (h_ | 0) || w;

      if (w === renderbuffer.width && h === renderbuffer.height) {
        return reglRenderbuffer
      }

      // check shape
      check$1(
        w > 0 && h > 0 &&
        w <= limits.maxRenderbufferSize && h <= limits.maxRenderbufferSize,
        'invalid renderbuffer size');

      reglRenderbuffer.width = renderbuffer.width = w;
      reglRenderbuffer.height = renderbuffer.height = h;

      gl.bindRenderbuffer(GL_RENDERBUFFER, renderbuffer.renderbuffer);
      gl.renderbufferStorage(GL_RENDERBUFFER, renderbuffer.format, w, h);

      // also, recompute size.
      if (config.profile) {
        renderbuffer.stats.size = getRenderbufferSize(
          renderbuffer.format, renderbuffer.width, renderbuffer.height);
      }

      return reglRenderbuffer
    }

    reglRenderbuffer(a, b);

    reglRenderbuffer.resize = resize;
    reglRenderbuffer._reglType = 'renderbuffer';
    reglRenderbuffer._renderbuffer = renderbuffer;
    if (config.profile) {
      reglRenderbuffer.stats = renderbuffer.stats;
    }
    reglRenderbuffer.destroy = function () {
      renderbuffer.decRef();
    };

    return reglRenderbuffer
  }

  if (config.profile) {
    stats.getTotalRenderbufferSize = function () {
      var total = 0;
      Object.keys(renderbufferSet).forEach(function (key) {
        total += renderbufferSet[key].stats.size;
      });
      return total
    };
  }

  function restoreRenderbuffers () {
    values(renderbufferSet).forEach(function (rb) {
      rb.renderbuffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(GL_RENDERBUFFER, rb.renderbuffer);
      gl.renderbufferStorage(GL_RENDERBUFFER, rb.format, rb.width, rb.height);
    });
    gl.bindRenderbuffer(GL_RENDERBUFFER, null);
  }

  return {
    create: createRenderbuffer,
    clear: function () {
      values(renderbufferSet).forEach(destroy);
    },
    restore: restoreRenderbuffers
  }
};

// We store these constants so that the minifier can inline them
var GL_FRAMEBUFFER = 0x8D40;
var GL_RENDERBUFFER$1 = 0x8D41;

var GL_TEXTURE_2D$1 = 0x0DE1;
var GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 = 0x8515;

var GL_COLOR_ATTACHMENT0 = 0x8CE0;
var GL_DEPTH_ATTACHMENT = 0x8D00;
var GL_STENCIL_ATTACHMENT = 0x8D20;
var GL_DEPTH_STENCIL_ATTACHMENT = 0x821A;

var GL_FRAMEBUFFER_COMPLETE = 0x8CD5;
var GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 0x8CD6;
var GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = 0x8CD7;
var GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS = 0x8CD9;
var GL_FRAMEBUFFER_UNSUPPORTED = 0x8CDD;

var GL_HALF_FLOAT_OES$2 = 0x8D61;
var GL_UNSIGNED_BYTE$5 = 0x1401;
var GL_FLOAT$4 = 0x1406;

var GL_RGBA$1 = 0x1908;

var GL_DEPTH_COMPONENT$1 = 0x1902;

var colorTextureFormatEnums = [
  GL_RGBA$1
];

// for every texture format, store
// the number of channels
var textureFormatChannels = [];
textureFormatChannels[GL_RGBA$1] = 4;

// for every texture type, store
// the size in bytes.
var textureTypeSizes = [];
textureTypeSizes[GL_UNSIGNED_BYTE$5] = 1;
textureTypeSizes[GL_FLOAT$4] = 4;
textureTypeSizes[GL_HALF_FLOAT_OES$2] = 2;

var GL_RGBA4$2 = 0x8056;
var GL_RGB5_A1$2 = 0x8057;
var GL_RGB565$2 = 0x8D62;
var GL_DEPTH_COMPONENT16$1 = 0x81A5;
var GL_STENCIL_INDEX8$1 = 0x8D48;
var GL_DEPTH_STENCIL$2 = 0x84F9;

var GL_SRGB8_ALPHA8_EXT$1 = 0x8C43;

var GL_RGBA32F_EXT$1 = 0x8814;

var GL_RGBA16F_EXT$1 = 0x881A;
var GL_RGB16F_EXT$1 = 0x881B;

var colorRenderbufferFormatEnums = [
  GL_RGBA4$2,
  GL_RGB5_A1$2,
  GL_RGB565$2,
  GL_SRGB8_ALPHA8_EXT$1,
  GL_RGBA16F_EXT$1,
  GL_RGB16F_EXT$1,
  GL_RGBA32F_EXT$1
];

var statusCode = {};
statusCode[GL_FRAMEBUFFER_COMPLETE] = 'complete';
statusCode[GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT] = 'incomplete attachment';
statusCode[GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS] = 'incomplete dimensions';
statusCode[GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT] = 'incomplete, missing attachment';
statusCode[GL_FRAMEBUFFER_UNSUPPORTED] = 'unsupported';

function wrapFBOState (
  gl,
  extensions,
  limits,
  textureState,
  renderbufferState,
  stats) {
  var framebufferState = {
    cur: null,
    next: null,
    dirty: false,
    setFBO: null
  };

  var colorTextureFormats = ['rgba'];
  var colorRenderbufferFormats = ['rgba4', 'rgb565', 'rgb5 a1'];

  if (extensions.ext_srgb) {
    colorRenderbufferFormats.push('srgba');
  }

  if (extensions.ext_color_buffer_half_float) {
    colorRenderbufferFormats.push('rgba16f', 'rgb16f');
  }

  if (extensions.webgl_color_buffer_float) {
    colorRenderbufferFormats.push('rgba32f');
  }

  var colorTypes = ['uint8'];
  if (extensions.oes_texture_half_float) {
    colorTypes.push('half float', 'float16');
  }
  if (extensions.oes_texture_float) {
    colorTypes.push('float', 'float32');
  }

  function FramebufferAttachment (target, texture, renderbuffer) {
    this.target = target;
    this.texture = texture;
    this.renderbuffer = renderbuffer;

    var w = 0;
    var h = 0;
    if (texture) {
      w = texture.width;
      h = texture.height;
    } else if (renderbuffer) {
      w = renderbuffer.width;
      h = renderbuffer.height;
    }
    this.width = w;
    this.height = h;
  }

  function decRef (attachment) {
    if (attachment) {
      if (attachment.texture) {
        attachment.texture._texture.decRef();
      }
      if (attachment.renderbuffer) {
        attachment.renderbuffer._renderbuffer.decRef();
      }
    }
  }

  function incRefAndCheckShape (attachment, width, height) {
    if (!attachment) {
      return
    }
    if (attachment.texture) {
      var texture = attachment.texture._texture;
      var tw = Math.max(1, texture.width);
      var th = Math.max(1, texture.height);
      check$1(tw === width && th === height,
        'inconsistent width/height for supplied texture');
      texture.refCount += 1;
    } else {
      var renderbuffer = attachment.renderbuffer._renderbuffer;
      check$1(
        renderbuffer.width === width && renderbuffer.height === height,
        'inconsistent width/height for renderbuffer');
      renderbuffer.refCount += 1;
    }
  }

  function attach (location, attachment) {
    if (attachment) {
      if (attachment.texture) {
        gl.framebufferTexture2D(
          GL_FRAMEBUFFER,
          location,
          attachment.target,
          attachment.texture._texture.texture,
          0);
      } else {
        gl.framebufferRenderbuffer(
          GL_FRAMEBUFFER,
          location,
          GL_RENDERBUFFER$1,
          attachment.renderbuffer._renderbuffer.renderbuffer);
      }
    }
  }

  function parseAttachment (attachment) {
    var target = GL_TEXTURE_2D$1;
    var texture = null;
    var renderbuffer = null;

    var data = attachment;
    if (typeof attachment === 'object') {
      data = attachment.data;
      if ('target' in attachment) {
        target = attachment.target | 0;
      }
    }

    check$1.type(data, 'function', 'invalid attachment data');

    var type = data._reglType;
    if (type === 'texture2d') {
      texture = data;
      check$1(target === GL_TEXTURE_2D$1);
    } else if (type === 'textureCube') {
      texture = data;
      check$1(
        target >= GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 &&
        target < GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 + 6,
        'invalid cube map target');
    } else if (type === 'renderbuffer') {
      renderbuffer = data;
      target = GL_RENDERBUFFER$1;
    } else {
      check$1.raise('invalid regl object for attachment');
    }

    return new FramebufferAttachment(target, texture, renderbuffer)
  }

  function allocAttachment (
    width,
    height,
    isTexture,
    format,
    type) {
    if (isTexture) {
      var texture = textureState.create2D({
        width: width,
        height: height,
        format: format,
        type: type
      });
      texture._texture.refCount = 0;
      return new FramebufferAttachment(GL_TEXTURE_2D$1, texture, null)
    } else {
      var rb = renderbufferState.create({
        width: width,
        height: height,
        format: format
      });
      rb._renderbuffer.refCount = 0;
      return new FramebufferAttachment(GL_RENDERBUFFER$1, null, rb)
    }
  }

  function unwrapAttachment (attachment) {
    return attachment && (attachment.texture || attachment.renderbuffer)
  }

  function resizeAttachment (attachment, w, h) {
    if (attachment) {
      if (attachment.texture) {
        attachment.texture.resize(w, h);
      } else if (attachment.renderbuffer) {
        attachment.renderbuffer.resize(w, h);
      }
    }
  }

  var framebufferCount = 0;
  var framebufferSet = {};

  function REGLFramebuffer () {
    this.id = framebufferCount++;
    framebufferSet[this.id] = this;

    this.framebuffer = gl.createFramebuffer();
    this.width = 0;
    this.height = 0;

    this.colorAttachments = [];
    this.depthAttachment = null;
    this.stencilAttachment = null;
    this.depthStencilAttachment = null;
  }

  function decFBORefs (framebuffer) {
    framebuffer.colorAttachments.forEach(decRef);
    decRef(framebuffer.depthAttachment);
    decRef(framebuffer.stencilAttachment);
    decRef(framebuffer.depthStencilAttachment);
  }

  function destroy (framebuffer) {
    var handle = framebuffer.framebuffer;
    check$1(handle, 'must not double destroy framebuffer');
    gl.deleteFramebuffer(handle);
    framebuffer.framebuffer = null;
    stats.framebufferCount--;
    delete framebufferSet[framebuffer.id];
  }

  function updateFramebuffer (framebuffer) {
    var i;

    gl.bindFramebuffer(GL_FRAMEBUFFER, framebuffer.framebuffer);
    var colorAttachments = framebuffer.colorAttachments;
    for (i = 0; i < colorAttachments.length; ++i) {
      attach(GL_COLOR_ATTACHMENT0 + i, colorAttachments[i]);
    }
    for (i = colorAttachments.length; i < limits.maxColorAttachments; ++i) {
      gl.framebufferTexture2D(
        GL_FRAMEBUFFER,
        GL_COLOR_ATTACHMENT0 + i,
        GL_TEXTURE_2D$1,
        null,
        0);
    }

    gl.framebufferTexture2D(
      GL_FRAMEBUFFER,
      GL_DEPTH_STENCIL_ATTACHMENT,
      GL_TEXTURE_2D$1,
      null,
      0);
    gl.framebufferTexture2D(
      GL_FRAMEBUFFER,
      GL_DEPTH_ATTACHMENT,
      GL_TEXTURE_2D$1,
      null,
      0);
    gl.framebufferTexture2D(
      GL_FRAMEBUFFER,
      GL_STENCIL_ATTACHMENT,
      GL_TEXTURE_2D$1,
      null,
      0);

    attach(GL_DEPTH_ATTACHMENT, framebuffer.depthAttachment);
    attach(GL_STENCIL_ATTACHMENT, framebuffer.stencilAttachment);
    attach(GL_DEPTH_STENCIL_ATTACHMENT, framebuffer.depthStencilAttachment);

    // Check status code
    var status = gl.checkFramebufferStatus(GL_FRAMEBUFFER);
    if (status !== GL_FRAMEBUFFER_COMPLETE) {
      check$1.raise('framebuffer configuration not supported, status = ' +
        statusCode[status]);
    }

    gl.bindFramebuffer(GL_FRAMEBUFFER, framebufferState.next);
    framebufferState.cur = framebufferState.next;

    // FIXME: Clear error code here.  This is a work around for a bug in
    // headless-gl
    gl.getError();
  }

  function createFBO (a0, a1) {
    var framebuffer = new REGLFramebuffer();
    stats.framebufferCount++;

    function reglFramebuffer (a, b) {
      var i;

      check$1(framebufferState.next !== framebuffer,
        'can not update framebuffer which is currently in use');

      var extDrawBuffers = extensions.webgl_draw_buffers;

      var width = 0;
      var height = 0;

      var needsDepth = true;
      var needsStencil = true;

      var colorBuffer = null;
      var colorTexture = true;
      var colorFormat = 'rgba';
      var colorType = 'uint8';
      var colorCount = 1;

      var depthBuffer = null;
      var stencilBuffer = null;
      var depthStencilBuffer = null;
      var depthStencilTexture = false;

      if (typeof a === 'number') {
        width = a | 0;
        height = (b | 0) || width;
      } else if (!a) {
        width = height = 1;
      } else {
        check$1.type(a, 'object', 'invalid arguments for framebuffer');
        var options = a;

        if ('shape' in options) {
          var shape = options.shape;
          check$1(Array.isArray(shape) && shape.length >= 2,
            'invalid shape for framebuffer');
          width = shape[0];
          height = shape[1];
        } else {
          if ('radius' in options) {
            width = height = options.radius;
          }
          if ('width' in options) {
            width = options.width;
          }
          if ('height' in options) {
            height = options.height;
          }
        }

        if ('color' in options ||
            'colors' in options) {
          colorBuffer =
            options.color ||
            options.colors;
          if (Array.isArray(colorBuffer)) {
            check$1(
              colorBuffer.length === 1 || extDrawBuffers,
              'multiple render targets not supported');
          }
        }

        if (!colorBuffer) {
          if ('colorCount' in options) {
            colorCount = options.colorCount | 0;
            check$1(colorCount > 0, 'invalid color buffer count');
          }

          if ('colorTexture' in options) {
            colorTexture = !!options.colorTexture;
            colorFormat = 'rgba4';
          }

          if ('colorType' in options) {
            colorType = options.colorType;
            if (!colorTexture) {
              if (colorType === 'half float' || colorType === 'float16') {
                check$1(extensions.ext_color_buffer_half_float,
                  'you must enable EXT_color_buffer_half_float to use 16-bit render buffers');
                colorFormat = 'rgba16f';
              } else if (colorType === 'float' || colorType === 'float32') {
                check$1(extensions.webgl_color_buffer_float,
                  'you must enable WEBGL_color_buffer_float in order to use 32-bit floating point renderbuffers');
                colorFormat = 'rgba32f';
              }
            } else {
              check$1(extensions.oes_texture_float ||
                !(colorType === 'float' || colorType === 'float32'),
                'you must enable OES_texture_float in order to use floating point framebuffer objects');
              check$1(extensions.oes_texture_half_float ||
                !(colorType === 'half float' || colorType === 'float16'),
                'you must enable OES_texture_half_float in order to use 16-bit floating point framebuffer objects');
            }
            check$1.oneOf(colorType, colorTypes, 'invalid color type');
          }

          if ('colorFormat' in options) {
            colorFormat = options.colorFormat;
            if (colorTextureFormats.indexOf(colorFormat) >= 0) {
              colorTexture = true;
            } else if (colorRenderbufferFormats.indexOf(colorFormat) >= 0) {
              colorTexture = false;
            } else {
              if (colorTexture) {
                check$1.oneOf(
                  options.colorFormat, colorTextureFormats,
                  'invalid color format for texture');
              } else {
                check$1.oneOf(
                  options.colorFormat, colorRenderbufferFormats,
                  'invalid color format for renderbuffer');
              }
            }
          }
        }

        if ('depthTexture' in options || 'depthStencilTexture' in options) {
          depthStencilTexture = !!(options.depthTexture ||
            options.depthStencilTexture);
          check$1(!depthStencilTexture || extensions.webgl_depth_texture,
            'webgl_depth_texture extension not supported');
        }

        if ('depth' in options) {
          if (typeof options.depth === 'boolean') {
            needsDepth = options.depth;
          } else {
            depthBuffer = options.depth;
            needsStencil = false;
          }
        }

        if ('stencil' in options) {
          if (typeof options.stencil === 'boolean') {
            needsStencil = options.stencil;
          } else {
            stencilBuffer = options.stencil;
            needsDepth = false;
          }
        }

        if ('depthStencil' in options) {
          if (typeof options.depthStencil === 'boolean') {
            needsDepth = needsStencil = options.depthStencil;
          } else {
            depthStencilBuffer = options.depthStencil;
            needsDepth = false;
            needsStencil = false;
          }
        }
      }

      // parse attachments
      var colorAttachments = null;
      var depthAttachment = null;
      var stencilAttachment = null;
      var depthStencilAttachment = null;

      // Set up color attachments
      if (Array.isArray(colorBuffer)) {
        colorAttachments = colorBuffer.map(parseAttachment);
      } else if (colorBuffer) {
        colorAttachments = [parseAttachment(colorBuffer)];
      } else {
        colorAttachments = new Array(colorCount);
        for (i = 0; i < colorCount; ++i) {
          colorAttachments[i] = allocAttachment(
            width,
            height,
            colorTexture,
            colorFormat,
            colorType);
        }
      }

      check$1(extensions.webgl_draw_buffers || colorAttachments.length <= 1,
        'you must enable the WEBGL_draw_buffers extension in order to use multiple color buffers.');
      check$1(colorAttachments.length <= limits.maxColorAttachments,
        'too many color attachments, not supported');

      width = width || colorAttachments[0].width;
      height = height || colorAttachments[0].height;

      if (depthBuffer) {
        depthAttachment = parseAttachment(depthBuffer);
      } else if (needsDepth && !needsStencil) {
        depthAttachment = allocAttachment(
          width,
          height,
          depthStencilTexture,
          'depth',
          'uint32');
      }

      if (stencilBuffer) {
        stencilAttachment = parseAttachment(stencilBuffer);
      } else if (needsStencil && !needsDepth) {
        stencilAttachment = allocAttachment(
          width,
          height,
          false,
          'stencil',
          'uint8');
      }

      if (depthStencilBuffer) {
        depthStencilAttachment = parseAttachment(depthStencilBuffer);
      } else if (!depthBuffer && !stencilBuffer && needsStencil && needsDepth) {
        depthStencilAttachment = allocAttachment(
          width,
          height,
          depthStencilTexture,
          'depth stencil',
          'depth stencil');
      }

      check$1(
        (!!depthBuffer) + (!!stencilBuffer) + (!!depthStencilBuffer) <= 1,
        'invalid framebuffer configuration, can specify exactly one depth/stencil attachment');

      var commonColorAttachmentSize = null;

      for (i = 0; i < colorAttachments.length; ++i) {
        incRefAndCheckShape(colorAttachments[i], width, height);
        check$1(!colorAttachments[i] ||
          (colorAttachments[i].texture &&
            colorTextureFormatEnums.indexOf(colorAttachments[i].texture._texture.format) >= 0) ||
          (colorAttachments[i].renderbuffer &&
            colorRenderbufferFormatEnums.indexOf(colorAttachments[i].renderbuffer._renderbuffer.format) >= 0),
          'framebuffer color attachment ' + i + ' is invalid');

        if (colorAttachments[i] && colorAttachments[i].texture) {
          var colorAttachmentSize =
              textureFormatChannels[colorAttachments[i].texture._texture.format] *
              textureTypeSizes[colorAttachments[i].texture._texture.type];

          if (commonColorAttachmentSize === null) {
            commonColorAttachmentSize = colorAttachmentSize;
          } else {
            // We need to make sure that all color attachments have the same number of bitplanes
            // (that is, the same numer of bits per pixel)
            // This is required by the GLES2.0 standard. See the beginning of Chapter 4 in that document.
            check$1(commonColorAttachmentSize === colorAttachmentSize,
                  'all color attachments much have the same number of bits per pixel.');
          }
        }
      }
      incRefAndCheckShape(depthAttachment, width, height);
      check$1(!depthAttachment ||
        (depthAttachment.texture &&
          depthAttachment.texture._texture.format === GL_DEPTH_COMPONENT$1) ||
        (depthAttachment.renderbuffer &&
          depthAttachment.renderbuffer._renderbuffer.format === GL_DEPTH_COMPONENT16$1),
        'invalid depth attachment for framebuffer object');
      incRefAndCheckShape(stencilAttachment, width, height);
      check$1(!stencilAttachment ||
        (stencilAttachment.renderbuffer &&
          stencilAttachment.renderbuffer._renderbuffer.format === GL_STENCIL_INDEX8$1),
        'invalid stencil attachment for framebuffer object');
      incRefAndCheckShape(depthStencilAttachment, width, height);
      check$1(!depthStencilAttachment ||
        (depthStencilAttachment.texture &&
          depthStencilAttachment.texture._texture.format === GL_DEPTH_STENCIL$2) ||
        (depthStencilAttachment.renderbuffer &&
          depthStencilAttachment.renderbuffer._renderbuffer.format === GL_DEPTH_STENCIL$2),
        'invalid depth-stencil attachment for framebuffer object');

      // decrement references
      decFBORefs(framebuffer);

      framebuffer.width = width;
      framebuffer.height = height;

      framebuffer.colorAttachments = colorAttachments;
      framebuffer.depthAttachment = depthAttachment;
      framebuffer.stencilAttachment = stencilAttachment;
      framebuffer.depthStencilAttachment = depthStencilAttachment;

      reglFramebuffer.color = colorAttachments.map(unwrapAttachment);
      reglFramebuffer.depth = unwrapAttachment(depthAttachment);
      reglFramebuffer.stencil = unwrapAttachment(stencilAttachment);
      reglFramebuffer.depthStencil = unwrapAttachment(depthStencilAttachment);

      reglFramebuffer.width = framebuffer.width;
      reglFramebuffer.height = framebuffer.height;

      updateFramebuffer(framebuffer);

      return reglFramebuffer
    }

    function resize (w_, h_) {
      check$1(framebufferState.next !== framebuffer,
        'can not resize a framebuffer which is currently in use');

      var w = w_ | 0;
      var h = (h_ | 0) || w;
      if (w === framebuffer.width && h === framebuffer.height) {
        return reglFramebuffer
      }

      // resize all buffers
      var colorAttachments = framebuffer.colorAttachments;
      for (var i = 0; i < colorAttachments.length; ++i) {
        resizeAttachment(colorAttachments[i], w, h);
      }
      resizeAttachment(framebuffer.depthAttachment, w, h);
      resizeAttachment(framebuffer.stencilAttachment, w, h);
      resizeAttachment(framebuffer.depthStencilAttachment, w, h);

      framebuffer.width = reglFramebuffer.width = w;
      framebuffer.height = reglFramebuffer.height = h;

      updateFramebuffer(framebuffer);

      return reglFramebuffer
    }

    reglFramebuffer(a0, a1);

    return extend(reglFramebuffer, {
      resize: resize,
      _reglType: 'framebuffer',
      _framebuffer: framebuffer,
      destroy: function () {
        destroy(framebuffer);
        decFBORefs(framebuffer);
      },
      use: function (block) {
        framebufferState.setFBO({
          framebuffer: reglFramebuffer
        }, block);
      }
    })
  }

  function createCubeFBO (options) {
    var faces = Array(6);

    function reglFramebufferCube (a) {
      var i;

      check$1(faces.indexOf(framebufferState.next) < 0,
        'can not update framebuffer which is currently in use');

      var extDrawBuffers = extensions.webgl_draw_buffers;

      var params = {
        color: null
      };

      var radius = 0;

      var colorBuffer = null;
      var colorFormat = 'rgba';
      var colorType = 'uint8';
      var colorCount = 1;

      if (typeof a === 'number') {
        radius = a | 0;
      } else if (!a) {
        radius = 1;
      } else {
        check$1.type(a, 'object', 'invalid arguments for framebuffer');
        var options = a;

        if ('shape' in options) {
          var shape = options.shape;
          check$1(
            Array.isArray(shape) && shape.length >= 2,
            'invalid shape for framebuffer');
          check$1(
            shape[0] === shape[1],
            'cube framebuffer must be square');
          radius = shape[0];
        } else {
          if ('radius' in options) {
            radius = options.radius | 0;
          }
          if ('width' in options) {
            radius = options.width | 0;
            if ('height' in options) {
              check$1(options.height === radius, 'must be square');
            }
          } else if ('height' in options) {
            radius = options.height | 0;
          }
        }

        if ('color' in options ||
            'colors' in options) {
          colorBuffer =
            options.color ||
            options.colors;
          if (Array.isArray(colorBuffer)) {
            check$1(
              colorBuffer.length === 1 || extDrawBuffers,
              'multiple render targets not supported');
          }
        }

        if (!colorBuffer) {
          if ('colorCount' in options) {
            colorCount = options.colorCount | 0;
            check$1(colorCount > 0, 'invalid color buffer count');
          }

          if ('colorType' in options) {
            check$1.oneOf(
              options.colorType, colorTypes,
              'invalid color type');
            colorType = options.colorType;
          }

          if ('colorFormat' in options) {
            colorFormat = options.colorFormat;
            check$1.oneOf(
              options.colorFormat, colorTextureFormats,
              'invalid color format for texture');
          }
        }

        if ('depth' in options) {
          params.depth = options.depth;
        }

        if ('stencil' in options) {
          params.stencil = options.stencil;
        }

        if ('depthStencil' in options) {
          params.depthStencil = options.depthStencil;
        }
      }

      var colorCubes;
      if (colorBuffer) {
        if (Array.isArray(colorBuffer)) {
          colorCubes = [];
          for (i = 0; i < colorBuffer.length; ++i) {
            colorCubes[i] = colorBuffer[i];
          }
        } else {
          colorCubes = [ colorBuffer ];
        }
      } else {
        colorCubes = Array(colorCount);
        var cubeMapParams = {
          radius: radius,
          format: colorFormat,
          type: colorType
        };
        for (i = 0; i < colorCount; ++i) {
          colorCubes[i] = textureState.createCube(cubeMapParams);
        }
      }

      // Check color cubes
      params.color = Array(colorCubes.length);
      for (i = 0; i < colorCubes.length; ++i) {
        var cube = colorCubes[i];
        check$1(
          typeof cube === 'function' && cube._reglType === 'textureCube',
          'invalid cube map');
        radius = radius || cube.width;
        check$1(
          cube.width === radius && cube.height === radius,
          'invalid cube map shape');
        params.color[i] = {
          target: GL_TEXTURE_CUBE_MAP_POSITIVE_X$1,
          data: colorCubes[i]
        };
      }

      for (i = 0; i < 6; ++i) {
        for (var j = 0; j < colorCubes.length; ++j) {
          params.color[j].target = GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 + i;
        }
        // reuse depth-stencil attachments across all cube maps
        if (i > 0) {
          params.depth = faces[0].depth;
          params.stencil = faces[0].stencil;
          params.depthStencil = faces[0].depthStencil;
        }
        if (faces[i]) {
          (faces[i])(params);
        } else {
          faces[i] = createFBO(params);
        }
      }

      return extend(reglFramebufferCube, {
        width: radius,
        height: radius,
        color: colorCubes
      })
    }

    function resize (radius_) {
      var i;
      var radius = radius_ | 0;
      check$1(radius > 0 && radius <= limits.maxCubeMapSize,
        'invalid radius for cube fbo');

      if (radius === reglFramebufferCube.width) {
        return reglFramebufferCube
      }

      var colors = reglFramebufferCube.color;
      for (i = 0; i < colors.length; ++i) {
        colors[i].resize(radius);
      }

      for (i = 0; i < 6; ++i) {
        faces[i].resize(radius);
      }

      reglFramebufferCube.width = reglFramebufferCube.height = radius;

      return reglFramebufferCube
    }

    reglFramebufferCube(options);

    return extend(reglFramebufferCube, {
      faces: faces,
      resize: resize,
      _reglType: 'framebufferCube',
      destroy: function () {
        faces.forEach(function (f) {
          f.destroy();
        });
      }
    })
  }

  function restoreFramebuffers () {
    values(framebufferSet).forEach(function (fb) {
      fb.framebuffer = gl.createFramebuffer();
      updateFramebuffer(fb);
    });
  }

  return extend(framebufferState, {
    getFramebuffer: function (object) {
      if (typeof object === 'function' && object._reglType === 'framebuffer') {
        var fbo = object._framebuffer;
        if (fbo instanceof REGLFramebuffer) {
          return fbo
        }
      }
      return null
    },
    create: createFBO,
    createCube: createCubeFBO,
    clear: function () {
      values(framebufferSet).forEach(destroy);
    },
    restore: restoreFramebuffers
  })
}

var GL_FLOAT$5 = 5126;

function AttributeRecord () {
  this.state = 0;

  this.x = 0.0;
  this.y = 0.0;
  this.z = 0.0;
  this.w = 0.0;

  this.buffer = null;
  this.size = 0;
  this.normalized = false;
  this.type = GL_FLOAT$5;
  this.offset = 0;
  this.stride = 0;
  this.divisor = 0;
}

function wrapAttributeState (
  gl,
  extensions,
  limits,
  stringStore) {
  var NUM_ATTRIBUTES = limits.maxAttributes;
  var attributeBindings = new Array(NUM_ATTRIBUTES);
  for (var i = 0; i < NUM_ATTRIBUTES; ++i) {
    attributeBindings[i] = new AttributeRecord();
  }

  return {
    Record: AttributeRecord,
    scope: {},
    state: attributeBindings
  }
}

var GL_FRAGMENT_SHADER = 35632;
var GL_VERTEX_SHADER = 35633;

var GL_ACTIVE_UNIFORMS = 0x8B86;
var GL_ACTIVE_ATTRIBUTES = 0x8B89;

function wrapShaderState (gl, stringStore, stats, config) {
  // ===================================================
  // glsl compilation and linking
  // ===================================================
  var fragShaders = {};
  var vertShaders = {};

  function ActiveInfo (name, id, location, info) {
    this.name = name;
    this.id = id;
    this.location = location;
    this.info = info;
  }

  function insertActiveInfo (list, info) {
    for (var i = 0; i < list.length; ++i) {
      if (list[i].id === info.id) {
        list[i].location = info.location;
        return
      }
    }
    list.push(info);
  }

  function getShader (type, id, command) {
    var cache = type === GL_FRAGMENT_SHADER ? fragShaders : vertShaders;
    var shader = cache[id];

    if (!shader) {
      var source = stringStore.str(id);
      shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      check$1.shaderError(gl, shader, source, type, command);
      cache[id] = shader;
    }

    return shader
  }

  // ===================================================
  // program linking
  // ===================================================
  var programCache = {};
  var programList = [];

  var PROGRAM_COUNTER = 0;

  function REGLProgram (fragId, vertId) {
    this.id = PROGRAM_COUNTER++;
    this.fragId = fragId;
    this.vertId = vertId;
    this.program = null;
    this.uniforms = [];
    this.attributes = [];

    if (config.profile) {
      this.stats = {
        uniformsCount: 0,
        attributesCount: 0
      };
    }
  }

  function linkProgram (desc, command) {
    var i, info;

    // -------------------------------
    // compile & link
    // -------------------------------
    var fragShader = getShader(GL_FRAGMENT_SHADER, desc.fragId);
    var vertShader = getShader(GL_VERTEX_SHADER, desc.vertId);

    var program = desc.program = gl.createProgram();
    gl.attachShader(program, fragShader);
    gl.attachShader(program, vertShader);
    gl.linkProgram(program);
    check$1.linkError(
      gl,
      program,
      stringStore.str(desc.fragId),
      stringStore.str(desc.vertId),
      command);

    // -------------------------------
    // grab uniforms
    // -------------------------------
    var numUniforms = gl.getProgramParameter(program, GL_ACTIVE_UNIFORMS);
    if (config.profile) {
      desc.stats.uniformsCount = numUniforms;
    }
    var uniforms = desc.uniforms;
    for (i = 0; i < numUniforms; ++i) {
      info = gl.getActiveUniform(program, i);
      if (info) {
        if (info.size > 1) {
          for (var j = 0; j < info.size; ++j) {
            var name = info.name.replace('[0]', '[' + j + ']');
            insertActiveInfo(uniforms, new ActiveInfo(
              name,
              stringStore.id(name),
              gl.getUniformLocation(program, name),
              info));
          }
        } else {
          insertActiveInfo(uniforms, new ActiveInfo(
            info.name,
            stringStore.id(info.name),
            gl.getUniformLocation(program, info.name),
            info));
        }
      }
    }

    // -------------------------------
    // grab attributes
    // -------------------------------
    var numAttributes = gl.getProgramParameter(program, GL_ACTIVE_ATTRIBUTES);
    if (config.profile) {
      desc.stats.attributesCount = numAttributes;
    }

    var attributes = desc.attributes;
    for (i = 0; i < numAttributes; ++i) {
      info = gl.getActiveAttrib(program, i);
      if (info) {
        insertActiveInfo(attributes, new ActiveInfo(
          info.name,
          stringStore.id(info.name),
          gl.getAttribLocation(program, info.name),
          info));
      }
    }
  }

  if (config.profile) {
    stats.getMaxUniformsCount = function () {
      var m = 0;
      programList.forEach(function (desc) {
        if (desc.stats.uniformsCount > m) {
          m = desc.stats.uniformsCount;
        }
      });
      return m
    };

    stats.getMaxAttributesCount = function () {
      var m = 0;
      programList.forEach(function (desc) {
        if (desc.stats.attributesCount > m) {
          m = desc.stats.attributesCount;
        }
      });
      return m
    };
  }

  function restoreShaders () {
    fragShaders = {};
    vertShaders = {};
    for (var i = 0; i < programList.length; ++i) {
      linkProgram(programList[i]);
    }
  }

  return {
    clear: function () {
      var deleteShader = gl.deleteShader.bind(gl);
      values(fragShaders).forEach(deleteShader);
      fragShaders = {};
      values(vertShaders).forEach(deleteShader);
      vertShaders = {};

      programList.forEach(function (desc) {
        gl.deleteProgram(desc.program);
      });
      programList.length = 0;
      programCache = {};

      stats.shaderCount = 0;
    },

    program: function (vertId, fragId, command) {
      check$1.command(vertId >= 0, 'missing vertex shader', command);
      check$1.command(fragId >= 0, 'missing fragment shader', command);

      var cache = programCache[fragId];
      if (!cache) {
        cache = programCache[fragId] = {};
      }
      var program = cache[vertId];
      if (!program) {
        program = new REGLProgram(fragId, vertId);
        stats.shaderCount++;

        linkProgram(program, command);
        cache[vertId] = program;
        programList.push(program);
      }
      return program
    },

    restore: restoreShaders,

    shader: getShader,

    frag: -1,
    vert: -1
  }
}

var GL_RGBA$2 = 6408;
var GL_UNSIGNED_BYTE$6 = 5121;
var GL_PACK_ALIGNMENT = 0x0D05;
var GL_FLOAT$6 = 0x1406; // 5126

function wrapReadPixels (
  gl,
  framebufferState,
  reglPoll,
  context,
  glAttributes,
  extensions) {
  function readPixelsImpl (input) {
    var type;
    if (framebufferState.next === null) {
      check$1(
        glAttributes.preserveDrawingBuffer,
        'you must create a webgl context with "preserveDrawingBuffer":true in order to read pixels from the drawing buffer');
      type = GL_UNSIGNED_BYTE$6;
    } else {
      check$1(
        framebufferState.next.colorAttachments[0].texture !== null,
          'You cannot read from a renderbuffer');
      type = framebufferState.next.colorAttachments[0].texture._texture.type;

      if (extensions.oes_texture_float) {
        check$1(
          type === GL_UNSIGNED_BYTE$6 || type === GL_FLOAT$6,
          'Reading from a framebuffer is only allowed for the types \'uint8\' and \'float\'');
      } else {
        check$1(
          type === GL_UNSIGNED_BYTE$6,
          'Reading from a framebuffer is only allowed for the type \'uint8\'');
      }
    }

    var x = 0;
    var y = 0;
    var width = context.framebufferWidth;
    var height = context.framebufferHeight;
    var data = null;

    if (isTypedArray(input)) {
      data = input;
    } else if (input) {
      check$1.type(input, 'object', 'invalid arguments to regl.read()');
      x = input.x | 0;
      y = input.y | 0;
      check$1(
        x >= 0 && x < context.framebufferWidth,
        'invalid x offset for regl.read');
      check$1(
        y >= 0 && y < context.framebufferHeight,
        'invalid y offset for regl.read');
      width = (input.width || (context.framebufferWidth - x)) | 0;
      height = (input.height || (context.framebufferHeight - y)) | 0;
      data = input.data || null;
    }

    // sanity check input.data
    if (data) {
      if (type === GL_UNSIGNED_BYTE$6) {
        check$1(
          data instanceof Uint8Array,
          'buffer must be \'Uint8Array\' when reading from a framebuffer of type \'uint8\'');
      } else if (type === GL_FLOAT$6) {
        check$1(
          data instanceof Float32Array,
          'buffer must be \'Float32Array\' when reading from a framebuffer of type \'float\'');
      }
    }

    check$1(
      width > 0 && width + x <= context.framebufferWidth,
      'invalid width for read pixels');
    check$1(
      height > 0 && height + y <= context.framebufferHeight,
      'invalid height for read pixels');

    // Update WebGL state
    reglPoll();

    // Compute size
    var size = width * height * 4;

    // Allocate data
    if (!data) {
      if (type === GL_UNSIGNED_BYTE$6) {
        data = new Uint8Array(size);
      } else if (type === GL_FLOAT$6) {
        data = data || new Float32Array(size);
      }
    }

    // Type check
    check$1.isTypedArray(data, 'data buffer for regl.read() must be a typedarray');
    check$1(data.byteLength >= size, 'data buffer for regl.read() too small');

    // Run read pixels
    gl.pixelStorei(GL_PACK_ALIGNMENT, 4);
    gl.readPixels(x, y, width, height, GL_RGBA$2,
                  type,
                  data);

    return data
  }

  function readPixelsFBO (options) {
    var result;
    framebufferState.setFBO({
      framebuffer: options.framebuffer
    }, function () {
      result = readPixelsImpl(options);
    });
    return result
  }

  function readPixels (options) {
    if (!options || !('framebuffer' in options)) {
      return readPixelsImpl(options)
    } else {
      return readPixelsFBO(options)
    }
  }

  return readPixels
}

function slice (x) {
  return Array.prototype.slice.call(x)
}

function join (x) {
  return slice(x).join('')
}

function createEnvironment () {
  // Unique variable id counter
  var varCounter = 0;

  // Linked values are passed from this scope into the generated code block
  // Calling link() passes a value into the generated scope and returns
  // the variable name which it is bound to
  var linkedNames = [];
  var linkedValues = [];
  function link (value) {
    for (var i = 0; i < linkedValues.length; ++i) {
      if (linkedValues[i] === value) {
        return linkedNames[i]
      }
    }

    var name = 'g' + (varCounter++);
    linkedNames.push(name);
    linkedValues.push(value);
    return name
  }

  // create a code block
  function block () {
    var code = [];
    function push () {
      code.push.apply(code, slice(arguments));
    }

    var vars = [];
    function def () {
      var name = 'v' + (varCounter++);
      vars.push(name);

      if (arguments.length > 0) {
        code.push(name, '=');
        code.push.apply(code, slice(arguments));
        code.push(';');
      }

      return name
    }

    return extend(push, {
      def: def,
      toString: function () {
        return join([
          (vars.length > 0 ? 'var ' + vars + ';' : ''),
          join(code)
        ])
      }
    })
  }

  function scope () {
    var entry = block();
    var exit = block();

    var entryToString = entry.toString;
    var exitToString = exit.toString;

    function save (object, prop) {
      exit(object, prop, '=', entry.def(object, prop), ';');
    }

    return extend(function () {
      entry.apply(entry, slice(arguments));
    }, {
      def: entry.def,
      entry: entry,
      exit: exit,
      save: save,
      set: function (object, prop, value) {
        save(object, prop);
        entry(object, prop, '=', value, ';');
      },
      toString: function () {
        return entryToString() + exitToString()
      }
    })
  }

  function conditional () {
    var pred = join(arguments);
    var thenBlock = scope();
    var elseBlock = scope();

    var thenToString = thenBlock.toString;
    var elseToString = elseBlock.toString;

    return extend(thenBlock, {
      then: function () {
        thenBlock.apply(thenBlock, slice(arguments));
        return this
      },
      else: function () {
        elseBlock.apply(elseBlock, slice(arguments));
        return this
      },
      toString: function () {
        var elseClause = elseToString();
        if (elseClause) {
          elseClause = 'else{' + elseClause + '}';
        }
        return join([
          'if(', pred, '){',
          thenToString(),
          '}', elseClause
        ])
      }
    })
  }

  // procedure list
  var globalBlock = block();
  var procedures = {};
  function proc (name, count) {
    var args = [];
    function arg () {
      var name = 'a' + args.length;
      args.push(name);
      return name
    }

    count = count || 0;
    for (var i = 0; i < count; ++i) {
      arg();
    }

    var body = scope();
    var bodyToString = body.toString;

    var result = procedures[name] = extend(body, {
      arg: arg,
      toString: function () {
        return join([
          'function(', args.join(), '){',
          bodyToString(),
          '}'
        ])
      }
    });

    return result
  }

  function compile () {
    var code = ['"use strict";',
      globalBlock,
      'return {'];
    Object.keys(procedures).forEach(function (name) {
      code.push('"', name, '":', procedures[name].toString(), ',');
    });
    code.push('}');
    var src = join(code)
      .replace(/;/g, ';\n')
      .replace(/}/g, '}\n')
      .replace(/{/g, '{\n');
    var proc = Function.apply(null, linkedNames.concat(src));
    return proc.apply(null, linkedValues)
  }

  return {
    global: globalBlock,
    link: link,
    block: block,
    proc: proc,
    scope: scope,
    cond: conditional,
    compile: compile
  }
}

// "cute" names for vector components
var CUTE_COMPONENTS = 'xyzw'.split('');

var GL_UNSIGNED_BYTE$7 = 5121;

var ATTRIB_STATE_POINTER = 1;
var ATTRIB_STATE_CONSTANT = 2;

var DYN_FUNC$1 = 0;
var DYN_PROP$1 = 1;
var DYN_CONTEXT$1 = 2;
var DYN_STATE$1 = 3;
var DYN_THUNK = 4;

var S_DITHER = 'dither';
var S_BLEND_ENABLE = 'blend.enable';
var S_BLEND_COLOR = 'blend.color';
var S_BLEND_EQUATION = 'blend.equation';
var S_BLEND_FUNC = 'blend.func';
var S_DEPTH_ENABLE = 'depth.enable';
var S_DEPTH_FUNC = 'depth.func';
var S_DEPTH_RANGE = 'depth.range';
var S_DEPTH_MASK = 'depth.mask';
var S_COLOR_MASK = 'colorMask';
var S_CULL_ENABLE = 'cull.enable';
var S_CULL_FACE = 'cull.face';
var S_FRONT_FACE = 'frontFace';
var S_LINE_WIDTH = 'lineWidth';
var S_POLYGON_OFFSET_ENABLE = 'polygonOffset.enable';
var S_POLYGON_OFFSET_OFFSET = 'polygonOffset.offset';
var S_SAMPLE_ALPHA = 'sample.alpha';
var S_SAMPLE_ENABLE = 'sample.enable';
var S_SAMPLE_COVERAGE = 'sample.coverage';
var S_STENCIL_ENABLE = 'stencil.enable';
var S_STENCIL_MASK = 'stencil.mask';
var S_STENCIL_FUNC = 'stencil.func';
var S_STENCIL_OPFRONT = 'stencil.opFront';
var S_STENCIL_OPBACK = 'stencil.opBack';
var S_SCISSOR_ENABLE = 'scissor.enable';
var S_SCISSOR_BOX = 'scissor.box';
var S_VIEWPORT = 'viewport';

var S_PROFILE = 'profile';

var S_FRAMEBUFFER = 'framebuffer';
var S_VERT = 'vert';
var S_FRAG = 'frag';
var S_ELEMENTS = 'elements';
var S_PRIMITIVE = 'primitive';
var S_COUNT = 'count';
var S_OFFSET = 'offset';
var S_INSTANCES = 'instances';

var SUFFIX_WIDTH = 'Width';
var SUFFIX_HEIGHT = 'Height';

var S_FRAMEBUFFER_WIDTH = S_FRAMEBUFFER + SUFFIX_WIDTH;
var S_FRAMEBUFFER_HEIGHT = S_FRAMEBUFFER + SUFFIX_HEIGHT;
var S_VIEWPORT_WIDTH = S_VIEWPORT + SUFFIX_WIDTH;
var S_VIEWPORT_HEIGHT = S_VIEWPORT + SUFFIX_HEIGHT;
var S_DRAWINGBUFFER = 'drawingBuffer';
var S_DRAWINGBUFFER_WIDTH = S_DRAWINGBUFFER + SUFFIX_WIDTH;
var S_DRAWINGBUFFER_HEIGHT = S_DRAWINGBUFFER + SUFFIX_HEIGHT;

var NESTED_OPTIONS = [
  S_BLEND_FUNC,
  S_BLEND_EQUATION,
  S_STENCIL_FUNC,
  S_STENCIL_OPFRONT,
  S_STENCIL_OPBACK,
  S_SAMPLE_COVERAGE,
  S_VIEWPORT,
  S_SCISSOR_BOX,
  S_POLYGON_OFFSET_OFFSET
];

var GL_ARRAY_BUFFER$1 = 34962;
var GL_ELEMENT_ARRAY_BUFFER$1 = 34963;

var GL_FRAGMENT_SHADER$1 = 35632;
var GL_VERTEX_SHADER$1 = 35633;

var GL_TEXTURE_2D$2 = 0x0DE1;
var GL_TEXTURE_CUBE_MAP$1 = 0x8513;

var GL_CULL_FACE = 0x0B44;
var GL_BLEND = 0x0BE2;
var GL_DITHER = 0x0BD0;
var GL_STENCIL_TEST = 0x0B90;
var GL_DEPTH_TEST = 0x0B71;
var GL_SCISSOR_TEST = 0x0C11;
var GL_POLYGON_OFFSET_FILL = 0x8037;
var GL_SAMPLE_ALPHA_TO_COVERAGE = 0x809E;
var GL_SAMPLE_COVERAGE = 0x80A0;

var GL_FLOAT$7 = 5126;
var GL_FLOAT_VEC2 = 35664;
var GL_FLOAT_VEC3 = 35665;
var GL_FLOAT_VEC4 = 35666;
var GL_INT$3 = 5124;
var GL_INT_VEC2 = 35667;
var GL_INT_VEC3 = 35668;
var GL_INT_VEC4 = 35669;
var GL_BOOL = 35670;
var GL_BOOL_VEC2 = 35671;
var GL_BOOL_VEC3 = 35672;
var GL_BOOL_VEC4 = 35673;
var GL_FLOAT_MAT2 = 35674;
var GL_FLOAT_MAT3 = 35675;
var GL_FLOAT_MAT4 = 35676;
var GL_SAMPLER_2D = 35678;
var GL_SAMPLER_CUBE = 35680;

var GL_TRIANGLES$1 = 4;

var GL_FRONT = 1028;
var GL_BACK = 1029;
var GL_CW = 0x0900;
var GL_CCW = 0x0901;
var GL_MIN_EXT = 0x8007;
var GL_MAX_EXT = 0x8008;
var GL_ALWAYS = 519;
var GL_KEEP = 7680;
var GL_ZERO = 0;
var GL_ONE = 1;
var GL_FUNC_ADD = 0x8006;
var GL_LESS = 513;

var GL_FRAMEBUFFER$1 = 0x8D40;
var GL_COLOR_ATTACHMENT0$1 = 0x8CE0;

var blendFuncs = {
  '0': 0,
  '1': 1,
  'zero': 0,
  'one': 1,
  'src color': 768,
  'one minus src color': 769,
  'src alpha': 770,
  'one minus src alpha': 771,
  'dst color': 774,
  'one minus dst color': 775,
  'dst alpha': 772,
  'one minus dst alpha': 773,
  'constant color': 32769,
  'one minus constant color': 32770,
  'constant alpha': 32771,
  'one minus constant alpha': 32772,
  'src alpha saturate': 776
};

// There are invalid values for srcRGB and dstRGB. See:
// https://www.khronos.org/registry/webgl/specs/1.0/#6.13
// https://github.com/KhronosGroup/WebGL/blob/0d3201f5f7ec3c0060bc1f04077461541f1987b9/conformance-suites/1.0.3/conformance/misc/webgl-specific.html#L56
var invalidBlendCombinations = [
  'constant color, constant alpha',
  'one minus constant color, constant alpha',
  'constant color, one minus constant alpha',
  'one minus constant color, one minus constant alpha',
  'constant alpha, constant color',
  'constant alpha, one minus constant color',
  'one minus constant alpha, constant color',
  'one minus constant alpha, one minus constant color'
];

var compareFuncs = {
  'never': 512,
  'less': 513,
  '<': 513,
  'equal': 514,
  '=': 514,
  '==': 514,
  '===': 514,
  'lequal': 515,
  '<=': 515,
  'greater': 516,
  '>': 516,
  'notequal': 517,
  '!=': 517,
  '!==': 517,
  'gequal': 518,
  '>=': 518,
  'always': 519
};

var stencilOps = {
  '0': 0,
  'zero': 0,
  'keep': 7680,
  'replace': 7681,
  'increment': 7682,
  'decrement': 7683,
  'increment wrap': 34055,
  'decrement wrap': 34056,
  'invert': 5386
};

var shaderType = {
  'frag': GL_FRAGMENT_SHADER$1,
  'vert': GL_VERTEX_SHADER$1
};

var orientationType = {
  'cw': GL_CW,
  'ccw': GL_CCW
};

function isBufferArgs (x) {
  return Array.isArray(x) ||
    isTypedArray(x) ||
    isNDArrayLike(x)
}

// Make sure viewport is processed first
function sortState (state) {
  return state.sort(function (a, b) {
    if (a === S_VIEWPORT) {
      return -1
    } else if (b === S_VIEWPORT) {
      return 1
    }
    return (a < b) ? -1 : 1
  })
}

function Declaration (thisDep, contextDep, propDep, append) {
  this.thisDep = thisDep;
  this.contextDep = contextDep;
  this.propDep = propDep;
  this.append = append;
}

function isStatic (decl) {
  return decl && !(decl.thisDep || decl.contextDep || decl.propDep)
}

function createStaticDecl (append) {
  return new Declaration(false, false, false, append)
}

function createDynamicDecl (dyn, append) {
  var type = dyn.type;
  if (type === DYN_FUNC$1) {
    var numArgs = dyn.data.length;
    return new Declaration(
      true,
      numArgs >= 1,
      numArgs >= 2,
      append)
  } else if (type === DYN_THUNK) {
    var data = dyn.data;
    return new Declaration(
      data.thisDep,
      data.contextDep,
      data.propDep,
      append)
  } else {
    return new Declaration(
      type === DYN_STATE$1,
      type === DYN_CONTEXT$1,
      type === DYN_PROP$1,
      append)
  }
}

var SCOPE_DECL = new Declaration(false, false, false, function () {});

function reglCore (
  gl,
  stringStore,
  extensions,
  limits,
  bufferState,
  elementState,
  textureState,
  framebufferState,
  uniformState,
  attributeState,
  shaderState,
  drawState,
  contextState,
  timer,
  config) {
  var AttributeRecord = attributeState.Record;

  var blendEquations = {
    'add': 32774,
    'subtract': 32778,
    'reverse subtract': 32779
  };
  if (extensions.ext_blend_minmax) {
    blendEquations.min = GL_MIN_EXT;
    blendEquations.max = GL_MAX_EXT;
  }

  var extInstancing = extensions.angle_instanced_arrays;
  var extDrawBuffers = extensions.webgl_draw_buffers;

  // ===================================================
  // ===================================================
  // WEBGL STATE
  // ===================================================
  // ===================================================
  var currentState = {
    dirty: true,
    profile: config.profile
  };
  var nextState = {};
  var GL_STATE_NAMES = [];
  var GL_FLAGS = {};
  var GL_VARIABLES = {};

  function propName (name) {
    return name.replace('.', '_')
  }

  function stateFlag (sname, cap, init) {
    var name = propName(sname);
    GL_STATE_NAMES.push(sname);
    nextState[name] = currentState[name] = !!init;
    GL_FLAGS[name] = cap;
  }

  function stateVariable (sname, func, init) {
    var name = propName(sname);
    GL_STATE_NAMES.push(sname);
    if (Array.isArray(init)) {
      currentState[name] = init.slice();
      nextState[name] = init.slice();
    } else {
      currentState[name] = nextState[name] = init;
    }
    GL_VARIABLES[name] = func;
  }

  // Dithering
  stateFlag(S_DITHER, GL_DITHER);

  // Blending
  stateFlag(S_BLEND_ENABLE, GL_BLEND);
  stateVariable(S_BLEND_COLOR, 'blendColor', [0, 0, 0, 0]);
  stateVariable(S_BLEND_EQUATION, 'blendEquationSeparate',
    [GL_FUNC_ADD, GL_FUNC_ADD]);
  stateVariable(S_BLEND_FUNC, 'blendFuncSeparate',
    [GL_ONE, GL_ZERO, GL_ONE, GL_ZERO]);

  // Depth
  stateFlag(S_DEPTH_ENABLE, GL_DEPTH_TEST, true);
  stateVariable(S_DEPTH_FUNC, 'depthFunc', GL_LESS);
  stateVariable(S_DEPTH_RANGE, 'depthRange', [0, 1]);
  stateVariable(S_DEPTH_MASK, 'depthMask', true);

  // Color mask
  stateVariable(S_COLOR_MASK, S_COLOR_MASK, [true, true, true, true]);

  // Face culling
  stateFlag(S_CULL_ENABLE, GL_CULL_FACE);
  stateVariable(S_CULL_FACE, 'cullFace', GL_BACK);

  // Front face orientation
  stateVariable(S_FRONT_FACE, S_FRONT_FACE, GL_CCW);

  // Line width
  stateVariable(S_LINE_WIDTH, S_LINE_WIDTH, 1);

  // Polygon offset
  stateFlag(S_POLYGON_OFFSET_ENABLE, GL_POLYGON_OFFSET_FILL);
  stateVariable(S_POLYGON_OFFSET_OFFSET, 'polygonOffset', [0, 0]);

  // Sample coverage
  stateFlag(S_SAMPLE_ALPHA, GL_SAMPLE_ALPHA_TO_COVERAGE);
  stateFlag(S_SAMPLE_ENABLE, GL_SAMPLE_COVERAGE);
  stateVariable(S_SAMPLE_COVERAGE, 'sampleCoverage', [1, false]);

  // Stencil
  stateFlag(S_STENCIL_ENABLE, GL_STENCIL_TEST);
  stateVariable(S_STENCIL_MASK, 'stencilMask', -1);
  stateVariable(S_STENCIL_FUNC, 'stencilFunc', [GL_ALWAYS, 0, -1]);
  stateVariable(S_STENCIL_OPFRONT, 'stencilOpSeparate',
    [GL_FRONT, GL_KEEP, GL_KEEP, GL_KEEP]);
  stateVariable(S_STENCIL_OPBACK, 'stencilOpSeparate',
    [GL_BACK, GL_KEEP, GL_KEEP, GL_KEEP]);

  // Scissor
  stateFlag(S_SCISSOR_ENABLE, GL_SCISSOR_TEST);
  stateVariable(S_SCISSOR_BOX, 'scissor',
    [0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight]);

  // Viewport
  stateVariable(S_VIEWPORT, S_VIEWPORT,
    [0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight]);

  // ===================================================
  // ===================================================
  // ENVIRONMENT
  // ===================================================
  // ===================================================
  var sharedState = {
    gl: gl,
    context: contextState,
    strings: stringStore,
    next: nextState,
    current: currentState,
    draw: drawState,
    elements: elementState,
    buffer: bufferState,
    shader: shaderState,
    attributes: attributeState.state,
    uniforms: uniformState,
    framebuffer: framebufferState,
    extensions: extensions,

    timer: timer,
    isBufferArgs: isBufferArgs
  };

  var sharedConstants = {
    primTypes: primTypes,
    compareFuncs: compareFuncs,
    blendFuncs: blendFuncs,
    blendEquations: blendEquations,
    stencilOps: stencilOps,
    glTypes: glTypes,
    orientationType: orientationType
  };

  check$1.optional(function () {
    sharedState.isArrayLike = isArrayLike;
  });

  if (extDrawBuffers) {
    sharedConstants.backBuffer = [GL_BACK];
    sharedConstants.drawBuffer = loop(limits.maxDrawbuffers, function (i) {
      if (i === 0) {
        return [0]
      }
      return loop(i, function (j) {
        return GL_COLOR_ATTACHMENT0$1 + j
      })
    });
  }

  var drawCallCounter = 0;
  function createREGLEnvironment () {
    var env = createEnvironment();
    var link = env.link;
    var global = env.global;
    env.id = drawCallCounter++;

    env.batchId = '0';

    // link shared state
    var SHARED = link(sharedState);
    var shared = env.shared = {
      props: 'a0'
    };
    Object.keys(sharedState).forEach(function (prop) {
      shared[prop] = global.def(SHARED, '.', prop);
    });

    // Inject runtime assertion stuff for debug builds
    check$1.optional(function () {
      env.CHECK = link(check$1);
      env.commandStr = check$1.guessCommand();
      env.command = link(env.commandStr);
      env.assert = function (block, pred, message) {
        block(
          'if(!(', pred, '))',
          this.CHECK, '.commandRaise(', link(message), ',', this.command, ');');
      };

      sharedConstants.invalidBlendCombinations = invalidBlendCombinations;
    });

    // Copy GL state variables over
    var nextVars = env.next = {};
    var currentVars = env.current = {};
    Object.keys(GL_VARIABLES).forEach(function (variable) {
      if (Array.isArray(currentState[variable])) {
        nextVars[variable] = global.def(shared.next, '.', variable);
        currentVars[variable] = global.def(shared.current, '.', variable);
      }
    });

    // Initialize shared constants
    var constants = env.constants = {};
    Object.keys(sharedConstants).forEach(function (name) {
      constants[name] = global.def(JSON.stringify(sharedConstants[name]));
    });

    // Helper function for calling a block
    env.invoke = function (block, x) {
      switch (x.type) {
        case DYN_FUNC$1:
          var argList = [
            'this',
            shared.context,
            shared.props,
            env.batchId
          ];
          return block.def(
            link(x.data), '.call(',
              argList.slice(0, Math.max(x.data.length + 1, 4)),
             ')')
        case DYN_PROP$1:
          return block.def(shared.props, x.data)
        case DYN_CONTEXT$1:
          return block.def(shared.context, x.data)
        case DYN_STATE$1:
          return block.def('this', x.data)
        case DYN_THUNK:
          x.data.append(env, block);
          return x.data.ref
      }
    };

    env.attribCache = {};

    var scopeAttribs = {};
    env.scopeAttrib = function (name) {
      var id = stringStore.id(name);
      if (id in scopeAttribs) {
        return scopeAttribs[id]
      }
      var binding = attributeState.scope[id];
      if (!binding) {
        binding = attributeState.scope[id] = new AttributeRecord();
      }
      var result = scopeAttribs[id] = link(binding);
      return result
    };

    return env
  }

  // ===================================================
  // ===================================================
  // PARSING
  // ===================================================
  // ===================================================
  function parseProfile (options) {
    var staticOptions = options.static;
    var dynamicOptions = options.dynamic;

    var profileEnable;
    if (S_PROFILE in staticOptions) {
      var value = !!staticOptions[S_PROFILE];
      profileEnable = createStaticDecl(function (env, scope) {
        return value
      });
      profileEnable.enable = value;
    } else if (S_PROFILE in dynamicOptions) {
      var dyn = dynamicOptions[S_PROFILE];
      profileEnable = createDynamicDecl(dyn, function (env, scope) {
        return env.invoke(scope, dyn)
      });
    }

    return profileEnable
  }

  function parseFramebuffer (options, env) {
    var staticOptions = options.static;
    var dynamicOptions = options.dynamic;

    if (S_FRAMEBUFFER in staticOptions) {
      var framebuffer = staticOptions[S_FRAMEBUFFER];
      if (framebuffer) {
        framebuffer = framebufferState.getFramebuffer(framebuffer);
        check$1.command(framebuffer, 'invalid framebuffer object');
        return createStaticDecl(function (env, block) {
          var FRAMEBUFFER = env.link(framebuffer);
          var shared = env.shared;
          block.set(
            shared.framebuffer,
            '.next',
            FRAMEBUFFER);
          var CONTEXT = shared.context;
          block.set(
            CONTEXT,
            '.' + S_FRAMEBUFFER_WIDTH,
            FRAMEBUFFER + '.width');
          block.set(
            CONTEXT,
            '.' + S_FRAMEBUFFER_HEIGHT,
            FRAMEBUFFER + '.height');
          return FRAMEBUFFER
        })
      } else {
        return createStaticDecl(function (env, scope) {
          var shared = env.shared;
          scope.set(
            shared.framebuffer,
            '.next',
            'null');
          var CONTEXT = shared.context;
          scope.set(
            CONTEXT,
            '.' + S_FRAMEBUFFER_WIDTH,
            CONTEXT + '.' + S_DRAWINGBUFFER_WIDTH);
          scope.set(
            CONTEXT,
            '.' + S_FRAMEBUFFER_HEIGHT,
            CONTEXT + '.' + S_DRAWINGBUFFER_HEIGHT);
          return 'null'
        })
      }
    } else if (S_FRAMEBUFFER in dynamicOptions) {
      var dyn = dynamicOptions[S_FRAMEBUFFER];
      return createDynamicDecl(dyn, function (env, scope) {
        var FRAMEBUFFER_FUNC = env.invoke(scope, dyn);
        var shared = env.shared;
        var FRAMEBUFFER_STATE = shared.framebuffer;
        var FRAMEBUFFER = scope.def(
          FRAMEBUFFER_STATE, '.getFramebuffer(', FRAMEBUFFER_FUNC, ')');

        check$1.optional(function () {
          env.assert(scope,
            '!' + FRAMEBUFFER_FUNC + '||' + FRAMEBUFFER,
            'invalid framebuffer object');
        });

        scope.set(
          FRAMEBUFFER_STATE,
          '.next',
          FRAMEBUFFER);
        var CONTEXT = shared.context;
        scope.set(
          CONTEXT,
          '.' + S_FRAMEBUFFER_WIDTH,
          FRAMEBUFFER + '?' + FRAMEBUFFER + '.width:' +
          CONTEXT + '.' + S_DRAWINGBUFFER_WIDTH);
        scope.set(
          CONTEXT,
          '.' + S_FRAMEBUFFER_HEIGHT,
          FRAMEBUFFER +
          '?' + FRAMEBUFFER + '.height:' +
          CONTEXT + '.' + S_DRAWINGBUFFER_HEIGHT);
        return FRAMEBUFFER
      })
    } else {
      return null
    }
  }

  function parseViewportScissor (options, framebuffer, env) {
    var staticOptions = options.static;
    var dynamicOptions = options.dynamic;

    function parseBox (param) {
      if (param in staticOptions) {
        var box = staticOptions[param];
        check$1.commandType(box, 'object', 'invalid ' + param, env.commandStr);

        var isStatic = true;
        var x = box.x | 0;
        var y = box.y | 0;
        var w, h;
        if ('width' in box) {
          w = box.width | 0;
          check$1.command(w >= 0, 'invalid ' + param, env.commandStr);
        } else {
          isStatic = false;
        }
        if ('height' in box) {
          h = box.height | 0;
          check$1.command(h >= 0, 'invalid ' + param, env.commandStr);
        } else {
          isStatic = false;
        }

        return new Declaration(
          !isStatic && framebuffer && framebuffer.thisDep,
          !isStatic && framebuffer && framebuffer.contextDep,
          !isStatic && framebuffer && framebuffer.propDep,
          function (env, scope) {
            var CONTEXT = env.shared.context;
            var BOX_W = w;
            if (!('width' in box)) {
              BOX_W = scope.def(CONTEXT, '.', S_FRAMEBUFFER_WIDTH, '-', x);
            }
            var BOX_H = h;
            if (!('height' in box)) {
              BOX_H = scope.def(CONTEXT, '.', S_FRAMEBUFFER_HEIGHT, '-', y);
            }
            return [x, y, BOX_W, BOX_H]
          })
      } else if (param in dynamicOptions) {
        var dynBox = dynamicOptions[param];
        var result = createDynamicDecl(dynBox, function (env, scope) {
          var BOX = env.invoke(scope, dynBox);

          check$1.optional(function () {
            env.assert(scope,
              BOX + '&&typeof ' + BOX + '==="object"',
              'invalid ' + param);
          });

          var CONTEXT = env.shared.context;
          var BOX_X = scope.def(BOX, '.x|0');
          var BOX_Y = scope.def(BOX, '.y|0');
          var BOX_W = scope.def(
            '"width" in ', BOX, '?', BOX, '.width|0:',
            '(', CONTEXT, '.', S_FRAMEBUFFER_WIDTH, '-', BOX_X, ')');
          var BOX_H = scope.def(
            '"height" in ', BOX, '?', BOX, '.height|0:',
            '(', CONTEXT, '.', S_FRAMEBUFFER_HEIGHT, '-', BOX_Y, ')');

          check$1.optional(function () {
            env.assert(scope,
              BOX_W + '>=0&&' +
              BOX_H + '>=0',
              'invalid ' + param);
          });

          return [BOX_X, BOX_Y, BOX_W, BOX_H]
        });
        if (framebuffer) {
          result.thisDep = result.thisDep || framebuffer.thisDep;
          result.contextDep = result.contextDep || framebuffer.contextDep;
          result.propDep = result.propDep || framebuffer.propDep;
        }
        return result
      } else if (framebuffer) {
        return new Declaration(
          framebuffer.thisDep,
          framebuffer.contextDep,
          framebuffer.propDep,
          function (env, scope) {
            var CONTEXT = env.shared.context;
            return [
              0, 0,
              scope.def(CONTEXT, '.', S_FRAMEBUFFER_WIDTH),
              scope.def(CONTEXT, '.', S_FRAMEBUFFER_HEIGHT)]
          })
      } else {
        return null
      }
    }

    var viewport = parseBox(S_VIEWPORT);

    if (viewport) {
      var prevViewport = viewport;
      viewport = new Declaration(
        viewport.thisDep,
        viewport.contextDep,
        viewport.propDep,
        function (env, scope) {
          var VIEWPORT = prevViewport.append(env, scope);
          var CONTEXT = env.shared.context;
          scope.set(
            CONTEXT,
            '.' + S_VIEWPORT_WIDTH,
            VIEWPORT[2]);
          scope.set(
            CONTEXT,
            '.' + S_VIEWPORT_HEIGHT,
            VIEWPORT[3]);
          return VIEWPORT
        });
    }

    return {
      viewport: viewport,
      scissor_box: parseBox(S_SCISSOR_BOX)
    }
  }

  function parseProgram (options) {
    var staticOptions = options.static;
    var dynamicOptions = options.dynamic;

    function parseShader (name) {
      if (name in staticOptions) {
        var id = stringStore.id(staticOptions[name]);
        check$1.optional(function () {
          shaderState.shader(shaderType[name], id, check$1.guessCommand());
        });
        var result = createStaticDecl(function () {
          return id
        });
        result.id = id;
        return result
      } else if (name in dynamicOptions) {
        var dyn = dynamicOptions[name];
        return createDynamicDecl(dyn, function (env, scope) {
          var str = env.invoke(scope, dyn);
          var id = scope.def(env.shared.strings, '.id(', str, ')');
          check$1.optional(function () {
            scope(
              env.shared.shader, '.shader(',
              shaderType[name], ',',
              id, ',',
              env.command, ');');
          });
          return id
        })
      }
      return null
    }

    var frag = parseShader(S_FRAG);
    var vert = parseShader(S_VERT);

    var program = null;
    var progVar;
    if (isStatic(frag) && isStatic(vert)) {
      program = shaderState.program(vert.id, frag.id);
      progVar = createStaticDecl(function (env, scope) {
        return env.link(program)
      });
    } else {
      progVar = new Declaration(
        (frag && frag.thisDep) || (vert && vert.thisDep),
        (frag && frag.contextDep) || (vert && vert.contextDep),
        (frag && frag.propDep) || (vert && vert.propDep),
        function (env, scope) {
          var SHADER_STATE = env.shared.shader;
          var fragId;
          if (frag) {
            fragId = frag.append(env, scope);
          } else {
            fragId = scope.def(SHADER_STATE, '.', S_FRAG);
          }
          var vertId;
          if (vert) {
            vertId = vert.append(env, scope);
          } else {
            vertId = scope.def(SHADER_STATE, '.', S_VERT);
          }
          var progDef = SHADER_STATE + '.program(' + vertId + ',' + fragId;
          check$1.optional(function () {
            progDef += ',' + env.command;
          });
          return scope.def(progDef + ')')
        });
    }

    return {
      frag: frag,
      vert: vert,
      progVar: progVar,
      program: program
    }
  }

  function parseDraw (options, env) {
    var staticOptions = options.static;
    var dynamicOptions = options.dynamic;

    function parseElements () {
      if (S_ELEMENTS in staticOptions) {
        var elements = staticOptions[S_ELEMENTS];
        if (isBufferArgs(elements)) {
          elements = elementState.getElements(elementState.create(elements, true));
        } else if (elements) {
          elements = elementState.getElements(elements);
          check$1.command(elements, 'invalid elements', env.commandStr);
        }
        var result = createStaticDecl(function (env, scope) {
          if (elements) {
            var result = env.link(elements);
            env.ELEMENTS = result;
            return result
          }
          env.ELEMENTS = null;
          return null
        });
        result.value = elements;
        return result
      } else if (S_ELEMENTS in dynamicOptions) {
        var dyn = dynamicOptions[S_ELEMENTS];
        return createDynamicDecl(dyn, function (env, scope) {
          var shared = env.shared;

          var IS_BUFFER_ARGS = shared.isBufferArgs;
          var ELEMENT_STATE = shared.elements;

          var elementDefn = env.invoke(scope, dyn);
          var elements = scope.def('null');
          var elementStream = scope.def(IS_BUFFER_ARGS, '(', elementDefn, ')');

          var ifte = env.cond(elementStream)
            .then(elements, '=', ELEMENT_STATE, '.createStream(', elementDefn, ');')
            .else(elements, '=', ELEMENT_STATE, '.getElements(', elementDefn, ');');

          check$1.optional(function () {
            env.assert(ifte.else,
              '!' + elementDefn + '||' + elements,
              'invalid elements');
          });

          scope.entry(ifte);
          scope.exit(
            env.cond(elementStream)
              .then(ELEMENT_STATE, '.destroyStream(', elements, ');'));

          env.ELEMENTS = elements;

          return elements
        })
      }

      return null
    }

    var elements = parseElements();

    function parsePrimitive () {
      if (S_PRIMITIVE in staticOptions) {
        var primitive = staticOptions[S_PRIMITIVE];
        check$1.commandParameter(primitive, primTypes, 'invalid primitve', env.commandStr);
        return createStaticDecl(function (env, scope) {
          return primTypes[primitive]
        })
      } else if (S_PRIMITIVE in dynamicOptions) {
        var dynPrimitive = dynamicOptions[S_PRIMITIVE];
        return createDynamicDecl(dynPrimitive, function (env, scope) {
          var PRIM_TYPES = env.constants.primTypes;
          var prim = env.invoke(scope, dynPrimitive);
          check$1.optional(function () {
            env.assert(scope,
              prim + ' in ' + PRIM_TYPES,
              'invalid primitive, must be one of ' + Object.keys(primTypes));
          });
          return scope.def(PRIM_TYPES, '[', prim, ']')
        })
      } else if (elements) {
        if (isStatic(elements)) {
          if (elements.value) {
            return createStaticDecl(function (env, scope) {
              return scope.def(env.ELEMENTS, '.primType')
            })
          } else {
            return createStaticDecl(function () {
              return GL_TRIANGLES$1
            })
          }
        } else {
          return new Declaration(
            elements.thisDep,
            elements.contextDep,
            elements.propDep,
            function (env, scope) {
              var elements = env.ELEMENTS;
              return scope.def(elements, '?', elements, '.primType:', GL_TRIANGLES$1)
            })
        }
      }
      return null
    }

    function parseParam (param, isOffset) {
      if (param in staticOptions) {
        var value = staticOptions[param] | 0;
        check$1.command(!isOffset || value >= 0, 'invalid ' + param, env.commandStr);
        return createStaticDecl(function (env, scope) {
          if (isOffset) {
            env.OFFSET = value;
          }
          return value
        })
      } else if (param in dynamicOptions) {
        var dynValue = dynamicOptions[param];
        return createDynamicDecl(dynValue, function (env, scope) {
          var result = env.invoke(scope, dynValue);
          if (isOffset) {
            env.OFFSET = result;
            check$1.optional(function () {
              env.assert(scope,
                result + '>=0',
                'invalid ' + param);
            });
          }
          return result
        })
      } else if (isOffset && elements) {
        return createStaticDecl(function (env, scope) {
          env.OFFSET = '0';
          return 0
        })
      }
      return null
    }

    var OFFSET = parseParam(S_OFFSET, true);

    function parseVertCount () {
      if (S_COUNT in staticOptions) {
        var count = staticOptions[S_COUNT] | 0;
        check$1.command(
          typeof count === 'number' && count >= 0, 'invalid vertex count', env.commandStr);
        return createStaticDecl(function () {
          return count
        })
      } else if (S_COUNT in dynamicOptions) {
        var dynCount = dynamicOptions[S_COUNT];
        return createDynamicDecl(dynCount, function (env, scope) {
          var result = env.invoke(scope, dynCount);
          check$1.optional(function () {
            env.assert(scope,
              'typeof ' + result + '==="number"&&' +
              result + '>=0&&' +
              result + '===(' + result + '|0)',
              'invalid vertex count');
          });
          return result
        })
      } else if (elements) {
        if (isStatic(elements)) {
          if (elements) {
            if (OFFSET) {
              return new Declaration(
                OFFSET.thisDep,
                OFFSET.contextDep,
                OFFSET.propDep,
                function (env, scope) {
                  var result = scope.def(
                    env.ELEMENTS, '.vertCount-', env.OFFSET);

                  check$1.optional(function () {
                    env.assert(scope,
                      result + '>=0',
                      'invalid vertex offset/element buffer too small');
                  });

                  return result
                })
            } else {
              return createStaticDecl(function (env, scope) {
                return scope.def(env.ELEMENTS, '.vertCount')
              })
            }
          } else {
            var result = createStaticDecl(function () {
              return -1
            });
            check$1.optional(function () {
              result.MISSING = true;
            });
            return result
          }
        } else {
          var variable = new Declaration(
            elements.thisDep || OFFSET.thisDep,
            elements.contextDep || OFFSET.contextDep,
            elements.propDep || OFFSET.propDep,
            function (env, scope) {
              var elements = env.ELEMENTS;
              if (env.OFFSET) {
                return scope.def(elements, '?', elements, '.vertCount-',
                  env.OFFSET, ':-1')
              }
              return scope.def(elements, '?', elements, '.vertCount:-1')
            });
          check$1.optional(function () {
            variable.DYNAMIC = true;
          });
          return variable
        }
      }
      return null
    }

    return {
      elements: elements,
      primitive: parsePrimitive(),
      count: parseVertCount(),
      instances: parseParam(S_INSTANCES, false),
      offset: OFFSET
    }
  }

  function parseGLState (options, env) {
    var staticOptions = options.static;
    var dynamicOptions = options.dynamic;

    var STATE = {};

    GL_STATE_NAMES.forEach(function (prop) {
      var param = propName(prop);

      function parseParam (parseStatic, parseDynamic) {
        if (prop in staticOptions) {
          var value = parseStatic(staticOptions[prop]);
          STATE[param] = createStaticDecl(function () {
            return value
          });
        } else if (prop in dynamicOptions) {
          var dyn = dynamicOptions[prop];
          STATE[param] = createDynamicDecl(dyn, function (env, scope) {
            return parseDynamic(env, scope, env.invoke(scope, dyn))
          });
        }
      }

      switch (prop) {
        case S_CULL_ENABLE:
        case S_BLEND_ENABLE:
        case S_DITHER:
        case S_STENCIL_ENABLE:
        case S_DEPTH_ENABLE:
        case S_SCISSOR_ENABLE:
        case S_POLYGON_OFFSET_ENABLE:
        case S_SAMPLE_ALPHA:
        case S_SAMPLE_ENABLE:
        case S_DEPTH_MASK:
          return parseParam(
            function (value) {
              check$1.commandType(value, 'boolean', prop, env.commandStr);
              return value
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  'typeof ' + value + '==="boolean"',
                  'invalid flag ' + prop, env.commandStr);
              });
              return value
            })

        case S_DEPTH_FUNC:
          return parseParam(
            function (value) {
              check$1.commandParameter(value, compareFuncs, 'invalid ' + prop, env.commandStr);
              return compareFuncs[value]
            },
            function (env, scope, value) {
              var COMPARE_FUNCS = env.constants.compareFuncs;
              check$1.optional(function () {
                env.assert(scope,
                  value + ' in ' + COMPARE_FUNCS,
                  'invalid ' + prop + ', must be one of ' + Object.keys(compareFuncs));
              });
              return scope.def(COMPARE_FUNCS, '[', value, ']')
            })

        case S_DEPTH_RANGE:
          return parseParam(
            function (value) {
              check$1.command(
                isArrayLike(value) &&
                value.length === 2 &&
                typeof value[0] === 'number' &&
                typeof value[1] === 'number' &&
                value[0] <= value[1],
                'depth range is 2d array',
                env.commandStr);
              return value
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  env.shared.isArrayLike + '(' + value + ')&&' +
                  value + '.length===2&&' +
                  'typeof ' + value + '[0]==="number"&&' +
                  'typeof ' + value + '[1]==="number"&&' +
                  value + '[0]<=' + value + '[1]',
                  'depth range must be a 2d array');
              });

              var Z_NEAR = scope.def('+', value, '[0]');
              var Z_FAR = scope.def('+', value, '[1]');
              return [Z_NEAR, Z_FAR]
            })

        case S_BLEND_FUNC:
          return parseParam(
            function (value) {
              check$1.commandType(value, 'object', 'blend.func', env.commandStr);
              var srcRGB = ('srcRGB' in value ? value.srcRGB : value.src);
              var srcAlpha = ('srcAlpha' in value ? value.srcAlpha : value.src);
              var dstRGB = ('dstRGB' in value ? value.dstRGB : value.dst);
              var dstAlpha = ('dstAlpha' in value ? value.dstAlpha : value.dst);
              check$1.commandParameter(srcRGB, blendFuncs, param + '.srcRGB', env.commandStr);
              check$1.commandParameter(srcAlpha, blendFuncs, param + '.srcAlpha', env.commandStr);
              check$1.commandParameter(dstRGB, blendFuncs, param + '.dstRGB', env.commandStr);
              check$1.commandParameter(dstAlpha, blendFuncs, param + '.dstAlpha', env.commandStr);

              check$1.command(
                (invalidBlendCombinations.indexOf(srcRGB + ', ' + dstRGB) === -1),
                'unallowed blending combination (srcRGB, dstRGB) = (' + srcRGB + ', ' + dstRGB + ')', env.commandStr);

              return [
                blendFuncs[srcRGB],
                blendFuncs[dstRGB],
                blendFuncs[srcAlpha],
                blendFuncs[dstAlpha]
              ]
            },
            function (env, scope, value) {
              var BLEND_FUNCS = env.constants.blendFuncs;

              check$1.optional(function () {
                env.assert(scope,
                  value + '&&typeof ' + value + '==="object"',
                  'invalid blend func, must be an object');
              });

              function read (prefix, suffix) {
                var func = scope.def(
                  '"', prefix, suffix, '" in ', value,
                  '?', value, '.', prefix, suffix,
                  ':', value, '.', prefix);

                check$1.optional(function () {
                  env.assert(scope,
                    func + ' in ' + BLEND_FUNCS,
                    'invalid ' + prop + '.' + prefix + suffix + ', must be one of ' + Object.keys(blendFuncs));
                });

                return func
              }

              var srcRGB = read('src', 'RGB');
              var dstRGB = read('dst', 'RGB');

              check$1.optional(function () {
                var INVALID_BLEND_COMBINATIONS = env.constants.invalidBlendCombinations;

                env.assert(scope,
                           INVALID_BLEND_COMBINATIONS +
                           '.indexOf(' + srcRGB + '+", "+' + dstRGB + ') === -1 ',
                           'unallowed blending combination for (srcRGB, dstRGB)'
                          );
              });

              var SRC_RGB = scope.def(BLEND_FUNCS, '[', srcRGB, ']');
              var SRC_ALPHA = scope.def(BLEND_FUNCS, '[', read('src', 'Alpha'), ']');
              var DST_RGB = scope.def(BLEND_FUNCS, '[', dstRGB, ']');
              var DST_ALPHA = scope.def(BLEND_FUNCS, '[', read('dst', 'Alpha'), ']');

              return [SRC_RGB, DST_RGB, SRC_ALPHA, DST_ALPHA]
            })

        case S_BLEND_EQUATION:
          return parseParam(
            function (value) {
              if (typeof value === 'string') {
                check$1.commandParameter(value, blendEquations, 'invalid ' + prop, env.commandStr);
                return [
                  blendEquations[value],
                  blendEquations[value]
                ]
              } else if (typeof value === 'object') {
                check$1.commandParameter(
                  value.rgb, blendEquations, prop + '.rgb', env.commandStr);
                check$1.commandParameter(
                  value.alpha, blendEquations, prop + '.alpha', env.commandStr);
                return [
                  blendEquations[value.rgb],
                  blendEquations[value.alpha]
                ]
              } else {
                check$1.commandRaise('invalid blend.equation', env.commandStr);
              }
            },
            function (env, scope, value) {
              var BLEND_EQUATIONS = env.constants.blendEquations;

              var RGB = scope.def();
              var ALPHA = scope.def();

              var ifte = env.cond('typeof ', value, '==="string"');

              check$1.optional(function () {
                function checkProp (block, name, value) {
                  env.assert(block,
                    value + ' in ' + BLEND_EQUATIONS,
                    'invalid ' + name + ', must be one of ' + Object.keys(blendEquations));
                }
                checkProp(ifte.then, prop, value);

                env.assert(ifte.else,
                  value + '&&typeof ' + value + '==="object"',
                  'invalid ' + prop);
                checkProp(ifte.else, prop + '.rgb', value + '.rgb');
                checkProp(ifte.else, prop + '.alpha', value + '.alpha');
              });

              ifte.then(
                RGB, '=', ALPHA, '=', BLEND_EQUATIONS, '[', value, '];');
              ifte.else(
                RGB, '=', BLEND_EQUATIONS, '[', value, '.rgb];',
                ALPHA, '=', BLEND_EQUATIONS, '[', value, '.alpha];');

              scope(ifte);

              return [RGB, ALPHA]
            })

        case S_BLEND_COLOR:
          return parseParam(
            function (value) {
              check$1.command(
                isArrayLike(value) &&
                value.length === 4,
                'blend.color must be a 4d array', env.commandStr);
              return loop(4, function (i) {
                return +value[i]
              })
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  env.shared.isArrayLike + '(' + value + ')&&' +
                  value + '.length===4',
                  'blend.color must be a 4d array');
              });
              return loop(4, function (i) {
                return scope.def('+', value, '[', i, ']')
              })
            })

        case S_STENCIL_MASK:
          return parseParam(
            function (value) {
              check$1.commandType(value, 'number', param, env.commandStr);
              return value | 0
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  'typeof ' + value + '==="number"',
                  'invalid stencil.mask');
              });
              return scope.def(value, '|0')
            })

        case S_STENCIL_FUNC:
          return parseParam(
            function (value) {
              check$1.commandType(value, 'object', param, env.commandStr);
              var cmp = value.cmp || 'keep';
              var ref = value.ref || 0;
              var mask = 'mask' in value ? value.mask : -1;
              check$1.commandParameter(cmp, compareFuncs, prop + '.cmp', env.commandStr);
              check$1.commandType(ref, 'number', prop + '.ref', env.commandStr);
              check$1.commandType(mask, 'number', prop + '.mask', env.commandStr);
              return [
                compareFuncs[cmp],
                ref,
                mask
              ]
            },
            function (env, scope, value) {
              var COMPARE_FUNCS = env.constants.compareFuncs;
              check$1.optional(function () {
                function assert () {
                  env.assert(scope,
                    Array.prototype.join.call(arguments, ''),
                    'invalid stencil.func');
                }
                assert(value + '&&typeof ', value, '==="object"');
                assert('!("cmp" in ', value, ')||(',
                  value, '.cmp in ', COMPARE_FUNCS, ')');
              });
              var cmp = scope.def(
                '"cmp" in ', value,
                '?', COMPARE_FUNCS, '[', value, '.cmp]',
                ':', GL_KEEP);
              var ref = scope.def(value, '.ref|0');
              var mask = scope.def(
                '"mask" in ', value,
                '?', value, '.mask|0:-1');
              return [cmp, ref, mask]
            })

        case S_STENCIL_OPFRONT:
        case S_STENCIL_OPBACK:
          return parseParam(
            function (value) {
              check$1.commandType(value, 'object', param, env.commandStr);
              var fail = value.fail || 'keep';
              var zfail = value.zfail || 'keep';
              var zpass = value.zpass || 'keep';
              check$1.commandParameter(fail, stencilOps, prop + '.fail', env.commandStr);
              check$1.commandParameter(zfail, stencilOps, prop + '.zfail', env.commandStr);
              check$1.commandParameter(zpass, stencilOps, prop + '.zpass', env.commandStr);
              return [
                prop === S_STENCIL_OPBACK ? GL_BACK : GL_FRONT,
                stencilOps[fail],
                stencilOps[zfail],
                stencilOps[zpass]
              ]
            },
            function (env, scope, value) {
              var STENCIL_OPS = env.constants.stencilOps;

              check$1.optional(function () {
                env.assert(scope,
                  value + '&&typeof ' + value + '==="object"',
                  'invalid ' + prop);
              });

              function read (name) {
                check$1.optional(function () {
                  env.assert(scope,
                    '!("' + name + '" in ' + value + ')||' +
                    '(' + value + '.' + name + ' in ' + STENCIL_OPS + ')',
                    'invalid ' + prop + '.' + name + ', must be one of ' + Object.keys(stencilOps));
                });

                return scope.def(
                  '"', name, '" in ', value,
                  '?', STENCIL_OPS, '[', value, '.', name, ']:',
                  GL_KEEP)
              }

              return [
                prop === S_STENCIL_OPBACK ? GL_BACK : GL_FRONT,
                read('fail'),
                read('zfail'),
                read('zpass')
              ]
            })

        case S_POLYGON_OFFSET_OFFSET:
          return parseParam(
            function (value) {
              check$1.commandType(value, 'object', param, env.commandStr);
              var factor = value.factor | 0;
              var units = value.units | 0;
              check$1.commandType(factor, 'number', param + '.factor', env.commandStr);
              check$1.commandType(units, 'number', param + '.units', env.commandStr);
              return [factor, units]
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  value + '&&typeof ' + value + '==="object"',
                  'invalid ' + prop);
              });

              var FACTOR = scope.def(value, '.factor|0');
              var UNITS = scope.def(value, '.units|0');

              return [FACTOR, UNITS]
            })

        case S_CULL_FACE:
          return parseParam(
            function (value) {
              var face = 0;
              if (value === 'front') {
                face = GL_FRONT;
              } else if (value === 'back') {
                face = GL_BACK;
              }
              check$1.command(!!face, param, env.commandStr);
              return face
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  value + '==="front"||' +
                  value + '==="back"',
                  'invalid cull.face');
              });
              return scope.def(value, '==="front"?', GL_FRONT, ':', GL_BACK)
            })

        case S_LINE_WIDTH:
          return parseParam(
            function (value) {
              check$1.command(
                typeof value === 'number' &&
                value >= limits.lineWidthDims[0] &&
                value <= limits.lineWidthDims[1],
                'invalid line width, must positive number between ' +
                limits.lineWidthDims[0] + ' and ' + limits.lineWidthDims[1], env.commandStr);
              return value
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  'typeof ' + value + '==="number"&&' +
                  value + '>=' + limits.lineWidthDims[0] + '&&' +
                  value + '<=' + limits.lineWidthDims[1],
                  'invalid line width');
              });

              return value
            })

        case S_FRONT_FACE:
          return parseParam(
            function (value) {
              check$1.commandParameter(value, orientationType, param, env.commandStr);
              return orientationType[value]
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  value + '==="cw"||' +
                  value + '==="ccw"',
                  'invalid frontFace, must be one of cw,ccw');
              });
              return scope.def(value + '==="cw"?' + GL_CW + ':' + GL_CCW)
            })

        case S_COLOR_MASK:
          return parseParam(
            function (value) {
              check$1.command(
                isArrayLike(value) && value.length === 4,
                'color.mask must be length 4 array', env.commandStr);
              return value.map(function (v) { return !!v })
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  env.shared.isArrayLike + '(' + value + ')&&' +
                  value + '.length===4',
                  'invalid color.mask');
              });
              return loop(4, function (i) {
                return '!!' + value + '[' + i + ']'
              })
            })

        case S_SAMPLE_COVERAGE:
          return parseParam(
            function (value) {
              check$1.command(typeof value === 'object' && value, param, env.commandStr);
              var sampleValue = 'value' in value ? value.value : 1;
              var sampleInvert = !!value.invert;
              check$1.command(
                typeof sampleValue === 'number' &&
                sampleValue >= 0 && sampleValue <= 1,
                'sample.coverage.value must be a number between 0 and 1', env.commandStr);
              return [sampleValue, sampleInvert]
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  value + '&&typeof ' + value + '==="object"',
                  'invalid sample.coverage');
              });
              var VALUE = scope.def(
                '"value" in ', value, '?+', value, '.value:1');
              var INVERT = scope.def('!!', value, '.invert');
              return [VALUE, INVERT]
            })
      }
    });

    return STATE
  }

  function parseUniforms (uniforms, env) {
    var staticUniforms = uniforms.static;
    var dynamicUniforms = uniforms.dynamic;

    var UNIFORMS = {};

    Object.keys(staticUniforms).forEach(function (name) {
      var value = staticUniforms[name];
      var result;
      if (typeof value === 'number' ||
          typeof value === 'boolean') {
        result = createStaticDecl(function () {
          return value
        });
      } else if (typeof value === 'function') {
        var reglType = value._reglType;
        if (reglType === 'texture2d' ||
            reglType === 'textureCube') {
          result = createStaticDecl(function (env) {
            return env.link(value)
          });
        } else if (reglType === 'framebuffer' ||
                   reglType === 'framebufferCube') {
          check$1.command(value.color.length > 0,
            'missing color attachment for framebuffer sent to uniform "' + name + '"', env.commandStr);
          result = createStaticDecl(function (env) {
            return env.link(value.color[0])
          });
        } else {
          check$1.commandRaise('invalid data for uniform "' + name + '"', env.commandStr);
        }
      } else if (isArrayLike(value)) {
        result = createStaticDecl(function (env) {
          var ITEM = env.global.def('[',
            loop(value.length, function (i) {
              check$1.command(
                typeof value[i] === 'number' ||
                typeof value[i] === 'boolean',
                'invalid uniform ' + name, env.commandStr);
              return value[i]
            }), ']');
          return ITEM
        });
      } else {
        check$1.commandRaise('invalid or missing data for uniform "' + name + '"', env.commandStr);
      }
      result.value = value;
      UNIFORMS[name] = result;
    });

    Object.keys(dynamicUniforms).forEach(function (key) {
      var dyn = dynamicUniforms[key];
      UNIFORMS[key] = createDynamicDecl(dyn, function (env, scope) {
        return env.invoke(scope, dyn)
      });
    });

    return UNIFORMS
  }

  function parseAttributes (attributes, env) {
    var staticAttributes = attributes.static;
    var dynamicAttributes = attributes.dynamic;

    var attributeDefs = {};

    Object.keys(staticAttributes).forEach(function (attribute) {
      var value = staticAttributes[attribute];
      var id = stringStore.id(attribute);

      var record = new AttributeRecord();
      if (isBufferArgs(value)) {
        record.state = ATTRIB_STATE_POINTER;
        record.buffer = bufferState.getBuffer(
          bufferState.create(value, GL_ARRAY_BUFFER$1, false, true));
        record.type = 0;
      } else {
        var buffer = bufferState.getBuffer(value);
        if (buffer) {
          record.state = ATTRIB_STATE_POINTER;
          record.buffer = buffer;
          record.type = 0;
        } else {
          check$1.command(typeof value === 'object' && value,
            'invalid data for attribute ' + attribute, env.commandStr);
          if (value.constant) {
            var constant = value.constant;
            record.buffer = 'null';
            record.state = ATTRIB_STATE_CONSTANT;
            if (typeof constant === 'number') {
              record.x = constant;
            } else {
              check$1.command(
                isArrayLike(constant) &&
                constant.length > 0 &&
                constant.length <= 4,
                'invalid constant for attribute ' + attribute, env.commandStr);
              CUTE_COMPONENTS.forEach(function (c, i) {
                if (i < constant.length) {
                  record[c] = constant[i];
                }
              });
            }
          } else {
            if (isBufferArgs(value.buffer)) {
              buffer = bufferState.getBuffer(
                bufferState.create(value.buffer, GL_ARRAY_BUFFER$1, false, true));
            } else {
              buffer = bufferState.getBuffer(value.buffer);
            }
            check$1.command(!!buffer, 'missing buffer for attribute "' + attribute + '"', env.commandStr);

            var offset = value.offset | 0;
            check$1.command(offset >= 0,
              'invalid offset for attribute "' + attribute + '"', env.commandStr);

            var stride = value.stride | 0;
            check$1.command(stride >= 0 && stride < 256,
              'invalid stride for attribute "' + attribute + '", must be integer betweeen [0, 255]', env.commandStr);

            var size = value.size | 0;
            check$1.command(!('size' in value) || (size > 0 && size <= 4),
              'invalid size for attribute "' + attribute + '", must be 1,2,3,4', env.commandStr);

            var normalized = !!value.normalized;

            var type = 0;
            if ('type' in value) {
              check$1.commandParameter(
                value.type, glTypes,
                'invalid type for attribute ' + attribute, env.commandStr);
              type = glTypes[value.type];
            }

            var divisor = value.divisor | 0;
            if ('divisor' in value) {
              check$1.command(divisor === 0 || extInstancing,
                'cannot specify divisor for attribute "' + attribute + '", instancing not supported', env.commandStr);
              check$1.command(divisor >= 0,
                'invalid divisor for attribute "' + attribute + '"', env.commandStr);
            }

            check$1.optional(function () {
              var command = env.commandStr;

              var VALID_KEYS = [
                'buffer',
                'offset',
                'divisor',
                'normalized',
                'type',
                'size',
                'stride'
              ];

              Object.keys(value).forEach(function (prop) {
                check$1.command(
                  VALID_KEYS.indexOf(prop) >= 0,
                  'unknown parameter "' + prop + '" for attribute pointer "' + attribute + '" (valid parameters are ' + VALID_KEYS + ')',
                  command);
              });
            });

            record.buffer = buffer;
            record.state = ATTRIB_STATE_POINTER;
            record.size = size;
            record.normalized = normalized;
            record.type = type || buffer.dtype;
            record.offset = offset;
            record.stride = stride;
            record.divisor = divisor;
          }
        }
      }

      attributeDefs[attribute] = createStaticDecl(function (env, scope) {
        var cache = env.attribCache;
        if (id in cache) {
          return cache[id]
        }
        var result = {
          isStream: false
        };
        Object.keys(record).forEach(function (key) {
          result[key] = record[key];
        });
        if (record.buffer) {
          result.buffer = env.link(record.buffer);
          result.type = result.type || (result.buffer + '.dtype');
        }
        cache[id] = result;
        return result
      });
    });

    Object.keys(dynamicAttributes).forEach(function (attribute) {
      var dyn = dynamicAttributes[attribute];

      function appendAttributeCode (env, block) {
        var VALUE = env.invoke(block, dyn);

        var shared = env.shared;

        var IS_BUFFER_ARGS = shared.isBufferArgs;
        var BUFFER_STATE = shared.buffer;

        // Perform validation on attribute
        check$1.optional(function () {
          env.assert(block,
            VALUE + '&&(typeof ' + VALUE + '==="object"||typeof ' +
            VALUE + '==="function")&&(' +
            IS_BUFFER_ARGS + '(' + VALUE + ')||' +
            BUFFER_STATE + '.getBuffer(' + VALUE + ')||' +
            BUFFER_STATE + '.getBuffer(' + VALUE + '.buffer)||' +
            IS_BUFFER_ARGS + '(' + VALUE + '.buffer)||' +
            '("constant" in ' + VALUE +
            '&&(typeof ' + VALUE + '.constant==="number"||' +
            shared.isArrayLike + '(' + VALUE + '.constant))))',
            'invalid dynamic attribute "' + attribute + '"');
        });

        // allocate names for result
        var result = {
          isStream: block.def(false)
        };
        var defaultRecord = new AttributeRecord();
        defaultRecord.state = ATTRIB_STATE_POINTER;
        Object.keys(defaultRecord).forEach(function (key) {
          result[key] = block.def('' + defaultRecord[key]);
        });

        var BUFFER = result.buffer;
        var TYPE = result.type;
        block(
          'if(', IS_BUFFER_ARGS, '(', VALUE, ')){',
          result.isStream, '=true;',
          BUFFER, '=', BUFFER_STATE, '.createStream(', GL_ARRAY_BUFFER$1, ',', VALUE, ');',
          TYPE, '=', BUFFER, '.dtype;',
          '}else{',
          BUFFER, '=', BUFFER_STATE, '.getBuffer(', VALUE, ');',
          'if(', BUFFER, '){',
          TYPE, '=', BUFFER, '.dtype;',
          '}else if("constant" in ', VALUE, '){',
          result.state, '=', ATTRIB_STATE_CONSTANT, ';',
          'if(typeof ' + VALUE + '.constant === "number"){',
          result[CUTE_COMPONENTS[0]], '=', VALUE, '.constant;',
          CUTE_COMPONENTS.slice(1).map(function (n) {
            return result[n]
          }).join('='), '=0;',
          '}else{',
          CUTE_COMPONENTS.map(function (name, i) {
            return (
              result[name] + '=' + VALUE + '.constant.length>=' + i +
              '?' + VALUE + '.constant[' + i + ']:0;'
            )
          }).join(''),
          '}}else{',
          'if(', IS_BUFFER_ARGS, '(', VALUE, '.buffer)){',
          BUFFER, '=', BUFFER_STATE, '.createStream(', GL_ARRAY_BUFFER$1, ',', VALUE, '.buffer);',
          '}else{',
          BUFFER, '=', BUFFER_STATE, '.getBuffer(', VALUE, '.buffer);',
          '}',
          TYPE, '="type" in ', VALUE, '?',
          shared.glTypes, '[', VALUE, '.type]:', BUFFER, '.dtype;',
          result.normalized, '=!!', VALUE, '.normalized;');
        function emitReadRecord (name) {
          block(result[name], '=', VALUE, '.', name, '|0;');
        }
        emitReadRecord('size');
        emitReadRecord('offset');
        emitReadRecord('stride');
        emitReadRecord('divisor');

        block('}}');

        block.exit(
          'if(', result.isStream, '){',
          BUFFER_STATE, '.destroyStream(', BUFFER, ');',
          '}');

        return result
      }

      attributeDefs[attribute] = createDynamicDecl(dyn, appendAttributeCode);
    });

    return attributeDefs
  }

  function parseContext (context) {
    var staticContext = context.static;
    var dynamicContext = context.dynamic;
    var result = {};

    Object.keys(staticContext).forEach(function (name) {
      var value = staticContext[name];
      result[name] = createStaticDecl(function (env, scope) {
        if (typeof value === 'number' || typeof value === 'boolean') {
          return '' + value
        } else {
          return env.link(value)
        }
      });
    });

    Object.keys(dynamicContext).forEach(function (name) {
      var dyn = dynamicContext[name];
      result[name] = createDynamicDecl(dyn, function (env, scope) {
        return env.invoke(scope, dyn)
      });
    });

    return result
  }

  function parseArguments (options, attributes, uniforms, context, env) {
    var staticOptions = options.static;
    var dynamicOptions = options.dynamic;

    check$1.optional(function () {
      var KEY_NAMES = [
        S_FRAMEBUFFER,
        S_VERT,
        S_FRAG,
        S_ELEMENTS,
        S_PRIMITIVE,
        S_OFFSET,
        S_COUNT,
        S_INSTANCES,
        S_PROFILE
      ].concat(GL_STATE_NAMES);

      function checkKeys (dict) {
        Object.keys(dict).forEach(function (key) {
          check$1.command(
            KEY_NAMES.indexOf(key) >= 0,
            'unknown parameter "' + key + '"',
            env.commandStr);
        });
      }

      checkKeys(staticOptions);
      checkKeys(dynamicOptions);
    });

    var framebuffer = parseFramebuffer(options, env);
    var viewportAndScissor = parseViewportScissor(options, framebuffer, env);
    var draw = parseDraw(options, env);
    var state = parseGLState(options, env);
    var shader = parseProgram(options, env);

    function copyBox (name) {
      var defn = viewportAndScissor[name];
      if (defn) {
        state[name] = defn;
      }
    }
    copyBox(S_VIEWPORT);
    copyBox(propName(S_SCISSOR_BOX));

    var dirty = Object.keys(state).length > 0;

    var result = {
      framebuffer: framebuffer,
      draw: draw,
      shader: shader,
      state: state,
      dirty: dirty
    };

    result.profile = parseProfile(options, env);
    result.uniforms = parseUniforms(uniforms, env);
    result.attributes = parseAttributes(attributes, env);
    result.context = parseContext(context, env);
    return result
  }

  // ===================================================
  // ===================================================
  // COMMON UPDATE FUNCTIONS
  // ===================================================
  // ===================================================
  function emitContext (env, scope, context) {
    var shared = env.shared;
    var CONTEXT = shared.context;

    var contextEnter = env.scope();

    Object.keys(context).forEach(function (name) {
      scope.save(CONTEXT, '.' + name);
      var defn = context[name];
      contextEnter(CONTEXT, '.', name, '=', defn.append(env, scope), ';');
    });

    scope(contextEnter);
  }

  // ===================================================
  // ===================================================
  // COMMON DRAWING FUNCTIONS
  // ===================================================
  // ===================================================
  function emitPollFramebuffer (env, scope, framebuffer, skipCheck) {
    var shared = env.shared;

    var GL = shared.gl;
    var FRAMEBUFFER_STATE = shared.framebuffer;
    var EXT_DRAW_BUFFERS;
    if (extDrawBuffers) {
      EXT_DRAW_BUFFERS = scope.def(shared.extensions, '.webgl_draw_buffers');
    }

    var constants = env.constants;

    var DRAW_BUFFERS = constants.drawBuffer;
    var BACK_BUFFER = constants.backBuffer;

    var NEXT;
    if (framebuffer) {
      NEXT = framebuffer.append(env, scope);
    } else {
      NEXT = scope.def(FRAMEBUFFER_STATE, '.next');
    }

    if (!skipCheck) {
      scope('if(', NEXT, '!==', FRAMEBUFFER_STATE, '.cur){');
    }
    scope(
      'if(', NEXT, '){',
      GL, '.bindFramebuffer(', GL_FRAMEBUFFER$1, ',', NEXT, '.framebuffer);');
    if (extDrawBuffers) {
      scope(EXT_DRAW_BUFFERS, '.drawBuffersWEBGL(',
        DRAW_BUFFERS, '[', NEXT, '.colorAttachments.length]);');
    }
    scope('}else{',
      GL, '.bindFramebuffer(', GL_FRAMEBUFFER$1, ',null);');
    if (extDrawBuffers) {
      scope(EXT_DRAW_BUFFERS, '.drawBuffersWEBGL(', BACK_BUFFER, ');');
    }
    scope(
      '}',
      FRAMEBUFFER_STATE, '.cur=', NEXT, ';');
    if (!skipCheck) {
      scope('}');
    }
  }

  function emitPollState (env, scope, args) {
    var shared = env.shared;

    var GL = shared.gl;

    var CURRENT_VARS = env.current;
    var NEXT_VARS = env.next;
    var CURRENT_STATE = shared.current;
    var NEXT_STATE = shared.next;

    var block = env.cond(CURRENT_STATE, '.dirty');

    GL_STATE_NAMES.forEach(function (prop) {
      var param = propName(prop);
      if (param in args.state) {
        return
      }

      var NEXT, CURRENT;
      if (param in NEXT_VARS) {
        NEXT = NEXT_VARS[param];
        CURRENT = CURRENT_VARS[param];
        var parts = loop(currentState[param].length, function (i) {
          return block.def(NEXT, '[', i, ']')
        });
        block(env.cond(parts.map(function (p, i) {
          return p + '!==' + CURRENT + '[' + i + ']'
        }).join('||'))
          .then(
            GL, '.', GL_VARIABLES[param], '(', parts, ');',
            parts.map(function (p, i) {
              return CURRENT + '[' + i + ']=' + p
            }).join(';'), ';'));
      } else {
        NEXT = block.def(NEXT_STATE, '.', param);
        var ifte = env.cond(NEXT, '!==', CURRENT_STATE, '.', param);
        block(ifte);
        if (param in GL_FLAGS) {
          ifte(
            env.cond(NEXT)
                .then(GL, '.enable(', GL_FLAGS[param], ');')
                .else(GL, '.disable(', GL_FLAGS[param], ');'),
            CURRENT_STATE, '.', param, '=', NEXT, ';');
        } else {
          ifte(
            GL, '.', GL_VARIABLES[param], '(', NEXT, ');',
            CURRENT_STATE, '.', param, '=', NEXT, ';');
        }
      }
    });
    if (Object.keys(args.state).length === 0) {
      block(CURRENT_STATE, '.dirty=false;');
    }
    scope(block);
  }

  function emitSetOptions (env, scope, options, filter) {
    var shared = env.shared;
    var CURRENT_VARS = env.current;
    var CURRENT_STATE = shared.current;
    var GL = shared.gl;
    sortState(Object.keys(options)).forEach(function (param) {
      var defn = options[param];
      if (filter && !filter(defn)) {
        return
      }
      var variable = defn.append(env, scope);
      if (GL_FLAGS[param]) {
        var flag = GL_FLAGS[param];
        if (isStatic(defn)) {
          if (variable) {
            scope(GL, '.enable(', flag, ');');
          } else {
            scope(GL, '.disable(', flag, ');');
          }
        } else {
          scope(env.cond(variable)
            .then(GL, '.enable(', flag, ');')
            .else(GL, '.disable(', flag, ');'));
        }
        scope(CURRENT_STATE, '.', param, '=', variable, ';');
      } else if (isArrayLike(variable)) {
        var CURRENT = CURRENT_VARS[param];
        scope(
          GL, '.', GL_VARIABLES[param], '(', variable, ');',
          variable.map(function (v, i) {
            return CURRENT + '[' + i + ']=' + v
          }).join(';'), ';');
      } else {
        scope(
          GL, '.', GL_VARIABLES[param], '(', variable, ');',
          CURRENT_STATE, '.', param, '=', variable, ';');
      }
    });
  }

  function injectExtensions (env, scope) {
    if (extInstancing) {
      env.instancing = scope.def(
        env.shared.extensions, '.angle_instanced_arrays');
    }
  }

  function emitProfile (env, scope, args, useScope, incrementCounter) {
    var shared = env.shared;
    var STATS = env.stats;
    var CURRENT_STATE = shared.current;
    var TIMER = shared.timer;
    var profileArg = args.profile;

    function perfCounter () {
      if (typeof performance === 'undefined') {
        return 'Date.now()'
      } else {
        return 'performance.now()'
      }
    }

    var CPU_START, QUERY_COUNTER;
    function emitProfileStart (block) {
      CPU_START = scope.def();
      block(CPU_START, '=', perfCounter(), ';');
      if (typeof incrementCounter === 'string') {
        block(STATS, '.count+=', incrementCounter, ';');
      } else {
        block(STATS, '.count++;');
      }
      if (timer) {
        if (useScope) {
          QUERY_COUNTER = scope.def();
          block(QUERY_COUNTER, '=', TIMER, '.getNumPendingQueries();');
        } else {
          block(TIMER, '.beginQuery(', STATS, ');');
        }
      }
    }

    function emitProfileEnd (block) {
      block(STATS, '.cpuTime+=', perfCounter(), '-', CPU_START, ';');
      if (timer) {
        if (useScope) {
          block(TIMER, '.pushScopeStats(',
            QUERY_COUNTER, ',',
            TIMER, '.getNumPendingQueries(),',
            STATS, ');');
        } else {
          block(TIMER, '.endQuery();');
        }
      }
    }

    function scopeProfile (value) {
      var prev = scope.def(CURRENT_STATE, '.profile');
      scope(CURRENT_STATE, '.profile=', value, ';');
      scope.exit(CURRENT_STATE, '.profile=', prev, ';');
    }

    var USE_PROFILE;
    if (profileArg) {
      if (isStatic(profileArg)) {
        if (profileArg.enable) {
          emitProfileStart(scope);
          emitProfileEnd(scope.exit);
          scopeProfile('true');
        } else {
          scopeProfile('false');
        }
        return
      }
      USE_PROFILE = profileArg.append(env, scope);
      scopeProfile(USE_PROFILE);
    } else {
      USE_PROFILE = scope.def(CURRENT_STATE, '.profile');
    }

    var start = env.block();
    emitProfileStart(start);
    scope('if(', USE_PROFILE, '){', start, '}');
    var end = env.block();
    emitProfileEnd(end);
    scope.exit('if(', USE_PROFILE, '){', end, '}');
  }

  function emitAttributes (env, scope, args, attributes, filter) {
    var shared = env.shared;

    function typeLength (x) {
      switch (x) {
        case GL_FLOAT_VEC2:
        case GL_INT_VEC2:
        case GL_BOOL_VEC2:
          return 2
        case GL_FLOAT_VEC3:
        case GL_INT_VEC3:
        case GL_BOOL_VEC3:
          return 3
        case GL_FLOAT_VEC4:
        case GL_INT_VEC4:
        case GL_BOOL_VEC4:
          return 4
        default:
          return 1
      }
    }

    function emitBindAttribute (ATTRIBUTE, size, record) {
      var GL = shared.gl;

      var LOCATION = scope.def(ATTRIBUTE, '.location');
      var BINDING = scope.def(shared.attributes, '[', LOCATION, ']');

      var STATE = record.state;
      var BUFFER = record.buffer;
      var CONST_COMPONENTS = [
        record.x,
        record.y,
        record.z,
        record.w
      ];

      var COMMON_KEYS = [
        'buffer',
        'normalized',
        'offset',
        'stride'
      ];

      function emitBuffer () {
        scope(
          'if(!', BINDING, '.buffer){',
          GL, '.enableVertexAttribArray(', LOCATION, ');}');

        var TYPE = record.type;
        var SIZE;
        if (!record.size) {
          SIZE = size;
        } else {
          SIZE = scope.def(record.size, '||', size);
        }

        scope('if(',
          BINDING, '.type!==', TYPE, '||',
          BINDING, '.size!==', SIZE, '||',
          COMMON_KEYS.map(function (key) {
            return BINDING + '.' + key + '!==' + record[key]
          }).join('||'),
          '){',
          GL, '.bindBuffer(', GL_ARRAY_BUFFER$1, ',', BUFFER, '.buffer);',
          GL, '.vertexAttribPointer(', [
            LOCATION,
            SIZE,
            TYPE,
            record.normalized,
            record.stride,
            record.offset
          ], ');',
          BINDING, '.type=', TYPE, ';',
          BINDING, '.size=', SIZE, ';',
          COMMON_KEYS.map(function (key) {
            return BINDING + '.' + key + '=' + record[key] + ';'
          }).join(''),
          '}');

        if (extInstancing) {
          var DIVISOR = record.divisor;
          scope(
            'if(', BINDING, '.divisor!==', DIVISOR, '){',
            env.instancing, '.vertexAttribDivisorANGLE(', [LOCATION, DIVISOR], ');',
            BINDING, '.divisor=', DIVISOR, ';}');
        }
      }

      function emitConstant () {
        scope(
          'if(', BINDING, '.buffer){',
          GL, '.disableVertexAttribArray(', LOCATION, ');',
          '}if(', CUTE_COMPONENTS.map(function (c, i) {
            return BINDING + '.' + c + '!==' + CONST_COMPONENTS[i]
          }).join('||'), '){',
          GL, '.vertexAttrib4f(', LOCATION, ',', CONST_COMPONENTS, ');',
          CUTE_COMPONENTS.map(function (c, i) {
            return BINDING + '.' + c + '=' + CONST_COMPONENTS[i] + ';'
          }).join(''),
          '}');
      }

      if (STATE === ATTRIB_STATE_POINTER) {
        emitBuffer();
      } else if (STATE === ATTRIB_STATE_CONSTANT) {
        emitConstant();
      } else {
        scope('if(', STATE, '===', ATTRIB_STATE_POINTER, '){');
        emitBuffer();
        scope('}else{');
        emitConstant();
        scope('}');
      }
    }

    attributes.forEach(function (attribute) {
      var name = attribute.name;
      var arg = args.attributes[name];
      var record;
      if (arg) {
        if (!filter(arg)) {
          return
        }
        record = arg.append(env, scope);
      } else {
        if (!filter(SCOPE_DECL)) {
          return
        }
        var scopeAttrib = env.scopeAttrib(name);
        check$1.optional(function () {
          env.assert(scope,
            scopeAttrib + '.state',
            'missing attribute ' + name);
        });
        record = {};
        Object.keys(new AttributeRecord()).forEach(function (key) {
          record[key] = scope.def(scopeAttrib, '.', key);
        });
      }
      emitBindAttribute(
        env.link(attribute), typeLength(attribute.info.type), record);
    });
  }

  function emitUniforms (env, scope, args, uniforms, filter) {
    var shared = env.shared;
    var GL = shared.gl;

    var infix;
    for (var i = 0; i < uniforms.length; ++i) {
      var uniform = uniforms[i];
      var name = uniform.name;
      var type = uniform.info.type;
      var arg = args.uniforms[name];
      var UNIFORM = env.link(uniform);
      var LOCATION = UNIFORM + '.location';

      var VALUE;
      if (arg) {
        if (!filter(arg)) {
          continue
        }
        if (isStatic(arg)) {
          var value = arg.value;
          check$1.command(
            value !== null && typeof value !== 'undefined',
            'missing uniform "' + name + '"', env.commandStr);
          if (type === GL_SAMPLER_2D || type === GL_SAMPLER_CUBE) {
            check$1.command(
              typeof value === 'function' &&
              ((type === GL_SAMPLER_2D &&
                (value._reglType === 'texture2d' ||
                value._reglType === 'framebuffer')) ||
              (type === GL_SAMPLER_CUBE &&
                (value._reglType === 'textureCube' ||
                value._reglType === 'framebufferCube'))),
              'invalid texture for uniform ' + name, env.commandStr);
            var TEX_VALUE = env.link(value._texture || value.color[0]._texture);
            scope(GL, '.uniform1i(', LOCATION, ',', TEX_VALUE + '.bind());');
            scope.exit(TEX_VALUE, '.unbind();');
          } else if (
            type === GL_FLOAT_MAT2 ||
            type === GL_FLOAT_MAT3 ||
            type === GL_FLOAT_MAT4) {
            check$1.optional(function () {
              check$1.command(isArrayLike(value),
                'invalid matrix for uniform ' + name, env.commandStr);
              check$1.command(
                (type === GL_FLOAT_MAT2 && value.length === 4) ||
                (type === GL_FLOAT_MAT3 && value.length === 9) ||
                (type === GL_FLOAT_MAT4 && value.length === 16),
                'invalid length for matrix uniform ' + name, env.commandStr);
            });
            var MAT_VALUE = env.global.def('new Float32Array([' +
              Array.prototype.slice.call(value) + '])');
            var dim = 2;
            if (type === GL_FLOAT_MAT3) {
              dim = 3;
            } else if (type === GL_FLOAT_MAT4) {
              dim = 4;
            }
            scope(
              GL, '.uniformMatrix', dim, 'fv(',
              LOCATION, ',false,', MAT_VALUE, ');');
          } else {
            switch (type) {
              case GL_FLOAT$7:
                check$1.commandType(value, 'number', 'uniform ' + name, env.commandStr);
                infix = '1f';
                break
              case GL_FLOAT_VEC2:
                check$1.command(
                  isArrayLike(value) && value.length === 2,
                  'uniform ' + name, env.commandStr);
                infix = '2f';
                break
              case GL_FLOAT_VEC3:
                check$1.command(
                  isArrayLike(value) && value.length === 3,
                  'uniform ' + name, env.commandStr);
                infix = '3f';
                break
              case GL_FLOAT_VEC4:
                check$1.command(
                  isArrayLike(value) && value.length === 4,
                  'uniform ' + name, env.commandStr);
                infix = '4f';
                break
              case GL_BOOL:
                check$1.commandType(value, 'boolean', 'uniform ' + name, env.commandStr);
                infix = '1i';
                break
              case GL_INT$3:
                check$1.commandType(value, 'number', 'uniform ' + name, env.commandStr);
                infix = '1i';
                break
              case GL_BOOL_VEC2:
                check$1.command(
                  isArrayLike(value) && value.length === 2,
                  'uniform ' + name, env.commandStr);
                infix = '2i';
                break
              case GL_INT_VEC2:
                check$1.command(
                  isArrayLike(value) && value.length === 2,
                  'uniform ' + name, env.commandStr);
                infix = '2i';
                break
              case GL_BOOL_VEC3:
                check$1.command(
                  isArrayLike(value) && value.length === 3,
                  'uniform ' + name, env.commandStr);
                infix = '3i';
                break
              case GL_INT_VEC3:
                check$1.command(
                  isArrayLike(value) && value.length === 3,
                  'uniform ' + name, env.commandStr);
                infix = '3i';
                break
              case GL_BOOL_VEC4:
                check$1.command(
                  isArrayLike(value) && value.length === 4,
                  'uniform ' + name, env.commandStr);
                infix = '4i';
                break
              case GL_INT_VEC4:
                check$1.command(
                  isArrayLike(value) && value.length === 4,
                  'uniform ' + name, env.commandStr);
                infix = '4i';
                break
            }
            scope(GL, '.uniform', infix, '(', LOCATION, ',',
              isArrayLike(value) ? Array.prototype.slice.call(value) : value,
              ');');
          }
          continue
        } else {
          VALUE = arg.append(env, scope);
        }
      } else {
        if (!filter(SCOPE_DECL)) {
          continue
        }
        VALUE = scope.def(shared.uniforms, '[', stringStore.id(name), ']');
      }

      if (type === GL_SAMPLER_2D) {
        scope(
          'if(', VALUE, '&&', VALUE, '._reglType==="framebuffer"){',
          VALUE, '=', VALUE, '.color[0];',
          '}');
      } else if (type === GL_SAMPLER_CUBE) {
        scope(
          'if(', VALUE, '&&', VALUE, '._reglType==="framebufferCube"){',
          VALUE, '=', VALUE, '.color[0];',
          '}');
      }

      // perform type validation
      check$1.optional(function () {
        function check (pred, message) {
          env.assert(scope, pred,
            'bad data or missing for uniform "' + name + '".  ' + message);
        }

        function checkType (type) {
          check(
            'typeof ' + VALUE + '==="' + type + '"',
            'invalid type, expected ' + type);
        }

        function checkVector (n, type) {
          check(
            shared.isArrayLike + '(' + VALUE + ')&&' + VALUE + '.length===' + n,
            'invalid vector, should have length ' + n, env.commandStr);
        }

        function checkTexture (target) {
          check(
            'typeof ' + VALUE + '==="function"&&' +
            VALUE + '._reglType==="texture' +
            (target === GL_TEXTURE_2D$2 ? '2d' : 'Cube') + '"',
            'invalid texture type', env.commandStr);
        }

        switch (type) {
          case GL_INT$3:
            checkType('number');
            break
          case GL_INT_VEC2:
            checkVector(2, 'number');
            break
          case GL_INT_VEC3:
            checkVector(3, 'number');
            break
          case GL_INT_VEC4:
            checkVector(4, 'number');
            break
          case GL_FLOAT$7:
            checkType('number');
            break
          case GL_FLOAT_VEC2:
            checkVector(2, 'number');
            break
          case GL_FLOAT_VEC3:
            checkVector(3, 'number');
            break
          case GL_FLOAT_VEC4:
            checkVector(4, 'number');
            break
          case GL_BOOL:
            checkType('boolean');
            break
          case GL_BOOL_VEC2:
            checkVector(2, 'boolean');
            break
          case GL_BOOL_VEC3:
            checkVector(3, 'boolean');
            break
          case GL_BOOL_VEC4:
            checkVector(4, 'boolean');
            break
          case GL_FLOAT_MAT2:
            checkVector(4, 'number');
            break
          case GL_FLOAT_MAT3:
            checkVector(9, 'number');
            break
          case GL_FLOAT_MAT4:
            checkVector(16, 'number');
            break
          case GL_SAMPLER_2D:
            checkTexture(GL_TEXTURE_2D$2);
            break
          case GL_SAMPLER_CUBE:
            checkTexture(GL_TEXTURE_CUBE_MAP$1);
            break
        }
      });

      var unroll = 1;
      switch (type) {
        case GL_SAMPLER_2D:
        case GL_SAMPLER_CUBE:
          var TEX = scope.def(VALUE, '._texture');
          scope(GL, '.uniform1i(', LOCATION, ',', TEX, '.bind());');
          scope.exit(TEX, '.unbind();');
          continue

        case GL_INT$3:
        case GL_BOOL:
          infix = '1i';
          break

        case GL_INT_VEC2:
        case GL_BOOL_VEC2:
          infix = '2i';
          unroll = 2;
          break

        case GL_INT_VEC3:
        case GL_BOOL_VEC3:
          infix = '3i';
          unroll = 3;
          break

        case GL_INT_VEC4:
        case GL_BOOL_VEC4:
          infix = '4i';
          unroll = 4;
          break

        case GL_FLOAT$7:
          infix = '1f';
          break

        case GL_FLOAT_VEC2:
          infix = '2f';
          unroll = 2;
          break

        case GL_FLOAT_VEC3:
          infix = '3f';
          unroll = 3;
          break

        case GL_FLOAT_VEC4:
          infix = '4f';
          unroll = 4;
          break

        case GL_FLOAT_MAT2:
          infix = 'Matrix2fv';
          break

        case GL_FLOAT_MAT3:
          infix = 'Matrix3fv';
          break

        case GL_FLOAT_MAT4:
          infix = 'Matrix4fv';
          break
      }

      scope(GL, '.uniform', infix, '(', LOCATION, ',');
      if (infix.charAt(0) === 'M') {
        var matSize = Math.pow(type - GL_FLOAT_MAT2 + 2, 2);
        var STORAGE = env.global.def('new Float32Array(', matSize, ')');
        scope(
          'false,(Array.isArray(', VALUE, ')||', VALUE, ' instanceof Float32Array)?', VALUE, ':(',
          loop(matSize, function (i) {
            return STORAGE + '[' + i + ']=' + VALUE + '[' + i + ']'
          }), ',', STORAGE, ')');
      } else if (unroll > 1) {
        scope(loop(unroll, function (i) {
          return VALUE + '[' + i + ']'
        }));
      } else {
        scope(VALUE);
      }
      scope(');');
    }
  }

  function emitDraw (env, outer, inner, args) {
    var shared = env.shared;
    var GL = shared.gl;
    var DRAW_STATE = shared.draw;

    var drawOptions = args.draw;

    function emitElements () {
      var defn = drawOptions.elements;
      var ELEMENTS;
      var scope = outer;
      if (defn) {
        if ((defn.contextDep && args.contextDynamic) || defn.propDep) {
          scope = inner;
        }
        ELEMENTS = defn.append(env, scope);
      } else {
        ELEMENTS = scope.def(DRAW_STATE, '.', S_ELEMENTS);
      }
      if (ELEMENTS) {
        scope(
          'if(' + ELEMENTS + ')' +
          GL + '.bindBuffer(' + GL_ELEMENT_ARRAY_BUFFER$1 + ',' + ELEMENTS + '.buffer.buffer);');
      }
      return ELEMENTS
    }

    function emitCount () {
      var defn = drawOptions.count;
      var COUNT;
      var scope = outer;
      if (defn) {
        if ((defn.contextDep && args.contextDynamic) || defn.propDep) {
          scope = inner;
        }
        COUNT = defn.append(env, scope);
        check$1.optional(function () {
          if (defn.MISSING) {
            env.assert(outer, 'false', 'missing vertex count');
          }
          if (defn.DYNAMIC) {
            env.assert(scope, COUNT + '>=0', 'missing vertex count');
          }
        });
      } else {
        COUNT = scope.def(DRAW_STATE, '.', S_COUNT);
        check$1.optional(function () {
          env.assert(scope, COUNT + '>=0', 'missing vertex count');
        });
      }
      return COUNT
    }

    var ELEMENTS = emitElements();
    function emitValue (name) {
      var defn = drawOptions[name];
      if (defn) {
        if ((defn.contextDep && args.contextDynamic) || defn.propDep) {
          return defn.append(env, inner)
        } else {
          return defn.append(env, outer)
        }
      } else {
        return outer.def(DRAW_STATE, '.', name)
      }
    }

    var PRIMITIVE = emitValue(S_PRIMITIVE);
    var OFFSET = emitValue(S_OFFSET);

    var COUNT = emitCount();
    if (typeof COUNT === 'number') {
      if (COUNT === 0) {
        return
      }
    } else {
      inner('if(', COUNT, '){');
      inner.exit('}');
    }

    var INSTANCES, EXT_INSTANCING;
    if (extInstancing) {
      INSTANCES = emitValue(S_INSTANCES);
      EXT_INSTANCING = env.instancing;
    }

    var ELEMENT_TYPE = ELEMENTS + '.type';

    var elementsStatic = drawOptions.elements && isStatic(drawOptions.elements);

    function emitInstancing () {
      function drawElements () {
        inner(EXT_INSTANCING, '.drawElementsInstancedANGLE(', [
          PRIMITIVE,
          COUNT,
          ELEMENT_TYPE,
          OFFSET + '<<((' + ELEMENT_TYPE + '-' + GL_UNSIGNED_BYTE$7 + ')>>1)',
          INSTANCES
        ], ');');
      }

      function drawArrays () {
        inner(EXT_INSTANCING, '.drawArraysInstancedANGLE(',
          [PRIMITIVE, OFFSET, COUNT, INSTANCES], ');');
      }

      if (ELEMENTS) {
        if (!elementsStatic) {
          inner('if(', ELEMENTS, '){');
          drawElements();
          inner('}else{');
          drawArrays();
          inner('}');
        } else {
          drawElements();
        }
      } else {
        drawArrays();
      }
    }

    function emitRegular () {
      function drawElements () {
        inner(GL + '.drawElements(' + [
          PRIMITIVE,
          COUNT,
          ELEMENT_TYPE,
          OFFSET + '<<((' + ELEMENT_TYPE + '-' + GL_UNSIGNED_BYTE$7 + ')>>1)'
        ] + ');');
      }

      function drawArrays () {
        inner(GL + '.drawArrays(' + [PRIMITIVE, OFFSET, COUNT] + ');');
      }

      if (ELEMENTS) {
        if (!elementsStatic) {
          inner('if(', ELEMENTS, '){');
          drawElements();
          inner('}else{');
          drawArrays();
          inner('}');
        } else {
          drawElements();
        }
      } else {
        drawArrays();
      }
    }

    if (extInstancing && (typeof INSTANCES !== 'number' || INSTANCES >= 0)) {
      if (typeof INSTANCES === 'string') {
        inner('if(', INSTANCES, '>0){');
        emitInstancing();
        inner('}else if(', INSTANCES, '<0){');
        emitRegular();
        inner('}');
      } else {
        emitInstancing();
      }
    } else {
      emitRegular();
    }
  }

  function createBody (emitBody, parentEnv, args, program, count) {
    var env = createREGLEnvironment();
    var scope = env.proc('body', count);
    check$1.optional(function () {
      env.commandStr = parentEnv.commandStr;
      env.command = env.link(parentEnv.commandStr);
    });
    if (extInstancing) {
      env.instancing = scope.def(
        env.shared.extensions, '.angle_instanced_arrays');
    }
    emitBody(env, scope, args, program);
    return env.compile().body
  }

  // ===================================================
  // ===================================================
  // DRAW PROC
  // ===================================================
  // ===================================================
  function emitDrawBody (env, draw, args, program) {
    injectExtensions(env, draw);
    emitAttributes(env, draw, args, program.attributes, function () {
      return true
    });
    emitUniforms(env, draw, args, program.uniforms, function () {
      return true
    });
    emitDraw(env, draw, draw, args);
  }

  function emitDrawProc (env, args) {
    var draw = env.proc('draw', 1);

    injectExtensions(env, draw);

    emitContext(env, draw, args.context);
    emitPollFramebuffer(env, draw, args.framebuffer);

    emitPollState(env, draw, args);
    emitSetOptions(env, draw, args.state);

    emitProfile(env, draw, args, false, true);

    var program = args.shader.progVar.append(env, draw);
    draw(env.shared.gl, '.useProgram(', program, '.program);');

    if (args.shader.program) {
      emitDrawBody(env, draw, args, args.shader.program);
    } else {
      var drawCache = env.global.def('{}');
      var PROG_ID = draw.def(program, '.id');
      var CACHED_PROC = draw.def(drawCache, '[', PROG_ID, ']');
      draw(
        env.cond(CACHED_PROC)
          .then(CACHED_PROC, '.call(this,a0);')
          .else(
            CACHED_PROC, '=', drawCache, '[', PROG_ID, ']=',
            env.link(function (program) {
              return createBody(emitDrawBody, env, args, program, 1)
            }), '(', program, ');',
            CACHED_PROC, '.call(this,a0);'));
    }

    if (Object.keys(args.state).length > 0) {
      draw(env.shared.current, '.dirty=true;');
    }
  }

  // ===================================================
  // ===================================================
  // BATCH PROC
  // ===================================================
  // ===================================================

  function emitBatchDynamicShaderBody (env, scope, args, program) {
    env.batchId = 'a1';

    injectExtensions(env, scope);

    function all () {
      return true
    }

    emitAttributes(env, scope, args, program.attributes, all);
    emitUniforms(env, scope, args, program.uniforms, all);
    emitDraw(env, scope, scope, args);
  }

  function emitBatchBody (env, scope, args, program) {
    injectExtensions(env, scope);

    var contextDynamic = args.contextDep;

    var BATCH_ID = scope.def();
    var PROP_LIST = 'a0';
    var NUM_PROPS = 'a1';
    var PROPS = scope.def();
    env.shared.props = PROPS;
    env.batchId = BATCH_ID;

    var outer = env.scope();
    var inner = env.scope();

    scope(
      outer.entry,
      'for(', BATCH_ID, '=0;', BATCH_ID, '<', NUM_PROPS, ';++', BATCH_ID, '){',
      PROPS, '=', PROP_LIST, '[', BATCH_ID, '];',
      inner,
      '}',
      outer.exit);

    function isInnerDefn (defn) {
      return ((defn.contextDep && contextDynamic) || defn.propDep)
    }

    function isOuterDefn (defn) {
      return !isInnerDefn(defn)
    }

    if (args.needsContext) {
      emitContext(env, inner, args.context);
    }
    if (args.needsFramebuffer) {
      emitPollFramebuffer(env, inner, args.framebuffer);
    }
    emitSetOptions(env, inner, args.state, isInnerDefn);

    if (args.profile && isInnerDefn(args.profile)) {
      emitProfile(env, inner, args, false, true);
    }

    if (!program) {
      var progCache = env.global.def('{}');
      var PROGRAM = args.shader.progVar.append(env, inner);
      var PROG_ID = inner.def(PROGRAM, '.id');
      var CACHED_PROC = inner.def(progCache, '[', PROG_ID, ']');
      inner(
        env.shared.gl, '.useProgram(', PROGRAM, '.program);',
        'if(!', CACHED_PROC, '){',
        CACHED_PROC, '=', progCache, '[', PROG_ID, ']=',
        env.link(function (program) {
          return createBody(
            emitBatchDynamicShaderBody, env, args, program, 2)
        }), '(', PROGRAM, ');}',
        CACHED_PROC, '.call(this,a0[', BATCH_ID, '],', BATCH_ID, ');');
    } else {
      emitAttributes(env, outer, args, program.attributes, isOuterDefn);
      emitAttributes(env, inner, args, program.attributes, isInnerDefn);
      emitUniforms(env, outer, args, program.uniforms, isOuterDefn);
      emitUniforms(env, inner, args, program.uniforms, isInnerDefn);
      emitDraw(env, outer, inner, args);
    }
  }

  function emitBatchProc (env, args) {
    var batch = env.proc('batch', 2);
    env.batchId = '0';

    injectExtensions(env, batch);

    // Check if any context variables depend on props
    var contextDynamic = false;
    var needsContext = true;
    Object.keys(args.context).forEach(function (name) {
      contextDynamic = contextDynamic || args.context[name].propDep;
    });
    if (!contextDynamic) {
      emitContext(env, batch, args.context);
      needsContext = false;
    }

    // framebuffer state affects framebufferWidth/height context vars
    var framebuffer = args.framebuffer;
    var needsFramebuffer = false;
    if (framebuffer) {
      if (framebuffer.propDep) {
        contextDynamic = needsFramebuffer = true;
      } else if (framebuffer.contextDep && contextDynamic) {
        needsFramebuffer = true;
      }
      if (!needsFramebuffer) {
        emitPollFramebuffer(env, batch, framebuffer);
      }
    } else {
      emitPollFramebuffer(env, batch, null);
    }

    // viewport is weird because it can affect context vars
    if (args.state.viewport && args.state.viewport.propDep) {
      contextDynamic = true;
    }

    function isInnerDefn (defn) {
      return (defn.contextDep && contextDynamic) || defn.propDep
    }

    // set webgl options
    emitPollState(env, batch, args);
    emitSetOptions(env, batch, args.state, function (defn) {
      return !isInnerDefn(defn)
    });

    if (!args.profile || !isInnerDefn(args.profile)) {
      emitProfile(env, batch, args, false, 'a1');
    }

    // Save these values to args so that the batch body routine can use them
    args.contextDep = contextDynamic;
    args.needsContext = needsContext;
    args.needsFramebuffer = needsFramebuffer;

    // determine if shader is dynamic
    var progDefn = args.shader.progVar;
    if ((progDefn.contextDep && contextDynamic) || progDefn.propDep) {
      emitBatchBody(
        env,
        batch,
        args,
        null);
    } else {
      var PROGRAM = progDefn.append(env, batch);
      batch(env.shared.gl, '.useProgram(', PROGRAM, '.program);');
      if (args.shader.program) {
        emitBatchBody(
          env,
          batch,
          args,
          args.shader.program);
      } else {
        var batchCache = env.global.def('{}');
        var PROG_ID = batch.def(PROGRAM, '.id');
        var CACHED_PROC = batch.def(batchCache, '[', PROG_ID, ']');
        batch(
          env.cond(CACHED_PROC)
            .then(CACHED_PROC, '.call(this,a0,a1);')
            .else(
              CACHED_PROC, '=', batchCache, '[', PROG_ID, ']=',
              env.link(function (program) {
                return createBody(emitBatchBody, env, args, program, 2)
              }), '(', PROGRAM, ');',
              CACHED_PROC, '.call(this,a0,a1);'));
      }
    }

    if (Object.keys(args.state).length > 0) {
      batch(env.shared.current, '.dirty=true;');
    }
  }

  // ===================================================
  // ===================================================
  // SCOPE COMMAND
  // ===================================================
  // ===================================================
  function emitScopeProc (env, args) {
    var scope = env.proc('scope', 3);
    env.batchId = 'a2';

    var shared = env.shared;
    var CURRENT_STATE = shared.current;

    emitContext(env, scope, args.context);

    if (args.framebuffer) {
      args.framebuffer.append(env, scope);
    }

    sortState(Object.keys(args.state)).forEach(function (name) {
      var defn = args.state[name];
      var value = defn.append(env, scope);
      if (isArrayLike(value)) {
        value.forEach(function (v, i) {
          scope.set(env.next[name], '[' + i + ']', v);
        });
      } else {
        scope.set(shared.next, '.' + name, value);
      }
    });

    emitProfile(env, scope, args, true, true)

    ;[S_ELEMENTS, S_OFFSET, S_COUNT, S_INSTANCES, S_PRIMITIVE].forEach(
      function (opt) {
        var variable = args.draw[opt];
        if (!variable) {
          return
        }
        scope.set(shared.draw, '.' + opt, '' + variable.append(env, scope));
      });

    Object.keys(args.uniforms).forEach(function (opt) {
      scope.set(
        shared.uniforms,
        '[' + stringStore.id(opt) + ']',
        args.uniforms[opt].append(env, scope));
    });

    Object.keys(args.attributes).forEach(function (name) {
      var record = args.attributes[name].append(env, scope);
      var scopeAttrib = env.scopeAttrib(name);
      Object.keys(new AttributeRecord()).forEach(function (prop) {
        scope.set(scopeAttrib, '.' + prop, record[prop]);
      });
    });

    function saveShader (name) {
      var shader = args.shader[name];
      if (shader) {
        scope.set(shared.shader, '.' + name, shader.append(env, scope));
      }
    }
    saveShader(S_VERT);
    saveShader(S_FRAG);

    if (Object.keys(args.state).length > 0) {
      scope(CURRENT_STATE, '.dirty=true;');
      scope.exit(CURRENT_STATE, '.dirty=true;');
    }

    scope('a1(', env.shared.context, ',a0,', env.batchId, ');');
  }

  function isDynamicObject (object) {
    if (typeof object !== 'object' || isArrayLike(object)) {
      return
    }
    var props = Object.keys(object);
    for (var i = 0; i < props.length; ++i) {
      if (dynamic.isDynamic(object[props[i]])) {
        return true
      }
    }
    return false
  }

  function splatObject (env, options, name) {
    var object = options.static[name];
    if (!object || !isDynamicObject(object)) {
      return
    }

    var globals = env.global;
    var keys = Object.keys(object);
    var thisDep = false;
    var contextDep = false;
    var propDep = false;
    var objectRef = env.global.def('{}');
    keys.forEach(function (key) {
      var value = object[key];
      if (dynamic.isDynamic(value)) {
        if (typeof value === 'function') {
          value = object[key] = dynamic.unbox(value);
        }
        var deps = createDynamicDecl(value, null);
        thisDep = thisDep || deps.thisDep;
        propDep = propDep || deps.propDep;
        contextDep = contextDep || deps.contextDep;
      } else {
        globals(objectRef, '.', key, '=');
        switch (typeof value) {
          case 'number':
            globals(value);
            break
          case 'string':
            globals('"', value, '"');
            break
          case 'object':
            if (Array.isArray(value)) {
              globals('[', value.join(), ']');
            }
            break
          default:
            globals(env.link(value));
            break
        }
        globals(';');
      }
    });

    function appendBlock (env, block) {
      keys.forEach(function (key) {
        var value = object[key];
        if (!dynamic.isDynamic(value)) {
          return
        }
        var ref = env.invoke(block, value);
        block(objectRef, '.', key, '=', ref, ';');
      });
    }

    options.dynamic[name] = new dynamic.DynamicVariable(DYN_THUNK, {
      thisDep: thisDep,
      contextDep: contextDep,
      propDep: propDep,
      ref: objectRef,
      append: appendBlock
    });
    delete options.static[name];
  }

  // ===========================================================================
  // ===========================================================================
  // MAIN DRAW COMMAND
  // ===========================================================================
  // ===========================================================================
  function compileCommand (options, attributes, uniforms, context, stats) {
    var env = createREGLEnvironment();

    // link stats, so that we can easily access it in the program.
    env.stats = env.link(stats);

    // splat options and attributes to allow for dynamic nested properties
    Object.keys(attributes.static).forEach(function (key) {
      splatObject(env, attributes, key);
    });
    NESTED_OPTIONS.forEach(function (name) {
      splatObject(env, options, name);
    });

    var args = parseArguments(options, attributes, uniforms, context, env);

    emitDrawProc(env, args);
    emitScopeProc(env, args);
    emitBatchProc(env, args);

    return env.compile()
  }

  // ===========================================================================
  // ===========================================================================
  // POLL / REFRESH
  // ===========================================================================
  // ===========================================================================
  return {
    next: nextState,
    current: currentState,
    procs: (function () {
      var env = createREGLEnvironment();
      var poll = env.proc('poll');
      var refresh = env.proc('refresh');
      var common = env.block();
      poll(common);
      refresh(common);

      var shared = env.shared;
      var GL = shared.gl;
      var NEXT_STATE = shared.next;
      var CURRENT_STATE = shared.current;

      common(CURRENT_STATE, '.dirty=false;');

      emitPollFramebuffer(env, poll);
      emitPollFramebuffer(env, refresh, null, true);

      // Refresh updates all attribute state changes
      var extInstancing = gl.getExtension('angle_instanced_arrays');
      var INSTANCING;
      if (extInstancing) {
        INSTANCING = env.link(extInstancing);
      }
      for (var i = 0; i < limits.maxAttributes; ++i) {
        var BINDING = refresh.def(shared.attributes, '[', i, ']');
        var ifte = env.cond(BINDING, '.buffer');
        ifte.then(
          GL, '.enableVertexAttribArray(', i, ');',
          GL, '.bindBuffer(',
            GL_ARRAY_BUFFER$1, ',',
            BINDING, '.buffer.buffer);',
          GL, '.vertexAttribPointer(',
            i, ',',
            BINDING, '.size,',
            BINDING, '.type,',
            BINDING, '.normalized,',
            BINDING, '.stride,',
            BINDING, '.offset);'
        ).else(
          GL, '.disableVertexAttribArray(', i, ');',
          GL, '.vertexAttrib4f(',
            i, ',',
            BINDING, '.x,',
            BINDING, '.y,',
            BINDING, '.z,',
            BINDING, '.w);',
          BINDING, '.buffer=null;');
        refresh(ifte);
        if (extInstancing) {
          refresh(
            INSTANCING, '.vertexAttribDivisorANGLE(',
            i, ',',
            BINDING, '.divisor);');
        }
      }

      Object.keys(GL_FLAGS).forEach(function (flag) {
        var cap = GL_FLAGS[flag];
        var NEXT = common.def(NEXT_STATE, '.', flag);
        var block = env.block();
        block('if(', NEXT, '){',
          GL, '.enable(', cap, ')}else{',
          GL, '.disable(', cap, ')}',
          CURRENT_STATE, '.', flag, '=', NEXT, ';');
        refresh(block);
        poll(
          'if(', NEXT, '!==', CURRENT_STATE, '.', flag, '){',
          block,
          '}');
      });

      Object.keys(GL_VARIABLES).forEach(function (name) {
        var func = GL_VARIABLES[name];
        var init = currentState[name];
        var NEXT, CURRENT;
        var block = env.block();
        block(GL, '.', func, '(');
        if (isArrayLike(init)) {
          var n = init.length;
          NEXT = env.global.def(NEXT_STATE, '.', name);
          CURRENT = env.global.def(CURRENT_STATE, '.', name);
          block(
            loop(n, function (i) {
              return NEXT + '[' + i + ']'
            }), ');',
            loop(n, function (i) {
              return CURRENT + '[' + i + ']=' + NEXT + '[' + i + '];'
            }).join(''));
          poll(
            'if(', loop(n, function (i) {
              return NEXT + '[' + i + ']!==' + CURRENT + '[' + i + ']'
            }).join('||'), '){',
            block,
            '}');
        } else {
          NEXT = common.def(NEXT_STATE, '.', name);
          CURRENT = common.def(CURRENT_STATE, '.', name);
          block(
            NEXT, ');',
            CURRENT_STATE, '.', name, '=', NEXT, ';');
          poll(
            'if(', NEXT, '!==', CURRENT, '){',
            block,
            '}');
        }
        refresh(block);
      });

      return env.compile()
    })(),
    compile: compileCommand
  }
}

function stats () {
  return {
    bufferCount: 0,
    elementsCount: 0,
    framebufferCount: 0,
    shaderCount: 0,
    textureCount: 0,
    cubeCount: 0,
    renderbufferCount: 0,

    maxTextureUnits: 0
  }
}

var GL_QUERY_RESULT_EXT = 0x8866;
var GL_QUERY_RESULT_AVAILABLE_EXT = 0x8867;
var GL_TIME_ELAPSED_EXT = 0x88BF;

var createTimer = function (gl, extensions) {
  var extTimer = extensions.ext_disjoint_timer_query;

  if (!extTimer) {
    return null
  }

  // QUERY POOL BEGIN
  var queryPool = [];
  function allocQuery () {
    return queryPool.pop() || extTimer.createQueryEXT()
  }
  function freeQuery (query) {
    queryPool.push(query);
  }
  // QUERY POOL END

  var pendingQueries = [];
  function beginQuery (stats) {
    var query = allocQuery();
    extTimer.beginQueryEXT(GL_TIME_ELAPSED_EXT, query);
    pendingQueries.push(query);
    pushScopeStats(pendingQueries.length - 1, pendingQueries.length, stats);
  }

  function endQuery () {
    extTimer.endQueryEXT(GL_TIME_ELAPSED_EXT);
  }

  //
  // Pending stats pool.
  //
  function PendingStats () {
    this.startQueryIndex = -1;
    this.endQueryIndex = -1;
    this.sum = 0;
    this.stats = null;
  }
  var pendingStatsPool = [];
  function allocPendingStats () {
    return pendingStatsPool.pop() || new PendingStats()
  }
  function freePendingStats (pendingStats) {
    pendingStatsPool.push(pendingStats);
  }
  // Pending stats pool end

  var pendingStats = [];
  function pushScopeStats (start, end, stats) {
    var ps = allocPendingStats();
    ps.startQueryIndex = start;
    ps.endQueryIndex = end;
    ps.sum = 0;
    ps.stats = stats;
    pendingStats.push(ps);
  }

  // we should call this at the beginning of the frame,
  // in order to update gpuTime
  var timeSum = [];
  var queryPtr = [];
  function update () {
    var ptr, i;

    var n = pendingQueries.length;
    if (n === 0) {
      return
    }

    // Reserve space
    queryPtr.length = Math.max(queryPtr.length, n + 1);
    timeSum.length = Math.max(timeSum.length, n + 1);
    timeSum[0] = 0;
    queryPtr[0] = 0;

    // Update all pending timer queries
    var queryTime = 0;
    ptr = 0;
    for (i = 0; i < pendingQueries.length; ++i) {
      var query = pendingQueries[i];
      if (extTimer.getQueryObjectEXT(query, GL_QUERY_RESULT_AVAILABLE_EXT)) {
        queryTime += extTimer.getQueryObjectEXT(query, GL_QUERY_RESULT_EXT);
        freeQuery(query);
      } else {
        pendingQueries[ptr++] = query;
      }
      timeSum[i + 1] = queryTime;
      queryPtr[i + 1] = ptr;
    }
    pendingQueries.length = ptr;

    // Update all pending stat queries
    ptr = 0;
    for (i = 0; i < pendingStats.length; ++i) {
      var stats = pendingStats[i];
      var start = stats.startQueryIndex;
      var end = stats.endQueryIndex;
      stats.sum += timeSum[end] - timeSum[start];
      var startPtr = queryPtr[start];
      var endPtr = queryPtr[end];
      if (endPtr === startPtr) {
        stats.stats.gpuTime += stats.sum / 1e6;
        freePendingStats(stats);
      } else {
        stats.startQueryIndex = startPtr;
        stats.endQueryIndex = endPtr;
        pendingStats[ptr++] = stats;
      }
    }
    pendingStats.length = ptr;
  }

  return {
    beginQuery: beginQuery,
    endQuery: endQuery,
    pushScopeStats: pushScopeStats,
    update: update,
    getNumPendingQueries: function () {
      return pendingQueries.length
    },
    clear: function () {
      queryPool.push.apply(queryPool, pendingQueries);
      for (var i = 0; i < queryPool.length; i++) {
        extTimer.deleteQueryEXT(queryPool[i]);
      }
      pendingQueries.length = 0;
      queryPool.length = 0;
    },
    restore: function () {
      pendingQueries.length = 0;
      queryPool.length = 0;
    }
  }
};

var GL_COLOR_BUFFER_BIT = 16384;
var GL_DEPTH_BUFFER_BIT = 256;
var GL_STENCIL_BUFFER_BIT = 1024;

var GL_ARRAY_BUFFER = 34962;

var CONTEXT_LOST_EVENT = 'webglcontextlost';
var CONTEXT_RESTORED_EVENT = 'webglcontextrestored';

var DYN_PROP = 1;
var DYN_CONTEXT = 2;
var DYN_STATE = 3;

function find (haystack, needle) {
  for (var i = 0; i < haystack.length; ++i) {
    if (haystack[i] === needle) {
      return i
    }
  }
  return -1
}

function wrapREGL (args) {
  var config = parseArgs(args);
  if (!config) {
    return null
  }

  var gl = config.gl;
  var glAttributes = gl.getContextAttributes();
  var contextLost = gl.isContextLost();

  var extensionState = createExtensionCache(gl, config);
  if (!extensionState) {
    return null
  }

  var stringStore = createStringStore();
  var stats$$1 = stats();
  var extensions = extensionState.extensions;
  var timer = createTimer(gl, extensions);

  var START_TIME = clock();
  var WIDTH = gl.drawingBufferWidth;
  var HEIGHT = gl.drawingBufferHeight;

  var contextState = {
    tick: 0,
    time: 0,
    viewportWidth: WIDTH,
    viewportHeight: HEIGHT,
    framebufferWidth: WIDTH,
    framebufferHeight: HEIGHT,
    drawingBufferWidth: WIDTH,
    drawingBufferHeight: HEIGHT,
    pixelRatio: config.pixelRatio
  };
  var uniformState = {};
  var drawState = {
    elements: null,
    primitive: 4, // GL_TRIANGLES
    count: -1,
    offset: 0,
    instances: -1
  };

  var limits = wrapLimits(gl, extensions);
  var attributeState = wrapAttributeState(
    gl,
    extensions,
    limits,
    stringStore);
  var bufferState = wrapBufferState(gl, stats$$1, config, attributeState);
  var elementState = wrapElementsState(gl, extensions, bufferState, stats$$1);
  var shaderState = wrapShaderState(gl, stringStore, stats$$1, config);
  var textureState = createTextureSet(
    gl,
    extensions,
    limits,
    function () { core.procs.poll(); },
    contextState,
    stats$$1,
    config);
  var renderbufferState = wrapRenderbuffers(gl, extensions, limits, stats$$1, config);
  var framebufferState = wrapFBOState(
    gl,
    extensions,
    limits,
    textureState,
    renderbufferState,
    stats$$1);
  var core = reglCore(
    gl,
    stringStore,
    extensions,
    limits,
    bufferState,
    elementState,
    textureState,
    framebufferState,
    uniformState,
    attributeState,
    shaderState,
    drawState,
    contextState,
    timer,
    config);
  var readPixels = wrapReadPixels(
    gl,
    framebufferState,
    core.procs.poll,
    contextState,
    glAttributes, extensions);

  var nextState = core.next;
  var canvas = gl.canvas;

  var rafCallbacks = [];
  var lossCallbacks = [];
  var restoreCallbacks = [];
  var destroyCallbacks = [config.onDestroy];

  var activeRAF = null;
  function handleRAF () {
    if (rafCallbacks.length === 0) {
      if (timer) {
        timer.update();
      }
      activeRAF = null;
      return
    }

    // schedule next animation frame
    activeRAF = raf.next(handleRAF);

    // poll for changes
    poll();

    // fire a callback for all pending rafs
    for (var i = rafCallbacks.length - 1; i >= 0; --i) {
      var cb = rafCallbacks[i];
      if (cb) {
        cb(contextState, null, 0);
      }
    }

    // flush all pending webgl calls
    gl.flush();

    // poll GPU timers *after* gl.flush so we don't delay command dispatch
    if (timer) {
      timer.update();
    }
  }

  function startRAF () {
    if (!activeRAF && rafCallbacks.length > 0) {
      activeRAF = raf.next(handleRAF);
    }
  }

  function stopRAF () {
    if (activeRAF) {
      raf.cancel(handleRAF);
      activeRAF = null;
    }
  }

  function handleContextLoss (event) {
    event.preventDefault();

    // set context lost flag
    contextLost = true;

    // pause request animation frame
    stopRAF();

    // lose context
    lossCallbacks.forEach(function (cb) {
      cb();
    });
  }

  function handleContextRestored (event) {
    // clear error code
    gl.getError();

    // clear context lost flag
    contextLost = false;

    // refresh state
    extensionState.restore();
    shaderState.restore();
    bufferState.restore();
    textureState.restore();
    renderbufferState.restore();
    framebufferState.restore();
    if (timer) {
      timer.restore();
    }

    // refresh state
    core.procs.refresh();

    // restart RAF
    startRAF();

    // restore context
    restoreCallbacks.forEach(function (cb) {
      cb();
    });
  }

  if (canvas) {
    canvas.addEventListener(CONTEXT_LOST_EVENT, handleContextLoss, false);
    canvas.addEventListener(CONTEXT_RESTORED_EVENT, handleContextRestored, false);
  }

  function destroy () {
    rafCallbacks.length = 0;
    stopRAF();

    if (canvas) {
      canvas.removeEventListener(CONTEXT_LOST_EVENT, handleContextLoss);
      canvas.removeEventListener(CONTEXT_RESTORED_EVENT, handleContextRestored);
    }

    shaderState.clear();
    framebufferState.clear();
    renderbufferState.clear();
    textureState.clear();
    elementState.clear();
    bufferState.clear();

    if (timer) {
      timer.clear();
    }

    destroyCallbacks.forEach(function (cb) {
      cb();
    });
  }

  function compileProcedure (options) {
    check$1(!!options, 'invalid args to regl({...})');
    check$1.type(options, 'object', 'invalid args to regl({...})');

    function flattenNestedOptions (options) {
      var result = extend({}, options);
      delete result.uniforms;
      delete result.attributes;
      delete result.context;

      if ('stencil' in result && result.stencil.op) {
        result.stencil.opBack = result.stencil.opFront = result.stencil.op;
        delete result.stencil.op;
      }

      function merge (name) {
        if (name in result) {
          var child = result[name];
          delete result[name];
          Object.keys(child).forEach(function (prop) {
            result[name + '.' + prop] = child[prop];
          });
        }
      }
      merge('blend');
      merge('depth');
      merge('cull');
      merge('stencil');
      merge('polygonOffset');
      merge('scissor');
      merge('sample');

      return result
    }

    function separateDynamic (object) {
      var staticItems = {};
      var dynamicItems = {};
      Object.keys(object).forEach(function (option) {
        var value = object[option];
        if (dynamic.isDynamic(value)) {
          dynamicItems[option] = dynamic.unbox(value, option);
        } else {
          staticItems[option] = value;
        }
      });
      return {
        dynamic: dynamicItems,
        static: staticItems
      }
    }

    // Treat context variables separate from other dynamic variables
    var context = separateDynamic(options.context || {});
    var uniforms = separateDynamic(options.uniforms || {});
    var attributes = separateDynamic(options.attributes || {});
    var opts = separateDynamic(flattenNestedOptions(options));

    var stats$$1 = {
      gpuTime: 0.0,
      cpuTime: 0.0,
      count: 0
    };

    var compiled = core.compile(opts, attributes, uniforms, context, stats$$1);

    var draw = compiled.draw;
    var batch = compiled.batch;
    var scope = compiled.scope;

    // FIXME: we should modify code generation for batch commands so this
    // isn't necessary
    var EMPTY_ARRAY = [];
    function reserve (count) {
      while (EMPTY_ARRAY.length < count) {
        EMPTY_ARRAY.push(null);
      }
      return EMPTY_ARRAY
    }

    function REGLCommand (args, body) {
      var this$1 = this;

      var i;
      if (contextLost) {
        check$1.raise('context lost');
      }
      if (typeof args === 'function') {
        return scope.call(this, null, args, 0)
      } else if (typeof body === 'function') {
        if (typeof args === 'number') {
          for (i = 0; i < args; ++i) {
            scope.call(this$1, null, body, i);
          }
          return
        } else if (Array.isArray(args)) {
          for (i = 0; i < args.length; ++i) {
            scope.call(this$1, args[i], body, i);
          }
          return
        } else {
          return scope.call(this, args, body, 0)
        }
      } else if (typeof args === 'number') {
        if (args > 0) {
          return batch.call(this, reserve(args | 0), args | 0)
        }
      } else if (Array.isArray(args)) {
        if (args.length) {
          return batch.call(this, args, args.length)
        }
      } else {
        return draw.call(this, args)
      }
    }

    return extend(REGLCommand, {
      stats: stats$$1
    })
  }

  var setFBO = framebufferState.setFBO = compileProcedure({
    framebuffer: dynamic.define.call(null, DYN_PROP, 'framebuffer')
  });

  function clearImpl (_, options) {
    var clearFlags = 0;
    core.procs.poll();

    var c = options.color;
    if (c) {
      gl.clearColor(+c[0] || 0, +c[1] || 0, +c[2] || 0, +c[3] || 0);
      clearFlags |= GL_COLOR_BUFFER_BIT;
    }
    if ('depth' in options) {
      gl.clearDepth(+options.depth);
      clearFlags |= GL_DEPTH_BUFFER_BIT;
    }
    if ('stencil' in options) {
      gl.clearStencil(options.stencil | 0);
      clearFlags |= GL_STENCIL_BUFFER_BIT;
    }

    check$1(!!clearFlags, 'called regl.clear with no buffer specified');
    gl.clear(clearFlags);
  }

  function clear (options) {
    check$1(
      typeof options === 'object' && options,
      'regl.clear() takes an object as input');
    if ('framebuffer' in options) {
      if (options.framebuffer &&
          options.framebuffer_reglType === 'framebufferCube') {
        for (var i = 0; i < 6; ++i) {
          setFBO(extend({
            framebuffer: options.framebuffer.faces[i]
          }, options), clearImpl);
        }
      } else {
        setFBO(options, clearImpl);
      }
    } else {
      clearImpl(null, options);
    }
  }

  function frame (cb) {
    check$1.type(cb, 'function', 'regl.frame() callback must be a function');
    rafCallbacks.push(cb);

    function cancel () {
      // FIXME:  should we check something other than equals cb here?
      // what if a user calls frame twice with the same callback...
      //
      var i = find(rafCallbacks, cb);
      check$1(i >= 0, 'cannot cancel a frame twice');
      function pendingCancel () {
        var index = find(rafCallbacks, pendingCancel);
        rafCallbacks[index] = rafCallbacks[rafCallbacks.length - 1];
        rafCallbacks.length -= 1;
        if (rafCallbacks.length <= 0) {
          stopRAF();
        }
      }
      rafCallbacks[i] = pendingCancel;
    }

    startRAF();

    return {
      cancel: cancel
    }
  }

  // poll viewport
  function pollViewport () {
    var viewport = nextState.viewport;
    var scissorBox = nextState.scissor_box;
    viewport[0] = viewport[1] = scissorBox[0] = scissorBox[1] = 0;
    contextState.viewportWidth =
      contextState.framebufferWidth =
      contextState.drawingBufferWidth =
      viewport[2] =
      scissorBox[2] = gl.drawingBufferWidth;
    contextState.viewportHeight =
      contextState.framebufferHeight =
      contextState.drawingBufferHeight =
      viewport[3] =
      scissorBox[3] = gl.drawingBufferHeight;
  }

  function poll () {
    contextState.tick += 1;
    contextState.time = now();
    pollViewport();
    core.procs.poll();
  }

  function refresh () {
    pollViewport();
    core.procs.refresh();
    if (timer) {
      timer.update();
    }
  }

  function now () {
    return (clock() - START_TIME) / 1000.0
  }

  refresh();

  function addListener (event, callback) {
    check$1.type(callback, 'function', 'listener callback must be a function');

    var callbacks;
    switch (event) {
      case 'frame':
        return frame(callback)
      case 'lost':
        callbacks = lossCallbacks;
        break
      case 'restore':
        callbacks = restoreCallbacks;
        break
      case 'destroy':
        callbacks = destroyCallbacks;
        break
      default:
        check$1.raise('invalid event, must be one of frame,lost,restore,destroy');
    }

    callbacks.push(callback);
    return {
      cancel: function () {
        for (var i = 0; i < callbacks.length; ++i) {
          if (callbacks[i] === callback) {
            callbacks[i] = callbacks[callbacks.length - 1];
            callbacks.pop();
            return
          }
        }
      }
    }
  }

  var regl = extend(compileProcedure, {
    // Clear current FBO
    clear: clear,

    // Short cuts for dynamic variables
    prop: dynamic.define.bind(null, DYN_PROP),
    context: dynamic.define.bind(null, DYN_CONTEXT),
    this: dynamic.define.bind(null, DYN_STATE),

    // executes an empty draw command
    draw: compileProcedure({}),

    // Resources
    buffer: function (options) {
      return bufferState.create(options, GL_ARRAY_BUFFER, false, false)
    },
    elements: function (options) {
      return elementState.create(options, false)
    },
    texture: textureState.create2D,
    cube: textureState.createCube,
    renderbuffer: renderbufferState.create,
    framebuffer: framebufferState.create,
    framebufferCube: framebufferState.createCube,

    // Expose context attributes
    attributes: glAttributes,

    // Frame rendering
    frame: frame,
    on: addListener,

    // System limits
    limits: limits,
    hasExtension: function (name) {
      return limits.extensions.indexOf(name.toLowerCase()) >= 0
    },

    // Read pixels
    read: readPixels,

    // Destroy regl and all associated resources
    destroy: destroy,

    // Direct GL state manipulation
    _gl: gl,
    _refresh: refresh,

    poll: function () {
      poll();
      if (timer) {
        timer.update();
      }
    },

    // Current time
    now: now,

    // regl Statistics Information
    stats: stats$$1
  });

  config.onDone(null, regl);

  return regl
}

return wrapREGL;

})));

});

var CommandBuilder = function CommandBuilder () {};

CommandBuilder.prototype.buildCommand = function buildCommand (props) {
  this.config = props.config;
  this.state = props.state;
  this.clock = props.clock;
  this.props = props;

  return this.assembleCommand();
};

CommandBuilder.prototype.createDefaultUniforms = function createDefaultUniforms () {
    var this$1 = this;

  var uniforms = new Uniforms();
  uniforms.addUniform('invScreenAspectRatio', 'float', function (ctx) { return ctx.viewportHeight / ctx.viewportWidth; });
  uniforms.addUniform('particleSize', 'float', function (ctx) { return (ctx.viewportWidth / this$1.config.xParticlesCount) * this$1.config.particleScaling; });
  uniforms.addUniform('globalTime', 'int', function (ctx, props) { return props.clock.getTime(); });
  uniforms.addUniform('viewport', 'vec2', function (ctx) { return [ctx.viewportWidth, ctx.viewportHeight]; });
  uniforms.addUniform('background_color', 'vec4', function () { return this$1.config.backgroundColor; });
  return uniforms;
};

CommandBuilder.prepareVertexShader = function prepareVertexShader (uniforms) {
  var vertexShader = new Shader();

  vertexShader.attributes += "\n      attribute vec2 texcoord;\n      attribute vec4 rgba_int;\n    ";
  vertexShader.varyings += 'varying vec3 color;\n';
  vertexShader.globals += 'const float PI = 3.14159265;\n';
  // Global library functions
  // TODO make functions a dict (= set) so that users can add them on
  // demand without defining them more than once
  vertexShader.functions += "\n      vec2 getDirectionVector(float angle) {\n        return vec2(cos(angle), sin(angle));\n      }\n      vec3 rgb2hsv(vec3 rgb) {\n        float cmin = min(rgb.r, min(rgb.g, rgb.b));\n        float cmax = max(rgb.r, max(rgb.g, rgb.b));\n        float d = cmax - cmin;\n        float eps = 0.00001;\n        if (d < eps || cmax < eps) {\n          return vec3(0, 0, cmax);\n        }\n\n        float _h;\n        if (cmax == rgb.r) {\n          _h = (rgb.g - rgb.b) / d;\n          if (_h < 0.) {\n            _h += 6.;\n          }\n        } else if (cmax == rgb.g) {\n          _h = ((rgb.b - rgb.r) / d) + 2.;\n        } else {\n          _h = ((rgb.r - rgb.g) / d) + 4.;\n        }\n\n        return vec3(_h * 60. * (PI / 180.), d / cmax, cmax);\n      }\n    ";

  return vertexShader;
};

CommandBuilder.prepareFragmentShader = function prepareFragmentShader () {
  var fragmentShader = new Shader();
  fragmentShader.varyings += 'varying vec3 color;\n';
  fragmentShader.globals += 'const float PI = 3.14159265;\n';
  return fragmentShader;
};

CommandBuilder.prototype.assembleCommand = function assembleCommand () {
    var this$1 = this;

  return new Promise(function (res, rej) {
    var uniforms = {};
    var attributes = {
      texcoord: function () { return this$1.state.texcoordsBuffer; },
      rgba_int: function () { return this$1.state.getColorBuffer(); }
    };
    var defaultUniforms = this$1.createDefaultUniforms();
    var vert = CommandBuilder.prepareVertexShader();
    defaultUniforms.compile(vert, uniforms);
    var frag = CommandBuilder.prepareFragmentShader();
    defaultUniforms.compile(frag, null); // default uniforms are already registered
                                         // in uniforms object, therefore pass null
    var result = {
      primitive:'points',
      // TODO This cannot be changed ad-hoc. A new command would be necessary.
      // regl.elements (http://regl.party/api#elements) could be an alternative here
      count:    this$1.config.xParticlesCount * this$1.config.yParticlesCount,
      attributes: attributes,
      uniforms: uniforms,
      depth: { enable: false }
    };

    switch (this$1.config.particleOverlap) {
      case 'add':
        result.blend = {
          enable: true,
          func: { src: 'one', dst: 'one' }
        };
        break;
      case 'alpha blend':
        result.blend = {
          enable: true,
          func: { srcRGB: 'src alpha', srcAlpha: 1, dstRGB: 'one minus src alpha', dstAlpha: 1 }
        };
        break;
      default:
        throw new Error(("Unknown particle overlap mode: " + (this$1.config.particleOverlap)));
    }

    vert.mainBody += "\n        vec3 rgb = rgba_int.rgb / 255.;\n        vec3 hsv = rgb2hsv(rgb);\n        vec3 initialPosition = vec3(texcoord, 0);\n        float pointSize = max(particleSize, 0.);\n\n        vec3 position = initialPosition;\n      ";
    frag.mainBody += "\n        vec3 rgb = color;\n        vec2 frag_coord = (gl_FragCoord.xy - vec2(.5)) / (viewport - vec2(1.));\n        // gl_PointCoord coord system is edge-centered, but it's more\n        // convenient if we center the system at the center of the\n        // fragment (see point_dist below for example)\n        vec2 point_coord = gl_PointCoord * vec2(2.) - vec2(1.);\n        float point_dist = length(point_coord);\n      ";
    var nextEffect = (function () {
      var i = 0;
      var j = 0;
      return function () {
        if (i === this$1.config.effects.length) {
          return null;
        }
        var track = this$1.config.effects[i];
        if (j === track.length) {
          i++;
          j = 0;
          return nextEffect();
        }
        var effect = track[j];
        j = j + 1;
        return effect;
      }
    })();
    var globalId = 0;
    var registerEffects = function (res, rej) {
      var effectConfig = nextEffect();
      if (effectConfig === null) {
        return res();
      }
      var effectUniforms = new Uniforms(globalId);
      var effectAttributes = new Attributes(globalId);
      var effectClass = effectConfig.getEffectClass();
      vert.mainBody += "if (" + (effectConfig.timeBegin) + " <= globalTime && globalTime <= " + (effectConfig.timeEnd) + ") {\n";
      frag.mainBody += "if (" + (effectConfig.timeBegin) + " <= globalTime && globalTime <= " + (effectConfig.timeEnd) + ") {\n";
      effectClass.registerAsync(effectConfig, this$1.props, effectUniforms, vert, frag, effectAttributes)
      .then(function () {
        vert.mainBody += '}\n';
        frag.mainBody += '}\n';

        effectUniforms.compile(vert, uniforms);
        effectAttributes.compile(vert, attributes);
        globalId += 1;
        registerEffects(res, rej);
      }, function (err) {
        reportError(err);
        vert.mainBody += '// error during registration\n}\n';
        frag.mainBody += '// error during registration\n}\n';

        effectUniforms.compile(vert, uniforms);
        effectAttributes.compile(vert, attributes);
        globalId += 1;
        registerEffects(res, rej);
      });
    };
    return new Promise(registerEffects).then(function () {
      vert.mainBody += "\n          color = rgb;\n          gl_PointSize = pointSize;\n          gl_Position = vec4(vec2(2.) * position.xy - vec2(1.), 0., 1.);\n        ";
      var particleShape = this$1.config.particleShape || 'circle';
      var particleFading = this$1.config.particleFading || 'fade-out';
      var particleOverlap =this$1.config.particleOverlap || 'add';
      var insideShape = {
        circle: 'ceil(1. - point_dist)',
        square: '1.',
        // PI/3 = 60 degrees = inner angle of equilateral triangle
        triangle: 'gl_PointCoord.y < 0.933 && gl_PointCoord.y >= 0.067 + abs(point_coord.x/2.) * tan(PI/3.) ? 1. : 0.'
      }[particleShape];
      var fadingFactor = {
        none:     {circle: '1.', square: '1.', triangle: '1.'},
        'fade-out': {
          circle: '(cos(PI * point_dist) + 1.) / 2.',
          square: '1. - max(abs(point_coord.x), abs(point_coord.y))',
          triangle: '1. - length(vec2(.5, .289) - gl_PointCoord)'
        }
      }[particleFading][particleShape];
      var colorAssign = {
        add:         'gl_FragColor = vec4(rgb * fadingFactor, 1);\n',
        'alpha blend': 'gl_FragColor = vec4(rgb, fadingFactor);\n'
      }[particleOverlap];
      frag.mainBody += "\n          float insideShape = " + insideShape + ";\n          float fadingFactor = (" + fadingFactor + ") * insideShape;\n          " + colorAssign + "\n        ";

      result.vert = vert.compile();
      result.frag = frag.compile();

      res(result);
    });
  });
};

var RendererClock = function RendererClock() {
  this.time = -1;
  this.delta = 0;
  this.absTime = Date.now();
  this.period = 1000;
  this.paused = false;
  this.wrapListeners = [];
  this.pauseListeners = [];
};
RendererClock.prototype.frame = function frame () {
    var this$1 = this;

  if (this.paused || this.period === 0) {
    this.delta = 0;
    return;
  }
  if (this.time === -1) {
    // it was requested that we start at zero
    this.absTime = Date.now();
    this.time = 0;
  } else {
    var oldTime = this.absTime;
    this.absTime = Date.now();
    this.delta = this.absTime - oldTime;
    this.time += this.delta;
    while (this.time >= this.period) {
      this$1.time -= this$1.period;
      var loop = function ( i ) {
        window.setTimeout(function () { return this$1.wrapListeners[i](); }, 0);
      };

        for (var i = 0; i < this.wrapListeners.length; i++) loop( i );
    }
  }
};
RendererClock.prototype.reset = function reset () {
  this.time = -1;
  this.delta = 0;
  this.absTime = Date.now();
};
RendererClock.prototype.setPeriod = function setPeriod (p) {
  this.period = p;
};
RendererClock.prototype.getTime = function getTime () {
  return this.time;
};
RendererClock.prototype.setTime = function setTime (time) {
  this.time = time;
  this.delta = 0;
  this.absTime = Date.now();
};
RendererClock.prototype.getDelta = function getDelta () {
  return this.delta;
};
RendererClock.prototype.getAbsoluteTime = function getAbsoluteTime () {
  return this.absTime;
};
RendererClock.prototype.setPaused = function setPaused (paused) {
    var this$1 = this;
    if ( paused === void 0 ) paused = true;

  if (paused !== this.paused) {
    if (!paused) {
      // on unpause
      this.delta = 0;
      this.absTime = Date.now();
    }
    this.paused = paused;
    for (var i = 0; i < this.pauseListeners.length; i++) {
      this$1.pauseListeners[i](paused);
    }
  }
};
RendererClock.prototype.tooglePause = function tooglePause () {
  this.setPaused(!this.paused);
};
RendererClock.prototype.getPaused = function getPaused () {
  return this.paused;
};
RendererClock.prototype.isPaused = function isPaused () {
  return this.paused;
};
RendererClock.prototype.addWrapListener = function addWrapListener (listener) {
  this.wrapListeners.push(listener);
};
RendererClock.prototype.removeWrapListener = function removeWrapListener (listener) {
  this.wrapListeners.splice(this.wrapListeners.indexOf(listener), 1);
};
RendererClock.prototype.addPauseListener = function addPauseListener (listener) {
  this.pauseListeners.push(listener);
};
RendererClock.prototype.removePauseListener = function removePauseListener (listener) {
  this.pauseListeners.splice(this.pauseListeners.indexOf(listener), 1);
};

var PaintResultCommand = (function (FullscreenRectCommand$$1) {
  function PaintResultCommand(getResult) {
    FullscreenRectCommand$$1.call(this);
    this.frag = "\n      precision highp float;\n      uniform sampler2D resultTexture;\n      varying vec2 texcoord;\n      void main() {\n        vec3 color = texture2D(resultTexture, texcoord).rgb;\n        gl_FragColor = vec4(color, 1);\n      }\n    ";
    this.uniforms = {
      resultTexture: function () { return getResult().texture; },
    };
  }

  if ( FullscreenRectCommand$$1 ) PaintResultCommand.__proto__ = FullscreenRectCommand$$1;
  PaintResultCommand.prototype = Object.create( FullscreenRectCommand$$1 && FullscreenRectCommand$$1.prototype );
  PaintResultCommand.prototype.constructor = PaintResultCommand;

  return PaintResultCommand;
}(FullscreenRectCommand));

var AccumulationCommand = (function (FullscreenRectCommand$$1) {
  function AccumulationCommand(getParticles, getHistory, getOutput, agents) {
    FullscreenRectCommand$$1.call(this);
    this.uniforms = {};
    var frag = new Shader();
    var stdUniforms = new Uniforms();
    stdUniforms.addUniform('particleTexture', 'sampler2D', function () { return getParticles().texture; });
    stdUniforms.addUniform('historyTexture', 'sampler2D', function () { return getHistory().texture; });
    stdUniforms.addUniform('globalTime', 'int', function (ctx, props) { return props.clock.getTime(); });
    stdUniforms.compile(frag, this.uniforms);
    frag.varyings += 'varying vec2 texcoord;\n';
    frag.mainBody = "\n      vec3 historyColor = texture2D(historyTexture, texcoord).rgb;\n      vec3 particleColor = texture2D(particleTexture, texcoord).rgb;\n      vec3 accumulationResult = vec3(0.0);\n      int activeAgents = 0;\n\n      " + (AccumulationCommand.fragmentCodeForAgents(agents, frag, this.uniforms)) + "\n\n      if (activeAgents > 0) {\n        accumulationResult /= float(activeAgents);\n      } else {\n        accumulationResult = particleColor;\n      }\n\n      gl_FragColor = vec4(accumulationResult, 1);\n    ";
    this.frag = frag.compile();
    this.framebuffer = function () { return getOutput().framebuffer; };
  }

  if ( FullscreenRectCommand$$1 ) AccumulationCommand.__proto__ = FullscreenRectCommand$$1;
  AccumulationCommand.prototype = Object.create( FullscreenRectCommand$$1 && FullscreenRectCommand$$1.prototype );
  AccumulationCommand.prototype.constructor = AccumulationCommand;
  AccumulationCommand.fragmentCodeForAgents = function fragmentCodeForAgents (agents, shader, uniforms) {
    var code = [];

    var loop = function ( i ) {
      var agent = agents[i];
      var agentUniforms = new Uniforms(i);
      var fadeWeightUniform = agentUniforms.addUniform('fadeWeight', 'float', function (ctx, props) {
        var timeBegin = agent.instance.timeBegin;
        var timeEnd = agent.instance.timeEnd;
        var fadein = agent.instance.config.fadein;
        var fadeout = agent.instance.config.fadeout;
        var t = props.clock.getTime();
        // t in [timeBegin, timeEnd] (guranteed by if below)
        return t < (timeBegin + fadein) ? (t - timeBegin) / fadein :
          t > (timeEnd - fadeout) ? 1 - (t - (timeEnd - fadeout)) / fadeout :
          1;
      });
      code.push(("\n        if (" + (agent.instance.timeBegin) + " <= globalTime && globalTime <= " + (agent.instance.timeEnd) + ") {\n          activeAgents++;\n          vec3 accumulationEffectResult;\n          " + (agent.getFragmentCode(agentUniforms)) + "\n          accumulationResult += mix(particleColor, accumulationEffectResult, " + fadeWeightUniform + ");\n        }\n      "));
      agentUniforms.compile(shader, uniforms);
    };

    for (var i = 0; i < agents.length; i++) loop( i );
    return code.join('\n');
  };

  return AccumulationCommand;
}(FullscreenRectCommand));

/**
 * The RendererPipeline manages the different passes needed to render a
 * single frame. Usually, there is only one single pass required to
 * render a frame. Only when there are accumulation effects, we need
 * more than one render pass, namely for combining the most recent frame
 * with the accumulation buffer.
 */
var RendererPipeline = function RendererPipeline(regl) {
  var this$1 = this;

  this.regl = regl;
  this.mainCommand = null;
  this.accumulationAgents = [];
  this.particleBuffer = new Framebuffer(this.regl);
  this.accuHistoryBuffer = new Framebuffer(this.regl);
  this.resultBuffer = new Framebuffer(this.regl);
  var getResult = function () { return this$1.resultBuffer; };
  this.accumulationCommand = null;
  this.paintResultCommand = this.regl(new PaintResultCommand(getResult));
};
RendererPipeline.prototype.addAccumulationAgent = function addAccumulationAgent (agent) {
  this.accumulationAgents.push(agent);
};
RendererPipeline.prototype.compile = function compile (cmd) {
    var this$1 = this;

  this.mainCommand = cmd;
  var getParticles = function () { return this$1.particleBuffer; };
  var getHistory = function () { return this$1.accuHistoryBuffer; };
  var getOut = function () { return this$1.resultBuffer; };
  this.accumulationCommand = this.regl(
    new AccumulationCommand(getParticles, getHistory, getOut, this.accumulationAgents)
  );
};
RendererPipeline.prototype.reset = function reset (clearColor) {
  this.accumulationAgents.length = 0;
  this.mainCommand = null;
  this.clearColor = clearColor;
};
RendererPipeline.prototype.resize = function resize (width, height) {
  this.particleBuffer.resize(width, height);
  this.accuHistoryBuffer.resize(width, height);
  this.resultBuffer.resize(width, height);
};
RendererPipeline.prototype.run = function run (props) {
    var this$1 = this;

  if (!this.mainCommand) {
    return;
  }
  if (this.accumulationAgents.length === 0 || props.clock.getPaused()) {
    this.regl.clear({ color: this.clearColor });
    this.mainCommand(props);
  } else { // Accumulation is active
    // Do NOT change the buffers AFTER paintResultCommand, because if we
    // pause at some point, the other if() branch above will have the
    // two buffers alrady swapped - which we don't want. resultBuffer
    // should still be resultBuffer
    var assign;
      (assign = [this.resultBuffer, this.accuHistoryBuffer], this.accuHistoryBuffer = assign[0], this.resultBuffer = assign[1]);
    this.particleBuffer.framebuffer.use(function () {
      this$1.regl.clear({color: this$1.clearColor});
      this$1.mainCommand(props);
    });

    this.accumulationCommand(props);
    this.paintResultCommand(props);
  }
};
RendererPipeline.prototype.isValid = function isValid () {
  return this.mainCommand !== null;
};

/// The functions in this file are mainly responsible for interpreting
/// ScalingInfo when mapping image/canvas pixel data onto the particle
/// grid. ScalingInfo itself is a simple description format to give
/// users the possibility to describe this mapping in an intuitive yet
/// limited fashion.

var ScalingInfo = function ScalingInfo(particleCounts, imageScaling, imageCropping, viewport) {
  this.particleCounts = particleCounts; // {x, y}
  this.imageScaling = imageScaling;
  this.imageCropping = imageCropping; // {x, y}
  this.viewport = viewport; // {width, height}
};

function getDefaultPixelParticleMappingParams(imageCanvas, scalingInfo) {
  var w = scalingInfo.particleCounts.x;
  var h = scalingInfo.particleCounts.y;
  var r = {
    sx: 0,
    sy: 0,
    sWidth: imageCanvas.width,
    sHeight: imageCanvas.height,
    dx: 0,
    dy: 0,
    dWidth: w,
    dHeight: h,
  };
  // particles aspect ratio
  r.dAspectRatio = (w / h);
  // source image aspect ratio
  r.sAspectRatio = imageCanvas.width / imageCanvas.height;
  // viewport aspect ratio
  r.vAspectRatio = scalingInfo.viewport.width / scalingInfo.viewport.height;
  // particle aspect ratio
  r.pAspectRatio = r.vAspectRatio / r.dAspectRatio;
  return r;
}

function getCropImageToViewportParams(imageCanvas, scalingInfo) {
  var r = getDefaultPixelParticleMappingParams(imageCanvas, scalingInfo);
  if (r.vAspectRatio > r.sAspectRatio) { // source height will exceed viewport height
    r.sHeight = r.sWidth / r.vAspectRatio;
    if (scalingInfo.imageCropping.y === 'crop-both') {
      r.sy = (imageCanvas.height - r.sHeight) / 2;
    } else if (scalingInfo.imageCropping.y === 'crop-top') {
      r.sy = imageCanvas.height - r.sHeight;
    } else if (scalingInfo.imageCropping.y === 'crop-bottom') {
      r.sy = 0;
    } else {
      throw new Error('Illegal value for scalingInfo.imageCropping.y: ' + scalingInfo.imageCropping.x);
    }
  } else { // source width will exceed dest width
    r.sWidth = r.sHeight * r.vAspectRatio;
    if (scalingInfo.imageCropping.x === 'crop-both') {
      r.sx = (imageCanvas.width - r.sWidth) / 2;
    } else if (scalingInfo.imageCropping.x === 'crop-left') {
      r.sx = imageCanvas.width - r.sWidth;
    } else if (scalingInfo.imageCropping.x === 'crop-right') {
      r.sx = 0;
    } else {
      throw new Error('Illegal value for scalingInfo.imageCropping.x: ' + scalingInfo.imageCropping.x);
    }
  }
  return r;
}

function getFitWidthParams(imageCanvas, scalingInfo) {
  var w = scalingInfo.particleCounts.x;
  var h = scalingInfo.particleCounts.y;
  var r = getDefaultPixelParticleMappingParams(imageCanvas, scalingInfo);
  if (r.vAspectRatio < r.sAspectRatio) { // the picture won't fill the particles. Some rows will remain black
    r.dHeight = w / r.sAspectRatio * r.pAspectRatio;
    if (scalingInfo.imageCropping.y === 'crop-both') {
      r.dy = (h - r.dHeight) / 2;
    } else if (scalingInfo.imageCropping.y === 'crop-top') {
      r.dy = h - r.dHeight;
    } else if (scalingInfo.imageCropping.y === 'crop-bottom') {
      r.dy = 0;
    } else {
      throw new Error('Illegal value for scalingInfo.imageCropping.y: ' + scalingInfo.imageCropping.y);
    }
  } else { // pixels rows at the top and/or bottom will need to be discarded
    r.sHeight = imageCanvas.width / r.vAspectRatio;
    if (scalingInfo.imageCropping.y === 'crop-both') {
      r.sy = (imageCanvas.height - r.sHeight) / 2;
    } else if (scalingInfo.imageCropping.y === 'crop-top') {
      r.sy = imageCanvas.height  - r.sHeight;
    } else if (scalingInfo.imageCropping.y === 'crop-bottom') {
      r.sy = 0;
    } else {
      throw new Error('Illegal value for scalingInfo.imageCropping.y: ' + scalingInfo.imageCropping.y);
    }
  }
  return r;
}

function getFitHeightParams(imageCanvas, scalingInfo) {
  var w = scalingInfo.particleCounts.x;
  var h = scalingInfo.particleCounts.y;
  var r = getDefaultPixelParticleMappingParams(imageCanvas, scalingInfo);
  if (r.vAspectRatio > r.sAspectRatio) { // the picture won't fill the particles. Some columns will remain black
    r.dWidth = h * r.sAspectRatio / r.pAspectRatio;
    if (scalingInfo.imageCropping.x === 'crop-both') {
      r.dx = (w - r.dWidth) / 2;
    } else if (scalingInfo.imageCropping.x === 'crop-left') {
      r.dx = w - r.dWidth;
    } else if (scalingInfo.imageCropping.x === 'crop-right') {
      r.dx = 0;
    } else {
      throw new Error('Illegal value for scalingInfo.imageCropping.x: ' + scalingInfo.imageCropping.x);
    }
  } else { // pixels columns to the left and/or right will need to be discarded
    r.sWidth = imageCanvas.height * r.vAspectRatio;
    if (scalingInfo.imageCropping.x === 'crop-both') {
      r.sx = (imageCanvas.width - r.sWidth) / 2;
    } else if (scalingInfo.imageCropping.x === 'crop-left') {
      r.sx = imageCanvas.width - r.sWidth;
    } else if (scalingInfo.imageCropping.x === 'crop-right') {
      r.sx = 0;
    } else {
      throw new Error('Illegal value for scalingInfo.imageCropping.x: ' + scalingInfo.imageCropping.x);
    }
  }
  return r;
}

function mapImageToParticles(imageCanvas, scalingInfo) {
  var w = scalingInfo.particleCounts.x;
  var h = scalingInfo.particleCounts.y;
  if (w < 1 || h < 1) {
    throw new Error('Illegal values for particle counts: x=' + w + ', y=' + h);
  }
  var scalingCanvas = document.createElement('canvas');
  var scalingContext = scalingCanvas.getContext('2d');
  var scalingParams = null;
  if (scalingInfo.imageScaling === 'crop-to-viewport') {
    scalingParams = getCropImageToViewportParams(imageCanvas, scalingInfo);
  } else if (scalingInfo.imageScaling === 'fit-image') {
    var vAspectRatio = scalingInfo.viewport.width / scalingInfo.viewport.height;
    if (imageCanvas.width / imageCanvas.height > vAspectRatio) {
      scalingParams = getFitWidthParams(imageCanvas, scalingInfo);
    } else {
      scalingParams = getFitHeightParams(imageCanvas, scalingInfo);
    }
  } else if (scalingInfo.imageScaling === 'fit-width') {
    scalingParams = getFitWidthParams(imageCanvas, scalingInfo);
  } else if (scalingInfo.imageScaling === 'fit-height') {
    scalingParams = getFitHeightParams(imageCanvas, scalingInfo);
  } else if (scalingInfo.imageScaling === 'scale-to-viewport') {
    scalingParams = getDefaultPixelParticleMappingParams();
  } else {
    throw new Error('Illegal value for scalingInfo.imageScaling: "' + scalingInfo.imageScaling + '"');
  }
  scalingCanvas.width = w;
  scalingCanvas.height = h;
  var P = scalingParams;
  scalingContext.drawImage(imageCanvas, P.sx, P.sy, P.sWidth, P.sHeight, P.dx, P.dy, P.dWidth, P.dHeight);
  return scalingContext.getImageData(0, 0, scalingCanvas.width, scalingCanvas.height);
}

function domImgToCanvas(img) {
  var fullresCanvas = document.createElement('canvas');
  var fullresContext = fullresCanvas.getContext('2d');
  fullresCanvas.width = img.naturalWidth;
  fullresCanvas.height = img.naturalHeight;
  // flipped y-axis
  fullresContext.translate(0, img.naturalHeight);
  fullresContext.scale(1, -1);
  fullresContext.drawImage(img, 0, 0);
  return fullresCanvas;
}

var ParticleData = function ParticleData(imageData, regl, scalingInfo) {
  this.rgba = mapImageToParticles(imageData, scalingInfo).data;
};

var ParticleDataStoreEntry = function ParticleDataStoreEntry(imageCanvas, imageScaling, imageCropping, particleData) {
  this.imageCanvas = imageCanvas || null;
  this.imageScaling = imageScaling;
  this.imageCropping = imageCropping;
  this.particleData = particleData || null;
};
ParticleDataStoreEntry.prototype.destroy = function destroy () {
  if (this.particleData !== null) {
    this.particleData = null;
  }
  this.imageCanvas = null;
};

/**
 * Encapsulates the parts of the render pipeline which are subject to
 * dynamic change, i.e. data that can be changed by effects.
 * 
 * In contrast to this, data inside a `config` object is always immutable
 * (as long as the user does not request changes to be applied - which
 * generates a new `config` object).
 * The most important thing to note is that both `state` *and* `config`
 * objects "live on" if the other object is changed, whereas only `state`
 * is ever influenced by `config` - never the other way around.
 * E.g. config's xParticleCount influences state's particleData.
 * On the other hand, `state` does not need to be serializable
 */
var RendererState = function RendererState(regl) {
  this.regl = regl;
  this.pipeline = new RendererPipeline(regl);

  // Properties
  this.config = null;
  this.particleData = -1;
  this.particleDataStore = [new ParticleDataStoreEntry(null, '', {x: '', y: ''}, null)];
  this.buffers = [];
  this.hooks = [];
  this.width = 0;
  this.height = 0;
  this.texcoordsBuffer = null;
  this.colorBuffer = null;
  this.dataInBuffer = -1;
};
RendererState.prototype.adaptToConfig = function adaptToConfig (config) {
    var this$1 = this;

  this.config = config;
  this.pipeline.reset(config.backgroundColor);

  var pw = config.xParticlesCount;
  var ph = config.yParticlesCount;

  // texcoordsBuffer
  if (this.texcoordsBuffer !== null) {
    this.texcoordsBuffer.destroy();
  }
  var pixelIndices = Array.from(Array(pw * ph).keys());
  var texcoords = pixelIndices.map(function (i) { return [((i % pw) + 0.5) / pw, (Math.floor(i / pw) + 0.5) / ph]; });
  this.texcoordsBuffer = this.regl.buffer(texcoords);
  // colorBuffer
  if (this.colorBuffer !== null) {
    this.colorBuffer.destroy();
  }
  this.dataInBuffer = -1;
  this.colorBuffer = this.regl.buffer({usage: 'stream', type: 'uint8', length: 4 * ph * pw});

  // Update default particle data
  var DPD = this.particleDataStore[0];
  var defaultImg = DPD.imageCanvas;
  if (defaultImg !== null) {
    var scalingInfo = new ScalingInfo(
      {x: pw, y: ph},
      DPD.imageScaling, DPD.imageCropping,
      {width: this.getWidth(), height: this.getHeight()}
    );
    DPD.destroy();
    this.particleDataStore[0] = new ParticleDataStoreEntry(
      defaultImg, scalingInfo.imageScaling, scalingInfo.imageCropping,
      new ParticleData(defaultImg, this.regl, scalingInfo)
    );
  }
  // release resources
  for (var i = 1; i < this.particleDataStore.length; i++) {
    this$1.particleDataStore[i].destroy();
  }
  this.particleDataStore.length = 1;
  this.particleData = 0;

  for (var i$1 = 0; i$1 < this.buffers.length; i$1++) {
    this$1.buffers[i$1].destroy();
  }
  this.buffers.length = 0;
  // run hooks
  for (var i$2 = 0; i$2 < this.hooks.length; i$2++) {
    this$1.hooks[i$2]();
  }
};
RendererState.prototype.setParticleData = function setParticleData (id) {
  this.particleData = id;
};
RendererState.prototype.createParticleData = function createParticleData (imgData, imageScaling, imageCropping) {
  if (!imageScaling) {
    console.warn('No imageScaling given. Falling back to default value');
    imageScaling = 'crop-to-viewport';
  }
  if (!imageCropping) {
    console.warn('No imageCropping given. Falling back to default value');
    imageCropping = {x: 'crop-both', y: 'crop-both'};
  }
  var scalingInfo = new ScalingInfo(
    {x: this.config.xParticlesCount, y: this.config.yParticlesCount},
    imageScaling, imageCropping,
    {width: this.getWidth(), height: this.getHeight()}
  );
  this.particleDataStore.push(new ParticleDataStoreEntry(
    imgData, imageScaling, imageCropping,
    new ParticleData(imgData, this.regl, scalingInfo)
  ));
  return this.particleDataStore.length - 1;
};
RendererState.prototype.createParticleDataFromDomImg = function createParticleDataFromDomImg (domImg, imageScaling, imageCropping) {
  return this.createParticleData(domImgToCanvas(domImg), imageScaling, imageCropping);
};
RendererState.prototype.destroyParticleData = function destroyParticleData (id) {
  // Some effects (like webcam) may be a bit late to the party after
  // the state has been reset
  if (this.particleDataStore[id]) {
    this.particleDataStore[id].destroy();
  } else {
    console.warn('Trying to destroy ParticleData that doesn\'t exist');
  }
};
RendererState.prototype.getColorBuffer = function getColorBuffer () {
  if (this.particleData < 0) {
    return null;
  }
  if (this.dataInBuffer !== this.particleData) {
    var data = this.particleDataStore[this.particleData].particleData.rgba;
    this.colorBuffer(data);
    this.dataInBuffer = this.particleData;
  }
  return this.colorBuffer;
};
RendererState.prototype.createBuffer = function createBuffer () {
    var args = [], len = arguments.length;
    while ( len-- ) args[ len ] = arguments[ len ];

  var buf = (ref = this.regl).buffer.apply(ref, args);
  this.buffers.push(buf);
  return { id: this.buffers.length - 1, buffer: buf };
    var ref;
};
RendererState.prototype.destroyBuffer = function destroyBuffer (id) {
  if (id < 0 || id >= this.buffers.length) {
    throw new Error('Illegal buffer id given for destruction');
  }
  this.buffers[id].destroy();
  this.buffers.splice(id, 1);
};
RendererState.prototype.isValid = function isValid () {
  return this.particleData >= 0 && this.pipeline.isValid();
};
/// Sets the image, but will not change the current default particle
/// data. Rebuilding the default particle data will only happen on
/// adaptToConfig
RendererState.prototype.setDefaultDomImage = function setDefaultDomImage (domImage, imageScaling, imageCropping) {
  var DefaultEntry = this.particleDataStore[0];
  DefaultEntry.imageCanvas = domImgToCanvas(domImage);
  DefaultEntry.imageScaling = imageScaling;
  DefaultEntry.imageCropping = imageCropping;
  this.particleData = 0;
};
/// Hooks are run after the state has adapted to a new config object
RendererState.prototype.addHook = function addHook (hook) {
  this.hooks.push(hook);
};
/// Changes the viewport dimension
/// Not to be confused with the particle grid size. See
/// config.xParticlesCount and config.yParticlesCount for that
RendererState.prototype.resize = function resize (width, height) {
  this.width = width;
  this.height = height;
  this.pipeline.resize(width, height);
};
/// @return viewport width
RendererState.prototype.getWidth = function getWidth () {
  return this.width;
};
/// @return viewport height
RendererState.prototype.getHeight = function getHeight () {
  return this.height;
};

/**
 * The Renderer's job is to perform the following steps:
 * 1. Take a config object with the user's desired settings
 * 2. Inform the RendererState (state) about the new user config
 * 3. Create a new regl command for rendering frames according to the config
 * 4. Update the pipeline so that effects become available that require
 *    more than a single render pass.
 * 5. Inside the regl.frame callback (render loop), hydrate the regl
 *    command (the pipeline, to be more precise) with the current state
 *    and clock info (cf. RendererClock)
 */
var Renderer = function Renderer(canvas) {
  var this$1 = this;

  this.regl = regl({ canvas: canvas });
  console.info(("max texture size: " + (this.regl.limits.maxTextureSize)));
  console.info(("point size dims: " + (this.regl.limits.pointSizeDims[0]) + " " + (this.regl.limits.pointSizeDims[1])));
  console.info(("max uniforms: " + (this.regl.limits.maxVertexUniforms) + " " + (this.regl.limits.maxFragmentUniforms)));
  this.state = new RendererState(this.regl);
  this.config = null;
  this.commandBuilder = new CommandBuilder();
  this.clock = new RendererClock();
  // low pass filtered FPS measurement found on stackoverflow.com/a/5111475/1468532
  var FILTER_STRENGTH = 20;
  this.frameTime = 0;
  this.regl.frame(function () {
    if (!this$1.state.isValid()) {
      return;
    }
    this$1.clock.frame();
    this$1.frameTime += (this$1.clock.getDelta() - this$1.frameTime) / FILTER_STRENGTH;
    this$1.state.pipeline.run({
      config: this$1.config,
      state:this$1.state,
      clock:this$1.clock
    });
  });
};

Renderer.prototype.resize = function resize (width, height) {
  this.state.resize(width, height);
};

Renderer.prototype.getClock = function getClock () {
  return this.clock;
};

Renderer.prototype.setConfig = function setConfig (config) {
    var this$1 = this;

  this.config = config;
  // TODO: rebuild command only when necessary
  this.state.adaptToConfig(config);
  this.commandBuilder.buildCommand({
      config: this.config,
      state:this.state,
      clock:this.clock
  })
  .then(function (command) {
    this$1.clock.reset();
    this$1.clock.setPeriod(this$1.config.duration);
    this$1.state.pipeline.compile(this$1.regl(command));
  }, function (error) { return console.error(error); });
};

Renderer.prototype.getState = function getState () {
  return this.state;
};

Renderer.prototype.getFPS = function getFPS () {
  if (this.frameTime === 0) {
    return '?';
  }
  return Math.round(1000 / this.frameTime);
};

var errorManager = new ErrorManager(function() {
  console.info(Config);

  // some constants
  var imageLoadingClass = 'loading-image';
  var canvas = document.getElementById('main-canvas');

  // set up ui components
  var fullscreenBtn = new FullscreenButton();
  var fullscreenListener = new DoubleClickFullscreen();
  var imgSelect = new ImgSelect();
  var inactivityMonitor = new InactivityMonitor();
  var imgLoadDialog = new LoadImgDialog();
  var renderer = new Renderer(canvas);
  var menu = new MainMenu(renderer.getClock());

  function tryLoadFromLocalStorage() {
    if (window.localStorage) {
      var configJson = window.localStorage.getItem('savedConfig');
      if (configJson !== null) {
        var config = JSON.parse(configJson);
        menu.applyConfig(config);
        menu.submit();
        return true;
      }
    }
    return false;
  }
  function tryLoadFromHash() {
    if (window.location.hash) {
      var hash = window.location.hash.substring(1);
      var hashDict = hash.split('&')
      .reduce(function (acc, item) {
        var parts = item.split('=');
        acc[parts[0]] = parts[1];
        return acc;
      }, {});
      if (hashDict.preset !== undefined && allPresets[hashDict.preset]) {
        var preset = allPresets[hashDict.preset];
        menu.applyConfig(preset.config);
        menu.submit();
        window.location.hash = '';
        return true;
      }
    }
    return false;
  }
  // Try loading the timeline from different places
  if (!tryLoadFromHash()) {
    tryLoadFromLocalStorage();
  }
  window.addEventListener("hashchange", tryLoadFromHash);

  var adjustCanvasSize = function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    renderer.resize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', adjustCanvasSize);
  adjustCanvasSize();

  var earlyConfig = menu.submittedConfig;
  var isInitialPageLoad = true;
  var srcImage = document.createElement('img');
  srcImage.crossOrigin = 'Anonymous'; // http://stackoverflow.com/a/27840082/1468532
  srcImage.src = earlyConfig.defaultImage || 'default.jpg';
  srcImage.onload = function () {
    if (isInitialPageLoad) {
      isInitialPageLoad = false;
      renderer.getState().setDefaultDomImage(
        srcImage, earlyConfig.defaultImageScaling,
        earlyConfig.defaultImageCropping
      );
      // particleCounts are either what has been loaded from localStorage
      // or the dimensions of the default image (adapted to the user's
      // screen aspect ratio)
      var screenAR = window.innerWidth / window.innerHeight;
      var particleCounts = {
        xParticlesCount: menu.submittedConfig.xParticlesCount || srcImage.naturalWidth,
        yParticlesCount: menu.submittedConfig.yParticlesCount || Math.round(srcImage.naturalHeight / screenAR)
      };
      // We want to get the default particle count from the default image,
      // but what the user specified before the page was reloaded should
      // also be ok.
      // Modifying the default config this late seems hacky, but what else
      // can we do?
      menu.defaultConfig = Object.assign(menu.defaultConfig, particleCounts);
      menu.applyConfig(Object.assign(menu.submittedConfig, particleCounts));
      menu.submit();
      document.documentElement.classList.remove(imageLoadingClass);
    } else {
      imgLoadDialog.load(srcImage)
      .then(function (ref) {
        var imageScaling = ref.imageScaling;
        var imageCropping = ref.imageCropping;

        renderer.getState().setDefaultDomImage(srcImage, imageScaling, imageCropping);
        menu.applyConfig(Object.assign({}, menu.submittedConfig, {
          defaultImageScaling: imageScaling, defaultImageCropping: imageCropping
        }));
        // Trigger state.adaptToConfig (rebuilds default particle data) and
        // unpause the renderer clock
        menu.submit();
      }, function () {
        /* User canceled loading image */
        // If we don't clear, changeListeners may not fire if same image is selected again
        imgSelect.clear();
      })
      .then(function () {
        // do this both on cancel and on accept (= .finally())
        document.documentElement.classList.remove(imageLoadingClass);
      });
    }
  };
  srcImage.onerror = function () {
    document.documentElement.classList.remove(imageLoadingClass);
  };

  imgSelect.addChangeListener(function (url) {
    // Prevent messed-up app states caused by multiple parallel image loads
    if (!document.documentElement.classList.contains(imageLoadingClass)) {
      srcImage.src = url;
      document.documentElement.classList.add(imageLoadingClass);
    }
  });

  menu.addChangeListener(function (config) {
    renderer.setConfig(config);
    if (window.localStorage) {
      window.localStorage.setItem('savedConfig', JSON.stringify(config, null, 2));
    }
  });

  // FPS display
  var fpsUpdater = window.setInterval(function () {
    document.title = "Particles (" + (renderer.getFPS()) + " fps)";
  }, 2000);
});

}());
