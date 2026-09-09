<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>King Docs — Conecta King</title>
  
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,600;700&display=swap" rel="stylesheet"/>
  <style>
    :root { --bg:#f7f4ef; --card:#fff; --ink:#1a1714; --muted:#5a5550; --accent:#2d5a3d; --border:#e2ddd7; --bad:#c0392b; --banner-bg:#e8f0ea; --hero-name-bg:#faf9f7; --trust-bg:#faf9f7; --summary-bg:#faf9f7; }
    body.kd-theme-dark {
      --bg:#121814; --card:#1a221c; --ink:#e8ebe9; --muted:#9ca8a2; --accent:#7bc99a; --border:#2f3d35; --bad:#e57373;
      --banner-bg:#1a2e22; --hero-name-bg:#222b26; --trust-bg:#1e2621; --summary-bg:#1e2621;
    }
    body.kd-theme-dark .banner { border-color: var(--accent); }
    body.kd-theme-dark .tab { background: var(--card); }
    body.kd-theme-dark .tab.active { background: #243028; }
    body.kd-theme-dark .btn.secondary { background: #2a332e; color: var(--ink); }
    body.kd-theme-dark .linkbox { background: #222b26; color: var(--ink); }
    body.kd-theme-dark .doc-card { background: #1e2a22; border-color: var(--accent); }
    body.kd-theme-dark .doc-card.selected { background: #243528; }
    body.kd-theme-dark .kd-load-overlay { background: rgba(18,24,20,.88); }
    * { box-sizing: border-box; }
    .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    body { margin:0; font-family:'DM Sans',sans-serif; background:var(--bg); color:var(--ink); padding:1rem 0 3rem; }
    .wrap { width: 100%; max-width: min(100%, 1680px); margin: 0 auto; padding: 0 clamp(0.65rem, 2.5vw, 2rem); box-sizing: border-box; }
    /* Só a barra de atalhos fica fixa ao scroll (banner, ajuda e nome rolam) */
    .kd-sticky-atalhos-bar {
      position: sticky;
      top: 0;
      z-index: 300;
      margin: 0 0 0.85rem;
      padding: .25rem 0 0;
      background: var(--bg);
      border-bottom: 1px solid var(--border);
      box-shadow: 0 6px 20px rgba(0,0,0,.06);
    }
    .kd-sticky-atalhos-inner {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 0 0 14px 14px;
      padding: .55rem .75rem .7rem;
      box-shadow: 0 3px 16px rgba(0,0,0,.04);
    }
    .kd-hero-card--top {
      margin-bottom: 0;
      border-radius: 16px 16px 0 0;
      border-bottom: none;
      padding-bottom: 1.35rem;
      box-shadow: 0 2px 14px rgba(0,0,0,.05);
    }
    .kd-page-body { padding-top: .25rem; }
    .kd-top-bar { display: flex; justify-content: space-between; align-items: flex-start; gap: .75rem; flex-wrap: wrap; margin-bottom: .75rem; }
    .kd-top-bar--minimal { justify-content: space-between; align-items: center; margin-bottom: .5rem; }
    .kd-top-bar-actions { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
    .kd-back-dashboard {
      display: inline-flex; align-items: center; gap: .35rem;
      padding: .45rem .85rem; font-size: .78rem; border-radius: 8px;
      border: 1px solid var(--border); background: var(--card); color: var(--ink);
      text-decoration: none; font-weight: 600; white-space: nowrap;
    }
    .kd-back-dashboard:hover { border-color: var(--accent); color: var(--accent); }
    .banner { background: var(--banner-bg); border: 1px dashed var(--accent); color: var(--accent); padding: .65rem .9rem; border-radius: 8px; font-size: .82rem; margin: 0; flex: 1; min-width: min(100%, 240px); }
    .kd-help { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 0 .85rem; margin-bottom: 1rem; font-size: .82rem; }
    .kd-help summary { cursor: pointer; padding: .65rem 0; font-weight: 600; color: var(--accent); list-style: none; }
    .kd-help summary::-webkit-details-marker { display: none; }
    .kd-help[open] summary { border-bottom: 1px solid var(--border); margin-bottom: .5rem; }
    .kd-help ul { margin: 0 0 .75rem; padding-left: 1.15rem; color: var(--muted); line-height: 1.5; }
    .kd-theme-btn { white-space: nowrap; padding: .45rem .85rem; font-size: .78rem; border-radius: 8px; border: 1px solid var(--border); background: var(--card); color: var(--ink); cursor: pointer; font-family: inherit; font-weight: 600; }
    .kd-theme-btn:hover { border-color: var(--accent); color: var(--accent); }
    h1 { font-size: 1.45rem; margin: 0 0 .35rem; }
    .sub { color: var(--muted); font-size: .85rem; margin-bottom: 1.2rem; }
    .tabs { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .tab { padding: .45rem .9rem; border-radius: 8px; border: 1px solid var(--border); background: var(--card); cursor: pointer; font-size: .82rem; color: var(--ink); }
    .tab.active { border-color: var(--accent); background: var(--banner-bg); color: var(--accent); font-weight: 600; }
    .tab:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .panel { display: none; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1rem; }
    .panel.active { display: block; }
    .group { margin-bottom: 1.2rem; }
    .group h3 { font-size: .72rem; text-transform: uppercase; letter-spacing: .12em; color: var(--muted); margin: 0 0 .6rem; }
    details.kd-collapsible { border: 1px solid var(--border); border-radius: 10px; margin-bottom: .75rem; background: var(--card); }
    details.kd-collapsible summary { cursor: pointer; padding: .65rem .85rem; font-size: .78rem; font-weight: 700; color: var(--accent); letter-spacing: .04em; list-style: none; display: flex; justify-content: space-between; align-items: center; }
    details.kd-collapsible summary::-webkit-details-marker { display: none; }
    details.kd-collapsible summary::after { content: ''; font-size: .7rem; opacity: .7; }
    details.kd-collapsible[open] summary::after { transform: rotate(180deg); }
    details.kd-collapsible .kd-collapsible-body { padding: 0 .85rem .85rem; }
    .row { display: grid; grid-template-columns: 140px 1fr; gap: .5rem; align-items: center; margin-bottom: .45rem; font-size: .88rem; }
    .row label { color: var(--muted); font-size: .78rem; }
    input[type=text], input[type=password], input[type=number], select {
      width: 100%; padding: .45rem .55rem; border: 1px solid var(--border); border-radius: 6px; font-family: inherit;
    }
    .btn { display:inline-block; padding: .5rem 1rem; border-radius: 8px; border: none; background: var(--accent); color: #fff; font-weight: 600; cursor: pointer; font-size: .85rem; }
    .btn.secondary { background: #eee; color: var(--ink); }
    .btn.bad { background: var(--bad); }
    .btn-row { display: flex; flex-wrap: wrap; gap: .5rem; margin: .75rem 0 1rem; align-items: center; }
    .preset-row { display: flex; flex-wrap: wrap; gap: .35rem; margin: .5rem 0 1rem; }
    .preset-row .btn { font-size: .78rem; padding: .35rem .65rem; }
    .file-row { display: flex; align-items: center; justify-content: space-between; gap: .5rem; padding: .4rem 0; border-bottom: 1px solid var(--border); font-size: .85rem; }
    .share-grid { font-size: .82rem; }
    /* Cartões por categoria (estilo mockup) */
    .kd-share-cat { background: var(--card); border: 1px solid var(--border); border-radius: 12px; margin-bottom: .85rem; overflow: hidden; box-shadow: 0 1px 8px rgba(0,0,0,.04); }
    .kd-share-cat-head { display: flex; align-items: center; gap: .5rem; padding: .55rem .75rem; background: var(--trust-bg); border-bottom: 1px solid var(--border); flex-wrap: wrap; }
    .kd-share-cat-bulk { display: inline-flex; gap: .35rem; flex-wrap: wrap; align-items: center; margin-left: auto; }
    .doc-card--add-type { border-style: dashed; opacity: .95; }
    .kd-share-cat-ico { font-size: 1.25rem; line-height: 1; }
    .kd-share-cat-title { flex: 1; font-size: .72rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--ink); }
    .kd-link-btn { background: none; border: none; color: var(--accent); font-size: .72rem; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: .04em; font-family: inherit; padding: .2rem 0; }
    .kd-link-btn:hover { text-decoration: underline; }
    .kd-share-cat-body {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(152px, 1fr));
      gap: 10px;
      padding: .65rem .75rem .85rem;
    }
    @media (max-width: 520px) {
      .kd-share-cat-body { grid-template-columns: 1fr; }
    }
    .kd-share-field-card {
      border: 1px solid #3d5c45;
      border-radius: 8px;
      background: #e8f5ea;
      padding: .55rem .45rem .65rem;
      display: flex;
      flex-direction: column;
      gap: .45rem;
      transition: box-shadow .15s, border-color .15s;
    }
    .kd-share-field-card:hover { box-shadow: 0 2px 8px rgba(45,90,61,.12); }
    body.kd-theme-dark .kd-share-field-card {
      background: #1e2a22;
      border-color: var(--accent);
    }
    .kd-share-field-card-head {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: .3rem;
    }
    .kd-share-field-card-ico { font-size: 1.65rem; line-height: 1; }
    .kd-share-field-main { justify-content: center; flex-wrap: wrap; gap: .3rem; width: 100%; text-align: center; }
    .kd-share-field-name {
      font-size: .7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .04em;
      line-height: 1.25;
    }
    .kd-share-field-card .kd-field-adv {
      margin: 0;
      flex-direction: column;
      align-items: stretch;
      justify-content: flex-start;
      gap: .35rem;
    }
    .kd-field-block { padding: .35rem 0; border-bottom: 1px solid var(--border); }
    .kd-field-block:last-child { border-bottom: none; }
    .kd-share-field-card.kd-field-block { padding: 0; border-bottom: none; }
    .kd-field-main { display: flex; align-items: flex-start; gap: .5rem; cursor: pointer; font-size: .84rem; font-weight: 600; color: var(--ink); }
    .kd-field-main input { margin-top: .2rem; }
    .kd-field-adv { margin: .4rem 0 0 1.5rem; display: flex; flex-wrap: wrap; gap: .5rem .75rem; align-items: center; font-size: .74rem; color: var(--muted); }
    .kd-mini { display: inline-flex; align-items: center; gap: .25rem; cursor: pointer; font-weight: 500; }
    .kd-field-adv select { max-width: 200px; font-size: .78rem; }
    .kd-custom-atalhos { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; margin-top: .65rem; padding-top: .65rem; border-top: 1px dashed var(--border); }
    .kd-custom-atalhos .atalhos-title { width: 100%; margin-bottom: 0 !important; }
    .btn-atalho .kd-atalho-img { width: 1.15rem; height: 1.15rem; border-radius: 4px; object-fit: cover; vertical-align: middle; }
    .err { color: var(--bad); font-size: .85rem; margin: .5rem 0; }
    .okmsg { color: var(--accent); font-size: .85rem; margin: .5rem 0; }
    .linkbox { word-break: break-all; background: #f0f0ec; padding: .6rem; border-radius: 8px; font-size: .78rem; margin: .5rem 0; }
    code { font-size: .78rem; }
    .share-layout { display: grid; grid-template-columns: 1fr; gap: 1rem; align-items: start; }
    /* Aba Documentos: uma coluna — pré-visualização de ficheiros + resumo no mesmo bloco */
    .share-layout.kd-docs-unified-layout { grid-template-columns: 1fr !important; gap: 1rem !important; }
    .atalhos-block { margin: 0.35rem 0 0.25rem; }
    .atalhos-block .atalhos-title { font-size: .65rem; text-transform: uppercase; letter-spacing: .14em; color: var(--muted); margin-bottom: .35rem; display: block; }
    .atalhos-btns { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; }
    .btn-atalho { display: inline-flex; align-items: center; gap: .35rem; padding: .4rem .75rem; border-radius: 999px; border: 1px solid var(--border); background: #faf9f7; color: var(--ink); font-size: .78rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: background .15s, border-color .15s, color .15s; }
    .btn-atalho:hover { background: #e8f0ea; border-color: var(--accent); color: var(--accent); }
    .btn-atalho.active { background: var(--accent); border-color: var(--accent); color: #fff; }
    body.kd-theme-dark .btn-atalho:not(.active) {
      background: #243028;
      color: var(--ink);
      border-color: var(--border);
    }
    body.kd-theme-dark .btn-atalho:not(.active):hover {
      background: #2d3d34;
      border-color: var(--accent);
      color: var(--accent);
    }
    body.kd-theme-dark .btn-atalho.active {
      background: var(--accent);
      color: #0d120f;
      border-color: var(--accent);
    }
    .mini-actions { font-size: .78rem; margin-top: .5rem; color: var(--muted); }
    .mini-actions button { background: none; border: none; color: var(--accent); cursor: pointer; text-decoration: underline; padding: 0 .25rem; font: inherit; }
    .kd-atalho-item { display: inline-flex; align-items: center; gap: .25rem; flex-wrap: nowrap; }
    .kd-atalho-cog { font-size: .72rem !important; padding: .28rem .45rem !important; min-width: auto; line-height: 1; border-radius: 8px; }
    .kd-docs-unified-layout { align-items: start; }
    .kd-docs-left-col { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
    .kd-doc-vault-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      align-items: start;
      margin-top: .5rem;
    }
    @media (max-width: 959px) {
      .kd-doc-vault-row { gap: .75rem; }
    }
    @media (min-width: 960px) {
      .kd-doc-vault-row {
        grid-template-columns: minmax(0, 1fr) minmax(260px, 400px);
        gap: 1.1rem;
      }
    }
    .kd-doc-vault-grid-col { min-width: 0; }
    .kd-doc-vault-preview-col {
      display: flex;
      flex-direction: column;
      min-width: 0;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border);
      background: var(--card);
      box-shadow: 0 2px 12px rgba(0,0,0,.05);
    }
    @media (min-width: 960px) {
      .kd-doc-vault-preview-col {
        position: sticky;
        top: 1rem;
        align-self: start;
        max-height: calc(100vh - 4rem);
      }
    }
    .kd-doc-vault-preview-col .preview-header--vault {
      border-radius: 0;
      border: none;
      border-bottom: 1px solid var(--border);
    }
    .kd-doc-vault-preview-col .doc-preview-body--inline.kd-preview-files-scroll {
      flex: 0 1 auto;
      min-height: 140px;
      max-height: min(42vh, 380px);
      overflow-y: auto;
      border: none;
      border-radius: 0;
    }
    .kd-preview-resumo-block {
      display: flex;
      flex-direction: column;
      min-height: 0;
      border-top: 1px solid var(--border);
    }
    .preview-header--resumo {
      background: var(--accent);
      color: #fff;
      padding: .45rem .65rem;
      font-size: .72rem;
      font-weight: 700;
      letter-spacing: .06em;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    .preview-header--resumo .badge {
      font-size: .65rem;
      background: rgba(255,255,255,.25);
      padding: .15rem .45rem;
      border-radius: 999px;
      font-weight: 600;
    }
    .kd-preview-resumo-body {
      font-size: .8rem;
      max-height: min(36vh, 300px);
      overflow-y: auto;
      padding: .6rem .75rem .75rem;
    }
    .kd-preview-resumo-body .preview-sec h4 { font-size: .62rem; }
    .kd-doc-vault-preview-col .doc-preview-actions {
      flex-shrink: 0;
    }
    .kd-preview-partilhar-hint {
      margin: 0;
      border-radius: 0;
      border-left: none;
      border-right: none;
      font-size: .72rem;
    }
    .kd-share-hint-row {
      display: flex;
      flex-wrap: wrap;
      gap: .5rem;
      align-items: flex-start;
      justify-content: space-between;
      margin: 0 0 .75rem;
    }
    .kd-share-hint-row .kd-share-summary { flex: 1; min-width: 200px; margin: 0; }
    .preview-header--vault { background: var(--trust-bg); color: var(--ink); border: 1px solid var(--border); border-radius: 8px 8px 0 0; padding: .45rem .65rem; font-size: .72rem; font-weight: 700; }
    .doc-preview-body--inline { max-height: min(40vh, 360px); border: 1px solid var(--border); border-top: 0; border-radius: 0 0 8px 8px; }
    .kd-modal-box.kd-modal-box--xlarge { max-width: min(96vw, 720px); max-height: min(92vh, 900px); display: flex; flex-direction: column; }
    .kd-sc-modal-scroll { max-height: min(50vh, 420px); overflow-y: auto; padding-right: .35rem; margin-bottom: .5rem; border: 1px solid var(--border); border-radius: 10px; padding: .65rem; background: var(--trust-bg); }
    .kd-share-quick-actions { flex-direction: column; align-items: stretch !important; }
    .kd-share-quick-actions .kd-share-quick-row { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; }
    .preview-de-envio { position: sticky; top: .75rem; background: var(--card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.05); }
    @media (min-width: 960px) {
      .preview-de-envio { top: 1rem; max-height: calc(100vh - 2rem); display: flex; flex-direction: column; }
      .preview-de-envio .preview-body { flex: 1; min-height: 0; }
    }
    .preview-de-envio .preview-header { background: var(--accent); color: #fff; padding: .55rem .75rem; font-size: .72rem; font-weight: 700; letter-spacing: .06em; display: flex; justify-content: space-between; align-items: center; }
    .preview-de-envio .preview-header .badge { font-size: .65rem; background: rgba(255,255,255,.25); padding: .15rem .45rem; border-radius: 999px; font-weight: 600; }
    .preview-body { padding: .65rem .75rem; max-height: min(55vh, 420px); overflow-y: auto; font-size: .8rem; }
    .preview-sec { margin-bottom: .75rem; }
    .preview-sec h4 { font-size: .62rem; text-transform: uppercase; letter-spacing: .1em; color: var(--accent); margin: 0 0 .35rem; }
    .preview-line { padding: .2rem 0; border-bottom: 1px solid #f0ede8; word-break: break-word; }
    .preview-line .pl { color: var(--muted); font-size: .72rem; display: block; }
    .preview-line .pv { color: var(--ink); }
    .preview-line--merged { padding: .45rem 0 .55rem; border-bottom: 1px solid #f0ede8; }
    .preview-line--merged > .pl { font-weight: 700; font-size: .68rem; text-transform: uppercase; letter-spacing: .06em; color: var(--accent); margin-bottom: .35rem; }
    .pv-merge { display: flex; flex-direction: column; gap: .3rem; }
    .pv-row { display: grid; grid-template-columns: 76px 1fr; gap: .4rem; font-size: .78rem; align-items: start; }
    .pv-sub { color: var(--muted); font-size: .65rem; text-transform: uppercase; letter-spacing: .04em; padding-top: .1rem; }
    .kd-share-vault-hint { font-size: .62rem; color: var(--muted); margin: .35rem 0 0; line-height: 1.4; }
    .preview-empty { color: var(--muted); font-size: .82rem; padding: .5rem 0; }
    .preview-footer-msg { background: #e8f0ea; color: var(--accent); padding: .45rem .65rem; font-size: .75rem; display: flex; align-items: center; gap: .35rem; }
    .preview-de-envio .btn-clear { width: 100%; margin: 0; border-radius: 0 0 11px 11px; border: none; border-top: 1px solid var(--border); padding: .55rem; font-size: .8rem; }
    /* Documentos — pré-visualização ao lado (aba Documentos) */
    .doc-browse-layout { align-items: stretch; }
    .doc-vault-preview .preview-body { min-height: 180px; }
    .doc-preview-img { display: block; max-width: 100%; height: auto; border-radius: 8px; }
    .doc-preview-iframe { width: 100%; min-height: 260px; border: 0; border-radius: 8px; background: #1a1a1a; }
    body.kd-theme-dark .doc-preview-iframe { background: #0d0d0d; }
    .doc-preview-actions { padding: .65rem .75rem; border-top: 1px solid var(--border); background: var(--trust-bg); }
    .doc-preview-actions .doc-preview-actions-row { display: flex; flex-wrap: wrap; gap: .45rem; align-items: center; margin-bottom: .55rem; }
    .doc-preview-actions .doc-preview-actions-row:last-child { margin-bottom: 0; }
    .doc-preview-actions .kd-doc-act-row--wrap .btn.secondary { font-size: .74rem; padding: .32rem .5rem; }
    .doc-preview-actions .doc-act-label { font-size: .68rem; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); width: 100%; margin-bottom: .15rem; }
    .doc-preview-actions .btn:disabled { opacity: .45; cursor: not-allowed; }
    .doc-preview-stack-item { border: 1px solid var(--border); border-radius: 10px; padding: .5rem; margin-bottom: .75rem; background: var(--card); }
    .doc-preview-stack-head { display: flex; align-items: center; justify-content: space-between; gap: .5rem; flex-wrap: wrap; margin-bottom: .4rem; }
    .doc-preview-stack-title { font-size: .82rem; font-weight: 700; color: var(--ink); letter-spacing: .02em; }
    .doc-preview-sel-chip { font-size: .62rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; background: #e8f0ea; color: var(--accent); padding: .2rem .45rem; border-radius: 6px; border: 1px solid rgba(45,90,61,.25); }
    body.kd-theme-dark .doc-preview-sel-chip { background: #243528; border-color: rgba(123,201,154,.35); }
    .doc-preview-stack-item h4 { margin: 0 0 .4rem; font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; color: var(--accent); }
    .doc-preview-stack-item:last-child { margin-bottom: 0; }
    .kd-custom-doctypes { margin-top: 1.25rem; padding-top: 1rem; border-top: 1px dashed var(--border); }
    .kd-custom-doctype-form { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin-bottom: .65rem; }
    .kd-custom-doctype-form input[type=text] { max-width: 220px; }
    .kd-cdt-list { list-style: none; margin: 0; padding: 0; font-size: .82rem; }
    .kd-cdt-item { display: flex; flex-wrap: wrap; align-items: center; gap: .45rem; padding: .4rem 0; border-bottom: 1px solid var(--border); }
    .kd-cdt-item .btn { font-size: .74rem; padding: .28rem .55rem; }
    .kd-cdt-empty { color: var(--muted); font-size: .8rem; padding: .25rem 0; }
    .kd-cdt-ico { font-size: 1.2rem; }
    .kd-filter-links { margin-bottom: .65rem; display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
    .kd-filter-links input { max-width: 220px; }
    .kd-dados-saved-hint { font-size: .74rem; color: var(--muted); margin: -.5rem 0 .75rem; }
    .kd-hero-name-hint { text-align: center; font-size: .72rem; color: var(--muted); margin: -.35rem 0 .5rem; }
    .kd-hero-dirty-banner { max-width: 560px; margin: 0 auto .65rem; }
    .kd-dados-field { margin-bottom: .65rem; }
    .kd-dados-field .row { margin-bottom: .35rem; }
    .kd-dados-doc-row { display: flex; flex-wrap: wrap; gap: .45rem; align-items: center; margin: 0 0 0 140px; font-size: .78rem; }
    @media (max-width: 520px) {
      .kd-dados-doc-row { margin-left: 0; }
    }
    .kd-dados-doc-status { color: var(--muted); flex: 1; min-width: 120px; }
    .kd-dados-doc-status.has-file { color: var(--accent); font-weight: 600; }
    .kd-field-mode-picker { margin-top: 0 !important; padding: .35rem .25rem 0; justify-content: center; }
    .kd-field-mode-picker .kd-mini { font-size: .78rem; font-weight: 600; color: var(--ink); }
    .kd-share-field-card-head .kd-share-field-name { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
    .kd-dirty-banner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .65rem; padding: .65rem .85rem; margin-bottom: 1rem; border-radius: 10px; border: 1px solid rgba(234, 179, 8, 0.55); background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); color: #78350f; font-size: .84rem; font-weight: 600; }
    body.kd-theme-dark .kd-dirty-banner { background: linear-gradient(135deg, #2a2418 0%, #3d3420 100%); color: #fde68a; border-color: rgba(250, 204, 21, 0.35); }
    .kd-share-quick-actions { padding: .55rem .75rem; border-top: 1px solid var(--border); background: var(--trust-bg); display: flex; flex-wrap: wrap; gap: .45rem; align-items: center; }
    .kd-share-quick-actions .kd-hint-inline { font-size: .72rem; color: var(--muted); flex: 1; min-width: 140px; }
    .doc-preview-stack-item--draggable { cursor: grab; }
    .doc-preview-stack-item--draggable:active { cursor: grabbing; }
    .doc-preview-stack-item--dragging { opacity: 0.55; }
    .doc-preview-stack-item--drag-over { box-shadow: 0 0 0 2px var(--accent); background: rgba(45, 90, 61, 0.06); }
    .doc-preview-drag-hint { font-size: .65rem; color: rgba(255,255,255,.85); font-weight: 500; margin-left: .35rem; }
    .kd-cdt-emoji-wrap { position: relative; display: inline-flex; align-items: center; gap: .35rem; }
    .kd-cdt-emoji-pop { position: absolute; left: 0; top: 100%; margin-top: 4px; z-index: 400; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: .5rem; box-shadow: 0 12px 40px rgba(0,0,0,.12); max-width: min(280px, 92vw); max-height: 220px; overflow: auto; display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; }
    .kd-cdt-emoji-pop[hidden] { display: none !important; }
    .kd-cdt-emoji-pop .kd-emoji-opt { font-size: 1.1rem; padding: .25rem; border: none; background: transparent; cursor: pointer; border-radius: 6px; line-height: 1; }
    .kd-cdt-emoji-pop .kd-emoji-opt:hover { background: var(--trust-bg); }
    .links-actions { display: flex; flex-wrap: wrap; gap: .35rem; align-items: center; }
    .links-actions .btn { font-size: .72rem; padding: .28rem .5rem; }
    .kd-links-bulk { display: flex; flex-wrap: wrap; gap: .45rem; align-items: center; margin-bottom: .65rem; }
    .kd-links-bulk .kd-links-bulk-hint { margin: 0; font-size: .74rem; color: var(--muted); flex: 1; min-width: 200px; }
    #links-list table input[type="checkbox"] { cursor: pointer; width: 1.05rem; height: 1.05rem; vertical-align: middle; }
    .kd-links-col-actions { display: flex; flex-direction: column; gap: .35rem; align-items: stretch; }
    .panel.active { box-shadow: 0 2px 24px rgba(0,0,0,.06); }
    body.kd-theme-dark .panel.active { box-shadow: 0 2px 28px rgba(0,0,0,.35); }
    .doc-card--browse { cursor: pointer; text-align: center; }
    /* Documentos — grelha tipo cartões */
    .doc-panel-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 1.25rem 1rem 1.5rem; box-shadow: 0 4px 24px rgba(0,0,0,.06); margin-bottom: 1.25rem; }
    .doc-badge { display: flex; align-items: center; justify-content: center; gap: .4rem; padding: .35rem .85rem; border-radius: 999px; border: 1px solid var(--border); background: #faf9f7; font-size: .68rem; font-weight: 700; letter-spacing: .08em; color: var(--muted); margin: 0 auto 1rem; width: fit-content; text-transform: uppercase; }
    .doc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    @media (max-width: 640px) { .doc-grid { grid-template-columns: repeat(2, 1fr); } }
    .doc-card { border: 1px solid #3d5c45; border-radius: 8px; background: #e8f5ea; padding: .75rem .5rem; text-align: center; cursor: pointer; transition: background .15s, border-color .15s, box-shadow .15s; font: inherit; color: inherit; width: 100%; }
    .doc-card:hover { box-shadow: 0 2px 8px rgba(45,90,61,.12); }
    .doc-card.doc-card--browse.doc-card--active { background: #d4edda; border-color: #2d5a3d; box-shadow: 0 0 0 2px var(--accent); }
    .doc-card.doc-card--browse.doc-card--active:hover {
      background: #ecf6d4;
      border-color: #6b8f3a;
      box-shadow: 0 0 0 2px var(--accent), 0 4px 16px rgba(234, 179, 8, 0.42);
    }
    body.kd-theme-dark .doc-card.doc-card--browse.doc-card--active:hover {
      background: #2a3828;
      box-shadow: 0 0 0 2px var(--accent), 0 4px 18px rgba(250, 204, 21, 0.25);
    }
    .doc-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .doc-card.selected { background: #d4edda; border-color: #2d5a3d; }
    .doc-card .dc-icon { font-size: 1.75rem; line-height: 1; margin-bottom: .35rem; }
    .doc-card .dc-title { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--ink); margin-bottom: .4rem; line-height: 1.25; }
    .doc-card .dc-status { font-size: .7rem; color: #2d5a3d; font-weight: 600; }
    .doc-card:not(.selected) .dc-status { color: var(--muted); font-weight: 500; }
    .doc-card .dc-date { font-size: .62rem; color: var(--muted); margin-top: .25rem; }
    .doc-grid--unified { grid-template-columns: repeat(3, 1fr); }
    @media (max-width: 640px) { .doc-grid--unified { grid-template-columns: repeat(2, 1fr); } }
    .kd-grid-section-label {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      gap: .45rem;
      font-size: .68rem;
      font-weight: 800;
      letter-spacing: .1em;
      text-transform: uppercase;
      color: var(--accent);
      margin: .65rem 0 .15rem;
      padding: .35rem 0 .2rem;
      border-bottom: 1px dashed var(--border);
    }
    .kd-grid-section-label:first-of-type { margin-top: 0; }
    .kd-grid-section-label span { font-size: 1.1rem; line-height: 1; }
    .doc-card--share {
      cursor: default;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      min-height: 132px;
      padding: .85rem .5rem .7rem;
    }
    .doc-card--share.doc-card--on { background: #d4edda; border-color: #2d5a3d; box-shadow: 0 0 0 2px rgba(45,90,61,.25); }
    .doc-card--share.doc-card--has-file:not(.doc-card--on) { background: #eef6f0; border-color: #5a8f6a; }
    .doc-card--share .dc-val-hint {
      font-size: .62rem;
      color: var(--muted);
      margin: 0 .15rem .3rem;
      line-height: 1.25;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .doc-card--share .dc-modes { display: flex; flex-wrap: wrap; gap: .35rem .5rem; justify-content: center; margin: .4rem 0 .2rem; width: 100%; }
    .doc-card--share .kd-sc-mode { display: inline-flex; align-items: center; gap: .2rem; font-size: .66rem; font-weight: 600; color: var(--ink); cursor: pointer; margin: 0; }
    .doc-card--share .kd-sc-mode input { margin: 0; width: .95rem; height: .95rem; accent-color: var(--accent); }
    .kd-docs-share-toolbar { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; justify-content: space-between; margin: 0 0 .75rem; }
    .kd-docs-share-toolbar .kd-share-summary { margin: 0; flex: 1; min-width: 180px; }
    body.kd-theme-dark .doc-card .dc-status { color: var(--accent); }
    body.kd-theme-dark .doc-badge { background: #243028; color: var(--muted); border-color: var(--border); }
    .doc-fallback-title { font-size: .68rem; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); margin: 1rem 0 .5rem; }
    /* Painel pessoal — topo */
    .kd-hero-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 1.5rem 1.25rem 1.35rem; box-shadow: 0 4px 24px rgba(0,0,0,.07); margin-bottom: 1.25rem; }
    .kd-hero-top { text-align: center; margin-bottom: 1.15rem; }
    .kd-hero-badge { display: inline-block; background: var(--accent); color: #fff; font-size: .65rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; padding: .38rem 1rem; border-radius: 999px; margin-bottom: .95rem; font-family: 'DM Sans', sans-serif; }
    .kd-hero-name { display: block; width: 100%; max-width: 560px; margin: 0 auto .55rem; text-align: center; font-family: 'Source Serif 4', Georgia, serif; font-size: clamp(1.65rem, 4vw, 2.2rem); font-weight: 700; color: var(--ink); border: none; border-bottom: 2px solid transparent; background: transparent; padding: .25rem .6rem; border-radius: 6px; transition: background .15s, border-color .15s; }
    .kd-hero-name:hover { background: var(--hero-name-bg); }
    .kd-hero-name:focus { outline: none; border-bottom-color: var(--accent); background: var(--hero-name-bg); }
    .kd-hero-name::placeholder { color: #9a9590; font-weight: 600; }
    .kd-hero-sub { margin: 0 auto; font-size: .88rem; color: var(--muted); max-width: 26rem; line-height: 1.45; }
    .kd-hero-atalhos { text-align: left; border-top: none; padding-top: 0; margin-top: 0; }
    .kd-hero-atalhos .atalhos-block { margin: 0; }
    /* Toasts */
    #kd-toast-host { position: fixed; bottom: 1rem; right: clamp(0.5rem, 2vw, 1.25rem); left: auto; z-index: 9999; display: flex; flex-direction: column; align-items: flex-end; gap: .35rem; pointer-events: none; max-width: min(420px, calc(100vw - 1.5rem)); margin: 0; }
    .kd-toast { pointer-events: auto; background: var(--ink); color: #fff; padding: .55rem .8rem; border-radius: 10px; font-size: .82rem; box-shadow: 0 8px 32px rgba(0,0,0,.18); animation: kdToastIn .22s ease; max-width: 100%; line-height: 1.35; }
    .kd-toast.kd-toast--ok { background: var(--accent); }
    .kd-toast.kd-toast--err { background: #a33030; }
    .kd-toast.kd-toast--neutral { background: #3a3632; }
    @keyframes kdToastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    /* Carregamento inicial */
    .kd-load-overlay { display: none; position: fixed; inset: 0; z-index: 9000; background: rgba(247,244,239,.82); backdrop-filter: blur(4px); align-items: center; justify-content: center; flex-direction: column; gap: .75rem; }
    body.kd-app-loading .kd-load-overlay { display: flex; }
    .kd-load-spinner { width: 36px; height: 36px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: kdSpin .7s linear infinite; }
    @keyframes kdSpin { to { transform: rotate(360deg); } }
    .kd-load-text { font-size: .88rem; color: var(--muted); }
    /* Partilha — destaque + confiança */
    .kd-share-head { border-left: 4px solid var(--accent); padding-left: .85rem; margin-bottom: 1rem; }
    .kd-share-head h2 { font-size: 1.05rem; margin: 0 0 .35rem; font-weight: 700; color: var(--ink); }
    .kd-trust-strip { background: var(--trust-bg); border: 1px solid var(--border); border-radius: 10px; padding: .75rem .9rem; margin-bottom: 1rem; font-size: .8rem; color: var(--muted); line-height: 1.5; }
    .kd-trust-strip strong { display: block; color: var(--accent); font-size: .72rem; letter-spacing: .06em; text-transform: uppercase; margin-bottom: .4rem; }
    .kd-trust-strip ul { margin: 0; padding-left: 1.1rem; }
    .kd-share-summary { margin: 0 0 .9rem; font-size: .84rem; color: var(--muted); padding: .55rem .65rem; border-radius: 8px; background: var(--summary-bg); border: 1px dashed var(--border); }
    .kd-share-summary.kd-share-summary--ok { border-color: #b8d4c0; background: var(--banner-bg); color: var(--accent); }
    .kd-models-bar { background: var(--trust-bg); border: 1px solid var(--border); border-radius: 10px; padding: .75rem .9rem; margin-bottom: 1rem; }
    .kd-models-bar .kd-models-title { font-size: .68rem; text-transform: uppercase; letter-spacing: .12em; color: var(--muted); margin-bottom: .5rem; display: block; }
    .kd-models-row { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; margin-bottom: .5rem; }
    .kd-models-row input[type=text] { max-width: 160px; }
    .kd-models-chips { display: flex; flex-wrap: wrap; gap: .35rem; }
    .kd-chip { display: inline-flex; align-items: center; gap: .25rem; padding: .28rem .55rem; border-radius: 999px; border: 1px solid var(--border); background: var(--card); font-size: .74rem; }
    .kd-chip button { background: none; border: none; color: var(--accent); cursor: pointer; font-size: .72rem; padding: 0 .2rem; font-weight: 700; }
    .kd-hint { font-size: .75rem; color: var(--muted); margin: .25rem 0 0; line-height: 1.4; }
    .kd-modal { display: none; position: fixed; inset: 0; z-index: 10000; align-items: center; justify-content: center; padding: 1rem; }
    .kd-modal.kd-modal--open { display: flex; }
    .kd-modal-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.45); }
    .kd-modal-box { position: relative; background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 1.25rem; max-width: 320px; width: 100%; box-shadow: 0 16px 48px rgba(0,0,0,.2); }
    .kd-modal-box.kd-modal-box--wide { max-width: 420px; }
    .kd-modal-box h3 { margin: 0 0 .5rem; font-size: 1rem; }
    .kd-modal-field { margin-bottom: .75rem; }
    .kd-modal-field label { display: block; font-size: .78rem; color: var(--muted); margin-bottom: .28rem; font-weight: 600; }
    .kd-modal-field input[type=text], .kd-modal-field select { width: 100%; }
    .kd-modal-actions { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: 1rem; }
    .kd-sc-actions { width: 100%; align-items: center; }
    .kd-sc-actions-fill { flex: 1; min-width: .5rem; }
    /* Seletor de emoji no modal de atalho */
    .kd-sc-emoji-field { position: relative; z-index: 2; }
    .kd-emoji-picker-row { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
    .kd-emoji-preview {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 2.5rem; height: 2.5rem; font-size: 1.5rem; line-height: 1;
      background: var(--trust-bg); border: 1px solid var(--border); border-radius: 10px;
    }
    .kd-emoji-toggle { font-size: .78rem; }
    .kd-emoji-popover {
      position: absolute; left: 0; right: 0; top: 100%; margin-top: .4rem;
      padding: .65rem; background: var(--card); border: 1px solid var(--border);
      border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,.18); z-index: 5;
      max-height: min(240px, 45vh); overflow-y: auto;
    }
    .kd-emoji-popover[hidden] { display: none !important; }
    .kd-emoji-popover-hint { font-size: .72rem; color: var(--muted); margin: 0 0 .5rem; }
    .kd-emoji-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(2.35rem, 1fr)); gap: .35rem;
    }
    .kd-emoji-opt {
      display: flex; align-items: center; justify-content: center;
      min-height: 2.35rem; padding: .2rem; font-size: 1.35rem; line-height: 1;
      border: 1px solid var(--border); border-radius: 8px; background: var(--trust-bg);
      cursor: pointer; font-family: inherit;
      transition: background .12s, border-color .12s, transform .1s;
    }
    .kd-emoji-opt:hover, .kd-emoji-opt:focus-visible {
      background: var(--banner-bg); border-color: var(--accent); outline: none;
    }
    .kd-emoji-opt:active { transform: scale(0.96); }
    .kd-emoji-manual-wrap { margin-top: .65rem; padding-top: .55rem; border-top: 1px dashed var(--border); }
    .kd-emoji-manual-wrap label { font-size: .72rem; margin-bottom: .25rem; display: block; }
    .kd-emoji-manual-input { width: 100%; font-size: .9rem; }
    #kd-qr-wrap { display: flex; justify-content: center; margin: 1rem 0; min-height: 200px; align-items: center; }
    #kd-qr-wrap canvas { border-radius: 8px; }
    .kd-badge { display: inline-block; font-size: .65rem; padding: .2rem .45rem; border-radius: 6px; font-weight: 600; }
    .kd-badge-ok { background: #e8f0ea; color: var(--accent); }
    .kd-badge-muted { background: #eceae7; color: var(--muted); }
    .kd-badge-bad { background: #fde8e8; color: #922b21; }
    .file-list-skel .skel-line { height: 10px; background: linear-gradient(90deg, #eceae7 0%, #f5f3ef 50%, #eceae7 100%); background-size: 200% 100%; animation: kdSkel 1.2s ease infinite; border-radius: 4px; margin-bottom: .5rem; }
    @keyframes kdSkel { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="kd-top-bar kd-top-bar--minimal">
      <a href="/dashboard" class="kd-back-dashboard" id="kd-back-dashboard" title="Voltar ao painel principal">— Painel principal</a>
      <div class="kd-top-bar-actions">
        <button type="button" class="kd-theme-btn" id="kd-theme-toggle" title="Alternar tema claro/escuro">Tema escuro</button>
      </div>
    </div>

    <section class="kd-hero-card kd-hero-card--top" aria-label="Painel pessoal">
      <div class="kd-hero-top">
        <div class="kd-hero-badge">Painel pessoal</div>
        <label class="visually-hidden" for="sh-name">Nome a mostrar no link</label>
        <input type="text" id="sh-name" class="kd-hero-name" placeholder="Seu nome" autocomplete="name"/>
        <div id="kd-hero-dirty-banner" class="kd-dirty-banner kd-hero-dirty-banner" hidden>
          <span>Tens alterações por guardar no servidor.</span>
          <button type="button" class="btn" id="kd-hero-save-quick" style="font-size:.78rem;padding:.4rem .75rem">Guardar no servidor</button>
        </div>
        <p class="kd-hero-name-hint">O nome do topo e «Nome Completo» ficam iguais. Clica <strong>Guardar no servidor</strong> para gravar.</p>
        <p class="kd-hero-sub">Selecione o que quiser compartilhar e copie com um clique</p>
      </div>
    </section>

    <div class="kd-sticky-atalhos-bar">
      <div class="kd-sticky-atalhos-inner">
        <div class="kd-hero-atalhos">
        <div class="atalhos-block">
          <span class="atalhos-title">Atalhos</span>
          <div class="atalhos-btns" id="kd-atalhos-merged">
            <span class="kd-atalho-item">
              <button type="button" class="btn-atalho" data-preset="festa" title="Morada, WhatsApp e RG (ficheiro do cofre)">Y Festa em Casa</button>
              <button type="button" class="btn secondary kd-atalho-cog" data-edit-preset="festa" aria-label="Personalizar Festa em Casa" title="Personalizar">oZ</button>
            </span>
            <span class="kd-atalho-item">
              <button type="button" class="btn-atalho" data-preset="receberPf" title="Nome, CPF e dados bancários PF">Y' Receber PF</button>
              <button type="button" class="btn secondary kd-atalho-cog" data-edit-preset="receberPf" aria-label="Personalizar Receber PF" title="Personalizar">oZ</button>
            </span>
            <span class="kd-atalho-item">
              <button type="button" class="btn-atalho" data-preset="receberPj" title="Empresa + dados bancários PJ">Y Receber PJ</button>
              <button type="button" class="btn secondary kd-atalho-cog" data-edit-preset="receberPj" aria-label="Personalizar Receber PJ" title="Personalizar">oZ</button>
            </span>
            <span class="kd-atalho-item">
              <button type="button" class="btn-atalho" data-preset="correspondencia" title="Nome e morada para envio">Correspondência</button>
              <button type="button" class="btn secondary kd-atalho-cog" data-edit-preset="correspondencia" aria-label="Personalizar Correspondência" title="Personalizar">oZ</button>
            </span>
            <span class="kd-atalho-item">
              <button type="button" class="btn-atalho" data-preset="enviarNf" title="Dados fiscais e sede">Y"" Enviar NF</button>
              <button type="button" class="btn secondary kd-atalho-cog" data-edit-preset="enviarNf" aria-label="Personalizar Enviar NF" title="Personalizar">oZ</button>
            </span>
            <span id="kd-custom-atalhos-inner" class="atalhos-btns" style="display:contents"></span>
            <button type="button" class="btn secondary" id="btn-add-custom-atalho" style="font-size:.78rem;padding:.38rem .75rem;border-radius:999px">+ Criar atalho</button>
          </div>
        </div>
        </div>
      </div>
    </div>

    <div class="kd-page-body">
    <p class="sub" id="auth-hint"></p>

    <div class="tabs" id="kd-tabs" role="tablist" aria-label="Secções King Docs">
      <button type="button" class="tab active" role="tab" aria-selected="true" aria-controls="p-dados" id="tab-p-dados" data-panel="p-dados">Dados</button>
      <button type="button" class="tab" role="tab" aria-selected="false" aria-controls="p-docs" id="tab-p-docs" data-panel="p-docs">Documentos</button>
      <button type="button" class="tab" role="tab" aria-selected="false" aria-controls="p-partilha" id="tab-p-partilha" data-panel="p-partilha">Partilhar</button>
    </div>

    <div id="p-dados" class="panel active" role="tabpanel" aria-labelledby="tab-p-dados"></div>
    <input type="file" id="doc-file-hidden" accept="image/*,.pdf,application/pdf" style="position:absolute;width:0;height:0;opacity:0;pointer-events:none" tabindex="-1" aria-hidden="true"/>

    <div id="p-docs" class="panel" role="tabpanel" aria-labelledby="tab-p-docs">
      <p class="sub">Todos os itens no <strong>mesmo estilo de cartão</strong> (ícone grande, como RG e CNH). Marca <strong>Texto</strong> e/ou <strong>Foto/PDF</strong>. Preenche os valores na aba <strong>Dados</strong>.</p>
      <div class="share-layout kd-docs-unified-layout doc-browse-layout">
        <div class="kd-docs-left-col">
          <div class="doc-panel-card">
            <div class="doc-badge" role="status"><span aria-hidden="true">Y"<</span> O que incluir no link</div>
            <div class="kd-docs-share-toolbar">
              <p class="kd-share-summary" id="share-confirm-hint">Marca Texto e/ou Foto/PDF nos cartões; o resumo aparece à direita.</p>
              <button type="button" class="btn secondary" id="btn-share-fields-clear" style="font-size:.74rem;flex-shrink:0">Limpar seleção</button>
            </div>
            <div class="kd-doc-vault-row">
              <div class="kd-doc-vault-grid-col">
                <p class="sub" style="margin:0 0 .5rem;font-size:.72rem">Secções: documentos, dados pessoais, contato, morada, etc. — cada um com o seu ícone. <strong>z. Novo tipo</strong> em <strong>Dados</strong>.</p>
                <div id="doc-browse-root" class="doc-grid"></div>
              </div>
              <div class="kd-doc-vault-preview-col doc-vault-preview kd-preview-unified-column" id="doc-vault-preview-wrap" aria-label="Pré-visualização: ficheiros e resumo do link">
                <div class="preview-header preview-header--vault">Pré-visualização dos ficheiros <span class="badge" id="doc-preview-sel-badge" style="display:none" aria-live="polite"></span><span class="doc-preview-drag-hint" id="doc-preview-drag-hint" style="display:none;margin-left:.35rem;opacity:.85;font-weight:600"> · Arrasta para ordenar</span></div>
                <div id="doc-preview-body" class="preview-body doc-preview-body--inline kd-preview-files-scroll">
                  <p class="preview-empty">Clica nos documentos à esquerda (podes escolher vários).</p>
                </div>
                <div class="kd-preview-resumo-block">
                  <div class="preview-header preview-header--resumo">Resumo do link <span id="preview-count" class="badge">0 itens</span></div>
                  <div id="share-preview-body" class="kd-preview-resumo-body"><p class="preview-empty">Marca Texto e/ou Foto/PDF nos cartões à esquerda.</p></div>
                </div>
                <p class="preview-footer-msg kd-preview-partilhar-hint"><span>o"</span> Isto é só visualização. O URL gera-se na aba <strong>Partilhar</strong> (ou com os botões de link abaixo).</p>
                <div class="doc-preview-actions" id="doc-preview-actions">
                  <div class="doc-preview-actions-row">
                    <button type="button" class="btn secondary" id="btn-doc-clear-sel" disabled title="Limpa só a escolha dos cartões de documento à esquerda">Limpar cartões</button>
                    <button type="button" class="btn" id="btn-doc-copy-link" disabled title="Cria o link e copia — inclui tudo o que marcaste">Copiar link único</button>
                  </div>
                  <div class="doc-preview-actions-row kd-doc-act-row--wrap">
                    <button type="button" class="btn secondary" id="btn-doc-copy-plain" disabled title="Texto do resumo: nome, campos e referências a ficheiros">Copiar mensagem (tudo)</button>
                    <button type="button" class="btn secondary" id="btn-doc-copy-textonly" disabled title="Só linhas de texto dos campos (sem lista de anexos)">Copiar só texto</button>
                    <button type="button" class="btn secondary" id="btn-doc-copy-with-img" disabled title="Requer foto no topo (aba Partilhar). Se o browser não suportar, usa o botão WhatsApp abaixo">Copiar com imagem</button>
                  </div>
                  <div class="doc-preview-actions-row kd-doc-act-row--wrap">
                    <button type="button" class="btn secondary" id="btn-doc-wa-link" disabled title="Abre o WhatsApp só com o URL da partilha">WhatsApp · só link</button>
                    <button type="button" class="btn secondary" id="btn-doc-wa-text" disabled title="Mensagem só com texto (sem URL)">WhatsApp · só texto</button>
                    <button type="button" class="btn secondary" id="btn-doc-wa-text-img" disabled title="No telemóvel abre o menu Partilhar com imagem + texto. No PC o WhatsApp Web não anexa imagem pelo browser — usa PDF ou envia a foto à parte.">WhatsApp · texto + imagem</button>
                    <button type="button" class="btn secondary" id="btn-doc-wa-list" disabled title="Link único + lista dos nomes dos ficheiros escolhidos nos cartões">WhatsApp · link + lista</button>
                    <button type="button" class="btn secondary" id="btn-doc-wa-sep" disabled title="Um URL diferente para cada ficheiro dos cartões (sem misturar num só link)">WhatsApp · um link por ficheiro</button>
                  </div>
                  <div class="doc-preview-actions-row">
                    <button type="button" class="btn secondary" id="btn-doc-pdf-dl" disabled title="PDF com texto, foto e documentos — igual ao resumo completo">PDF · descarregar</button>
                    <button type="button" class="btn secondary" id="btn-doc-pdf-share" disabled title="Partilha o mesmo PDF completo (telefone: menu nativo)">PDF · enviar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id="share-table-wrap" hidden aria-hidden="true" style="display:none"></div>
    <div id="extra-docs-wrap" hidden aria-hidden="true" style="display:none"></div>

    <div id="p-partilha" class="panel" role="tabpanel" aria-labelledby="tab-p-partilha">
      <div class="kd-share-head">
        <h2>Partilhar</h2>
        <p class="sub" style="margin-bottom:0">Aqui envias a <strong>foto do topo do link</strong> (upload — fica no cofre), defines <strong>prazo</strong>, <strong>senha</strong> e <strong>limite de vistas</strong>, geras o URL e geres a <strong>lista dos teus links</strong>. O que vai no link escolhes em <strong>Documentos</strong>.</p>
      </div>
      <div class="kd-trust-strip" role="note">
        <strong>Antes de gerar</strong>
        <ul>
          <li>Escolhe os campos em <strong>Documentos</strong> — o resumo aparece no mesmo painel que a pré-visualização dos ficheiros.</li>
          <li>Quem receber abre no <strong>browser</strong> (telefone ou PC).</li>
          <li>Depois de gerado, revoga ou exclui na <strong>lista abaixo</strong>.</li>
        </ul>
      </div>

      <div class="kd-models-bar">
        <span class="kd-models-title">Os teus modelos <span style="font-weight:400;text-transform:none;letter-spacing:0">(guardados neste dispositivo)</span></span>
        <div class="kd-models-row">
          <input type="text" id="kd-model-name" placeholder="Nome do modelo" maxlength="40" aria-label="Nome do modelo"/>
          <button type="button" class="btn secondary" id="btn-save-model">Guardar seleção atual</button>
        </div>
        <div class="kd-models-chips" id="kd-models-chips"></div>
      </div>

      <div class="doc-panel-card" style="margin-top:1rem">
        <div class="doc-badge" role="status"><span aria-hidden="true">T️</span> Opções do link</div>
        <p class="sub" style="margin-top:.5rem">Foto do topo do link (upload), tempo de vida e proteção; depois gera o link.</p>
        <div class="row" style="grid-template-columns: 160px 1fr; margin-bottom:.8rem;">
          <label>Foto no link</label>
          <div>
            <input type="hidden" id="sh-profile-file-id" value=""/>
            <input type="file" id="sh-profile-file" accept="image/*"/>
            <p class="kd-hint" style="margin:.35rem 0 0">A imagem é guardada no cofre (tipo <strong>FOTO PESSOAL</strong>) e aparece no topo da partilha — não precisas de URL.</p>
            <div id="sh-profile-preview-wrap" style="display:none;margin-top:.5rem"></div>
            <button type="button" class="btn secondary" id="sh-profile-clear" style="display:none;margin-top:.4rem;font-size:.78rem">Remover foto do link</button>
          </div>
        </div>
        <div style="display:grid; gap:.6rem; max-width: 420px;">
          <div class="row" style="grid-template-columns: 160px 1fr;">
            <label>Expira em (horas)</label>
            <input type="number" id="sh-hours" value="24" min="1" max="720"/>
          </div>
          <div class="row" style="grid-template-columns: 160px 1fr;">
            <label>Senha (opcional)</label>
            <input type="password" id="sh-pass" placeholder="Vazio = sem senha"/>
          </div>
          <div class="row" style="grid-template-columns: 160px 1fr; align-items: start;">
            <label>Máx. visualizações</label>
            <div>
              <input type="number" id="sh-maxv" placeholder="Vazio = ilimitado" min="1" aria-describedby="hint-maxv"/>
              <p class="kd-hint" id="hint-maxv">Coloca <strong>1</strong> para um link de <strong>uso único</strong> (fecha após a primeira abertura bem-sucedida).</p>
            </div>
          </div>
        </div>
        <p style="margin-top:1rem;"><button type="button" class="btn" id="btn-create-link">Gerar link seguro</button></p>
        <div id="share-out"></div>
      </div>

      <div class="doc-panel-card" style="margin-top:1.25rem">
        <div class="doc-badge" role="status"><span aria-hidden="true">Y"-</span> Os meus links</div>
        <p class="sub" style="margin-top:.5rem">Copia, partilha, <strong>revoga</strong> (invalida) ou <strong>exclui</strong> (remove da lista). <strong>Expirados</strong> ou <strong>revogados</strong> deixam de abrir.</p>
        <div class="kd-links-bulk">
          <button type="button" class="btn secondary" id="btn-links-revoke-sel">Revogar selecionados</button>
          <button type="button" class="btn bad" id="btn-links-delete-sel">Excluir selecionados</button>
          <p class="kd-links-bulk-hint">Marca as linhas à esquerda. <strong>Revogar</strong> mantém o registo como revogado; <strong>Excluir</strong> apaga o registo (não volta a aparecer).</p>
        </div>
        <div class="kd-filter-links">
          <label for="links-filter" class="visually-hidden">Filtrar lista</label>
          <input type="search" id="links-filter" placeholder="Filtrar por ID, estado ou data—" autocomplete="off"/>
        </div>
        <div id="links-list"></div>
      </div>
    </div>
    </div>

    <div id="kd-load-overlay" class="kd-load-overlay" aria-hidden="true" aria-busy="true">
      <div class="kd-load-spinner" aria-hidden="true"></div>
      <p class="kd-load-text">A carregar o teu cofre—</p>
    </div>
    <div id="kd-toast-host" aria-live="polite" aria-relevant="additions"></div>

    <div id="kd-qr-modal" class="kd-modal" aria-hidden="true">
      <div class="kd-modal-backdrop" id="kd-qr-backdrop"></div>
      <div class="kd-modal-box" role="dialog" aria-modal="true" aria-labelledby="kd-qr-title">
        <h3 id="kd-qr-title">QR Code do link</h3>
        <p class="sub" style="margin:0 0 .5rem">Escaneia com o telemóvel. Trata o link como confidencial.</p>
        <div id="kd-qr-wrap"></div>
        <p style="margin:0"><button type="button" class="btn secondary" id="kd-qr-close">Fechar</button></p>
      </div>
    </div>

    <div id="kd-shortcut-modal" class="kd-modal" aria-hidden="true">
      <div class="kd-modal-backdrop" id="kd-shortcut-backdrop"></div>
      <div class="kd-modal-box kd-modal-box--wide kd-modal-box--xlarge" role="dialog" aria-modal="true" aria-labelledby="kd-shortcut-title">
        <h3 id="kd-shortcut-title">Novo atalho</h3>
        <p class="sub" style="margin:0 0 .75rem">Define o <strong>nome</strong> e o que entra no atalho (campos e documentos). Isto fica guardado neste dispositivo.</p>
        <input type="hidden" id="kd-sc-edit-id" value=""/>
        <div class="kd-modal-field">
          <label for="kd-sc-name">Nome do atalho</label>
          <input type="text" id="kd-sc-name" maxlength="32" placeholder="Ex.: Meu cliente X"/>
        </div>
        <div class="kd-modal-field kd-sc-emoji-field">
          <label for="kd-emoji-toggle">Ícone</label>
          <div class="kd-emoji-picker-row">
            <span class="kd-emoji-preview" id="kd-sc-emoji-preview" title="Ícone escolhido">Y"O</span>
            <input type="hidden" id="kd-sc-emoji" value="Y"O"/>
            <button type="button" class="btn secondary kd-emoji-toggle" id="kd-emoji-toggle" aria-expanded="false" aria-controls="kd-emoji-popover">Escolher ícone—</button>
          </div>
          <div id="kd-emoji-popover" class="kd-emoji-popover" hidden>
            <p class="kd-emoji-popover-hint">Escolhe um emoji abaixo ou escreve/cola outro no fim.</p>
            <div class="kd-emoji-grid" id="kd-emoji-grid" role="listbox" aria-label="Emojis para o atalho"></div>
            <div class="kd-emoji-manual-wrap">
              <label for="kd-sc-emoji-manual">Outro emoji (colar ou teclado)</label>
              <input type="text" id="kd-sc-emoji-manual" class="kd-emoji-manual-input" maxlength="8" placeholder="ex.: ⭐ ou combinação" autocomplete="off"/>
            </div>
          </div>
        </div>
        <div class="kd-modal-field">
          <label for="kd-sc-img">Foto / ícone (opcional, máx. ~80 KB)</label>
          <input type="file" id="kd-sc-img" accept="image/*"/>
        </div>
        <p class="group" style="margin:.5rem 0 .35rem;font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">O que o atalho inclui (texto / ficheiro por campo)</p>
        <div class="kd-sc-modal-scroll" id="kd-sc-modal-scroll">
          <div class="share-grid" id="kd-sc-share-grid"></div>
          <h3 class="group" style="margin-top:.85rem;font-size:.78rem;">Documentos extra (só ficheiro)</h3>
          <div id="kd-sc-extra-docs"></div>
        </div>
        <p class="kd-hint" style="margin:.35rem 0 0">Ao abrir, copiamos a seleção atual da página para editares. Podes <strong>substituir tudo</strong> marcando outra combinação.</p>
        <div class="kd-modal-actions kd-sc-actions">
          <button type="button" class="btn bad" id="kd-sc-delete" hidden>Excluir</button>
          <span class="kd-sc-actions-fill" aria-hidden="true"></span>
          <button type="button" class="btn secondary" id="kd-sc-cancel">Cancelar</button>
          <button type="button" class="btn" id="kd-sc-save">Guardar atalho</button>
        </div>
      </div>
    </div>
  </div>

  
    <script src="/config.js?v=2026-09-09-vite1"></script>
    @vite(['resources/js/pages/kingDocs.js'])
</body>
</html>
