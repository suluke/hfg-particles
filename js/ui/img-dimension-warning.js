export default class ImgDimWarn {
  constructor() {
    const ignoreWarnBtnClass = 'btn-img-dim-warn-ignore';
    const cancelLoadBtnClass = 'btn-img-dim-warn-cancel';
    const scaledLoadBtnClass = 'btn-img-dim-warn-scale';
    const scaledLoadXInputClass = 'img-dim-x';
    const scaledLoadYInputClass = 'img-dim-y';

    const parser = document.createElement('body');
    // Object properties
    this.resolve = null;
    this.reject = null;
    parser.innerHTML = `
      <div class="img-dim-warn-backdrop">
        <div class="img-dim-warn-popup">
          The image you selected is very large. Loading it may cause the
          site to become very slow/unresponsive. <br/>
          Do you still want to proceed?<br/>
          <button type="button" class="${ignoreWarnBtnClass}">Yes, load big image</button>
          <button type="button" class="${cancelLoadBtnClass}">Cancel</button>
          <input type="checkbox"
            name="toggle-advanced-load-options"
            id="toggle-advanced-load-options"
            class="toggle-advanced-load-options"/>
          <label for="toggle-advanced-load-options"
            class="btn-toggle-advanced-load-options"
            title="Toggle advanced options"
          ></label>
          <div>
            Scale image to size before loading: <br/>
            width: <input type="number" class="${scaledLoadXInputClass}"/><br/>
            height: <input type="number" class="${scaledLoadYInputClass}"/><br/>
            <button type="button" class="${scaledLoadBtnClass}">Load scaled image</button>
          </div>
        </div>
      </div>
    `;
    // Whitespace in template causes 'text' nodes to be in parser, so index
    // becomes 1
    this.dialogElm = parser.childNodes[1];

    const loadBtn = this.dialogElm.querySelector(`.${ignoreWarnBtnClass}`);
    loadBtn.addEventListener('click', () => {
      this.hide();
      this.resolve({
        xParticlesCount: parseInt(this.xParticlesInput.value, 10),
        yParticlesCount: parseInt(this.yParticlesInput.value, 10)
      });
    });
    const cancelBtn = this.dialogElm.querySelector(`.${cancelLoadBtnClass}`);
    cancelBtn.addEventListener('click', () => {
      this.hide();
      this.reject();
    });
    const loadScaledBtn = this.dialogElm.querySelector(`.${scaledLoadBtnClass}`);
    loadScaledBtn.addEventListener('click', () => {
      this.hide();
      this.resolve({
        xParticlesCount: parseInt(this.xParticlesInput.value, 10),
        yParticlesCount: parseInt(this.yParticlesInput.value, 10)
      });
    });
    this.xParticlesInput = this.dialogElm.querySelector(`.${scaledLoadXInputClass}`)
    this.yParticlesInput = this.dialogElm.querySelector(`.${scaledLoadYInputClass}`)
  }
  verify(img) {
    const tooManyPixels = 1024 * 768; // TODO Magic number

    return new Promise((res, rej) => {
      if (img.naturalWidth * img.naturalHeight >= tooManyPixels) {
        this.resolve = res;
        this.reject = rej;
        this.xParticlesInput.value = `${img.naturalWidth}`;
        this.yParticlesInput.value = `${img.naturalHeight}`;
        
        document.body.appendChild(this.dialogElm);
      } else {
        res({
          xParticlesCount: img.naturalWidth,
          yParticlesCount: img.naturalHeight
        });
      }
    });
  }
  hide() {
    document.body.removeChild(this.dialogElm);
  }
}
