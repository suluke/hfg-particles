export default class InactivityMonitor {
  constructor() {
    this.timeout = undefined;

    const inactivityTimeout = 3000;
    const inactivityClass = 'user-inactive';

    const onInactivity = () => {
      document.documentElement.classList.add(inactivityClass);
    };
    const onActivity = () => {
      if (this.timeout !== undefined)
        clearTimeout(this.timeout);
      this.timeout = window.setTimeout(onInactivity, inactivityTimeout);
      document.documentElement.classList.remove(inactivityClass);
    };
    window.onload = onActivity;
    // DOM Events
    document.addEventListener('mousemove', onActivity);
    document.addEventListener('keypress', onActivity);
  }
}
