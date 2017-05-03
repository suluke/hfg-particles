if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
  throw new Error('The File APIs are not fully supported in this browser.');
}

export default class SelectImgButton {
  constructor() {
    // properties:
    this.changeListeners = [];
    
    const handleFileSelect = (files) => {
      let file = null;
      if (files.length > 0) {
        file = files[0];
      }
      this.changeListeners.forEach(listener => listener(file));
    };
    [].forEach.call(document.getElementsByClassName('btn-file-select'), (elm) => {
      elm.addEventListener('change', (evt) => handleFileSelect(evt.target.files));
    });
  }

  addChangeListener(listener) {
    this.changeListeners.push(listener);
  }
};
