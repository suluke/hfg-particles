import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';

const EffectName = 'Webcam';
const EffectDescription = 'Make use of the user\'s webcam as the particles\' color values';

class WebcamConfigUI extends ConfigUI {
  constructor() {
    super();
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
        Nothing to be configured :)
      </fieldset>
    `);
    const ui = this.element;
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    return {};
  }

  applyConfig(config) {
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
      const allTracks = stream.getTracks();
      for (let i = 0; i < allTracks.length; i++) {
        allTracks[i].stop();
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
        .then(() => Promise.resolve(videoTrack), Promise.reject);
    }, Promise.reject)
    .then((videoTrack) => {
      // Now this is where the magic happens
      const capture = new ImageCapture(videoTrack);
      const grabLoop = (imageOrTimestamp) => {
        if (isActive() && (typeof imageOrTimestamp) !== 'number') {
          const image = imageOrTimestamp;
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
          const pd = props.state.createParticleData(canvas, 'fit-image', {x: 'crop-both', y: 'crop-both'});
          props.state.setParticleData(pd);
        }
        if (!stopped) {
          // FIXME if we don't grab frames, Chrome will soon make the
          // track invalid, causing the next grabFrame to throw an error
          if (true || isActive()) {
            capture.grabFrame().then(grabLoop, (err) => { stop() });
          } else {
            window.requestAnimationFrame(grabLoop);
          }
        }
      };
      // start grabbing images!
      window.requestAnimationFrame(grabLoop);
    }, Promise.reject);
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
    return {};
  }

  static getRandomConfig() {
    return {};
  }
}
