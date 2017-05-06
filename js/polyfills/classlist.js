// Source: https://gist.github.com/k-gun/c2ea7c49edf7b757fe9561ba37cb19ca
(function setupClasslistPolyfill() {
  // helpers
  const regExp = name => new RegExp(`(^| )${name}( |$)`);
  const forEach = (list, fn, scope) => {
    for (let i = 0; i < list.length; i++) {
      fn.call(scope, list[i]);
    }
  };

  // class list object with basic methods
  function ClassList(element) {
    this.element = element;
  }

  ClassList.prototype = {
    add(...args) {
      forEach(args, (name) => {
        if (!this.contains(name)) {
          this.element.className += this.element.className.length > 0 ? ` ${name}` : name;
        }
      }, this);
    },
    remove(...args) {
      forEach(args, (name) => {
        this.element.className =
          this.element.className.replace(regExp(name), '');
      }, this);
    },
    toggle(name) {
      return this.contains(name)
        ? (this.remove(name), false) : (this.add(name), true);
    },
    contains(name) {
      return regExp(name).test(this.element.className);
    },
    // bonus..
    replace(oldName, newName) {
      this.remove(oldName);
      this.add(newName);
    }
  };

  // IE8/9, Safari
  if (!('classList' in Element.prototype)) {
    Object.defineProperty(Element.prototype, 'classList', {
      get() {
        return new ClassList(this);
      }
    });
  }

  // replace() support for others
  if (window.DOMTokenList && DOMTokenList.prototype.replace == null) {
    DOMTokenList.prototype.replace = ClassList.prototype.replace;
  }
}());
