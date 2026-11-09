/* Isolated screenshot navigator. No app data, embeds or operational actions. */
(function () {
  'use strict';
  var width = 390;
  function paintCapture(link) {
    var path = 'evidence/' + link.dataset.capture + '-' + width + '.png';
    link.href = path;
    var img = link.querySelector('img');
    img.src = path;
    var descriptions = { 'a-home': 'Home welcome', 'b-smash-open': 'burger illustration, opened at the recipe end', 'b-brisket-open': 'smoker illustration, opened at the recipe end', 'b-smash-closed': 'burger illustration, closed', 'c-home-open': 'Home collection, open below the work', 'c-home-closed': 'Home collection, closed below the work' };
    img.alt = descriptions[link.dataset.capture] + ', captured at ' + width + ' pixels';
    img.width = width;
    img.height = width === 390 ? 844 : width === 768 ? 1024 : 900;
  }
  document.querySelectorAll('[data-width]').forEach(function (button) {
    button.addEventListener('click', function () {
      width = Number(button.dataset.width);
      document.querySelectorAll('[data-width]').forEach(function (item) { item.setAttribute('aria-pressed', String(item === button)); });
      document.querySelectorAll('[data-capture]').forEach(paintCapture);
    });
  });
  document.querySelectorAll('[data-scene]').forEach(function (button) {
    button.addEventListener('click', function () {
      var article = button.closest('article');
      article.querySelectorAll('[data-scene]').forEach(function (item) { item.setAttribute('aria-pressed', String(item === button)); });
      var link = article.querySelector('[data-capture]');
      link.dataset.capture = button.dataset.scene;
      link.querySelector('img').alt = 'Option ' + button.dataset.scene[0].toUpperCase() + ', ' + button.textContent + ', captured at ' + width + ' pixels';
      paintCapture(link);
    });
  });
}());
