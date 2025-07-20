export class NonFatalError extends Error {
  public msg: string;
  public data: any;

  constructor(msg: string, data?: any) {
    super(msg);
    this.msg = msg;
    this.data = data;
  }
}

export default class ErrorManager {
  constructor(onload: () => void) {
    try {
      window.onerror = (event: string | Event, script?: string, line?: number, col?: number, err?: Error) => {
        this.handleError(event, script, line, col, err);
      };
      onload();
    } catch (err: any) {
      this.handleError(err.message, 'main.bundle', -1, -1, err);
    }
  }

  private handleError(msg: string | Event, script?: string, line?: number, col?: number, err?: Error): void {
    console.log(err);
  }
}

export function reportError(error: Error): void {
  // assert that this doesn't get lost inside some promise
  window.setTimeout(function() { throw error; }, 0);
}