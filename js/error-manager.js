export class NonFatalError extends Error {
  constructor(msg, data) {
    super();
    this.msg = msg;
    this.data = data;
  }
}

export default class ErrorManager {
  constructor(onload) {
    try {
      window.onerror = (event, script, line, col, err) => {
        this.handleError(event, script, line, col, err);
      };
      onload();
    } catch (err) {
      this.handleError(err.message, 'main.bundle', -1, -1, err);
    }
  }
  handleError(msg, script, line, col, err) {
    console.log(err);
  }
};

export function reportError(error) {
  // assert that this doesn't get lost inside some promise
  window.setTimeout(function() { throw error; }, 0);
}