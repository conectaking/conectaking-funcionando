(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('itemId') || urlParams.get('id');
  const mode = urlParams.get('mode');
  if (itemId && mode !== 'manage') {
    // Modo edição: formPageEdit / guestListEditKingFormsIntegration cuidam do UI.
  }
})();
