export default class ImgDragDrop {
  constructor() {
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
  }
};
