export function parseHtml(html) {
  // eslint-disable-next-line no-param-reassign
  html = html.trim();
  /* code adapted from jQuery */
  const wrapper = (depth, open, close) => ({ depth, open, close });
  const wrapMap = {
    option: wrapper(1, "<select multiple='multiple'>", '</select>'),
    legend: wrapper(1, '<fieldset>', '</fieldset>'),
    area:   wrapper(1, '<map>', '</map>'),
    param:  wrapper(1, '<object>', '</object>'),
    thead:  wrapper(1, '<table>', '</table>'),
    tr:     wrapper(2, '<table><tbody>', '</tbody></table>'),
    col:    wrapper(2, '<table><tbody></tbody><colgroup>', '</colgroup></table>'),
    td:     wrapper(3, '<table><tbody><tr>', '</tr></tbody></table>'),

    // IE6-8 can't serialize link, script, style, or any html5 (NoScope) tags,
    // unless wrapped in a div with non-breaking characters in front of it.
    _default: wrapper(1, '<div>', '</div>')
  };
  wrapMap.optgroup = wrapMap.option;
  wrapMap.tbody = wrapMap.thead;
  wrapMap.tfoot = wrapMap.thead;
  wrapMap.colgroup = wrapMap.thead;
  wrapMap.caption = wrapMap.thead;
  wrapMap.th = wrapMap.td;
  let element = document.createElement('div');
  const match = /<\s*(\w+).*?>/g.exec(html);
  if (match != null) {
    const tag = match[1];
    const wrap = wrapMap[tag] || wrapMap._default;
    // eslint-disable-next-line no-param-reassign
    html = `${wrap.open}${html}${wrap.close}`;
    element.innerHTML = html;
    // Descend through wrappers to the right content
    const depth = wrap.depth + 1;
    for (let d = 0; d < depth; d++) {
      if (element.firstChild !== element.lastChild) {
        throw new Error(
          'util.parseHtml requires one single top level element.' +
          'NOTE: This error might also occur if your tag structure ' +
          'is nested illegaly.'
        );
      }
      element = element.lastChild;
    }
  } else {
    // if only text is passed
    element.innerHTML = html;
    element = element.lastChild;
  }

  return element;
}

export function clearChildNodes(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

export function imageScalingMarkup(classPrefix) {
  return `
    <fieldset>
      <legend>Image scaling</legend>
      <label>
        Image scaling:
        <select class="${classPrefix}-scaling-select">
          <option value="crop-to-viewport" title="Image might be cropped to fit the viewport" selected>crop to fit viewport</option>
          <option value="fit-image" title="Black borders might be visible">fit image</option>
          <option value="fit-width" title="Black borders might be visible at the top and bottom">fit width</option>
          <option value="fit-height" title="Black borders might be visible at the left or right edges">fit height</option>
          <option value="scale-to-viewport" title="The image's aspect ratio might be skewed">scale to fit viewport</option>
        </select>
      </label><br/>
      <label>
        Horizontal image cropping:
        <select class="${classPrefix}-crop-x-select">
          <option value="crop-both" title="Drop exceeding pixels on either side" selected>both sides</option>
          <option value="crop-left" title="Drop exceeding pixels on the leftern side">leftern side</option>
          <option value="crop-right" title="Drop exceeding pixels on the rightern side">rightern side</option>
        </select>
      </label><br/>
      <label>
        Vertical image cropping:
        <select class="${classPrefix}-crop-y-select">
          <option value="crop-both" title="Drop exceeding pixels on either edge" selected>both edges</option>
          <option value="crop-top" title="Drop exceeding pixels at the top">top edge</option>
          <option value="crop-bottom" title="Drop exceeding pixels at the bottom">bottom edge</option>
        </select>
      </label>
    </fieldset>
  `
}
