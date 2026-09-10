(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('itemId') || urlParams.get('id');
  const mode = urlParams.get('mode');

  function applyGuestListMode() {
    if (itemId && mode !== 'manage') {
      const managementContainer = document.getElementById('guest-list-management-container');
      if (managementContainer) managementContainer.style.display = 'none';

      const editorContainer = document.getElementById('kingforms-editor-container');
      if (editorContainer) editorContainer.style.display = 'block';

      const editorBackBtn = document.getElementById('editor-back-btn');
      if (editorBackBtn) {
        editorBackBtn.addEventListener('click', function (e) {
          e.preventDefault();
          const formItemId = urlParams.get('formItemId');
          if (formItemId) {
            window.location.href = `/formPageEdit?itemId=${formItemId}`;
          } else {
            window.location.href = `/guestListEdit?itemId=${itemId}&mode=manage`;
          }
        });
      }
    } else {
      const managementContainer = document.getElementById('guest-list-management-container');
      if (managementContainer) managementContainer.style.display = 'block';

      const editorContainer = document.getElementById('kingforms-editor-container');
      if (editorContainer) editorContainer.style.display = 'none';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyGuestListMode);
  } else {
    applyGuestListMode();
  }
})();
