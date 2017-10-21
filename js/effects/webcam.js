import Effect, { ConfigUI, fract } from './effect';
import { parseHtml, imageScalingMarkup } from '../ui/util';
import { ImageCapture } from 'image-capture/lib/imagecapture';

const EffectName = 'Webcam';
const EffectDescription = 'Make use of the user\'s webcam as the particles\' color values';

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

export default class WebcamEffect extends Effect {
  static registerAsync(instance, props) {
    // State variables
    const canvas = document.createElement('canvas');
    let stream = null;
    let stopped = false;
    const stop = () => { stopped = true; };
    const isActive = () => {
      const clock = props.clock;
      const time = clock.getTime();
      return !clock.isPaused() && instance.timeBegin <= time && time <= instance.timeEnd;
    };

    // Shutdown hook
    props.state.addHook(() => {
      stop();
      // FIXME understand and document when this can happen.
      // E.g. when the getUserMedia() request is ignored in icognito
      // mode
      if (stream !== null) {
        const allTracks = stream.getTracks();
        for (let i = 0; i < allTracks.length; i++) {
          allTracks[i].stop();
        }
      }
    });

    const mediaConstraints = {
      audio: false,
      video: true // we want video
    };
    // Let's ask the browser if we can haz video
    return navigator.mediaDevices.getUserMedia(mediaConstraints)
    .then((theStream) => {
      stream = theStream;
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        return Promise.reject('No video tracks in user media');
      }
      // We got a video feed!
      // Let's try to adapt it to our needs a little bit more
      const videoTrack = videoTracks[0];
      const constraints = {
        width: props.state.getWidth(),
        height: props.state.getHeight(),
        aspectRatio: props.state.getWidth() / props.state.getHeight(),
        facingMode: 'user'
      };
      // According to MDN, this shouldn't ever reject.
      // TODO maybe add an assertion for that
      return videoTrack.applyConstraints(constraints)
        .then(() => Promise.resolve(videoTrack), (err) => Promise.reject(err));
    }, (err) => Promise.reject(err))
    .then((videoTrack) => {
      const capture = new ImageCapture(videoTrack);
      let prevPd = -1;
      // This is where the magic happens
      const processFrame = (image) => {
        if (isActive()) {
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
          const pd = props.state.createParticleData(canvas, instance.config.imageScaling, instance.config.imageCropping);
          props.state.setParticleData(pd);
          if (prevPd !== -1) {
            props.state.destroyParticleData(prevPd);
          }
          prevPd = pd;
        }
      };
      // When we are sure grabbing images works (which happens further
      // below) we call this function to grab frames repeatedly in a loop
      const grabLoop = () => {
        if (!stopped) {
          // FIXME if we don't grab frames, Chrome will soon make the
          // track invalid, causing the next grabFrame to throw an error
          // Otherwise, we could test here if we are active and do a
          // no-op instead of grabFrame
          capture.grabFrame()
          .then((frame) => {
            processFrame(frame);
            // Queue this into the next animation frame so we don't
            // explode the call stack with recursive calls
            window.requestAnimationFrame(grabLoop);
          }, (err) => {
            // Throw this error into the global scope
            window.setTimeout(() => { throw new Error('Cannot grab images from the camera'); }, 0);
          });
        }
      };

      // As it turns out, having the video alone is not a guarantee that
      // we can actually grab images (at least on FF). So let's make sure
      // it works at least one time
      return new Promise((res, rej) => {
        let retries = 0;
        const testGrab = (err) => {
          capture.grabFrame()
          .then((frame) => {
            // Success, resolve and start grabbing!
            processFrame(frame);
            grabLoop();
            res();
          }, (err) => {
            // Aw, no image :( Maybe try again?
            if (retries < instance.config.maxRetries) {
              retries = retries + 1;
              window.setTimeout(testGrab, instance.config.retryTimeout);
            } else {
              // We finally have to give up :/
              rej(new Error('Cannot grab images from camera'));
            }
          });
        };
        testGrab();
      });
    }, (err) => Promise.reject(err));
  }

  static getDisplayName() {
    return EffectName;
  }

  static getDescription() {
    return EffectDescription;
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
