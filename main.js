(function () {
'use strict';

// Source: https://gist.github.com/k-gun/c2ea7c49edf7b757fe9561ba37cb19ca
(function() {
  // helpers
  var regExp = function(name) {
    return new RegExp('(^| )'+ name +'( |$)');
  };
  var forEach = function(list, fn, scope) {
    for (var i = 0; i < list.length; i++) {
      fn.call(scope, list[i]);
    }
  };

  // class list object with basic methods
  function ClassList(element) {
    this.element = element;
  }

  ClassList.prototype = {
    add: function() {
      forEach(arguments, function(name) {
        if (!this.contains(name)) {
          this.element.className += this.element.className.length > 0 ? ' ' + name : name;
        }
      }, this);
    },
    remove: function() {
      forEach(arguments, function(name) {
        this.element.className =
          this.element.className.replace(regExp(name), '');
      }, this);
    },
    toggle: function(name) {
      return this.contains(name) 
        ? (this.remove(name), false) : (this.add(name), true);
    },
    contains: function(name) {
      return regExp(name).test(this.element.className);
    },
    // bonus..
    replace: function(oldName, newName) {
      this.remove(oldName), this.add(newName);
    }
  };

  // IE8/9, Safari
  if (!('classList' in Element.prototype)) {
    Object.defineProperty(Element.prototype, 'classList', {
      get: function() {
        return new ClassList(this);
      }
    });
  }

  // replace() support for others
  if (window.DOMTokenList && DOMTokenList.prototype.replace == null) {
    DOMTokenList.prototype.replace = ClassList.prototype.replace;
  }
})();

var toggleFullScreen = function () {
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

[].forEach.call(document.getElementsByClassName('btn-fullscreen'), function (elm) {
  elm.addEventListener('click', toggleFullScreen);
});

var isFullscreen = function () {
  return document.fullscreen || document.mozFullScreen ||
    document.webkitIsFullScreen || document.msFullscreenElement;
};
var updateFullscreenClass = function () {
  var fullscreenClass = 'fullscreen';
  if (isFullscreen())
    { document.documentElement.classList.add(fullscreenClass); }
  else
    { document.documentElement.classList.remove(fullscreenClass); }
};

document.addEventListener("fullscreenchange", updateFullscreenClass, false);
document.addEventListener("mozfullscreenchange", updateFullscreenClass, false);
document.addEventListener("webkitfullscreenchange", updateFullscreenClass, false);
document.addEventListener("msfullscreenchange", updateFullscreenClass, false);
updateFullscreenClass();

if (window.File && window.FileReader && window.FileList && window.Blob) {
  var handleFileSelect = function (evt) {
    if (evt.target.files.length > 0) {
      var file = evt.target.files[0];
      console.log(file);
    }
  };

  [].forEach.call(document.getElementsByClassName('btn-file-select'), function (elm) {
    elm.addEventListener('change', handleFileSelect);
  });
} else {
  alert('The File APIs are not fully supported in this browser.');
}

var menu = document.getElementById('menu-container');
var toggle = document.getElementById('toggle-menu-visible');

document.addEventListener('click', function (evt) {
  if (!menu.contains(evt.target)) {
    toggle.checked = false;
  }
});

}());
