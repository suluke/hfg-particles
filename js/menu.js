const menu = document.getElementById('menu-container');
const toggle = document.getElementById('toggle-menu-visible');

document.addEventListener('click', (evt) => {
  if (!menu.contains(evt.target)) {
    toggle.checked = false;
  }
});
