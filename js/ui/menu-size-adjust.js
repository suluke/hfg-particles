export default class MenuResizer {
  constructor(menu) {
    const menuHandleClass = 'menu-size-adjust-handle';
    const menuElm = menu.getRootPane();
    const menuHandle = document.createElement('div');
    menuHandle.classList.add(menuHandleClass);
    menuElm.appendChild(menuHandle);

    const timelineHandleClass = 'timeline-size-adjust-handle';
    const timelineElm = menu.getTimeline().getRootPane();
    const timelineHandle = document.createElement('div');
    timelineHandle.classList.add(timelineHandleClass);
    timelineElm.appendChild(timelineHandle);

    const styleElm = document.createElement('style');
    document.body.appendChild(styleElm);
    const stylesheet = styleElm.sheet;
    // don't enable this feature on mobile
    if (menu.isCoverFullWidth()) {
      this.stylesheet.disabled = true;
    }
    stylesheet.insertRule(`
      .${menuHandleClass} {
        display: block;
      }
    `);
    stylesheet.insertRule(`
      .${timelineHandleClass} {
        display: block;
      }
    `);
    window.addEventListener('resize', () => this.onresize());

    this.menu = menu;
    this.stylesheet = stylesheet;
    this.menuElm = menuElm;
    this.menuHandle = menuHandle;
    this.timelineElm = timelineElm;
    this.timelineHandle = timelineHandle;

    this.setupMenuResizing();
    this.setupTimelineResizing();
  }

  onresize() {
    // TODO update dimensions to match new window size
  }

  setupMenuResizing() {
    const cssRules = this.stylesheet.cssRules;
    // FIXME this whole approach of continuously adding and removing
    // rules is prone to index-invalidation issues.
    // However, since the toggle button has two identities:
    // 1. open menu  *outside* menu itself
    // 2. close menu being (seemingly) part of it
    // setting the style directly is impossible since we need the
    // :checked selector
    let toggleBtnLeft = 0;
    const toggleBtnSelector = '.menu-container > input:checked + label[title="Toggle menu"]';
    let toggleBtnRule = this.stylesheet.insertRule(`
      ${toggleBtnSelector} {
        /* No rule needed yet */
      }
    `, cssRules.length);

    this.menuHandle.addEventListener('mousedown', (evt) => {
      let prevX = evt.clientX;
      let menuWidth = this.menuElm.offsetWidth;
      let timelineWidth = this.timelineElm.offsetWidth;
      const onDrag = (evt) => {
        const delta = evt.clientX - prevX;
        prevX = evt.clientX;

        menuWidth += delta;
        this.menuElm.setAttribute('style', `width: ${menuWidth}px`);

        timelineWidth -= delta;
        this.timelineElm.style.width = `${timelineWidth}px`;
        this.timelineElm.style.right = '0';
        this.timelineElm.style.left = 'unset';

        toggleBtnLeft += delta;
        this.stylesheet.removeRule(toggleBtnRule);
        toggleBtnRule = this.stylesheet.insertRule(`
          ${toggleBtnSelector} {
            transform: translateX(-100%) translateX(${toggleBtnLeft}px) !important;
          }
        `, cssRules.length);
      };
      const onDragEnd = (evt) => {
        document.documentElement.removeEventListener('mousemove', onDrag);
        document.documentElement.removeEventListener('mouseup', onDragEnd);
      };
      document.documentElement.addEventListener('mousemove', onDrag);
      document.documentElement.addEventListener('mouseup', onDragEnd);
    });
  }

  setupTimelineResizing() {
    this.timelineHandle.addEventListener('mousedown', (evt) => {
      let prevY = evt.clientY;
      let timelineHeight = this.timelineElm.offsetHeight;
      const onDrag = (evt) => {
        const delta = evt.clientY - prevY;
        prevY = evt.clientY;

        timelineHeight -= delta;
        this.timelineElm.style.height = `${timelineHeight}px`;
      };
      const onDragEnd = (evt) => {
        document.documentElement.removeEventListener('mousemove', onDrag);
        document.documentElement.removeEventListener('mouseup', onDragEnd);
      };
      document.documentElement.addEventListener('mousemove', onDrag);
      document.documentElement.addEventListener('mouseup', onDragEnd);
    });
  }
}
