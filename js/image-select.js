if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
  throw new Error('The File APIs are not fully supported in this browser.');
}

export default class ImgSelect {
  constructor() {
    // properties:
    this.changeListeners = [];
    this.input = document.getElementById('btn-file-select');

    // drag-n-drop support
    const html = document.documentElement;
    const input = this.input;
    const dragClass = 'dragging-file';
    const dragenter = (e) => {
      html.classList.add(dragClass);
      e.stopPropagation();
      e.preventDefault();
    };
    const dragleave = (e) => {
      html.classList.remove(dragClass);
      e.stopPropagation();
      e.preventDefault();
    };

    html.addEventListener('dragenter', dragenter, false);
    input.addEventListener('dragleave', dragleave, false);
    // if we preventDefault on drop, the change event will not fire
    input.addEventListener('drop', (/* e */) => {
      html.classList.remove(dragClass);
    }, false);

    // catch the change event
    const handleFileSelect = (evt) => {
      let file = null;
      if (evt.target.files.length > 0) {
        file = evt.target.files[0];
      }
      this.changeListeners.forEach((listener) => listener(file));
    };
    input.addEventListener('change', handleFileSelect);
  }

  addChangeListener(listener) {
    this.changeListeners.push(listener);
  }
  clear() {
    this.input.value = null;
  }
}
