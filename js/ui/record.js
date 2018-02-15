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

class Recorder {
  constructor(renderer, ffmpeg) {
    this.renderer = renderer;
    this.ffmpeg = ffmpeg;
    this.frames = [];
    this.frameCallback = (canvas, frameTime) => {
      const gl = canvas.getContext('webgl');
      const w = gl.drawingBufferWidth & (~1);
      const h = gl.drawingBufferHeight & (~1);
      const pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const pixelsClamped = new Uint8ClampedArray(pixels);
      const imgData = new ImageData(pixelsClamped, w, h);
      this.frames.push(imgData);
    };
  }
  start() {
    this.renderer.addFrameListener(this.frameCallback);
  }
  stop() {
    this.renderer.removeFrameListener(this.frameCallback);
  }
  compile(callback) {
    let stdout = '';
    let stderr = '';
    this.ffmpeg.onmessage = (e) => {
      const msg = e.data;
      switch (msg.type) {
      case 'stdout':
        stdout += msg.data + "\n";
        break;
      case 'stderr':
        stderr += msg.data + "\n";
        break;
      case 'exit':
        console.log(stdout);
        console.log(stderr);
        console.log(`Process exited with code ${msg.data}`);
        break;
      case 'done':
        const video = msg.data.MEMFS[0].data;
        const blob = new Blob([video]);
        this.present(blob, callback);
        break;
      }
    };
    const files = [];
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
    const canvas = document.createElement('canvas');
    const w = this.frames[0].width;
    const h = this.frames[0].height;
    const maxDim = 800;
    canvas.width = w > h ? maxDim : w / h * maxDim;
    canvas.height = w > h ? h / w * maxDim : maxDim;
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < this.frames.length; i++) {
      ctx.putImageData(this.frames[i], 0, 0);
      const url = canvas.toDataURL('image/jpeg').replace(/^data:image\/jpeg;base64,/, '');
      const byteString = atob(url);
      const ab = new ArrayBuffer(byteString.length);
      // create a view into the buffer
      const ia = new Uint8Array(ab);
      // set the bytes of the buffer to the correct values
      for (let p = 0; p < byteString.length; p++) {
        ia[p] = byteString.charCodeAt(p);
      }
      const file = {
        name: `img${pad(i, 4)}.jpg`,
        data: ia
      };
      files.push(file);
    }
    this.frames = []; // free frame data
    this.ffmpeg.postMessage({
      type: 'run',
      arguments: [
        '-r', '20', '-f', 'image2', '-s', `${w}x${h}`, '-i', 'img%04d.jpg', '-vcodec', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', 'out.mp4'
      ],
      MEMFS: files
    });
  }
  present(blob, callback) {
    const url = window.URL.createObjectURL(blob);
    console.log(blob);
    console.log(url);
    callback(blob, url);
  }
}

export default class RecordButton {
  constructor(renderer) {
    // set up dom elements (but don't display them yet)
    const container = document.querySelector('body');
    const elm = parseHtml(`
      <button type="button" class="btn-record">
    `);
    elm.addEventListener('click', (...args) => { this.onClick(...args); });

    ffmpegLoader.getFFMPEG()
      .then((ffmpeg) => {
        container.appendChild(elm);
        this.ffmpeg = ffmpeg;
        console.log(ffmpeg);
      }, (err) => {
        console.error(err);
      });

    this.elm = elm;
    this.recorder = null;
    this.renderer = renderer;
    this.ffmpeg = null;
  }

  onClick() {
    if (this.recorder == null) {
      this.recorder = new Recorder(this.renderer, this.ffmpeg);
      this.recorder.start();
    } else {
      this.recorder.stop();
      this.recorder.compile((blob, url) => {
        const dlLink = document.createElement('a');
        dlLink.setAttribute('href', url);
        dlLink.setAttribute('download', 'video.mp4');
        dlLink.textContent = 'DOWNLOAD';
        this.elm.appendChild(dlLink);
      });
      this.recorder = null;
    }
    this.elm.classList.toggle('recording');
  }
}
