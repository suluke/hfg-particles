import WebMWriter from '../vendor/webm-writer-0.2.0.js'
import { parseHtml } from './util';

class FfmpegLoader {
  constructor() {
    this.STATES = {IDLE: 1, PENDING: 2, LOADED: 3, ERROR: 0};
    this.state = this.STATES.IDLE;
    this.ffmpeg = null;
    this.observers = [];
    this.error = null;
  }
  startLoading() {
    const worker = new Worker('ffmpeg-worker-mp4.js');
    this.state = this.STATES.PENDING;
    worker.onmessage = ({data: msg}) => {
      if (msg.type === 'ready') {
        this.state = this.STATES.LOADED;
        this.ffmpeg = worker;
        for (let i = 0; i < this.observers.length; i++) {
          this.observers[i].resolve(this.ffmpeg);
        }
        this.observers = [];
      }
    };
    worker.onerror = (error) => {
      this.state = this.STATES.ERROR;
      this.error = error;
      for (let i = 0; i < this.observers.length; i++) {
        this.observers[i].reject(this.ffmpeg);
      }
      this.observers = [];
    };
  }
  getFFMPEG() {
    return new Promise((resolve, reject) => {
      if (this.state === this.STATES.LOADED) {
        resolve(this.ffmpeg);
      } else if (this.state === this.STATES.ERROR) {
        reject(this.error);
      } else if (this.state === this.STATES.IDLE) {
        this.observers.push({resolve, reject});
        this.startLoading();
      } else if (this.state === this.STATES.PENDING) {
        this.observers.push({resolve, reject});
      } else {
        throw new Error('Illegal FfmpegLoader state encountered');
      }
    });
  }
};

const ffmpegLoader = new FfmpegLoader();

class FfmpegRecorder {
  constructor(renderer, ffmpeg) {
    this.fps = 20;
    this.renderer = renderer;
    this.scalingCanvas = document.createElement('canvas');
    // TODO no idea what happens when we resize - but who would want to
    // resize while recording anyways?
    const renderW = renderer.getState().getWidth();
    const renderH = renderer.getState().getHeight();
    const maxDim = 640;
    const scaledW = Math.round(renderW > renderH ? maxDim : renderW / renderH * maxDim) & (~1);
    const scaledH = Math.round(renderW > renderH ? renderH / renderW * maxDim : maxDim) & (~1);
    this.scalingCanvas.width  = scaledW;
    this.scalingCanvas.height = scaledH;
    const scalingCtx = this.scalingCanvas.getContext('2d');
    this.ffmpeg = ffmpeg;
    this.frames = [];
    this.dimensions = { width: scaledW, height: scaledH };

    const desiredFrameTime = 1 / this.fps * 1000;
    let waited = desiredFrameTime;
    this.frameCallback = (canvas, frameTime) => {
      waited += frameTime;
      if (waited >= desiredFrameTime) {
        waited = 0;
        scalingCtx.drawImage(canvas, 0, 0, scaledW, scaledH);
        // compress the image as jpg by making a base64 data-url and
        // decoding it to plain bytes (which can be consumed by ffmpeg)
        const url = this.scalingCanvas.toDataURL('image/jpeg').replace(/^data:image\/jpeg;base64,/, '');
        const byteString = atob(url);
        const ab = new ArrayBuffer(byteString.length);
        // create a view into the buffer
        const ia = new Uint8Array(ab);
        // set the bytes of the buffer to the correct values
        for (let p = 0; p < byteString.length; p++) {
          ia[p] = byteString.charCodeAt(p);
        }
        this.frames.push(ia);
      }
    };
  }
  start() {
    this.renderer.addFrameListener(this.frameCallback);
  }
  stop() {
    this.renderer.removeFrameListener(this.frameCallback);
  }
  compile(onProgress) {
    return new Promise((resolve, reject) => {
      const frameCount = this.frames.length;

      // set up communication with ffmpeg webworker
      let stdout = '';
      let stderr = '';
      let exitCode = 0;
      const progressRegex = /^frame=\s*([0-9]+) fps=/;
      this.ffmpeg.onmessage = (e) => {
        const msg = e.data;
        switch (msg.type) {
        case 'stdout':
          stdout += msg.data + "\n";
          break;
        case 'stderr':
          if (progressRegex.test(msg.data)) {
            const res = progressRegex.exec(msg.data);
            if (onProgress) {
              onProgress(res[1] / frameCount);
            }
          }
          stderr += msg.data + "\n";
          break;
        case 'exit':
          exitCode = msg.data;
          break;
        case 'done':
          if (exitCode === 0) {
            const video = msg.data.MEMFS[0].data;
            const blob = new Blob([video]);
            const url = window.URL.createObjectURL(blob);
            resolve({blob, url});
          } else {
            console.log(`FFMPEG exited with code ${exitCode}`);
            reject(new Error(stderr));
          }
          break;
        }
      };

      /// Pad the given number n to have the desired width
      const pad = (n, width) => {
        n = `${n}`;
        if (n.length >= width) {
          if (n.length > width) {
            console.warn('Number too big for padding to width');
          }
          return n;
        }
        const padding = new Array(width - n.length + 1).join('0');
        return `${padding}${n}`;
      };

      // set up the virtual filesystem for ffmpeg
      const MEMFS = [];
      let frameNum = 0;
      const padWidth = Math.ceil(Math.log10(frameCount));
      const { width:w, height:h } = this.dimensions;
      while (this.frames.length > 0) {
        const frame = this.frames.shift();
        const file = {
          name: `img${pad(frameNum++, padWidth)}.jpg`,
          data: frame
        };
        MEMFS.push(file);
      }
      // kick off encoding
      const filePattern = `img%0${padWidth}d.jpg`;
      this.ffmpeg.postMessage({
        type: 'run',
        arguments: [
          '-r', `${this.fps}`, '-f', 'image2', '-s', `${w}x${h}`, '-i', filePattern, '-vcodec', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '25', 'out.mp4'
        ],
        MEMFS,
        TOTAL_MEMORY: 100000000
      });
    });
  }
}

class FfmpegRecorderActivationDialog {
  constructor() {
    const classPrefix = 'video-recording';
    const activateBtnClass = `btn-${classPrefix}-activate`;
    const cancelBtnClass = `btn-${classPrefix}-cancel`;

    // Object properties
    this.parentNode = document.getElementById('modal-container');
    this.resolve = null;
    this.reject = null;
    this.elm = parseHtml(`
      <div class="${classPrefix}-backdrop">
        <div class="${classPrefix}-popup">
          <h3>
            WARNING: You are about to activate the video recording feature.
          </h3>
          <p>
            This feature
            <ul>
              <li>is highly experimental technology</li>
              <li>is still under development</li>
              <li>needs to download an additional 13mb of javascript</li>
            </ul>
            For these reasons, the overall user experience is likely to suffer.
            You can still cancel activating this feature by clicking 'Cancel' below.
          </p>
          <button type="button" class="${activateBtnClass}">Activate</button>
          <button type="button" class="${cancelBtnClass}">Cancel</button>
        </div>
      </div>
    `);
    const activateBtn = this.elm.querySelector(`.${activateBtnClass}`);
    activateBtn.addEventListener('click', () => {
      this.hide();
      this.resolve();
    });
    const cancelBtn = this.elm.querySelector(`.${cancelBtnClass}`);
    cancelBtn.addEventListener('click', () => {
      this.hide();
      this.reject(new Error('User canceled recorder activation'));
    });
  }
  promptUser() {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.parentNode.appendChild(this.elm);
    });
  }
  hide() {
    this.parentNode.removeChild(this.elm);
  }
}

class WebMRecorder {
  constructor(renderer) {
    this.fps = 20;
    this.renderer = renderer;
    this.writer = new WebMWriter({
      quality: 0.95,
      fileWriter: null,
      frameRate: this.fps
    });
    const scalingCanvas = document.createElement('canvas');
    const renderW = renderer.getState().getWidth();
    const renderH = renderer.getState().getHeight();
    const maxDim = 640;
    const scaledW = Math.round(renderW > renderH ? maxDim : renderW / renderH * maxDim) & (~1);
    const scaledH = Math.round(renderW > renderH ? renderH / renderW * maxDim : maxDim) & (~1);
    scalingCanvas.width  = scaledW;
    scalingCanvas.height = scaledH;
    const scalingCtx = scalingCanvas.getContext('2d');
    const desiredFrameTime = 1 / this.fps * 1000;
    let waited = desiredFrameTime;
    this.frameCallback = (canvas, frameTime) => {
      waited += frameTime;
      if (waited >= desiredFrameTime) {
        waited = 0;
        scalingCtx.drawImage(canvas, 0, 0, scaledW, scaledH);
        this.writer.addFrame(scalingCanvas);
      }
    };
  }

  start() {
    this.renderer.addFrameListener(this.frameCallback);
  }
  stop() {
    this.renderer.removeFrameListener(this.frameCallback);
  }

  compile() {
    return this.writer.complete().then((blob) => {
      return { blob, url: window.URL.createObjectURL(blob) };
    });
  }

  // https://stackoverflow.com/a/27232658/1468532
  static isSupported() {
    const canvas = document.createElement('canvas');
    if (!!(canvas.getContext && canvas.getContext('2d'))) {
        // was able or not to get WebP representation
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') == 0;
    }
    // very old browser like IE 8, canvas not supported
    return false;
  }
}

export default class RecordButton {
  constructor(renderer) {
    this.recorder = null;
    this.renderer = renderer;
    this.ffmpeg = null;
    this.dlLink = null;
    // set up dom elements (but don't display them yet)
    const elm = parseHtml(`
      <div class="recorder-container disabled">
        <svg xmlns="http://www.w3.org/2000/svg" class="recorder-encoding-progress"></svg>
        <button type="button" class="btn-record">
      </div>
    `);
    const container = document.querySelector('body');
    container.appendChild(elm);
    const btn = elm.querySelector('button');
    this.btn = btn;
    this.elm = elm;
    if (WebMRecorder.isSupported()) {
      this.elm.classList.remove('disabled');
      this.btn.addEventListener('click', (...args) => { this.onClick(...args); });
    } else {
      this.activateListener = () => { this.showActivationDialog(); }
      btn.addEventListener('click', this.activateListener);
    }
  }

  showActivationDialog() {
    const dialog = new FfmpegRecorderActivationDialog();
    dialog.promptUser()
      .then(() => {
        this.btn.removeEventListener('click', this.activateListener);
        this.activate();
      }, (error) => {
        // Nothing to do
      });
  }

  activate() {
    this.btn.addEventListener('click', (...args) => { this.onClick(...args); });
    ffmpegLoader.getFFMPEG()
      .then((ffmpeg) => {
        this.elm.classList.remove('disabled');
        this.ffmpeg = ffmpeg;
      }, (err) => {
        console.error(err);
      });
  }

  onClick() {
    if (this.recorder === null) {
      if (this.ffmpeg !== null)
        this.recorder = new FfmpegRecorder(this.renderer, this.ffmpeg);
      else
        this.recorder = new WebMRecorder(this.renderer);
      if (this.dlLink !== null) {
        this.dlLink.parentNode.removeChild(this.dlLink);
      }
      this.recorder.start();
    } else {
      this.elm.classList.add('processing');
      this.recorder.stop();
      // encoding has the highest priority now (for the user as-well)
      // so at least pretend to free CPU resources by pausing
      this.renderer.getClock().setPaused();
      // compiling the video at least used to take quite some time, so
      // let's put it in the next event loop iteration
      window.setTimeout(() => {
        this.recorder.compile((progress) => { console.log(progress); })
          .then(({blob, url}) => {
            const outfile = this.ffmpeg === null ? 'video.webm' : 'video.mp4';
            const dlLink = document.createElement('a');
            dlLink.setAttribute('href', url);
            dlLink.setAttribute('download', outfile);
            dlLink.textContent = 'DOWNLOAD';
            this.elm.appendChild(dlLink);
            this.dlLink = dlLink;
          }, (error) => {
            console.error(error);
          })
          .then(() => {
            this.elm.classList.remove('processing');
            this.renderer.getClock().setPaused(false);
          });
        this.recorder = null;
      }, 0);
    }
    this.elm.classList.toggle('recording');
  }
}
