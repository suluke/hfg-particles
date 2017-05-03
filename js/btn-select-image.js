if (window.File && window.FileReader && window.FileList && window.Blob) {
  const handleFileSelect = (evt) => {
    if (evt.target.files.length > 0) {
      const file = evt.target.files[0];
      console.log(file);
    }
  };

  [].forEach.call(document.getElementsByClassName('btn-file-select'), (elm) => {
    elm.addEventListener('change', handleFileSelect);
  });
} else {
  alert('The File APIs are not fully supported in this browser.');
}
