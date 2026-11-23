/* Shows one frame of a design preview: a.html#setup shows only the frame with id "setup". No hash shows them all. */
(function () {
  function show() {
    var f = location.hash.slice(1);
    document.querySelectorAll('.sv-frame').forEach(function (el) { el.hidden = !!f && el.id !== f; });
  }
  addEventListener('hashchange', show); show();
})();
