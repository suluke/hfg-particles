import { parseHtml } from './util';
import Whammy from 'whammy';

class Recorder {
  constructor(renderer) {
    this.renderer = renderer;
    this.video = new Whammy.Video();
    this.frameCallback = (canvas, frameTime) => {
      const w = canvas.width;
      const h = canvas.height;
      //~ const gl = canvas.getContext('webgl');
      //~ const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
      //~ gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const pixels = renderer.regl.read();
      const pixelsClamped = new Uint8ClampedArray(pixels);
      const imgData = new ImageData(pixelsClamped, w, h);
      this.video.add(imgData, frameTime);
    };
  }
  start() {
    this.renderer.addFrameListener(this.frameCallback);
  }
  stop() {
    this.renderer.removeFrameListener(this.frameCallback);
  }
  compile(callback) {
    this.video.compile(false, (result) => { this.present(result, callback); });
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
    if (!RecordButton.isSupported()) {
      console.warn('Recording video is not supported (no webp)');
      return;
    }

    const container = document.querySelector('body');
    const elm = parseHtml(`
      <button type="button" class="btn-record">
    `);
    container.appendChild(elm);
    elm.addEventListener('click', (...args) => { this.onClick(...args); });

    this.elm = elm;
    this.recorder = null;
    this.renderer = renderer;
  }

  onClick() {
    if (this.recorder == null) {
      this.recorder = new Recorder(this.renderer);
      this.recorder.start();
    } else {
      this.recorder.stop();
      this.recorder.compile((blob, url) => {
        const dlLink = document.createElement('a');
        dlLink.setAttribute('href', url);
        dlLink.setAttribute('download', 'video.webm');
        dlLink.textContent = 'DOWNLOAD';
        this.elm.appendChild(dlLink);
      });
      this.recorder = null;
    }
    this.elm.classList.toggle('recording');
  }

  static isSupported() {
    const requiredFormat = 'image/webp';
    const defaultFormat = 'image/png';
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "rgba(255, 0, 0, 1)";
    ctx.fillRect(0, 0, 1, 1);
    const test = canvas.toDataURL(requiredFormat);
    return test.startsWith(`data:${requiredFormat}`) &&
          !test.startsWith(`data:${defaultFormat}`);
  }
}
