export function parseHtml(html) {
  // eslint-disable-next-line no-param-reassign
  html = html.trim();
  /* code taken from jQuery */
  const wrapMap = {
    option: [1, "<select multiple='multiple'>", '</select>'],
    legend: [1, '<fieldset>', '</fieldset>'],
    area:   [1, '<map>', '</map>'],
    param:  [1, '<object>', '</object>'],
    thead:  [1, '<table>', '</table>'],
    tr:     [2, '<table><tbody>', '</tbody></table>'],
    col:    [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>'],
    td:     [3, '<table><tbody><tr>', '</tr></tbody></table>'],

    // IE6-8 can't serialize link, script, style, or any html5 (NoScope) tags,
    // unless wrapped in a div with non-breaking characters in front of it.
    _default: [1, '<div>', '</div>']
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
    const map = wrapMap[tag] || wrapMap._default;
    // eslint-disable-next-line no-param-reassign
    html = `${map[1]}${html}${map[2]}`;
    element.innerHTML = html;
    // Descend through wrappers to the right content
    const depth = map[0] + 1;
    for (let d = 0; d < depth; d++) {
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
