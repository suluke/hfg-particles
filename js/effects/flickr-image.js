import Effect, { ConfigUI, fract } from './effect';
import { parseHtml, imageScalingMarkup } from '../ui/util';
import Flickr, { ApiKey } from '../polyfills/flickr';

const EffectName = 'Flickr Image';
const EffectDescription = 'Changes the underlying image to one loaded from Flickr\'s recent images feed';
const Attribution = 'This product uses the Flickr API but is not endorsed or certified by Flickr.';

class FlickrImageConfigUI extends ConfigUI {
  constructor() {
    super();
    const classPrefix = 'effect-flickr-img';
    const searchInputClass = `${classPrefix}-search-term`;
    this.element = parseHtml(`
      <div>
        ${Attribution}
        <fieldset>
          <legend>${EffectName}</legend>
          <label>
            Search term:
            <input type="text" class="${searchInputClass}"/>
          </label>
          ${imageScalingMarkup(classPrefix)}
        </fieldset>
      </div>
    `);
    const ui = this.element;
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
    config.imageScaling = this.scalingSelect.value;
    config.imageCropping = {
      x: this.cropXSelect.value,
      y: this.cropYSelect.value
    };

    return config;
  }

  applyConfig(config) {
    this.searchTermInput.value = config.searchTerm;
    this.scalingSelect.value = config.imageScaling || 'crop-to-viewport';
    const imageCropping = config.imageCropping || { x: 'crop-both', y: 'crop-both' };
    this.cropXSelect.value = imageCropping.x;
    this.cropYSelect.value = imageCropping.y;
  }
}

/// This constant is used both for defining how many images the
/// FlickrImageCache will pre-load for a given search term as well as
/// how many images a FlickrImageEffect will reserve for future use
const prefetchCount = 5;

class FlickrCacheEntry {
  constructor() {
    /// The current position in the stream of photos that this entry
    /// loads images for
    this.page = 1;
    /// Needed to keep track of where the ever growing stream of images
    /// started for us. We can't just assume that "page #1" will always
    /// stay the same, or we risk loading the same image multiple times.
    this.initialQueryTime = Math.floor(Date.now() / 1000);
    /// Pending queries need to be taken into account when deciding whether
    /// or not new flickr api calls should be made
    this.loadsInProgress = 0;
    /// This is the acutal image cache
    this.loadedImgs = [];
    /// If a query cannot be answered right away by this cache entry, we
    /// queue it in this array. So when a new image finishes loading, we
    /// resolve the request at the front of this queue with it.
    this.requests = [];
  }
}

/**
 * The FlickrImageCache manages the process of loading images from flickr.
 * Therefore, it has to select "new" images from flickr and then download
 * the best version available. For efficiency, FlickrImageCache also kicks
 * off the loading process for multiple images at once, so that future
 * queries for the same search term may be resolved faster.
 */
class FlickrImageCache {
  constructor() {
    this.flickr = new Flickr({ api_key: ApiKey });
    /// a dictionary mapping search queries to FlickrCachEntries
    this.byQuery = {};
  }

  /// Props will be used to select versions of images which best match
  /// the particle grid dimensions (xParticlesCount/yParticlesCount)
  setProps(props) {
    this.props = props;
  }

  /// @return a promise that resolves to flickr api return values
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

  /// For each photo in a flickr query response, request the image (i.e.
  /// the versions available on flickr), select the best version for the
  /// current rendering configuration and load the image from flickr.
  ///
  /// @return a list of promises each representing a loading process. I.e.
  ///         when one of the promises resolves, either a pending request
  ///         will have been resolved or a new image is pushed into the
  ///         image cache.
  processSearchQueryResponse(response, entry) {
    const loadQueue = [];
    for (let i = 0; i < response.photos.photo.length; i++) {
      loadQueue.push(this.processPhoto(response.photos.photo[i], entry));
    }
    return loadQueue;
  }

  /// We want to exclude all cropped versions (= all versions cropped
  /// to squares) and we don't want to load higher resoultions than
  /// necessary
  selectBestImageVersion(sizes) {
    const best = sizes.sizes.size.find((size) => {
      if (size.label.indexOf('Square') >= 0) {
        return false;
      }
      return size.width >= this.props.config.xParticlesCount;
    }) || sizes.sizes.size[sizes.sizes.size.length - 1];
    return best;
  }

  /// Kicks of the loading process for a given flickr photo. I.e., request
  /// the list of available image versions, select the most appropriate
  /// version and load that. Finally, resolve a pending cache request
  /// with it or push the result into the cache
  ///
  /// @return a promise representing the loading process for @p photo
  processPhoto(photo, entry) {
    return this.flickr.photos.getSizes({
      photo_id: photo.id
    }).then((sizes) => {
      const original = this.selectBestImageVersion(sizes);
      const url = original.source;
      const loader = document.createElement('img');
      loader.crossOrigin = 'Anonymous';
      loader.src = url;
      loader.onload = () => {
        entry.loadsInProgress = entry.loadsInProgress - 1;
        if (entry.requests.length > 0) {
          // resolve pending request directly
          const request = entry.requests.shift();
          request(loader);
        } else {
          entry.loadedImgs.push(loader);
        }
      };
    });
  }

  /// Looks up and returns the FlickrCacheEntry corresponding to the given
  /// @p searchTerm
  getEntryForSearchTerm(searchTerm) {
    if (!this.byQuery[searchTerm]) {
      this.byQuery[searchTerm] = new FlickrCacheEntry();
    }
    return this.byQuery[searchTerm];
  }

  /// Decides whether the loading process of new images for a search term
  /// (represented by the corresponding @p entry) should be kicked off,
  /// depending of how many loaded images are still available and how
  /// many images are still in-flight.
  shouldFireNewQuery(entry) {
    if (entry.loadsInProgress + entry.loadedImgs.length -
        entry.requests.length < prefetchCount
    ) {
      return true;
    }
    return false;
  }

  /// This is FlickrImageCache's main api: Give this method a @p
  /// searchTerm and it returns a promise that will eventually resolve to
  /// a DOM Image matching the @p searchTerm.
  ///
  /// @return a Promise that will resolve to a DOM Image object matching
  ///         the given @p searchTerm
  getImageForSearchTerm(searchTerm) {
    const entry = this.getEntryForSearchTerm(searchTerm);
    if (entry.loadedImgs.length === 0) {
      return new Promise((res, rej) => {
        entry.requests.push(res);
        if (this.shouldFireNewQuery(entry)) {
          this.runFlickrQuery(searchTerm, entry)
          .then(response => this.processSearchQueryResponse(response, entry));
        }
      });
    } else {
      return Promise.resolve(entry.loadedImgs.shift());
    }
  }
}

export default class FlickrImageEffect extends Effect {
  static registerAsync(instance, props) {
    const cache = FlickrImageEffect.getCache(props);
    const img2pd = (image) => {
      return props.state.createParticleDataFromDomImg(
        image, instance.config.imageScaling, instance.config.imageCropping
      );
    };
    return cache.getImageForSearchTerm(instance.config.searchTerm)
    .then((image) => {
      const particleData = img2pd(image);
      const particleDataQueue = [particleData];
      // We want to have some images pre-allocated to this effect
      for (let i = 1; i < prefetchCount; i++) {
        cache.getImageForSearchTerm(instance.config.searchTerm)
        .then((image) => {
          const particleData = img2pd(image);
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
            cache.getImageForSearchTerm(instance.config.searchTerm)
            .then((image) => {
              const particleData = img2pd(image);
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
      searchTerm: '',
      imageScaling: 'crop-to-viewport',
      imageCropping: {
        x: 'crop-both',
        y: 'crop-both'
      }
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
