if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
  throw new Error('The File APIs are not fully supported in this browser.');
}

export default class ImgSelect {
  constructor() {
    // properties:
    this.changeListeners = [];
    this.input = document.getElementById('btn-file-select');
    this.FR = new FileReader();

    // drag-n-drop support
    const html = document.documentElement;
    const input = this.input;
    const dragClass = 'dragging-file';
    html.addEventListener('dragenter', (e) => {
      html.classList.add(dragClass);
      e.stopPropagation();
      e.preventDefault();
    });
    html.addEventListener('dragleave', (e) => {
      if (e.clientX === 0 && e.clientY === 0) {
        html.classList.remove(dragClass);
      }
      e.stopPropagation();
      e.preventDefault();
    });
    // needed to prevent browser redirect to dropped file:
    // http://stackoverflow.com/a/6756680/1468532
    html.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    html.addEventListener('drop', (e) => {
      html.classList.remove(dragClass);
      const fileItem = [].find.call(e.dataTransfer.items, (item) => item.kind === 'file');
      if (fileItem) {
        this.fileToUrl(fileItem.getAsFile())
        .then((url) => {
          this.changeListeners.forEach((listener) => listener(url));
        }, (msg) => {
          // TODO
          console.error(msg);
        });
        e.preventDefault();

        return;
      }
      const urlItem = [].find.call(e.dataTransfer.items, (item) => (item.kind === 'string' && item.type === 'text/uri-list'));
      if (urlItem) {
        urlItem.getAsString((url) => {
          this.changeListeners.forEach((listener) => listener(url));
        });
        e.preventDefault();
      }
    });

    // Try to catch clipboard pastes
    [].forEach.call(document.body.querySelectorAll('.img-paste-box'), (box) => {
      box.addEventListener('paste', (e) => {
        const fileItem = [].find.call(e.clipboardData.items, (item) => item.kind === 'file');
        if (fileItem) {
          this.fileToUrl(fileItem.getAsFile())
          .then((url) => {
            this.changeListeners.forEach((listener) => listener(url));
          }, (msg) => {
            // TODO
            console.error(msg);
          });
        }
        e.preventDefault();
      });
      // Also undo effects of contenteditable="true" - we really only
      // want it for "paste" option in context menu
      box.addEventListener('keydown', (e) => {
        if (e.key.length > 1) { // no text input
          return;
        }
        e.preventDefault();
      });
      // Touch devices might fire up a virtual keyboard, which is confusing
      // so in this case, we need to completely disable this feature :(
      box.addEventListener('touchend', (e) => {
        box.readonly = true; // Force keyboard to hide on input field.
        box.disabled = true; // Force keyboard to hide on textarea field.
        setTimeout(() => {
          box.blur();  //actually close the keyboard
          // Remove readonly attribute after keyboard is hidden.
          box.readonly = false;
          box.disabled = false;
        }, 100);
      });
    });

    // catch the change event
    input.addEventListener('change', (evt) => {
      const file = evt.target.files[0];
      if (file) {
        this.fileToUrl(file)
        .then((url) => {
          this.changeListeners.forEach((listener) => listener(url));
        }, (msg) => {
          // TODO
          console.error(msg);
        });
      }
    });
  }

  fileToUrl(file) {
    return new Promise((res, rej) => {
      // TODO why would this be null?
      if (file === null) {
        rej('File was null');
      }
      if (this.FR.readyState === 1) {
        this.FR.abort();
      }
      this.FR.onload = () => {
        res(this.FR.result);
      };
      this.FR.onerror = rej;
      this.FR.readAsDataURL(file);
    });
  }

  addChangeListener(listener) {
    this.changeListeners.push(listener);
  }
  clear() {
    this.input.value = null;
  }
}
