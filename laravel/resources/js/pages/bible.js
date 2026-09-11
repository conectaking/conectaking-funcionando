/** /bible → painel /bibliaking (evita loop) */
import '@css/pages/bible-inline.css';

(function () {
  var search = window.location.search || '';
  try {
    if (search.indexOf('itemId=') === -1 && search.indexOf('id=') === -1) {
      var sid = sessionStorage.getItem('bible_panel_item_id') || sessionStorage.getItem('bible_item_id');
      if (sid) search = (search ? search + '&' : '?') + 'itemId=' + encodeURIComponent(sid);
    }
  } catch (e) {}
  window.location.replace('/bibliaking' + search);
})();
