const handleFileSelect = (files) => {
  if (files.length > 0) {
    const file = files[0];
    console.log(file);
  }
};

if (window.File && window.FileReader && window.FileList && window.Blob) {
  [].forEach.call(document.getElementsByClassName('btn-file-select'), (elm) => {
    elm.addEventListener('change', (evt) => handleFileSelect(evt.target.files));
  });
} else {
  alert('The File APIs are not fully supported in this browser.');
}

// Drag n drop support
const dropbox = document.documentElement;
const dragClass = 'dragging-file';
const dragover = e => {
  e.stopPropagation();
  e.preventDefault();
};
let leaveTimeout = 0;
const dragenter = e => {
  console.log('enter');
  console.log(e.target);
  if (leaveTimeout !== 0) {
    window.clearTimeout(leaveTimeout);
    leaveTimeout = 0;
  }
  dropbox.classList.add(dragClass);
  e.stopPropagation();
  e.preventDefault();
}
const dragleave = e => {
  if (leaveTimeout !== 0) {
    window.clearTimeout(leaveTimeout);
    leaveTimeout = 0;
  }
  leaveTimeout = window.setTimeout(() => {
    console.log('leave');
    console.log(e.target);
    dropbox.classList.remove(dragClass);
    leaveTimeout = 0;
  }, 300);
  e.stopPropagation();
  e.preventDefault();
}
const drop = e => {
  e.stopPropagation();
  e.preventDefault();

  var dt = e.dataTransfer;
  var files = dt.files;

  handleFileSelect(files);
};

dropbox.addEventListener("dragenter", dragenter, false);
dropbox.addEventListener("dragleave", dragleave, false);
dropbox.addEventListener("dragover", dragover, false);
dropbox.addEventListener("drop", drop, false);
