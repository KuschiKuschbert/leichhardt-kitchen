/* Screen-size selector for the design review. Images are local synthetic captures. */
(function () {
  'use strict';
  document.querySelectorAll('button[data-width]').forEach(function (button) {
    button.addEventListener('click', function () {
      var width = button.dataset.width;
      document.body.dataset.width = width;
      document.querySelectorAll('button[data-width]').forEach(function (item) { item.setAttribute('aria-pressed', String(item === button)); });
      document.querySelectorAll('[data-concept]').forEach(function (link) {
        var image = link.querySelector('img'), file = 'previews/' + link.dataset.concept + '-' + width + '.png';
        link.href = file; image.src = file; image.width = Number(width); image.height = width === '390' ? 844 : 1000;
      });
    });
  });
})();
