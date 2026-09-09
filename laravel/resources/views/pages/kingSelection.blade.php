<!DOCTYPE html>
<html lang="pt-BR">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <base href="/">
  <title>King Selection — Seleção de Fotos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
  <style>
    :root {
      --ks-accent: #facc15;
      --ks-selected: #22c55e;
      --ks-remove: #ef4444;
      --ks-bg: #0a0a0a;
      --ks-card: rgba(18, 18, 18, .96);
      --ks-line: rgba(255, 255, 255, .1);
      --ks-text: #f8fafc;
      --ks-muted: rgba(255, 255, 255, .45);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: var(--ks-bg);
      color: var(--ks-text);
      min-height: 100vh;
      -webkit-tap-highlight-color: transparent;
    }

    .ks-header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: linear-gradient(180deg, rgba(0, 0, 0, .95) 0%, rgba(0, 0, 0, .88) 100%);
      border-bottom: 1px solid var(--ks-line);
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
      backdrop-filter: blur(12px);
    }

    .ks-title {
      font-weight: 800;
      font-size: 13px;
      letter-spacing: .18em;
      text-transform: uppercase;
      color: var(--ks-text);
    }

    .ks-sub {
      font-size: 12px;
      color: var(--ks-muted);
      margin-top: 2px;
    }

    .ks-selected-count {
      font-weight: 800;
      color: var(--ks-selected);
      font-size: 14px;
    }

    .ks-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 11px 20px;
      border-radius: 14px;
      font-weight: 800;
      font-size: 13px;
      border: 1px solid var(--ks-line);
      background: rgba(255, 255, 255, .06);
      color: var(--ks-text);
      cursor: pointer;
      transition: all .2s;
      touch-action: manipulation;
    }

    .ks-btn:hover {
      background: rgba(255, 255, 255, .1);
    }

    .ks-btn-primary {
      background: var(--ks-accent);
      color: #000;
      border-color: var(--ks-accent);
    }

    .ks-btn-primary:hover {
      filter: brightness(1.1);
      box-shadow: 0 4px 20px rgba(250, 204, 21, .25);
    }

    .ks-btn:disabled {
      opacity: .7;
      cursor: not-allowed;
    }

    .ks-btn-green {
      background: var(--ks-selected);
      color: #fff;
      border-color: var(--ks-selected);
    }

    .ks-btn-green:hover {
      filter: brightness(1.1);
      box-shadow: 0 4px 20px rgba(34, 197, 94, .3);
    }

    .ks-btn-red {
      background: var(--ks-remove);
      color: #fff;
      border-color: var(--ks-remove);
    }

    .ks-btn-red:hover {
      filter: brightness(1.1);
      box-shadow: 0 4px 20px rgba(239, 68, 68, .3);
    }

    .ks-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      padding: 20px;
    }

    @media (min-width: 640px) {
      .ks-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        padding: 24px;
      }
    }

    @media (min-width: 960px) {
      .ks-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
        padding: 28px;
      }
    }

    .ks-tile {
      position: relative;
      aspect-ratio: 3/4;
      min-height: 200px;
      border-radius: 14px;
      overflow: hidden;
      border: 2px solid var(--ks-line);
      background: var(--ks-card);
      transition: all .2s;
      display: flex;
      flex-direction: column;
    }

    .ks-tile:hover {
      border-color: rgba(255, 255, 255, .25);
      box-shadow: 0 8px 32px rgba(0, 0, 0, .4);
    }

    .ks-tile.sel {
      border-color: var(--ks-selected);
      box-shadow: 0 0 0 3px rgba(34, 197, 94, .25), 0 8px 32px rgba(0, 0, 0, .4);
    }

    .ks-tile-media {
      flex: 1;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
    }

    .ks-tile img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
    }

    .ks-tile .check {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--ks-selected);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 18px;
      box-shadow: 0 4px 12px rgba(34, 197, 94, .4);
      z-index: 5;
    }

    .ks-tile:not(.sel) .check {
      display: none;
    }

    .ks-tile-actions {
      flex-shrink: 0;
      padding: 10px 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      border-top: 1px solid var(--ks-line);
      background: rgba(0, 0, 0, .3);
    }

    .ks-tile-actions .ks-btn {
      flex: 1;
      justify-content: center;
      padding: 10px 14px;
      font-size: 12px;
      min-width: 0;
    }

    .ks-tile-dl-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;
      padding: 8px 12px;
      margin: -4px 0;
      border-radius: 8px;
      background: rgba(255, 255, 255, .06);
      width: 100%;
      justify-content: center;
      flex: 1 1 100%;
      order: 10;
    }

    .ks-tile-dl-wrap:hover {
      background: rgba(255, 255, 255, .1);
    }

    .ks-tile-dl-cb {
      width: 20px;
      height: 20px;
      cursor: pointer;
      flex-shrink: 0;
      accent-color: var(--ks-accent);
    }

    .ks-tile-dl-wrap span {
      font-weight: 600;
      color: var(--ks-text);
    }

    .ks-login-wrap {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .ks-login {
      width: 100%;
      max-width: 440px;
      padding: 32px 28px;
      background: var(--ks-card);
      border-radius: 24px;
      border: 1px solid var(--ks-line);
      box-shadow: 0 32px 80px rgba(0, 0, 0, .6), 0 0 0 1px rgba(255, 255, 255, .03);
    }

    .ks-login-logo {
      width: 72px;
      height: 72px;
      margin: 0 auto 24px;
      border-radius: 16px;
      overflow: hidden;
      background: rgba(255, 255, 255, .06);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ks-login-logo img {
      width: 56px;
      height: 56px;
      object-fit: contain;
    }

    .ks-login h2 {
      margin-bottom: 8px;
      font-size: 22px;
      font-weight: 800;
      text-align: center;
      letter-spacing: -.02em;
    }

    .ks-login-sub {
      font-size: 14px;
      color: var(--ks-muted);
      text-align: center;
      margin-bottom: 28px;
    }

    .ks-login-err {
      background: rgba(239, 68, 68, .15);
      border: 1px solid rgba(239, 68, 68, .35);
      color: #fecaca;
      padding: 12px 14px;
      border-radius: 12px;
      margin-bottom: 18px;
      font-size: 14px;
      display: none;
    }

    .ks-login-err.show {
      display: block;
    }

    .ks-field {
      margin-bottom: 18px;
    }

    .ks-field label {
      display: block;
      font-size: 12px;
      margin-bottom: 8px;
      color: var(--ks-muted);
      font-weight: 600;
    }

    .ks-field input {
      width: 100%;
      padding: 14px 16px;
      border-radius: 12px;
      border: 1px solid var(--ks-line);
      background: rgba(255, 255, 255, .04);
      color: var(--ks-text);
      font-size: 16px;
      transition: border-color .2s, box-shadow .2s;
    }

    .ks-field input:focus {
      outline: none;
      border-color: var(--ks-accent);
      box-shadow: 0 0 0 3px rgba(250, 204, 21, .15);
    }

    .ks-field input::placeholder {
      color: var(--ks-muted);
      opacity: .8;
    }

    .ks-login-hint {
      margin-top: 18px;
      font-size: 12px;
      color: var(--ks-muted);
      text-align: center;
    }

    .ks-loading {
      text-align: center;
      padding: 48px;
      color: var(--ks-muted);
      font-size: 15px;
    }

    .ks-confirm {
      padding: 20px;
      max-width: 960px;
      margin: 0 auto;
    }

    .ks-confirm-head {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .ks-confirm-title {
      font-size: 18px;
      font-weight: 800;
      margin: 0;
    }

    .ks-confirm-intro {
      color: var(--ks-muted);
      margin-bottom: 16px;
      font-size: 14px;
    }

    .ks-confirm-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 10px;
      max-height: 300px;
      overflow-y: auto;
    }

    .ks-confirm-grid .ks-tile {
      aspect-ratio: 1;
      min-height: auto;
      border-radius: 10px;
      overflow: hidden;
      cursor: default;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ks-confirm-grid .ks-tile img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .ks-input {
      width: 100%;
      padding: 14px;
      border-radius: 12px;
      border: 1px solid var(--ks-line);
      background: rgba(255, 255, 255, .04);
      color: var(--ks-text);
      font-size: 16px;
      resize: vertical;
      font-family: inherit;
    }

    .ks-input:focus {
      outline: none;
      border-color: var(--ks-accent);
    }

    .ks-tile.locked {
      cursor: default;
      opacity: .85;
    }

    .ks-tile.locked:hover {
      border-color: var(--ks-line);
    }

    .ks-modal-select-disabled {
      opacity: .5;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* Comparar e ajustar seleção */
    .ks-compare-wrap {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .ks-compare-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 14px;
      margin-bottom: 24px;
    }

    .ks-compare-title {
      font-size: 18px;
      font-weight: 800;
    }

    .ks-compare-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 14px;
      margin-bottom: 14px;
    }

    /* Quadradinho "Selecionar mais fotos" — estilo foto, verde, ao lado da última */
    .ks-compare-add-more,
    .ks-confirm-add-more {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #16a34a;
      color: #fff;
      border: 2px solid rgba(255,255,255,.2);
      border-radius: 12px;
      cursor: pointer;
      transition: background .2s, transform .15s, box-shadow .2s;
      min-height: 0;
      padding: 12px;
    }

    .ks-compare-add-more:hover,
    .ks-confirm-add-more:hover {
      background: #15803d;
      transform: scale(1.02);
      box-shadow: 0 4px 16px rgba(22, 163, 74, .4);
    }

    .ks-compare-add-more {
      aspect-ratio: 3/4;
      background: #16a34a !important;
      border-color: rgba(255,255,255,.25) !important;
    }

    .ks-compare-add-more:hover {
      background: #15803d !important;
      border-color: rgba(255,255,255,.4) !important;
      box-shadow: 0 4px 16px rgba(22, 163, 74, .4);
    }

    .ks-confirm-add-more {
      aspect-ratio: 1;
    }

    .ks-add-more-icon {
      font-size: 28px;
      line-height: 1;
      opacity: .95;
    }

    .ks-add-more-label {
      font-size: 11px;
      font-weight: 600;
      text-align: center;
      line-height: 1.2;
      text-transform: uppercase;
      letter-spacing: .02em;
    }

    /* Tela de obrigado (overlay após enviar seleção) — visual mais impactante */
    .ks-thank-you-wrap {
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: linear-gradient(160deg, #0a0a0f 0%, #111 40%, #0d0d12 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }

    .ks-thank-you-wrap.hidden {
      display: none;
    }

    .ks-thank-you-card {
      background: linear-gradient(180deg, rgba(255,255,255,.06) 0%, rgba(255,255,255,.02) 100%);
      border: 1px solid rgba(250, 204, 21, .2);
      border-radius: 24px;
      padding: 48px 40px 56px;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 24px 64px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.06);
    }

    .ks-thank-you-wrap img.ks-thank-you-img {
      max-width: 220px;
      max-height: 140px;
      object-fit: contain;
      margin: 0 auto 28px;
      display: block;
      border-radius: 12px;
    }

    .ks-thank-you-wrap .ks-thank-you-title {
      font-size: 28px;
      font-weight: 800;
      margin: 0 0 20px;
      color: #fff;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .ks-thank-you-wrap .ks-thank-you-title .ks-thank-you-accent {
      color: var(--ks-accent);
    }

    .ks-thank-you-wrap .ks-thank-you-message {
      font-size: 16px;
      color: rgba(255,255,255,.88);
      white-space: pre-line;
      max-width: 100%;
      margin: 0 0 28px;
      line-height: 1.6;
    }

    .ks-thank-you-wrap .ks-thank-you-signature {
      padding-top: 24px;
      border-top: 1px solid rgba(255,255,255,.12);
    }

    .ks-thank-you-wrap .ks-thank-you-name {
      font-size: 22px;
      font-weight: 800;
      color: var(--ks-accent);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin: 0;
      line-height: 1.3;
    }

    .ks-thank-you-wrap .ks-thank-you-name-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: rgba(255,255,255,.5);
      margin: 0 0 6px;
    }

    .ks-compare-tile {
      position: relative;
      aspect-ratio: 3/4;
      border-radius: 12px;
      overflow: hidden;
      border: 2px solid var(--ks-line);
      background: var(--ks-card);
      cursor: pointer;
      transition: border-color .2s, box-shadow .2s;
    }

    .ks-compare-tile:hover {
      border-color: var(--ks-accent);
      box-shadow: 0 0 0 2px rgba(250, 204, 21, .25);
    }

    .ks-compare-tile.ks-compare-tile-in-panel-a {
      box-shadow: 0 0 0 3px var(--ks-accent);
    }

    .ks-compare-tile.ks-compare-tile-in-panel-b {
      box-shadow: 0 0 0 3px var(--ks-selected);
    }

    .ks-compare-tile .ks-compare-tile-badge {
      position: absolute;
      bottom: 36px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      font-size: 11px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      pointer-events: none;
      box-shadow: 0 1px 6px rgba(0, 0, 0, .5);
    }

    .ks-compare-tile .ks-compare-tile-badge-a {
      left: 6px;
      background: var(--ks-accent);
      color: #000;
    }

    .ks-compare-tile .ks-compare-tile-badge-b {
      right: 6px;
      left: auto;
      background: var(--ks-selected);
      color: #fff;
    }

    .ks-compare-tile img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      pointer-events: none;
    }

    .ks-compare-tile .ks-compare-remove {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 10px;
      background: linear-gradient(transparent, rgba(0, 0, 0, .9));
      display: flex;
      justify-content: center;
    }

    .ks-compare-tile .ks-compare-remove .ks-btn {
      font-size: 11px;
      padding: 8px 14px;
      pointer-events: auto;
    }

    .ks-compare-tile .ks-compare-click-hint {
      position: absolute;
      top: 6px;
      left: 50%;
      transform: translateX(-50%);
      padding: 4px 10px;
      border-radius: 8px;
      background: rgba(0, 0, 0, .75);
      font-size: 11px;
      color: var(--ks-accent);
      white-space: nowrap;
      opacity: 0;
      transition: opacity .2s;
      pointer-events: none;
    }

    .ks-compare-tile:hover .ks-compare-click-hint {
      opacity: 1;
    }

    .ks-compare-expand-ab-top {
      text-align: center;
      margin-bottom: 12px;
    }

    .ks-compare-expand-ab-top .ks-btn {
      padding: 10px 20px;
      font-size: 13px;
    }

    .ks-compare-sidebyside {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 24px;
      min-height: 320px;
    }

    @media (max-width: 640px) {
      .ks-compare-sidebyside {
        grid-template-columns: 1fr;
      }
    }

    .ks-compare-panel {
      border: 2px solid var(--ks-line);
      border-radius: 14px;
      overflow: hidden;
      background: var(--ks-card);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 280px;
      position: relative;
    }

    .ks-compare-panel.has-photo {
      border-color: rgba(250, 204, 21, .4);
    }

    .ks-compare-panel.photo-b.has-photo {
      border-color: rgba(34, 197, 94, .4);
    }

    .ks-compare-panel .ks-compare-placeholder {
      font-size: 14px;
      color: var(--ks-muted);
      text-align: center;
      padding: 20px;
    }

    .ks-compare-panel img {
      max-width: 100%;
      max-height: min(75vh, 520px);
      width: auto;
      height: auto;
      object-fit: contain;
      object-position: center center;
      display: block;
    }

    .ks-compare-panel .ks-compare-label {
      padding: 10px;
      font-size: 12px;
      color: var(--ks-muted);
    }

    .ks-compare-panel .ks-compare-pick {
      margin-top: 8px;
      font-size: 12px;
      color: var(--ks-muted);
    }

    /* Trocar Foto A/B: fundo claro e texto preto para os nomes ficarem sempre legíveis no dropdown */
    .ks-compare-panel .ks-compare-pick select {
      width: 100%;
      min-width: 220px;
      max-width: 100%;
      padding: 8px 12px;
      font-size: 13px;
      box-sizing: border-box;
      color: #1a1a1a;
      background: #ffffff;
      border: 1px solid #ccc;
    }

    .ks-compare-panel .ks-compare-pick select option {
      color: #1a1a1a;
      background: #ffffff;
      white-space: normal;
      padding: 6px 8px;
    }

    .ks-compare-panel .ks-compare-pick select:focus {
      border-color: var(--ks-accent);
      outline: none;
    }

    /* Filtro Ordenar: texto preto e fundo claro para legibilidade */
    #ks-grid-sort {
      color: #1a1a1a !important;
      background: #ffffff !important;
      border: 1px solid #ccc;
    }

    #ks-grid-sort option {
      color: #1a1a1a;
      background: #ffffff;
    }

    .ks-compare-panel-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 8px;
      flex-wrap: wrap;
    }

    .ks-compare-panel-nav .ks-btn {
      padding: 8px 14px;
      font-size: 12px;
    }

    .ks-compare-panel-expand {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 5;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, .3);
      background: rgba(0, 0, 0, .6);
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: background .2s, transform .2s;
    }

    .ks-compare-panel-expand:hover {
      background: rgba(250, 204, 21, .9);
      color: #000;
      transform: scale(1.08);
    }

    .ks-compare-tile-expand {
      position: absolute;
      top: 6px;
      left: 6px;
      z-index: 6;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, .4);
      background: rgba(0, 0, 0, .6);
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      opacity: 0;
      transition: opacity .2s, background .2s;
      pointer-events: auto;
    }

    .ks-compare-tile:hover .ks-compare-tile-expand {
      opacity: 1;
    }

    .ks-compare-tile-expand:hover {
      background: var(--ks-accent);
      color: #000;
    }

    .ks-compare-tile-expand-ab {
      position: absolute;
      top: 6px;
      right: 6px;
      z-index: 9;
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, .4);
      background: rgba(0, 0, 0, .85);
      color: var(--ks-accent);
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      opacity: 0;
      transition: opacity .2s, background .2s;
      pointer-events: auto;
      white-space: nowrap;
    }

    .ks-compare-tile:hover .ks-compare-tile-expand-ab {
      opacity: 1;
    }

    .ks-compare-tile.ks-compare-tile-in-panel-a .ks-compare-tile-expand-ab,
    .ks-compare-tile.ks-compare-tile-in-panel-b .ks-compare-tile-expand-ab {
      opacity: 1;
    }

    .ks-compare-tile-expand-ab:hover {
      background: var(--ks-accent);
      color: #000;
    }

    .ks-compare-tile-badge.ks-hidden,
    .ks-compare-tile-expand-ab.ks-hidden {
      display: none !important;
    }

    .ks-compare-hint {
      font-size: 13px;
      color: var(--ks-accent);
      margin-bottom: 12px;
      font-weight: 600;
    }

    .ks-err {
      background: rgba(239, 68, 68, .12);
      border: 1px solid rgba(239, 68, 68, .35);
      color: #fecaca;
      padding: 14px 18px;
      border-radius: 12px;
      margin: 16px 20px;
      font-size: 14px;
    }

    .hidden {
      display: none !important;
    }

    /* Modal viewer - TELA CHEIA (mobile-safe, safe-area) */
    .ks-modal {
      position: fixed;
      inset: 0;
      padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
      z-index: 9999;
      background: #000;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      -webkit-overflow-scrolling: touch;
    }

    .ks-modal.hidden {
      display: none !important;
    }

    body.ks-modal-open {
      overflow: hidden;
      position: fixed;
      width: 100%;
      height: 100%;
      left: 0;
      top: 0;
    }

    .ks-modal-inner {
      width: 100%;
      height: 100%;
      max-width: 100vw;
      max-height: 100vh;
      height: -webkit-fill-available;
      background: #000;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .ks-modal-head {
      flex-shrink: 0;
      padding: 14px 18px;
      border-bottom: 1px solid var(--ks-line);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      touch-action: manipulation;
    }

    .ks-modal-meta {
      font-size: 12px;
      color: var(--ks-muted);
    }

    .ks-modal-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 800;
    }

    .ks-modal-badge.sel {
      background: rgba(34, 197, 94, .2);
      color: var(--ks-selected);
      border: 1px solid rgba(34, 197, 94, .4);
    }

    /* Área da foto: altura fixa no mobile para evitar tela preta */
    .ks-modal-body {
      position: relative;
      flex: 1;
      min-height: 180px;
      min-height: 50vmin;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #111;
      touch-action: none;
      overflow: hidden;
    }

    @supports (min-height: 100dvh) {
      .ks-modal-body {
        min-height: 40dvh;
      }
    }

    .ks-modal-body.selected {
      box-shadow: inset 0 0 0 4px var(--ks-selected);
    }

    .ks-modal-loading {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, .5);
      font-size: 14px;
    }

    .ks-modal-loading.hidden {
      display: none !important;
    }

    .ks-nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: rgba(0, 0, 0, .75);
      color: #fff;
      border: 2px solid rgba(255, 255, 255, .3);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 20;
      transition: all .15s;
      font-size: 22px;
    }

    .ks-nav-btn:hover {
      background: rgba(0, 0, 0, .95);
      transform: translateY(-50%) scale(1.08);
    }

    .ks-nav-btn:disabled {
      opacity: .3;
      cursor: not-allowed;
    }

    .ks-nav-prev {
      left: 8px;
    }

    .ks-nav-next {
      right: 8px;
    }

    .ks-modal-img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      min-width: 1px;
      min-height: 1px;
      object-fit: contain;
      display: block;
      touch-action: none;
      user-select: none;
      pointer-events: none;
      -webkit-user-select: none;
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
      backface-visibility: hidden;
    }

    .ks-modal-foot {
      flex-shrink: 0;
      padding: 14px 18px;
      border-top: 1px solid var(--ks-line);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .ks-modal-foot .ks-btn {
      flex: 1;
      min-width: 160px;
      justify-content: center;
    }

    /* Modal A+B: controles na barra preta em cima; área da foto limpa */
    .ks-modal-ab {
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: #000;
      display: flex;
      flex-direction: column;
      padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    }

    .ks-modal-ab.hidden {
      display: none !important;
    }

    .ks-modal-ab .ks-modal-ab-head {
      flex-shrink: 0;
      padding: 12px 16px;
      border-bottom: 1px solid var(--ks-line);
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: 16px;
      align-items: center;
    }

    .ks-modal-ab .ks-modal-ab-head-col {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .ks-modal-ab .ks-modal-ab-head-col .ks-modal-ab-label {
      font-size: 13px;
      font-weight: 700;
      margin: 0;
    }

    .ks-modal-ab .ks-modal-ab-head-col-a .ks-modal-ab-label {
      color: var(--ks-accent);
    }

    .ks-modal-ab .ks-modal-ab-head-col-b .ks-modal-ab-label {
      color: var(--ks-selected);
    }

    .ks-modal-ab .ks-modal-ab-head-col .ks-btn {
      padding: 8px 12px;
      font-size: 12px;
    }

    .ks-modal-ab .ks-modal-ab-head-col .ks-btn.ks-zoom-mode-active {
      background: var(--ks-accent);
      color: #000;
      border-color: var(--ks-accent);
    }

    .ks-modal-ab .ks-modal-ab-body {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      min-height: 0;
      overflow: hidden;
    }

    .ks-modal-ab .ks-modal-ab-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 0;
      padding: 12px;
      background: #0a0a0a;
    }

    .ks-modal-ab .ks-modal-ab-col:first-child {
      border-right: 1px solid var(--ks-line);
    }

    .ks-modal-ab .ks-modal-ab-col-inner {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      min-height: 0;
      width: 100%;
    }

    .ks-modal-ab .ks-modal-ab-nav-side {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(0, 0, 0, .75);
      color: #fff;
      border: 2px solid rgba(255, 255, 255, .25);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10;
      font-size: 18px;
      transition: all .15s;
    }

    .ks-modal-ab .ks-modal-ab-nav-side:hover {
      background: rgba(255, 255, 255, .2);
    }

    .ks-modal-ab .ks-modal-ab-nav-side:disabled {
      opacity: .35;
      cursor: not-allowed;
    }

    .ks-modal-ab .ks-modal-ab-nav-side.nav-prev {
      left: 8px;
    }

    .ks-modal-ab .ks-modal-ab-nav-side.nav-next {
      right: 8px;
    }

    .ks-modal-ab .ks-modal-ab-zoom-wrap {
      flex: 1;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      align-self: stretch;
      cursor: zoom-in;
      user-select: none;
      -webkit-user-select: none;
    }

    .ks-modal-ab .ks-modal-ab-zoom-wrap.zoomed {
      cursor: grab;
    }

    .ks-modal-ab .ks-modal-ab-zoom-wrap.zoomed.panning {
      cursor: grabbing;
    }

    .ks-modal-ab .ks-modal-ab-zoom-wrap.zoomed:active {
      cursor: grabbing;
    }

    .ks-modal-ab .ks-modal-ab-zoom-wrap img {
      max-width: 100%;
      max-height: 85vh;
      width: auto;
      height: auto;
      display: block;
      object-fit: contain;
      object-position: center center;
      transition: transform .2s ease;
      transform-origin: center center;
    }

    .ks-modal-ab .ks-modal-ab-zoom-btns {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .ks-modal-ab .ks-modal-ab-zoom-reset {
      padding: 0 10px;
      font-size: 11px;
      min-width: 60px;
    }

    .ks-modal-ab .ks-modal-ab-zoom-reset-overlay {
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 15;
      padding: 10px 20px;
      border-radius: 12px;
      background: rgba(0, 0, 0, .85);
      color: var(--ks-accent);
      border: 1px solid var(--ks-accent);
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: none;
      transition: all .2s;
    }

    .ks-modal-ab .ks-modal-ab-zoom-wrap.zoomed .ks-modal-ab-zoom-reset-overlay {
      display: block;
    }

    .ks-modal-ab .ks-modal-ab-zoom-reset-overlay:hover {
      background: var(--ks-accent);
      color: #000;
    }

    .ks-modal-ab .ks-modal-ab-zoom-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid var(--ks-line);
      background: rgba(255, 255, 255, .08);
      color: var(--ks-text);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
      transition: all .15s;
    }

    .ks-modal-ab .ks-modal-ab-zoom-btn:hover {
      background: var(--ks-accent);
      color: #000;
      border-color: var(--ks-accent);
    }

    @media (max-width: 640px) {
      .ks-modal-ab .ks-modal-ab-body {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr 1fr;
      }

      .ks-modal-ab .ks-modal-ab-col:first-child {
        border-right: none;
        border-bottom: 1px solid var(--ks-line);
      }

      .ks-modal-ab .ks-modal-ab-head {
        grid-template-columns: 1fr;
        grid-template-rows: auto auto auto;
      }
    }

    /* Reconhecimento Facial */
    .ks-face-modal {
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: rgba(0, 0, 0, .9);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .ks-face-modal.active {
      display: flex;
    }

    .ks-face-card {
      background: var(--ks-card);
      border: 1px solid var(--ks-line);
      border-radius: 24px;
      width: 100%;
      max-width: 500px;
      padding: 32px;
      box-shadow: 0 40px 100px rgba(0, 0, 0, .8);
      position: relative;
    }

    .ks-face-title {
      font-size: 20px;
      font-weight: 800;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .ks-face-sub {
      font-size: 14px;
      color: var(--ks-muted);
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .ks-face-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }

    .ks-face-opt {
      background: rgba(255, 255, 255, .04);
      border: 1px solid var(--ks-line);
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      cursor: pointer;
      transition: all .2s;
    }

    .ks-face-opt:hover {
      background: rgba(255, 255, 255, .08);
      border-color: var(--ks-accent);
    }

    .ks-face-opt i {
      font-size: 24px;
      margin-bottom: 12px;
      display: block;
      color: var(--ks-accent);
    }

    .ks-face-opt span {
      font-size: 13px;
      font-weight: 700;
    }

    .ks-face-camera-box {
      border-radius: 20px;
      overflow: hidden;
      background: #000;
      margin-bottom: 20px;
      aspect-ratio: 4/3;
      position: relative;
    }

    .ks-face-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .ks-face-status {
      margin-top: 16px;
      padding: 12px;
      border-radius: 12px;
      font-size: 13px;
      text-align: center;
    }

    .ks-face-status.loading {
      background: rgba(250, 204, 21, .1);
      color: var(--ks-accent);
      border: 1px solid rgba(250, 204, 21, .2);
    }

    .ks-face-status.success {
      background: rgba(34, 197, 94, .1);
      color: var(--ks-selected);
      border: 1px solid rgba(34, 197, 94, .2);
    }

    .ks-face-status.error {
      background: rgba(239, 68, 68, .1);
      color: var(--ks-remove);
      border: 1px solid rgba(239, 68, 68, .2);
    }

    .ks-face-active-badge {
      background: var(--ks-accent);
      color: #000;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 800;
      margin-left: 8px;
    }

    .ks-face-close {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      color: var(--ks-muted);
      font-size: 20px;
      cursor: pointer;
    }

    .ks-face-close:hover {
      color: #fff;
    }
  </style>
</head>

<body>
  <div id="ks-login-wrap" class="ks-login-wrap hidden">
    <div class="ks-login">
      <form id="ks-login-form" style="display:contents"
        onsubmit="event.preventDefault(); document.getElementById('ks-login-btn')?.click(); return false;"
        action="javascript:void(0)">
        <div class="ks-login-logo">
          <img src="https://i.ibb.co/60sW9k75/logo.png" alt="Conecta King">
        </div>
        <h2>King Selection</h2>
        <p class="ks-login-sub">Entre com seu e-mail e senha para acessar a galeria</p>
        <div id="ks-login-err" class="ks-login-err"></div>
        <div class="ks-field">
          <label>E-mail</label>
          <input type="email" id="ks-email" placeholder="seu@email.com" autocomplete="email">
        </div>
        <div class="ks-field">
          <label>Senha</label>
          <input type="password" id="ks-senha" placeholder="——————" autocomplete="current-password">
        </div>
        <button type="button" class="ks-btn ks-btn-primary" id="ks-login-btn"
          style="width:100%;justify-content:center;padding:14px">
          <span id="ks-login-btn-text"><i class="fas fa-sign-in-alt"></i> Entrar</span>
          <span id="ks-login-btn-loading" class="hidden"><i class="fas fa-circle-notch fa-spin"></i> Entrando—</span>
        </button>
        <p class="ks-login-hint">Use o e-mail e a senha enviados pelo fotógrafo</p>
        <p id="ks-login-register-wrap" class="ks-login-register hidden" style="margin-top:16px;text-align:center"><a
            href="#" id="ks-login-register" style="color:var(--ks-accent);font-weight:700;text-decoration:none">Não tem
            acesso? Cadastre-se aqui</a></p>
      </form>
    </div>
  </div>

  <div id="ks-app" class="hidden">
    <header class="ks-header">
      <div>
        <div class="ks-title">KINGSELECTION</div>
        <div class="ks-sub" id="ks-project-name">—</div>
      </div>
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <label class="ks-sort-label" style="font-size:12px;color:var(--ks-muted);margin-right:4px;">Ordenar:</label>
        <select id="ks-grid-sort" class="ks-input" style="width:auto;padding:8px 12px;font-size:12px;min-width:160px;"
          title="Ordem das fotos na grade">
          <option value="sequence">Sequência (original)</option>
          <option value="name">Nome (A—Z)</option>
          <option value="number">Número</option>
        </select>
        <span id="ks-gallery-count" style="font-size:12px;color:var(--ks-muted);margin-right:8px;" title="Total e filtro da galeria"></span>
        <span class="ks-selected-count" id="ks-sel-count">SELECIONADAS 0</span>
        <span id="ks-locked-msg" class="hidden" style="font-size:12px;color:var(--ks-muted)">Solicite reativação ao
          fotógrafo para alterar. Se ele já reativou, atualize a página (F5).</span>
        <button type="button" class="ks-btn" id="ks-btn-compare" title="Comparar fotos e remover da seleção"><i
            class="fas fa-columns"></i> COMPARAR E AJUSTAR</button>
        <button type="button" class="ks-btn" id="ks-face-btn" style="display:none"
          title="Filtrar fotos pelo seu rosto"><i class="fas fa-face-smile"></i> BUSCAR POR ROSTO</button>
        <button type="button" class="ks-btn ks-btn-red" id="ks-limpar-sel" title="Desmarcar todas as fotos"><i
            class="fas fa-eraser"></i> LIMPAR SELE—fO</button>
        <button type="button" class="ks-btn ks-btn-primary" id="ks-avancar"><i class="fas fa-arrow-right"></i>
          AVAN?AR</button>
        <button type="button" class="ks-btn ks-btn-primary" id="ks-header-confirm-send" style="display:none"><i
            class="fas fa-paper-plane"></i> CONFIRMAR E ENVIAR</button>
        <button type="button" class="ks-btn" id="ks-sair" title="Voltar para o login"><i
            class="fas fa-sign-out-alt"></i> Sair</button>
      </div>
      <div id="ks-download-bar" class="hidden"
        style="margin-top:12px;padding-top:12px;border-top:1px solid var(--ks-border);display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <span id="ks-download-count" style="font-size:14px;color:var(--ks-text)"><strong id="ks-download-num">0</strong>
          foto(s) para download</span>
        <button type="button" class="ks-btn" id="ks-download-select-all" style="font-size:12px"
          title="Marcar todas as fotos para download">Selecionar todas</button>
        <button type="button" class="ks-btn" id="ks-download-clear-all" style="font-size:12px"
          title="Desmarcar todas">Desmarcar todas</button>
        <button type="button" class="ks-btn ks-btn-primary" id="ks-download-selected"
          title="Baixar as fotos marcadas"><i class="fas fa-download"></i> Baixar selecionadas</button>
      </div>
    </header>

    <div id="ks-err" class="ks-err hidden"></div>
    <div id="ks-loading" class="ks-loading">Carregando galeria—</div>
    <div id="ks-grid" class="ks-grid hidden"></div>

    <!-- Comparar e ajustar seleção: ver selecionadas, comparar lado a lado, remover -->
    <div id="ks-compare-wrap" class="ks-compare-wrap hidden">
      <div class="ks-compare-head">
        <button type="button" class="ks-btn" id="ks-compare-back"><i class="fas fa-arrow-left"></i> Voltar</button>
        <h2 class="ks-compare-title">Comparar e ajustar seleção</h2>
      </div>
      <p class="ks-muted" style="margin-bottom:16px;font-size:14px">Revise suas fotos selecionadas. <strong>Clique em
          uma miniatura</strong> para colocar em Foto A; clique em outra para Foto B. Use as setas nos painéis para
        trocar a foto de cada lado. Remova as que não quiser (quando a galeria estiver liberada).</p>
      <div id="ks-compare-locked-msg" class="hidden"
        style="margin-bottom:16px;padding:12px;background:rgba(239,68,68,.1);border-radius:12px;font-size:13px;color:#fecaca">
        Solicite reativação ao fotógrafo para poder remover ou alterar fotos.</div>
      <p id="ks-compare-hint" class="ks-compare-hint">Clique em uma miniatura abaixo para colocar em <strong>Foto
          A</strong></p>
      <h3 style="font-size:14px;margin-bottom:12px;color:var(--ks-muted)">Comparar duas fotos</h3>
      <div id="ks-compare-expand-ab-top" class="ks-compare-expand-ab-top hidden">
        <button type="button" class="ks-btn ks-btn-primary" id="ks-compare-expand-ab-top-btn"
          title="Ampliar Foto A e Foto B juntas"><i class="fas fa-expand-alt"></i> Ampliar A e B juntas</button>
      </div>
      <div class="ks-compare-sidebyside">
        <div class="ks-compare-panel" id="ks-compare-panel-a">
          <span class="ks-compare-label">Foto A</span>
          <div class="ks-compare-placeholder" id="ks-compare-placeholder-a">Clique em uma miniatura para colocar aqui
          </div>
          <img id="ks-compare-img-a" src="" alt="" style="display:none">
          <button type="button" class="ks-compare-panel-expand" id="ks-compare-expand-a" title="Ampliar em tela cheia"
            style="display:none"><i class="fas fa-expand"></i></button>
          <div class="ks-compare-panel-nav" id="ks-compare-nav-a" style="display:none">
            <button type="button" class="ks-btn ks-compare-prev" data-panel="a" title="Foto anterior"><i
                class="fas fa-chevron-left"></i></button>
            <button type="button" class="ks-btn ks-compare-next" data-panel="a" title="Próxima foto"><i
                class="fas fa-chevron-right"></i></button>
          </div>
          <div class="ks-compare-pick" id="ks-compare-pick-a" style="margin-top:6px"></div>
          <div class="ks-compare-panel-remove" id="ks-compare-remove-wrap-a" style="display:none;margin-top:8px">
            <button type="button" class="ks-btn ks-btn-red" id="ks-compare-remove-panel-a"
              title="Remover esta foto da seleção"><i class="fas fa-times"></i> Remover da seleção</button>
          </div>
        </div>
        <div class="ks-compare-panel photo-b" id="ks-compare-panel-b">
          <span class="ks-compare-label">Foto B</span>
          <div class="ks-compare-placeholder" id="ks-compare-placeholder-b">Clique em outra miniatura para colocar aqui
          </div>
          <img id="ks-compare-img-b" src="" alt="" style="display:none">
          <button type="button" class="ks-compare-panel-expand" id="ks-compare-expand-b" title="Ampliar em tela cheia"
            style="display:none"><i class="fas fa-expand"></i></button>
          <div class="ks-compare-panel-nav" id="ks-compare-nav-b" style="display:none">
            <button type="button" class="ks-btn ks-compare-prev" data-panel="b" title="Foto anterior"><i
                class="fas fa-chevron-left"></i></button>
            <button type="button" class="ks-btn ks-compare-next" data-panel="b" title="Próxima foto"><i
                class="fas fa-chevron-right"></i></button>
          </div>
          <div class="ks-compare-pick" id="ks-compare-pick-b" style="margin-top:6px"></div>
          <div class="ks-compare-panel-remove" id="ks-compare-remove-wrap-b" style="display:none;margin-top:8px">
            <button type="button" class="ks-btn ks-btn-red" id="ks-compare-remove-panel-b"
              title="Remover esta foto da seleção"><i class="fas fa-times"></i> Remover da seleção</button>
          </div>
        </div>
      </div>
      <h3 style="font-size:14px;margin:24px 0 12px;color:var(--ks-muted)">Suas fotos selecionadas (<span
          id="ks-compare-count">0</span>) — <em>ajuste A e B juntas</em></h3>
      <div id="ks-compare-grid" class="ks-compare-grid"></div>
      <p style="margin-top:24px;margin-bottom:12px;font-size:14px;color:var(--ks-muted)">Revise as fotos acima. Remova
        as que não quiser (botão "Remover" em cada uma). Quando estiver satisfeito, use o botão <strong>Confirmar e
          enviar</strong> no topo da página (ao lado de Avançar) para seguir ao envio.</p>
    </div>

    <!-- Página de confirmação: fotos selecionadas + comentário -->
    <div id="ks-confirm" class="ks-confirm hidden">
      <div class="ks-confirm-head">
        <button type="button" class="ks-btn" id="ks-confirm-back"><i class="fas fa-arrow-left"></i> Voltar</button>
        <h2 class="ks-confirm-title">Confirmar seleção</h2>
      </div>
      <div class="ks-confirm-body">
        <p class="ks-confirm-intro">Revise as <strong id="ks-confirm-count">0</strong> fotos selecionadas e adicione uma
          mensagem (opcional):</p>
        <div id="ks-confirm-grid" class="ks-confirm-grid"></div>
        <div class="ks-field" style="margin-top:20px">
          <label>Mensagem ou observação (opcional)</label>
          <textarea id="ks-confirm-msg" class="ks-input" rows="4"
            placeholder="Ex.: Fotos para impressão 15x21, preferência por P&B..."></textarea>
        </div>
        <button type="button" class="ks-btn ks-btn-primary" id="ks-confirm-send"
          style="width:100%;justify-content:center;margin-top:20px;padding:14px"><i class="fas fa-paper-plane"></i>
          Confirmar e enviar seleção</button>
      </div>
    </div>

    <!-- Tela de obrigado (exibida após enviar seleção) -->
    <div id="ks-thank-you-wrap" class="ks-thank-you-wrap hidden">
      <div class="ks-thank-you-card">
        <img id="ks-thank-you-img" class="ks-thank-you-img" src="" alt="" style="display:none">
        <h1 id="ks-thank-you-title" class="ks-thank-you-title">Obrigado!</h1>
        <p id="ks-thank-you-message" class="ks-thank-you-message"></p>
        <div class="ks-thank-you-signature">
          <p class="ks-thank-you-name-label">Com carinho,</p>
          <p id="ks-thank-you-name" class="ks-thank-you-name"></p>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal viewer: setas uma de cada lado + swipe + selecionar imediato -->
  <div id="ks-modal" class="ks-modal hidden">
    <div class="ks-modal-inner">
      <div class="ks-modal-head">
        <div>
          <div id="ks-modal-title" class="ks-modal-meta">_foto.JPG</div>
          <div class="ks-modal-meta" id="ks-modal-meta">1/1</div>
          <span class="ks-modal-badge sel hidden" id="ks-modal-badge"><i class="fas fa-check"></i> Selecionada</span>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <button type="button" class="ks-btn" id="ks-modal-download" title="Baixar foto" style="display:none"><i
              class="fas fa-download"></i></button>
          <button type="button" class="ks-btn" id="ks-modal-select"><i class="fas fa-check"></i> SELECIONAR</button>
          <button type="button" class="ks-btn" id="ks-modal-close" title="Fechar"><i class="fas fa-times"></i></button>
        </div>
      </div>
      <div class="ks-modal-body" id="ks-modal-area">
        <div class="ks-modal-loading" id="ks-modal-loading"><i class="fas fa-spinner fa-spin"
            style="font-size:28px;margin-right:10px"></i> Carregando—</div>
        <button type="button" class="ks-nav-btn ks-nav-prev" id="ks-modal-prev" title="Anterior"><i
            class="fas fa-chevron-left"></i></button>
        <img id="ks-modal-img" class="ks-modal-img" src="" alt="foto" draggable="false">
        <button type="button" class="ks-nav-btn ks-nav-next" id="ks-modal-next" title="Próxima"><i
            class="fas fa-chevron-right"></i></button>
      </div>
    </div>
  </div>

  <!-- Modal A+B: controles na barra preta em cima; área da foto só a imagem -->
  <div id="ks-modal-ab" class="ks-modal-ab hidden">
    <div class="ks-modal-ab-head">
      <div class="ks-modal-ab-head-col ks-modal-ab-head-col-a">
        <span class="ks-modal-ab-label">Foto A</span>
        <div class="ks-modal-ab-zoom-btns" title="Zoom: roda do mouse ou botões">
          <button type="button" class="ks-modal-ab-zoom-btn" id="ks-modal-ab-zoom-out-a" title="Reduzir zoom"><i
              class="fas fa-search-minus"></i></button>
          <button type="button" class="ks-modal-ab-zoom-btn" id="ks-modal-ab-zoom-in-a" title="Aumentar zoom"><i
              class="fas fa-search-plus"></i></button>
          <button type="button" class="ks-modal-ab-zoom-btn ks-modal-ab-zoom-reset" id="ks-modal-ab-zoom-reset-a"
            title="Ajustar ao tamanho normal">Ajustar</button>
        </div>
        <div id="ks-modal-ab-remove-wrap-a">
          <button type="button" class="ks-btn ks-btn-red" id="ks-modal-ab-remove-a" title="Remover da seleção"><i
              class="fas fa-times"></i> Remover</button>
        </div>
      </div>
      <div class="ks-modal-ab-head-col ks-modal-ab-head-col-b">
        <span class="ks-modal-ab-label">Foto B</span>
        <div class="ks-modal-ab-zoom-btns" title="Zoom: roda do mouse ou botões">
          <button type="button" class="ks-modal-ab-zoom-btn" id="ks-modal-ab-zoom-out-b" title="Reduzir zoom"><i
              class="fas fa-search-minus"></i></button>
          <button type="button" class="ks-modal-ab-zoom-btn" id="ks-modal-ab-zoom-in-b" title="Aumentar zoom"><i
              class="fas fa-search-plus"></i></button>
          <button type="button" class="ks-modal-ab-zoom-btn ks-modal-ab-zoom-reset" id="ks-modal-ab-zoom-reset-b"
            title="Ajustar ao tamanho normal">Ajustar</button>
        </div>
        <div id="ks-modal-ab-remove-wrap-b">
          <button type="button" class="ks-btn ks-btn-red" id="ks-modal-ab-remove-b" title="Remover da seleção"><i
              class="fas fa-times"></i> Remover</button>
        </div>
      </div>
      <button type="button" class="ks-btn" id="ks-modal-ab-close" title="Fechar"><i class="fas fa-times"></i>
        Fechar</button>
    </div>
    <div class="ks-modal-ab-body">
      <div class="ks-modal-ab-col">
        <div class="ks-modal-ab-col-inner">
          <button type="button" class="ks-modal-ab-nav-side nav-prev" id="ks-modal-ab-prev-a" title="Foto anterior"><i
              class="fas fa-chevron-left"></i></button>
          <div class="ks-modal-ab-zoom-wrap" id="ks-modal-ab-zoom-wrap-a">
            <img id="ks-modal-ab-img-a" src="" alt="Foto A">
            <button type="button" class="ks-modal-ab-zoom-reset-overlay" id="ks-modal-ab-zoom-reset-overlay-a"
              title="Ajustar ao tamanho normal">Ajustar</button>
          </div>
          <button type="button" class="ks-modal-ab-nav-side nav-next" id="ks-modal-ab-next-a" title="Próxima foto"><i
              class="fas fa-chevron-right"></i></button>
        </div>
      </div>
      <div class="ks-modal-ab-col">
        <div class="ks-modal-ab-col-inner">
          <button type="button" class="ks-modal-ab-nav-side nav-prev" id="ks-modal-ab-prev-b" title="Foto anterior"><i
              class="fas fa-chevron-left"></i></button>
          <div class="ks-modal-ab-zoom-wrap" id="ks-modal-ab-zoom-wrap-b">
            <img id="ks-modal-ab-img-b" src="" alt="Foto B">
            <button type="button" class="ks-modal-ab-zoom-reset-overlay" id="ks-modal-ab-zoom-reset-overlay-b"
              title="Ajustar ao tamanho normal">Ajustar</button>
          </div>
          <button type="button" class="ks-modal-ab-nav-side nav-next" id="ks-modal-ab-next-b" title="Próxima foto"><i
              class="fas fa-chevron-right"></i></button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal Reconhecimento Facial -->
  <div id="ks-face-modal" class="ks-face-modal">
    <div class="ks-face-card">
      <button class="ks-face-close" id="ks-face-close"><i class="fas fa-times"></i></button>

      <!-- Passo 1: Escolha -->
      <div id="ks-face-step-setup">
        <div class="ks-face-title"><i class="fas fa-face-smile" style="color:var(--ks-accent)"></i> Buscar por Rosto
        </div>
        <p class="ks-face-sub">Para encontrar suas fotos rapidamente, precisamos cadastrar seu rosto. Escolha uma opção:
        </p>
        <div class="ks-face-options">
          <div class="ks-face-opt" id="ks-face-opt-camera">
            <i class="fas fa-camera"></i>
            <span>Usar Câmera</span>
          </div>
          <label class="ks-face-opt" style="margin:0">
            <input type="file" id="ks-face-upload" class="hidden" accept="image/*">
            <i class="fas fa-upload"></i>
            <span>Enviar Foto</span>
          </label>
        </div>
      </div>

      <!-- Passo 2: Câmera -->
      <div id="ks-face-step-camera" class="hidden">
        <div class="ks-face-title"><i class="fas fa-camera"></i> Capturar Rosto</div>
        <div class="ks-face-camera-box">
          <video id="ks-face-video" class="ks-face-video" autoplay playsinline muted></video>
        </div>
        <button type="button" class="ks-btn ks-btn-primary" id="ks-face-capture" style="width:100%"><i
            class="fas fa-circle"></i> CAPTURAR E CADASTRAR</button>
      </div>

      <!-- Passo 3: Ativo / Resultados (já tem rosto cadastrado) -->
      <div id="ks-face-step-active" class="hidden">
        <div class="ks-face-title"><i class="fas fa-check-circle" style="color:var(--ks-selected)"></i> BUSCAR POR ROSTO
        </div>
        <p class="ks-face-sub">Você já tem rosto cadastrado. Escolha uma opção:</p>
        <div style="display:flex;flex-direction:column;gap:12px">
          <button type="button" class="ks-btn ks-btn-primary" id="ks-face-apply-filter"
            style="width:100%;padding:16px"><i class="fas fa-filter"></i> FILTRAR MINHAS FOTOS</button>
          <label class="ks-btn" style="width:100%;text-align:center;cursor:pointer;margin:0;display:block">
            <input type="file" id="ks-face-search-another" class="hidden" accept="image/*">
            <i class="fas fa-search"></i> BUSCAR COM OUTRA FOTO <span style="font-size:11px;opacity:.9">(não cadastra de novo)</span>
          </label>
          <button type="button" class="ks-btn" id="ks-face-reset" style="width:100%;font-size:12px">Cadastrar outro rosto</button>
        </div>
      </div>

      <div id="ks-face-status" class="ks-face-status hidden"></div>
    </div>
  </div>

  <script src="config.js"></script>
  <script>
    (function () {
      // FOR?AR API DO RENDER (Hostinger não tem as rotas de KingSelection)
      const API = 'https://www.conectaking.com.br';
      const qs = new URLSearchParams(location.search || '');
      // Formato novo: kingSelection/eliseu | fallback: ?slug=eliseu
      const pathMatch = (location.pathname || '').match(/\/kingSelection\/([a-zA-Z0-9_-]+)\/?$/i);
      const slug = (pathMatch && pathMatch[1]) ? pathMatch[1] : (qs.get('slug') || '');

      let token = localStorage.getItem('ks_client_token_' + slug) || '';
      let gallery = null;
      let photos = [];
      let selectedIds = new Set();
      let viewerIndex = 0;
      let locked = false;
      let allowDownload = false;
      let allowSelfSignup = false;
      let isPublicGallery = false;
      let accessMode = '';
      let downloadSelectedIds = new Set();
      let facialFilterIds = null;

      const loginWrap = document.getElementById('ks-login-wrap');
      const loginEl = document.getElementById('ks-login');
      const appEl = document.getElementById('ks-app');
      const loginErr = document.getElementById('ks-login-err');
      const loginBtnText = document.getElementById('ks-login-btn-text');
      const loginBtnLoading = document.getElementById('ks-login-btn-loading');
      const errEl = document.getElementById('ks-err');
      const loadingEl = document.getElementById('ks-loading');
      const gridEl = document.getElementById('ks-grid');
      const modalEl = document.getElementById('ks-modal');
      const modalImg = document.getElementById('ks-modal-img');
      const modalTitle = document.getElementById('ks-modal-title');
      const modalMeta = document.getElementById('ks-modal-meta');
      const modalArea = document.getElementById('ks-modal-area');
      const modalPrev = document.getElementById('ks-modal-prev');
      const modalNext = document.getElementById('ks-modal-next');
      const modalSelect = document.getElementById('ks-modal-select');
      const modalDownload = document.getElementById('ks-modal-download');
      const modalBadge = document.getElementById('ks-modal-badge');
      const modalClose = document.getElementById('ks-modal-close');
      const confirmEl = document.getElementById('ks-confirm');
      const confirmGrid = document.getElementById('ks-confirm-grid');
      const confirmBack = document.getElementById('ks-confirm-back');
      const confirmMsg = document.getElementById('ks-confirm-msg');
      const confirmSend = document.getElementById('ks-confirm-send');
      const confirmCount = document.getElementById('ks-confirm-count');
      const modalLoading = document.getElementById('ks-modal-loading');
      const downloadBar = document.getElementById('ks-download-bar');
      const downloadCountEl = document.getElementById('ks-download-count');
      const downloadNumEl = document.getElementById('ks-download-num');
      const downloadSelectedBtn = document.getElementById('ks-download-selected');
      const downloadSelectAllBtn = document.getElementById('ks-download-select-all');
      const downloadClearAllBtn = document.getElementById('ks-download-clear-all');
      const selCountEl = document.getElementById('ks-sel-count');
      const projectNameEl = document.getElementById('ks-project-name');
      const avancarBtn = document.getElementById('ks-avancar');
      const lockedMsg = document.getElementById('ks-locked-msg');
      const btnCompare = document.getElementById('ks-btn-compare');
      const compareWrap = document.getElementById('ks-compare-wrap');
      const compareBack = document.getElementById('ks-compare-back');
      const compareGrid = document.getElementById('ks-compare-grid');
      const compareCount = document.getElementById('ks-compare-count');
      const compareLockedMsg = document.getElementById('ks-compare-locked-msg');
      const compareImgA = document.getElementById('ks-compare-img-a');
      const compareImgB = document.getElementById('ks-compare-img-b');
      const comparePickA = document.getElementById('ks-compare-pick-a');
      const comparePickB = document.getElementById('ks-compare-pick-b');
      const thankYouWrap = document.getElementById('ks-thank-you-wrap');
      const thankYouTitle = document.getElementById('ks-thank-you-title');
      const thankYouMessage = document.getElementById('ks-thank-you-message');
      const thankYouImg = document.getElementById('ks-thank-you-img');
      const thankYouName = document.getElementById('ks-thank-you-name');

      function showErr(msg) {
        if (errEl) { errEl.textContent = msg || ''; errEl.classList.toggle('hidden', !msg); }
      }

      const limparSelBtn = document.getElementById('ks-limpar-sel');
      function updateSelCount() {
        const n = selectedIds.size;
        const maxSelect = gallery?.min_selections != null ? parseInt(gallery.min_selections, 10) : null;
        // 0 = livre (ilimitado). Só mostra "X/Y" quando há limite > 0
        let txt = 'SELECIONADAS ' + n;
        if (maxSelect != null && maxSelect > 0) {
          txt += ' / ' + maxSelect;
        } else {
          txt += ' (livre)';
        }
        if (selCountEl) selCountEl.textContent = txt;
        if (limparSelBtn) limparSelBtn.disabled = locked || n === 0;
        if (btnCompare) {
          btnCompare.style.display = n > 0 ? '' : 'none';
          btnCompare.disabled = false;
        }
      }

      function previewUrl(photoId, thumb) {
        if (isPublicGallery) {
          const base = API + '/api/king-selection/public/photos/' + photoId + '/preview?slug=' + encodeURIComponent(slug);
          return thumb ? base + '&thumb=1' : base;
        }
        const base = API + '/api/king-selection/client/photos/' + photoId + '/preview?token=' + encodeURIComponent(token) + '&slug=' + encodeURIComponent(slug);
        return thumb ? base + '&thumb=1' : base;
      }

      const urlWithToken = (id, thumb) => previewUrl(id, thumb);

      const ERROR_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="%23334" width="200" height="200"/><text x="100" y="100" fill="%23999" text-anchor="middle" dominant-baseline="middle" font-size="12" font-family="sans-serif">Erro</text></svg>');
      if (typeof window !== 'undefined') window.__ksErrPh = ERROR_PLACEHOLDER;

      const _ksImgCache = new Map();
      const _KS_CACHE_MAX = 100;
      function pruneKsImgCache() {
        if (_ksImgCache.size <= _KS_CACHE_MAX) return;
        const keys = [..._ksImgCache.keys()].slice(0, 50);
        keys.forEach(k => { try { URL.revokeObjectURL(_ksImgCache.get(k)); } catch (_) { } _ksImgCache.delete(k); });
      }
      async function loadPhotoToImg(photoId, imgEl, opts) {
        if (!imgEl || !photoId) return;
        if (!token && !isPublicGallery) return;
        imgEl.dataset.expectedPhotoId = String(photoId);
        const thumb = opts && opts.thumb !== false;
        const url = urlWithToken(photoId, thumb);

        if (isPublicGallery) {
          imgEl.onload = function () {
            if (imgEl.dataset.expectedPhotoId !== String(photoId)) return;
            imgEl.style.display = 'block';
            imgEl.style.visibility = opts && opts.visibility === false ? '' : 'visible';
            if (opts && opts.onLoad) opts.onLoad();
          };
          imgEl.onerror = function () {
            if (imgEl.dataset.expectedPhotoId !== String(photoId)) return;
            imgEl.src = ERROR_PLACEHOLDER;
            imgEl.onerror = null;
            imgEl.style.display = 'block';
            imgEl.style.visibility = 'visible';
            if (opts && opts.onError) opts.onError();
          };
          imgEl.src = url;
          imgEl.style.display = 'block';
          imgEl.style.visibility = opts && opts.visibility === false ? '' : 'visible';
          return;
        }

        const cacheKey = photoId + (thumb ? ':t' : ':f');
        if (_ksImgCache.has(cacheKey)) {
          if (imgEl.dataset.expectedPhotoId !== String(photoId)) return;
          imgEl.src = _ksImgCache.get(cacheKey);
          imgEl.style.display = 'block';
          imgEl.style.visibility = opts && opts.visibility === false ? '' : 'visible';
          if (opts && opts.onLoad) opts.onLoad();
          return;
        }
        try {
          const res = await fetch(url, { method: 'GET', cache: 'no-store', mode: 'cors', credentials: 'omit' });
          if (imgEl.dataset.expectedPhotoId !== String(photoId)) return;
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const blob = await res.blob();
          if (!blob || blob.size === 0) throw new Error('Blob vazio');
          const obj = URL.createObjectURL(blob);
          _ksImgCache.set(cacheKey, obj);
          pruneKsImgCache();
          if (!imgEl.isConnected) { URL.revokeObjectURL(obj); _ksImgCache.delete(cacheKey); return; }
          if (imgEl.dataset.expectedPhotoId !== String(photoId)) { URL.revokeObjectURL(obj); _ksImgCache.delete(cacheKey); return; }
          imgEl.onload = function () {
            if (imgEl.dataset.expectedPhotoId !== String(photoId)) return;
            imgEl.style.display = 'block';
            imgEl.style.visibility = opts && opts.visibility === false ? '' : 'visible';
            if (opts && opts.onLoad) opts.onLoad();
          };
          imgEl.onerror = function () {
            if (imgEl.dataset.expectedPhotoId !== String(photoId)) return;
            try { URL.revokeObjectURL(obj); } catch (_) { }
            _ksImgCache.delete(cacheKey);
            imgEl.src = ERROR_PLACEHOLDER;
            imgEl.onerror = null;
            imgEl.style.display = 'block';
            imgEl.style.visibility = 'visible';
            if (opts && opts.onError) opts.onError();
          };
          imgEl.src = obj;
        } catch (e) {
          try { imgEl.src = urlWithToken(photoId, thumb); imgEl.onerror = function () { imgEl.src = ERROR_PLACEHOLDER; imgEl.onerror = null; }; } catch (_) {
            imgEl.src = ERROR_PLACEHOLDER;
          }
          imgEl.onload = function () { imgEl.style.display = 'block'; imgEl.style.visibility = 'visible'; if (opts && opts.onLoad) opts.onLoad(); };
          imgEl.onerror = function () { imgEl.src = ERROR_PLACEHOLDER; imgEl.onerror = null; imgEl.style.display = 'block'; imgEl.style.visibility = 'visible'; if (opts && opts.onError) opts.onError(); };
          imgEl.style.display = 'block';
          imgEl.style.visibility = opts && opts.visibility === false ? '' : 'visible';
        }
      }

      function loadPreview(photoId, imgEl, thumb) {
        if (!imgEl) return;
        if (!token && !isPublicGallery) return;
        loadPhotoToImg(photoId, imgEl, { thumb: thumb !== false });
      }

      function loadPanelImgDirect(photoId, imgEl) {
        if (!imgEl || !photoId) return;
        if (!token && !isPublicGallery) return;
        const url = urlWithToken(photoId, false);
        const show = function () { imgEl.style.display = 'block'; imgEl.style.visibility = 'visible'; };
        imgEl.onload = show;
        imgEl.onerror = function () {
          imgEl.src = ERROR_PLACEHOLDER;
          imgEl.onerror = null;
          show();
        };
        imgEl.src = url;
        show();
      }

      async function api(path, opts = {}) {
        const res = await fetch(API + path, {
          ...opts,
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, ...(opts.headers || {}) }
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) { token = ''; localStorage.removeItem('ks_client_token_' + slug); }
        return { ok: res.ok, data, status: res.status };
      }

      async function loadPublicGallery() {
        if (!slug) return false;
        loadingEl?.classList.remove('hidden');
        gridEl?.classList.add('hidden');
        showErr('');
        try {
          const r = await fetch(API + '/api/king-selection/public/gallery-content?slug=' + encodeURIComponent(slug));
          const data = await r.json().catch(() => ({}));
          if (!r.ok || !data.success) {
            showErr(data.message || 'Erro ao carregar galeria.');
            loadingEl?.classList.add('hidden');
            return false;
          }
          gallery = data.gallery;
          photos = Array.isArray(data.gallery?.photos) ? data.gallery.photos : [];
          selectedIds = new Set((data.selectedPhotoIds || []).map(id => parseInt(id, 10)).filter(Boolean));
          locked = !!data.gallery?.locked;
          allowDownload = !!data.gallery?.allow_download;
          downloadSelectedIds = new Set();
          if (projectNameEl) projectNameEl.textContent = gallery?.nome_projeto || slug;
          if (avancarBtn) avancarBtn.style.display = 'none';
          const faceBtn = document.getElementById('ks-face-btn');
          if (faceBtn) faceBtn.style.display = gallery?.face_recognition_enabled ? '' : 'none';
          if (lockedMsg) {
            lockedMsg.classList.remove('hidden');
            lockedMsg.textContent = 'Galeria pública — apenas visualização.';
          }
          if (downloadBar) downloadBar.classList.toggle('hidden', !allowDownload);
          updateDownloadCount();
          updateSelCount();
          renderGrid();
        } catch (e) {
          showErr('Erro ao carregar galeria.');
        }
        loadingEl?.classList.add('hidden');
        gridEl?.classList.remove('hidden');
        return true;
      }

      async function loadGallery() {
        if (!slug) { showErr('Link inválido. Informe o slug da galeria.'); return false; }
        if (!token) { loginWrap?.classList.remove('hidden'); appEl.classList.add('hidden'); return false; }
        loginWrap?.classList.add('hidden');
        appEl.classList.remove('hidden');
        loadingEl.classList.remove('hidden');
        gridEl.classList.add('hidden');
        showErr('');

        const { ok, data } = await api('/api/king-selection/client/gallery?slug=' + encodeURIComponent(slug));
        if (!ok) {
          if (data.message && /não autorizado|token/i.test(data.message)) {
            token = '';
            localStorage.removeItem('ks_client_token_' + slug);
            loadGallery();
            return;
          }
          showErr(data.message || 'Erro ao carregar galeria.');
          loadingEl.classList.add('hidden');
          return false;
        }

        gallery = data.gallery;
        photos = Array.isArray(data.gallery?.photos) ? data.gallery.photos : [];
        selectedIds = new Set((data.selectedPhotoIds || []).map(id => parseInt(id, 10)).filter(Boolean));
        locked = !!data.gallery?.locked;
        allowDownload = !!data.gallery?.allow_download;

        if (projectNameEl) projectNameEl.textContent = gallery?.nome_projeto || slug;
        if (avancarBtn) avancarBtn.style.display = locked ? 'none' : '';
        const faceBtn = document.getElementById('ks-face-btn');
        if (faceBtn) faceBtn.style.display = gallery?.face_recognition_enabled ? '' : 'none';
        if (lockedMsg) lockedMsg.classList.toggle('hidden', !locked);
        if (downloadBar) downloadBar.classList.add('hidden');
        updateSelCount();
        renderGrid();
        loadingEl.classList.add('hidden');
        gridEl.classList.remove('hidden');
        return true;
      }

      function updateDownloadCount() {
        const n = downloadSelectedIds.size;
        if (downloadNumEl) downloadNumEl.textContent = String(n);
        if (downloadSelectedBtn) downloadSelectedBtn.disabled = n === 0;
      }

      function updateGalleryCount() {
        const total = (photos && photos.length) || 0;
        const countEl = document.getElementById('ks-gallery-count');
        if (!countEl) return;
        if (facialFilterIds && facialFilterIds.size > 0) {
          const n = photos.filter(p => facialFilterIds.has(p.id)).length;
          countEl.textContent = n + ' de ' + total + ' fotos';
          countEl.title = 'Filtro por rosto ativo: ' + n + ' fotos encontradas de ' + total + ' na galeria.';
        } else {
          countEl.textContent = total + ' fotos na galeria';
          countEl.title = 'Total de fotos na galeria.';
        }
      }

      let gridSortOrder = 'sequence';
      function getPhotosForGrid() {
        if (!photos.length) return photos;
        const order = document.getElementById('ks-grid-sort')?.value || gridSortOrder;
        gridSortOrder = order;
        let basePhotos = photos;
        if (facialFilterIds) {
          basePhotos = photos.filter(p => facialFilterIds.has(p.id));
        }
        if (order === 'sequence') return basePhotos;
        const copy = basePhotos.slice();
        if (order === 'name') {
          copy.sort((a, b) => (a.original_name || '').localeCompare(b.original_name || '', undefined, { sensitivity: 'base' }));
          return copy;
        }
        if (order === 'number') {
          const num = (p) => {
            const m = (p.original_name || '').match(/\d+/g);
            return m && m.length ? parseInt(m.join(''), 10) : 0;
          };
          copy.sort((a, b) => {
            const na = num(a), nb = num(b);
            if (na !== nb) return na - nb;
            return (a.original_name || '').localeCompare(b.original_name || '', undefined, { sensitivity: 'base' });
          });
          return copy;
        }
        return copy;
      }

      function renderGrid() {
        if (!gridEl) return;
        updateGalleryCount();
        const toShow = getPhotosForGrid();
        const showDownloadCb = isPublicGallery && allowDownload;
        gridEl.innerHTML = toShow.map((p, i) => {
          const sel = selectedIds.has(p.id);
          const loadNow = i < 8;
          const priority = i < 4 ? ' fetchpriority="high"' : '';
          const pid = p.id;
          const dlChecked = downloadSelectedIds.has(pid);
          const dlCb = showDownloadCb
            ? '<label class="ks-tile-dl-wrap" title="Incluir para download"><input type="checkbox" class="ks-tile-dl-cb" data-photo-id="' + pid + '"' + (dlChecked ? ' checked' : '') + '> <span>Incluir para download</span></label>'
            : '';
          return '<div class="ks-tile ' + (sel ? 'sel' : '') + (locked ? ' locked' : '') + '" data-photo-id="' + pid + '">' +
            '<div class="ks-tile-media">' +
            '<img loading="' + (loadNow ? 'eager' : 'lazy') + '"' + priority + (loadNow ? '' : ' data-lazy="1"') + ' alt="' + escapeHtml(p.original_name || '') + '" data-photo-id="' + pid + '">' +
            '<span class="check" title="Selecionada"><i class="fas fa-check"></i></span>' +
            '</div>' +
            '<div class="ks-tile-actions">' +
            '<button type="button" class="ks-btn ' + (sel ? 'ks-btn-red' : 'ks-btn-green') + ' ks-tile-sel-btn' + (locked ? ' ks-modal-select-disabled' : '') + '" data-photo-id="' + pid + '"' + (locked ? ' disabled' : '') + '>' +
            (locked ? '<i class="fas fa-lock"></i>' : (sel ? '<i class="fas fa-times"></i> REMOVER' : '<i class="fas fa-check"></i> SELECIONAR')) +
            '</button>' +
            '<button type="button" class="ks-btn ks-tile-view-btn" data-photo-id="' + pid + '" title="Ver em tela cheia"><i class="fas fa-expand"></i></button>' +
            (dlCb ? dlCb : '') +
            '</div></div>';
        }).join('');

        if (showDownloadCb) {
          gridEl.querySelectorAll('.ks-tile-dl-cb').forEach(cb => {
            cb.addEventListener('change', function () {
              const pid = parseInt(this.getAttribute('data-photo-id'), 10);
              if (this.checked) downloadSelectedIds.add(pid); else downloadSelectedIds.delete(pid);
              updateDownloadCount();
            });
            cb.closest('.ks-tile-dl-wrap')?.addEventListener('click', e => e.stopPropagation());
          });
        }

        gridEl.querySelectorAll('.ks-tile-media').forEach(media => {
          const tile = media.closest('.ks-tile');
          const pid = parseInt(tile.getAttribute('data-photo-id'), 10);
          media.addEventListener('click', (e) => { if (!e.target.closest('.ks-tile-sel-btn')) openViewer(pid); });
        });
        gridEl.querySelectorAll('.ks-tile-sel-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (locked) return;
            const pid = parseInt(btn.getAttribute('data-photo-id'), 10);
            toggleSelect(pid);
          });
        });
        gridEl.querySelectorAll('.ks-tile-view-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const pid = parseInt(btn.getAttribute('data-photo-id'), 10);
            openViewer(pid);
          });
        });

        const loadImg = (img) => {
          const pid = parseInt(img.getAttribute('data-photo-id'), 10);
          if (pid) loadPreview(pid, img);
        };

        gridEl.querySelectorAll('img[data-photo-id]').forEach((img, i) => {
          if (i < 8) loadImg(img);
        });

        if (typeof IntersectionObserver !== 'undefined') {
          const io = new IntersectionObserver(entries => {
            entries.forEach(e => {
              if (!e.isIntersecting) return;
              const img = e.target;
              if (img.getAttribute('data-lazy') && !img.src) { img.removeAttribute('data-lazy'); loadImg(img); }
            });
          }, { rootMargin: '1000px 500px', threshold: 0.01 });
          gridEl.querySelectorAll('img[data-lazy]').forEach(img => io.observe(img));
        }
      }

      function escapeHtml(s) {
        const d = document.createElement('div');
        d.textContent = s || '';
        return d.innerHTML;
      }

      let viewerScrollY = 0;
      let viewerPhotosList = [];
      function openViewer(photoId) {
        viewerPhotosList = getPhotosForGrid();
        const idx = viewerPhotosList.findIndex(p => p.id === photoId);
        if (idx < 0) return;
        viewerIndex = idx;
        viewerScrollY = window.scrollY || document.documentElement.scrollTop || 0;
        document.body.classList.add('ks-modal-open');
        modalEl.classList.remove('hidden');
        modalEl.style.display = 'flex';
        renderViewer();
      }
      function openViewerFromCompare(photoId) {
        const list = compareSelectedList.length ? compareSelectedList : photos.filter(p => selectedIds.has(p.id));
        viewerPhotosList = list;
        const idx = list.findIndex(p => p.id === photoId);
        viewerIndex = idx >= 0 ? idx : 0;
        viewerScrollY = window.scrollY || document.documentElement.scrollTop || 0;
        document.body.classList.add('ks-modal-open');
        modalEl.classList.remove('hidden');
        modalEl.style.display = 'flex';
        renderViewer();
      }

      function closeViewer() {
        document.body.classList.remove('ks-modal-open');
        modalEl.classList.add('hidden');
        modalImg.src = '';
        requestAnimationFrame(() => {
          const list = viewerPhotosList;
          if (list.length && viewerIndex >= 0 && viewerIndex < list.length && gridEl) {
            const currentId = list[viewerIndex].id;
            const tile = gridEl.querySelector('.ks-tile[data-photo-id="' + currentId + '"]');
            if (tile) tile.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            window.scrollTo(0, viewerScrollY);
          }
        });
      }

      let modalLoadTimeoutId = 0;
      function hideModalLoading() {
        if (modalLoadTimeoutId) { clearTimeout(modalLoadTimeoutId); modalLoadTimeoutId = 0; }
        if (modalLoading) modalLoading.classList.add('hidden');
      }
      function showModalLoading() {
        if (modalLoading) modalLoading.classList.remove('hidden');
        if (modalLoadTimeoutId) clearTimeout(modalLoadTimeoutId);
        modalLoadTimeoutId = setTimeout(hideModalLoading, 10000);
      }

      function renderViewer() {
        const list = viewerPhotosList.length ? viewerPhotosList : photos;
        const p = list[viewerIndex];
        if (!p) return;
        showModalLoading();
        modalImg.onload = hideModalLoading;
        modalImg.onerror = hideModalLoading;
        loadPreview(p.id, modalImg, false);
        modalTitle.textContent = p.original_name || 'foto';
        modalMeta.textContent = (viewerIndex + 1) + '/' + list.length;
        if (modalPrev) modalPrev.disabled = viewerIndex <= 0;
        if (modalNext) modalNext.disabled = viewerIndex >= list.length - 1;
        if (list[viewerIndex - 1]) loadPreview(list[viewerIndex - 1].id, Object.assign(document.createElement('img'), { style: 'display:none' }), false);
        if (list[viewerIndex + 1]) loadPreview(list[viewerIndex + 1].id, Object.assign(document.createElement('img'), { style: 'display:none' }), false);

        const sel = selectedIds.has(p.id);
        if (modalArea) modalArea.classList.toggle('selected', sel);
        if (modalBadge) modalBadge.classList.toggle('hidden', !sel);
        if (modalDownload) {
          modalDownload.style.display = allowDownload ? '' : 'none';
        }
        if (modalSelect) {
          if (locked) {
            modalSelect.disabled = true;
            modalSelect.classList.add('ks-modal-select-disabled');
            modalSelect.innerHTML = '<i class="fas fa-lock"></i> Solicite reativação';
          } else {
            modalSelect.disabled = false;
            modalSelect.classList.remove('ks-modal-select-disabled');
            modalSelect.classList.remove('ks-btn-green', 'ks-btn-red');
            modalSelect.classList.add(sel ? 'ks-btn-red' : 'ks-btn-green');
            modalSelect.innerHTML = sel ? '<i class="fas fa-times"></i> REMOVER' : '<i class="fas fa-check"></i> SELECIONAR';
          }
        }
      }

      function updateTileSelection(photoId) {
        const tile = gridEl?.querySelector('.ks-tile[data-photo-id="' + photoId + '"]');
        if (!tile) return;
        const sel = selectedIds.has(photoId);
        tile.classList.toggle('sel', sel);
        const btn = tile.querySelector('.ks-tile-sel-btn');
        if (btn && !locked) {
          btn.className = 'ks-btn ' + (sel ? 'ks-btn-red' : 'ks-btn-green') + ' ks-tile-sel-btn';
          btn.innerHTML = sel ? '<i class="fas fa-times"></i> REMOVER' : '<i class="fas fa-check"></i> SELECIONAR';
        }
      }

      function toggleSelectSync(photoId) {
        if (selectedIds.has(photoId)) selectedIds.delete(photoId);
        else selectedIds.add(photoId);
        updateSelCount();
        updateTileSelection(photoId);
        if (modalEl && !modalEl.classList.contains('hidden')) renderViewer();
      }

      async function toggleSelect(photoId) {
        const maxSelect = gallery?.min_selections != null ? parseInt(gallery.min_selections, 10) : null;
        const atLimit = maxSelect > 0 && selectedIds.size >= maxSelect && !selectedIds.has(photoId);
        if (atLimit) { showErr('Limite de ' + maxSelect + ' fotos atingido. Remova uma para selecionar outra.'); return; }
        toggleSelectSync(photoId);
        try {
          const { ok, data } = await api('/api/king-selection/client/select', {
            method: 'POST',
            body: JSON.stringify({ slug, photo_id: photoId })
          });
          if (!ok && data?.message) {
            toggleSelectSync(photoId);
            showErr(data.message);
          }
        } catch (err) {
          toggleSelectSync(photoId);
          showErr('Erro ao alterar seleção. Tente novamente.');
        }
      }

      modalPrev?.addEventListener('click', () => {
        if (viewerIndex > 0) { viewerIndex--; renderViewer(); }
      });
      modalNext?.addEventListener('click', () => {
        const list = viewerPhotosList.length ? viewerPhotosList : photos;
        if (viewerIndex < list.length - 1) { viewerIndex++; renderViewer(); }
      });

      let lastSelectPhotoId = 0;
      let lastSelectTime = 0;
      function doSelectInViewer(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        const list = viewerPhotosList.length ? viewerPhotosList : photos;
        const p = list[viewerIndex];
        if (!p) return;
        const now = Date.now();
        if (p.id === lastSelectPhotoId && now - lastSelectTime < 500) return;
        lastSelectPhotoId = p.id;
        lastSelectTime = now;
        if (locked) { showErr('Sua seleção foi enviada. Solicite reativação ao fotógrafo para alterar.'); return; }
        toggleSelect(p.id);
      }

      function doDownload() {
        const list = viewerPhotosList.length ? viewerPhotosList : photos;
        const p = list[viewerIndex];
        if (!p || !allowDownload) return;
        const url = urlWithToken(p.id, false) + '&download=1';
        if (isPublicGallery) {
          const iframe = document.createElement('iframe');
          iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
          document.body.appendChild(iframe);
          iframe.src = url;
          setTimeout(() => { iframe.remove(); }, 2000);
        } else {
          const a = document.createElement('a');
          a.href = url;
          a.download = (p.original_name || 'foto') + (p.original_name && /\.(jpg|jpeg|png|webp)$/i.test(p.original_name) ? '' : '.jpg');
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      }

      function doDownloadSelected() {
        if (!allowDownload || !isPublicGallery || downloadSelectedIds.size === 0) return;
        const list = [...downloadSelectedIds];
        list.forEach((photoId, i) => {
          setTimeout(() => {
            const url = urlWithToken(photoId, false) + '&download=1';
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
            document.body.appendChild(iframe);
            iframe.src = url;
            setTimeout(() => { try { iframe.remove(); } catch (_) { } }, 5000);
          }, i * 1000);
        });
      }

      modalSelect?.addEventListener('click', function (e) { doSelectInViewer(e); });
      modalSelect?.addEventListener('touchend', function (e) {
        e.preventDefault();
        doSelectInViewer(e);
      }, { passive: false });
      modalDownload?.addEventListener('click', doDownload);
      modalClose?.addEventListener('click', closeViewer);

      modalEl?.addEventListener('click', e => { if (e.target === modalEl) closeViewer(); });

      document.addEventListener('keydown', e => {
        if (!modalEl || modalEl.classList.contains('hidden')) return;
        const list = viewerPhotosList.length ? viewerPhotosList : photos;
        if (e.key === 'Escape') closeViewer();
        if (e.key === 'ArrowLeft') { if (viewerIndex > 0) { viewerIndex--; renderViewer(); } }
        if (e.key === 'ArrowRight') { if (viewerIndex < list.length - 1) { viewerIndex++; renderViewer(); } }
      });

      // Swipe/arrastar: bloqueia scroll da página, só move a foto
      (function initSwipe() {
        if (!modalArea) return;
        let startX = 0, startY = 0;
        const MIN = 45;
        modalArea.addEventListener('touchstart', e => {
          startX = e.touches[0]?.clientX || 0;
          startY = e.touches[0]?.clientY || 0;
        }, { passive: true });
        modalArea.addEventListener('touchmove', e => {
          const t = e.touches[0];
          if (!t) return;
          const dx = Math.abs(t.clientX - startX);
          const dy = Math.abs(t.clientY - startY);
          if (dx > dy && dx > 20) e.preventDefault();
        }, { passive: false });
        modalArea.addEventListener('touchend', e => {
          const t = e.changedTouches?.[0];
          if (!t) return;
          const dx = t.clientX - startX;
          if (Math.abs(dx) > MIN) {
            e.preventDefault();
            const list = viewerPhotosList.length ? viewerPhotosList : photos;
            if (dx > 0 && viewerIndex > 0) { viewerIndex--; renderViewer(); }
            else if (dx < 0 && viewerIndex < list.length - 1) { viewerIndex++; renderViewer(); }
          }
        }, { passive: false });
        modalArea.addEventListener('mousedown', e => { startX = e.clientX; });
        modalArea.addEventListener('mouseup', e => {
          const dx = e.clientX - startX;
          const list = viewerPhotosList.length ? viewerPhotosList : photos;
          if (Math.abs(dx) > MIN) {
            if (dx > 0 && viewerIndex > 0) { viewerIndex--; renderViewer(); }
            else if (dx < 0 && viewerIndex < list.length - 1) { viewerIndex++; renderViewer(); }
          }
        });
      })();

      function showLoginErr(msg) {
        if (loginErr) {
          loginErr.textContent = msg || '';
          loginErr.classList.toggle('show', !!msg);
        }
      }

      const doLogin = async () => {
        const btn = document.getElementById('ks-login-btn');
        const email = document.getElementById('ks-email')?.value?.trim();
        const senha = document.getElementById('ks-senha')?.value || '';

        showLoginErr('');
        if (!slug) {
          showLoginErr('Link inválido. Acesse pelo link enviado pelo fotógrafo.');
          return;
        }
        if (!email) {
          showLoginErr('Informe seu e-mail.');
          document.getElementById('ks-email')?.focus();
          return;
        }
        if (!senha) {
          showLoginErr('Informe sua senha.');
          document.getElementById('ks-senha')?.focus();
          return;
        }

        btn.disabled = true;
        if (loginBtnText) loginBtnText.classList.add('hidden');
        if (loginBtnLoading) loginBtnLoading.classList.remove('hidden');

        try {
          const res = await fetch(API + '/api/king-selection/client/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, email, senha })
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.token) {
            token = data.token;
            localStorage.setItem('ks_client_token_' + slug, token);
            await loadGallery();
          } else {
            showLoginErr(data?.message || 'E-mail ou senha inválidos. Tente novamente.');
          }
        } catch (e) {
          showLoginErr('Falha na conexão. Verifique sua internet e tente novamente.');
        } finally {
          btn.disabled = false;
          if (loginBtnText) loginBtnText.classList.remove('hidden');
          if (loginBtnLoading) loginBtnLoading.classList.add('hidden');
        }
      };

      document.getElementById('ks-login-btn')?.addEventListener('click', doLogin);

      document.getElementById('ks-sair')?.addEventListener('click', () => {
        token = '';
        if (slug) localStorage.removeItem('ks_client_token_' + slug);
        showErr('');
        loginWrap?.classList.remove('hidden');
        appEl?.classList.add('hidden');
      });
      downloadSelectedBtn?.addEventListener('click', doDownloadSelected);
      downloadSelectAllBtn?.addEventListener('click', function () {
        if (!gridEl || !isPublicGallery || !allowDownload) return;
        const toShow = getPhotosForGrid();
        toShow.forEach(p => downloadSelectedIds.add(p.id));
        gridEl.querySelectorAll('.ks-tile-dl-cb').forEach(cb => { cb.checked = true; });
        updateDownloadCount();
      });
      downloadClearAllBtn?.addEventListener('click', function () {
        downloadSelectedIds.clear();
        gridEl?.querySelectorAll('.ks-tile-dl-cb').forEach(cb => { cb.checked = false; });
        updateDownloadCount();
      });
      document.getElementById('ks-senha')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
      document.getElementById('ks-email')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('ks-senha')?.focus(); } });

      function showConfirm() {
        if (!gridEl || !confirmEl || !confirmGrid) return;
        gridEl.classList.add('hidden');
        errEl?.classList.add('hidden');
        confirmEl.classList.remove('hidden');
        confirmCount.textContent = selectedIds.size;
        confirmMsg.value = '';
        const selected = photos.filter(p => selectedIds.has(p.id));
        confirmGrid.innerHTML = selected.map(p => {
          const url = urlWithToken(p.id);
          return '<div class="ks-tile sel" style="cursor:default"><img src="' + url + '" alt="" loading="lazy"><span class="check"><i class="fas fa-check"></i></span></div>';
        }).join('');
        const addMoreConfirm = document.createElement('div');
        addMoreConfirm.className = 'ks-confirm-add-more';
        addMoreConfirm.setAttribute('role', 'button');
        addMoreConfirm.setAttribute('tabindex', '0');
        addMoreConfirm.title = 'Voltar à galeria para escolher mais fotos';
        addMoreConfirm.innerHTML = '<span class="ks-add-more-icon"><i class="fas fa-plus"></i></span><span class="ks-add-more-label">Selecionar mais fotos</span>';
        addMoreConfirm.addEventListener('click', hideConfirm);
        addMoreConfirm.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hideConfirm(); } });
        confirmGrid.appendChild(addMoreConfirm);
      }

      function hideConfirm() {
        if (confirmEl) confirmEl.classList.add('hidden');
        if (gridEl) gridEl.classList.remove('hidden');
      }

      const headerConfirmBtn = document.getElementById('ks-header-confirm-send');
      function showCompare() {
        if (!compareWrap || !gridEl) return;
        confirmEl?.classList.add('hidden');
        gridEl.classList.add('hidden');
        compareWrap.classList.remove('hidden');
        if (avancarBtn) avancarBtn.style.display = 'none';
        if (headerConfirmBtn) headerConfirmBtn.style.display = '';
        if (compareLockedMsg) compareLockedMsg.classList.toggle('hidden', !locked);
        renderCompareContent();
      }

      function hideCompare() {
        if (compareWrap) compareWrap.classList.add('hidden');
        if (gridEl) gridEl.classList.remove('hidden');
        if (avancarBtn) avancarBtn.style.display = '';
        if (headerConfirmBtn) headerConfirmBtn.style.display = 'none';
      }

      let comparePhotoIdA = 0;
      let comparePhotoIdB = 0;
      let compareSlotNext = 'A';
      let compareSelectedList = [];
      let modalAbFocusedPanel = 'a';

      function setComparePanel(panel, photoId) {
        const isA = panel === 'a';
        const prevId = isA ? comparePhotoIdA : comparePhotoIdB;
        if (isA) comparePhotoIdA = photoId; else comparePhotoIdB = photoId;
        const imgEl = isA ? compareImgA : compareImgB;
        const placeholderEl = document.getElementById(isA ? 'ks-compare-placeholder-a' : 'ks-compare-placeholder-b');
        const panelEl = document.getElementById(isA ? 'ks-compare-panel-a' : 'ks-compare-panel-b');
        const navEl = document.getElementById(isA ? 'ks-compare-nav-a' : 'ks-compare-nav-b');
        const removeWrap = document.getElementById(isA ? 'ks-compare-remove-wrap-a' : 'ks-compare-remove-wrap-b');
        if (!photoId || !imgEl) {
          if (imgEl) { imgEl.style.display = 'none'; imgEl.src = ''; }
          if (placeholderEl) placeholderEl.style.display = 'block';
          if (panelEl) panelEl.classList.remove('has-photo');
          if (navEl) navEl.style.display = 'none';
          if (removeWrap) removeWrap.style.display = 'none';
          const expandBtn = document.getElementById(isA ? 'ks-compare-expand-a' : 'ks-compare-expand-b');
          if (expandBtn) { expandBtn.style.display = 'none'; expandBtn.onclick = null; }
          return;
        }
        if (placeholderEl) placeholderEl.style.display = 'none';
        if (prevId === photoId) {
          imgEl.style.display = 'block';
          imgEl.style.visibility = 'visible';
        } else {
          imgEl.style.display = 'none';
          imgEl.src = '';
          loadPanelImgDirect(photoId, imgEl);
        }
        if (panelEl) panelEl.classList.add('has-photo');
        if (navEl && compareSelectedList.length > 1) navEl.style.display = 'flex'; else if (navEl) navEl.style.display = 'none';
        const expandBtn = document.getElementById(isA ? 'ks-compare-expand-a' : 'ks-compare-expand-b');
        if (expandBtn) {
          expandBtn.style.display = 'flex';
          expandBtn.onclick = () => openViewerFromCompare(photoId);
        }
        if (removeWrap) removeWrap.style.display = locked ? 'none' : 'block';
        updateCompareTileHighlights();
        updateExpandABButton();
      }

      function updateExpandABButton() {
        const wrapTop = document.getElementById('ks-compare-expand-ab-top');
        if (comparePhotoIdA && comparePhotoIdB) {
          if (wrapTop) wrapTop.classList.remove('hidden');
        } else {
          if (wrapTop) wrapTop.classList.add('hidden');
        }
      }

      const _modalAbObjUrls = {};
      function revokeModalAbUrl(photoId) {
        const u = _modalAbObjUrls[photoId];
        if (u) { try { URL.revokeObjectURL(u); } catch (_) { } delete _modalAbObjUrls[photoId]; }
      }
      function loadModalAbImg(img, panel, photoId) {
        if (!img || !photoId) return;
        revokeModalAbUrl(photoId);
        img.style.visibility = 'hidden';
        img.src = '';
        var panelImg = panel === 'a' ? compareImgA : compareImgB;
        var url = urlWithToken(photoId, false);
        if (panelImg && panelImg.src && (panel === 'a' ? comparePhotoIdA : comparePhotoIdB) === photoId) {
          var s = String(panelImg.src || '');
          if (s && (s.indexOf('preview') >= 0 || s.indexOf('blob:') === 0)) url = s;
        }
        img.onload = function () { img.style.visibility = 'visible'; };
        img.onerror = function () {
          if (url !== urlWithToken(photoId, false)) {
            img.src = urlWithToken(photoId, false);
            img.onerror = function () { img.src = ERROR_PLACEHOLDER; img.onerror = null; img.style.visibility = 'visible'; };
          } else {
            img.src = ERROR_PLACEHOLDER;
            img.onerror = null;
          }
          img.style.visibility = 'visible';
        };
        img.src = url;
        img.style.visibility = 'visible';
      }

      let zoomLevelA = 1, zoomLevelB = 1;
      let panXA = 0, panYA = 0, panXB = 0, panYB = 0;
      let panningPanel = null;
      let panStartX = 0, panStartY = 0, panStartPanX = 0, panStartPanY = 0;
      const ZOOM_MIN = 0.5, ZOOM_MAX = 4, ZOOM_STEP = 0.25;
      function applyTransform(panel) {
        const img = document.getElementById('ks-modal-ab-img-' + panel);
        const wrap = document.getElementById('ks-modal-ab-zoom-wrap-' + panel);
        if (!img || !wrap) return;
        const lvl = panel === 'a' ? zoomLevelA : zoomLevelB;
        const px = panel === 'a' ? panXA : panXB;
        const py = panel === 'a' ? panYA : panYB;
        img.style.transform = 'translate(' + px + 'px,' + py + 'px) scale(' + lvl + ')';
        wrap.classList.toggle('zoomed', lvl > 1);
      }
      function applyZoom(panel, level) {
        const wrap = document.getElementById('ks-modal-ab-zoom-wrap-' + panel);
        if (!wrap) return;
        level = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, level));
        if (panel === 'a') { zoomLevelA = level; if (level <= 1) { panXA = 0; panYA = 0; } }
        else { zoomLevelB = level; if (level <= 1) { panXB = 0; panYB = 0; } }
        applyTransform(panel);
      }
      function applyPan(panel, dx, dy) {
        if (panel === 'a') { panXA += dx; panYA += dy; } else { panXB += dx; panYB += dy; }
        applyTransform(panel);
      }
      function zoomIn(panel) { applyZoom(panel, (panel === 'a' ? zoomLevelA : zoomLevelB) + ZOOM_STEP); }
      function zoomOut(panel) { applyZoom(panel, (panel === 'a' ? zoomLevelA : zoomLevelB) - ZOOM_STEP); }
      function resetZoomAB() {
        zoomLevelA = zoomLevelB = 1;
        panXA = panYA = panXB = panYB = 0;
        panningPanel = null;
        applyZoom('a', 1);
        applyZoom('b', 1);
      }

      function refreshModalAB() {
        resetZoomAB();
        const imgA = document.getElementById('ks-modal-ab-img-a');
        const imgB = document.getElementById('ks-modal-ab-img-b');
        loadModalAbImg(imgA, 'a', comparePhotoIdA);
        loadModalAbImg(imgB, 'b', comparePhotoIdB);
        const list = compareSelectedList;
        const n = list.length;
        const idxA = list.findIndex(p => p.id === comparePhotoIdA);
        const idxB = list.findIndex(p => p.id === comparePhotoIdB);
        const prevA = document.getElementById('ks-modal-ab-prev-a');
        const nextA = document.getElementById('ks-modal-ab-next-a');
        const prevB = document.getElementById('ks-modal-ab-prev-b');
        const nextB = document.getElementById('ks-modal-ab-next-b');
        if (prevA) prevA.disabled = n <= 1 || idxA <= 0;
        if (nextA) nextA.disabled = n <= 1 || idxA < 0 || idxA >= n - 1;
        if (prevB) prevB.disabled = n <= 1 || idxB <= 0;
        if (nextB) nextB.disabled = n <= 1 || idxB < 0 || idxB >= n - 1;
        const wrapA = document.getElementById('ks-modal-ab-remove-wrap-a');
        const wrapB = document.getElementById('ks-modal-ab-remove-wrap-b');
        if (wrapA) wrapA.style.display = locked ? 'none' : 'block';
        if (wrapB) wrapB.style.display = locked ? 'none' : 'block';
      }

      function openModalAB() {
        if (!comparePhotoIdA || !comparePhotoIdB) return;
        document.body.classList.add('ks-modal-open');
        const modalAB = document.getElementById('ks-modal-ab');
        if (modalAB) { modalAB.classList.remove('hidden'); modalAB.style.display = 'flex'; }
        refreshModalAB();
      }

      function closeModalAB() {
        resetZoomAB();
        document.body.classList.remove('ks-modal-open');
        const modalAB = document.getElementById('ks-modal-ab');
        if (modalAB) { modalAB.classList.add('hidden'); modalAB.style.display = 'none'; }
        revokeModalAbUrl(comparePhotoIdA);
        revokeModalAbUrl(comparePhotoIdB);
        if (comparePhotoIdA) setComparePanel('a', comparePhotoIdA);
        if (comparePhotoIdB) setComparePanel('b', comparePhotoIdB);
      }

      function cycleModalAB(panel, delta) {
        const list = compareSelectedList;
        if (!list.length) return;
        const isA = panel === 'a';
        const current = isA ? comparePhotoIdA : comparePhotoIdB;
        let idx = list.findIndex(p => p.id === current);
        if (idx < 0) idx = 0;
        idx = (idx + delta + list.length) % list.length;
        const nextId = list[idx].id;
        if (isA) comparePhotoIdA = nextId; else comparePhotoIdB = nextId;
        refreshModalAB();
      }

      function removeFromModalAB(panel) {
        const pid = panel === 'a' ? comparePhotoIdA : comparePhotoIdB;
        if (!pid) return;
        const list = compareSelectedList;
        let nextId = null;
        if (list.length > 1) {
          const idx = list.findIndex(p => p.id === pid);
          if (idx >= 0) {
            let nextIdx = idx + 1;
            if (nextIdx >= list.length) nextIdx = idx - 1;
            if (nextIdx < 0) nextIdx = 0;
            nextId = list[nextIdx].id;
          }
        }
        if (panel === 'a') comparePhotoIdA = nextId || 0;
        else comparePhotoIdB = nextId || 0;
        closeModalAB();
        toggleSelect(pid);
        if (selectedIds.size === 0) hideCompare();
        else {
          renderCompareContent();
          if (nextId) {
            setComparePanel(panel, nextId);
            updateCompareTileHighlights();
          }
        }
        updateSelCount();
        renderGrid();
      }

      function updateCompareTileHighlights() {
        if (!compareGrid) return;
        compareGrid.querySelectorAll('.ks-compare-tile').forEach(tile => {
          const pid = parseInt(tile.getAttribute('data-photo-id'), 10);
          tile.classList.remove('ks-compare-tile-in-panel-a', 'ks-compare-tile-in-panel-b');
          if (pid === comparePhotoIdA) tile.classList.add('ks-compare-tile-in-panel-a');
          if (pid === comparePhotoIdB) tile.classList.add('ks-compare-tile-in-panel-b');
        });
      }

      function updateCompareHint() {
        const hintEl = document.getElementById('ks-compare-hint');
        if (!hintEl) return;
        hintEl.innerHTML = 'Clique em uma miniatura para colocar em <strong>Foto ' + compareSlotNext + '</strong>';
      }

      function updateCompareBadgesAndExpandOnly() {
        if (!compareGrid) return;
        compareGrid.querySelectorAll('.ks-compare-tile').forEach(tile => {
          const pid = parseInt(tile.getAttribute('data-photo-id'), 10);
          const badgeA = tile.querySelector('.ks-compare-tile-badge-a');
          const badgeB = tile.querySelector('.ks-compare-tile-badge-b');
          const expandAb = tile.querySelector('.ks-compare-tile-expand-ab');
          const isAorB = pid === comparePhotoIdA || pid === comparePhotoIdB;
          const showExpandAB = comparePhotoIdA && comparePhotoIdB && isAorB;
          if (badgeA) badgeA.classList.toggle('ks-hidden', pid !== comparePhotoIdA);
          if (badgeB) badgeB.classList.toggle('ks-hidden', pid !== comparePhotoIdB);
          if (expandAb) expandAb.classList.toggle('ks-hidden', !showExpandAB);
        });
      }

      function cycleComparePanel(panel, delta) {
        const list = compareSelectedList;
        if (!list.length) return;
        const isA = panel === 'a';
        const current = isA ? comparePhotoIdA : comparePhotoIdB;
        let idx = list.findIndex(p => p.id === current);
        if (idx < 0) idx = 0;
        idx = (idx + delta + list.length) % list.length;
        const nextId = list[idx].id;
        setComparePanel(panel, nextId);
        updateCompareBadgesAndExpandOnly();
      }

      function renderCompareContent(skipGridRebuild) {
        const selected = photos.filter(p => selectedIds.has(p.id));
        compareSelectedList = selected;
        if (compareCount) compareCount.textContent = selected.length;
        if (!compareGrid) return;
        // Só resetar compareSlotNext quando ambos A e B estão vazios (estado inicial)
        if (!comparePhotoIdA && !comparePhotoIdB) compareSlotNext = 'A';
        updateCompareHint();

        if (!skipGridRebuild) {
          compareGrid.innerHTML = selected.map(p => {
            const url = urlWithToken(p.id);
            const canRemove = !locked;
            const hidA = p.id !== comparePhotoIdA ? ' ks-hidden' : '';
            const hidB = p.id !== comparePhotoIdB ? ' ks-hidden' : '';
            const isAorB = p.id === comparePhotoIdA || p.id === comparePhotoIdB;
            const showExpandAB = comparePhotoIdA && comparePhotoIdB && isAorB;
            const hidExpand = !showExpandAB ? ' ks-hidden' : '';
            return '<div class="ks-compare-tile" data-photo-id="' + p.id + '" role="button" tabindex="0" title="Ajuste A e B juntas — clique para colocar em Foto A ou B">' +
              '<span class="ks-compare-click-hint">Ajuste A e B juntas</span>' +
              '<button type="button" class="ks-compare-tile-expand" title="Ampliar em tela cheia" data-photo-id="' + p.id + '"><i class="fas fa-expand"></i></button>' +
              '<button type="button" class="ks-compare-tile-expand-ab' + hidExpand + '" title="Ampliar A e B juntas"><i class="fas fa-expand-alt"></i> Ampliar A e B juntas</button>' +
              '<span class="ks-compare-tile-badge ks-compare-tile-badge-a' + hidA + '">A</span>' +
              '<span class="ks-compare-tile-badge ks-compare-tile-badge-b' + hidB + '">B</span>' +
              '<img data-photo-id="' + p.id + '" src="' + url + '" alt="" loading="lazy" onerror="this.onerror=null;this.src=(window.__ksErrPh||\'\');">' +
              (canRemove ? '<div class="ks-compare-remove"><button type="button" class="ks-btn ks-btn-red ks-compare-remove-btn" data-photo-id="' + p.id + '"><i class="fas fa-times"></i> Remover</button></div>' : '') +
              '</div>';
          }).join('');

          compareGrid.querySelectorAll('.ks-compare-tile').forEach(tile => {
            const pid = parseInt(tile.getAttribute('data-photo-id'), 10);
            tile.addEventListener('click', (e) => {
              if (e.target.closest('.ks-compare-remove') || e.target.closest('.ks-compare-tile-expand') || e.target.closest('.ks-compare-tile-expand-ab')) return;
              e.preventDefault();
              e.stopPropagation();
              if (comparePhotoIdA && comparePhotoIdB && (pid === comparePhotoIdA || pid === comparePhotoIdB)) {
                openModalAB();
                return;
              }
              setComparePanel(compareSlotNext.toLowerCase(), pid);
              compareSlotNext = compareSlotNext === 'A' ? 'B' : 'A';
              updateCompareHint();
              renderCompareContent(true);
            });
          });
          compareGrid.querySelectorAll('.ks-compare-tile-expand-ab').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              openModalAB();
            });
          });
          compareGrid.querySelectorAll('.ks-compare-tile-expand').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              const pid = parseInt(btn.getAttribute('data-photo-id'), 10);
              if (pid) openViewerFromCompare(pid);
            });
          });
          compareGrid.querySelectorAll('.ks-compare-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              if (locked) return;
              const pid = parseInt(btn.getAttribute('data-photo-id'), 10);
              toggleSelect(pid);
              if (selectedIds.size === 0) hideCompare();
              else renderCompareContent(false);
              updateSelCount();
              renderGrid();
            });
          });
          const addMoreCompare = document.createElement('div');
          addMoreCompare.className = 'ks-compare-tile ks-compare-add-more';
          addMoreCompare.setAttribute('role', 'button');
          addMoreCompare.setAttribute('tabindex', '0');
          addMoreCompare.title = 'Voltar à galeria para escolher mais fotos';
          addMoreCompare.innerHTML = '<span class="ks-add-more-icon"><i class="fas fa-plus"></i></span><span class="ks-add-more-label">Selecionar mais fotos</span>';
          addMoreCompare.addEventListener('click', hideCompare);
          addMoreCompare.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hideCompare(); } });
          compareGrid.appendChild(addMoreCompare);
        } else {
          updateCompareBadgesAndExpandOnly();
        }

        setComparePanel('a', comparePhotoIdA && selectedIds.has(comparePhotoIdA) ? comparePhotoIdA : 0);
        setComparePanel('b', comparePhotoIdB && selectedIds.has(comparePhotoIdB) ? comparePhotoIdB : 0);
        if (selected.length >= 1 && !comparePhotoIdA) setComparePanel('a', selected[0].id);
        if (selected.length >= 2 && !comparePhotoIdB) setComparePanel('b', selected[1].id);

        document.querySelectorAll('.ks-compare-panel-nav .ks-compare-prev').forEach(btn => {
          btn.onclick = () => cycleComparePanel(btn.getAttribute('data-panel'), -1);
        });
        document.querySelectorAll('.ks-compare-panel-nav .ks-compare-next').forEach(btn => {
          btn.onclick = () => cycleComparePanel(btn.getAttribute('data-panel'), 1);
        });

        if (skipGridRebuild) {
          const selectA = comparePickA?.querySelector('select');
          const selectB = comparePickB?.querySelector('select');
          if (selectA) selectA.value = comparePhotoIdA || '';
          if (selectB) selectB.value = comparePhotoIdB || '';
        } else {
          const opts = selected.map(p => '<option value="' + p.id + '">' + escapeHtml(p.original_name || 'foto') + '</option>').join('');
          const selA = '<select class="ks-input ks-compare-select" id="ks-compare-select-a"><option value="">— Trocar Foto A —</option>' + opts + '</select>';
          const selB = '<select class="ks-input ks-compare-select" id="ks-compare-select-b"><option value="">— Trocar Foto B —</option>' + opts + '</select>';
          if (comparePickA) {
            comparePickA.innerHTML = selA;
            const selectA = comparePickA.querySelector('select');
            if (selectA) { selectA.value = comparePhotoIdA || ''; selectA.addEventListener('change', onCompareSelectA); }
          }
          if (comparePickB) {
            comparePickB.innerHTML = selB;
            const selectB = comparePickB.querySelector('select');
            if (selectB) { selectB.value = comparePhotoIdB || ''; selectB.addEventListener('change', onCompareSelectB); }
          }
        }
      }

      function onCompareSelectA() {
        const sel = comparePickA?.querySelector('select');
        const pid = sel ? parseInt(sel.value, 10) : 0;
        if (pid) { setComparePanel('a', pid); renderCompareContent(true); }
      }

      function onCompareSelectB() {
        const sel = comparePickB?.querySelector('select');
        const pid = sel ? parseInt(sel.value, 10) : 0;
        if (pid) { setComparePanel('b', pid); renderCompareContent(true); }
      }

      btnCompare?.addEventListener('click', () => {
        if (selectedIds.size === 0) return;
        showCompare();
      });
      compareBack?.addEventListener('click', hideCompare);

      function removeFromComparePanel(panel) {
        if (locked) return;
        const pid = panel === 'a' ? comparePhotoIdA : comparePhotoIdB;
        if (!pid) return;
        toggleSelect(pid);
        if (selectedIds.size === 0) hideCompare();
        else renderCompareContent(false);
        updateSelCount();
        renderGrid();
      }
      document.getElementById('ks-compare-remove-panel-a')?.addEventListener('click', () => removeFromComparePanel('a'));
      document.getElementById('ks-compare-remove-panel-b')?.addEventListener('click', () => removeFromComparePanel('b'));
      document.getElementById('ks-compare-expand-ab-top-btn')?.addEventListener('click', openModalAB);
      document.getElementById('ks-modal-ab-close')?.addEventListener('click', closeModalAB);
      document.getElementById('ks-modal-ab-prev-a')?.addEventListener('click', () => cycleModalAB('a', -1));
      document.getElementById('ks-modal-ab-next-a')?.addEventListener('click', () => cycleModalAB('a', 1));
      document.getElementById('ks-modal-ab-prev-b')?.addEventListener('click', () => cycleModalAB('b', -1));
      document.getElementById('ks-modal-ab-next-b')?.addEventListener('click', () => cycleModalAB('b', 1));
      document.getElementById('ks-modal-ab-remove-a')?.addEventListener('click', () => removeFromModalAB('a'));
      document.getElementById('ks-modal-ab-remove-b')?.addEventListener('click', () => removeFromModalAB('b'));
      document.getElementById('ks-modal-ab-zoom-in-a')?.addEventListener('click', () => zoomIn('a'));
      document.getElementById('ks-modal-ab-zoom-out-a')?.addEventListener('click', () => zoomOut('a'));
      document.getElementById('ks-modal-ab-zoom-in-b')?.addEventListener('click', () => zoomIn('b'));
      document.getElementById('ks-modal-ab-zoom-out-b')?.addEventListener('click', () => zoomOut('b'));
      document.getElementById('ks-modal-ab-zoom-reset-a')?.addEventListener('click', () => applyZoom('a', 1));
      document.getElementById('ks-modal-ab-zoom-reset-b')?.addEventListener('click', () => applyZoom('b', 1));
      document.getElementById('ks-modal-ab-zoom-reset-overlay-a')?.addEventListener('click', e => { e.stopPropagation(); applyZoom('a', 1); });
      document.getElementById('ks-modal-ab-zoom-reset-overlay-b')?.addEventListener('click', e => { e.stopPropagation(); applyZoom('b', 1); });

      (function initModalABWheelZoom() {
        const wrapA = document.getElementById('ks-modal-ab-zoom-wrap-a');
        const wrapB = document.getElementById('ks-modal-ab-zoom-wrap-b');
        function onWheel(e, panel) {
          e.preventDefault();
          e.stopPropagation();
          const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
          applyZoom(panel, (panel === 'a' ? zoomLevelA : zoomLevelB) + delta);
        }
        wrapA?.addEventListener('wheel', e => onWheel(e, 'a'), { passive: false });
        wrapB?.addEventListener('wheel', e => onWheel(e, 'b'), { passive: false });
      })();

      (function initModalABPan() {
        const wrapA = document.getElementById('ks-modal-ab-zoom-wrap-a');
        const wrapB = document.getElementById('ks-modal-ab-zoom-wrap-b');
        function getCoords(e) {
          if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
          return { x: e.clientX, y: e.clientY };
        }
        function startPan(e, panel) {
          const lvl = panel === 'a' ? zoomLevelA : zoomLevelB;
          if (lvl <= 1) return;
          e.preventDefault();
          panningPanel = panel;
          const wrap = document.getElementById('ks-modal-ab-zoom-wrap-' + panel);
          wrap?.classList.add('panning');
          const c = getCoords(e);
          panStartX = c.x; panStartY = c.y;
          panStartPanX = panel === 'a' ? panXA : panXB;
          panStartPanY = panel === 'a' ? panYA : panYB;
        }
        function movePan(e) {
          if (!panningPanel) return;
          e.preventDefault();
          const c = getCoords(e);
          const dx = c.x - panStartX, dy = c.y - panStartY;
          if (panningPanel === 'a') { panXA = panStartPanX + dx; panYA = panStartPanY + dy; }
          else { panXB = panStartPanX + dx; panYB = panStartPanY + dy; }
          applyTransform(panningPanel);
        }
        function endPan() {
          if (panningPanel) {
            const wrap = document.getElementById('ks-modal-ab-zoom-wrap-' + panningPanel);
            wrap?.classList.remove('panning');
          }
          panningPanel = null;
        }
        function setupWrap(wrap, panel) {
          if (!wrap) return;
          wrap.addEventListener('mousedown', e => { if (e.button === 0) startPan(e, panel); });
          wrap.addEventListener('touchstart', e => startPan(e, panel), { passive: false });
        }
        document.addEventListener('mousemove', movePan);
        document.addEventListener('mouseup', endPan);
        document.addEventListener('mouseleave', endPan);
        document.addEventListener('touchmove', movePan, { passive: false });
        document.addEventListener('touchend', endPan);
        document.addEventListener('touchcancel', endPan);
        setupWrap(wrapA, 'a');
        setupWrap(wrapB, 'b');
      })();

      (function initModalABKeyboard() {
        function isModalABOpen() {
          const m = document.getElementById('ks-modal-ab');
          return m && !m.classList.contains('hidden') && m.style.display === 'flex';
        }
        function setFocus(panel) { modalAbFocusedPanel = panel; }
        document.addEventListener('keydown', function (e) {
          if (!isModalABOpen()) return;
          const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
          if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
          if (e.key === 'ArrowLeft') { e.preventDefault(); cycleModalAB(modalAbFocusedPanel, -1); }
          else if (e.key === 'ArrowRight') { e.preventDefault(); cycleModalAB(modalAbFocusedPanel, 1); }
        });
        document.getElementById('ks-modal-ab-prev-a')?.addEventListener('click', () => setFocus('a'));
        document.getElementById('ks-modal-ab-next-a')?.addEventListener('click', () => setFocus('a'));
        document.getElementById('ks-modal-ab-prev-b')?.addEventListener('click', () => setFocus('b'));
        document.getElementById('ks-modal-ab-next-b')?.addEventListener('click', () => setFocus('b'));
      })();

      headerConfirmBtn?.addEventListener('click', () => {
        if (selectedIds.size === 0) { showErr('Nenhuma foto selecionada. Volte e selecione ao menos uma.'); return; }
        compareWrap?.classList.add('hidden');
        if (avancarBtn) avancarBtn.style.display = '';
        if (headerConfirmBtn) headerConfirmBtn.style.display = 'none';
        showConfirm();
      });

      avancarBtn?.addEventListener('click', () => {
        if (!gallery?.slug || locked) return;
        if (selectedIds.size === 0) { showErr('Selecione pelo menos uma foto.'); return; }
        showCompare();
      });

      document.getElementById('ks-grid-sort')?.addEventListener('change', () => {
        gridSortOrder = document.getElementById('ks-grid-sort')?.value || 'sequence';
        renderGrid();
      });

      document.getElementById('ks-limpar-sel')?.addEventListener('click', async () => {
        if (locked) { showErr('Sua seleção já foi enviada. Solicite reativação ao fotógrafo.'); return; }
        if (selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);
        try {
          const { ok, data } = await api('/api/king-selection/client/select-bulk', {
            method: 'POST',
            body: JSON.stringify({ slug, mode: 'unselect', photo_ids: [] })
          });
          if (!ok && data?.message) { showErr(data.message); return; }
          selectedIds.clear();
          ids.forEach(pid => updateTileSelection(pid));
          updateSelCount();
          if (modalEl && !modalEl.classList.contains('hidden')) renderViewer();
        } catch (_) { }
      });

      confirmBack?.addEventListener('click', hideConfirm);

      function showThankYouFromFinalize(data) {
        const cfg = data?.thankYouConfig || {};
        const nome = (data?.photographerDisplayName || 'Fotógrafo').trim();
        const nomeCliente = (data?.clientDisplayName || '').trim() || (data?.projectName || '').trim() || 'você';
        const qty = String(data?.selectionCount ?? '');
        const replacePlaceholders = (s) => String(s).replace(/\{\{nome_cliente\}\}/gi, nomeCliente).replace(/\{\{nome\}\}/gi, nome).replace(/\{\{quantidade\}\}/gi, qty);
        let title = replacePlaceholders((cfg.title || 'Obrigado!').trim());
        let message = (cfg.message || 'Sua seleção foi recebida com sucesso.').trim();
        message = replacePlaceholders(message);
        const imageUrl = cfg.imageUrl || null;
        if (thankYouTitle) {
          thankYouTitle.innerHTML = '';
          if (title.toLowerCase().includes('obrigado')) {
            const accent = document.createElement('span');
            accent.className = 'ks-thank-you-accent';
            accent.textContent = title;
            thankYouTitle.appendChild(accent);
          } else {
            thankYouTitle.textContent = title;
          }
        }
        if (thankYouMessage) thankYouMessage.textContent = message;
        if (thankYouName) thankYouName.textContent = nome;
        if (thankYouImg) {
          if (imageUrl) {
            thankYouImg.src = imageUrl;
            thankYouImg.style.display = 'block';
          } else {
            thankYouImg.removeAttribute('src');
            thankYouImg.style.display = 'none';
          }
        }
        hideConfirm();
        if (thankYouWrap) thankYouWrap.classList.remove('hidden');
      }

      confirmSend?.addEventListener('click', async () => {
        if (!gallery?.slug) return;
        const fb = (confirmMsg?.value || '').trim();
        try {
          const { ok, data } = await api('/api/king-selection/client/finalize', {
            method: 'POST',
            body: JSON.stringify({ slug: gallery.slug, feedback: fb })
          });
          if (ok) {
            showThankYouFromFinalize(data || {});
          } else showErr(data?.message || 'Erro ao enviar.');
        } catch (e) { showErr('Erro ao enviar seleção.'); }
      });

      async function initByAccessMode() {
        if (!slug) {
          loginWrap?.classList.remove('hidden');
          showErr('Link inválido. Acesse pelo link enviado pelo fotógrafo.');
          return;
        }
        try {
          const r = await fetch(API + '/api/king-selection/public/gallery?slug=' + encodeURIComponent(slug));
          const d = await r.json().catch(() => ({}));
          if (!d.success || !d.gallery) {
            if (token) return loadGallery();
            loginWrap?.classList.remove('hidden');
            return;
          }
          accessMode = (d.gallery.access_mode || 'private').toLowerCase();
          allowSelfSignup = !!(d.gallery.allow_self_signup || accessMode === 'signup');
          const wrap = document.getElementById('ks-login-register-wrap');
          if (wrap) wrap.classList.toggle('hidden', !allowSelfSignup);

          if (accessMode === 'public') {
            isPublicGallery = true;
            loginWrap?.classList.add('hidden');
            appEl?.classList.remove('hidden');
            await loadPublicGallery();
            return;
          }
          if (!accessMode || accessMode === 'private' || accessMode === 'signup') {
            try {
              const r2 = await fetch(API + '/api/king-selection/public/gallery-content?slug=' + encodeURIComponent(slug));
              const d2 = await r2.json().catch(() => ({}));
              if (r2.ok && d2.success && d2.gallery) {
                isPublicGallery = true;
                accessMode = 'public';
                loginWrap?.classList.add('hidden');
                appEl?.classList.remove('hidden');
                await loadPublicGallery();
                return;
              }
            } catch (_) { }
          }
          if (token) {
            loadGallery();
          } else {
            loginWrap?.classList.remove('hidden');
          }
        } catch (_) {
          if (token) loadGallery();
          else loginWrap?.classList.remove('hidden');
        }
      }

      document.getElementById('ks-login-register')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (!allowSelfSignup) return;
        const nome = prompt('Seu nome completo:') || '';
        const email = prompt('Seu e-mail:') || '';
        if (!nome.trim() || !email.trim()) return;
        fetch(API + '/api/king-selection/client/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, nome: nome.trim(), email: email.trim() })
        }).then(r => r.json()).then(d => {
          if (d.token) {
            token = d.token;
            localStorage.setItem('ks_client_token_' + slug, token);
            alert('Cadastro realizado! Sua senha é: ' + (d.client_password || '—') + '\nGuarde-a para acessar.');
            loadGallery();
          } else alert(d.message || 'Erro no cadastro.');
        }).catch(() => alert('Erro ao conectar.'));
      });

      const faceBtn = document.getElementById('ks-face-btn');
      const faceModal = document.getElementById('ks-face-modal');
      const faceClose = document.getElementById('ks-face-close');
      const faceOptCamera = document.getElementById('ks-face-opt-camera');
      const faceUpload = document.getElementById('ks-face-upload');
      const faceStepSetup = document.getElementById('ks-face-step-setup');
      const faceStepCamera = document.getElementById('ks-face-step-camera');
      const faceStepActive = document.getElementById('ks-face-step-active');
      const faceStatus = document.getElementById('ks-face-status');
      const faceCapture = document.getElementById('ks-face-capture');
      const faceVideo = document.getElementById('ks-face-video');
      const faceApplyFilter = document.getElementById('ks-face-apply-filter');
      const faceReset = document.getElementById('ks-face-reset');

      let faceStream = null;

      function setFaceStatus(msg, type) {
        if (!faceStatus) return;
        faceStatus.textContent = msg || '';
        faceStatus.className = 'ks-face-status ' + (type || '') + (msg ? '' : ' hidden');
      }

      async function checkFaceEnrolled() {
        try {
          // Debug backend version
          fetch(API + '/api/king-selection/ping-version').then(r => r.json()).then(d => {
            console.log('[Face] Backend version:', d.version);
          }).catch(() => { });

          const { ok, data } = await api('/api/king-selection/client/face-results?slug=' + encodeURIComponent(slug));
          if (ok && data.success && data.total > 0) {
            faceStepSetup.classList.add('hidden');
            faceStepCamera.classList.add('hidden');
            faceStepActive.classList.remove('hidden');
          }
        } catch (_) { }
      }

      faceBtn?.addEventListener('click', () => {
        faceModal.classList.add('active');
        checkFaceEnrolled();
      });

      faceClose?.addEventListener('click', () => {
        faceModal.classList.remove('active');
        stopFaceCamera();
      });

      function stopFaceCamera() {
        if (faceStream) { faceStream.getTracks().forEach(t => t.stop()); faceStream = null; }
        faceStepCamera.classList.add('hidden');
      }

      faceOptCamera?.addEventListener('click', async () => {
        try {
          faceStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          faceVideo.srcObject = faceStream;
          faceStepSetup.classList.add('hidden');
          faceStepCamera.classList.remove('hidden');
        } catch (err) { alert('Câmera não permitida: ' + err.message); }
      });

      async function uploadFace(blob) {
        setFaceStatus('Processando seu rosto...', 'loading');
        const formData = new FormData();
        formData.append('image', blob, 'face.jpg');
        formData.append('slug', slug);

        // Se não temos token e a galeria é pública, usamos o endpoint anônimo
        const isAnon = !token && accessMode === 'public';
        const endpoint = isAnon
          ? API + '/api/king-selection/public/enroll-face-anonymous'
          : API + '/api/king-selection/client/enroll-face-image';

        try {
          const res = await fetch(endpoint + '?slug=' + encodeURIComponent(slug), {
            method: 'POST',
            headers: token ? { 'Authorization': 'Bearer ' + token } : {},
            body: formData
          });
          const data = await res.json();
          if (res.ok) {
            // Se recebemos um token (caso anônimo), salvamos para usar nas próximas chamadas (ex: face-results)
            if (data.token) {
              token = data.token;
              localStorage.setItem('ks_client_token_' + slug, token);
            }
            setFaceStatus('Rosto cadastrado com sucesso!', 'success');
            setTimeout(() => {
              stopFaceCamera();
              faceStepSetup.classList.add('hidden');
              faceStepActive.classList.remove('hidden');
              setFaceStatus('', '');
            }, 1500);
          } else throw new Error(data.message || 'Erro');
        } catch (err) { setFaceStatus(err.message, 'error'); }
      }

      faceCapture?.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        canvas.width = faceVideo.videoWidth; canvas.height = faceVideo.videoHeight;
        canvas.getContext('2d').drawImage(faceVideo, 0, 0);
        canvas.toBlob(blob => uploadFace(blob), 'image/jpeg', 0.9);
      });

      faceUpload?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) uploadFace(file);
      });

      faceReset?.addEventListener('click', () => {
        faceStepActive.classList.add('hidden');
        faceStepSetup.classList.remove('hidden');
        facialFilterIds = null;
        renderGrid();
      });

      document.getElementById('ks-face-search-another')?.addEventListener('change', async function () {
        const file = this.files && this.files[0];
        this.value = '';
        if (!file || !token) return;
        setFaceStatus('Buscando—', 'loading');
        const formData = new FormData();
        formData.append('image', file);
        formData.append('slug', slug);
        try {
          const res = await fetch(API + '/api/king-selection/client/search-face-by-photo?slug=' + encodeURIComponent(slug), {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
          });
          const data = await res.json().catch(() => ({}));
          setFaceStatus('', '');
          if (res.ok && data.success) {
            const ids = Array.isArray(data.photoIds) ? data.photoIds : [];
            facialFilterIds = ids.length ? new Set(ids.map(id => parseInt(id, 10))) : null;
            renderGrid();
            faceModal.classList.remove('active');
            const badge = facialFilterIds ? ' <span class="ks-face-active-badge">FILTRO ATIVO</span>' : '';
            if (projectNameEl) projectNameEl.innerHTML = (gallery?.nome_projeto || slug) + badge;
            if (data.message && ids.length === 0) setFaceStatus(data.message, 'error');
            else if (ids.length > 0) setFaceStatus(ids.length + ' foto(s) encontrada(s).', 'success');
          } else {
            setFaceStatus(data.message || 'Erro na busca.', 'error');
          }
        } catch (e) {
          setFaceStatus('Erro de conexão. Tente de novo.', 'error');
        }
      });

      faceApplyFilter?.addEventListener('click', async () => {
        faceApplyFilter.disabled = true;
        faceApplyFilter.innerHTML = '<i class="fas fa-spinner fa-spin"></i> BUSCANDO...';
        try {
          const { ok, data } = await api('/api/king-selection/client/face-results?slug=' + encodeURIComponent(slug));
          if (ok && data.photoIds) {
            facialFilterIds = new Set(data.photoIds.map(id => parseInt(id, 10)));
            renderGrid();
            faceModal.classList.remove('active');
            const badge = '<span class="ks-face-active-badge">FILTRO ATIVO</span>';
            if (projectNameEl) projectNameEl.innerHTML = (gallery?.nome_projeto || slug) + badge;
          } else alert(data.message || 'Erro ao buscar fotos.');
        } catch (_) { alert('Erro na busca.'); }
        finally { faceApplyFilter.disabled = false; faceApplyFilter.textContent = 'FILTRAR MINHAS FOTOS'; }
      });

      if (slug) {
        initByAccessMode();
      } else {
        loginWrap?.classList.remove('hidden');
        showLoginErr('Link inválido. Acesse pelo link enviado pelo fotógrafo.');
      }
    })();
  </script>
</body>

</html>