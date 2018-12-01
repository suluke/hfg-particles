import Effect, { ConfigUI, fract } from './effect';
import { parseHtml, imageScalingMarkup } from '../ui/util';
import { ImageCapture } from 'image-capture/lib/imagecapture';

const EffectName = 'Webcam';

class WebcamConfigUI extends ConfigUI {
  constructor() {
    super();
    const classPrefix = 'effect-webcam';
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
        Especially in Firefox, it is sometimes necessary to wait some time
        before webcam images can be retrieved. It may also be helpful to
        retry connecting to the webcam several times.
        <br />
        <label>
          Max number of retries:
          <input type="number" min="0" max="10" step="1" value="3" class="${classPrefix}-retries" />
        </label>
        <br/>
        <label>
          Delay between retries:
          <input type="number" min="0" max="10000" step="1" value="1000" class="${classPrefix}-retry-timeout" />ms
        </label>
        <br/>
        ${imageScalingMarkup(classPrefix)}
      </fieldset>
    `);
    const ui = this.element;
    this.maxRetriesInput = ui.querySelector(`.${classPrefix}-retries`);
    this.retryTimeoutInput = ui.querySelector(`.${classPrefix}-retry-timeout`);

    this.maxRetriesInput.addEventListener('change', () => {
      this.notifyChange();
    });
    this.retryTimeoutInput.addEventListener('change', () => {
      this.notifyChange();
    });

    this.scalingSelect = ui.querySelector(`select.${classPrefix}-scaling-select`);
    this.scalingSelect.addEventListener('change', () => {
      this.notifyChange();
    });
    this.cropXSelect = ui.querySelector(`select.${classPrefix}-crop-x-select`);
    this.cropXSelect.addEventListener('change', () => {
      this.notifyChange();
    });
    this.cropYSelect = ui.querySelector(`select.${classPrefix}-crop-y-select`);
    this.cropYSelect.addEventListener('change', () => {
      this.notifyChange();
    });
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    const imageScaling = this.scalingSelect.value;
    const imageCropping = {
      x: this.cropXSelect.value,
      y: this.cropYSelect.value
    };
    return {
      maxRetries: parseInt(this.maxRetriesInput.value, 10),
      retryTimeout: parseInt(this.retryTimeoutInput.value, 10),
      imageScaling,
      imageCropping
    };
  }

  applyConfig(config) {
    this.maxRetriesInput.value = config.maxRetries || 3;
    this.retryTimeoutInput.value = config.retryTimeout || 1000;
    this.scalingSelect.value = config.imageScaling || 'crop-to-viewport';
    const imageCropping = config.imageCropping || {x: 'crop-both', y: 'crop-both'};
    this.cropXSelect.value = imageCropping.x;
    this.cropYSelect.value = imageCropping.y;
  }
}

class WebcamEffectImpl {
  constructor(instance, props) {
    this.instance = instance;
    this.props = props;

    this.alive = false;
    this.retries = 0;
    this.canvas = document.createElement('canvas');
    this.stream = null;
    this.track = null;
    this.capture = null;
    this.particleData = -1;
  }

  isActive() {
    const instance = this.instance;
    const clock = this.props.clock;
    const time = clock.getTime();
    return this.isAlive() && !clock.isPaused() && instance.timeBegin <= time && time <= instance.timeEnd;
  }
  isAlive() {
    return this.alive;
  }
  start() {
    this.alive = true;
    // Shutdown hook
    this.props.state.addHook(() => this.kill());
    return this.createStream()
    .then((stream) => { this.stream = stream; return this.createTrack(); },
          (err) => Promise.reject(err))
    .then((track) => { this.track = track; this.capture = new ImageCapture(this.track); return this.tryStartGrabbing(); },
          (err) => Promise.reject(err));
  }
  kill() {
    this.alive = false;
    // FIXME understand and document when this can happen.
    // E.g. when the getUserMedia() request is ignored in icognito
    // mode
    const stream = this.stream;
    if (stream !== null) {
      const allTracks = stream.getTracks();
      for (let i = 0; i < allTracks.length; i++) {
        allTracks[i].stop();
      }
    }
    this.stream = null;
  }
  grabLoop() {
    // When we are sure grabbing images works (which happens further
    // below) we call this function to grab frames repeatedly in a loop
    if (this.isAlive()) {
      const track = this.track;
      const capture = this.capture;
      if (track.muted) {
        this.kill();
        console.warn('Video stream muted. Spinning up new WebcamEffectImpl...');
        new WebcamEffectImpl(this.instance, this.props).start();
        return;
      }
      // FIXME if we don't grab frames, Chrome will soon make the
      // track invalid, causing the next grabFrame to throw an error
      // Otherwise, we could test here if we are active and do a
      // no-op instead of grabFrame
      capture.grabFrame()
      .then((frame) => {
        this.processFrame(frame);
        // Queue this into the next animation frame so we don't
        // explode the call stack with recursive calls
        window.requestAnimationFrame(() => this.grabLoop());
      }, (err) => {
        // Throw this error into the global scope
        window.setTimeout(() => { throw new Error('Cannot grab images from the camera'); }, 0);
      });
    }
  }
  tryStartGrabbing() {
    // As it turns out, having the video alone is not a guarantee that
    // we can actually grab images (at least on FF). So let's make sure
    // it works at least one time
    return new Promise((res, rej) => {
      const testGrab = (err) => {
        this.capture.grabFrame()
        .then((frame) => {
          // Success, resolve and start grabbing!
          this.processFrame(frame);
          this.grabLoop();
          res();
        }, (err) => {
          // Aw, no image :( Maybe try again?
          if (this.retries < this.instance.config.maxRetries) {
            this.retries = this.retries + 1;
            window.setTimeout(testGrab, this.instance.config.retryTimeout);
          } else {
            // We finally have to give up :/
            rej(new Error('Cannot grab images from camera'));
          }
        });
      };
      testGrab();
    });
  }
  processFrame(image) {
    // This is where the magic happens
    if (this.isActive()) {
      const canvas = this.canvas;
      const state = this.props.state;
      const config = this.instance.config;
      const w = image.width;
      const h = image.height;
      // FIXME the camera resolution shouldn't change all that often
      //       Maybe we can do this only once. Or we keep relying on
      //       the browser to optimize.
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.scale(-1, -1);
      ctx.drawImage(image, 0, 0, -w, -h);
      const pd = state.createParticleData(canvas, config.imageScaling, config.imageCropping);
      state.setParticleData(pd);
      if (this.particleData !== -1) {
        state.destroyParticleData(this.particleData);
      }
      this.particleData = pd;
    }
  }
  createStream() {
    const mediaConstraints = {
      audio: false,
      video: true // we want video
    };
    // Let's ask the browser if we can haz video
    return navigator.mediaDevices.getUserMedia(mediaConstraints);
  }
  createTrack() {
    const videoTracks = this.stream.getVideoTracks();
    if (videoTracks.length === 0) {
      return Promise.reject('No video tracks in user media');
    }
    // We got a video feed!
    // Let's try to adapt it to our needs a little bit more
    const videoTrack = videoTracks[0];
    const state = this.props.state;
    const constraints = {
      width: state.getWidth(),
      height: state.getHeight(),
      aspectRatio: state.getWidth() / state.getHeight(),
      facingMode: 'user'
    };
    // According to MDN, this shouldn't ever reject.
    // TODO maybe add an assertion for that
    return videoTrack.applyConstraints(constraints)
      .then(() => Promise.resolve(videoTrack), (err) => Promise.reject(err));
  }
}

export default class WebcamEffect extends Effect {
  static registerAsync(instance, props) {
    return new WebcamEffectImpl(instance, props).start();
  }

  static getTranslationId() {
    return 'webcam';
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new WebcamConfigUI();
    }

    return this._configUI;
  }

  static getDefaultConfig() {
    return {
      maxRetries: 3,
      retryTimeout: 1000,
      imageScaling: 'crop-to-viewport',
      imageCropping: {x: 'crop-both', y: 'crop-both'}
    };
  }

  static getRandomConfig() {
    return WebcamEffect.getDefaultConfig();
  }

  static supportsRepetition() {
    return false;
  }
}
