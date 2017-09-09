import Effect, { ConfigUI, fract } from './effect';
import { parseHtml, imageScalingMarkup } from '../ui/util';
import Flickr, { ApiKey } from '../polyfills/flickr';

const EffectName = 'Flickr Image';
const EffectDescription = 'Changes the underlying image to one loaded from Flickr\'s recent images feed';
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

const prefetchCount = 5;
class FlickrCacheEntry {
  constructor() {
    this.page = 1;
    this.initialQueryTime = Math.floor(Date.now() / 1000);
    this.loadsInProgress = 0;
    this.loadedImgs = [];
    this.requests = [];
  }
}

class FlickrImageCache {
  constructor() {
    this.flickr = new Flickr({ api_key: ApiKey });
    this.byQuery = {};
  }

  setProps(props) {
    this.props = props;
  }

  runFlickrQuery(searchTerm) {
    const entry = this.getEntryForSearchTerm(searchTerm);

    const onResponse = (response) => {
      // since page is 1-indexed, a real greater is necessary
      if (entry.page > response.photos.pages) {
        entry.page = 1;
      }
      return response;
    };
    // Two different flickr apis, depending on search string content
    let query = null;
    if (searchTerm === '') {
      query = this.flickr
      .photos
      .getRecent({
        per_page: prefetchCount,
        page: entry.page,
        max_upload_date: entry.initialQueryTime
      }).then(onResponse);
    } else {
      query = this.flickr
      .photos
      .search({
        text: searchTerm,
        per_page: prefetchCount,
        page: entry.page,
        max_upload_date: entry.initialQueryTime
      }).then(onResponse);
    }
    entry.loadsInProgress += prefetchCount;
    entry.page = entry.page + 1;
    return query;
  }

  processSearchQueryResponse(response, entry) {
    const loadQueue = [];
    for (let i = 0; i < response.photos.photo.length; i++) {
      loadQueue.push(this.processPhoto(response.photos.photo[i], entry));
    }
    return loadQueue;
  }

  processPhoto(photo, entry) {
    const props = this.props;
    return this.flickr.photos.getSizes({
      photo_id: photo.id
    }).then((sizes) => {
      const original = sizes.sizes.size.find((size) => {
        return size.width >= props.config.xParticlesCount;
      }) || sizes.sizes.size[sizes.sizes.size.length - 1];
      const url = original.source;
      const loader = document.createElement('img');
      loader.crossOrigin = 'Anonymous';
      loader.src = url;
      loader.onload = () => {
        entry.loadsInProgress = entry.loadsInProgress - 1;
        if (entry.requests.length > 0) {
          // resolve pending request directly
          const request = entry.requests.shift();
          request(props.state.createParticleDataFromDomImg(loader));
        } else {
          entry.loadedImgs.push(loader);
        }
      };
    });
  }

  getEntryForSearchTerm(searchTerm) {
    if (!this.byQuery[searchTerm]) {
      this.byQuery[searchTerm] = new FlickrCacheEntry();
    }
    return this.byQuery[searchTerm];
  }

  shouldFireNewQuery(entry) {
    if (entry.loadsInProgress + entry.loadedImgs.length -
        entry.requests.length < prefetchCount
    ) {
      return true;
    }
    return false;
  }

  getParticleDataForSearchTerm(searchTerm) {
    const entry = this.getEntryForSearchTerm(searchTerm);
    const props = this.props;
    if (entry.loadedImgs.length === 0) {
      return new Promise((res, rej) => {
        entry.requests.push(res);
        if (this.shouldFireNewQuery(entry)) {
          this.runFlickrQuery(searchTerm, entry)
          .then(response => this.processSearchQueryResponse(response, entry));
        }
      });
    } else {
      return Promise.resolve(props.state.createParticleDataFromDomImg(
        entry.loadedImgs.shift()
      ));
    }
  }
}

export default class FlickrImageEffect extends Effect {
  static registerAsync(instance, props) {
    const cache = FlickrImageEffect.getCache(props);
    return cache.getParticleDataForSearchTerm(instance.config.searchTerm)
    .then((particleData) => {
      const particleDataQueue = [particleData];
      // We want to have some images pre-allocated to this effect
      for (let i = 1; i < prefetchCount; i++) {
        cache.getParticleDataForSearchTerm(instance.config.searchTerm)
        .then((particleData) => {
          particleDataQueue.push(particleData);
        });
      }

      let alive = true;
      let displayed = -1;
      // Run this in a loop to check if we need to update the image
      const checkTime = () => {
        if (!alive) {
          return;
        }
        const tDist = props.clock.getTime() - instance.timeBegin;
        if (tDist >= 0 && tDist <= props.clock.getDelta()) {
          // free unneeded resources when we proceed to the next image
          let freed = -1;
          if (displayed !== -1 && particleDataQueue.length > 1) {
            freed = particleDataQueue.shift();
          }
          displayed = particleDataQueue[0];
          props.state.setParticleData(displayed);
          // do the free AFTER we setParticleData to a new one
          if (freed !== -1) {
            props.state.destroyParticleData(freed);
            // also look for a replacement
            cache.getParticleDataForSearchTerm(instance.config.searchTerm)
            .then((particleData) => {
              particleDataQueue.push(particleData);
            });
          }
        }
        window.requestAnimationFrame(checkTime);
      };
      checkTime();
      props.state.addHook(() => {
        alive = false;
      });
    });
  }

  static getDisplayName() {
    return EffectName;
  }

  static getDescription() {
    return EffectDescription;
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

  static getCache(props) {
    if (!this._cache) {
      this._cache = new FlickrImageCache();
    }
    this._cache.setProps(props);

    return this._cache;
  }

  static isEventOnly() {
    return true;
  }
}
