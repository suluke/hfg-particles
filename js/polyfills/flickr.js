/**
 * Since the flickrapi package is neither a module (it sets a global)
 * nor does it export promisified functions, we have our own little
 * wrapper here
 */
import 'flickrapi/browser/flickrapi';

const Flickr = window.Flickr;
delete window.Flickr;

export const ApiKey = 'bbd60ce148c0a1dedcaaffd228a03264';

export default class FlickrP extends Flickr {
  constructor(...args) {
    super(...args);
  }
}
function recursivePromisify(obj) {
  const res = {};
  for (let prop in obj) {
    if (!obj.hasOwnProperty(prop)) {
      continue;
    }
    if (typeof obj[prop] === 'function') {
      res[prop] = function(...args) {
        return new Promise((res, rej) => {
          obj[prop].call(this, ...args,(error, response) => {
            if (error) {
              rej(error);
            } else {
              res(response);
            }
          })
        });
      }
    } else if (typeof obj[prop] === 'object') {
      res[prop] = recursivePromisify(obj[prop]);
    } else {
      res[prop] = obj[prop];
    }
  }
  return res;
}
FlickrP.prototype = recursivePromisify(Flickr.prototype);
