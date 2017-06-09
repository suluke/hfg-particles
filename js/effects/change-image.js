import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';

const EffectName = 'Change Image';

const States = {
  INVALID: 0,
  VALID: 1,
  LOADING: 2
}

class ChangeImageConfigUI extends ConfigUI {
  constructor() {
    super();
    this.element = parseHtml(`
      <fieldset class="effect-change-image-config">
        <legend>${EffectName}</legend>
        <input type="radio" name="effect-change-image-source-type" value="file" checked>
          Upload own image
        </input>
        <input type="radio" name="effect-change-image-source-type" value="url">
          Load image from URL
        </input>
        <br/>
        <label class="effect-change-image-file-tab">
          <input type="file" accept="image/*"/>
        </label>
        <label class="effect-change-image-url-tab">
          Enter image url
          <input type="url"/>
        </label>
        <br/>
        <img class="effect-change-image-preview">
      </fieldset>
    `);
    const ui = this.element;
    this.radioButtons = ui.querySelectorAll('input[type="radio"][name="effect-change-image-source-type"]');
    this.fileInput = ui.querySelector('.effect-change-image-file-tab input[type="file"]');
    this.urlInput = ui.querySelector('.effect-change-image-url-tab input[type="url"]');
    this.previewImg = ui.querySelector('img.effect-change-image-preview');
    this.FR = new FileReader();
    this.state = States.INVALID;
    this.onload = null;

    this.fileInput.addEventListener('change', (evt) => {
      this.state = States.LOADING;
      const file = this.fileInput.files[0];
      if (file) {
        this.FR.onload = () => {
          this.previewImg.src = this.FR.result;
        };
        this.FR.onerror = () => {};
        this.FR.readAsDataURL(file);
      }
    });
    this.urlInput.addEventListener('input', (evt) => {
      this.state = States.LOADING;
      this.previewImg.src = this.urlInput.value;
    });
    this.previewImg.addEventListener('load', () => {
      this.state = States.VALID;
      if (this.onload !== null) {
        this.onload();
        this.onload = null;
      }
    });
    this.previewImg.addEventListener('error', () => {
      this.state = States.INVALID;
      if (this.onload !== null) {
        this.onload();
        this.onload = null;
      }
    });
  }

  getElement() {
    return this.element;
  }

  getConfigAsync() {
    const sourceTy = [].find.call(this.radioButtons, (btn) => btn.checked).value;
    if (this.state === States.VALID) {
      return Promise.resolve({
        sourceTy,
        url: this.previewImg.src
      });
    } else if (this.state === States.INVALID) {
      return Promise.resolve({
        sourceTy,
        url: null
      });
    }
    return new Promise((res) => {
      this.onload = () => this.getConfigAsync().then(res);
    });
  }

  applyConfig(config) {
    if (config.url === null || config.url === '#') {
      this.previewImg.src = '#'; // https://stackoverflow.com/a/13726621/1468532
      this.state = States.INVALID;
    } else {
      this.previewImg.src = config.url;
      this.state = States.VALID;
    }
    [].forEach.call(this.radioButtons, (btn) => {
      btn.checked = (btn.value === config.sourceTy);
    });
  }
}

export default class ChangeImageEffect extends Effect {
  static registerAsync(instance, props, uniforms, vertexShader) {
    return new Promise((res, rej) => {
      const srcImage = document.createElement('img');
      srcImage.crossOrigin = 'Anonymous'; // http://stackoverflow.com/a/27840082/1468532
      srcImage.src = instance.config.url;
      srcImage.onload = () => {
        const particleData = props.state.createParticleDataFromDomImg(srcImage, props.config.xParticlesCount, props.config.yParticlesCount);
        let alive = true;
        let prevWasChange = false;
        const checkTime = () => {
          if (!alive) {
            return;
          }
          if (instance.timeBegin - props.clock.getTime() <= props.clock.getDelta()) {
            props.state.setParticleData(particleData);
          }
          window.requestAnimationFrame(checkTime);
        };
        checkTime();
        props.state.addHook(() => {
          alive = false;
        });
        res();
      };
      srcImage.onerror = rej;
    });
  }

  static getDisplayName() {
    return EffectName;
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new ChangeImageConfigUI();
    }

    return this._configUI;
  }

  static getDefaultConfig() {
    return {
      sourceTy: 'file',
      url: '#'
    };
  }

  static getRandomConfig() {
    return this.getDefaultConfig();
  }
}