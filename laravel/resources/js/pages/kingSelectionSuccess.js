/** kingSelectionSuccess — Vite entry (extracted inline) */
const qs = new URLSearchParams(location.search||'');
    const slug = qs.get('slug') || '';
    document.getElementById('ks-home').href = `kingSelection/${encodeURIComponent(slug)}`;
