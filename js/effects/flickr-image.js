import Effect, { ConfigUI, fract } from './effect';
import { parseHtml } from '../ui/util';
import Flickr, { ApiKey } from '../polyfills/flickr';

const EffectName = 'Flickr Image';
const Attribution = 'This product uses the Flickr API but is not endorsed or certified by Flickr.';

class FlickrImageConfigUI extends ConfigUI {
  constructor() {
    super();
    const searchInputClass = 'effect-flickr-img-search-term';
    this.element = parseHtml(`
      <fieldset>
        <legend>${EffectName}</legend>
        <label>
          Search term:
          <input type="text" class="${searchInputClass}"/>
        </label>
      </fieldset>
    `);
    const ui = this.element;
    this.searchTermInput = this.element.querySelector(`.${searchInputClass}`);
    this.searchTermInput.addEventListener('change', () => {
      this.notifyChange();
    });
  }

  getElement() {
    return this.element;
  }

  getConfig() {
    const config = {};

    config.searchTerm = this.searchTermInput.value;

    return config;
  }

  applyConfig(config) {
    this.searchTermInput.value = config.searchTerm;
  }
}

const flickr = new Flickr({ api_key: ApiKey });

export default class FlickrImageEffect extends Effect {
  static registerAsync(instance, props, uniforms, vertexShader) {
    const prefetchCount = 5;

    // The logic for getting a continuous stream of images from flickr
    let page = 1;
    let loadsInProgress = 0;
    const initialQueryTime = Math.floor(Date.now() / 1000);
    const runFlickrQuery = (processResponse) => {
      // Two different flickr apis, depending on search string content
      let query = null;
      if (instance.config.searchTerm === '') {
        query = flickr
        .photos
        .getRecent({
          per_page: prefetchCount,
          page,
          max_upload_date: initialQueryTime
        }).then(processResponse);
      } else {
        query = flickr
        .photos
        .search({
          text: instance.config.searchTerm,
          per_page: prefetchCount,
          page,
          max_upload_date: initialQueryTime
        }).then(processResponse);
      }
      loadsInProgress += prefetchCount;
      page = page + 1;
      return query;
    };

    // This method is called the first time we have a list of potential images
    const onInitialFlickrResponse = (photos) => new Promise((finishRegister, rej) => {
      const loadedImgs = [];
      const particleDataQueue = [];
      const loadQueue = [];

      const processPhoto = (photo) => flickr.photos.getSizes({
        photo_id: photo.id
      }).then((sizes) => new Promise((res, rej) => {
        const original = sizes.sizes.size.find((size) => {
          return size.width >= props.config.xParticlesCount;
        }) || sizes.sizes.size[sizes.sizes.size.length - 1];
        const url = original.source;
        const loader = document.createElement('img');
        loader.crossOrigin = 'Anonymous';
        loader.src = url;
        loader.onload = () => {
          loadedImgs.push(loader);
          loadsInProgress = loadsInProgress - 1;
          res();
        };
      }));
      
      // kick off loading process for each image
      for (let i = 0; i < photos.photos.photo.length; i++) {
        loadQueue.push(processPhoto(photos.photos.photo[i]));
      }
      // As soon as we have a fully-loaded image, use it!
      Promise.race(loadQueue).then(() => {
        let alive = true;
        let prevWasChange = false;
        let displayed = -1;
        // Run this in a loop to check if we need to update the image
        const checkTime = () => {
          if (!alive) {
            return;
          }
          // synchronize the contents of loadedImgs with particleDataQueue
          while(particleDataQueue.length < loadedImgs.length) {
            particleDataQueue.push(
              props.state.createParticleDataFromDomImg(
                loadedImgs[particleDataQueue.length],
                props.config.xParticlesCount, props.config.yParticlesCount
              )
            );
            // intentional break. Avoid too much work per RAF iteration
            break;
          }
          const tDist = instance.timeBegin - props.clock.getTime();
          if (tDist >= 0 && tDist <= props.clock.getDelta()) {
            // free unneeded resources when we proceed to the next image
            let freed = -1;
            if (displayed !== -1 && particleDataQueue.length > 1) {
              loadedImgs.shift();
              freed = particleDataQueue.shift();
            }
            displayed = particleDataQueue[0];
            props.state.setParticleData(displayed);
            // do the free AFTER we setParticleData to a new one
            if (freed !== -1) {
              props.state.destroyParticleData(freed);
              if (loadsInProgress < prefetchCount && loadedImgs.length < prefetchCount) {
                runFlickrQuery((photos) => {
                  for (let i = 0; i < photos.photos.photo.length; i++) {
                    processPhoto(photos.photos.photo[i]);
                  }
                });
              }
            }
          }
          window.requestAnimationFrame(checkTime);
        };
        checkTime();
        props.state.addHook(() => {
          alive = false;
        });
        
        finishRegister();
      });
    });

    return runFlickrQuery(onInitialFlickrResponse);
  }

  static getDisplayName() {
    return EffectName;
  }

  static getConfigUI() {
    if (!this._configUI) {
      this._configUI = new FlickrImageConfigUI();
    }

    return this._configUI;
  }

  static getDefaultConfig() {
    return {
      searchTerm: ''
    };
  }

  static getRandomConfig() {
    return this.getDefaultConfig();
  }
}
