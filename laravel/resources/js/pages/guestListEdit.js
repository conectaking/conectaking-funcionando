/**
 * Lista de convidados — Vite entry.
 * formPageEdit + integração; guestListEdit.js só em modo manage / sem itemId.
 */
import '@legacy/dashboard.css';

import '@legacy/formPageEdit.js';
import '@legacy/guestListEditKingFormsIntegration.js';

const urlParams = new URLSearchParams(window.location.search);
const itemId = urlParams.get('itemId') || urlParams.get('id');
const mode = urlParams.get('mode');

if (!itemId || mode === 'manage') {
    import('@legacy/guestListEdit.js');
}
