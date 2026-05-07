document.addEventListener('DOMContentLoaded', () => {
  const API_URL = (window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || 'https://conectaking-api.onrender.com').replace(/\/$/, '');
  const KS_WORKER_URL = (window.KS_WORKER_URL || 'https://r2.conectaking.com.br').replace(/\/$/, '');
  const qs = new URLSearchParams(window.location.search || '');
  const itemId = qs.get('itemId');
  const galleryId = parseInt(qs.get('galleryId') || '0', 10);
  const TAB_PREF_KEY = `ksProjectActiveTab:${galleryId || 0}`;
  function kingSelectionPainelUrl() {
    const apiLocal = (qs.get('api') || '').toLowerCase() === 'local';
    const q = apiLocal ? '?api=local' : '';
    const h = (window.location.hostname || '').toLowerCase();
    if (h === '127.0.0.1' || h === 'localhost') {
      return `kingSelectionEdit.html${q}`;
    }
    return `/kingSelection${q}`;
  }

  const token = localStorage.getItem('conectaKingToken') || '';
  if (!token) {
    window.location.href = `login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
    return;
  }
  const HEADERS = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  // <img> não envia Authorization header. Para previews protegidos (admin),
  // precisamos buscar via fetch + blob e aplicar via ObjectURL.
  const _previewObjectUrls = new Map(); // cacheKey(url) -> objectURL
  function revokePreviewUrl(cacheKey) {
    const u = _previewObjectUrls.get(cacheKey);
    if (u) URL.revokeObjectURL(u);
    _previewObjectUrls.delete(cacheKey);
  }
  function getPreviewKeysInUse() {
    const set = new Set();
    const els = Array.from(document.querySelectorAll('img[data-cache-key]'));
    els.forEach(img => {
      const k = img.getAttribute('data-cache-key');
      if (k) set.add(String(k));
    });
    return set;
  }
  function revokeAllPreviewUrls() {
    for (const [, u] of _previewObjectUrls.entries()) {
      try { URL.revokeObjectURL(u); } catch (_) { }
    }
    _previewObjectUrls.clear();
  }

  async function fetchPreviewObjectUrl(url) {
    const key = String(url || '');
    if (_previewObjectUrls.has(key)) return _previewObjectUrls.get(key);
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let parsedMsg = null;
      try {
        const j = JSON.parse(text);
        parsedMsg = j && (j.message || j.error);
      } catch (_) { /* não JSON */ }
      throw new Error(parsedMsg || (text && text.slice(0, 300)) || `Falha no preview (${res.status})`);
    }
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('image')) {
      const text = await res.text().catch(() => '');
      let parsedMsg = null;
      try {
        const j = JSON.parse(text);
        parsedMsg = j && (j.message || j.error);
      } catch (_) { /* */ }
      throw new Error(parsedMsg || (text && text.slice(0, 200)) || 'O servidor não devolveu uma imagem.');
    }
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    _previewObjectUrls.set(key, objUrl);
    // Evitar crescimento infinito do cache (sliders geram muitas URLs)
    if (_previewObjectUrls.size > 520) {
      const inUse = getPreviewKeysInUse();
      let removed = 0;
      for (const k of _previewObjectUrls.keys()) {
        if (removed >= 200) break;
        if (inUse.has(k)) continue; // não revogar imagens que estão na tela
        revokePreviewUrl(k);
        removed += 1;
      }
    }
    return objUrl;
  }

  async function setImgPreview(imgEl, { url, photoId, fallbackUrl }) {
    if (!imgEl) return;
    imgEl.classList.add('ks-img-loading');
    try {
      const attemptLoad = async (u) => {
        const prevKey = imgEl.getAttribute('data-cache-key');
        const nextKey = String(u || '');
        if (prevKey && prevKey !== nextKey) revokePreviewUrl(prevKey);
        imgEl.setAttribute('data-cache-key', nextKey);
        const objUrl = await fetchPreviewObjectUrl(u);
        const current = parseInt(imgEl.getAttribute('data-photo-id') || '0', 10);
        const pid = parseInt(photoId, 10) || 0;
        if (pid !== 0 && current && current !== pid) return;
        imgEl.src = objUrl;
        imgEl.removeAttribute('data-preview-error');
      };
      try {
        await attemptLoad(url);
      } catch (firstErr) {
        if (fallbackUrl && String(fallbackUrl) !== String(url)) {
          await attemptLoad(fallbackUrl);
        } else {
          throw firstErr;
        }
      }
    } catch (e) {
      // NÃO zerar a imagem: mantém a última prévia válida para evitar "tela preta"
      imgEl.setAttribute('data-preview-error', '1');

      const id = imgEl.getAttribute('id') || '';
      const msg = (e && e.message) ? e.message : 'Falha ao carregar imagem.';

      // Pré-visualização principal da marca d'água (mostra placeholder no lugar da imagem)
      if (id === 'wm-preview' || id === 'wm-preview-portrait' || id === 'wm-preview-landscape') {
        try {
          if (id === 'wm-preview-portrait' || id === 'wm-preview') {
            if (wmPhP) {
              wmPhP.textContent = msg;
              wmPhP.classList.remove('hidden');
            }
            if (wmPreviewP) wmPreviewP.classList.add('hidden');
          }
          if (id === 'wm-preview-landscape' || id === 'wm-preview') {
            if (wmPhL) {
              wmPhL.textContent = msg;
              wmPhL.classList.remove('hidden');
            }
            if (wmPreviewL) wmPreviewL.classList.add('hidden');
          }
        } catch (_) { }
        showError(msg);
        throw e;
      }

      // Miniatura da marca d'água enviada (não deixa virar "preto")
      if (id === 'wm-file-preview' || id === 'wm-file-preview-p' || id === 'wm-file-preview-l') {
        try {
          imgEl.classList.add('hidden');
          if (wmFilePh) wmFilePh.textContent = msg;
        } catch (_) { }
        throw e;
      }

      if (id === 'ks-link-cover-preview') {
        showError(msg);
        throw e;
      }
    } finally {
      imgEl.classList.remove('ks-img-loading');
    }
  }

  async function runPool(items, limit, worker) {
    const queue = items.slice();
    const runners = Array.from({ length: Math.max(1, limit) }).map(async () => {
      while (queue.length) {
        const it = queue.shift();
        // eslint-disable-next-line no-await-in-loop
        await worker(it);
      }
    });
    await Promise.all(runners);
  }

  const errEl = document.getElementById('ks-error');
  const projectTitle = document.getElementById('ks-project-title');
  const projectSub = document.getElementById('ks-project-sub');

  const panes = Array.from(document.querySelectorAll('[data-pane]'));
  const sideLinks = Array.from(document.querySelectorAll('.ks-side a[data-tab]'));

  const navProjects = document.getElementById('ks-nav-projects');
  const btnBack = document.getElementById('ks-back');
  const btnPanel = document.getElementById('ks-panel');
  const btnDeleteProject = document.getElementById('ks-delete-project');

  // activity
  const aStatus = document.getElementById('ks-status');
  const aSelected = document.getElementById('ks-selected-count');
  const aSelectedSub = document.getElementById('ks-selected-count-sub');
  const aUpdated = document.getElementById('ks-updated-at');
  const aFeedback = document.getElementById('ks-feedback');
  const openExportBtn = document.getElementById('ks-open-export');
  const actMainBtn = document.getElementById('ks-act-main');
  const actMoreBtn = document.getElementById('ks-act-more');
  const actMenu = document.getElementById('ks-act-menu');
  const actFinalize = document.getElementById('ks-act-finalize');
  const actReactivate = document.getElementById('ks-act-reactivate');
  const actShare = document.getElementById('ks-act-share');
  const actDeleteClient = document.getElementById('ks-act-delete-client');
  const actClearReviewBtn = document.getElementById('ks-act-clear-review');
  const actDeleteCurrentRoundBtn = document.getElementById('ks-act-delete-current-round');
  const actDeleteRoundClientBtn = document.getElementById('ks-act-delete-round-client');
  const actRoundsDetail = document.getElementById('ks-activity-rounds-detail');
  // Activity (layout estilo Alboom)
  const actSearch = document.getElementById('ks-activity-search');
  const actSortSel = document.getElementById('ks-activity-sort');
  const actPayFilterSel = document.getElementById('ks-activity-pay-filter');
  const ACT_SORT_KEY = 'ksActivitySort';
  const ACT_PAY_FILTER_KEY = 'ksActivityPayFilter';
  let activitySortMode = sessionStorage.getItem(ACT_SORT_KEY) || 'name_asc';
  let activityPayFilter = sessionStorage.getItem(ACT_PAY_FILTER_KEY) || 'all';
  const actClientName = document.getElementById('ks-activity-client-name');
  const actEmail = document.getElementById('ks-activity-email');
  const actPhone = document.getElementById('ks-activity-phone');
  const actOpenWhatsappBtn = document.getElementById('ks-activity-open-whatsapp');
  const actContactLine = document.getElementById('ks-activity-contact-line');
  const actBadge = document.getElementById('ks-activity-badge');
  const actSalesMini = document.getElementById('ks-activity-sales-mini');
  const actSalesPendingMini = document.getElementById('ks-activity-sales-pending-mini');
  const actSalesApprovedMini = document.getElementById('ks-activity-sales-approved-mini');
  const actPassRow = document.getElementById('ks-activity-pass-row');
  const actPassSpan = document.getElementById('ks-activity-pass');
  const actRevealPassBtn = document.getElementById('ks-activity-reveal-pass');
  const actSelPhotos = document.getElementById('ks-activity-selected-photos');
  const actSelEmpty = document.getElementById('ks-activity-selected-empty');
  const actBatchToolbar = document.getElementById('ks-activity-batch-toolbar');
  const actBatchFilter = document.getElementById('ks-activity-batch-filter');
  const actDeleteBatch = document.getElementById('ks-activity-delete-batch');
  const actReactivateBatch = document.getElementById('ks-activity-reactivate-batch');
  const actOpenNextRound = document.getElementById('ks-activity-open-next-round');
  const actSalesApproveAllBtn = document.getElementById('ks-activity-sales-approve-all');
  const actCommentsBox = document.getElementById('ks-activity-comments-box');
  const actListAnd = document.getElementById('ks-activity-list-andamento');
  const actListRev = document.getElementById('ks-activity-list-revisao');
  const actListFin = document.getElementById('ks-activity-list-finalizado');
  const actCountAnd = document.getElementById('ks-activity-count-andamento');
  const actCountRev = document.getElementById('ks-activity-count-revisao');
  const actCountFin = document.getElementById('ks-activity-count-finalizado');
  const actContactModal = document.getElementById('ks-act-contact-modal');
  const actContactClose = document.getElementById('ks-act-contact-close');
  const actContactNome = document.getElementById('ks-act-contact-nome');
  const actContactEmail = document.getElementById('ks-act-contact-email');
  const actContactPhone = document.getElementById('ks-act-contact-phone');
  const actContactCopyAll = document.getElementById('ks-act-contact-copy-all');

  // details
  const fNome = document.getElementById('f-nome');
  const fCategoria = document.getElementById('f-categoria');
  const fCategoriaOutro = document.getElementById('f-categoria-outro');
  const fMaxSelections = document.getElementById('f-max-selections');
  const fMinSelections = document.getElementById('f-min-selections');
  const fClientCardHeight = document.getElementById('f-client-card-height');
  const fClientCardHeightVal = document.getElementById('f-client-card-height-val');
  const fData = document.getElementById('f-data');
  const fIdioma = document.getElementById('f-idioma');
  const fMsg = document.getElementById('f-mensagem');
  const saveDetailsBtn = document.getElementById('btn-save-details');

  // privacy
  const savePrivacyBtn = document.getElementById('btn-save-privacy');

  // clients (modelo atual: 1 cliente por galeria)
  const selfSignup = document.getElementById('ks-self-signup');
  const saveSelfSignupBtn = document.getElementById('btn-save-selfsignup');
  const clientSearch = document.getElementById('ks-client-search');
  const clientAddBtn = document.getElementById('ks-client-add');
  const clientCountEl = document.getElementById('ks-client-count');
  const clientEmptyEl = document.getElementById('ks-client-empty');
  const clientListEl = document.getElementById('ks-client-list');

  // modais de cliente (editar/compartilhar)
  const clientModal = document.getElementById('ks-client-modal');
  const clientModalTitle = document.getElementById('ks-client-modal-title');
  const clientModalClose = document.getElementById('ks-client-modal-close');
  const clientModalCancel = document.getElementById('ks-client-cancel');
  const clientModalSave = document.getElementById('ks-client-save');
  const cfName = document.getElementById('ks-client-form-name');
  const cfEmail = document.getElementById('ks-client-form-email');
  const cfPhone = document.getElementById('ks-client-form-phone');
  const cfNote = document.getElementById('ks-client-form-note');
  const cfPass = document.getElementById('ks-client-form-pass');
  const cfGenPass = document.getElementById('ks-client-generate-pass');

  const shareModal = document.getElementById('ks-client-share-modal');
  const shareClose = document.getElementById('ks-client-share-close');
  const shareLink = document.getElementById('ks-client-share-link');
  const shareEmail = document.getElementById('ks-client-share-email');
  const sharePass = document.getElementById('ks-client-share-pass');
  const shareCopy = document.getElementById('ks-client-share-copy');
  const shareWhats = document.getElementById('ks-client-share-whats');
  const linksCustomMsg = document.getElementById('ks-links-custom-message');
  const linksFullMsg = document.getElementById('ks-links-full-msg');
  const linksSupportWhats = document.getElementById('ks-links-support-whatsapp');
  const linksSupportLabel = document.getElementById('ks-links-support-label');
  const linksSupportMsg = document.getElementById('ks-links-support-message');
  const linksSupportSave = document.getElementById('ks-links-support-save');
  const linkCoverPhotoSel = document.getElementById('ks-link-cover-photo');
  const linkCoverGrid = document.getElementById('ks-link-cover-grid');
  const linkCoverSearchInput = document.getElementById('ks-link-cover-search');
  const linkCoverPicker = document.getElementById('ks-link-cover-picker');
  const linkCoverOpenGalleryBtn = document.getElementById('ks-link-cover-open-gallery-btn');
  const linkCoverPickerCloseBtn = document.getElementById('ks-link-cover-picker-close');
  const linkCoverPickerApplyBtn = document.getElementById('ks-link-cover-picker-apply');
  const linkCoverPreview = document.getElementById('ks-link-cover-preview');
  const linkCoverCurrentSource = document.getElementById('ks-link-cover-current-source');
  const linkCoverUploadFile = document.getElementById('ks-link-cover-upload-file');
  const linkCoverUploadBtn = document.getElementById('ks-link-cover-upload-btn');
  const supportWhats = document.getElementById('ks-support-whatsapp');
  const supportLabel = document.getElementById('ks-support-label');
  const supportMsg = document.getElementById('ks-support-message');
  const supportSave = document.getElementById('ks-support-save');
  const salesWaTplApproved = document.getElementById('ks-sales-wa-tpl-approved');
  const salesWaTplPending = document.getElementById('ks-sales-wa-tpl-pending');
  const salesWaTplRejected = document.getElementById('ks-sales-wa-tpl-rejected');
  const salesWaTplAwaiting = document.getElementById('ks-sales-wa-tpl-awaiting');
  const salesWaTplSave = document.getElementById('ks-sales-wa-tpl-save');
  const salesWaTplReset = document.getElementById('ks-sales-wa-tpl-reset');
  const promoDisabledNote = document.getElementById('ks-promo-disabled-note');
  const promoWrap = document.getElementById('ks-promo-wrap');
  const promoEnabled = document.getElementById('ks-promo-enabled');
  const promoCode = document.getElementById('ks-promo-code');
  const promoValidDays = document.getElementById('ks-promo-valid-days');
  const promoValidHint = document.getElementById('ks-promo-valid-hint');
  const promoFreePhotos = document.getElementById('ks-promo-free-photos');
  const promoInstructions = document.getElementById('ks-promo-instructions');
  const promoSocialRows = document.getElementById('ks-promo-social-rows');
  const promoAddSocial = document.getElementById('ks-promo-add-social');
  const promoSave = document.getElementById('ks-promo-save');
  const promoFreeHintSales = document.getElementById('ks-promo-free-hint-sales');
  const promoFreeHintPublic = document.getElementById('ks-promo-free-hint-public');
  const promoFreeLabel = document.getElementById('ks-promo-free-label');

  /** Textos padrão para o botão WhatsApp da aba Fotos e vendas; editáveis em Capa do link. */
  const DEFAULT_SALES_WA_TPL = {
    approved:
      'Olá, {{nome}}!\n\n' +
      'As *fotos do {{galeria}}* já foram *aprovadas e confirmadas*.\n\n' +
      'Abra o link abaixo, entre na galeria com o mesmo *nome*, *e-mail* e *WhatsApp* do cadastro e *baixe* suas imagens por lá:\n\n' +
      '{{link}}\n\n' +
      'Qualquer dúvida, é só chamar.',
    pending:
      'Olá, {{nome}}!\n\n' +
      'Sobre as *fotos do {{galeria}}*: sua seleção foi recebida, mas o *pagamento (PIX) ainda está pendente*.\n\n' +
      'Assim que for confirmado, libero os downloads. Você pode acompanhar e reenviar comprovante neste link:\n\n' +
      '{{link}}',
    rejected:
      'Olá, {{nome}}!\n\n' +
      'O comprovante das *fotos do {{galeria}}* foi recusado; ainda falta confirmar o pagamento para liberar os downloads.\n\n' +
      'Reenvie o comprovante pela galeria:\n\n' +
      '{{link}}',
    awaiting:
      'Olá, {{nome}}!\n\n' +
      'Sobre as *fotos do {{galeria}}*: sua seleção e o pagamento estão ok. Estou *revisando as fotos*; em breve libero o download neste link:\n\n' +
      '{{link}}\n\n' +
      'Obrigado pela paciência!'
  };

  const SALES_WA_TEMPLATE_KEY = {
    approved: 'sales_whatsapp_template_approved',
    pending: 'sales_whatsapp_template_pending',
    rejected: 'sales_whatsapp_template_rejected',
    awaiting: 'sales_whatsapp_template_awaiting'
  };

  /** Qual modelo usar no botão WhatsApp (aba Fotos e vendas). */
  function resolveSalesWaTemplateKind({ approvedCount, needsPaymentReminder, awaitingReview, st }) {
    if (approvedCount > 0) return 'approved';
    if (needsPaymentReminder) return st === 'rejected' ? 'rejected' : 'pending';
    if (awaitingReview) return 'awaiting';
    return 'approved';
  }

  let _activeClientId = null;
  let _activeClientEmail = null;
  /** Cliente cujo painel de atividades / seleções está em foco (multi-cliente). */
  let _activityFocusClientId = null;

  // download
  const dAllow = document.getElementById('d-allow');
  const saveDownloadBtn = document.getElementById('btn-save-download');
  const dlLayoutFolders = document.getElementById('ks-dl-layout-folders');
  const dlLayoutFlat = document.getElementById('ks-dl-layout-flat');
  const clientEntrySplash = document.getElementById('ks-client-entry-splash');

  // sales / fotos vendidas por evento
  const salesDisabledNote = document.getElementById('ks-sales-disabled-note');
  const salesWrap = document.getElementById('ks-sales-wrap');
  const salesPixEnabled = document.getElementById('ks-sales-pix-enabled');
  const salesPixKey = document.getElementById('ks-sales-pix-key');
  const salesPixHolder = document.getElementById('ks-sales-pix-holder');
  const salesPixInstructions = document.getElementById('ks-sales-pix-instructions');
  const salesPixGenerateBtn = document.getElementById('ks-sales-pix-generate');
  const salesOverLimit = document.getElementById('ks-sales-over-limit');
  const salesPriceMode = document.getElementById('ks-sales-price-mode');
  const salesUnitPrice = document.getElementById('ks-sales-unit-price');
  const salesAddPackageBtn = document.getElementById('ks-sales-add-package');
  const salesPackagesWrap = document.getElementById('ks-sales-packages');
  const salesClientSel = document.getElementById('ks-sales-client');
  const salesClientSearch = document.getElementById('ks-sales-client-search');
  const salesClientsList = document.getElementById('ks-sales-clients-list');
  const salesRoundSel = document.getElementById('ks-sales-round');
  const salesPaymentStatus = document.getElementById('ks-sales-payment-status');
  const salesPaymentConfirmBtn = document.getElementById('ks-sales-payment-confirm');
  const salesPaymentAdiantamentoBtn = document.getElementById('ks-sales-payment-adiantamento');
  const salesPaymentCourtesyRestBtn = document.getElementById('ks-sales-payment-courtesy-rest');
  const salesPaymentFixAmountBtn = document.getElementById('ks-sales-payment-fix-amount');
  const salesPaymentRejectBtn = document.getElementById('ks-sales-payment-reject');
  const salesPaymentPendingBtn = document.getElementById('ks-sales-payment-pending');
  const salesPaymentUndoConfirmBtn = document.getElementById('ks-sales-payment-undo-confirm');
  const salesPaymentBlessBtn = document.getElementById('ks-sales-payment-bless');
  const salesOpenProofBtn = document.getElementById('ks-sales-open-proof');
  const salesOpenClientWhatsBtn = document.getElementById('ks-sales-open-client-whats');
  const salesPhotosAllPendingBtn = document.getElementById('ks-sales-photos-all-pending');
  const salesApproveAllBtn = document.getElementById('ks-sales-approve-all');
  const salesProofPanel = document.getElementById('ks-sales-proof-panel');
  const salesProofMeta = document.getElementById('ks-sales-proof-meta');
  const salesProofEmpty = document.getElementById('ks-sales-proof-empty');
  const salesProofImgWrap = document.getElementById('ks-sales-proof-img-wrap');
  const salesProofImg = document.getElementById('ks-sales-proof-img');
  const salesEditedFileInput = document.getElementById('ks-sales-edited-file');
  const salesApprovalsWrap = document.getElementById('ks-sales-approvals');
  const salesSaveBtn = document.getElementById('ks-sales-save');
  const salesDashReceived = document.getElementById('ks-sales-dash-received');
  const salesDashMissing = document.getElementById('ks-sales-dash-missing');
  const salesDashCourtesy = document.getElementById('ks-sales-dash-courtesy');
  const salesDashMissingPeriod = document.getElementById('ks-sales-dash-missing-period');
  const salesDashDetailModal = document.getElementById('ks-sales-dash-detail-modal');
  const salesDashDetailTitle = document.getElementById('ks-sales-dash-detail-title');
  const salesDashDetailBody = document.getElementById('ks-sales-dash-detail-body');
  const salesDashDetailTotal = document.getElementById('ks-sales-dash-detail-total');
  const salesDashDetailClose = document.getElementById('ks-sales-dash-detail-close');
  const salesClientsFilter = document.getElementById('ks-sales-clients-filter');
  const salesDashClientsPending = document.getElementById('ks-sales-dash-clients-pending');
  const salesDashRoundsPending = document.getElementById('ks-sales-dash-rounds-pending');
  const salesTopPending = document.getElementById('ks-sales-top-pending');
  const salesTopPendingPeriod = document.getElementById('ks-sales-top-pending-period');
  const salesTermsPhotoRef = document.getElementById('ks-sales-terms-photo-ref');
  const salesTermsCupomNote = document.getElementById('ks-sales-terms-cupom-note');
  const salesTermsNegotiated = document.getElementById('ks-sales-terms-negotiated');
  const salesTermsDown = document.getElementById('ks-sales-terms-down');
  const salesTermsRemaining = document.getElementById('ks-sales-terms-remaining');
  const salesTermsInstallments = document.getElementById('ks-sales-terms-installments');
  const salesTermsIntervalDays = document.getElementById('ks-sales-terms-interval-days');
  const salesTermsHint = document.getElementById('ks-sales-terms-hint');
  const salesTermsSave = document.getElementById('ks-sales-terms-save');

  // watermark
  const wmFileP = document.getElementById('wm-file-p');
  const wmFileL = document.getElementById('wm-file-l');
  const uploadWmBtnP = document.getElementById('btn-upload-wm-p');
  const uploadWmBtnL = document.getElementById('btn-upload-wm-l');
  const removeWmLogoBtn = document.getElementById('btn-remove-wm-logo');
  const saveWmBtn = document.getElementById('btn-save-wm');
  const wmOpacity = document.getElementById('wm-opacity');
  const wmScaleP = document.getElementById('wm-scale-p');
  const wmScaleL = document.getElementById('wm-scale-l');
  const wmOpacityVal = document.getElementById('wm-opacity-val');
  const wmScalePVal = document.getElementById('wm-scale-p-val');
  const wmScaleLVal = document.getElementById('wm-scale-l-val');
  const btnWmFillP = document.getElementById('btn-wm-fill-p');
  const btnWmFillL = document.getElementById('btn-wm-fill-l');
  const btnWmFitP = document.getElementById('btn-wm-fit-p');
  const btnWmFitL = document.getElementById('btn-wm-fit-l');
  const btnWmAlignTopP = document.getElementById('btn-wm-align-top-p');
  const btnWmAlignCenterVP = document.getElementById('btn-wm-align-center-v-p');
  const btnWmAlignBottomP = document.getElementById('btn-wm-align-bottom-p');
  const btnWmAlignLeftL = document.getElementById('btn-wm-align-left-l');
  const btnWmAlignCenterHL = document.getElementById('btn-wm-align-center-h-l');
  const btnWmAlignRightL = document.getElementById('btn-wm-align-right-l');
  const wmRotateP = document.getElementById('wm-rotate-p');
  const wmRotateL = document.getElementById('wm-rotate-l');
  const wmRotatePVal = document.getElementById('wm-rotate-p-val');
  const wmRotateLVal = document.getElementById('wm-rotate-l-val');
  const wmLogoOffsetValP = document.getElementById('wm-logo-offset-val-p');
  const wmLogoOffsetValL = document.getElementById('wm-logo-offset-val-l');
  const btnWmOffsetLeftP = document.getElementById('btn-wm-offset-left-p');
  const btnWmOffsetRightP = document.getElementById('btn-wm-offset-right-p');
  const btnWmOffsetUpP = document.getElementById('btn-wm-offset-up-p');
  const btnWmOffsetDownP = document.getElementById('btn-wm-offset-down-p');
  const btnWmOffsetLeftL = document.getElementById('btn-wm-offset-left-l');
  const btnWmOffsetRightL = document.getElementById('btn-wm-offset-right-l');
  const btnWmOffsetUpL = document.getElementById('btn-wm-offset-up-l');
  const btnWmOffsetDownL = document.getElementById('btn-wm-offset-down-l');
  const wmStretchWP = document.getElementById('wm-stretch-w-p');
  const wmStretchHP = document.getElementById('wm-stretch-h-p');
  const wmStretchWL = document.getElementById('wm-stretch-w-l');
  const wmStretchHL = document.getElementById('wm-stretch-h-l');
  const wmStretchWValP = document.getElementById('wm-stretch-w-val-p');
  const wmStretchHValP = document.getElementById('wm-stretch-h-val-p');
  const wmStretchWValL = document.getElementById('wm-stretch-w-val-l');
  const wmStretchHValL = document.getElementById('wm-stretch-h-val-l');
  const wmPreviewP = document.getElementById('wm-preview-portrait');
  const wmPreviewL = document.getElementById('wm-preview-landscape');
  const wmPhP = document.getElementById('wm-ph-p');
  const wmPhL = document.getElementById('wm-ph-l');
  const wmCurrent = document.getElementById('wm-current');
  const wmFilePreviewP = document.getElementById('wm-file-preview-p');
  const wmFilePreviewL = document.getElementById('wm-file-preview-l');
  const wmFilePh = document.getElementById('wm-file-ph');
  const wmFileFrameP = document.getElementById('wm-file-frame-p');
  const wmFileFrameL = document.getElementById('wm-file-frame-l');
  const wmFileDefaults = document.getElementById('wm-file-defaults');
  const wmFileCustomWrap = document.getElementById('wm-file-custom-wrap');
  const wmFileCustomLabel = document.getElementById('wm-file-custom-label');
  const wmModeLogo = document.getElementById('wm-mode-logo');
  const wmModeLogoWrap = document.getElementById('wm-mode-logo-wrap');
  const wmModeCk = document.getElementById('wm-mode-ck');
  const wmModeCkWrap = document.getElementById('wm-mode-ck-wrap');

  // photos
  const pFile = document.getElementById('p-file');
  const addPhotoBtn = document.getElementById('btn-add-photo'); // pode não existir (agora usamos o botão do drop)
  const _addPhotoBtnHtml = addPhotoBtn?.innerHTML || '';
  // Upload UI (bolinha)
  const bubble = document.getElementById('ks-bubble');
  const bubbleCard = document.getElementById('ks-bubble-card');

  // facial recognition
  const fFaceEnabled = document.getElementById('f-face-enabled');
  const btnSaveFacial = document.getElementById('btn-save-facial-config');
  const btnProcessFacial = document.getElementById('btn-process-facial-all');
  const facialStatusLabel = document.getElementById('facial-status-label');
  const facialProgressBar = document.getElementById('facial-progress-bar');
  const facialProgressText = document.getElementById('facial-progress-text');
  const facialSpinner = document.getElementById('facial-spinner');
  const bubbleBar = document.getElementById('ks-bubble-bar');
  const bubbleTitle = document.getElementById('ks-bubble-title');
  const bubbleFile = document.getElementById('ks-bubble-file');
  const bubbleMeta = document.getElementById('ks-bubble-meta');
  const bubbleCancel = document.getElementById('ks-bubble-cancel');
  // Upload UI (overlay estilo Alboom - cobre toda a área de Fotos)
  const uploadOv = document.getElementById('ks-upload-ov');
  const uploadBar = document.getElementById('ks-upload-bar');
  const uploadTitle = document.getElementById('ks-upload-title');
  const uploadFile = document.getElementById('ks-upload-file');
  const uploadMeta = document.getElementById('ks-upload-meta');
  const uploadCancel = document.getElementById('ks-upload-cancel');
  const dropEl = document.getElementById('ks-drop');
  const pickBtn = document.getElementById('ks-pick');
  const pickFolderBtn = document.getElementById('ks-pick-folder');
  const pFolderFile = document.getElementById('p-folder-file');
  const upListBox = document.getElementById('ks-uplist'); // pode não existir
  const upListMeta = document.getElementById('ks-uplist-meta'); // pode não existir
  const upListItems = document.getElementById('ks-uplist-items'); // pode não existir
  const pGrid = document.getElementById('p-grid');
  const pSelectedBar = document.getElementById('p-selected-bar');
  const pSelectedCount = document.getElementById('p-selected-count');
  const pSelectAll = document.getElementById('p-select-all');
  const pClearSel = document.getElementById('p-clear-sel');
  const pDownloadSel = document.getElementById('p-download-sel');
  const pDeleteSel = document.getElementById('p-delete-sel');
  const pFilterAll = document.getElementById('p-filter-all');
  const pFilterFav = document.getElementById('p-filter-fav');
  const pCountAll = document.getElementById('p-count-all');
  const pCountFav = document.getElementById('p-count-fav');
  const pSearch = document.getElementById('p-search');
  const pPager = document.getElementById('p-pager');
  const pPageLabel = document.getElementById('p-page-label');
  const pPagePrev = document.getElementById('p-page-prev');
  const pPageNext = document.getElementById('p-page-next');
  const pPageNumbers = document.getElementById('p-page-numbers');

  // viewer
  const viewer = document.getElementById('p-viewer');
  const viewerImg = document.getElementById('p-viewer-img');
  const viewerTitle = document.getElementById('p-viewer-title');
  const viewerMeta = document.getElementById('p-viewer-meta');
  const viewerClose = document.getElementById('p-viewer-close');
  const viewerPrev = document.getElementById('p-viewer-prev');
  const viewerNext = document.getElementById('p-viewer-next');
  const viewerDownload = document.getElementById('p-viewer-download');
  const viewerSelect = document.getElementById('p-viewer-select');
  const viewerSelectIcon = document.getElementById('p-viewer-select-icon');
  const viewerDots = document.getElementById('p-viewer-dots');
  const viewerArea = document.getElementById('p-viewer-area');

  // export modal
  const expModal = document.getElementById('ks-export-modal');
  const expClose = document.getElementById('ks-export-close');
  const expTa = document.getElementById('ks-export-ta');
  const expCopy = document.getElementById('ks-export-copy');
  const expBtns = Array.from(document.querySelectorAll('#ks-export-modal [data-exp]'));
  const expScopeAll = document.getElementById('ks-export-scope-all');
  const expScopeFilter = document.getElementById('ks-export-scope-filter');
  const expBatchSel = document.getElementById('ks-export-batch');
  const expFilterBlock = document.getElementById('ks-export-filter-block');
  const expFilterInput = document.getElementById('ks-export-filter-input');
  const expFilterHint = document.getElementById('ks-export-filter-hint');
  const expFilterApply = document.getElementById('ks-export-filter-apply');
  const expAllHint = document.getElementById('ks-export-all-hint');

  // Modal de repetidas
  const dupeOv = document.getElementById('ks-dupe-ov');
  const dupeList = document.getElementById('ks-dupe-list');
  const dupeHint = document.getElementById('ks-dupe-hint');
  const dupeImgOld = document.getElementById('ks-dupe-img-old');
  const dupeImgNew = document.getElementById('ks-dupe-img-new');
  const dupeOldName = document.getElementById('ks-dupe-old-name');
  const dupeNewName = document.getElementById('ks-dupe-new-name');
  const dupeClose = document.getElementById('ks-dupe-close');
  const dupeSkip = document.getElementById('ks-dupe-skip');
  const dupeReplace = document.getElementById('ks-dupe-replace');
  const dupeKeep = document.getElementById('ks-dupe-keep');

  let gallery = null;
  let salesConfigCache = null;
  let salesPackagesCache = [];
  let salesClientsCache = [];
  let salesDetailCache = null;
  let salesEditedPendingPhotoId = 0;
  let salesClientSearchTerm = '';
  let salesPackageDragIdx = -1;
  const KS_TOP_PENDING_PERIOD_KEY = `ksSalesTopPendingPeriod:${galleryId || 0}`;
  function readStoredTopPendingPeriod() {
    try {
      const v = localStorage.getItem(KS_TOP_PENDING_PERIOD_KEY);
      if (v && ['today', 'week', 'month'].includes(v)) return v;
    } catch (e) {}
    return 'week';
  }
  let salesTopPendingPeriodValue = readStoredTopPendingPeriod();
  if (salesTopPendingPeriod) salesTopPendingPeriod.value = salesTopPendingPeriodValue;
  let salesClientsListFilter = 'all';
  /** Último detalhe do dashboard para o modal (recebido / falta / cortesia). */
  let salesDashDetailCache = { received: [], missing: [], courtesy: [] };
  const customShareMsgByGallery = {};
  let shareLinkSaveTimer = null;
  let linkCoverDraftPhotoId = 0;
  let linkCoverSearchTerm = '';

  function computeSalesMiniStatsForClient(clientId) {
    const cid = parseInt(clientId, 10) || 0;
    if (!cid) return { pendingProof: 0, pendingBalanceRounds: 0, approvedPhotos: 0 };
    const cli = salesClientsCache.find((c) => (parseInt(c.id, 10) || 0) === cid);
    const rounds = Array.isArray(cli?.rounds) ? cli.rounds : [];
    let pendingProof = 0;
    let pendingBalanceRounds = 0;
    let approvedPhotos = 0;
    for (const r of rounds) {
      const st = String(r?.payment_status || 'pending').toLowerCase();
      const approvedCount = Math.max(0, parseInt(r?.approved_count, 10) || 0);
      const bal = parseInt(r?.balance_due_cents, 10) || 0;
      if (st === 'pending') pendingProof += 1;
      if (bal > 0 || st === 'partial') pendingBalanceRounds += 1;
      approvedPhotos += approvedCount;
    }
    return { pendingProof, pendingBalanceRounds, approvedPhotos };
  }
  /** Preferência do filtro "Ver seleção" por galeria (`all` ou número da rodada) */
  const activityBatchPrefByGallery = {};
  let exportPayload = { lightroom: '', finder: '', windows: '' };
  let wmMode = 'x';
  let wmOpacityPct = 12;
  let wmScalePortraitPct = 120;
  let wmScaleLandscapePct = 120;
  let wmRotatePortraitDeg = 0;
  let wmRotateLandscapeDeg = 0;
  /** Offset mosaico / marca — retrato (foto vertical) */
  let wmLogoOffsetXPctPortrait = 0;
  let wmLogoOffsetYPctPortrait = 0;
  /** Offset mosaico / marca — paisagem (foto horizontal) */
  let wmLogoOffsetXPctLandscape = 0;
  let wmLogoOffsetYPctLandscape = 0;
  /** Esticar ladrilho por orientação */
  let wmStretchWPctPortrait = 100;
  let wmStretchHPctPortrait = 100;
  let wmStretchWPctLandscape = 100;
  let wmStretchHPctLandscape = 100;
  let wmPreviewTimer = null;
  let wmPreviewInFlight = false;
  let wmPreviewQueued = false;

  let photoFilter = 'all'; // all|fav
  let photoSearch = '';
  let photoPageSize = 20;
  let photoPageIndex = 0;
  let photoFolderFilterId = null; // null=todas
  let photoSortMode = 'order'; // order|name|id
  let folderSortMode = 'name'; // manual|name|count
  let uploadFolderMode = 'all'; // all|folder
  let uploadFolderId = null;
  let selectedPhotoIds = new Set();
  let selectedFolderIds = new Set();
  let viewerIndex = 0;
  let autoFolderJobPollTimer = null;
  let autoFolderLastJobId = null;

  const naturalCollator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

  function cmpNaturalText(a, b) {
    return naturalCollator.compare(String(a || ''), String(b || ''));
  }

  function sortFoldersForUi(folders) {
    const arr = Array.isArray(folders) ? folders.slice() : [];
    if (folderSortMode === 'name') {
      arr.sort((a, b) => cmpNaturalText(a.name, b.name) || (a.id - b.id));
      return arr;
    }
    if (folderSortMode === 'count') {
      arr.sort((a, b) => (parseInt(b.photo_count, 10) || 0) - (parseInt(a.photo_count, 10) || 0) || cmpNaturalText(a.name, b.name));
      return arr;
    }
    arr.sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id));
    return arr;
  }

  function sortPhotosForUi(photos) {
    const arr = Array.isArray(photos) ? photos.slice() : [];
    if (photoSortMode === 'name') {
      arr.sort((a, b) => cmpNaturalText(a.original_name, b.original_name) || ((a.id || 0) - (b.id || 0)));
      return arr;
    }
    if (photoSortMode === 'id') {
      arr.sort((a, b) => (a.id || 0) - (b.id || 0));
      return arr;
    }
    arr.sort((a, b) => {
      const oa = parseInt(a.order, 10) || 0;
      const ob = parseInt(b.order, 10) || 0;
      if (oa !== ob) return oa - ob;
      return (a.id || 0) - (b.id || 0);
    });
    return arr;
  }

  function normalizeFolders(raw) {
    const arr = Array.isArray(raw) ? raw : [];
    return arr
      .map((f) => ({
        id: parseInt(f?.id, 10) || 0,
        name: String(f?.name || '').trim() || 'Pasta',
        sort_order: parseInt(f?.sort_order, 10) || 0,
        cover_photo_id: parseInt(f?.cover_photo_id, 10) || null,
        photo_count: parseInt(f?.photo_count, 10) || 0
      }))
      .filter((f) => f.id > 0)
      .sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id));
  }

  function getGalleryFolders() {
    return sortFoldersForUi(normalizeFolders(gallery?.folders));
  }

  function getUploadFolderId() {
    if (uploadFolderMode !== 'folder') return null;
    const id = parseInt(uploadFolderId || 0, 10) || 0;
    return id > 0 ? id : null;
  }

  function getVisiblePhotos() {
    const photosAll = Array.isArray(gallery?.photos) ? gallery.photos : [];
    const q = (photoSearch || '').toLowerCase().trim();
    const filtered = photosAll.filter(p => {
      if (photoFolderFilterId && (parseInt(p.folder_id, 10) || 0) !== photoFolderFilterId) return false;
      if (photoFilter === 'fav' && !p.is_favorite) return false;
      if (!q) return true;
      return String(p.original_name || '').toLowerCase().includes(q);
    });
    return sortPhotosForUi(filtered);
  }

  function openViewer(photoId) {
    const list = getVisiblePhotos();
    const idx = list.findIndex(p => p.id === photoId);
    viewerIndex = Math.max(0, idx);
    viewer.classList.remove('hidden');
    viewer.classList.add('flex');
    renderViewer();
  }

  function closeViewer() {
    viewer.classList.add('hidden');
    viewer.classList.remove('flex');
    viewerImg.src = '';
  }

  function renderViewer() {
    const list = getVisiblePhotos();
    const p = list[viewerIndex];
    if (!p) return;
    viewerImg.setAttribute('data-photo-id', String(p.id));
    // Carregar via fetch com Authorization
    // ADMIN: na aba Fotos, carregar SEM marca d'água (evita quebrar se a logo/CF estiverem com problema).
    const m = encodeURIComponent(getRadio('wm_mode') || wmMode || 'tile_dense');
    setImgPreview(viewerImg, { url: `${API_URL}/api/king-selection/photos/${p.id}/preview?wm_mode=${m}`, photoId: p.id });
    viewerTitle.textContent = p.original_name || 'Foto';
    viewerMeta.textContent = `${viewerIndex + 1}/${list.length}`;
    if (viewerPrev) viewerPrev.disabled = viewerIndex <= 0;
    if (viewerNext) viewerNext.disabled = viewerIndex >= list.length - 1;
    if (viewerDownload) viewerDownload.onclick = () => downloadPhoto(p.id, p.original_name);

    // Botão Selecionar: estado e ação
    const isSel = selectedPhotoIds.has(p.id);
    if (viewerSelect) {
      viewerSelect.setAttribute('data-selected', isSel ? '1' : '0');
      viewerSelect.title = isSel ? 'Remover da seleção' : 'Selecionar foto';
      if (viewerSelectIcon) {
        viewerSelectIcon.className = isSel ? 'fas fa-check' : 'far fa-circle';
        viewerSelectIcon.style.display = isSel ? 'block' : 'block';
      }
    }

    // Pontos removidos: paginação já existe nas miniaturas (ex.: 87 exibições)
    if (viewerDots) viewerDots.innerHTML = '';
  }

  async function downloadPhoto(photoId, name) {
    const url = `${API_URL}/api/king-selection/photos/${photoId}/download`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      throw new Error(msg || 'Falha ao baixar');
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    const safe = String(name || `foto-${photoId}.jpg`).replace(/[\/\\:*?"<>|]+/g, '-');
    a.href = URL.createObjectURL(blob);
    a.download = safe.endsWith('.jpg') || safe.endsWith('.jpeg') ? safe : `${safe}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  async function toggleFavorite(photoId, next) {
    const res = await fetch(`${API_URL}/api/king-selection/photos/${photoId}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ is_favorite: !!next })
    });
    if (!res.ok) throw new Error('Erro ao favoritar');
    await loadGallery();
  }

  async function setFolderCover(folderId, photoId) {
    const fid = parseInt(folderId, 10) || 0;
    const pid = parseInt(photoId, 10) || 0;
    if (!fid || !pid) return false;
    const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/folders/${fid}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ cover_photo_id: pid })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao definir capa da pasta');
    if (gallery) gallery.folders = Array.isArray(data.folders) ? data.folders : (gallery.folders || []);
    return true;
  }

  async function setCover(photoId, opts = {}) {
    const res = await fetch(`${API_URL}/api/king-selection/photos/${photoId}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ is_cover: true })
    });
    if (!res.ok) throw new Error('Erro ao definir capa');
    // Conveniência: quando a foto pertence a uma pasta, sincroniza também a capa dessa pasta.
    // Evita confusão entre "capa da galeria" e "capa da pasta" no front do cliente.
    const folderId = parseInt(opts?.folderId, 10) || 0;
    if (folderId) {
      try {
        await setFolderCover(folderId, photoId);
      } catch (_) { /* não bloquear capa geral por falha pontual da pasta */ }
    }
    await loadGallery();
  }

  async function deletePhoto(photoId, { skipReload } = {}) {
    const res = await fetchWithTimeout(`${API_URL}/api/king-selection/photos/${photoId}`, {
      method: 'DELETE',
      headers: HEADERS
    }, 45000);
    if (!res.ok) throw new Error('Erro ao excluir foto');
    selectedPhotoIds.delete(photoId);
    if (!skipReload) await loadGallery();
  }

  async function replacePhoto(photoId) {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = async () => {
      const file = inp.files && inp.files[0];
      if (!file) return;
      setUploadUi({ active: true, line: 'Substituindo…', file: file.name, pct: 0 });
      try {
        let key, receipt;
        try {
          const token = await getKsWorkerToken();
          const out = await uploadToWorker(file, { token });
          key = out?.key; receipt = out?.receipt;
        } catch (_) {
          await uploadToR2ProxyForReplace(photoId, file);
          setUploadUi({ active: false });
          await loadGallery();
          return;
        }
        if (!key || !receipt) throw new Error('Resposta inválida');
        const res = await fetchWithTimeout(`${API_URL}/api/king-selection/photos/${photoId}/replace-r2`, {
          method: 'POST', headers: HEADERS,
          body: JSON.stringify({ key, receipt, original_name: file.name || 'foto' })
        }, 15000);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Erro ao substituir');
        await loadGallery();
      } finally {
        setUploadUi({ active: false });
      }
    };
    inp.click();
  }

  function showError(msg) {
    if (!errEl) return;
    errEl.classList.remove('hidden');
    const raw = String(msg || 'Erro');
    // Se vier JSON cru (ex.: {"success":false,"message":"..."}), extrair message
    try {
      const j = JSON.parse(raw);
      const m = j && (j.message || j.error);
      errEl.textContent = String(m || raw);
    } catch (_) {
      errEl.textContent = raw;
    }
  }

  function hideError() {
    errEl?.classList.add('hidden');
  }

  // Se acontecer erro inesperado (ex.: rate-limit estourando), não “derruba” a tela.
  window.addEventListener('error', (ev) => {
    try {
      const m = ev?.message || 'Erro inesperado na página.';
      showError(m);
      setUploadUi({ active: false });
      try { uploadState.running = false; } catch (_) { }
    } catch (_) { }
  });
  window.addEventListener('unhandledrejection', (ev) => {
    try {
      const m = ev?.reason?.message || ev?.reason || 'Erro inesperado (promise).';
      showError(m);
      setUploadUi({ active: false });
      try { uploadState.running = false; } catch (_) { }
    } catch (_) { }
  });

  function setActiveTab(tab) {
    // A navegação do topo (Meus projetos / Clientes / Configurações) usa `setActiveTab('clients')`,
    // mas a aba "clients" não existe na lista lateral (sideLinks). Como a validação era só pelos links,
    // o código caía no fallback "activity" e parecia que a aba Clientes não funcionava.
    // Validar pelo conjunto real de panes existentes.
    const paneTabs = panes.map((p) => String(p.getAttribute('data-pane') || '').trim()).filter(Boolean);
    const sideTabs = sideLinks.map((a) => String(a.getAttribute('data-tab') || '').trim()).filter(Boolean);
    const validTabs = new Set([...paneTabs, ...sideTabs]);
    const nextTab = validTabs.has(String(tab || '')) ? String(tab) : 'activity';
    sideLinks.forEach(a => a.classList.toggle('active', a.getAttribute('data-tab') === nextTab));
    panes.forEach(p => p.classList.toggle('hidden', p.getAttribute('data-pane') !== nextTab));
    try { localStorage.setItem(TAB_PREF_KEY, nextTab); } catch (_) { }
    if (nextTab === 'photos') {
      renderPhotos();
      loadImageQualityFromGallery();
    }
    if (nextTab === 'activity') renderAll();
    if (nextTab === 'facial') loadFacialConfig();
    if (nextTab === 'image-quality') loadImageQualityFromGallery();
    if (nextTab === 'links') refreshLinksPane().catch(() => { });
    if (nextTab === 'link-cover') refreshLinkCoverPane();
    if (nextTab === 'support') syncSupportFieldsFromGallery();
    if (nextTab === 'promo') syncPromoFromGallery();
    if (nextTab === 'sales') refreshSalesUi().catch((e) => showError(e?.message || 'Erro ao abrir vendas'));
  }

  function fmtDate(d) {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return String(d);
      return dt.toLocaleString('pt-BR');
    } catch (e) {
      return String(d);
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /** E-mail sintético (visitante / cadastro) — não exibir como contacto do cliente. */
  function isPlaceholderClienteEmail(email) {
    const e = String(email || '').trim().toLowerCase();
    return !e || e === '-' || e.endsWith('@cadastro.kingselection.invalid') || e.endsWith('@internal.king');
  }

  function ksNormGalleryStatus(raw) {
    return String(raw || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  // ============================================================
  // Toast (substitui alert): feedback bonito e não intrusivo
  // ============================================================
  const toastHost = document.getElementById('ks-toast-host');
  function toast(message, { title, kind = 'ok', ttlMs = 2600 } = {}) {
    if (!toastHost) {
      // fallback
      // eslint-disable-next-line no-alert
      alert(String(message || ''));
      return;
    }
    const msg = String(message || '').trim();
    const t = String(title || (kind === 'err' ? 'Erro' : (kind === 'warn' ? 'Atenção' : 'Pronto'))).trim();
    const ic = (kind === 'err') ? 'fa-triangle-exclamation' : (kind === 'warn' ? 'fa-circle-info' : 'fa-circle-check');
    const el = document.createElement('div');
    el.className = `ks-toast ${kind}`;
    el.innerHTML = `
      <div class="ic"><i class="fas ${ic}"></i></div>
      <div class="tx">
        <div class="ttl">${escapeHtml(t)}</div>
        <div class="msg">${escapeHtml(msg)}</div>
      </div>
      <div class="x"><button type="button" aria-label="Fechar"><i class="fas fa-times"></i></button></div>
    `;
    const btn = el.querySelector('button');
    const close = () => {
      el.style.animation = 'ksToastOut .16s ease forwards';
      setTimeout(() => { try { el.remove(); } catch (_) { } }, 180);
    };
    btn?.addEventListener('click', close);
    toastHost.appendChild(el);
    setTimeout(close, Math.max(1200, parseInt(ttlMs, 10) || 2600));
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text || '');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text || '';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  /** Mesma regra da aba Cupom: vendas com promo, ou público com download permitido + promo. */
  function shareLinkShouldIncludePromoCupomParam() {
    const g = gallery;
    if (!g?.promo_enabled) return false;
    const code = String(g.promo_coupon_code || '').trim();
    if (!code) return false;
    if (isSalesModeEnabled()) return true;
    const am = String(g.access_mode || '').toLowerCase();
    return am === 'public' && !!g.allow_download;
  }

  function promoShareAutoMessageHint() {
    if (!shareLinkShouldIncludePromoCupomParam()) return '';
    const code = String(gallery.promo_coupon_code || '').trim();
    return code
      ? `Cupom para a pessoa digitar na galeria (não vai preenchido sozinho): «${code}». Peça para seguir as redes e validar o código manualmente.`
      : '';
  }

  function buildClientLink() {
    const u = new URL(`${window.location.origin}/kingSelection/${encodeURIComponent(gallery.slug)}`);
    return u.toString();
  }

  function getCoverVersion() {
    const photos = Array.isArray(gallery?.photos) ? gallery.photos : [];
    const cover = photos.find(p => !!p.is_cover) || photos[0];
    return cover && cover.id ? String(cover.id) : '0';
  }

  // Link de compartilhamento: formato curto kingSelection/slug (ex.: conectaking.com.br/kingSelection/ricardoprotonz)
  function buildClientShareLink() {
    const base = (window.KING_SELECTION_SHARE_BASE_URL || window.location.origin).toString().trim().replace(/\/$/, '');
    const v = getCoverVersion();
    const u = new URL(`${base}/kingSelection/${encodeURIComponent(gallery.slug)}`);
    u.searchParams.set('v', v);
    return u.toString();
  }

  function getClientPassPlain() {
    return String(gallery?._client_password || gallery?.senha || '').trim();
  }

  function normalizeWhatsDigits(v) {
    return String(v || '').replace(/\D/g, '').trim();
  }

  function resolveWhatsappDigits(rawPhone) {
    let digits = normalizeWhatsDigits(rawPhone || '');
    // Convenção BR: se vier só DDD+número, prefixa 55.
    if (digits && (digits.length === 10 || digits.length === 11)) {
      digits = `55${digits}`;
    }
    return digits;
  }

  function buildWhatsMessage() {
    const link = buildClientShareLink();
    const nome = gallery.nome_projeto || 'sua galeria';
    const custom = String(linksCustomMsg?.value || customShareMsgByGallery[galleryId] || '').trim();
    const cupHint = promoShareAutoMessageHint();
    const base = [
      `Olá!`,
      ``,
      `As fotos de ${nome} estão disponíveis para seleção.`,
      ``,
      ...(cupHint ? [cupHint, ``] : []),
      `Link:`,
      link
    ];
    if (custom) {
      base.push('', custom);
    }
    return base.join('\n');
  }

  function trimShareField(raw, maxLen) {
    const t = String(raw ?? '').trim();
    return t.length ? t.slice(0, maxLen) : null;
  }

  function shareLinkHasFullOverride() {
    const v = gallery?.share_link_full_message;
    return v != null && String(v).trim() !== '';
  }

  /** Acesso privado (lista de clientes com e-mail/senha definidos pelo fotógrafo). Outros modos: autocadastro ou vendas → não enviar credenciais na mensagem genérica. */
  function shareMessageShouldIncludeClientCredentials() {
    const am = String(gallery?.access_mode || 'private').toLowerCase();
    return am === 'private';
  }

  /**
   * Texto automático para WhatsApp/cópia: em acesso privado com 1 cliente, inclui e-mail e senha.
   * Vários clientes: orienta a usar "Copiar acesso" na aba Clientes.
   */
  async function buildAutoShareMessageText() {
    const link = buildClientShareLink();
    const nome = gallery.nome_projeto || 'sua galeria';
    const custom = String(linksCustomMsg?.value || customShareMsgByGallery[galleryId] || '').trim();

    function baseSimple() {
      const cupHint = promoShareAutoMessageHint();
      const lines = [
        `Olá!`,
        ``,
        `As fotos de ${nome} estão disponíveis para seleção.`,
        ``,
        ...(cupHint ? [cupHint, ``] : []),
        `Link:`,
        link
      ];
      if (custom) lines.push('', custom);
      return lines.join('\n');
    }

    if (!shareMessageShouldIncludeClientCredentials()) {
      return baseSimple();
    }

    const clients = (Array.isArray(gallery?.clients) ? gallery.clients : []).filter((c) => c && c.enabled !== false);
    if (clients.length === 1) {
      const c = clients[0];
      const cid = parseInt(c.id, 10);
      if (cid) {
        try {
          const pw = await fetchClientPassword(cid);
          const core = buildWhatsMessageForClient({ email: c.email, password: pw });
          if (custom) return `${core}\n\n${custom}`;
          return core;
        } catch (_) {
          /* segue para texto sem senha */
        }
      }
    }

    let out = baseSimple();
    if (clients.length > 1) {
      out += '\n\nEsta galeria tem mais de um cliente. Na aba "Clientes", use "Copiar acesso" em cada cartão para enviar o e-mail e a senha corretos.';
    } else if (clients.length === 0) {
      out += '\n\nCadastre o cliente na aba "Clientes" para que a mensagem automática possa incluir e-mail e senha.';
    }
    return out;
  }

  /** Modo automático: recalcula a partir do projeto + link + opcional. Com texto gravado em `share_link_full_message`, mantém o texto do utilizador. */
  async function refreshShareMessagePreview(opts = { forceAuto: false }) {
    const ta = linksFullMsg;
    if (!ta) return;
    if (!opts.forceAuto && shareLinkHasFullOverride()) {
      ta.value = String(gallery.share_link_full_message);
      return;
    }
    try {
      ta.value = await buildAutoShareMessageText();
    } catch (_) {
      ta.value = buildWhatsMessage();
    }
  }

  function getShareFullMessageText() {
    return String(linksFullMsg?.value ?? buildWhatsMessage());
  }

  /** Para enviar ao WhatsApp ou quando o texto automático precisa da senha (acesso privado). */
  async function resolveShareFullMessageForSend() {
    if (shareLinkHasFullOverride()) {
      return String(linksFullMsg?.value || '');
    }
    try {
      return await buildAutoShareMessageText();
    } catch (_) {
      return buildWhatsMessage();
    }
  }

  async function persistShareLinkFields(payload) {
    await savePatch(payload);
    if (gallery && typeof gallery === 'object') {
      if (Object.prototype.hasOwnProperty.call(payload, 'share_link_custom_append')) {
        gallery.share_link_custom_append = payload.share_link_custom_append;
      }
      if (Object.prototype.hasOwnProperty.call(payload, 'share_link_full_message')) {
        gallery.share_link_full_message = payload.share_link_full_message;
      }
    }
  }

  function scheduleShareLinkSave(payload) {
    clearTimeout(shareLinkSaveTimer);
    shareLinkSaveTimer = setTimeout(() => {
      persistShareLinkFields(payload).catch((e) => showError(e?.message || 'Erro ao salvar texto de partilha'));
    }, 700);
  }

  function getCurrentCoverPhotoId() {
    return parseInt(gallery?.gallery_link_cover_photo_id || 0, 10) || 0;
  }

  function hasExternalLinkCover() {
    return !!String(gallery?.gallery_link_cover_file_path || '').trim();
  }

  async function setGalleryCover(photoId) {
    const pid = parseInt(photoId, 10) || 0;
    if (!pid) throw new Error('Selecione uma foto para capa do link.');
    await savePatch({
      gallery_link_cover_photo_id: pid,
      gallery_link_cover_file_path: null
    });
  }

  async function uploadExternalLinkCover(file) {
    if (!file) throw new Error('Selecione um arquivo de imagem.');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/link-cover-upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao enviar capa externa.');
    return data;
  }

  function getSortedPhotosForLinkCover() {
    const photos = Array.isArray(gallery?.photos) ? gallery.photos.slice() : [];
    return photos.sort((a, b) => (photoOrderVal(a) - photoOrderVal(b)) || ((a.id || 0) - (b.id || 0)));
  }

  function closeLinkCoverPicker() {
    if (linkCoverPicker) linkCoverPicker.classList.add('hidden');
    document.body.classList.remove('ks-link-cover-modal-open');
  }

  function renderLinkCoverPickerGrid() {
    if (!linkCoverGrid || !linkCoverPhotoSel) return;
    const sorted = getSortedPhotosForLinkCover();
    const term = String(linkCoverSearchTerm || '').trim().toLowerCase();
    const visible = !term
      ? sorted
      : sorted.filter((p) => String(p?.original_name || `foto-${p?.id || ''}`).toLowerCase().includes(term));
    if (!visible.length) {
      if (term) {
        linkCoverGrid.innerHTML = '<div class="text-xs ks-muted">Nenhuma foto encontrada para essa busca.</div>';
      } else {
        linkCoverGrid.innerHTML = '<div class="text-xs ks-muted">Sem fotos nesta galeria para escolher.</div>';
      }
      if (linkCoverPickerApplyBtn) linkCoverPickerApplyBtn.disabled = true;
      return;
    }
    if (!sorted.length) {
      linkCoverGrid.innerHTML = '<div class="text-xs ks-muted">Sem fotos nesta galeria para escolher.</div>';
      if (linkCoverPickerApplyBtn) linkCoverPickerApplyBtn.disabled = true;
      return;
    }
    const pickedId = parseInt(linkCoverDraftPhotoId || 0, 10) || 0;
    linkCoverGrid.innerHTML = visible.map((p) => {
      const pid = parseInt(p.id, 10) || 0;
      const nm = String(p.original_name || `Foto #${pid}`).trim();
      const isSel = pid === pickedId;
      return `
        <button type="button" data-link-cover-card="${pid}" class="rounded-lg overflow-hidden border ${isSel ? 'border-amber-400' : 'border-slate-300'} bg-white/70 text-left">
          <img data-link-cover-pid="${pid}" alt="${escapeHtml(nm)}" style="width:100%;height:110px;object-fit:cover;display:block;background:#0b0b0b" />
          <div class="px-2 py-1 text-[11px] font-semibold truncate ${isSel ? 'text-amber-700' : 'text-slate-700'}">${escapeHtml(nm)}</div>
        </button>
      `;
    }).join('');
    if (linkCoverPickerApplyBtn) linkCoverPickerApplyBtn.disabled = !pickedId;
    Array.from(linkCoverGrid.querySelectorAll('img[data-link-cover-pid]')).forEach((img) => {
      const pid = parseInt(img.getAttribute('data-link-cover-pid') || '0', 10) || 0;
      if (!pid) return;
      img.setAttribute('data-photo-id', String(pid));
      setImgPreview(img, { url: `${API_URL}/api/king-selection/photos/${pid}/preview?wm_mode=none`, photoId: pid }).catch(() => { });
    });
  }

  function openLinkCoverPicker() {
    if (!linkCoverPicker || !linkCoverPhotoSel) return;
    const sorted = getSortedPhotosForLinkCover();
    if (!sorted.length) {
      toast('Esta galeria ainda não tem fotos para usar como capa.', { kind: 'warn', title: 'Sem fotos' });
      return;
    }
    const cur = parseInt(linkCoverPhotoSel.value || '0', 10) || (parseInt(sorted[0]?.id, 10) || 0);
    linkCoverDraftPhotoId = cur;
    linkCoverSearchTerm = '';
    if (linkCoverSearchInput) linkCoverSearchInput.value = '';
    renderLinkCoverPickerGrid();
    linkCoverPicker.classList.remove('hidden');
    document.body.classList.add('ks-link-cover-modal-open');
    try { linkCoverPicker.scrollTop = 0; } catch (_) { }
  }

  function refreshLinkCoverPane() {
    if (!linkCoverPhotoSel) return;
    const sorted = getSortedPhotosForLinkCover();
    closeLinkCoverPicker();
    linkCoverDraftPhotoId = 0;

    if (!sorted.length) {
      linkCoverPhotoSel.innerHTML = '<option value="">Sem fotos na galeria</option>';
      if (linkCoverOpenGalleryBtn) linkCoverOpenGalleryBtn.disabled = true;
      if (linkCoverPreview) {
        if (hasExternalLinkCover()) {
          linkCoverPreview.setAttribute('data-photo-id', '0');
          setImgPreview(
            linkCoverPreview,
            { url: `${API_URL}/api/king-selection/galleries/${galleryId}/link-cover-preview?t=${Date.now()}`, photoId: 0 }
          ).catch(() => { });
        } else {
          linkCoverPreview.removeAttribute('src');
        }
      }
      if (linkCoverCurrentSource) {
        linkCoverCurrentSource.textContent = hasExternalLinkCover()
          ? 'Origem atual: imagem externa'
          : 'Origem atual: sem capa definida';
      }
      return;
    }

    linkCoverPhotoSel.innerHTML = sorted.map((p) => {
      const pid = parseInt(p.id, 10) || 0;
      const nm = String(p.original_name || `Foto #${pid}`).trim();
      const ord = photoOrderVal(p);
      const label = ord > 0 ? `${ord} — ${nm}` : nm;
      return `<option value="${pid}">${escapeHtml(label)}</option>`;
    }).join('');
    const coverId = parseInt(getCurrentCoverPhotoId() || '0', 10) || (parseInt(sorted[0]?.id, 10) || 0);
    const currentPick = parseInt(linkCoverPhotoSel.value || '0', 10) || 0;
    const selectedId = sorted.some((p) => (parseInt(p.id, 10) || 0) === currentPick) ? currentPick : coverId;
    if (selectedId) linkCoverPhotoSel.value = String(selectedId);
    if (linkCoverOpenGalleryBtn) linkCoverOpenGalleryBtn.disabled = false;

    if (linkCoverPreview) {
      const pid = parseInt(linkCoverPhotoSel.value || '0', 10) || 0;
      if (hasExternalLinkCover()) {
        linkCoverPreview.setAttribute('data-photo-id', '0');
        setImgPreview(
          linkCoverPreview,
          { url: `${API_URL}/api/king-selection/galleries/${galleryId}/link-cover-preview?t=${Date.now()}`, photoId: 0 }
        ).catch(() => { });
      } else if (pid) {
        linkCoverPreview.setAttribute('data-photo-id', String(pid));
        setImgPreview(linkCoverPreview, { url: `${API_URL}/api/king-selection/photos/${pid}/preview?wm_mode=none`, photoId: pid }).catch(() => { });
      }
    }
    if (linkCoverCurrentSource) {
      linkCoverCurrentSource.textContent = hasExternalLinkCover()
        ? 'Origem atual: imagem externa'
        : 'Origem atual: foto da galeria atual';
    }
  }

  async function refreshLinksPane() {
    if (!gallery?.slug) return;
    try {
      await loadExport();
    } catch (_) { /* senha pode falhar; link continua válido */
    }

    const prod = buildClientShareLink();
    const local = buildClientLink();
    const prodEl = document.getElementById('ks-links-prod-url');
    const localWrap = document.getElementById('ks-links-local-wrap');
    const localEl = document.getElementById('ks-links-local-url');
    if (prodEl) prodEl.value = prod;
    const same = prod.replace(/\/$/, '') === local.replace(/\/$/, '');
    if (localWrap && localEl) {
      localWrap.classList.toggle('hidden', same);
      localEl.value = local;
    }

    if (linksCustomMsg) {
      const persisted = gallery?.share_link_custom_append;
      const v = persisted != null ? String(persisted) : String(customShareMsgByGallery[galleryId] || '');
      linksCustomMsg.value = v;
      customShareMsgByGallery[galleryId] = String(linksCustomMsg.value || '').trim();
    }
    try {
      await refreshShareMessagePreview();
    } catch (_) { }

    if (linksSupportWhats) linksSupportWhats.value = String(gallery?.support_whatsapp_number || '').trim();
    if (linksSupportLabel) linksSupportLabel.value = String(gallery?.support_whatsapp_label || '').trim();
    if (linksSupportMsg) linksSupportMsg.value = String(gallery?.support_whatsapp_message || '').trim();
    syncSupportFieldsFromGallery();
    refreshLinkCoverPane();
  }

  function applySalesWaPlaceholders(tpl, { nome, link, galeria }) {
    return String(tpl || '')
      .replace(/\{\{nome\}\}/gi, nome)
      .replace(/\{\{link\}\}/gi, link)
      .replace(/\{\{galeria\}\}/gi, galeria);
  }

  /** Monta a mensagem do botão WhatsApp na aba vendas (mesma lógica de `resolveSalesWaTemplateKind`). */
  function buildSalesClientWhatsMessage({ approvedCount, needsPaymentReminder, awaitingReview, st, nomeCli, link, nomeGaleria }) {
    const kind = resolveSalesWaTemplateKind({ approvedCount, needsPaymentReminder, awaitingReview, st });
    const key = SALES_WA_TEMPLATE_KEY[kind];
    const raw = gallery?.[key];
    const def = DEFAULT_SALES_WA_TPL[kind] || DEFAULT_SALES_WA_TPL.approved;
    const tpl = raw != null && String(raw).trim() !== '' ? String(raw) : def;
    return applySalesWaPlaceholders(tpl, { nome: nomeCli, link, galeria: nomeGaleria });
  }

  function syncSupportFieldsFromGallery() {
    if (supportWhats) supportWhats.value = String(gallery?.support_whatsapp_number || '').trim();
    if (supportLabel) supportLabel.value = String(gallery?.support_whatsapp_label || '').trim();
    if (supportMsg) supportMsg.value = String(gallery?.support_whatsapp_message || '').trim();
    const fill = (el, dbKey, fallback) => {
      if (!el) return;
      const v = gallery?.[dbKey];
      el.value = v != null && String(v).trim() !== '' ? String(v) : fallback;
    };
    fill(salesWaTplApproved, 'sales_whatsapp_template_approved', DEFAULT_SALES_WA_TPL.approved);
    fill(salesWaTplPending, 'sales_whatsapp_template_pending', DEFAULT_SALES_WA_TPL.pending);
    fill(salesWaTplRejected, 'sales_whatsapp_template_rejected', DEFAULT_SALES_WA_TPL.rejected);
    fill(salesWaTplAwaiting, 'sales_whatsapp_template_awaiting', DEFAULT_SALES_WA_TPL.awaiting);
  }

  function buildSalesWaTemplatesPayload() {
    const trimOrNull = (raw) => {
      const t = String(raw ?? '').trim();
      return t.length ? t.slice(0, 4000) : null;
    };
    return {
      sales_whatsapp_template_approved: trimOrNull(salesWaTplApproved?.value),
      sales_whatsapp_template_pending: trimOrNull(salesWaTplPending?.value),
      sales_whatsapp_template_rejected: trimOrNull(salesWaTplRejected?.value),
      sales_whatsapp_template_awaiting: trimOrNull(salesWaTplAwaiting?.value)
    };
  }

  function collectPromoSocialLinks() {
    const wrap = promoSocialRows;
    if (!wrap) return [];
    const rows = wrap.querySelectorAll('[data-promo-social-row]');
    const out = [];
    rows.forEach((row) => {
      const h = row.querySelector('[data-promo-field="handle"]')?.value || '';
      const u = row.querySelector('[data-promo-field="url"]')?.value || '';
      if (String(u).trim()) out.push({ handle: String(h).trim().slice(0, 80), url: String(u).trim().slice(0, 500) });
    });
    return out;
  }

  function renderPromoSocialEditor(links) {
    if (!promoSocialRows) return;
    const arr = Array.isArray(links) && links.length ? links.slice() : [{ handle: '', url: '' }];
    promoSocialRows.innerHTML = arr
      .map(
        (row, i) => `
      <div class="flex flex-wrap gap-2 items-end" data-promo-social-row="${i}">
        <div class="ks-field flex-1 min-w-[140px]">
          <label class="text-xs">@ / nome</label>
          <input type="text" class="ks-input mt-1" data-promo-field="handle" value="${escapeHtml(String(row.handle || ''))}" placeholder="@seu_estudio" />
        </div>
        <div class="ks-field flex-[2] min-w-[200px]">
          <label class="text-xs">URL do perfil</label>
          <input type="url" class="ks-input mt-1" data-promo-field="url" value="${escapeHtml(String(row.url || ''))}" placeholder="https://instagram.com/..." />
        </div>
        <button type="button" class="ks-btn" data-promo-remove-social="" title="Remover"><i class="fas fa-trash"></i></button>
      </div>`
      )
      .join('');
    promoSocialRows.querySelectorAll('[data-promo-remove-social]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = btn.closest('[data-promo-social-row]');
        row?.remove();
        if (!promoSocialRows.querySelector('[data-promo-social-row]')) {
          renderPromoSocialEditor([]);
        }
      });
    });
  }

  function syncPromoFromGallery() {
    if (!gallery) return;
    const g = gallery;
    const salesOn = isSalesModeEnabled();
    const accessMode = String(g.access_mode || '').toLowerCase();
    const publicDl = accessMode === 'public' && !!g.allow_download;
    const promoEligible = salesOn || publicDl;
    if (promoDisabledNote) promoDisabledNote.classList.toggle('hidden', promoEligible);
    if (promoWrap) promoWrap.classList.toggle('hidden', !promoEligible);
    if (!promoEligible) return;
    const maxFree = salesOn ? 50 : 5000;
    if (promoFreePhotos) {
      promoFreePhotos.min = 1;
      promoFreePhotos.max = maxFree;
      promoFreePhotos.value = String(Math.max(1, Math.min(maxFree, parseInt(g.promo_free_photo_count, 10) || 1)));
    }
    if (promoFreeHintSales && promoFreeHintPublic) {
      if (salesOn) {
        promoFreeHintSales.classList.remove('hidden');
        promoFreeHintPublic.classList.add('hidden');
      } else {
        promoFreeHintSales.classList.add('hidden');
        promoFreeHintPublic.classList.remove('hidden');
      }
    }
    if (promoFreeLabel) {
      promoFreeLabel.textContent = salesOn
        ? 'Fotos isentas pelo cupom (no valor estimado)'
        : 'Quantas fotos liberar para baixar (cupom válido)';
    }
    if (promoEnabled) promoEnabled.checked = !!g.promo_enabled;
    if (promoCode) promoCode.value = String(g.promo_coupon_code || '').trim();
    if (promoInstructions) promoInstructions.value = String(g.promo_instructions || '').trim();
    if (promoValidDays) promoValidDays.value = '';
    let links = g.promo_social_links;
    if (typeof links === 'string') {
      try {
        links = JSON.parse(links || '[]');
      } catch (_) {
        links = [];
      }
    }
    renderPromoSocialEditor(Array.isArray(links) ? links : []);
    if (promoValidHint) {
      const vu = g.promo_valid_until;
      promoValidHint.textContent = vu
        ? `Válido até ${new Date(vu).toLocaleString('pt-BR')}. Informe dias acima para renovar a partir de agora.`
        : 'Sem expiração (ou ainda não definida). Informe dias para criar/renovar prazo.';
    }
  }

  function buildSupportPayload(whatsValue, labelValue, msgValue) {
    return {
      support_whatsapp_number: normalizeWhatsDigits(whatsValue || ''),
      support_whatsapp_label: String(labelValue || '').trim().slice(0, 120) || null,
      support_whatsapp_message: String(msgValue || '').trim().slice(0, 1200) || null
    };
  }

  function setRadio(name, value) {
    const els = Array.from(document.querySelectorAll(`input[name="${name}"]`));
    els.forEach(r => { r.checked = (r.value === value); });
  }

  function getRadio(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : null;
  }

  function clamp(n, a, b) {
    const x = Number(n);
    if (Number.isNaN(x)) return a;
    return Math.max(a, Math.min(b, x));
  }

  function normalizeClientCardHeightPx(v) {
    return Math.max(160, Math.min(420, parseInt(v, 10) || 220));
  }

  function refreshClientCardHeightLabel() {
    if (!fClientCardHeightVal) return;
    const px = normalizeClientCardHeightPx(fClientCardHeight?.value);
    fClientCardHeightVal.textContent = `${px}px`;
  }

  function isCustomWmRef(p) {
    const s = String(p == null ? '' : p).trim();
    if (!s) return false;
    const low = s.toLowerCase();
    return s.startsWith('cfimage:') || low.startsWith('r2:') || low.includes('imagedelivery.net/');
  }

  function galleryHasCustomWmPath() {
    const g = gallery;
    if (!g) return false;
    return isCustomWmRef(g.watermark_path)
      || isCustomWmRef(g.watermark_path_portrait)
      || isCustomWmRef(g.watermark_path_landscape);
  }

  function normalizeGalleryWatermarkPaths(g) {
    if (!g || typeof g !== 'object') return;
    for (const k of ['watermark_path', 'watermark_path_portrait', 'watermark_path_landscape']) {
      const v = g[k];
      if (v === undefined || v === null || String(v).trim() === '') g[k] = null;
    }
  }

  function getWmParams() {
    let mode = getRadio('wm_mode') || wmMode || 'x';
    const hasCustom = galleryHasCustomWmPath();
    // Se não há marca personalizada enviada, não permitir modo "logo" (evita 500/422 no preview)
    if (mode === 'logo' && !hasCustom) mode = 'tile_dense';
    // Se há marca personalizada enviada, não permitir modo "tile_dense" (Conecta King) para evitar conflito
    if (mode === 'tile_dense' && hasCustom) mode = 'logo';
    const opPct = clamp(parseInt(wmOpacity?.value || String(wmOpacityPct), 10), 0, 100);
    const scPPct = clamp(parseInt(wmScaleP?.value || String(wmScalePortraitPct), 10), 10, 500);
    const scLPct = clamp(parseInt(wmScaleL?.value || String(wmScaleLandscapePct), 10), 10, 500);
    const rp = parseInt(wmRotateP?.value || String(wmRotatePortraitDeg || 0), 10) || 0;
    const rl = parseInt(wmRotateL?.value || String(wmRotateLandscapeDeg || 0), 10) || 0;
    const rotatePortrait = [0, 90, 180, 270].includes(rp) ? rp : 0;
    const rotateLandscape = [0, 90, 180, 270].includes(rl) ? rl : 0;
    const oxP = clamp(parseFloat(String(wmLogoOffsetXPctPortrait)), -50, 50);
    const oyP = clamp(parseFloat(String(wmLogoOffsetYPctPortrait)), -50, 50);
    const oxL = clamp(parseFloat(String(wmLogoOffsetXPctLandscape)), -50, 50);
    const oyL = clamp(parseFloat(String(wmLogoOffsetYPctLandscape)), -50, 50);
    const stWP = clamp(parseInt(wmStretchWP?.value || String(wmStretchWPctPortrait), 10), 50, 400);
    const stHP = clamp(parseInt(wmStretchHP?.value || String(wmStretchHPctPortrait), 10), 50, 400);
    const stWL = clamp(parseInt(wmStretchWL?.value || String(wmStretchWPctLandscape), 10), 50, 400);
    const stHL = clamp(parseInt(wmStretchHL?.value || String(wmStretchHPctLandscape), 10), 50, 400);
    const scalePortrait = scPPct / 100;
    const scaleLandscape = scLPct / 100;
    const scaleBase = (scalePortrait + scaleLandscape) / 2;
    return {
      mode,
      opacity: opPct / 100,
      scale: scaleBase,
      scalePortrait,
      scaleLandscape,
      rotatePortrait,
      rotateLandscape,
      logoOffsetXPortrait: oxP,
      logoOffsetYPortrait: oyP,
      logoOffsetXLandscape: oxL,
      logoOffsetYLandscape: oyL,
      stretchWPctPortrait: stWP,
      stretchHPctPortrait: stHP,
      stretchWPctLandscape: stWL,
      stretchHPctLandscape: stHL,
      logoOffsetX: oxP,
      logoOffsetY: oyP,
      stretchWPct: stWP,
      stretchHPct: stHP,
      opPct,
      scPPct,
      scLPct
    };
  }

  function pickPreviewPhotoId() {
    const photosAll = Array.isArray(gallery?.photos) ? gallery.photos : [];
    if (!photosAll.length) return null;
    // preferir capa se existir
    const cover = photosAll.find(p => p && p.is_cover);
    return (cover?.id) || photosAll[0].id;
  }

  function setWmValueLabels({ opPct, scPPct, scLPct }) {
    if (wmOpacityVal) wmOpacityVal.textContent = `${opPct}%`;
    if (wmScalePVal && scPPct != null) wmScalePVal.textContent = `${scPPct}%`;
    if (wmScaleLVal && scLPct != null) wmScaleLVal.textContent = `${scLPct}%`;
  }

  function setWmRotateLabels(rp, rl) {
    if (wmRotatePVal) wmRotatePVal.textContent = `${rp || 0}°`;
    if (wmRotateLVal) wmRotateLVal.textContent = `${rl || 0}°`;
  }

  function updateWmRotateButtonsP() {
    const cur = String(wmRotateP?.value || '0');
    document.querySelectorAll('[data-wm-rotate-p]').forEach((btn) => {
      const v = String(btn.getAttribute('data-wm-rotate-p') || '');
      btn.classList.toggle('is-active-p', v === cur);
    });
  }

  function updateWmRotateButtonsL() {
    const cur = String(wmRotateL?.value || '0');
    document.querySelectorAll('[data-wm-rotate-l]').forEach((btn) => {
      const v = String(btn.getAttribute('data-wm-rotate-l') || '');
      btn.classList.toggle('is-active-l', v === cur);
    });
  }

  function fmtWmOffsetAxis(n) {
    const v = clamp(parseFloat(String(n)), -50, 50);
    const sign = v > 0 ? '+' : '';
    return `${sign}${Math.round(v * 10) / 10}%`;
  }

  function setWmOffsetLabelsPortrait(x, y) {
    if (wmLogoOffsetValP) wmLogoOffsetValP.textContent = `X ${fmtWmOffsetAxis(x)} · Y ${fmtWmOffsetAxis(y)}`;
    const sx = clamp(parseFloat(String(x)), -50, 50);
    const sy = clamp(parseFloat(String(y)), -50, 50);
    const near = (a, b, tol) => Math.abs(a - b) <= tol;
    const markAlign = (btn, on) => {
      if (!btn) return;
      btn.classList.toggle('ring-2', !!on);
      btn.classList.toggle('ring-amber-400', !!on);
    };
    markAlign(btnWmAlignTopP, sy <= -40);
    markAlign(btnWmAlignCenterVP, near(sy, 0, 6));
    markAlign(btnWmAlignBottomP, sy >= 40);
  }

  function setWmOffsetLabelsLandscape(x, y) {
    if (wmLogoOffsetValL) wmLogoOffsetValL.textContent = `X ${fmtWmOffsetAxis(x)} · Y ${fmtWmOffsetAxis(y)}`;
    const sx = clamp(parseFloat(String(x)), -50, 50);
    const sy = clamp(parseFloat(String(y)), -50, 50);
    const near = (a, b, tol) => Math.abs(a - b) <= tol;
    const markAlign = (btn, on) => {
      if (!btn) return;
      btn.classList.toggle('ring-2', !!on);
      btn.classList.toggle('ring-amber-400', !!on);
    };
    markAlign(btnWmAlignLeftL, sx <= -40);
    markAlign(btnWmAlignCenterHL, near(sx, 0, 6));
    markAlign(btnWmAlignRightL, sx >= 40);
  }

  function setWmStretchLabelsPortrait(sw, sh) {
    if (wmStretchWValP) wmStretchWValP.textContent = `${sw}%`;
    if (wmStretchHValP) wmStretchHValP.textContent = `${sh}%`;
  }

  function setWmStretchLabelsLandscape(sw, sh) {
    if (wmStretchWValL) wmStretchWValL.textContent = `${sw}%`;
    if (wmStretchHValL) wmStretchHValL.textContent = `${sh}%`;
  }

  function setWmPlaceholders(hasPhoto) {
    const showPh = !hasPhoto;
    wmPhP?.classList.toggle('hidden', !showPh);
    wmPhL?.classList.toggle('hidden', !showPh);
    wmPreviewP?.classList.toggle('hidden', showPh);
    wmPreviewL?.classList.toggle('hidden', showPh);
  }

  async function refreshWatermarkFilePreview() {
    const hasCustom = galleryHasCustomWmPath();

    if (!hasCustom) {
      wmFileCustomWrap?.classList.add('hidden');
      wmFileDefaults?.classList.remove('hidden');
      if (wmFilePh) wmFilePh.textContent = 'Marca Conecta King (fixa — retrato e paisagem)';
      [wmFilePreviewP, wmFilePreviewL].forEach((img) => {
        if (!img) return;
        const prevKey = img.getAttribute('data-cache-key');
        if (prevKey) revokePreviewUrl(prevKey);
        img.classList.add('hidden');
        img.removeAttribute('src');
        img.removeAttribute('data-cache-key');
      });
      return;
    }

    wmFileDefaults?.classList.add('hidden');
    wmFileCustomWrap?.classList.remove('hidden');
    if (wmFileCustomLabel) wmFileCustomLabel.textContent = 'Marca d’água personalizada (enviada)';
    wmFileFrameP?.classList.remove('hidden');
    wmFileFrameL?.classList.remove('hidden');
    wmFilePreviewP?.classList.toggle('hidden', false);
    wmFilePreviewL?.classList.toggle('hidden', false);
    const urlP = `${API_URL}/api/king-selection/galleries/${galleryId}/watermark-file?which=portrait`;
    const urlL = `${API_URL}/api/king-selection/galleries/${galleryId}/watermark-file?which=landscape`;
    wmFilePreviewP?.setAttribute('data-photo-id', '0');
    wmFilePreviewL?.setAttribute('data-photo-id', '0');
    await Promise.all([
      setImgPreview(wmFilePreviewP, { url: urlP, photoId: 0 }),
      setImgPreview(wmFilePreviewL, { url: urlL, photoId: 0 })
    ]);
  }

  async function refreshWatermarkPreview() {
    if (!gallery) return;
    if (wmPreviewInFlight) { wmPreviewQueued = true; return; }
    wmPreviewInFlight = true;
    const photoId = pickPreviewPhotoId();
    if (!photoId) {
      setWmPlaceholders(false);
      wmPreviewInFlight = false;
      return;
    }
    setWmPlaceholders(true);
    if (wmPhP) wmPhP.textContent = 'Carregando prévia...';
    if (wmPhL) wmPhL.textContent = 'Carregando prévia...';

    const {
      mode,
      opacity,
      scale,
      scalePortrait,
      scaleLandscape,
      rotatePortrait,
      rotateLandscape,
      logoOffsetXPortrait,
      logoOffsetYPortrait,
      logoOffsetXLandscape,
      logoOffsetYLandscape,
      stretchWPctPortrait,
      stretchHPctPortrait,
      stretchWPctLandscape,
      stretchHPctLandscape,
      opPct,
      scPPct,
      scLPct
    } = getWmParams();
    setWmValueLabels({ opPct, scPPct, scLPct });
    setWmRotateLabels(rotatePortrait, rotateLandscape);
    setWmOffsetLabelsPortrait(logoOffsetXPortrait, logoOffsetYPortrait);
    setWmOffsetLabelsLandscape(logoOffsetXLandscape, logoOffsetYLandscape);
    setWmStretchLabelsPortrait(stretchWPctPortrait, stretchHPctPortrait);
    setWmStretchLabelsLandscape(stretchWPctLandscape, stretchHPctLandscape);

    const fp = String(gallery?.watermark_path || '');
    const hasCustomPath = galleryHasCustomWmPath();
    if (wmCurrent) {
      if (mode === 'tile_dense') {
        wmCurrent.textContent = 'Marca Conecta King';
      } else if (mode === 'logo') {
        wmCurrent.textContent = hasCustomPath
          ? 'Sua marca personalizada'
          : 'Sua marca: (não enviada)';
      } else {
        wmCurrent.textContent = '';
      }
    }

    const mkParamsBase = () => {
      const p = new URLSearchParams();
      p.set('wm_mode', mode);
      p.set('wm_opacity', String(opacity));
      p.set('wm_scale', String(scale));
      p.set('wm_scale_portrait', String(scalePortrait));
      p.set('wm_scale_landscape', String(scaleLandscape));
      p.set('wm_rotate_portrait', String(rotatePortrait));
      p.set('wm_rotate_landscape', String(rotateLandscape));
      p.set('wm_rotate', String(rotatePortrait));
      p.set('wm_strict', '1');
      p.set('max', '2000');
      return p;
    };
    const paramsP = mkParamsBase();
    paramsP.set('wm_aspect_w', '3');
    paramsP.set('wm_aspect_h', '4');
    paramsP.set('wm_ox_p', String(logoOffsetXPortrait));
    paramsP.set('wm_oy_p', String(logoOffsetYPortrait));
    paramsP.set('wm_ox_l', String(logoOffsetXLandscape));
    paramsP.set('wm_oy_l', String(logoOffsetYLandscape));
    paramsP.set('wm_st_wp', String(stretchWPctPortrait));
    paramsP.set('wm_st_hp', String(stretchHPctPortrait));
    paramsP.set('wm_st_wl', String(stretchWPctLandscape));
    paramsP.set('wm_st_hl', String(stretchHPctLandscape));
    const paramsL = mkParamsBase();
    paramsL.set('wm_aspect_w', '16');
    paramsL.set('wm_aspect_h', '9');
    paramsL.set('wm_ox_p', String(logoOffsetXPortrait));
    paramsL.set('wm_oy_p', String(logoOffsetYPortrait));
    paramsL.set('wm_ox_l', String(logoOffsetXLandscape));
    paramsL.set('wm_oy_l', String(logoOffsetYLandscape));
    paramsL.set('wm_st_wp', String(stretchWPctPortrait));
    paramsL.set('wm_st_hp', String(stretchHPctPortrait));
    paramsL.set('wm_st_wl', String(stretchWPctLandscape));
    paramsL.set('wm_st_hl', String(stretchHPctLandscape));

    const urlP = `${API_URL}/api/king-selection/photos/${photoId}/preview?${paramsP.toString()}`;
    const urlL = `${API_URL}/api/king-selection/photos/${photoId}/preview?${paramsL.toString()}`;
    const paramsFlat = mkParamsBase();
    paramsFlat.set('wm_ox_p', String(logoOffsetXPortrait));
    paramsFlat.set('wm_oy_p', String(logoOffsetYPortrait));
    paramsFlat.set('wm_ox_l', String(logoOffsetXLandscape));
    paramsFlat.set('wm_oy_l', String(logoOffsetYLandscape));
    paramsFlat.set('wm_st_wp', String(stretchWPctPortrait));
    paramsFlat.set('wm_st_hp', String(stretchHPctPortrait));
    paramsFlat.set('wm_st_wl', String(stretchWPctLandscape));
    paramsFlat.set('wm_st_hl', String(stretchHPctLandscape));
    const urlNoAspect = `${API_URL}/api/king-selection/photos/${photoId}/preview?${paramsFlat.toString()}`;

    wmPreviewP?.setAttribute('data-photo-id', String(photoId));
    wmPreviewL?.setAttribute('data-photo-id', String(photoId));
    try {
      await Promise.all([
        setImgPreview(wmPreviewP, { url: urlP, photoId, fallbackUrl: urlNoAspect }),
        setImgPreview(wmPreviewL, { url: urlL, photoId, fallbackUrl: urlNoAspect })
      ]);
      if (wmPhP) wmPhP.textContent = '';
      if (wmPhL) wmPhL.textContent = '';
      wmPreviewP?.classList.toggle('hidden', false);
      wmPreviewL?.classList.toggle('hidden', false);
      wmPhP?.classList.toggle('hidden', true);
      wmPhL?.classList.toggle('hidden', true);
      hideError();
    } catch (_) {
      // setImgPreview já colocou o placeholder e mostrou a mensagem.
    } finally {
      wmPreviewInFlight = false;
      if (wmPreviewQueued) {
        wmPreviewQueued = false;
        scheduleWatermarkPreview();
      }
    }
  }

  function scheduleWatermarkPreview(immediate) {
    if (wmPreviewTimer) clearTimeout(wmPreviewTimer);
    if (immediate) {
      wmPreviewTimer = null;
      refreshWatermarkPreview().catch(() => { });
      return;
    }
    wmPreviewTimer = setTimeout(() => {
      wmPreviewTimer = null;
      refreshWatermarkPreview().catch(() => { });
    }, 150);
  }

  function ensureFoldersAdminUi() {
    if (!pGrid) return null;
    let wrap = document.getElementById('ks-folders-admin');
    if (wrap) return wrap;
    const host = pGrid.parentElement || pGrid;
    wrap = document.createElement('div');
    wrap.id = 'ks-folders-admin';
    wrap.style.marginBottom = '12px';
    wrap.style.border = '1px solid rgba(255,255,255,.12)';
    wrap.style.borderRadius = '12px';
    wrap.style.padding = '10px';
    wrap.style.background = 'rgba(0,0,0,.28)';
    wrap.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;">
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
          <button type="button" class="ks-btn" id="ks-only-photos-btn"><i class="fas fa-images"></i> Adicionar só fotos</button>
          <button type="button" class="ks-btn" id="ks-folder-auto-face-btn"><i class="fas fa-user-group"></i> Separar por pasta (rosto)</button>
          <button type="button" class="ks-btn" id="ks-folder-auto-reprocess-btn"><i class="fas fa-rotate-right"></i> Reprocessar e separar</button>
          <button type="button" class="ks-btn" id="ks-folder-select-all-btn"><i class="far fa-check-square"></i> Selecionar todas as pastas</button>
          <button type="button" class="ks-btn" id="ks-folder-select-none-btn"><i class="far fa-square"></i> Limpar seleção</button>
          <button type="button" class="ks-btn" id="ks-folder-delete-selected-btn" style="color:#fca5a5;border-color:rgba(248,113,113,.45)">
            <i class="fas fa-trash"></i> Excluir selecionadas
          </button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
          <button type="button" class="ks-btn" id="ks-folder-apply-name-order-btn"><i class="fas fa-sort-alpha-down"></i> Aplicar ordem A-Z (salvar)</button>
          <select class="ks-input" id="ks-folder-sort" style="min-width:190px">
            <option value="manual">Pastas: ordem manual</option>
            <option value="name">Pastas: nome (A-Z / 1-2-3)</option>
            <option value="count">Pastas: mais fotos primeiro</option>
          </select>
          <select class="ks-input" id="ks-photo-sort" style="min-width:190px">
            <option value="order">Fotos: sequência original</option>
            <option value="name">Fotos: nome (A-Z / 1-2-3)</option>
            <option value="id">Fotos: número (ID)</option>
          </select>
          <select class="ks-input" id="ks-folder-filter" style="min-width:170px"></select>
        </div>
      </div>
      <div id="ks-folder-auto-status" class="ks-muted" style="font-size:12px;margin-top:8px;line-height:1.4;"></div>
      <div id="ks-folder-auto-history" class="ks-muted" style="font-size:11px;margin-top:8px;line-height:1.35;"></div>
      <div id="ks-folder-selection-count" class="ks-muted" style="font-size:12px;margin-top:8px;line-height:1.35;"></div>
      <div class="ks-muted" style="font-size:11px;margin-top:8px;line-height:1.35;">
        Importação com subpastas: use o botão <b>Pasta e subpastas</b> na área <b>Arraste e solte</b> acima (um único fluxo).
      </div>
      <div id="ks-folder-cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,150px),1fr));gap:10px;margin-top:10px;width:100%;min-width:0;"></div>
    `;
    host.insertBefore(wrap, pGrid);

    wrap.addEventListener('click', async (ev) => {
      const createBtn = ev.target.closest('#ks-folder-create-btn');
      if (createBtn) {
        const name = (window.prompt('Nome da nova pasta:', '') || '').trim();
        if (!name) return;
        try {
          const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/folders`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({ name })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.message || 'Erro ao criar pasta');
          if (gallery) gallery.folders = Array.isArray(data.folders) ? data.folders : [];
          if (!uploadFolderId && Array.isArray(data.folders) && data.folders.length) {
            uploadFolderId = parseInt(data.folders[data.folders.length - 1]?.id, 10) || null;
          }
          renderFoldersAdminUi();
          renderPhotos();
          toast('Pasta criada.', { kind: 'ok', title: 'Pastas' });
        } catch (e) {
          showError(e?.message || 'Erro ao criar pasta');
        }
        return;
      }

      const applyNameOrderBtn = ev.target.closest('#ks-folder-apply-name-order-btn');
      if (applyNameOrderBtn) {
        try {
          const baseFolders = normalizeFolders(gallery?.folders);
          if (baseFolders.length < 2) {
            toast('Não há pastas suficientes para reordenar.', { kind: 'warn', title: 'Pastas' });
            return;
          }
          const ordered = baseFolders
            .slice()
            .sort((a, b) => cmpNaturalText(a.name, b.name) || (a.id - b.id));
          await reorderFolders(ordered.map((f) => f.id));
          folderSortMode = 'manual';
          renderFoldersAdminUi();
          toast('Ordem A-Z aplicada e salva para todos.', { kind: 'ok', title: 'Pastas' });
        } catch (e) {
          showError(e?.message || 'Erro ao aplicar ordem A-Z');
        }
        return;
      }

      const onlyPhotosBtn = ev.target.closest('#ks-only-photos-btn');
      if (onlyPhotosBtn) {
        pFile?.click();
        return;
      }

      const autoFaceBtn = ev.target.closest('#ks-folder-auto-face-btn');
      if (autoFaceBtn) {
        const ok = window.confirm(
          'Separar automaticamente por pasta usando reconhecimento facial?\n\n' +
          'Isso roda no servidor em segundo plano e continua mesmo com o navegador fechado.'
        );
        if (!ok) return;
        try {
          const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/folders/auto-separate-job/start`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({ minSimilarity: 72, forceReprocess: false, concurrency: 5, speedMode: 'auto' })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.message || 'Erro ao iniciar separação por pasta');
          autoFolderLastJobId = parseInt(data?.job?.id || 0, 10) || autoFolderLastJobId;
          setAutoFolderStatusText('Separação por pasta iniciada em segundo plano...');
          startAutoFolderJobPolling();
          toast('Separação por pasta iniciada em segundo plano.', { kind: 'ok', title: 'Pastas' });
        } catch (e) {
          showError(e?.message || 'Erro ao separar por pasta');
        }
        return;
      }

      const reprocessBtn = ev.target.closest('#ks-folder-auto-reprocess-btn');
      if (reprocessBtn) {
        const ok = window.confirm(
          'Reprocessar TODAS as fotos e separar por pasta?\n\n' +
          'Use isso quando você quiser refazer a organização facial do zero.'
        );
        if (!ok) return;
        try {
          const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/folders/auto-separate-job/start`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({ minSimilarity: 72, forceReprocess: true, concurrency: 5, speedMode: 'auto' })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.message || 'Erro ao iniciar reprocessamento');
          autoFolderLastJobId = parseInt(data?.job?.id || 0, 10) || autoFolderLastJobId;
          setAutoFolderStatusText('Reprocessamento + separação iniciado em segundo plano...');
          startAutoFolderJobPolling();
          renderAutoFolderHistory().catch(() => { });
          toast('Reprocessamento iniciado em segundo plano.', { kind: 'ok', title: 'Pastas' });
        } catch (e) {
          showError(e?.message || 'Erro ao iniciar reprocessamento');
        }
        return;
      }

      const moveBtn = ev.target.closest('#ks-folder-move-btn');
      if (moveBtn) {
        if (!selectedPhotoIds.size) {
          toast('Selecione fotos para mover.', { kind: 'warn', title: 'Pastas' });
          return;
        }
        const fid = toPosInt((document.getElementById('ks-folder-upload-target')?.value || ''));
        if (!fid) {
          toast('Escolha uma pasta de destino.', { kind: 'warn', title: 'Pastas' });
          return;
        }
        try {
          const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/photos/assign-folder`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({ photo_ids: Array.from(selectedPhotoIds), folder_id: fid })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.message || 'Erro ao mover fotos');
          const idSet = new Set(Array.from(selectedPhotoIds));
          gallery.photos = (gallery.photos || []).map((p) => (idSet.has(p.id) ? { ...p, folder_id: fid } : p));
          gallery.folders = Array.isArray(data.folders) ? data.folders : (gallery.folders || []);
          selectedPhotoIds = new Set();
          renderFoldersAdminUi();
          renderPhotos();
          toast('Fotos movidas para a pasta.', { kind: 'ok', title: 'Pastas' });
        } catch (e) {
          showError(e?.message || 'Erro ao mover fotos');
        }
        return;
      }

      const selectAllFoldersBtn = ev.target.closest('#ks-folder-select-all-btn');
      if (selectAllFoldersBtn) {
        selectedFolderIds = new Set(getGalleryFolders().map((f) => parseInt(f.id, 10)).filter(Boolean));
        renderFoldersAdminUi();
        return;
      }

      const clearFolderSelectionBtn = ev.target.closest('#ks-folder-select-none-btn');
      if (clearFolderSelectionBtn) {
        selectedFolderIds = new Set();
        renderFoldersAdminUi();
        return;
      }

      const deleteSelectedFoldersBtn = ev.target.closest('#ks-folder-delete-selected-btn');
      if (deleteSelectedFoldersBtn) {
        const ids = Array.from(selectedFolderIds).map((v) => parseInt(v, 10)).filter(Boolean);
        if (!ids.length) {
          toast('Selecione ao menos uma pasta.', { kind: 'warn', title: 'Pastas' });
          return;
        }
        const ok = window.confirm(`Excluir ${ids.length} pasta(s)? As fotos continuarão na galeria, sem pasta.`);
        if (!ok) return;
        let deleted = 0;
        let failed = 0;
        for (const folderId of ids) {
          try {
            const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/folders/${folderId}`, {
              method: 'DELETE',
              headers: HEADERS
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'Erro ao excluir pasta');
            gallery.photos = (gallery.photos || []).map((p) => ((parseInt(p.folder_id, 10) || 0) === folderId ? { ...p, folder_id: null } : p));
            if (photoFolderFilterId === folderId) photoFolderFilterId = null;
            if (uploadFolderId === folderId) uploadFolderId = null;
            if (gallery) gallery.folders = Array.isArray(data.folders) ? data.folders : [];
            deleted += 1;
          } catch (_) {
            failed += 1;
          }
          selectedFolderIds.delete(folderId);
        }
        renderFoldersAdminUi();
        renderPhotos();
        if (deleted > 0 && failed === 0) {
          toast(`${deleted} pasta(s) excluída(s).`, { kind: 'ok', title: 'Pastas' });
        } else if (deleted > 0 && failed > 0) {
          toast(`${deleted} pasta(s) excluída(s) e ${failed} com erro.`, { kind: 'warn', title: 'Pastas' });
        } else {
          showError('Não foi possível excluir as pastas selecionadas.');
        }
        return;
      }

      const folderCard = ev.target.closest('[data-folder-card]');
      if (!folderCard) return;
      const fidRaw = folderCard.getAttribute('data-folder-card');
      const action = ev.target.closest('[data-folder-action]')?.getAttribute('data-folder-action');
      const folderId = toPosInt(fidRaw);
      const toggleFolderSelect = ev.target.closest('[data-folder-select-toggle]');
      if (toggleFolderSelect) {
        if (!folderId) return;
        if (selectedFolderIds.has(folderId)) selectedFolderIds.delete(folderId);
        else selectedFolderIds.add(folderId);
        renderFoldersAdminUi();
        return;
      }
      if (action === 'rename') {
        if (!folderId) return;
        const cur = (gallery?.folders || []).find((f) => parseInt(f.id, 10) === folderId);
        const name = (window.prompt('Novo nome da pasta:', cur?.name || '') || '').trim();
        if (!name) return;
        try {
          const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/folders/${folderId}`, {
            method: 'PATCH',
            headers: HEADERS,
            body: JSON.stringify({ name })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.message || 'Erro ao renomear pasta');
          if (gallery) gallery.folders = Array.isArray(data.folders) ? data.folders : [];
          renderFoldersAdminUi();
        } catch (e) {
          showError(e?.message || 'Erro ao renomear pasta');
        }
        return;
      }
      if (action === 'up' || action === 'down') {
        if (!folderId) return;
        const folders = getGalleryFolders();
        const idx = folders.findIndex((f) => f.id === folderId);
        if (idx < 0) return;
        const swapWith = action === 'up' ? idx - 1 : idx + 1;
        if (swapWith < 0 || swapWith >= folders.length) return;
        const next = folders.slice();
        const tmp = next[idx];
        next[idx] = next[swapWith];
        next[swapWith] = tmp;
        try {
          await reorderFolders(next.map((f) => f.id));
          renderFoldersAdminUi();
        } catch (e) {
          showError(e?.message || 'Erro ao reordenar pasta');
        }
        return;
      }
      if (action === 'delete') {
        if (!folderId) return;
        if (!window.confirm('Excluir esta pasta? As fotos continuam na galeria (sem pasta).')) return;
        try {
          const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/folders/${folderId}`, {
            method: 'DELETE',
            headers: HEADERS
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.message || 'Erro ao excluir pasta');
          gallery.photos = (gallery.photos || []).map((p) => ((parseInt(p.folder_id, 10) || 0) === folderId ? { ...p, folder_id: null } : p));
          if (photoFolderFilterId === folderId) photoFolderFilterId = null;
          if (uploadFolderId === folderId) uploadFolderId = null;
          selectedFolderIds.delete(folderId);
          if (gallery) gallery.folders = Array.isArray(data.folders) ? data.folders : [];
          renderFoldersAdminUi();
          renderPhotos();
        } catch (e) {
          showError(e?.message || 'Erro ao excluir pasta');
        }
        return;
      }
      photoFolderFilterId = folderId || null;
      photoPageIndex = 0;
      renderFoldersAdminUi();
      renderPhotos();
    });

    wrap.addEventListener('change', (ev) => {
      const t = ev.target;
      if (t && t.id === 'ks-folder-filter') {
        photoFolderFilterId = toPosInt(t.value) || null;
        photoPageIndex = 0;
        renderFoldersAdminUi();
        renderPhotos();
      } else if (t && t.id === 'ks-folder-sort') {
        folderSortMode = ['manual', 'name', 'count'].includes(t.value) ? t.value : 'manual';
        renderFoldersAdminUi();
      } else if (t && t.id === 'ks-photo-sort') {
        photoSortMode = ['order', 'name', 'id'].includes(t.value) ? t.value : 'order';
        photoPageIndex = 0;
        renderPhotos();
      } else if (t && t.id === 'ks-folder-upload-mode') {
        uploadFolderMode = (t.value === 'folder') ? 'folder' : 'all';
        renderFoldersAdminUi();
      } else if (t && t.id === 'ks-folder-upload-target') {
        uploadFolderId = toPosInt(t.value) || null;
      }
    });

    return wrap;
  }

  function toPosInt(v) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  async function reorderFolders(folderIds) {
    const ids = Array.isArray(folderIds) ? folderIds.map((v) => parseInt(v, 10)).filter(Boolean) : [];
    if (!ids.length) return;
    const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/folders/reorder`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ folder_ids: ids })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao reordenar pastas');
    if (gallery) gallery.folders = Array.isArray(data.folders) ? data.folders : [];
  }

  function setAutoFolderStatusText(text) {
    const el = document.getElementById('ks-folder-auto-status');
    if (!el) return;
    el.textContent = String(text || '');
  }

  async function fetchLatestAutoFolderJob() {
    const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/folders/auto-separate-job`, {
      method: 'GET',
      headers: HEADERS
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao consultar job de separação por pasta');
    return data.job || null;
  }

  async function fetchAutoFolderJobsHistory(limit = 8) {
    const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/folders/auto-separate-jobs?limit=${encodeURIComponent(limit)}`, {
      method: 'GET',
      headers: HEADERS
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao consultar histórico de jobs');
    return Array.isArray(data.jobs) ? data.jobs : [];
  }

  function formatJobTime(ts) {
    if (!ts) return '-';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('pt-BR');
  }

  async function renderAutoFolderHistory() {
    const el = document.getElementById('ks-folder-auto-history');
    if (!el) return;
    try {
      const jobs = await fetchAutoFolderJobsHistory(8);
      if (!jobs.length) {
        el.textContent = '';
        return;
      }
      el.innerHTML = jobs.map((j) => {
        const st = String(j.status || '').toUpperCase();
        const stage = String(j.stage || '-');
        const proc = `${parseInt(j.processed_photos || 0, 10) || 0}/${parseInt(j.total_photos || 0, 10) || 0}`;
        const assigned = parseInt(j.assigned_photos || 0, 10) || 0;
        const created = formatJobTime(j.created_at);
        return `#${j.id} • ${st} • ${stage} • ${proc} • separadas ${assigned} • ${created}`;
      }).join('<br/>');
    } catch (_) {
      // silencioso
    }
  }

  function stopAutoFolderJobPolling() {
    if (autoFolderJobPollTimer) {
      clearTimeout(autoFolderJobPollTimer);
      autoFolderJobPollTimer = null;
    }
  }

  async function pollAutoFolderJobStatus() {
    try {
      const job = await fetchLatestAutoFolderJob();
      if (!job) {
        setAutoFolderStatusText('');
        renderAutoFolderHistory().catch(() => { });
        stopAutoFolderJobPolling();
        return;
      }
      autoFolderLastJobId = parseInt(job.id, 10) || autoFolderLastJobId;
      const total = parseInt(job.total_photos || 0, 10) || 0;
      const processed = parseInt(job.processed_photos || 0, 10) || 0;
      const errors = parseInt(job.error_photos || 0, 10) || 0;
      const assigned = parseInt(job.assigned_photos || 0, 10) || 0;
      const msg = String(job.message || '').trim();
      const line = `Separação por pasta: ${String(job.status || '').toUpperCase()} • etapa: ${job.stage || '-'} • processadas: ${processed}/${total} • erros: ${errors} • separadas: ${assigned}${msg ? ` • ${msg}` : ''}`;
      setAutoFolderStatusText(line);

      const terminal = ['done', 'error', 'cancelled'].includes(String(job.status || '').toLowerCase());
      if (terminal) {
        stopAutoFolderJobPolling();
        renderAutoFolderHistory().catch(() => { });
        if (String(job.status || '').toLowerCase() === 'done') {
          await loadGallery().catch(() => { });
          toast('Separação automática por pasta finalizada.', { kind: 'ok', title: 'Pastas' });
        }
        return;
      }
    } catch (_) { }
    stopAutoFolderJobPolling();
    autoFolderJobPollTimer = setTimeout(() => { pollAutoFolderJobStatus().catch(() => { }); }, 5000);
  }

  function startAutoFolderJobPolling() {
    stopAutoFolderJobPolling();
    autoFolderJobPollTimer = setTimeout(() => { pollAutoFolderJobStatus().catch(() => { }); }, 1200);
  }

  async function refreshAutoFolderStatusOnce() {
    try {
      const job = await fetchLatestAutoFolderJob();
      if (!job) {
        setAutoFolderStatusText('');
        renderAutoFolderHistory().catch(() => { });
        stopAutoFolderJobPolling();
        return;
      }
      const total = parseInt(job.total_photos || 0, 10) || 0;
      const processed = parseInt(job.processed_photos || 0, 10) || 0;
      const errors = parseInt(job.error_photos || 0, 10) || 0;
      const assigned = parseInt(job.assigned_photos || 0, 10) || 0;
      const msg = String(job.message || '').trim();
      setAutoFolderStatusText(`Separação por pasta: ${String(job.status || '').toUpperCase()} • etapa: ${job.stage || '-'} • processadas: ${processed}/${total} • erros: ${errors} • separadas: ${assigned}${msg ? ` • ${msg}` : ''}`);
      renderAutoFolderHistory().catch(() => { });
      if (['processing', 'pending'].includes(String(job.status || '').toLowerCase())) {
        startAutoFolderJobPolling();
      }
    } catch (_) { }
  }

  function bindFolderDragAndDrop(cards) {
    if (!cards) return;
    const items = Array.from(cards.querySelectorAll('[data-folder-card]'))
      .filter((el) => toPosInt(el.getAttribute('data-folder-card')));
    if (!items.length) return;

    let dragId = null;
    const clearHover = () => {
      items.forEach((el) => {
        el.style.outline = '';
        el.style.outlineOffset = '';
        el.style.opacity = '';
      });
    };

    items.forEach((el) => {
      el.draggable = true;
      el.addEventListener('dragstart', (ev) => {
        dragId = toPosInt(el.getAttribute('data-folder-card'));
        el.style.opacity = '0.55';
        try {
          ev.dataTransfer.effectAllowed = 'move';
          ev.dataTransfer.setData('text/plain', String(dragId || ''));
        } catch (_) { }
      });
      el.addEventListener('dragend', async () => {
        el.style.opacity = '';
        clearHover();
      });
      el.addEventListener('dragover', (ev) => {
        ev.preventDefault();
        if (!dragId) return;
        const overId = toPosInt(el.getAttribute('data-folder-card'));
        if (!overId || overId === dragId) return;
        clearHover();
        el.style.outline = '2px dashed rgba(250,204,21,.9)';
        el.style.outlineOffset = '-2px';
      });
      el.addEventListener('drop', async (ev) => {
        ev.preventDefault();
        const targetId = toPosInt(el.getAttribute('data-folder-card'));
        if (!dragId || !targetId || dragId === targetId) {
          clearHover();
          return;
        }
        const folders = getGalleryFolders();
        const fromIdx = folders.findIndex((f) => f.id === dragId);
        const toIdx = folders.findIndex((f) => f.id === targetId);
        if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) {
          clearHover();
          return;
        }
        const next = folders.slice();
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        clearHover();
        try {
          await reorderFolders(next.map((f) => f.id));
          renderFoldersAdminUi();
          toast('Ordem das pastas atualizada.', { kind: 'ok', title: 'Pastas' });
        } catch (e) {
          showError(e?.message || 'Erro ao ordenar pastas');
        }
      });
    });
  }

  function renderFoldersAdminUi() {
    const wrap = ensureFoldersAdminUi();
    if (!wrap || !gallery) return;
    const folders = getGalleryFolders();
    const filterSel = wrap.querySelector('#ks-folder-filter');
    const folderSortSel = wrap.querySelector('#ks-folder-sort');
    const photoSortSel = wrap.querySelector('#ks-photo-sort');
    const uploadModeSel = wrap.querySelector('#ks-folder-upload-mode');
    const uploadTargetSel = wrap.querySelector('#ks-folder-upload-target');
    const cards = wrap.querySelector('#ks-folder-cards');

    if (photoFolderFilterId && !folders.some((f) => f.id === photoFolderFilterId)) photoFolderFilterId = null;
    if (uploadFolderId && !folders.some((f) => f.id === uploadFolderId)) uploadFolderId = null;
    if (!uploadFolderId && folders.length) uploadFolderId = folders[0].id;
    selectedFolderIds = new Set(
      Array.from(selectedFolderIds)
        .map((v) => parseInt(v, 10))
        .filter((id) => folders.some((f) => f.id === id))
    );

    if (filterSel) {
      filterSel.innerHTML = `<option value="">Filtro: todas as fotos</option>${folders.map((f) => `<option value="${f.id}">Filtro: ${escapeHtml(f.name)}</option>`).join('')}`;
      filterSel.value = photoFolderFilterId ? String(photoFolderFilterId) : '';
    }
    if (folderSortSel) folderSortSel.value = folderSortMode;
    if (photoSortSel) photoSortSel.value = photoSortMode;
    if (uploadModeSel) uploadModeSel.value = uploadFolderMode;
    if (uploadTargetSel) {
      uploadTargetSel.innerHTML = `<option value="">Pasta de upload…</option>${folders.map((f) => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('')}`;
      uploadTargetSel.value = uploadFolderId ? String(uploadFolderId) : '';
      uploadTargetSel.disabled = uploadFolderMode !== 'folder';
    }
    const folderSelectionCount = wrap.querySelector('#ks-folder-selection-count');
    if (folderSelectionCount) {
      const n = selectedFolderIds.size;
      folderSelectionCount.innerHTML = n > 0
        ? `<i class="fas fa-check-square"></i> ${n} pasta(s) selecionada(s) para exclusão em lote.`
        : '<i class="far fa-square"></i> Nenhuma pasta selecionada.';
    }
    if (!cards) return;
    const html = [];
    folders.forEach((f) => {
      const cover = f.cover_photo_id
        ? `<img src="" alt="${escapeHtml(f.name)}" data-folder-cover-pid="${f.cover_photo_id}" data-folder-id="${f.id}" loading="lazy" />`
        : `<div class="ks-folder-ph"><i class="fas fa-folder-open"></i></div>`;
      const manualOrderEnabled = folderSortMode === 'manual';
      const isSelected = selectedFolderIds.has(f.id);
      const cardBorder = isSelected ? '2px solid rgba(250,204,21,.95)' : (photoFolderFilterId === f.id ? '1px solid rgba(56,189,248,.9)' : '1px solid rgba(148,163,184,.30)');
      const cardBg = isSelected ? 'rgba(234,179,8,.16)' : 'rgba(2,6,23,.45)';
      html.push(
        `<div class="ks-folder-card ${photoFolderFilterId === f.id ? 'ks-folder-card--active' : ''}" data-folder-card="${f.id}"
          style="border:${cardBorder};background:${cardBg};border-radius:12px;padding:10px;min-height:126px;display:flex;flex-direction:column;gap:8px;cursor:pointer;box-shadow:0 10px 24px rgba(0,0,0,.18);">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <button type="button" class="ks-btn ks-btn-sm" data-folder-select-toggle="1" title="Selecionar pasta"
              style="padding:4px 8px;min-width:44px;${isSelected ? 'border-color:rgba(250,204,21,.95);color:#fde68a;' : ''}">
              <i class="${isSelected ? 'fas' : 'far'} fa-square-check"></i>
            </button>
            ${isSelected ? '<span class="ks-chip" style="border-color:rgba(250,204,21,.65);background:rgba(234,179,8,.18);color:#fef08a"><i class="fas fa-check"></i><span>Selecionada</span></span>' : ''}
          </div>
          ${cover}
          <div class="ks-folder-meta">
            <div class="ks-folder-name">${escapeHtml(f.name)}</div>
            <div class="ks-folder-count">${f.photo_count} foto(s)</div>
            <div style="display:flex;gap:6px;margin-top:6px;">
              <button type="button" class="ks-btn ks-btn-sm" data-folder-action="up" title="Subir"${manualOrderEnabled ? '' : ' disabled'}><i class="fas fa-arrow-up"></i></button>
              <button type="button" class="ks-btn ks-btn-sm" data-folder-action="down" title="Descer"${manualOrderEnabled ? '' : ' disabled'}><i class="fas fa-arrow-down"></i></button>
              <button type="button" class="ks-btn ks-btn-sm" data-folder-action="rename"><i class="fas fa-pen"></i></button>
              <button type="button" class="ks-btn ks-btn-sm" data-folder-action="delete"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        </div>`
      );
    });
    html.push(
      `<button type="button" class="ks-folder-card ${!photoFolderFilterId ? 'ks-folder-card--active' : ''}" data-folder-card=""
        style="border:1px solid rgba(251,191,36,.55);background:linear-gradient(180deg, rgba(251,191,36,.12), rgba(2,6,23,.45));border-radius:12px;padding:10px;display:flex;align-items:center;gap:10px;cursor:pointer;min-height:78px;">
        <div class="ks-folder-ph" style="color:#fde68a"><i class="fas fa-layer-group"></i></div>
        <div class="ks-folder-meta"><div class="ks-folder-name">Todas</div><div class="ks-folder-count">${(gallery.photos || []).length} foto(s)</div></div>
      </button>`
    );
    cards.innerHTML = html.join('');

    Array.from(cards.querySelectorAll('img[data-folder-cover-pid]')).forEach((img) => {
      const pid = parseInt(img.getAttribute('data-folder-cover-pid') || '0', 10);
      if (!pid) return;
      const url = `${API_URL}/api/king-selection/photos/${pid}/preview?wm_mode=none`;
      setImgPreview(img, { url, photoId: pid }).catch(() => { });
    });
    if (folderSortMode === 'manual') bindFolderDragAndDrop(cards);
    refreshAutoFolderStatusOnce().catch(() => { });
  }

  function renderPhotos() {
    renderFoldersAdminUi();
    const photosAll = Array.isArray(gallery?.photos) ? gallery.photos : [];
    const favCount = photosAll.filter(p => !!p.is_favorite).length;
    if (pCountAll) pCountAll.textContent = String(photosAll.length);
    if (pCountFav) pCountFav.textContent = String(favCount);

    const filtered = getVisiblePhotos();
    const pageSize = Math.max(1, parseInt(photoPageSize || 30, 10) || 30);
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    photoPageIndex = Math.max(0, Math.min(photoPageIndex, totalPages - 1));
    const start = photoPageIndex * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    if (pSelectedBar && pSelectedCount) {
      const n = selectedPhotoIds.size;
      pSelectedCount.textContent = String(n);
      pSelectedBar.classList.toggle('active', n > 0);
    }

    // Paginação (evita página infinita com 1000+ fotos)
    if (pPager) pPager.classList.toggle('hidden', filtered.length <= pageSize);
    if (pPageLabel) pPageLabel.textContent = `Página ${photoPageIndex + 1}/${totalPages} • ${filtered.length} foto(s)`;
    if (pPagePrev) pPagePrev.disabled = photoPageIndex <= 0;
    if (pPageNext) pPageNext.disabled = photoPageIndex >= totalPages - 1;
    if (pPageNumbers) {
      // Para 1..12 (caso típico), mostra tudo. Para muitos, usa janela com reticências.
      const maxAll = 20;
      const cur = photoPageIndex + 1;
      const mkBtn = (n, { current, ellipsis } = {}) => {
        if (ellipsis) return `<span class="px-2 text-xs ks-muted select-none">…</span>`;
        const cls = current ? 'ks-btn ks-btn-primary ks-pagebtn' : 'ks-btn ks-pagebtn';
        return `<button class="${cls}" type="button" data-page="${n}">${n}</button>`;
      };
      let html = '';
      if (totalPages <= maxAll) {
        for (let i = 1; i <= totalPages; i += 1) html += mkBtn(i, { current: i === cur });
      } else {
        const add = (n) => { html += mkBtn(n, { current: n === cur }); };
        const win = 2;
        add(1);
        if (cur > 1 + win + 1) html += mkBtn(null, { ellipsis: true });
        for (let n = Math.max(2, cur - win); n <= Math.min(totalPages - 1, cur + win); n += 1) add(n);
        if (cur < totalPages - win - 1) html += mkBtn(null, { ellipsis: true });
        add(totalPages);
      }
      pPageNumbers.innerHTML = html;
    }

    const folderCoverPhotoIds = new Set(
      getGalleryFolders()
        .map((f) => parseInt(f?.cover_photo_id, 10) || 0)
        .filter(Boolean)
    );

    pGrid.innerHTML = paged.map(p => {
      const isSel = selectedPhotoIds.has(p.id);
      const isFav = !!p.is_favorite;
      const isCover = !!p.is_cover;
      const isFolderCover = folderCoverPhotoIds.has(parseInt(p.id, 10));
      return `
        <div class="ks-photo ks-photo-tile" data-photo-id="${p.id}">
          <div class="ks-photo-media">
            <div class="ks-photo-top">
              <button class="ks-ico" data-action="fav" title="${isFav ? 'Desfavoritar' : 'Favoritar'}">
                <i class="${isFav ? 'fas' : 'far'} fa-star ${isFav ? 'ks-star' : ''}"></i>
              </button>
              <div class="flex items-center gap-2">
              ${isCover ? `<span class="ks-chip" title="Capa"><i class="fas fa-image"></i><span>Capa</span></span>` : ``}
              ${isFolderCover ? `<span class="ks-chip" title="Capa da pasta"><i class="fas fa-folder-open"></i><span>Capa da pasta</span></span>` : ``}
              <button class="ks-selbtn" data-action="select" data-selected="${isSel ? '1' : '0'}" title="${isSel ? 'Remover da seleção' : 'Selecionar'}" aria-label="Selecionar">
                ${isSel ? `<i class="fas fa-check"></i>` : ``}
              </button>
              <button class="ks-ico" data-action="open" title="Ampliar"><i class="fas fa-up-right-and-down-left-from-center"></i></button>
                <button class="ks-ico" data-action="menu" title="Opções"><i class="fas fa-ellipsis-v"></i></button>
              </div>
            </div>

            <img loading="lazy"
                 src=""
                 data-photo-id="${p.id}"
                 alt="${escapeHtml(p.original_name || 'foto')}"
                 data-action="open" />
            <div class="ks-cap"><span class="ks-cap-id">#${p.id}</span>${escapeHtml(p.original_name || '')}</div>
          </div>

          <!-- Menu fora do recorte da foto (não fica cortado) -->
          <div class="ks-menu" data-menu>
            <button data-action="open"><i class="fas fa-up-right-and-down-left-from-center"></i> Ampliar foto</button>
            <button data-action="download"><i class="fas fa-download"></i> Baixar foto</button>
            <button data-action="replace"><i class="fas fa-retweet"></i> Substituir foto</button>
            <button data-action="cover"><i class="fas fa-image"></i> Definir como capa da galeria</button>
            <button data-action="folder-cover"><i class="fas fa-folder-open"></i> Definir como capa da pasta</button>
            <button class="danger" data-action="delete"><i class="fas fa-trash"></i> Excluir foto</button>
          </div>
        </div>
      `;
    }).join('');

    Array.from(pGrid.querySelectorAll('[data-photo-id]')).forEach(tile => {
      const photoId = parseInt(tile.getAttribute('data-photo-id') || '0', 10);
      const menu = tile.querySelector('[data-menu]');
      const photo = (Array.isArray(gallery?.photos) ? gallery.photos : []).find(x => x.id === photoId);
      if (!photo) return;

      tile.addEventListener('click', async (e) => {
        const el = e.target;
        const action = el?.getAttribute && el.getAttribute('data-action');
        if (!action) return;
        e.preventDefault();
        e.stopPropagation();

        Array.from(pGrid.querySelectorAll('.ks-menu.open')).forEach(m => { if (m !== menu) m.classList.remove('open'); });

        if (action === 'menu') {
          if (menu) menu.classList.toggle('open');
          return;
        }
        if (menu) menu.classList.remove('open');

        if (action === 'select') {
          const next = !selectedPhotoIds.has(photoId);
          if (next) selectedPhotoIds.add(photoId);
          else selectedPhotoIds.delete(photoId);
          renderPhotos();
          return;
        }

        if (action === 'open') {
          openViewer(photoId);
          return;
        }

        if (action === 'download') {
          await downloadPhoto(photoId, photo.original_name);
          return;
        }

        if (action === 'fav') {
          await toggleFavorite(photoId, !photo.is_favorite);
          return;
        }

        if (action === 'cover') {
          await setCover(photoId, { folderId: photo.folder_id });
          toast('Capa da galeria atualizada. A capa da pasta foi sincronizada.', { kind: 'ok', title: 'Pastas' });
          return;
        }

        if (action === 'folder-cover') {
          const fid = parseInt(photo.folder_id || 0, 10) || photoFolderFilterId || 0;
          if (!fid) {
            toast('Esta foto não está em uma pasta.', { kind: 'warn', title: 'Pastas' });
            return;
          }
          await setFolderCover(fid, photoId);
          renderFoldersAdminUi();
          toast('Capa da pasta atualizada.', { kind: 'ok', title: 'Pastas' });
          return;
        }

        if (action === 'delete') {
          if (!confirm('Excluir esta foto?')) return;
          await deletePhoto(photoId);
          return;
        }

        if (action === 'replace') {
          await replacePhoto(photoId);
          return;
        }
      });
    });

    // Hidratar previews: Intersection Observer para carregar só quando visível (mais rápido)
    if (uploadState && uploadState.running) return;
    const m = (getRadio('wm_mode') || wmMode || 'tile_dense');
    const wm = encodeURIComponent(m);
    const imgs = Array.from(pGrid.querySelectorAll('img[data-photo-id]'))
      .map(img => ({ img, id: parseInt(img.getAttribute('data-photo-id') || '0', 10) }))
      .filter(x => x.id);
    if (!imgs.length) return;
    const loadOne = (img, id) => {
      if (img.getAttribute('data-preview-loading') === '1' || img.getAttribute('data-preview-loaded') === '1') return;
      img.setAttribute('data-preview-loading', '1');
      setImgPreview(img, { url: `${API_URL}/api/king-selection/photos/${id}/preview?wm_mode=${wm}`, photoId: id })
        .then(() => { img.setAttribute('data-preview-loaded', '1'); })
        .catch(() => { })
        .finally(() => { img.removeAttribute('data-preview-loading'); });
    };
    if (typeof IntersectionObserver !== 'undefined') {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(ent => {
          if (!ent.isIntersecting) return;
          const img = ent.target;
          const id = parseInt(img.getAttribute('data-photo-id') || '0', 10);
          if (!id) return;
          io.unobserve(img);
          loadOne(img, id);
        });
      }, { rootMargin: '80px', threshold: 0.01 });
      imgs.forEach(({ img }) => {
        img.removeAttribute('data-preview-loaded');
        io.observe(img);
      });
      // Carregar as primeiras 8 imediatamente (above the fold)
      imgs.slice(0, 8).forEach(({ img, id }) => {
        try { io.unobserve(img); } catch (_) { }
        loadOne(img, id);
      });
    } else {
      runPool(imgs, 10, async ({ img, id }) => loadOne(img, id)).catch(() => { });
    }
  }

  function renderAll() {
    projectTitle.textContent = gallery?.nome_projeto || 'Projeto';
    projectSub.textContent = `slug: ${gallery?.slug || '-'}`;

    // Activity — lista por cliente; painel usa o cliente em foco (ou legado sem tabela de clientes)
    const galleryStatus = gallery?.status || '-';
    const clientsList = Array.isArray(gallery?.clients) ? gallery.clients : [];
    const enabledClients = clientsList.filter(c => c && c.enabled !== false);

    function normSt(raw) {
      const s = ksNormGalleryStatus(raw);
      return s || 'andamento';
    }

    let focusId = parseInt(_activityFocusClientId, 10) || null;
    if ((!focusId || !enabledClients.some(c => parseInt(c.id, 10) === focusId)) && enabledClients.length > 0) {
      const revOnly = enabledClients.filter(c => normSt(c.status) === 'revisao');
      if (revOnly.length === 1) {
        focusId = parseInt(revOnly[0].id, 10);
      } else if (enabledClients.length === 1) {
        focusId = parseInt(enabledClients[0].id, 10);
      } else {
        const revMulti = enabledClients.filter(c => normSt(c.status) === 'revisao');
        focusId = revMulti.length === 1
          ? parseInt(revMulti[0].id, 10)
          : parseInt(enabledClients[0].id, 10);
      }
      _activityFocusClientId = focusId;
    }

    const fc = focusId && enabledClients.some(c => parseInt(c.id, 10) === focusId)
      ? enabledClients.find(c => parseInt(c.id, 10) === focusId)
      : (enabledClients.length === 1 ? enabledClients[0] : null);
    const andGroup = enabledClients.filter(c => ['preparacao', 'andamento'].includes(normSt(c.status)));
    const revGroup = enabledClients.filter(c => normSt(c.status) === 'revisao');
    const finGroup = enabledClients.filter(c => normSt(c.status) === 'finalizado');

    const qAct = String(actSearch?.value || '').trim().toLowerCase();
    function clientMatchesSearch(c) {
      if (!qAct) return true;
      const hay = `${c.nome || ''} ${c.email || ''} ${c.telefone || ''} ${gallery?.slug || ''}`.toLowerCase();
      return hay.includes(qAct);
    }

    function matchesPayFilterRow(c) {
      if (activityPayFilter === 'all' || !isSalesModeEnabled()) return true;
      const payStatus = String(c.sales_payment_status || '').toLowerCase();
      const payBadge = String(c.sales_payment_badge || '').trim();
      const isBlessed = payStatus === 'blessed'
        || !!c.sales_payment_is_blessed
        || /cortesia|abençoada|aben/i.test(payBadge);
      const isConfirmed = payStatus === 'confirmed';
      if (activityPayFilter === 'courtesy') return isBlessed;
      if (activityPayFilter === 'paid') return isConfirmed && !isBlessed;
      if (activityPayFilter === 'unpaid') return !isBlessed && !isConfirmed;
      return true;
    }

    function sortActivityClients(list) {
      const mode = activitySortMode || 'name_asc';
      const arr = list.slice();
      const nameKey = (c) => String(c.nome || c.email || 'Cliente').trim().toLowerCase();
      const timeKey = (c) => {
        const raw = c.created_at || c.updated_at;
        const t = raw ? Date.parse(raw) : NaN;
        if (!Number.isNaN(t)) return t;
        return parseInt(c.id, 10) || 0;
      };
      if (mode === 'name_asc') arr.sort((a, b) => nameKey(a).localeCompare(nameKey(b), 'pt-BR'));
      else if (mode === 'name_desc') arr.sort((a, b) => nameKey(b).localeCompare(nameKey(a), 'pt-BR'));
      else if (mode === 'order_asc') arr.sort((a, b) => timeKey(a) - timeKey(b));
      else if (mode === 'order_desc') arr.sort((a, b) => timeKey(b) - timeKey(a));
      return arr;
    }

    function prepActivityGroup(rawGroup) {
      return sortActivityClients(rawGroup.filter(matchesPayFilterRow));
    }

    const andPrepared = prepActivityGroup(andGroup);
    const revPrepared = prepActivityGroup(revGroup);
    const finPrepared = prepActivityGroup(finGroup);

    function renderActivityList(container, arr) {
      if (!container) return;
      const vis = arr.filter(clientMatchesSearch);
      if (!vis.length) {
        container.innerHTML = '<div class="ks-abo-item ks-muted" style="opacity:.75">—</div>';
        return;
      }
      container.innerHTML = vis.map((c) => {
        const id = parseInt(c.id, 10);
        const nm = escapeHtml(String(c.nome || '').trim() || (c.email || 'Cliente'));
        const em = escapeHtml(String(c.email || '').trim());
        const ph = escapeHtml(String(c.telefone || '').trim());
        const sub = [em, ph].filter(Boolean).join(' · ') || em || '—';
        const payBadge = String(c.sales_payment_badge || '').trim();
        let badgeHtml = '';
        if (payBadge) {
          const payStatus = String(c.sales_payment_status || '').toLowerCase();
          const isBlessed = payStatus === 'blessed'
            || !!c.sales_payment_is_blessed
            || /aben|cortesia/i.test(payBadge);
          const isConfirmed = payStatus === 'confirmed';
          const icon = isBlessed ? 'fa-gift' : (isConfirmed ? 'fa-circle-check' : 'fa-receipt');
          const bg = isBlessed ? 'rgba(139,92,246,.26)' : (isConfirmed ? 'rgba(22,163,74,.30)' : 'rgba(234,179,8,.30)');
          const border = isBlessed ? 'rgba(167,139,250,.85)' : (isConfirmed ? 'rgba(34,197,94,.78)' : 'rgba(250,204,21,.82)');
          const color = isBlessed ? '#ede9fe' : (isConfirmed ? '#dcfce7' : '#fef08a');
          badgeHtml =
            `<span style="display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:999px;border:1px solid ${border};background:${bg};color:${color};font-size:10px;font-weight:900;letter-spacing:.02em;white-space:nowrap">
              <i class="fas ${icon}" style="font-size:12px"></i>${escapeHtml(payBadge)}
            </span>`;
        }
        const active = focusId && id === focusId;
        return `<div class="ks-abo-item ks-act-client-row${active ? ' active' : ''}" style="display:flex;align-items:stretch;gap:6px">
          <div class="ks-act-client-pick flex-1 min-w-0" data-act-client-id="${id}" role="button" tabindex="0">
            <div class="nm" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${nm}${badgeHtml}</div>
            <div class="sm">${sub}</div>
          </div>
          <button type="button" class="ks-act-contact-open ks-btn shrink-0 self-center my-1 mr-1" style="padding:6px 10px;font-size:11px" data-act-client-id="${id}" title="Dados para copiar" aria-label="Dados do cliente"><i class="fas fa-address-card"></i></button>
          <button type="button" class="ks-act-drop-client ks-btn shrink-0 self-center my-1 mr-1" style="padding:6px 10px;font-size:11px;color:#fca5a5;border-color:rgba(252,165,165,.45)" data-act-client-id="${id}" title="Excluir rodada atual + cadastro (e-mail) deste cliente" aria-label="Excluir cliente e rodada"><i class="fas fa-user-slash"></i></button>
        </div>`;
      }).join('');
    }

    renderActivityList(actListAnd, andPrepared);
    renderActivityList(actListRev, revPrepared);
    renderActivityList(actListFin, finPrepared);

    if (actCountAnd) actCountAnd.textContent = String(andPrepared.filter(clientMatchesSearch).length);
    if (actCountRev) actCountRev.textContent = String(revPrepared.filter(clientMatchesSearch).length);
    if (actCountFin) actCountFin.textContent = String(finPrepared.filter(clientMatchesSearch).length);

    if (actSortSel) actSortSel.value = activitySortMode;
    if (actPayFilterSel) actPayFilterSel.value = activityPayFilter;

    const contactRow = fc
      || (enabledClients.length ? enabledClients[0] : null);
    const clientStatus = contactRow && contactRow.status != null
      ? normSt(contactRow.status)
      : '';
    const galleryStatusNorm = ksNormGalleryStatus(galleryStatus);
    const status = (clientStatus && ['preparacao', 'andamento', 'revisao', 'finalizado'].includes(clientStatus))
      ? clientStatus
      : (galleryStatusNorm || galleryStatus);
    if (gallery && typeof gallery === 'object') gallery._panelClientStatus = status;
    const selIds = Array.isArray(gallery?.selectedPhotoIds) ? gallery.selectedPhotoIds : [];
    const selectedCount = selIds.length || 0;
    const selIdsNum = selIds.map(x => parseInt(x, 10)).filter(Boolean);
    const bmEarly = gallery?.selectionBatchByPhotoId || {};
    const rd = gallery?.selectionRoundsSummary || {};
    const rKeys = Object.keys(rd).map(k => parseInt(k, 10)).filter(n => Number.isFinite(n) && n > 0);
    const maxRound = rKeys.length ? Math.max(...rKeys) : 1;

    let activityBatchUi = 'all';
    if (actBatchFilter && actBatchToolbar && rKeys.length >= 1) {
      actBatchToolbar.classList.remove('hidden');
      actBatchToolbar.classList.add('flex');
      actBatchFilter.innerHTML = '<option value="all">Todas as sessões (acumulado)</option>';
      for (const k of rKeys.slice().sort((a, b) => a - b)) {
        const opt = document.createElement('option');
        opt.value = String(k);
        const n = rd[String(k)] ?? rd[k] ?? 0;
        opt.textContent = `Seleção ${k} (${n} foto${n === 1 ? '' : 's'})`;
        actBatchFilter.appendChild(opt);
      }
      const pref = activityBatchPrefByGallery[galleryId];
      const valid = pref === 'all' || rKeys.includes(parseInt(pref, 10));
      activityBatchUi = valid ? pref : String(maxRound);
      activityBatchPrefByGallery[galleryId] = activityBatchUi;
      actBatchFilter.value = activityBatchUi;
    } else if (actBatchToolbar) {
      actBatchToolbar.classList.add('hidden');
      actBatchToolbar.classList.remove('flex');
      activityBatchUi = 'all';
    }

    if (actDeleteBatch) {
      const batchNum = parseInt(activityBatchUi, 10);
      const cidBatch = contactRow ? parseInt(contactRow.id, 10) : null;
      const showDel = !!(cidBatch && activityBatchUi !== 'all' && Number.isFinite(batchNum) && batchNum >= 1);
      actDeleteBatch.classList.toggle('hidden', !showDel);
      if (actReactivateBatch) actReactivateBatch.classList.toggle('hidden', !showDel);
      if (actOpenNextRound) actOpenNextRound.classList.toggle('hidden', !showDel);
      if (actSalesApproveAllBtn) {
        const showSalesBulk = !!(showDel && isSalesModeEnabled() && status === 'revisao');
        actSalesApproveAllBtn.classList.toggle('hidden', !showSalesBulk);
        actSalesApproveAllBtn.disabled = !showSalesBulk;
      }
      if (actReactivateBatch) {
        const canReactivateHere = !!(showDel && ['revisao', 'finalizado'].includes(status));
        actReactivateBatch.disabled = !canReactivateHere;
        actReactivateBatch.style.opacity = canReactivateHere ? '' : '0.5';
      }
      if (actOpenNextRound) {
        const canOpenHere = !!(showDel && status === 'revisao');
        actOpenNextRound.disabled = !canOpenHere;
        actOpenNextRound.style.opacity = canOpenHere ? '' : '0.5';
      }
    }

    const displaySelectedCount = (() => {
      if (activityBatchUi === 'all' || !activityBatchUi) return selectedCount;
      const target = parseInt(activityBatchUi, 10);
      if (!Number.isFinite(target) || target < 1) return selectedCount;
      let n = 0;
      for (const pid of selIdsNum) {
        const b = parseInt(bmEarly[pid] ?? bmEarly[String(pid)], 10) || 1;
        if (b === target) n += 1;
      }
      return n;
    })();

    aStatus.textContent = status;
    aSelected.textContent = String(displaySelectedCount);
    if (aSelectedSub) {
      if (rKeys.length > 1 && activityBatchUi !== 'all') {
        aSelectedSub.textContent = `Total acumulado (todas as sessões): ${selectedCount} foto(s)`;
      } else if (rKeys.length > 1 && activityBatchUi === 'all') {
        aSelectedSub.textContent = 'Soma de todas as seleções — use o menu acima para ver só uma rodada.';
      } else {
        aSelectedSub.textContent = '';
      }
    }
    // No Alboom, o "início" é quando começou; aqui usamos updated_at/created_at (melhor do que vazio).
    aUpdated.textContent = fmtDate(gallery?.created_at || gallery?.updated_at);

    // bloco de mensagem (mantém id ks-feedback)
    const fb = gallery?.feedback_cliente ? String(gallery.feedback_cliente) : '';
    if (fb) {
      aFeedback.classList.remove('ks-abo-empty');
      aFeedback.textContent = fb;
    } else {
      aFeedback.classList.add('ks-abo-empty');
      aFeedback.textContent = 'Nenhuma mensagem enviada';
    }

    // painel de cliente (estilo Alboom) — prioriza linha em foco na lista multi-cliente
    const rawEmail = contactRow ? String(contactRow.email || '').trim() : String(gallery?.cliente_email || '').trim();
    const rawPhone = contactRow ? String(contactRow.telefone || '').trim() : String(gallery?.cliente_telefone || '').trim();
    const nome = contactRow ? String(contactRow.nome || '').trim() : String(gallery?.cliente_nome || '').trim();
    const clientName = nome
      || (!isPlaceholderClienteEmail(rawEmail) ? rawEmail : '')
      || (gallery?.slug || 'Cliente');
    if (actClientName) actClientName.textContent = clientName;

    const showPhone = rawPhone && rawPhone !== '-';
    if (actContactLine) actContactLine.style.display = '';
    if (actEmail) {
      actEmail.classList.toggle('opacity-70', !!rawEmail && isPlaceholderClienteEmail(rawEmail));
      if (rawEmail) {
        actEmail.textContent = isPlaceholderClienteEmail(rawEmail) ? `E-mail (acesso): ${rawEmail}` : rawEmail;
      } else {
        actEmail.textContent = 'E-mail não cadastrado';
      }
      actEmail.style.display = '';
    }
    const sepEl = actContactLine?.querySelector('.ks-activity-contact-sep');
    if (sepEl) sepEl.style.display = rawEmail && showPhone ? '' : 'none';
    if (actPhone) {
      actPhone.textContent = showPhone ? rawPhone : 'Telefone não cadastrado';
      actPhone.style.display = '';
    }
    if (actOpenWhatsappBtn) {
      const wd = resolveWhatsappDigits(rawPhone);
      const canOpen = wd.length >= 10;
      const clientLabel = clientName || 'cliente';
      const msg = `Olá, ${clientLabel}! Aqui é o fotógrafo da galeria "${gallery?.nome_projeto || ''}".`;
      if (canOpen) {
        actOpenWhatsappBtn.style.display = '';
        actOpenWhatsappBtn.disabled = false;
        actOpenWhatsappBtn.setAttribute('data-whats-link', `https://wa.me/${encodeURIComponent(wd)}?text=${encodeURIComponent(msg)}`);
        actOpenWhatsappBtn.title = 'Abrir conversa no WhatsApp deste cliente';
      } else {
        actOpenWhatsappBtn.style.display = '';
        actOpenWhatsappBtn.disabled = true;
        actOpenWhatsappBtn.removeAttribute('data-whats-link');
        actOpenWhatsappBtn.title = 'Cliente sem WhatsApp válido (com DDD)';
      }
    }
    if (actPassRow && actPassSpan && actRevealPassBtn) {
      const amPriv = String(gallery?.access_mode || 'private').toLowerCase() === 'private';
      const cidPass = contactRow ? parseInt(contactRow.id, 10) || 0 : 0;
      const showPass = amPriv && cidPass > 0;
      actPassRow.style.display = showPass ? '' : 'none';
      actRevealPassBtn.setAttribute('data-ks-reveal-pass', String(cidPass || 0));
      actPassSpan.textContent = '••••••';
      actPassSpan.removeAttribute('data-revealed');
      actRevealPassBtn.textContent = 'Mostrar';
      actRevealPassBtn.disabled = false;
    }
    if (actBadge) {
      const map = { preparacao: 'Preparação', andamento: 'Em andamento', revisao: 'Em revisão', finalizado: 'Finalizado' };
      actBadge.textContent = map[status] || status;
    }
    if (actSalesMini && actSalesPendingMini && actSalesApprovedMini) {
      const isSales = isSalesModeEnabled();
      const cidMini = contactRow ? parseInt(contactRow.id, 10) || 0 : 0;
      const stats = isSales ? computeSalesMiniStatsForClient(cidMini) : { pendingProof: 0, pendingBalanceRounds: 0, approvedPhotos: 0 };
      const hasAny = isSales && (stats.pendingProof > 0 || stats.pendingBalanceRounds > 0 || stats.approvedPhotos > 0);
      actSalesMini.style.display = hasAny ? '' : 'none';
      if (stats.pendingProof > 0 || stats.pendingBalanceRounds > 0) {
        actSalesPendingMini.style.display = '';
        const parts = [];
        if (stats.pendingProof > 0) parts.push(`${stats.pendingProof} comprov. pendente(s)`);
        if (stats.pendingBalanceRounds > 0) parts.push(`${stats.pendingBalanceRounds} com saldo`);
        actSalesPendingMini.innerHTML = `<i class="fas fa-receipt" style="font-size:13px"></i> ${parts.join(' • ')}`;
        actSalesPendingMini.style.color = '#fef08a';
        actSalesPendingMini.style.borderColor = 'rgba(250,204,21,.82)';
        actSalesPendingMini.style.background = 'rgba(234,179,8,.30)';
      } else {
        actSalesPendingMini.style.display = 'none';
      }
      if (stats.approvedPhotos > 0) {
        actSalesApprovedMini.style.display = '';
        actSalesApprovedMini.innerHTML = `<i class="fas fa-circle-check" style="font-size:14px"></i> ${stats.approvedPhotos} foto(s) aprovada(s)`;
        actSalesApprovedMini.style.color = '#dcfce7';
        actSalesApprovedMini.style.borderColor = 'rgba(34,197,94,.78)';
        actSalesApprovedMini.style.background = 'rgba(22,163,74,.30)';
      } else {
        actSalesApprovedMini.style.display = 'none';
      }
    }

    // Ações (Finalizar/Reativar/Compartilhar)
    // Regra desejada:
    // - se está "revisao" (cliente já escolheu), o próximo passo é "Finalizar" (não "Reativar")
    // - "Reativar" é ação principal somente quando já está "finalizado"
    const st = ksNormGalleryStatus(status) || galleryStatusNorm;
    const canReactivate = ['revisao', 'finalizado'].includes(st);
    const canFinalize = ['preparacao', 'andamento', 'revisao'].includes(st);

    // Sempre mostrar Finalizar e Reativar no dropdown (habilitar conforme status)
    if (actFinalize) {
      actFinalize.disabled = !canFinalize;
      actFinalize.style.display = '';
    }
    if (actReactivate) {
      actReactivate.disabled = !canReactivate;
      actReactivate.style.display = '';
    }
    if (actDeleteClient) {
      const hasMulti = Array.isArray(gallery?.clients) && gallery.clients.length > 0;
      const delId = parseInt(_activityFocusClientId, 10) || parseInt(_activeClientId, 10) || (contactRow ? parseInt(contactRow.id, 10) : 0);
      actDeleteClient.disabled = !galleryId || !hasMulti || !delId;
    }

    if (actMainBtn) {
      if (st === 'finalizado') actMainBtn.innerHTML = `<i class="fas fa-rotate-left"></i> Reativar`;
      else actMainBtn.innerHTML = `<i class="fas fa-flag-checkered"></i> Finalizar`;
      actMainBtn.classList.add('ks-btn-primary');
    }

    document.querySelectorAll('[data-ks-open-round]').forEach((btn) => {
      btn.disabled = st !== 'revisao';
      btn.style.opacity = btn.disabled ? '0.5' : '';
    });
    document.querySelectorAll('[data-ks-clear-review]').forEach((btn) => {
      btn.disabled = st !== 'revisao';
      btn.style.opacity = btn.disabled ? '0.5' : '';
    });
    if (actDeleteCurrentRoundBtn) {
      const rounds = Object.keys(gallery?.selectionRoundsSummary || {})
        .map((k) => parseInt(k, 10))
        .filter((n) => Number.isFinite(n) && n > 0);
      actDeleteCurrentRoundBtn.disabled = st !== 'revisao' || !rounds.length;
      actDeleteCurrentRoundBtn.style.opacity = actDeleteCurrentRoundBtn.disabled ? '0.5' : '';
      const tipBatch = rounds.length ? Math.max(...rounds) : null;
      actDeleteCurrentRoundBtn.title = tipBatch
        ? `Apaga só a rodada atual (Seleção ${tipBatch}) e mantém o cadastro do cliente.`
        : 'Não há rodada para excluir.';
    }
    if (actDeleteRoundClientBtn) {
      const rounds = Object.keys(gallery?.selectionRoundsSummary || {})
        .map((k) => parseInt(k, 10))
        .filter((n) => Number.isFinite(n) && n > 0);
      const can = st === 'revisao' && !!rounds.length;
      actDeleteRoundClientBtn.disabled = !can;
      actDeleteRoundClientBtn.style.opacity = can ? '' : '0.5';
      const tipBatch = rounds.length ? Math.max(...rounds) : null;
      actDeleteRoundClientBtn.title = tipBatch
        ? `Apaga a rodada atual (Seleção ${tipBatch}) e exclui o cadastro do cliente nesta galeria.`
        : 'Não há rodada para excluir.';
    }

    if (actRoundsDetail) {
      actRoundsDetail.textContent = '';
      actRoundsDetail.classList.add('hidden');
    }

    // fotos selecionadas (tabs estilo Alboom) — respeita filtro "Ver seleção"
    if (actSelPhotos && actSelEmpty) {
      const set = new Set(selIdsNum);
      const photosAll = Array.isArray(gallery?.photos) ? gallery.photos : [];
      let selectedPhotos = photosAll.filter(p => set.has(p.id));
      const activityCid = contactRow ? (parseInt(contactRow.id, 10) || 0) : 0;
      const activityBatchNum = parseInt(activityBatchUi, 10);
      const canInlineSalesApprove = !!(isSalesModeEnabled() && activityCid && activityBatchUi !== 'all' && Number.isFinite(activityBatchNum) && activityBatchNum >= 1);
      const showBatchTag = maxRound > 1;
      const bm = bmEarly;
      if (activityBatchUi !== 'all') {
        const tb = parseInt(activityBatchUi, 10);
        if (Number.isFinite(tb) && tb > 0) {
          selectedPhotos = selectedPhotos.filter(p => (parseInt(bm[p.id] ?? bm[String(p.id)], 10) || 1) === tb);
        }
      }
      actSelPhotos.innerHTML = selectedPhotos.map(p => {
        const b = parseInt(bm[p.id] ?? bm[String(p.id)], 10) || 1;
        const tag = showBatchTag ? ` <span class="opacity-50">· S${b}</span>` : '';
        const salesAct = canInlineSalesApprove
          ? `<div class="mt-1 flex items-center gap-1 flex-wrap">
              <button type="button" class="ks-btn ks-btn-sm" data-act-sales-approve="${p.id}" title="Aprovar esta foto para download original"><i class="fas fa-check"></i> Aprovar</button>
             </div>`
          : '';
        return `
        <div class="ks-abo-ph">
          <img loading="lazy" src="" data-photo-id="${p.id}" alt="${escapeHtml(p.original_name || 'foto')}" />
          <div class="ks-abo-cap">${escapeHtml(p.original_name || '')}${tag}${salesAct}</div>
        </div>`;
      }).join('');
      actSelEmpty.classList.toggle('hidden', selectedPhotos.length > 0);

      const imgs = Array.from(actSelPhotos.querySelectorAll('img[data-photo-id]'))
        .map(img => ({ img, id: parseInt(img.getAttribute('data-photo-id') || '0', 10) }))
        .filter(x => x.id);
      runPool(imgs, 6, async ({ img, id }) =>
        setImgPreview(img, { url: `${API_URL}/api/king-selection/photos/${id}/preview?wm_mode=none`, photoId: id })
      ).catch(() => { });
    }

    // “Comentários” (por enquanto, usamos a mensagem do cliente como comentário)
    if (actCommentsBox) {
      actCommentsBox.textContent = fb ? fb : 'Nenhum comentário';
    }

    // Details (categorias alinhadas ao modal «Nova galeria» em kingSelectionEdit.html)
    fNome.value = gallery?.nome_projeto || '';
    const cat = (gallery?.categoria || '').toString().trim();
    if (fCategoria) {
      const optVals = Array.from(fCategoria.options || [])
        .map((o) => o.value)
        .filter((v) => v && v !== '_outro');
      const hit = optVals.find((v) => v.toLowerCase() === cat.toLowerCase());
      if (hit) {
        fCategoria.value = hit;
        if (fCategoriaOutro) {
          fCategoriaOutro.value = '';
          fCategoriaOutro.classList.add('hidden');
        }
      } else if (cat) {
        fCategoria.value = '_outro';
        if (fCategoriaOutro) {
          fCategoriaOutro.value = cat;
          fCategoriaOutro.classList.remove('hidden');
        }
      } else {
        fCategoria.value = '';
        if (fCategoriaOutro) {
          fCategoriaOutro.value = '';
          fCategoriaOutro.classList.add('hidden');
        }
      }
    }
    if (fMaxSelections) fMaxSelections.value = gallery?.total_fotos_contratadas != null ? gallery.total_fotos_contratadas : '';
    if (fMinSelections) fMinSelections.value = gallery?.min_selections != null ? gallery.min_selections : '';
    if (fClientCardHeight) {
      fClientCardHeight.value = String(normalizeClientCardHeightPx(gallery?.client_card_height_px));
      refreshClientCardHeightLabel();
    }
    fData.value = (gallery?.data_trabalho || '').toString().slice(0, 10);
    fIdioma.value = gallery?.idioma || 'pt-BR';
    fMsg.value = gallery?.mensagem_acesso || '';

    // Privacy (password antigo = signup)
    const am = gallery?.access_mode || 'private';
    setRadio('access_mode', am === 'password' ? 'signup' : am);

    // Clients (multi-client)
    if (selfSignup) selfSignup.checked = !!gallery?.allow_self_signup;
    // render
    try { renderClients(); } catch (_) { }

    // Download
    dAllow.checked = !!gallery?.allow_download;
    {
      const lay = String(gallery?.client_folder_layout || '').toLowerCase().trim() === 'flat' ? 'flat' : 'folders';
      if (dlLayoutFolders && dlLayoutFlat) {
        dlLayoutFolders.checked = lay !== 'flat';
        dlLayoutFlat.checked = lay === 'flat';
      }
      if (clientEntrySplash) clientEntrySplash.checked = !!gallery?.client_entry_splash_enabled;
    }

    // Watermark
    const hasCustom = galleryHasCustomWmPath();
    wmMode = gallery?.watermark_mode || 'x';
    // UI simplificada: só usamos "tile_dense", "logo" e "none".
    // Se não há marca personalizada enviada, força tile_dense (evita selecionar "logo" sem arquivo).
    if (!['tile_dense', 'logo', 'none'].includes(wmMode)) wmMode = 'tile_dense';
    if (wmMode === 'logo' && !hasCustom) wmMode = 'tile_dense';
    // Se existe marca personalizada enviada, força o modo "logo" (e desabilita Conecta King)
    if (wmMode === 'tile_dense' && hasCustom) wmMode = 'logo';
    setRadio('wm_mode', wmMode);
    // Habilitar/desabilitar a opção "Sua marca d'água personalizada"
    if (wmModeLogo) wmModeLogo.disabled = !hasCustom;
    if (wmModeLogoWrap) {
      wmModeLogoWrap.style.opacity = hasCustom ? '1' : '0.55';
      wmModeLogoWrap.style.cursor = hasCustom ? 'pointer' : 'not-allowed';
      wmModeLogoWrap.title = hasCustom ? '' : 'Envie uma marca d’água para habilitar esta opção.';
    }
    // Habilitar/desabilitar a opção "Marca d'água da Conecta King"
    if (wmModeCk) wmModeCk.disabled = !!hasCustom;
    if (wmModeCkWrap) {
      wmModeCkWrap.style.opacity = hasCustom ? '0.55' : '1';
      wmModeCkWrap.style.cursor = hasCustom ? 'not-allowed' : 'pointer';
      wmModeCkWrap.title = hasCustom ? 'Remova a marca personalizada para usar a Conecta King.' : '';
    }
    // sliders (defaults)
    wmOpacityPct = clamp(Math.round((parseFloat(gallery?.watermark_opacity ?? 0.12) || 0.12) * 100), 0, 100);
    const baseSc = clamp(Math.round((parseFloat(gallery?.watermark_scale ?? 1.20) || 1.20) * 100), 10, 500);
    const spDb = gallery?.watermark_scale_portrait;
    const slDb = gallery?.watermark_scale_landscape;
    wmScalePortraitPct =
      spDb != null && Number.isFinite(parseFloat(spDb))
        ? clamp(Math.round(parseFloat(spDb) * 100), 10, 500)
        : baseSc;
    wmScaleLandscapePct =
      slDb != null && Number.isFinite(parseFloat(slDb))
        ? clamp(Math.round(parseFloat(slDb) * 100), 10, 500)
        : baseSc;
    const wrp = parseInt(gallery?.watermark_rotate_portrait ?? gallery?.watermark_rotate ?? 0, 10) || 0;
    const wrl = parseInt(gallery?.watermark_rotate_landscape ?? gallery?.watermark_rotate ?? 0, 10) || 0;
    wmRotatePortraitDeg = [0, 90, 180, 270].includes(wrp) ? wrp : 0;
    wmRotateLandscapeDeg = [0, 90, 180, 270].includes(wrl) ? wrl : 0;
    const oxRaw = gallery?.watermark_logo_offset_x;
    const oyRaw = gallery?.watermark_logo_offset_y;
    const parseOffDb = (raw, fallback) => {
      if (raw != null && Number.isFinite(parseFloat(raw))) {
        return clamp(Math.round(parseFloat(raw) * 100) / 100, -50, 50);
      }
      return fallback;
    };
    const fbX = parseOffDb(oxRaw, 0);
    const fbY = parseOffDb(oyRaw, 0);
    wmLogoOffsetXPctPortrait = parseOffDb(gallery?.watermark_logo_offset_x_portrait, fbX);
    wmLogoOffsetYPctPortrait = parseOffDb(gallery?.watermark_logo_offset_y_portrait, fbY);
    wmLogoOffsetXPctLandscape = parseOffDb(gallery?.watermark_logo_offset_x_landscape, fbX);
    wmLogoOffsetYPctLandscape = parseOffDb(gallery?.watermark_logo_offset_y_landscape, fbY);
    const parseStretchDb = (raw, fallback) => {
      if (raw != null && Number.isFinite(parseFloat(raw))) {
        return clamp(Math.round(parseFloat(raw) * 100) / 100, 50, 400);
      }
      return fallback;
    };
    const fbStW = parseStretchDb(gallery?.watermark_stretch_w_pct, 100);
    const fbStH = parseStretchDb(gallery?.watermark_stretch_h_pct, 100);
    wmStretchWPctPortrait = parseStretchDb(gallery?.watermark_stretch_w_pct_portrait, fbStW);
    wmStretchHPctPortrait = parseStretchDb(gallery?.watermark_stretch_h_pct_portrait, fbStH);
    wmStretchWPctLandscape = parseStretchDb(gallery?.watermark_stretch_w_pct_landscape, fbStW);
    wmStretchHPctLandscape = parseStretchDb(gallery?.watermark_stretch_h_pct_landscape, fbStH);
    if (wmOpacity) wmOpacity.value = String(wmOpacityPct);
    if (wmScaleP) wmScaleP.value = String(wmScalePortraitPct);
    if (wmScaleL) wmScaleL.value = String(wmScaleLandscapePct);
    if (wmRotateP) wmRotateP.value = String(wmRotatePortraitDeg);
    if (wmRotateL) wmRotateL.value = String(wmRotateLandscapeDeg);
    updateWmRotateButtonsP();
    updateWmRotateButtonsL();
    if (wmStretchWP) wmStretchWP.value = String(wmStretchWPctPortrait);
    if (wmStretchHP) wmStretchHP.value = String(wmStretchHPctPortrait);
    if (wmStretchWL) wmStretchWL.value = String(wmStretchWPctLandscape);
    if (wmStretchHL) wmStretchHL.value = String(wmStretchHPctLandscape);
    setWmOffsetLabelsPortrait(wmLogoOffsetXPctPortrait, wmLogoOffsetYPctPortrait);
    setWmOffsetLabelsLandscape(wmLogoOffsetXPctLandscape, wmLogoOffsetYPctLandscape);
    setWmStretchLabelsPortrait(wmStretchWPctPortrait, wmStretchHPctPortrait);
    setWmStretchLabelsLandscape(wmStretchWPctLandscape, wmStretchHPctLandscape);
    setWmValueLabels({ opPct: wmOpacityPct, scPPct: wmScalePortraitPct, scLPct: wmScaleLandscapePct });
    setWmRotateLabels(wmRotatePortraitDeg, wmRotateLandscapeDeg);
    scheduleWatermarkPreview();
    refreshWatermarkFilePreview().catch(() => { });

    // Photos: só renderizar quando a aba "Fotos" estiver visível (evita lentidão ao trocar cliente em Atividades).
    const photosPane = document.querySelector('[data-pane="photos"]');
    const photosVisible = !!(photosPane && !photosPane.classList.contains('hidden'));
    if (photosVisible) renderPhotos();

    try {
      syncDetailsClientSummary();
    } catch (_) { }
  }

  function isTechnicalFaceClientRow(row) {
    const email = String(row?.email || '').toLowerCase().trim();
    return email.startsWith('__ks_face_default_') || email.startsWith('__ks_face_sess_');
  }

  async function loadGallery() {
    if (!galleryId) throw new Error('galleryId inválido na URL.');
    let url = `${API_URL}/api/king-selection/galleries/${galleryId}`;
    const fid = parseInt(_activityFocusClientId, 10);
    if (fid) url += `?focusClientId=${encodeURIComponent(fid)}`;
    const res = await fetch(url, { headers: HEADERS });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      localStorage.removeItem('conectaKingToken');
      localStorage.removeItem('conectaKingRefreshToken');
      localStorage.removeItem('conectaKingUser');
      window.location.href = `login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
      return;
    }
    if (!res.ok) throw new Error(data.message || 'Erro ao carregar galeria');
    if (data.share_base_url) window.KING_SELECTION_SHARE_BASE_URL = data.share_base_url;
    if (data.focus_client_id != null && data.focus_client_id !== '') {
      _activityFocusClientId = parseInt(data.focus_client_id, 10) || _activityFocusClientId;
    }
    gallery = data.gallery;
    if (gallery && typeof gallery === 'object') {
      normalizeGalleryWatermarkPaths(gallery);
      if (Array.isArray(gallery.clients)) {
        gallery.clients = gallery.clients.filter((row) => !isTechnicalFaceClientRow(row));
      }
      if (!gallery.selectionBatchByPhotoId) gallery.selectionBatchByPhotoId = {};
      if (!gallery.selectionRoundsSummary) gallery.selectionRoundsSummary = {};
    }
    if (Array.isArray(gallery.photos)) {
      gallery.photos = gallery.photos.map(p => ({
        ...p,
        folder_id: p.folder_id ? parseInt(p.folder_id, 10) : null,
        is_favorite: !!p.is_favorite,
        is_cover: !!p.is_cover
      }));
    }
    gallery.folders = normalizeFolders(gallery?.folders);
    if (photoFolderFilterId && !gallery.folders.some((f) => f.id === photoFolderFilterId)) {
      photoFolderFilterId = null;
    }
    if (uploadFolderId && !gallery.folders.some((f) => f.id === uploadFolderId)) {
      uploadFolderId = null;
    }
    // limpar cache de previews ao recarregar galeria (evita vazamento e fotos trocadas)
    revokeAllPreviewUrls();
    hideError();
    renderAll();
    syncFacialToggleFromGallery();
    syncSupportFieldsFromGallery();
    syncPromoFromGallery();
    try {
      const lp = document.querySelector('[data-pane="links"]');
      if (lp && !lp.classList.contains('hidden')) refreshLinksPane().catch(() => {});
      // loadGallery() chama revokeAllPreviewUrls(): se o utilizador está em "Capa do link",
      // o painel "links" está oculto e refreshLinksPane() não corre — a prévia ficava inválida.
      const lcp = document.querySelector('[data-pane="link-cover"]');
      if (lcp && !lcp.classList.contains('hidden')) refreshLinkCoverPane();
    } catch (_) {}
  }

  function syncFacialToggleFromGallery() {
    if (fFaceEnabled && gallery) fFaceEnabled.checked = !!gallery.face_recognition_enabled;
  }

  function loadImageQualityFromGallery() {
    const q = String(gallery?.client_image_quality || 'low').toLowerCase();
    const v = q === 'hd' ? 'hd' : (q === 'max' ? 'max' : 'low');
    const el = document.getElementById(`ks-imgq-${v}`);
    if (el) el.checked = true;
  }

  async function savePatch(payload) {
    const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}`, {
      method: 'PUT',
      headers: HEADERS,
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao salvar');
    return data || {};
  }

  function isSalesModeEnabled() {
    const am = String(gallery?.access_mode || '').toLowerCase();
    return am === 'paid_event_photos';
  }

  function formatCentsBr(v) {
    const n = Math.max(0, parseInt(v, 10) || 0) / 100;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatCentsForInputBr(v) {
    const n = Math.max(0, parseInt(v, 10) || 0) / 100;
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function normalizeLegacyMoneyCents(v) {
    const n = Math.max(0, parseInt(v, 10) || 0);
    if (n > 0 && n < 1000) return n * 100;
    return n;
  }

  /**
   * Reais em formato BR (admin / formulários): 1.600, 1.600,50, 200,50, 1600, 200.00.
   * Devolve centavos ou null se inválido.
   */
  function parseBrMoneyStringToCents(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    const clean = s.replace(/[R$\s]/gi, '').replace(/[^\d.,-]/g, '');
    if (!clean) return null;
    const hasComma = clean.includes(',');
    const hasDot = clean.includes('.');
    let normalized = clean;

    if (hasComma && hasDot) {
      normalized = clean.replace(/\./g, '').replace(',', '.');
    } else if (hasComma && !hasDot) {
      const parts = clean.split(',');
      if (
        parts.length === 2 &&
        parts[1].length <= 2 &&
        /^\d[\d.]*$/.test(parts[0]) &&
        /^\d{1,2}$/.test(parts[1])
      ) {
        normalized = `${parts[0].replace(/\./g, '')}.${parts[1]}`;
      } else {
        normalized = clean.replace(/,/g, '');
      }
    } else if (!hasComma && hasDot) {
      const parts = clean.split('.');
      const last = parts[parts.length - 1];
      if (parts.length === 2 && last.length <= 2) {
        normalized = clean;
      } else {
        normalized = clean.replace(/\./g, '');
      }
    }

    const n = Number.parseFloat(normalized);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.max(0, Math.round(n * 100));
  }

  function parseReaisInputToCents(raw) {
    const s = String(raw || '').trim();
    if (!s) return 0;
    const v = parseBrMoneyStringToCents(raw);
    return v == null ? 0 : v;
  }

  function normalizeMoneyInput(el) {
    if (!el) return;
    const cents = parseReaisInputToCents(el.value);
    el.value = formatCentsForInputBr(cents);
  }

  function maskMoneyWhileTyping(el) {
    if (!el) return;
    const raw = String(el.value || '');
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      el.value = '';
      return;
    }
    const intVal = parseInt(digits, 10) || 0;
    // Interpreta como valor em reais durante digitação (400 -> 400,00).
    el.value = intVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function shouldSkipMoneyMaskOnThisInput(evt) {
    const t = String(evt?.inputType || '').toLowerCase();
    // Durante Backspace/Delete a máscara "puxa" zeros de volta.
    // Deixamos o utilizador apagar livremente e normalizamos no blur.
    return t.startsWith('delete');
  }

  function parseAdminAmountInputToCents(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    const clean = s.replace(/[^\d.,]/g, '');
    if (!clean) return null;
    if (!/[.,]/.test(clean)) {
      const intVal = parseInt(clean, 10);
      if (!Number.isFinite(intVal) || intVal < 0) return null;
      return intVal * 100;
    }
    return parseBrMoneyStringToCents(raw);
  }

  function isBlessedPayment(pay) {
    const st = String(pay?.status || '').toLowerCase();
    const amt = pay?.amount_cents != null ? normalizeLegacyMoneyCents(pay.amount_cents) : null;
    if (st !== 'confirmed') return false;
    if (amt === 0) return true;
    const note = String(pay?.note_admin || '').toLowerCase();
    return note.includes('aben');
  }

  function paymentStatusPt(pay) {
    const st = String(pay?.status || 'pending').toLowerCase();
    if (isBlessedPayment(pay)) return 'ABENÇOADO (CORTESIA)';
    if (st === 'confirmed') return 'PAGO';
    if (st === 'partial') return 'PARCIAL (há saldo em aberto)';
    if (st === 'rejected') return 'COMPROVANTE RECUSADO';
    const hasProof = !!String(pay?.proof_file_path || '').trim();
    return hasProof ? 'PENDENTE (com comprovante)' : 'AGUARDANDO COMPROVANTE';
  }

  /** Bloco curto do status de pagamento (alinhado a valores combinados + recebido real). */
  function buildSalesPaymentStatusInnerHtml(pay) {
    if (!pay) return '';
    const st = paymentStatusPt(pay);
    const amt = pay?.amount_cents != null ? ` • comprovante ${formatCentsBr(normalizeLegacyMoneyCents(pay.amount_cents))}` : '';
    const hasProof = !!(pay && pay.proof_file_path);
    const proofLabel = hasProof ? ' • comprovante enviado' : ' • sem comprovante';
    const rec = Math.max(0, parseInt(pay.amount_received_cumulative_cents, 10) || 0);
    const exp = pay.expected_total_cents != null ? Math.max(0, parseInt(pay.expected_total_cents, 10) || 0) : 0;
    const down = pay.down_payment_cents != null ? Math.max(0, parseInt(pay.down_payment_cents, 10) || 0) : null;
    const remBal = pay.remaining_balance_cents != null ? Math.max(0, parseInt(pay.remaining_balance_cents, 10) || 0) : null;
    const nInst = pay.installment_count != null ? Math.max(1, parseInt(pay.installment_count, 10) || 1) : null;
    const days = pay.installment_interval_days != null ? Math.max(1, parseInt(pay.installment_interval_days, 10) || 1) : null;
    const perRaw = pay.remainder_per_installment_cents != null ? Math.max(0, parseInt(pay.remainder_per_installment_cents, 10) || 0) : null;

    let restHtml = '';
    if (remBal != null && remBal > 0 && nInst != null && nInst >= 1) {
      const perPart = perRaw != null && perRaw > 0 ? perRaw : Math.round(remBal / nInst);
      const daysPart = days != null ? ` <span class="text-slate-500">em ${days} dia(s)</span>` : '';
      restHtml = `<div class="text-[13px]"><span class="text-slate-400">Restante:</span> <b>${nInst}×</b> de <b>${formatCentsBr(perPart)}</b>${daysPart}</div>`;
    } else if (remBal != null && remBal > 0) {
      restHtml = `<div class="text-[13px]"><span class="text-slate-400">Restante:</span> <b>${formatCentsBr(remBal)}</b></div>`;
    }

    const downHtml = down != null && down > 0
      ? `<div class="text-[13px]"><span class="text-slate-400">Entrada:</span> <b>${formatCentsBr(down)}</b></div>`
      : '';

    return (
      `<div class="text-[11px] font-extrabold uppercase tracking-wide text-slate-300">${escapeHtml(st)}${escapeHtml(amt)}${escapeHtml(proofLabel)}</div>` +
      `<div class="text-[13px] mt-1"><span class="text-slate-400">Valor pago:</span> <b>${formatCentsBr(rec)}</b></div>` +
      `<div class="text-[13px]"><span class="text-slate-400">Total negociado:</span> <b>${formatCentsBr(exp)}</b></div>` +
      downHtml +
      restHtml
    );
  }

  function salesApprovalStatusBadge(status) {
    const st = String(status || 'pending').toLowerCase();
    if (st === 'approved') {
      return '<span style="display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:999px;border:1px solid rgba(34,197,94,.75);background:rgba(22,163,74,.28);color:#dcfce7;font-weight:900"><i class="fas fa-circle-check" style="font-size:13px"></i>APROVADA</span>';
    }
    if (st === 'rejected') {
      return '<span style="display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:999px;border:1px solid rgba(248,113,113,.75);background:rgba(185,28,28,.28);color:#fecaca;font-weight:900"><i class="fas fa-circle-xmark" style="font-size:13px"></i>REJEITADA</span>';
    }
    return '<span style="display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:999px;border:1px solid rgba(148,163,184,.55);background:rgba(100,116,139,.18);color:#e2e8f0;font-weight:800"><i class="fas fa-clock"></i>PENDENTE</span>';
  }

  function updateSalesPriceModeUi() {
    const mode = String(salesPriceMode?.value || 'best_price_auto').toLowerCase();
    if (!salesUnitPrice) return;
    const field = salesUnitPrice.closest('.ks-field');
    if (!field) return;
    const label = field.querySelector('label');
    const isPackagesOnly = mode === 'packages_only';
    if (label) {
      label.textContent = isPackagesOnly ? 'Valor unitário (R$, desativado em "Somente pacotes")' : 'Valor unitário (R$)';
    }
    salesUnitPrice.disabled = isPackagesOnly;
    field.style.opacity = isPackagesOnly ? '0.55' : '';
  }

  function renderSalesProofPanel(pay) {
    if (!salesProofPanel || !salesProofMeta || !salesProofEmpty || !salesProofImgWrap || !salesProofImg) return;
    if (!pay) {
      salesProofPanel.classList.add('hidden');
      return;
    }
    salesProofPanel.classList.remove('hidden');
    const amountTxt = pay?.amount_cents != null ? formatCentsBr(normalizeLegacyMoneyCents(pay.amount_cents)) : '—';
    const noteClient = String(pay?.note_client || '').trim();
    const noteAdmin = String(pay?.note_admin || '').trim();
    const cort = pay?.courtesy_cents != null ? formatCentsBr(pay.courtesy_cents) : '—';
    const falta = pay?.balance_due_cents != null ? formatCentsBr(pay.balance_due_cents) : '—';
    const core = buildSalesPaymentStatusInnerHtml(pay);
    salesProofMeta.innerHTML =
      (core ? `<div class="space-y-0.5 mb-2">${core}</div>` : '') +
      `<div class="text-[11px] text-slate-400"><b>Comprovante (valor anexado):</b> ${escapeHtml(amountTxt)} • <b>Cortesia:</b> ${escapeHtml(cort)} • <b>Falta:</b> ${escapeHtml(falta)}</div>` +
      `${noteClient ? `<div class="text-[11px] mt-1"><b>Obs. cliente:</b> ${escapeHtml(noteClient)}</div>` : ''}` +
      `${noteAdmin ? `<div class="text-[11px] mt-1"><b>Obs. ADM:</b> ${escapeHtml(noteAdmin)}</div>` : ''}`;
    const hasProof = !!String(pay?.proof_file_path || '').trim();
    salesProofEmpty.style.display = hasProof ? 'none' : '';
    salesProofImgWrap.classList.toggle('hidden', !hasProof);
    if (hasProof) {
      salesProofImg.setAttribute('data-photo-id', '0');
      setImgPreview(
        salesProofImg,
        { url: `${API_URL}/api/king-selection/galleries/${galleryId}/sales/payment-proof/${pay.id}?t=${Date.now()}`, photoId: 0 }
      ).catch(() => { });
    }
  }

  function buildAutoPixInstructions() {
    const holder = String(salesPixHolder?.value || salesConfigCache?.pix_holder_name || '').trim() || 'o favorecido';
    const key = String(salesPixKey?.value || salesConfigCache?.pix_key || '').trim() || '[chave PIX]';
    const projeto = String(gallery?.nome_projeto || 'seu evento').trim();
    return [
      `Pagamento via PIX (${projeto})`,
      ``,
      `1) Faça o PIX para: ${holder}`,
      `2) Chave PIX: ${key}`,
      `3) Envie o comprovante aqui nesta galeria`,
      `4) Após validação do pagamento e aprovação do fotógrafo, as fotos liberadas aparecerão na aba "Fotos para baixar".`
    ].join('\n');
  }

  function hydrateSalesPhotoPreviews() {
    if (!salesApprovalsWrap) return;
    const items = Array.from(salesApprovalsWrap.querySelectorAll('img[data-sales-photo-preview]'));
    items.forEach((img) => {
      const pid = parseInt(img.getAttribute('data-sales-photo-preview') || '0', 10) || 0;
      if (!pid) return;
      img.setAttribute('data-photo-id', String(pid));
      setImgPreview(img, { url: `${API_URL}/api/king-selection/photos/${pid}/preview?wm_mode=none`, photoId: pid }).catch(() => { });
    });
  }

  function renderSalesPackagesEditor() {
    if (!salesPackagesWrap) return;
    const list = Array.isArray(salesPackagesCache) ? salesPackagesCache : [];
    if (!list.length) {
      salesPackagesWrap.innerHTML = '<div class="ks-muted text-sm">Nenhum pacote cadastrado.</div>';
      return;
    }
    salesPackagesWrap.innerHTML = list.map((p, idx) => `
      <div class="rounded-xl border border-slate-700 p-3 bg-slate-900/75 text-slate-100" data-sales-package="${idx}" draggable="true">
        <div class="mb-2 flex items-center justify-between gap-2">
          <span class="text-xs font-black tracking-widest uppercase text-slate-300">Pacote ${idx + 1}</span>
          <div class="flex items-center gap-1">
            <span class="text-[11px] text-slate-400 mr-1" title="Arraste para reordenar"><i class="fas fa-grip-vertical"></i></span>
            <button type="button" class="ks-btn ks-btn-sm" data-pkg-move="${idx}" data-pkg-dir="up" title="Subir pacote"${idx === 0 ? ' disabled' : ''}>
              <i class="fas fa-arrow-up"></i>
            </button>
            <button type="button" class="ks-btn ks-btn-sm" data-pkg-move="${idx}" data-pkg-dir="down" title="Descer pacote"${idx === (list.length - 1) ? ' disabled' : ''}>
              <i class="fas fa-arrow-down"></i>
            </button>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div class="ks-field">
            <label class="text-slate-300">Nome</label>
            <input class="ks-input mt-1" data-pkg-field="name" placeholder="Ex.: Pacote Start, Pacote Pro" value="${escapeHtml(p.name || '')}" />
          </div>
          <div class="ks-field">
            <label class="text-slate-300">Qtd fotos</label>
            <input class="ks-input mt-1" type="number" min="1" step="1" data-pkg-field="photo_qty" value="${parseInt(p.photo_qty, 10) || 1}" />
          </div>
          <div class="ks-field">
            <label class="text-slate-300">Preço (R$)</label>
            <input class="ks-input mt-1" type="text" inputmode="decimal" data-money="1" data-pkg-field="price_reais" placeholder="Ex.: 400,00" value="${escapeHtml(formatCentsForInputBr(normalizeLegacyMoneyCents(p.price_cents || 0)))}" />
          </div>
          <div class="ks-field">
            <label class="text-slate-300">Ação</label>
            <button type="button" class="ks-btn mt-1 w-full" data-pkg-remove="${idx}"><i class="fas fa-trash"></i> Remover</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  function collectSalesPackagesDraftFromUi() {
    if (!salesPackagesWrap) return Array.isArray(salesPackagesCache) ? salesPackagesCache.slice() : [];
    const cards = Array.from(salesPackagesWrap.querySelectorAll('[data-sales-package]'));
    if (!cards.length) return Array.isArray(salesPackagesCache) ? salesPackagesCache.slice() : [];
    return cards.map((card, idx) => {
      const name = String(card.querySelector('[data-pkg-field="name"]')?.value || '').trim();
      const photo_qty = Math.max(1, parseInt(card.querySelector('[data-pkg-field="photo_qty"]')?.value || '1', 10) || 1);
      const priceRaw = String(
        card.querySelector('[data-pkg-field="price_reais"]')?.value
        || card.querySelector('[data-pkg-field="price_cents"]')?.value
        || '0'
      );
      const price_cents = Math.max(0, parseReaisInputToCents(priceRaw));
      return {
        name: name || `Pacote ${idx + 1}`,
        photo_qty,
        price_cents,
        sort_order: idx + 1,
        active: true
      };
    });
  }

  function isSalesRoundBlessedCourtesy(r) {
    const st = String(r?.payment_status || '').toLowerCase();
    if (st !== 'confirmed' && st !== 'partial') return false;
    const cum = parseInt(r?.amount_received_cumulative_cents, 10) || 0;
    if (cum > 0) return false;
    const amount = normalizeLegacyMoneyCents(r?.payment_amount_cents);
    const note = String(r?.payment_note_admin || '').toLowerCase();
    return amount === 0 || note.includes('aben') || note.includes('cortesia');
  }

  function getSalesClientSummary(c) {
    const rounds = Array.isArray(c?.rounds) ? c.rounds : [];
    const pendingProof = rounds.filter((r) => String(r?.payment_status || '').toLowerCase() === 'pending').length;
    const paidRounds = rounds.filter((r) => {
      const st = String(r?.payment_status || '').toLowerCase();
      return st === 'confirmed' || st === 'partial';
    }).length;
    const blessedRounds = rounds.filter((r) => {
      const st = String(r?.payment_status || '').toLowerCase();
      if (st !== 'confirmed' && st !== 'partial') return false;
      const amount = normalizeLegacyMoneyCents(r?.payment_amount_cents);
      const note = String(r?.payment_note_admin || '').toLowerCase();
      return amount === 0 || note.includes('aben') || note.includes('cortesia');
    }).length;
    const paidNormalRounds = Math.max(0, paidRounds - blessedRounds);
    const approvedCount = rounds.reduce((acc, r) => acc + (parseInt(r?.approved_count, 10) || 0), 0);
    const selectedCount = rounds.reduce((acc, r) => acc + (parseInt(r?.selected_count, 10) || 0), 0);
    const soldCents = rounds.reduce((acc, r) => {
      const st = String(r?.payment_status || '').toLowerCase();
      if (st !== 'confirmed' && st !== 'partial') return acc;
      const cum = parseInt(r?.amount_received_cumulative_cents, 10);
      if (Number.isFinite(cum) && cum >= 0) return acc + cum;
      return acc + normalizeLegacyMoneyCents(r?.payment_amount_cents);
    }, 0);
    const hasPartialBalance = rounds.some((r) => {
      const st = String(r?.payment_status || '').toLowerCase();
      const bal = parseInt(r?.balance_due_cents, 10) || 0;
      const rem = parseInt(r?.remaining_balance_cents, 10) || 0;
      return st === 'partial' || bal > 0 || rem > 0;
    });
    const expectedTotalSum = rounds.reduce((acc, r) => {
      if (isSalesRoundBlessedCourtesy(r)) return acc;
      return acc + (parseInt(r?.expected_total_cents, 10) || 0);
    }, 0);
    /** Soma pelos pacotes em todas as rodadas (referência “como no app”), inclusive cortesias — lista de clientes. */
    const totalCalculatedFromPhotosCents = rounds.reduce((acc, r) => {
      return acc + (parseInt(r?.computed_package_gross_cents, 10) || 0);
    }, 0);
    const hasNegotiatedInAnyRound = rounds.some(
      (r) => r.negotiated_total_cents != null && String(r.negotiated_total_cents).trim() !== ''
    );
    let maxInstallmentCount = null;
    for (const r of rounds) {
      const ic = r?.installment_count;
      if (ic != null && parseInt(ic, 10) >= 1) {
        const v = parseInt(ic, 10);
        if (!Number.isFinite(v)) continue;
        if (maxInstallmentCount == null || v > maxInstallmentCount) maxInstallmentCount = v;
      }
    }
    const missingTotalCents = rounds.reduce((acc, r) => {
      if (isSalesRoundBlessedCourtesy(r)) return acc;
      const b = parseInt(r?.balance_due_cents, 10);
      const rem = parseInt(r?.remaining_balance_cents, 10);
      const balOk = Number.isFinite(b) && b > 0 ? b : 0;
      const remOk = Number.isFinite(rem) && rem > 0 ? rem : 0;
      const owed = balOk > 0 ? balOk : remOk;
      return acc + owed;
    }, 0);
    const totalCourtesyCents = rounds.reduce((acc, r) => acc + (parseInt(r?.courtesy_cents, 10) || 0), 0);
    let restPlanShort = '';
    for (const r of rounds) {
      const rb = parseInt(r?.remaining_balance_cents, 10);
      const ic = parseInt(r?.installment_count, 10);
      const id = parseInt(r?.installment_interval_days, 10);
      if (Number.isFinite(rb) && rb > 0 && Number.isFinite(ic) && ic >= 1) {
        const per = Math.round(rb / ic);
        restPlanShort =
          `${ic}× ${formatCentsBr(per)}` + (Number.isFinite(id) && id > 0 ? ` / ${id}d` : '');
        break;
      }
    }
    return {
      rounds,
      pendingProof,
      paidRounds,
      paidNormalRounds,
      approvedCount,
      selectedCount,
      soldCents,
      blessedRounds,
      hasPartialBalance,
      expectedTotalSum,
      totalCalculatedFromPhotosCents,
      hasNegotiatedInAnyRound,
      maxInstallmentCount,
      missingTotalCents,
      totalCourtesyCents,
      restPlanShort
    };
  }

  function hydrateSalesPaymentTerms(pay, fallbackPkgCents, selectedPhotoCount) {
    if (!salesTermsPhotoRef) return;
    const n = Math.max(0, parseInt(selectedPhotoCount, 10) || 0);
    if (salesTermsCupomNote) {
      salesTermsCupomNote.classList.add('hidden');
      salesTermsCupomNote.textContent = '';
    }
    if (!pay) {
      const cents = fallbackPkgCents != null ? Math.max(0, parseInt(fallbackPkgCents, 10) || 0) : null;
      salesTermsPhotoRef.innerHTML =
        cents != null && n > 0
          ? `${n} foto(s) — soma pelos pacotes (como no app do cliente): <b>${formatCentsBr(cents)}</b>`
          : (cents != null ? `Soma pelos pacotes: <b>${formatCentsBr(cents)}</b>` : '—');
      if (salesTermsNegotiated) salesTermsNegotiated.value = '';
      if (salesTermsDown) salesTermsDown.value = '';
      if (salesTermsRemaining) salesTermsRemaining.value = '';
      if (salesTermsInstallments) salesTermsInstallments.value = '';
      if (salesTermsIntervalDays) salesTermsIntervalDays.value = '';
      if (salesTermsHint) {
        salesTermsHint.textContent =
          cents != null
            ? 'Ainda não há linha de pagamento nesta rodada — o valor acima é a soma pelos pacotes. Salve o total acordado e o plano do restante se precisar.'
            : '';
      }
      return;
    }
    const pkg = pay.computed_package_total_cents != null ? Math.max(0, parseInt(pay.computed_package_total_cents, 10) || 0) : 0;
    const gross = pay.computed_package_gross_cents != null ? Math.max(0, parseInt(pay.computed_package_gross_cents, 10) || 0) : pkg;
    const nShow = n > 0 ? n : (parseInt(pay.pricing_selected_count, 10) || 0);
    const hasNeg = pay.negotiated_total_cents != null;
    const negC = hasNeg ? Math.max(0, parseInt(pay.negotiated_total_cents, 10) || 0) : null;
    const grossLine =
      nShow > 0
        ? `${nShow} foto(s) — soma pelos pacotes (como no app do cliente): <b>${formatCentsBr(gross)}</b>`
        : `Soma pelos pacotes: <b>${formatCentsBr(gross)}</b>`;
    if (hasNeg && negC != null) {
      salesTermsPhotoRef.innerHTML = `${grossLine}<div class="text-emerald-200/95 text-[13px] mt-1 font-bold">Total negociado: ${formatCentsBr(negC)}</div>`;
      if (salesTermsCupomNote) {
        if (gross !== negC) {
          salesTermsCupomNote.textContent = 'O saldo e o status usam o total negociado (acima).';
          salesTermsCupomNote.classList.remove('hidden');
        }
      }
    } else {
      salesTermsPhotoRef.innerHTML = grossLine;
      if (salesTermsCupomNote && pay.pricing_promo_applied && gross !== pkg) {
        salesTermsCupomNote.textContent = `Cupom ativo: no app pode aparecer ${formatCentsBr(pkg)}; aqui a referência usa ${formatCentsBr(gross)} pelas fotos até definir total acordado.`;
        salesTermsCupomNote.classList.remove('hidden');
      }
    }
    if (salesTermsNegotiated) {
      const nv = pay.negotiated_total_cents;
      salesTermsNegotiated.value = nv != null ? formatCentsForInputBr(nv) : '';
    }
    if (salesTermsDown) {
      const d = pay.down_payment_cents;
      salesTermsDown.value = d != null ? formatCentsForInputBr(d) : '';
    }
    if (salesTermsRemaining) {
      const rb = pay.remaining_balance_cents;
      salesTermsRemaining.value = rb != null && parseInt(rb, 10) > 0 ? formatCentsForInputBr(rb) : '';
    }
    if (salesTermsInstallments) {
      const i = pay.installment_count;
      salesTermsInstallments.value = i != null && parseInt(i, 10) >= 1 ? String(parseInt(i, 10)) : '';
    }
    if (salesTermsIntervalDays) {
      const id = pay.installment_interval_days;
      salesTermsIntervalDays.value = id != null && parseInt(id, 10) >= 1 ? String(parseInt(id, 10)) : '';
    }
    if (salesTermsHint) {
      const exp = pay.expected_total_cents != null ? Math.max(0, parseInt(pay.expected_total_cents, 10) || 0) : 0;
      const rec = pay.amount_received_cumulative_cents != null ? Math.max(0, parseInt(pay.amount_received_cumulative_cents, 10) || 0) : 0;
      const bal = pay.balance_due_cents != null ? Math.max(0, parseInt(pay.balance_due_cents, 10) || 0) : 0;
      salesTermsHint.textContent = `Resumo: total ${formatCentsBr(exp)} • recebido ${formatCentsBr(rec)} • falta ${formatCentsBr(bal)}`;
    }
  }

  function estimateRoundValueCents(selectedCount) {
    const qty = Math.max(0, parseInt(selectedCount, 10) || 0);
    if (!qty) return 0;
    const mode = String(salesConfigCache?.sales_price_mode || 'best_price_auto').toLowerCase();
    const unit = normalizeLegacyMoneyCents(salesConfigCache?.sales_unit_price_cents || 0);
    const packs = (Array.isArray(salesPackagesCache) ? salesPackagesCache : [])
      .filter((p) => p && p.active !== false)
      .map((p) => ({
        q: Math.max(1, parseInt(p.photo_qty, 10) || 1),
        v: normalizeLegacyMoneyCents(p.price_cents || 0)
      }))
      .filter((p) => p.v > 0);
    if (!packs.length) return mode === 'packages_only' ? 0 : (qty * unit);
    packs.sort((a, b) => a.q - b.q);
    const exact = packs.find((p) => p.q === qty);
    if (exact) return exact.v;
    if (qty <= packs[0].q) {
      const per = packs[0].v / packs[0].q;
      return Math.round(per * qty);
    }
    for (let i = 0; i < packs.length - 1; i += 1) {
      const cur = packs[i];
      const next = packs[i + 1];
      if (qty > cur.q && qty < next.q) {
        const nextPer = next.v / next.q;
        return Math.round(cur.v + (qty - cur.q) * nextPer);
      }
    }
    const last = packs[packs.length - 1];
    const lastPer = mode === 'packages_only'
      ? (last.v / last.q)
      : Math.max(last.v / last.q, unit > 0 ? unit : 0);
    return Math.round(last.v + (qty - last.q) * lastPer);
  }

  function periodLabelPt(p) {
    const x = String(p || 'week').toLowerCase();
    if (x === 'today') return 'Hoje';
    if (x === 'month') return 'Mês';
    return 'Semana';
  }

  function salesRoundStillOwes(r) {
    const st = String(r?.payment_status || '').toLowerCase();
    const balRaw = r?.balance_due_cents;
    const hasBal = balRaw != null && Number.isFinite(parseInt(balRaw, 10));
    const bal = hasBal ? Math.max(0, parseInt(balRaw, 10) || 0) : null;
    const remInstall = Math.max(0, parseInt(r?.remaining_balance_cents, 10) || 0);
    return (
      st === 'pending' ||
      st === 'rejected' ||
      (hasBal && bal != null && bal > 0) ||
      (st === 'partial' && !hasBal) ||
      remInstall > 0
    );
  }

  function salesRoundEstimateMissingCents(r) {
    const balRaw = r?.balance_due_cents;
    const hasBal = balRaw != null && Number.isFinite(parseInt(balRaw, 10));
    const bal = hasBal ? Math.max(0, parseInt(balRaw, 10) || 0) : null;
    const remInstall = Math.max(0, parseInt(r?.remaining_balance_cents, 10) || 0);
    if (hasBal && bal != null && bal > 0) return bal;
    if (remInstall > 0) return remInstall;
    return estimateRoundValueCents(parseInt(r?.selected_count, 10) || 0);
  }

  function topPendingRoundInPeriod(roundDateIso, period) {
    const dt = roundDateIso ? new Date(roundDateIso) : null;
    if (!dt || Number.isNaN(dt.getTime())) return true;
    const now = new Date();
    const p = String(period || 'week').toLowerCase();
    if (p === 'today') {
      return dt.toDateString() === now.toDateString();
    }
    if (p === 'week') {
      const start = new Date(now);
      const day = start.getDay(); // 0..6
      const diff = day === 0 ? 6 : day - 1; // semana iniciando na segunda
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - diff);
      return dt >= start;
    }
    if (p === 'month') {
      return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
    }
    return true;
  }

  function renderSalesDashboard() {
    const clients = Array.isArray(salesClientsCache) ? salesClientsCache : [];
    let received = 0;
    let missing = 0;
    let courtesySum = 0;
    let clientsPending = 0;
    let roundsPending = 0;
    const topPendingRows = [];
    const period = String(salesTopPendingPeriodValue || 'week').toLowerCase();
    salesDashDetailCache = { received: [], missing: [], courtesy: [] };

    for (const c of clients) {
      const nomeCli = String(c?.nome || c?.email || 'Cliente');
      const cid = parseInt(c?.id, 10) || 0;
      const rounds = Array.isArray(c?.rounds) ? c.rounds : [];
      const hasPending = rounds.some((r) => {
        const st = String(r?.payment_status || '').toLowerCase();
        const bal = parseInt(r?.balance_due_cents, 10) || 0;
        const rem = parseInt(r?.remaining_balance_cents, 10) || 0;
        return st === 'pending' || st === 'rejected' || st === 'partial' || bal > 0 || rem > 0;
      });
      if (hasPending) clientsPending += 1;
      let missingByClient = 0;
      let pendingBatches = 0;
      let pendingBatchesPeriod = 0;
      for (const r of rounds) {
        const st = String(r?.payment_status || '').toLowerCase();
        const balRaw = r?.balance_due_cents;
        const hasBal = balRaw != null && Number.isFinite(parseInt(balRaw, 10));
        const bal = hasBal ? Math.max(0, parseInt(balRaw, 10) || 0) : null;
        const remInstall = Math.max(0, parseInt(r?.remaining_balance_cents, 10) || 0);
        const cum = parseInt(r?.amount_received_cumulative_cents, 10);
        const rec = Number.isFinite(cum) && cum >= 0 ? cum : normalizeLegacyMoneyCents(r?.payment_amount_cents || 0);
        const batch = Math.max(1, parseInt(r?.selection_batch, 10) || 1);
        const cour = Math.max(0, parseInt(r?.courtesy_cents, 10) || 0);

        if (st === 'confirmed' || st === 'partial') {
          received += rec;
          if (rec > 0) {
            salesDashDetailCache.received.push({
              nome: nomeCli,
              clientId: cid,
              batch,
              cents: rec
            });
          }
          if (cour > 0) {
            courtesySum += cour;
            salesDashDetailCache.courtesy.push({
              nome: nomeCli,
              clientId: cid,
              batch,
              cents: cour
            });
          }
        }

        const stillOwes = salesRoundStillOwes(r);
        if (stillOwes) {
          roundsPending += 1;
          pendingBatches += 1;
          const est = salesRoundEstimateMissingCents(r);
          const inPeriod = topPendingRoundInPeriod(r?.round_created_at, period);
          if (inPeriod) {
            pendingBatchesPeriod += 1;
            missing += est;
            missingByClient += est;
            salesDashDetailCache.missing.push({
              nome: nomeCli,
              clientId: cid,
              batch,
              cents: est
            });
          }
        }
      }
      if (missingByClient > 0) {
        topPendingRows.push({
          clientId: cid,
          nome: nomeCli,
          missingByClient,
          pendingBatches: pendingBatchesPeriod || pendingBatches,
          whatsapp: String(c?.telefone || '')
        });
      }
    }

    const sortDetail = (rows) =>
      rows.slice().sort((a, b) => cmpNaturalText(a.nome, b.nome) || (a.batch - b.batch));
    salesDashDetailCache.received = sortDetail(salesDashDetailCache.received);
    salesDashDetailCache.missing = sortDetail(salesDashDetailCache.missing);
    salesDashDetailCache.courtesy = sortDetail(salesDashDetailCache.courtesy);

    if (salesDashReceived) salesDashReceived.textContent = formatCentsBr(received);
    if (salesDashMissing) salesDashMissing.textContent = formatCentsBr(missing);
    if (salesDashCourtesy) salesDashCourtesy.textContent = formatCentsBr(courtesySum);
    if (salesDashMissingPeriod) {
      salesDashMissingPeriod.textContent =
        `No período: ${periodLabelPt(period)} (mesmo filtro do “Top pendências”)`;
    }
    if (salesDashClientsPending) salesDashClientsPending.textContent = String(clientsPending);
    if (salesDashRoundsPending) salesDashRoundsPending.textContent = String(roundsPending);
    if (salesTopPending) {
      const top = topPendingRows
        .sort((a, b) => b.missingByClient - a.missingByClient)
        .slice(0, 6);
      if (!top.length) {
        salesTopPending.innerHTML = '<div class="text-xs text-slate-300">Nenhuma pendência no momento.</div>';
      } else {
        salesTopPending.innerHTML = top.map((row) => `
          <div class="rounded-lg border border-amber-300/35 bg-slate-900/55 px-3 py-2">
            <div class="flex items-center justify-between gap-2">
              <div class="font-semibold text-slate-100 truncate">${escapeHtml(row.nome)}</div>
              <div class="flex items-center gap-1.5">
                <button type="button" class="ks-btn" style="padding:4px 8px;font-size:11px;line-height:1.1" data-sales-top-client="${row.clientId}">
                  Abrir
                </button>
                <button type="button" class="ks-btn" style="padding:4px 8px;font-size:11px;line-height:1.1;border-color:rgba(16,185,129,.55);background:rgba(16,185,129,.15);color:#d1fae5" data-sales-top-whats="${row.clientId}">
                  WhatsApp
                </button>
              </div>
            </div>
            <div class="text-xs text-amber-100 mt-1">Falta receber: <b>${formatCentsBr(row.missingByClient)}</b></div>
            <div class="text-[11px] text-slate-300">${row.pendingBatches} sessão(ões) pendente(s)</div>
          </div>
        `).join('');
      }
    }
  }

  function openSalesDashDetailModal(kind) {
    if (!salesDashDetailModal || !salesDashDetailTitle || !salesDashDetailBody || !salesDashDetailTotal) return;
    const rows = salesDashDetailCache[kind] || [];
    const titles = {
      received: 'Recebido (dinheiro) — por cliente e rodada',
      missing: 'Falta receber (estimado) — por cliente e rodada',
      courtesy: 'Cortesias (abonos) — por cliente e rodada'
    };
    salesDashDetailTitle.textContent = titles[kind] || 'Detalhe';
    const sum = rows.reduce((a, r) => a + (parseInt(r.cents, 10) || 0), 0);
    const moneyClass =
      kind === 'missing' ? 'text-amber-700' : (kind === 'courtesy' ? 'text-fuchsia-700' : 'text-emerald-700');
    if (!rows.length) {
      salesDashDetailBody.innerHTML = '<p class="text-sm text-slate-500">Nenhum lançamento nesta categoria.</p>';
    } else {
      salesDashDetailBody.innerHTML = rows.map((row) => `
        <div class="flex justify-between gap-3 py-2.5 border-b border-slate-100 text-sm">
          <div>
            <span class="font-semibold text-slate-900">${escapeHtml(row.nome)}</span>
            <span class="text-slate-500"> • Rodada ${row.batch}</span>
            <button type="button" class="ml-1.5 text-[11px] text-indigo-600 hover:underline font-semibold" data-sales-detail-open-client="${row.clientId}">Abrir cliente</button>
          </div>
          <div class="font-extrabold ${moneyClass} whitespace-nowrap">${formatCentsBr(row.cents)}</div>
        </div>
      `).join('');
    }
    salesDashDetailTotal.textContent = rows.length ? `Total: ${formatCentsBr(sum)}` : 'Total: —';
    salesDashDetailModal.classList.remove('hidden');
    salesDashDetailModal.classList.add('flex');
    salesDashDetailModal.setAttribute('aria-hidden', 'false');
  }

  function closeSalesDashDetailModal() {
    if (!salesDashDetailModal) return;
    salesDashDetailModal.classList.add('hidden');
    salesDashDetailModal.classList.remove('flex');
    salesDashDetailModal.setAttribute('aria-hidden', 'true');
  }

  function sortSalesClientsByPriority(list) {
    const arr = Array.isArray(list) ? list.slice() : [];
    return arr.sort((a, b) => {
      const sa = getSalesClientSummary(a);
      const sb = getSalesClientSummary(b);
      const pa = sa.pendingProof > 0 ? 1 : 0;
      const pb = sb.pendingProof > 0 ? 1 : 0;
      if (pa !== pb) return pb - pa;
      const pba = sa.hasPartialBalance ? 1 : 0;
      const pbb = sb.hasPartialBalance ? 1 : 0;
      if (pba !== pbb) return pbb - pba;
      if (sa.pendingProof !== sb.pendingProof) return sb.pendingProof - sa.pendingProof;
      if (sa.selectedCount !== sb.selectedCount) return sb.selectedCount - sa.selectedCount;
      return cmpNaturalText(String(a?.nome || a?.email || ''), String(b?.nome || b?.email || ''));
    });
  }

  function pickPreferredSalesClientId(clients, currentId) {
    const list = Array.isArray(clients) ? clients : [];
    const cur = parseInt(currentId || '0', 10) || 0;
    const current = list.find((c) => (parseInt(c?.id, 10) || 0) === cur);
    const hasCurrentPending = current ? getSalesClientSummary(current).pendingProof > 0 : false;
    if (current && hasCurrentPending) return cur;
    const firstPending = list.find((c) => getSalesClientSummary(c).pendingProof > 0);
    if (firstPending) return parseInt(firstPending.id, 10) || cur;
    if (current) return cur;
    return parseInt(list[0]?.id, 10) || 0;
  }

  function paymentStatusPriority(status) {
    const st = String(status || '').toLowerCase();
    if (st === 'pending') return 0;
    if (st === 'rejected') return 1;
    if (st === 'partial') return 2;
    if (st === 'confirmed') return 3;
    return 4;
  }

  function sortClientRoundsForUi(rounds) {
    const arr = Array.isArray(rounds) ? rounds.slice() : [];
    return arr.sort((a, b) => {
      const pa = paymentStatusPriority(a?.payment_status);
      const pb = paymentStatusPriority(b?.payment_status);
      if (pa !== pb) return pa - pb;
      return (parseInt(a?.selection_batch, 10) || 0) - (parseInt(b?.selection_batch, 10) || 0);
    });
  }

  function renderSalesClientsList() {
    if (!salesClientsList) return;
    const clients = Array.isArray(salesClientsCache) ? salesClientsCache : [];
    const selectedClientId = parseInt(salesClientSel?.value || '0', 10) || 0;
    const term = String(salesClientSearchTerm || '').trim().toLowerCase();
    const filtered = term
      ? clients.filter((c) => {
        const nm = String(c?.nome || '').toLowerCase();
        const em = String(c?.email || '').toLowerCase();
        return nm.includes(term) || em.includes(term);
      })
      : clients;
    if (!filtered.length) {
      salesClientsList.innerHTML = term
        ? '<div class="text-xs ks-muted">Nenhum cliente encontrado para esta busca.</div>'
        : '<div class="text-xs ks-muted">Nenhum cliente com seleção nesta galeria.</div>';
      return;
    }
    const f = String(salesClientsListFilter || 'all').toLowerCase();
    let listToShow = filtered;
    if (f === 'received') {
      listToShow = filtered.filter((c) => getSalesClientSummary(c).soldCents > 0);
    } else if (f === 'missing') {
      listToShow = filtered.filter((c) => {
        const s = getSalesClientSummary(c);
        return s.missingTotalCents > 0 || s.pendingProof > 0;
      });
    } else if (f === 'courtesy') {
      listToShow = filtered.filter((c) => {
        const s = getSalesClientSummary(c);
        return s.blessedRounds > 0 || s.totalCourtesyCents > 0;
      });
    }
    if (!listToShow.length) {
      salesClientsList.innerHTML =
        '<div class="text-xs ks-muted">Nenhum cliente neste filtro. Escolha “Tudo” ou ajuste a busca.</div>';
      return;
    }
    salesClientsList.innerHTML = listToShow.map((c) => {
      const cid = parseInt(c?.id, 10) || 0;
      const {
        rounds,
        pendingProof,
        paidRounds,
        paidNormalRounds,
        approvedCount,
        selectedCount,
        soldCents,
        blessedRounds,
        hasPartialBalance,
        expectedTotalSum,
        totalCalculatedFromPhotosCents,
        hasNegotiatedInAnyRound,
        maxInstallmentCount,
        missingTotalCents,
        restPlanShort
      } = getSalesClientSummary(c);
      const active = cid === selectedClientId;
      const hasPending = pendingProof > 0;
      const hasBlessedOnly = !hasPending && paidNormalRounds <= 0 && blessedRounds > 0;
      const hasPaid = !hasPending && paidNormalRounds > 0;
      const activeRing = active ? 'ring-2 ring-rose-400/80 shadow-[0_0_0_1px_rgba(251,113,133,.45)]' : '';
      const activeCls = hasPending
        ? `border-amber-400 bg-amber-500/18 ${activeRing}`
        : (hasPartialBalance
          ? `border-sky-400 bg-sky-500/14 ${activeRing}`
          : (hasBlessedOnly
          ? `border-violet-400 bg-violet-500/14 ${activeRing}`
          : (hasPaid
          ? `border-emerald-400 bg-emerald-500/14 ${activeRing}`
          : `border-slate-700 bg-slate-900/70 ${active ? activeRing : 'hover:border-slate-500'}`)));
      const priorityBadge = hasPending
        ? `<span class="text-[11px] rounded-full border border-amber-300/95 bg-amber-300/30 px-2 py-0.5 text-amber-100 font-black">PENDENTE ${pendingProof}</span>`
        : (hasPartialBalance
          ? '<span class="text-[11px] rounded-full border border-sky-300/95 bg-sky-400/25 px-2 py-0.5 text-sky-100 font-black">SALDO</span>'
          : (hasBlessedOnly
          ? '<span class="text-[11px] rounded-full border border-violet-300/95 bg-violet-400/25 px-2 py-0.5 text-violet-100 font-black">CORTESIA</span>'
          : (hasPaid
          ? '<span class="text-[11px] rounded-full border border-emerald-300/95 bg-emerald-400/25 px-2 py-0.5 text-emerald-100 font-black">PAGO</span>'
          : '<span class="text-[11px] rounded-full border border-slate-600 px-2 py-0.5 text-slate-300">Aguardando</span>')));
      const focusBadge = active
        ? '<span class="text-[11px] rounded-full border border-rose-300/95 bg-rose-500/28 px-2 py-0.5 text-rose-100 font-black"><i class="fas fa-crosshairs"></i> EM FOCO</span>'
        : '';
      const financeBits = (() => {
        const bits = [];
        const estFromApi = totalCalculatedFromPhotosCents > 0 ? totalCalculatedFromPhotosCents : 0;
        const estFallback =
          selectedCount > 0 && estFromApi <= 0 ? estimateRoundValueCents(selectedCount) : 0;
        const totalEstimado = Math.max(estFromApi, estFallback);
        if (selectedCount > 0 && totalEstimado > 0) {
          bits.push(`total estimado: ${formatCentsBr(totalEstimado)}`);
        }
        bits.push(`recebido: ${formatCentsBr(soldCents)}`);
        if (missingTotalCents > 0) bits.push(`falta: ${formatCentsBr(missingTotalCents)}`);
        if (hasNegotiatedInAnyRound && expectedTotalSum > 0) {
          bits.push(`total negociado: ${formatCentsBr(expectedTotalSum)}`);
        }
        if (restPlanShort) bits.push(`plano restante: ${restPlanShort}`);
        return bits.join(' • ');
      })();
      return `
        <button type="button" class="w-full text-left rounded-xl border ${activeCls} p-3 transition" data-sales-client-card="${cid}">
          <div class="flex items-center justify-between gap-2">
            <div class="font-semibold text-slate-100">${escapeHtml(c.nome || c.email || `Cliente #${cid}`)}</div>
            <div class="flex items-center gap-1.5">${focusBadge}${priorityBadge}</div>
          </div>
          <div class="text-xs text-slate-300 mt-1">
            ${selectedCount} foto(s) • ${approvedCount} aprovada(s) • ${rounds.length} sessão(ões) • ${financeBits}
            ${maxInstallmentCount != null ? ` • até ${maxInstallmentCount}x no restante` : ''}
            ${blessedRounds > 0 ? ` • ${blessedRounds} abençoada(s)` : ''}
          </div>
        </button>
      `;
    }).join('');
  }

  function collectSalesPackagesFromUi() {
    if (!salesPackagesWrap) return [];
    const cards = Array.from(salesPackagesWrap.querySelectorAll('[data-sales-package]'));
    return cards.map((card, idx) => {
      const name = String(card.querySelector('[data-pkg-field="name"]')?.value || '').trim();
      const photo_qty = Math.max(1, parseInt(card.querySelector('[data-pkg-field="photo_qty"]')?.value || '0', 10) || 1);
      const priceRaw = String(
        card.querySelector('[data-pkg-field="price_reais"]')?.value
        || card.querySelector('[data-pkg-field="price_cents"]')?.value
        || '0'
      );
      const price_cents = Math.max(0, parseReaisInputToCents(priceRaw));
      return {
        name: name || `${photo_qty} fotos`,
        photo_qty,
        price_cents,
        sort_order: idx + 1,
        active: true
      };
    }).filter((x) => x.photo_qty > 0 && x.price_cents > 0);
  }

  async function loadSalesConfig() {
    const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/sales-config`, { headers: HEADERS });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao carregar configuração comercial');
    salesConfigCache = data.salesConfig || {};
    salesPackagesCache = Array.isArray(data.packages) ? data.packages.slice() : [];
    if (salesPixEnabled) salesPixEnabled.checked = !!salesConfigCache.pix_enabled;
    if (salesPixKey) salesPixKey.value = salesConfigCache.pix_key || '';
    if (salesPixHolder) salesPixHolder.value = salesConfigCache.pix_holder_name || '';
    if (salesPixInstructions) salesPixInstructions.value = salesConfigCache.pix_instructions || '';
    if (salesOverLimit) salesOverLimit.value = salesConfigCache.sales_over_limit_policy || 'allow_and_warn';
    if (salesPriceMode) salesPriceMode.value = salesConfigCache.sales_price_mode || 'best_price_auto';
    if (salesUnitPrice) salesUnitPrice.value = formatCentsForInputBr(normalizeLegacyMoneyCents(salesConfigCache.sales_unit_price_cents || 0));
    updateSalesPriceModeUi();
    renderSalesPackagesEditor();
  }

  async function loadSalesClients() {
    const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/sales/clients`, { headers: HEADERS });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao carregar clientes comerciais');
    const prevClientId = parseInt(salesClientSel?.value || '0', 10) || 0;
    salesClientsCache = sortSalesClientsByPriority(Array.isArray(data.clients) ? data.clients : []);
    const preferredClientId = pickPreferredSalesClientId(salesClientsCache, prevClientId);
    if (salesClientSel) {
      salesClientSel.innerHTML = salesClientsCache.length
        ? salesClientsCache.map((c) => {
          const rounds = Array.isArray(c?.rounds) ? c.rounds : [];
          const proofs = rounds.filter((r) => String(r?.payment_status || '').toLowerCase() === 'pending').length;
          const saldo = rounds.filter((r) => {
            const s = String(r?.payment_status || '').toLowerCase();
            const bal = parseInt(r?.balance_due_cents, 10) || 0;
            return s === 'partial' || bal > 0;
          }).length;
          const approved = rounds.reduce((acc, r) => acc + (parseInt(r?.approved_count, 10) || 0), 0);
          const tag = proofs > 0
            ? ` • ${proofs} comprov. pendente(s)${saldo > 0 ? ` • ${saldo} saldo` : ''}`
            : (saldo > 0 ? ` • ${saldo} com saldo` : (approved > 0 ? ` • ${approved} aprovada(s)` : ''));
          return `<option value="${c.id}">${escapeHtml(c.nome || c.email || `Cliente #${c.id}`)}${escapeHtml(tag)}</option>`;
        }).join('')
        : '<option value="">Sem clientes</option>';
      if (preferredClientId > 0) salesClientSel.value = String(preferredClientId);
    }
    if (salesClientsFilter) salesClientsFilter.value = salesClientsListFilter;
    renderSalesClientsList();
    rebuildSalesRounds(true);
    renderSalesDashboard();
  }

  function rebuildSalesRounds(preferPending = false) {
    if (!salesRoundSel || !salesClientSel) return;
    const cid = parseInt(salesClientSel.value || '0', 10) || 0;
    const cli = salesClientsCache.find((c) => (parseInt(c.id, 10) || 0) === cid);
    const rounds = sortClientRoundsForUi(Array.isArray(cli?.rounds) ? cli.rounds : []);
    const prevRound = Math.max(1, parseInt(salesRoundSel.value || '1', 10) || 1);
    salesRoundSel.innerHTML = rounds.length
      ? rounds.map((r) => {
        const st = String(r?.payment_status || 'pending').toLowerCase();
        const amount = r?.payment_amount_cents != null ? normalizeLegacyMoneyCents(r.payment_amount_cents) : null;
        const note = String(r?.payment_note_admin || '').toLowerCase();
        const bal = parseInt(r?.balance_due_cents, 10);
        const balOk = Number.isFinite(bal) && bal > 0;
        const blessed = st === 'confirmed' && (amount === 0 || note.includes('aben'));
        const payLabel = blessed
          ? ' • abençoado'
          : (st === 'confirmed'
            ? ` • pago${amount != null ? ` (${formatCentsBr(amount)})` : ''}`
            : (st === 'partial' || balOk
              ? ` • parcial${balOk ? ` • falta ${formatCentsBr(bal)}` : ''}`
              : (st === 'rejected' ? ' • comprovante recusado' : ' • aguardando')));
        return `<option value="${r.selection_batch}">Rodada ${r.selection_batch} (${r.selected_count} foto(s))${payLabel}</option>`;
      }).join('')
      : '<option value="1">Rodada 1</option>';
    if (!rounds.length) return;
    if (preferPending) {
      const firstPending = rounds.find((r) => {
        const s = String(r?.payment_status || '').toLowerCase();
        const b = parseInt(r?.balance_due_cents, 10) || 0;
        return s === 'pending' || b > 0 || s === 'partial';
      });
      const preferred = parseInt(firstPending?.selection_batch || rounds[0]?.selection_batch || prevRound, 10) || prevRound;
      salesRoundSel.value = String(preferred);
      return;
    }
    const hasPrev = rounds.some((r) => (parseInt(r?.selection_batch, 10) || 0) === prevRound);
    if (hasPrev) salesRoundSel.value = String(prevRound);
  }

  async function loadSalesDetail() {
    if (!salesClientSel || !salesRoundSel) return;
    const cid = parseInt(salesClientSel.value || '0', 10) || 0;
    const round = Math.max(1, parseInt(salesRoundSel.value || '1', 10) || 1);
    if (!cid) {
      salesDetailCache = null;
      if (salesPaymentStatus) salesPaymentStatus.innerHTML = '—';
      hydrateSalesPaymentTerms(null, null, 0);
      if (salesApprovalsWrap) salesApprovalsWrap.innerHTML = '';
      if (salesProofPanel) salesProofPanel.classList.add('hidden');
      if (salesOpenClientWhatsBtn) {
        salesOpenClientWhatsBtn.innerHTML = '<i class="fab fa-whatsapp"></i> WhatsApp do cliente';
        salesOpenClientWhatsBtn.disabled = true;
        salesOpenClientWhatsBtn.removeAttribute('data-whats-link');
      }
      return;
    }
    const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/sales/clients/${cid}/round/${round}`, { headers: HEADERS });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao carregar detalhe comercial');
    salesDetailCache = data;
    const pay = data.payment || null;
    const selected = Array.isArray(data.selected) ? data.selected : [];
    const fallbackPkg = !pay && selected.length ? estimateRoundValueCents(selected.length) : null;
    hydrateSalesPaymentTerms(pay, fallbackPkg, selected.length);
    const st = String(pay?.status || 'pending');
    if (salesPaymentStatus) {
      if (pay) {
        salesPaymentStatus.innerHTML = buildSalesPaymentStatusInnerHtml(pay);
      } else {
        const hasProof = false;
        const proofLabel = hasProof ? ' • comprovante enviado' : ' • sem comprovante';
        salesPaymentStatus.innerHTML =
          `<div class="text-[11px] font-extrabold uppercase tracking-wide text-slate-300">${escapeHtml(paymentStatusPt(null))}${escapeHtml(proofLabel)}</div>` +
          `<div class="text-[12px] text-slate-400 mt-1">Nenhum pagamento registrado nesta rodada.</div>`;
      }
      if (isBlessedPayment(pay)) {
        salesPaymentStatus.style.borderColor = 'rgba(168,85,247,.78)';
        salesPaymentStatus.style.background = 'rgba(139,92,246,.16)';
        salesPaymentStatus.style.color = '#f3e8ff';
      } else if (st === 'confirmed') {
        salesPaymentStatus.style.borderColor = 'rgba(34,197,94,.78)';
        salesPaymentStatus.style.background = 'rgba(22,163,74,.18)';
        salesPaymentStatus.style.color = '#dcfce7';
      } else if (st === 'partial') {
        salesPaymentStatus.style.borderColor = 'rgba(56,189,248,.78)';
        salesPaymentStatus.style.background = 'rgba(14,165,233,.14)';
        salesPaymentStatus.style.color = '#e0f2fe';
      } else if (st === 'rejected') {
        salesPaymentStatus.style.borderColor = 'rgba(248,113,113,.78)';
        salesPaymentStatus.style.background = 'rgba(220,38,38,.14)';
        salesPaymentStatus.style.color = '#fee2e2';
      } else {
        salesPaymentStatus.style.borderColor = 'rgba(245,158,11,.65)';
        salesPaymentStatus.style.background = 'rgba(234,179,8,.14)';
        salesPaymentStatus.style.color = '#fde68a';
      }
    }
    renderSalesProofPanel(pay);
    const byPhoto = new Map((Array.isArray(data.approvals) ? data.approvals : []).map((a) => [parseInt(a.photo_id, 10), a]));
    if (salesApprovalsWrap) {
      salesApprovalsWrap.innerHTML = selected.map((p) => {
        const ap = byPhoto.get(parseInt(p.photo_id, 10)) || null;
        const status = String(ap?.status || 'pending').toLowerCase();
        const delivery = String(ap?.delivery_mode || 'original').toLowerCase();
        const hasEdited = !!String(p?.edited_file_path || '').trim();
        const statusBadge = salesApprovalStatusBadge(status);
        const approveOriginalDone = status === 'approved' && delivery === 'original';
        const pendingBtnStyle = 'background:rgba(245,158,11,.35);border-color:rgba(251,191,36,.95);color:#fef3c7;font-weight:900';
        const approveDoneStyle = approveOriginalDone
          ? 'background:rgba(22,163,74,.35);border-color:rgba(34,197,94,.95);color:#dcfce7;font-weight:900'
          : '';
        return `
          <div class="rounded-xl border border-slate-700 p-3 bg-slate-900/75 text-slate-100" data-sales-photo="${p.photo_id}" style="box-shadow:0 8px 24px rgba(0,0,0,.35)">
            <div class="rounded-lg overflow-hidden border border-slate-700 bg-black/70">
              <img data-sales-photo-preview="${p.photo_id}" alt="${escapeHtml(p.original_name || '')}" style="width:100%;height:190px;object-fit:contain;display:block;background:#0b0b0b" />
            </div>
            <div class="font-semibold text-sm mt-2">#${p.photo_id} — ${escapeHtml(p.original_name || '')}</div>
            <div class="text-xs mt-1">${statusBadge} <span class="ks-muted">• Entrega: <b>${delivery === 'edited' ? 'EDITADA' : 'ORIGINAL'}</b>${hasEdited ? ' • arquivo editado enviado' : ''}</span></div>
            <div class="mt-2 flex items-center gap-2 flex-wrap">
              <button type="button" class="ks-btn ks-btn-sm" data-sales-photo-action="approve-original" style="${approveDoneStyle}"><i class="fas fa-check"></i> Aprovar original</button>
              <button type="button" class="ks-btn ks-btn-sm" data-sales-photo-action="upload-edited"><i class="fas fa-upload"></i> Substituir por editada</button>
              <button type="button" class="ks-btn ks-btn-sm" data-sales-photo-action="bless" style="background:rgba(139,92,246,.22);border-color:rgba(167,139,250,.82);color:#ede9fe;font-weight:900"><i class="fas fa-gift"></i> Foto abençoada</button>
              <button type="button" class="ks-btn ks-btn-sm" data-sales-photo-action="pending" style="${pendingBtnStyle}"><i class="fas fa-hourglass-half"></i> Aguardando liberação</button>
              <button type="button" class="ks-btn ks-btn-sm" data-sales-photo-action="reject"><i class="fas fa-xmark"></i> Rejeitar</button>
            </div>
          </div>
        `;
      }).join('');
      hydrateSalesPhotoPreviews();
    }
    if (salesOpenProofBtn) {
      const canOpen = !!(pay && pay.id);
      salesOpenProofBtn.disabled = !canOpen;
      salesOpenProofBtn.title = canOpen
        ? 'Ver detalhes do pagamento e comprovante'
        : 'Ainda não há pagamento cadastrado para esta rodada';
    }
    if (salesOpenClientWhatsBtn) {
      const cli = (Array.isArray(salesClientsCache) ? salesClientsCache : []).find((c) => (parseInt(c?.id, 10) || 0) === cid);
      const nomeCli = String(cli?.nome || cli?.email || 'cliente').trim() || 'cliente';
      const wd = resolveWhatsappDigits(cli?.telefone || '');
      const approvedCount = Array.isArray(data?.approvals)
        ? data.approvals.filter((a) => String(a?.status || '').toLowerCase() === 'approved').length
        : 0;
      const balDue = pay?.balance_due_cents != null ? Math.max(0, parseInt(pay.balance_due_cents, 10) || 0) : 0;
      const needsPaymentReminder =
        !isBlessedPayment(pay) &&
        (st === 'pending' || st === 'rejected' || st === 'partial' || balDue > 0);
      const awaitingReview =
        selected.length > 0 && approvedCount === 0 && !needsPaymentReminder;
      const canOpenWa = wd.length >= 10 && (approvedCount > 0 || needsPaymentReminder || awaitingReview);
      const shortName = nomeCli.length > 26 ? `${nomeCli.slice(0, 26)}...` : nomeCli;
      salesOpenClientWhatsBtn.innerHTML = `<i class="fab fa-whatsapp"></i> WhatsApp de ${escapeHtml(shortName)}`;
      salesOpenClientWhatsBtn.disabled = !canOpenWa;
      if (canOpenWa) {
        const link = buildClientShareLink();
        const nomeGaleria = String(gallery?.nome_projeto || gallery?.slug || 'sua galeria').trim() || 'sua galeria';
        const msg = buildSalesClientWhatsMessage({
          approvedCount,
          needsPaymentReminder,
          awaitingReview,
          st,
          nomeCli,
          link,
          nomeGaleria
        });
        salesOpenClientWhatsBtn.setAttribute('data-whats-link', `https://wa.me/${encodeURIComponent(wd)}?text=${encodeURIComponent(msg)}`);
        const waKind = resolveSalesWaTemplateKind({ approvedCount, needsPaymentReminder, awaitingReview, st });
        const waTitles = {
          approved: 'Avisar no WhatsApp: fotos aprovadas — cliente pode baixar pela galeria',
          pending: 'Avisar no WhatsApp: falta pagamento (PIX / saldo) para liberação',
          rejected: 'Avisar no WhatsApp: comprovante recusado — pedir novo envio',
          awaiting: 'Avisar no WhatsApp: pagamento ok — você ainda está aprovando as fotos'
        };
        salesOpenClientWhatsBtn.title = waTitles[waKind] || waTitles.approved;
      } else {
        salesOpenClientWhatsBtn.removeAttribute('data-whats-link');
        salesOpenClientWhatsBtn.title = 'Cliente sem WhatsApp válido (com DDD)';
      }
    }
    renderSalesDashboard();
  }

  async function salesApprovePhoto({ cid, round, photoId, status = 'approved', delivery_mode = 'original' }) {
    const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/sales/clients/${cid}/round/${round}/approve-photo`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ photo_id: photoId, status, delivery_mode })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao aprovar foto');
    return data;
  }

  async function salesApproveAll({ cid, round, status = 'approved', delivery_mode = 'original' }) {
    const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/sales/clients/${cid}/round/${round}/approve-all`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ status, delivery_mode })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao aprovar todas as fotos');
    return data;
  }

  async function refreshSalesUi() {
    if (!salesWrap || !salesDisabledNote) return;
    const enabled = isSalesModeEnabled();
    salesDisabledNote.classList.toggle('hidden', enabled);
    salesWrap.classList.toggle('hidden', !enabled);
    if (!enabled) return;
    await loadSalesConfig();
    await loadSalesClients();
    await loadSalesDetail();
    try { renderAll(); } catch (_) { }
  }

  /** Alterar status da galeria (e de todos os clientes) — usa endpoint dedicado para Reativar/Finalizar funcionarem corretamente */
  async function setStatusViaApi(nextStatus) {
    const list = (Array.isArray(gallery?.clients) ? gallery.clients : []).filter((c) => c && c.enabled !== false);
    const body = { status: nextStatus };
    if (list.length > 1) {
      const cid = resolveClientIdForRoundApi();
      if (!cid) throw new Error('Selecione um cliente na lista de atividades.');
      body.clientId = cid;
    }
    const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/status`, {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao alterar status');
    return data;
  }

  async function loadExport() {
    const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/export`, { headers: HEADERS });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao carregar exportação');
    exportPayload = {
      lightroom: data.lightroom || '',
      finder: data.finder || '',
      windows: data.windows || ''
    };
    const senha = data.gallery?.senha || null;
    if (senha) {
      gallery._client_password = senha;
      if (sharePass) sharePass.textContent = senha;
    }
  }

  function normalizeExportName(n) {
    let s = String(n || '').trim();
    s = s.replace(/^.*[\\/]/, '');
    const dot = s.lastIndexOf('.');
    if (dot > 0) s = s.slice(0, dot);
    return s.trim();
  }

  function photoOrderVal(p) {
    const v = p?.order != null ? p.order : p?.['order'];
    return parseInt(v, 10) || 0;
  }

  function primaryCodeFromBase(base) {
    const s = String(base);
    const matches = [...s.matchAll(/([A-Za-z]{2,})0*(\d+)/gi)];
    if (!matches.length) return null;
    const m = matches[matches.length - 1];
    return { letters: m[1].toUpperCase(), num: parseInt(m[2], 10) };
  }

  /**
   * Token só com dígitos (ex.: 1642): deve bater com ADR1642, ADR01642, _ADR001642, etc.
   * — valor numérico igual à série de dígitos do ficheiro, ou (para tokens “longos”) a série contém o que digitou.
   * Tokens curtos (1–2 dígitos, n < 100) não usam .includes() dentro de um número grande (evita “4” em “1642”).
   */
  function digitTokenMatchesBase(base, digitToken) {
    const tok = String(digitToken);
    if (!/^\d+$/.test(tok)) return false;
    const n = parseInt(tok, 10);
    if (Number.isNaN(n)) return false;
    const runs = String(base).match(/\d+/g) || [];
    const allowSubstring = tok.length >= 3 || n >= 100;
    for (const run of runs) {
      if (parseInt(run, 10) === n) return true;
      if (allowSubstring && run.includes(tok)) return true;
      if (!allowSubstring && run === tok) return true;
    }
    return false;
  }

  function tokenMatchesPhotoBase(base, token) {
    const raw = String(token).trim();
    if (!raw) return false;
    const t = raw.replace(/\s+/g, '');
    const b = String(base).replace(/\s+/g, '');
    if (b.toLowerCase() === raw.toLowerCase() || b.toLowerCase() === t.toLowerCase()) return true;
    const code = primaryCodeFromBase(b);
    if (/^\d+$/.test(t)) {
      const n = parseInt(t, 10);
      if (code && code.num === n) return true;
      if (digitTokenMatchesBase(b, t)) return true;
      if (!code) {
        const re = new RegExp(`(^|[^0-9])0*${n}([^0-9]|$)`);
        return re.test(b);
      }
      return false;
    }
    const tm = t.match(/^([A-Za-z]{2,})0*(\d+)$/i);
    if (tm && code) {
      return tm[1].toUpperCase() === code.letters && parseInt(tm[2], 10) === code.num;
    }
    if (code) {
      const alnum = t.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (alnum === `${code.letters}${code.num}`) return true;
    }
    return b.toLowerCase().includes(t.toLowerCase()) || b.toLowerCase().includes(raw.toLowerCase());
  }

  function parseExportFilterTokens(raw) {
    return String(raw || '')
      .split(/[,;\n\r]+/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  /**
   * Foto bate com o token: (1) ID numérico do sistema (king_photos.id), ou (2) nome/código no ficheiro.
   * Muitos fotógrafos copiam o ID da galeria (ex.: 1642) em vez do ADR0003 do nome.
   */
  function photoMatchesExportToken(p, token) {
    const raw = String(token).trim();
    if (!raw) return false;
    const t = raw.replace(/\s+/g, '');
    if (/^\d+$/.test(t)) {
      const n = parseInt(t, 10);
      if (Number.isFinite(n) && Number(p.id) === n) return true;
    }
    const base = normalizeExportName(p.original_name);
    return tokenMatchesPhotoBase(base, token);
  }

  function pickPhotosByFilterTokens(orderedPhotos, tokens) {
    const used = new Set();
    const out = [];
    for (const tok of tokens) {
      const hit = orderedPhotos.find(p => {
        if (used.has(p.id)) return false;
        return photoMatchesExportToken(p, tok);
      });
      if (hit) {
        used.add(hit.id);
        out.push(hit);
      }
    }
    return out;
  }

  function resolveClientIdForRoundApi() {
    const list = (Array.isArray(gallery?.clients) ? gallery.clients : []).filter(c => c && c.enabled !== false);
    if (list.length <= 1) {
      return list.length === 1 ? parseInt(list[0].id, 10) || null : null;
    }
    const fid = parseInt(_activityFocusClientId, 10);
    if (fid && list.some(c => parseInt(c.id, 10) === fid)) return fid;
    const em = String(gallery?.cliente_email || '').toLowerCase().trim();
    if (em) {
      const hit = list.find(c => String(c.email || '').toLowerCase().trim() === em);
      if (hit) return parseInt(hit.id, 10) || null;
    }
    return parseInt(list[0].id, 10) || null;
  }

  function rebuildExportBatchOptions() {
    if (!expBatchSel) return;
    const prev = expBatchSel.value;
    const m = gallery?.selectionRoundsSummary || {};
    const keys = Object.keys(m)
      .map(k => parseInt(k, 10))
      .filter(n => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);
    expBatchSel.innerHTML = '<option value="all">Todas as seleções</option>';
    for (const k of keys) {
      const opt = document.createElement('option');
      opt.value = String(k);
      const n = m[String(k)] ?? m[k] ?? 0;
      opt.textContent = `Seleção ${k} (${n} foto${n === 1 ? '' : 's'})`;
      expBatchSel.appendChild(opt);
    }
    const ok = Array.from(expBatchSel.options).some(o => o.value === prev);
    expBatchSel.value = ok ? prev : 'all';
  }

  function getSelectedPhotosOrderedForExport() {
    const ids = new Set((gallery?.selectedPhotoIds || []).map(id => parseInt(id, 10)).filter(Boolean));
    const photosAll = Array.isArray(gallery?.photos) ? gallery.photos : [];
    let selected = photosAll.filter(p => ids.has(p.id));
    const batchVal = expBatchSel && expBatchSel.value && expBatchSel.value !== 'all' ? parseInt(expBatchSel.value, 10) : null;
    if (Number.isFinite(batchVal) && batchVal > 0) {
      const bm = gallery?.selectionBatchByPhotoId || {};
      selected = selected.filter(p => {
        const b = parseInt(bm[p.id] ?? bm[String(p.id)], 10) || 1;
        return b === batchVal;
      });
    }
    selected.sort((a, b) => {
      const oa = photoOrderVal(a);
      const ob = photoOrderVal(b);
      if (oa !== ob) return oa - ob;
      return (a.id || 0) - (b.id || 0);
    });
    return selected;
  }

  function buildExportPayloadFromNames(names) {
    const lightroom = names.join(', ');
    const windows = names.map(n => `"${String(n).replace(/"/g, '')}"`).join(' OR ');
    const finder = names.join(' OR ');
    return { lightroom, finder, windows };
  }

  let exportModalKind = 'lightroom';
  let exportFilterDebounce = null;

  function getExportNamesForModal() {
    const ordered = getSelectedPhotosOrderedForExport();
    const allChecked = !!(expScopeAll && expScopeAll.checked);
    if (allChecked) {
      return ordered.map(p => normalizeExportName(p.original_name)).filter(Boolean);
    }
    const tokens = parseExportFilterTokens(expFilterInput?.value);
    if (!tokens.length) return [];
    return pickPhotosByFilterTokens(ordered, tokens).map(p => normalizeExportName(p.original_name)).filter(Boolean);
  }

  function updateExportFilterFieldState() {
    const on = !!(expScopeFilter && expScopeFilter.checked);
    if (expFilterBlock) expFilterBlock.classList.toggle('hidden', !on);
    if (expFilterInput) {
      expFilterInput.disabled = !on;
      expFilterInput.style.opacity = '';
    }
  }

  function updateExportModalHint(names) {
    const ordered = getSelectedPhotosOrderedForExport();
    const total = ordered.length;
    const allChecked = !!(expScopeAll && expScopeAll.checked);
    if (allChecked) {
      if (expAllHint) {
        expAllHint.textContent = total
          ? `${total} foto(s) na lista (todas as selecionadas).`
          : 'Nenhuma foto selecionada pelo cliente.';
      }
      if (expFilterHint) expFilterHint.textContent = '';
      return;
    }
    if (expAllHint) expAllHint.textContent = '';
    if (!expFilterHint) return;
    const tokens = parseExportFilterTokens(expFilterInput?.value);
    if (!tokens.length) {
      expFilterHint.textContent = 'Use o ID da foto no sistema (número interno), ou o código no nome (ex.: 3, ADR0003). Separe por vírgula. Clique na lupa para atualizar.';
      return;
    }
    if (!names.length) {
      expFilterHint.textContent = `Nenhuma correspondência nas ${total} selecionada(s). Tente o ID da foto (painel Fotos), ou o trecho ADR… do nome do ficheiro.`;
      return;
    }
    const missing = tokens.length > names.length ? tokens.length - names.length : 0;
    expFilterHint.textContent = missing
      ? `${names.length} foto(s) encontrada(s); ${missing} item(ns) da sua lista não corresponderam a nenhuma selecionada.`
      : `${names.length} foto(s) na lista (filtro aplicado).`;
  }

  function applyExportModalOutput() {
    if (!expTa) return;
    const names = getExportNamesForModal();
    const payload = buildExportPayloadFromNames(names);
    if (exportModalKind === 'finder') expTa.value = payload.finder;
    else if (exportModalKind === 'windows') expTa.value = payload.windows;
    else expTa.value = payload.lightroom;
    updateExportModalHint(names);
    updateExportFilterFieldState();
    if (expCopy) {
      const empty = names.length === 0;
      expCopy.disabled = empty;
      expCopy.style.opacity = empty ? '0.45' : '';
      expCopy.style.pointerEvents = empty ? 'none' : '';
    }
  }

  function scheduleExportModalRefresh() {
    if (exportFilterDebounce) clearTimeout(exportFilterDebounce);
    exportFilterDebounce = setTimeout(() => {
      exportFilterDebounce = null;
      applyExportModalOutput();
    }, 200);
  }

  function flushExportFilterAndApply() {
    if (exportFilterDebounce) {
      clearTimeout(exportFilterDebounce);
      exportFilterDebounce = null;
    }
    applyExportModalOutput();
  }

  function setExportModalKind(kind) {
    exportModalKind = kind === 'finder' || kind === 'windows' ? kind : 'lightroom';
    applyExportModalOutput();
  }

  function resetExportModalUi() {
    if (expScopeAll) expScopeAll.checked = true;
    if (expScopeFilter) expScopeFilter.checked = false;
    if (expFilterInput) expFilterInput.value = '';
    exportModalKind = 'lightroom';
    updateExportFilterFieldState();
    applyExportModalOutput();
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
    const controller = new AbortController();
    const t = setTimeout(() => { try { controller.abort(); } catch (_) { } }, Math.max(1000, timeoutMs));
    try {
      const res = await fetch(url, { ...(options || {}), signal: controller.signal });
      return res;
    } finally {
      clearTimeout(t);
    }
  }

  // Cloudflare pode rate-limitar o direct_upload (429).
  // Estratégia:
  // - manter serialização do /api/upload/auth
  // - usar um gap dinâmico (agressivo por padrão)
  // - se vier 429, aumentar gap e reduzir concorrência automaticamente
  let _authQueue = Promise.resolve();
  let _lastAuthAt = 0;
  async function authUpload({ retries = 6 } = {}) {
    const run = async () => {
      const dynGap = (typeof uploadState !== 'undefined' && uploadState && Number.isFinite(uploadState.authMinGapMs))
        ? uploadState.authMinGapMs
        : 60;
      const minGapMs = Math.max(0, Math.min(1500, dynGap)); // espaço mínimo entre autorizações (dinâmico)
      const since = Date.now() - _lastAuthAt;
      if (since < minGapMs) await sleep(minGapMs - since);

      let attempt = 0;
      let wait = 650;
      // retry para 429/5xx
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const authRes = await fetchWithTimeout(`${API_URL}/api/upload/auth`, { method: 'POST', headers: HEADERS }, 25000);
        const text = await authRes.text().catch(() => '');
        let auth = {};
        try { auth = JSON.parse(text || '{}'); } catch (_) { auth = {}; }
        if (authRes.ok && auth.uploadURL && auth.imageId) {
          _lastAuthAt = Date.now();
          // Ajuste automático: se está estável (sem 429), fica mais agressivo aos poucos
          if (typeof uploadState !== 'undefined' && uploadState) {
            const curGap = Number.isFinite(uploadState.authMinGapMs) ? uploadState.authMinGapMs : 60;
            uploadState.authMinGapMs = Math.max(80, Math.round(curGap * 0.92)); // desce devagar, mas nunca zera
            const last429 = Number.isFinite(uploadState.last429At) ? uploadState.last429At : 0;
            if (Date.now() - last429 > 8000) {
              const cc = Number.isFinite(uploadState.concurrency) ? uploadState.concurrency : 4;
              const maxC = uploadState.maxConcurrency || 12;
              uploadState.concurrency = Math.min(maxC, cc + 1);
            }
          }
          return auth;
        }
        const msg = auth.message || text || 'Falha ao obter autorização de upload';
        const ra = parseInt(auth.retry_after_seconds || '0', 10) || 0;
        if ((authRes.status === 429 || authRes.status >= 500) && attempt < retries) {
          const extra = ra > 0 ? Math.min(ra * 1000, 65000) : wait;
          // Ajuste automático: 429 => aumenta gap e reduz concorrência para evitar “engarrafar”
          if (authRes.status === 429 && typeof uploadState !== 'undefined' && uploadState) {
            uploadState.last429At = Date.now();
            const cur = Number.isFinite(uploadState.authMinGapMs) ? uploadState.authMinGapMs : 60;
            uploadState.authMinGapMs = Math.min(uploadState.authMaxGapMs || 1500, Math.round(cur * 1.6 + 50));
            const cc = Number.isFinite(uploadState.concurrency) ? uploadState.concurrency : 4;
            const minC = uploadState.minConcurrency || 2;
            uploadState.concurrency = Math.max(minC, Math.floor(cc * 0.7));
          }
          // eslint-disable-next-line no-await-in-loop
          await sleep(extra + Math.round(Math.random() * 250)); // jitter
          wait = Math.min(wait * 2, 15000);
          attempt += 1;
          continue;
        }
        // Sucesso parcial não ocorreu; se não foi 429/5xx, não ajusta.
        throw new Error(msg);
      }
    };

    // Serializa as chamadas, mas deixa uploads (para a URL) em paralelo
    _authQueue = _authQueue.then(run, run);
    return _authQueue;
  }

  function formatEta(seconds) {
    const s = Math.max(0, Math.min(5999, Math.round(seconds || 0)));
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }
  function formatMbPerSec(bps) {
    const mbps = (bps || 0) / (1024 * 1024);
    if (!Number.isFinite(mbps) || mbps <= 0) return '0 MB/s';
    return `${mbps.toFixed(mbps >= 10 ? 0 : 1)} MB/s`;
  }
  function setUploadUi({ active, line, file, pct, meta }) {
    const p = (typeof pct === 'number') ? Math.max(0, Math.min(100, pct)) : 0;
    const C = 276;
    const off = C - (C * (p / 100));

    const useOverlay = active && uploadState && uploadState._useOverlay;
    if (uploadOv) {
      if (useOverlay) {
        uploadOv.classList.remove('hidden');
        uploadOv.setAttribute('aria-hidden', 'false');
        if (uploadTitle) uploadTitle.textContent = line || 'Enviando…';
        if (uploadFile) uploadFile.textContent = file ? file : '';
        if (uploadMeta) uploadMeta.textContent = meta || `${p.toFixed(0)}%`;
        if (uploadBar) uploadBar.style.strokeDashoffset = String(off);
      } else {
        uploadOv.classList.add('hidden');
        uploadOv.setAttribute('aria-hidden', 'true');
      }
    }

    if (bubble) {
      bubble.classList.toggle('hidden', !active || useOverlay);
      if (bubbleTitle) bubbleTitle.textContent = line || 'Enviando…';
      if (bubbleFile) bubbleFile.textContent = file ? file : '';
      if (bubbleMeta) bubbleMeta.textContent = meta || `${p.toFixed(0)}%`;
      if (bubbleBar) bubbleBar.style.strokeDashoffset = String(off);
    }
  }

  function setBubbleDone() {
    if (uploadOv) {
      if (uploadTitle) uploadTitle.textContent = 'Concluído';
      if (uploadMeta) uploadMeta.textContent = '100%';
      if (uploadBar) uploadBar.style.strokeDashoffset = '0';
      setTimeout(() => { try { uploadOv.classList.add('hidden'); uploadOv.setAttribute('aria-hidden', 'true'); } catch (_) { } }, 900);
    }
    if (bubble && bubbleCard) {
      bubbleCard.classList.add('ks-bubble-ok');
      if (bubbleTitle) bubbleTitle.textContent = 'Concluído';
      if (bubbleMeta) bubbleMeta.textContent = '100%';
      if (bubbleBar) bubbleBar.style.strokeDashoffset = '0';
      setTimeout(() => {
        try { bubble.classList.add('hidden'); } catch (_) { }
        try { bubbleCard.classList.remove('ks-bubble-ok'); } catch (_) { }
      }, 900);
    }
  }

  // Evita “travada” por re-render a cada foto em lote grande
  let _renderPhotosTimer = null;
  function scheduleRenderPhotos() {
    if (_renderPhotosTimer) return;
    _renderPhotosTimer = setTimeout(() => {
      _renderPhotosTimer = null;
      try { renderPhotos(); } catch (_) { }
    }, (uploadState && uploadState.running) ? 2500 : 150);
  }

  function fmtBytes(bytes) {
    const b = Number(bytes || 0);
    if (!Number.isFinite(b) || b <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let u = 0;
    let v = b;
    while (v >= 1024 && u < units.length - 1) { v /= 1024; u += 1; }
    return `${v.toFixed(v >= 10 || u === 0 ? 0 : 1)} ${units[u]}`;
  }

  function ensureUpListVisible(visible) {
    if (!upListBox) return;
    upListBox.style.display = visible ? 'block' : 'none';
  }

  function createUploadRow({ id, file }) {
    if (!upListItems) return null;
    const el = document.createElement('div');
    el.className = 'ks-upitem';
    el.setAttribute('data-upid', id);
    el.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="font-extrabold text-slate-900 truncate">${escapeHtml(file.name || 'foto')}</div>
          <div class="text-xs ks-muted">${fmtBytes(file.size || 0)}</div>
        </div>
        <button class="ks-btn" type="button" data-up-cancel="${id}">Cancelar</button>
      </div>
      <div class="mt-2 ks-upmini"><div data-up-fill></div></div>
      <div class="mt-2 text-xs ks-muted" data-up-status>Na fila...</div>
    `;
    upListItems.appendChild(el);
    ensureUpListVisible(true);
    return el;
  }

  function setRowProgress(rowEl, pct, statusText) {
    if (!rowEl) return;
    const fill = rowEl.querySelector('[data-up-fill]');
    const st = rowEl.querySelector('[data-up-status]');
    if (fill && typeof pct === 'number') fill.style.width = `${Math.max(0, Math.min(100, pct)).toFixed(1)}%`;
    if (st && statusText) st.textContent = statusText;
  }

  function markRowDone(rowEl) {
    if (!rowEl) return;
    const st = rowEl.querySelector('[data-up-status]');
    if (st) { st.textContent = 'Concluído'; st.classList.add('ks-upok'); }
    const btn = rowEl.querySelector('button[data-up-cancel]');
    if (btn) btn.remove();
  }

  function markRowError(rowEl, msg) {
    if (!rowEl) return;
    const st = rowEl.querySelector('[data-up-status]');
    const nameEl = rowEl.querySelector('.font-extrabold');
    if (st) { st.textContent = (msg || 'Erro').slice(0, 120); st.classList.add('ks-uperr'); }
    if (nameEl) nameEl.classList.add('text-red-400');
  }

  function uploadToCloudflare(uploadURL, file, { onProgress, signal } = {}) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadURL, true);
      xhr.responseType = 'text';
      // Timeout total alto + detecção de "travou sem progresso"
      xhr.timeout = 180000; // 3 min
      let lastProgressAt = Date.now();
      let abortedByStall = false;
      const stallCheckMs = 45000;
      const stallTimer = setInterval(() => {
        if (abortedByStall) return;
        if (Date.now() - lastProgressAt >= stallCheckMs) {
          abortedByStall = true;
          try { xhr.abort(); } catch (_) { }
        }
      }, 2500);
      xhr.upload.onprogress = (evt) => {
        try {
          const total = evt.lengthComputable ? evt.total : (file.size || 0);
          const loaded = evt.loaded || 0;
          lastProgressAt = Date.now();
          if (onProgress) onProgress({ loaded, total });
        } catch (_) { }
      };
      xhr.onload = () => {
        try { clearInterval(stallTimer); } catch (_) { }
        if (xhr.status >= 200 && xhr.status < 300) return resolve();
        const raw = xhr.responseText || `Falha no upload para Cloudflare (${xhr.status})`;
        try {
          const j = JSON.parse(raw);
          const m = j && (j.message || j.error);
          const err = new Error(m || raw);
          err.status = xhr.status;
          return reject(err);
        } catch (_) {
          const err = new Error(raw);
          err.status = xhr.status;
          return reject(err);
        }
      };
      xhr.onerror = () => {
        try { clearInterval(stallTimer); } catch (_) { }
        const err = new Error('Falha no upload para Cloudflare');
        err.status = xhr.status || 0;
        reject(err);
      };
      xhr.ontimeout = () => {
        try { clearInterval(stallTimer); } catch (_) { }
        const err = new Error('Tempo esgotado ao enviar para o Cloudflare. Tentando novamente...');
        err.status = xhr.status || 0;
        reject(err);
      };
      xhr.onabort = () => {
        try { clearInterval(stallTimer); } catch (_) { }
        const err = new Error(abortedByStall ? 'Conexão travou (sem progresso). Tentando novamente...' : 'Upload cancelado');
        err.status = xhr.status || 0;
        reject(err);
      };

      if (signal) {
        signal.addEventListener('abort', () => {
          try { xhr.abort(); } catch (_) { }
        }, { once: true });
      }

      const form = new FormData();
      form.append('file', file, file.name || 'file');
      xhr.send(form);
    });
  }

  async function uploadToCloudflareWithRetry(uploadURL, file, { onProgress, signal, retries = 5 } = {}) {
    let attempt = 0;
    let wait = 350;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await uploadToCloudflare(uploadURL, file, { onProgress, signal });
        return;
      } catch (e) {
        const st = parseInt(e?.status || '0', 10) || 0;
        const msg = (e && e.message) ? String(e.message) : 'Erro no upload';
        const rateLimited = (st === 429) || /429/.test(msg) || /rate/i.test(msg);
        const timeout = /Tempo esgotado/i.test(msg);
        const retryable = rateLimited || timeout || (st >= 500) || (st === 0);
        if (retryable && attempt < retries) {
          // Ajuste automático quando o problema é o Cloudflare (não só o /auth)
          try {
            uploadState.last429At = Date.now();
            uploadState.authMinGapMs = Math.min(uploadState.authMaxGapMs || 1500, Math.round((uploadState.authMinGapMs || 80) * 1.4 + 80));
            uploadState.concurrency = Math.max(uploadState.minConcurrency || 2, Math.floor((uploadState.concurrency || 6) * 0.75));
          } catch (_) { }
          // feedback para o usuário (não parecer travado)
          try {
            updateOverallUi(`Reconectando… (tentativa ${attempt + 1}/${retries})`, file?.name || 'foto');
          } catch (_) { }
          // eslint-disable-next-line no-await-in-loop
          await sleep(wait + Math.round(Math.random() * 250));
          wait = Math.min(wait * 2, 6000);
          attempt += 1;
          continue;
        }
        throw e;
      }
    }
  }

  // ============================================================
  // R2 (presigned PUT) uploader
  // ============================================================
  function uploadToR2Put(uploadURL, file, { onProgress, signal, contentType, cacheControl } = {}) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const startedAt = Date.now();
      let hadProgress = false;
      xhr.open('PUT', uploadURL, true);
      xhr.responseType = 'text';
      xhr.timeout = 180000; // 3 min

      // headers (devem bater com o presign)
      try {
        if (contentType) xhr.setRequestHeader('Content-Type', contentType);
        if (cacheControl) xhr.setRequestHeader('Cache-Control', cacheControl);
      } catch (_) { }

      let lastProgressAt = Date.now();
      let abortedByStall = false;
      const stallCheckMs = 45000;
      const stallTimer = setInterval(() => {
        if (abortedByStall) return;
        if (Date.now() - lastProgressAt >= stallCheckMs) {
          abortedByStall = true;
          try { xhr.abort(); } catch (_) { }
        }
      }, 2500);

      xhr.upload.onprogress = (evt) => {
        try {
          const total = evt.lengthComputable ? evt.total : (file.size || 0);
          const loaded = evt.loaded || 0;
          hadProgress = hadProgress || loaded > 0;
          lastProgressAt = Date.now();
          if (onProgress) onProgress({ loaded, total });
        } catch (_) { }
      };

      xhr.onload = () => {
        try { clearInterval(stallTimer); } catch (_) { }
        if (xhr.status >= 200 && xhr.status < 300) return resolve();
        const raw = xhr.responseText || `Falha no upload para R2 (${xhr.status})`;
        const err = new Error(raw);
        err.status = xhr.status;
        reject(err);
      };
      xhr.onerror = () => {
        try { clearInterval(stallTimer); } catch (_) { }
        const err = new Error('Falha no upload para R2');
        err.status = xhr.status || 0;
        err.elapsedMs = Date.now() - startedAt;
        err.hadProgress = hadProgress;
        if (!hadProgress && err.elapsedMs < 1200) err.code = 'R2_TLS_BLOCKED';
        reject(err);
      };
      xhr.ontimeout = () => {
        try { clearInterval(stallTimer); } catch (_) { }
        const err = new Error('Tempo esgotado ao enviar para o R2. Tentando novamente...');
        err.status = xhr.status || 0;
        err.elapsedMs = Date.now() - startedAt;
        err.hadProgress = hadProgress;
        reject(err);
      };
      xhr.onabort = () => {
        try { clearInterval(stallTimer); } catch (_) { }
        const err = new Error(abortedByStall ? 'Conexão travou (sem progresso). Tentando novamente...' : 'Upload cancelado');
        err.status = xhr.status || 0;
        err.elapsedMs = Date.now() - startedAt;
        err.hadProgress = hadProgress;
        reject(err);
      };

      if (signal) {
        signal.addEventListener('abort', () => {
          try { xhr.abort(); } catch (_) { }
        }, { once: true });
      }

      xhr.send(file);
    });
  }

  async function uploadToR2WithRetry(uploadURL, file, { onProgress, signal, retries = 6, contentType, cacheControl } = {}) {
    let attempt = 0;
    let wait = 350;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await uploadToR2Put(uploadURL, file, { onProgress, signal, contentType, cacheControl });
        return;
      } catch (e) {
        if (e?.code === 'R2_TLS_BLOCKED') throw e;
        const st = parseInt(e?.status || '0', 10) || 0;
        const msg = (e && e.message) ? String(e.message) : 'Erro no upload';
        const rateLimited = (st === 429) || /429/.test(msg) || /rate/i.test(msg);
        const timeout = /Tempo esgotado/i.test(msg) || /travou/i.test(msg);
        const retryable = rateLimited || timeout || (st >= 500) || (st === 0);
        if (retryable && attempt < retries) {
          try { updateOverallUi(`Reconectando… (tentativa ${attempt + 1}/${retries})`, file?.name || 'foto'); } catch (_) { }
          // eslint-disable-next-line no-await-in-loop
          await sleep(wait + Math.round(Math.random() * 250));
          wait = Math.min(wait * 2, 6000);
          attempt += 1;
          continue;
        }
        throw e;
      }
    }
  }

  function uploadToR2Proxy(file, { onProgress, signal, folderId } = {}) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/api/king-selection/galleries/${galleryId}/uploads/proxy`, true);
      xhr.responseType = 'text';
      xhr.timeout = 240000; // 4 min

      // auth header
      try {
        const token = HEADERS && (HEADERS.Authorization || HEADERS.authorization);
        if (token) xhr.setRequestHeader('Authorization', token);
      } catch (_) { }

      const form = new FormData();
      form.append('file', file, file.name || 'foto.jpg');
      form.append('original_name', file.name || 'foto');
      form.append('order', '0');
      if (folderId) form.append('folder_id', String(folderId));

      let lastProgressAt = Date.now();
      let abortedByStall = false;
      const stallCheckMs = 45000;
      const stallTimer = setInterval(() => {
        if (abortedByStall) return;
        if (Date.now() - lastProgressAt >= stallCheckMs) {
          abortedByStall = true;
          try { xhr.abort(); } catch (_) { }
        }
      }, 2500);

      xhr.upload.onprogress = (evt) => {
        try {
          const total = evt.lengthComputable ? evt.total : (file.size || 0);
          const loaded = evt.loaded || 0;
          lastProgressAt = Date.now();
          if (onProgress) onProgress({ loaded, total });
        } catch (_) { }
      };

      xhr.onload = () => {
        try { clearInterval(stallTimer); } catch (_) { }
        const text = xhr.responseText || '';
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const j = JSON.parse(text || '{}');
            return resolve(j);
          } catch (e) {
            return reject(new Error('Resposta inválida do servidor (proxy)'));
          }
        }
        let msg = text || `Falha no upload (proxy) (${xhr.status})`;
        try { msg = (JSON.parse(text || '{}')?.message) || msg; } catch (_) { }
        const err = new Error(msg);
        err.status = xhr.status || 0;
        reject(err);
      };
      xhr.onerror = () => {
        try { clearInterval(stallTimer); } catch (_) { }
        const err = new Error('Falha no upload (proxy)');
        err.status = xhr.status || 0;
        reject(err);
      };
      xhr.ontimeout = () => {
        try { clearInterval(stallTimer); } catch (_) { }
        const err = new Error('Tempo esgotado no upload (proxy). Tentando novamente...');
        err.status = xhr.status || 0;
        reject(err);
      };
      xhr.onabort = () => {
        try { clearInterval(stallTimer); } catch (_) { }
        const err = new Error(abortedByStall ? 'Conexão travou (proxy, sem progresso). Tentando novamente...' : 'Upload cancelado');
        err.status = xhr.status || 0;
        reject(err);
      };

      if (signal) {
        signal.addEventListener('abort', () => {
          try { xhr.abort(); } catch (_) { }
        }, { once: true });
      }

      xhr.send(form);
    });
  }

  async function uploadToR2ProxyForReplace(photoId, file) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/api/king-selection/photos/${photoId}/replace-proxy`, true);
      xhr.responseType = 'text';
      xhr.timeout = 120000;
      try {
        const t = HEADERS && (HEADERS.Authorization || HEADERS.authorization);
        if (t) xhr.setRequestHeader('Authorization', t);
      } catch (_) { }
      const form = new FormData();
      form.append('file', file, file.name || 'foto.jpg');
      form.append('original_name', file.name || 'foto');
      xhr.onload = () => {
        const text = xhr.responseText || '';
        if (xhr.status >= 200 && xhr.status < 300) return resolve(true);
        try { reject(new Error(JSON.parse(text)?.message || text)); } catch (_) { reject(new Error(text || `Erro ${xhr.status}`)); }
      };
      xhr.onerror = () => reject(new Error('Falha no upload (proxy)'));
      xhr.ontimeout = () => reject(new Error('Tempo esgotado'));
      xhr.send(form);
    });
  }

  async function uploadToR2ProxyWithRetry(file, { onProgress, signal, retries = 4, folderId } = {}) {
    let attempt = 0;
    let wait = 450;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const out = await uploadToR2Proxy(file, { onProgress, signal, folderId });
        return out;
      } catch (e) {
        const st = parseInt(e?.status || '0', 10) || 0;
        const msg = (e && e.message) ? String(e.message) : 'Erro no upload';
        const retryable = (st === 429) || (st >= 500) || (st === 0) || /Tempo esgotado|travou/i.test(msg);
        if (retryable && attempt < retries) {
          try { updateOverallUi(`Reconectando… (tentativa ${attempt + 1}/${retries})`, file?.name || 'foto'); } catch (_) { }
          // eslint-disable-next-line no-await-in-loop
          await sleep(wait + Math.round(Math.random() * 250));
          wait = Math.min(wait * 2, 7000);
          attempt += 1;
          continue;
        }
        throw e;
      }
    }
  }

  // ============================================================
  // Worker uploader (r2.conectaking.com.br)
  // ============================================================
  let _ksWorkerToken = null;
  let _ksWorkerTokenExp = 0;

  async function getKsWorkerToken() {
    const now = Math.floor(Date.now() / 1000);
    if (_ksWorkerToken && _ksWorkerTokenExp && (now + 20) < _ksWorkerTokenExp) return _ksWorkerToken;
    const res = await fetchWithTimeout(`${API_URL}/api/king-selection/galleries/${galleryId}/uploads/worker-token`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({})
    }, 20000);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Falha ao obter token do Worker');
    const token = String(data.token || '').trim();
    if (!token) throw new Error('Token do Worker inválido');
    const exp = now + (parseInt(data.expiresInSeconds || 0, 10) || 600);
    _ksWorkerToken = token;
    _ksWorkerTokenExp = exp;
    return token;
  }

  function uploadToWorker(file, { onProgress, signal, token } = {}) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${KS_WORKER_URL}/ks/upload`, true);
      xhr.responseType = 'text';
      xhr.timeout = 240000;
      try {
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      } catch (_) { }

      const form = new FormData();
      form.append('file', file, file.name || 'foto.jpg');

      let lastProgressAt = Date.now();
      let abortedByStall = false;
      const stallCheckMs = 45000;
      const stallTimer = setInterval(() => {
        if (abortedByStall) return;
        if (Date.now() - lastProgressAt >= stallCheckMs) {
          abortedByStall = true;
          try { xhr.abort(); } catch (_) { }
        }
      }, 2500);

      xhr.upload.onprogress = (evt) => {
        try {
          const total = evt.lengthComputable ? evt.total : (file.size || 0);
          const loaded = evt.loaded || 0;
          lastProgressAt = Date.now();
          if (onProgress) onProgress({ loaded, total });
        } catch (_) { }
      };

      xhr.onload = () => {
        try { clearInterval(stallTimer); } catch (_) { }
        const text = xhr.responseText || '';
        if (xhr.status >= 200 && xhr.status < 300) {
          try { return resolve(JSON.parse(text || '{}')); } catch (_) { return reject(new Error('Resposta inválida do Worker')); }
        }
        let msg = text || `Falha no upload (Worker) (${xhr.status})`;
        try { const j = JSON.parse(text || '{}'); msg = j?.message || msg; } catch (_) { }
        if (xhr.status === 401) msg = 'Não autorizado: KINGSELECTION_WORKER_SECRET (Render) deve ser igual a KS_WORKER_SECRET (Cloudflare).';
        const err = new Error(msg);
        err.status = xhr.status || 0;
        reject(err);
      };
      xhr.onerror = () => {
        try { clearInterval(stallTimer); } catch (_) { }
        const st = xhr.status || 0;
        const msg = (st === 0)
          ? 'Falha no upload (Worker): verifique CORS ou se r2.conectaking.com.br está acessível.'
          : `Falha no upload (Worker) (${st})`;
        const err = new Error(msg);
        err.status = st;
        reject(err);
      };
      xhr.ontimeout = () => {
        try { clearInterval(stallTimer); } catch (_) { }
        const err = new Error('Tempo esgotado no upload (Worker). Tentando novamente...');
        err.status = xhr.status || 0;
        reject(err);
      };
      xhr.onabort = () => {
        try { clearInterval(stallTimer); } catch (_) { }
        const err = new Error(abortedByStall ? 'Conexão travou (Worker, sem progresso). Tentando novamente...' : 'Upload cancelado');
        err.status = xhr.status || 0;
        reject(err);
      };

      if (signal) {
        signal.addEventListener('abort', () => {
          try { xhr.abort(); } catch (_) { }
        }, { once: true });
      }

      xhr.send(form);
    });
  }

  async function uploadToWorkerWithRetry(file, { onProgress, signal, retries = 4 } = {}) {
    let attempt = 0;
    let wait = 450;
    const token = await getKsWorkerToken();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const out = await uploadToWorker(file, { onProgress, signal, token });
        return out;
      } catch (e) {
        const st = parseInt(e?.status || '0', 10) || 0;
        const msg = (e && e.message) ? String(e.message) : 'Erro no upload';
        const retryable = (st === 429) || (st >= 500) || (st === 0) || /Tempo esgotado|travou/i.test(msg);
        if (retryable && attempt < retries) {
          try { updateOverallUi(`Reconectando… (tentativa ${attempt + 1}/${retries})`, file?.name || 'foto'); } catch (_) { }
          // eslint-disable-next-line no-await-in-loop
          await sleep(wait + Math.round(Math.random() * 250));
          wait = Math.min(wait * 2, 7000);
          attempt += 1;
          continue;
        }
        throw e;
      }
    }
  }

  async function commitWorkerUpload({ key, receipt, originalName, folderId }) {
    const res = await fetchWithTimeout(`${API_URL}/api/king-selection/galleries/${galleryId}/photos/worker-commit`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ items: [{ key, receipt, name: originalName || 'foto', order: 0, folder_id: folderId || null }] })
    }, 30000);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Falha ao registrar foto (Worker)');
    const photos = Array.isArray(data.photos) ? data.photos : [];
    return photos[0] || null;
  }

  let _r2Mode = null; // null desconhecido | true usa R2 direto | 'proxy' usa via servidor | 'worker' usa Worker | false fallback CF
  async function presignBatchForR2(filesWithIds) {
    const res = await fetchWithTimeout(`${API_URL}/api/king-selection/galleries/${galleryId}/uploads/presign-batch`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        // Bucket já é "kingselection" no backend. Não duplicar no key.
        prefix: `galleries/${galleryId}`,
        files: filesWithIds.map(f => ({ id: f.id, name: f.file?.name || 'foto', type: f.file?.type || 'application/octet-stream' }))
      })
    }, 35000);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Falha ao presign (R2)');
    const items = Array.isArray(data.items) ? data.items : [];
    const map = new Map();
    items.forEach(it => {
      if (!it || !it.id) return;
      map.set(String(it.id), it);
    });
    return map;
  }

  async function savePhotosToDbBatch(images) {
    const res = await fetchWithTimeout(`${API_URL}/api/king-selection/galleries/${galleryId}/photos/batch`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ images })
    }, 45000);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Falha ao salvar fotos (batch)');
    return Array.isArray(data.photos) ? data.photos : [];
  }

  async function uploadToCloudflareFetch(uploadURL, file, { retries = 6 } = {}) {
    if (!uploadURL) throw new Error('uploadURL inválida');
    if (!file) throw new Error('Arquivo inválido');
    const maxBytes = 10 * 1024 * 1024; // 10MB
    if ((file.size || 0) > maxBytes) {
      throw new Error('A marca d’água é muito grande. Envie um PNG menor (até 10MB).');
    }
    if (file.type && !String(file.type).toLowerCase().startsWith('image/')) {
      throw new Error('Arquivo inválido. Envie uma imagem (PNG/JPG).');
    }

    let attempt = 0;
    let wait = 650;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const form = new FormData();
      const safeName = (file.type || '').toLowerCase().includes('png') ? 'watermark.png' : (file.name || 'watermark.jpg');
      form.append('file', file, safeName);

      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(uploadURL, { method: 'POST', body: form });
      const text = await res.text().catch(() => '');
      if (res.ok) return;

      let msg = text || `Falha no upload para Cloudflare (${res.status})`;
      try {
        const j = JSON.parse(text || '{}');
        msg = (j && (j.message || j.error)) || msg;
      } catch (_) { }

      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(wait);
        wait = Math.min(wait * 2, 5000);
        attempt += 1;
        continue;
      }
      throw new Error(msg);
    }
  }

  async function savePhotoToDb({ imageId, originalName, folderId }) {
    const res = await fetchWithTimeout(`${API_URL}/api/king-selection/galleries/${galleryId}/photos`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ imageId, original_name: originalName || 'foto', order: 0, folder_id: folderId || null })
    }, 30000);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Falha ao salvar foto');
    return data.photo || null;
  }

  async function setWatermarkLogo(file, which) {
    const w = which === 'landscape' ? 'landscape' : 'portrait';
    const form = new FormData();
    form.append('file', file, file.name || 'watermark.png');
    const res = await fetchWithTimeout(`${API_URL}/api/king-selection/galleries/${galleryId}/watermark?which=${encodeURIComponent(w)}`, {
      method: 'POST',
      headers: { 'Authorization': HEADERS?.Authorization || '' },
      body: form
    }, 30000);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Falha ao enviar marca d\'água');
    wmMode = 'logo';
    setRadio('wm_mode', 'logo');
    scheduleWatermarkPreview();
  }

  // side tabs
  sideLinks.forEach(a => a.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveTab(a.getAttribute('data-tab'));
    document.querySelectorAll('.ks-nav a').forEach(n => n.classList.remove('active'));
    document.getElementById('ks-nav-projects')?.classList.add('active');
  }));

  // Link "Página de finalização" — abre a tela de config da mensagem de obrigado (Node)
  const linkConfigFinalizacao = document.getElementById('ks-link-config-finalizacao');
  if (linkConfigFinalizacao && galleryId) {
    linkConfigFinalizacao.addEventListener('click', (e) => {
      e.preventDefault();
      const jwt = localStorage.getItem('conectaKingToken') || localStorage.getItem('conectaking_token') || localStorage.getItem('token') || '';
      const base = (window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || window.location.origin).replace(/\/$/, '');
      const url = `${base}/api/king-selection/config-finalizacao/${galleryId}?token=${encodeURIComponent(jwt)}`;
      window.open(url, '_blank');
    });
  }

  // Tabs da área de Atividades (Alboom)
  Array.from(document.querySelectorAll('[data-abo-tab]')).forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-abo-tab');
      Array.from(document.querySelectorAll('[data-abo-tab]')).forEach(x => x.classList.toggle('active', x === btn));
      Array.from(document.querySelectorAll('[data-abo-pane]')).forEach(p => p.classList.toggle('hidden', p.getAttribute('data-abo-pane') !== key));
    });
  });
  actSearch?.addEventListener('input', () => renderAll());
  actSortSel?.addEventListener('change', () => {
    activitySortMode = actSortSel.value || 'name_asc';
    try { sessionStorage.setItem(ACT_SORT_KEY, activitySortMode); } catch (_) {}
    renderAll();
  });
  actPayFilterSel?.addEventListener('change', () => {
    activityPayFilter = actPayFilterSel.value || 'all';
    try { sessionStorage.setItem(ACT_PAY_FILTER_KEY, activityPayFilter); } catch (_) {}
    renderAll();
  });

  function openActContactModal(c) {
    if (!actContactModal || !c) return;
    const nome = String(c.nome || '').trim() || '—';
    const email = String(c.email || '').trim() || '—';
    const phone = String(c.telefone || '').trim() || '—';
    if (actContactNome) actContactNome.textContent = nome;
    if (actContactEmail) actContactEmail.textContent = email;
    if (actContactPhone) actContactPhone.textContent = phone;
    actContactModal.classList.remove('hidden');
    actContactModal.classList.add('flex');
    actContactModal.setAttribute('aria-hidden', 'false');
  }
  function closeActContactModal() {
    if (!actContactModal) return;
    actContactModal.classList.add('hidden');
    actContactModal.classList.remove('flex');
    actContactModal.setAttribute('aria-hidden', 'true');
  }

  function onActivityClientPick(ev) {
    const row = ev.target.closest && ev.target.closest('.ks-act-client-pick');
    if (!row) return;
    const id = parseInt(row.getAttribute('data-act-client-id'), 10);
    if (!id) return;
    if (parseInt(_activityFocusClientId, 10) === id) return;
    _activityFocusClientId = id;
    // Feedback imediato no painel antes de buscar do servidor.
    try { renderAll(); } catch (_) { }
    loadGallery().catch((e) => showError(e.message || 'Erro ao carregar'));
  }

  function onActivityListClick(ev) {
    const dropBtn = ev.target.closest && ev.target.closest('.ks-act-drop-client');
    if (dropBtn) {
      ev.preventDefault();
      ev.stopPropagation();
      const id = parseInt(dropBtn.getAttribute('data-act-client-id'), 10);
      if (!id) return;
      const base = resolveCurrentActivityClientAndBatch();
      const batch = base.batch;
      if (!Number.isFinite(batch) || batch < 1) {
        toast('Selecione a rodada atual no filtro "Ver seleção".', { kind: 'warn', title: 'Excluir cadastro' });
        return;
      }
      if (!confirm(`Excluir a rodada atual (Seleção ${batch}) e excluir este cadastro?`)) return;
      deleteRoundAndClient(id)
        .then(async (out) => {
          toast(`Cadastro excluído e rodada ${out.batch} removida (${out.deletedRound} foto(s)).`, { kind: 'ok', title: 'Cliente' });
          if (parseInt(_activityFocusClientId, 10) === id) _activityFocusClientId = null;
          await loadGallery();
        })
        .catch((err) => showError(err?.message || 'Erro ao excluir cliente com rodada'));
      return;
    }
    const openBtn = ev.target.closest && ev.target.closest('.ks-act-contact-open');
    if (openBtn) {
      ev.preventDefault();
      ev.stopPropagation();
      const id = parseInt(openBtn.getAttribute('data-act-client-id'), 10);
      const list = Array.isArray(gallery?.clients) ? gallery.clients.filter((c) => c && c.enabled !== false) : [];
      const c = list.find((x) => parseInt(x.id, 10) === id);
      if (c) openActContactModal(c);
      return;
    }
    onActivityClientPick(ev);
  }
  [actListAnd, actListRev, actListFin].forEach((el) => el?.addEventListener('click', onActivityListClick));

  actContactClose?.addEventListener('click', closeActContactModal);
  actContactModal?.addEventListener('click', (e) => {
    if (e.target === actContactModal) closeActContactModal();
  });
  actContactModal?.addEventListener('click', async (e) => {
    const b = e.target.closest && e.target.closest('[data-ks-act-copy]');
    if (!b) return;
    const k = b.getAttribute('data-ks-act-copy');
    let t = '';
    if (k === 'nome') t = (actContactNome?.textContent || '').trim();
    if (k === 'email') t = (actContactEmail?.textContent || '').trim();
    if (k === 'phone') t = (actContactPhone?.textContent || '').trim();
    if (!t || t === '—') return;
    try {
      await navigator.clipboard.writeText(t);
      toast('Copiado.', { kind: 'ok', title: 'OK' });
    } catch (_) {
      showError('Não foi possível copiar. Tente outro navegador ou copie manualmente.');
    }
  });
  actContactCopyAll?.addEventListener('click', async () => {
    const n = (actContactNome?.textContent || '').trim();
    const em = (actContactEmail?.textContent || '').trim();
    const ph = (actContactPhone?.textContent || '').trim();
    const text = `Nome: ${n}\nE-mail: ${em}\nTelefone: ${ph}`;
    try {
      await navigator.clipboard.writeText(text);
      toast('Copiado.', { kind: 'ok', title: 'OK' });
    } catch (_) {
      showError('Não foi possível copiar. Tente selecionar o texto manualmente.');
    }
  });

  function resolveCurrentActivityClientAndBatch() {
    const cid =
      parseInt(_activityFocusClientId, 10) ||
      (() => {
        const list = Array.isArray(gallery?.clients) ? gallery.clients.filter((c) => c && c.enabled !== false) : [];
        return list.length === 1 ? parseInt(list[0].id, 10) : 0;
      })();
    const rounds = Object.keys(gallery?.selectionRoundsSummary || {})
      .map((k) => parseInt(k, 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    const uiBatch = parseInt(actBatchFilter?.value || '', 10);
    const batch = (Number.isFinite(uiBatch) && uiBatch > 0) ? uiBatch : (rounds.length ? Math.max(...rounds) : 0);
    return { cid, batch, hasRounds: rounds.length > 0 };
  }

  actDeleteBatch?.addEventListener('click', async () => {
    const cid =
      parseInt(_activityFocusClientId, 10) ||
      (() => {
        const list = Array.isArray(gallery?.clients) ? gallery.clients.filter((c) => c && c.enabled !== false) : [];
        return list.length === 1 ? parseInt(list[0].id, 10) : 0;
      })();
    const batch = parseInt(actBatchFilter?.value, 10);
    if (!cid || !batch || !Number.isFinite(batch) || batch < 1) return;
    if (!confirm(`Remover todas as fotos da “Seleção ${batch}” deste cliente? (Outras rodadas e o projeto permanecem.)`)) return;
    try {
      actDeleteBatch.disabled = true;
      const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/clients/${cid}/delete-selection-batch`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ batch })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao excluir rodada');
      toast(`Removida(s) ${data.deleted != null ? data.deleted : 0} foto(s).`, { kind: 'ok', title: 'Rodada removida' });
      await loadGallery();
    } catch (err) {
      showError(err?.message || 'Erro');
    } finally {
      actDeleteBatch.disabled = false;
    }
  });

  actReactivateBatch?.addEventListener('click', async () => {
    const { cid, batch, hasRounds } = resolveCurrentActivityClientAndBatch();
    if (!cid || !hasRounds || !Number.isFinite(batch) || batch < 1) {
      toast('Selecione uma rodada válida para reativar.', { kind: 'warn', title: 'Rodada' });
      return;
    }
    if (!confirm(`Reativar a Seleção ${batch} para este cliente escolher mais fotos na mesma rodada?`)) return;
    try {
      actReactivateBatch.disabled = true;
      const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/clients/${cid}/reactivate-selection-batch`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ batch })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao reativar rodada');
      toast(`Seleção ${batch} reativada para o cliente.`, { kind: 'ok', title: 'Rodada' });
      await loadGallery();
    } catch (err) {
      showError(err?.message || 'Erro ao reativar rodada');
    } finally {
      actReactivateBatch.disabled = false;
    }
  });

  actOpenNextRound?.addEventListener('click', async () => {
    const { cid, batch } = resolveCurrentActivityClientAndBatch();
    if (!cid) {
      toast('Selecione um cliente em revisão.', { kind: 'warn', title: 'Nova seleção' });
      return;
    }
    if (!confirm(`Abrir uma NOVA seleção para este cliente? (A Seleção ${batch || 1} permanece salva.)`)) return;
    try {
      actOpenNextRound.disabled = true;
      const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/open-selection-round`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ clientId: cid })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao abrir nova seleção');
      toast('Nova seleção aberta para o cliente.', { kind: 'ok', title: 'Rodada' });
      await loadGallery();
    } catch (err) {
      showError(err?.message || 'Erro ao abrir nova seleção');
    } finally {
      actOpenNextRound.disabled = false;
    }
  });

  actDeleteCurrentRoundBtn?.addEventListener('click', async () => {
    const { cid, batch, hasRounds } = resolveCurrentActivityClientAndBatch();
    if (!cid) {
      toast('Selecione um cliente em revisão.', { kind: 'warn', title: 'Rodada' });
      return;
    }
    if (!hasRounds) {
      toast('Não há rodada para excluir.', { kind: 'warn', title: 'Rodada' });
      return;
    }
    if (!Number.isFinite(batch) || batch < 1) {
      toast('Não foi possível identificar a rodada atual.', { kind: 'warn', title: 'Rodada' });
      return;
    }
    if (!confirm(`Excluir a rodada atual (Seleção ${batch}) deste cliente?`)) return;
    try {
      actDeleteCurrentRoundBtn.disabled = true;
      const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/clients/${cid}/delete-selection-batch`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ batch })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao excluir rodada atual');
      toast(`Rodada ${batch} excluída (${data.deleted || 0} foto(s)).`, { kind: 'ok', title: 'Rodada' });
      await loadGallery();
    } catch (err) {
      showError(err?.message || 'Erro ao excluir rodada atual');
    } finally {
      actDeleteCurrentRoundBtn.disabled = false;
    }
  });

  async function deleteRoundAndClient(clientIdOverride) {
    const base = resolveCurrentActivityClientAndBatch();
    const cid = parseInt(clientIdOverride, 10) || base.cid;
    const batch = base.batch;
    if (!cid) throw new Error('Selecione um cliente.');
    if (!Number.isFinite(batch) || batch < 1) throw new Error('Rodada atual inválida.');
    const resDelRound = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/clients/${cid}/delete-selection-batch`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ batch })
    });
    const dataRound = await resDelRound.json().catch(() => ({}));
    if (!resDelRound.ok) throw new Error(dataRound.message || 'Erro ao excluir rodada');

    const resDelClient = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/clients/${cid}`, {
      method: 'DELETE',
      headers: HEADERS
    });
    const dataClient = await resDelClient.json().catch(() => ({}));
    if (!resDelClient.ok) throw new Error(dataClient.message || 'Erro ao excluir cadastro do cliente');
    return { deletedRound: dataRound.deleted || 0, batch };
  }

  actDeleteRoundClientBtn?.addEventListener('click', async () => {
    const { cid, batch } = resolveCurrentActivityClientAndBatch();
    if (!cid || !batch) {
      toast('Selecione um cliente e uma rodada.', { kind: 'warn', title: 'Excluir cadastro' });
      return;
    }
    if (!confirm(`Excluir a rodada atual (Seleção ${batch}) e também o cadastro deste cliente?`)) return;
    try {
      actDeleteRoundClientBtn.disabled = true;
      const out = await deleteRoundAndClient(cid);
      toast(`Rodada ${out.batch} removida (${out.deletedRound} foto(s)) e cadastro excluído.`, { kind: 'ok', title: 'Cliente' });
      _activityFocusClientId = null;
      await loadGallery();
    } catch (err) {
      showError(err?.message || 'Erro ao excluir rodada + cadastro');
    } finally {
      actDeleteRoundClientBtn.disabled = false;
    }
  });

  // Dropdown de ações (estilo Alboom)
  function closeActMenu() { actMenu?.classList.remove('open'); }
  actMoreBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    actMenu?.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!actMenu || !actMoreBtn) return;
    if (actMenu.contains(e.target) || actMoreBtn.contains(e.target)) return;
    closeActMenu();
  });

  async function setStatus(nextStatus) {
    await setStatusViaApi(nextStatus);
    await loadGallery();
  }

  btnSaveFacial?.addEventListener('click', saveFacialConfig);
  btnProcessFacial?.addEventListener('click', processFacialAll);

  document.querySelectorAll('[data-ks-open-round]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      closeActMenu();
      const clientsList = Array.isArray(gallery?.clients) ? gallery.clients : [];
      const enabled = clientsList.filter((c) => c && c.enabled !== false);
      const cid = resolveClientIdForRoundApi();
      const row = cid ? enabled.find((c) => parseInt(c.id, 10) === cid) : null;
      const stG = String(gallery?.status || '').toLowerCase();
      const clientSt = row && row.status != null ? String(row.status).toLowerCase() : '';
      const eff = (clientSt && ['preparacao', 'andamento', 'revisao', 'finalizado'].includes(clientSt))
        ? clientSt
        : stG;
      if (eff !== 'revisao') {
        toast('Só é possível após o cliente enviar a seleção (em revisão).', { kind: 'warn', title: 'Nova seleção' });
        return;
      }
      if (!confirm('Abrir nova seleção? As fotos já escolhidas permanecem selecionadas; o cliente só poderá desmarcar o que escolher nesta nova seleção.')) return;
      const clientId = resolveClientIdForRoundApi();
      try {
        const body = {};
        if (clientId) body.clientId = clientId;
        const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/open-selection-round`, {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Erro ao abrir nova seleção');
        await loadGallery();
        toast(`Nova seleção aberta (nº ${data.selection_round != null ? data.selection_round : '—'}). O cliente pode acrescentar fotos.`, { kind: 'ok', title: 'Nova seleção' });
      } catch (err) {
        showError(err?.message || 'Erro');
      }
    });
  });

  async function clearReviewSelectionForFocusedClient() {
    const clientsList = Array.isArray(gallery?.clients) ? gallery.clients : [];
    const enabled = clientsList.filter((c) => c && c.enabled !== false);
    const cid = resolveClientIdForRoundApi();
    const row = cid ? enabled.find((c) => parseInt(c.id, 10) === cid) : null;
    const stG = String(gallery?.status || '').toLowerCase();
    const clientSt = row && row.status != null ? String(row.status).toLowerCase() : '';
    const eff = (clientSt && ['preparacao', 'andamento', 'revisao', 'finalizado'].includes(clientSt))
      ? clientSt
      : stG;
    if (eff !== 'revisao') {
      toast('Esta ação é para cliente em revisão.', { kind: 'warn', title: 'Excluir revisão' });
      return;
    }
    if (!cid) {
      toast('Selecione um cliente em revisão.', { kind: 'warn', title: 'Excluir revisão' });
      return;
    }
    const who = String(row?.nome || row?.email || `#${cid}`);
    if (!window.confirm(`Excluir as fotos em revisão de ${who}? (O projeto não será apagado.)`)) return;
    try {
      if (actClearReviewBtn) actClearReviewBtn.disabled = true;
      const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/clients/${cid}/clear-review`, {
        method: 'POST',
        headers: HEADERS
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao excluir revisão');
      toast(`Revisão excluída (${data.deleted || 0} foto(s)).`, { kind: 'ok', title: 'Excluir revisão' });
      await loadGallery();
    } catch (e) {
      showError(e?.message || 'Erro ao excluir revisão');
    } finally {
      if (actClearReviewBtn) actClearReviewBtn.disabled = false;
    }
  }

  document.querySelectorAll('[data-ks-clear-review]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      closeActMenu();
      await clearReviewSelectionForFocusedClient();
    });
  });

  actFinalize?.addEventListener('click', async (e) => {
    e.preventDefault();
    closeActMenu();
    const enabled = (Array.isArray(gallery?.clients) ? gallery.clients : []).filter((c) => c && c.enabled !== false);
    const cid = enabled.length > 1 ? resolveClientIdForRoundApi() : null;
    const row = cid ? enabled.find((c) => parseInt(c.id, 10) === cid) : null;
    const who = row ? String(row.nome || row.email || 'este cliente').trim() : '';
    const msg = enabled.length > 1 && who
      ? `Finalizar o acesso de ${who}? (Os outros visitantes desta galeria não são afetados.)`
      : 'Finalizar esta galeria? (o cliente não conseguirá selecionar novamente)';
    if (!confirm(msg)) return;
    try {
      await setStatus('finalizado');
      toast(enabled.length > 1 ? 'Cliente finalizado.' : 'Galeria finalizada.', { kind: 'ok', title: 'Finalizado' });
    } catch (err) {
      showError(err?.message || 'Erro ao finalizar');
    }
  });
  actReactivate?.addEventListener('click', async (e) => {
    e.preventDefault();
    closeActMenu();
    const enabled = (Array.isArray(gallery?.clients) ? gallery.clients : []).filter((c) => c && c.enabled !== false);
    const cid = enabled.length > 1 ? resolveClientIdForRoundApi() : null;
    const row = cid ? enabled.find((c) => parseInt(c.id, 10) === cid) : null;
    const who = row ? String(row.nome || row.email || 'este cliente').trim() : '';
    const msg = enabled.length > 1 && who
      ? `Reativar o acesso de ${who}? (Os outros visitantes não são afetados.)`
      : 'Reativar esta galeria? (o cliente poderá selecionar novamente)';
    if (!confirm(msg)) return;
    try {
      await setStatus('andamento');
      toast(enabled.length > 1 ? 'Cliente reativado.' : 'Galeria reativada.', { kind: 'ok', title: 'Reativado' });
    } catch (err) {
      showError(err?.message || 'Erro ao reativar');
    }
  });
  actShare?.addEventListener('click', async (e) => {
    e.preventDefault();
    closeActMenu();
    try {
      document.querySelectorAll('.ks-nav a').forEach(n => n.classList.remove('active'));
      document.getElementById('ks-nav-projects')?.classList.add('active');
      setActiveTab('links');
      toast('Aba “Link e compartilhamento”: copie o link ou a mensagem.', { kind: 'ok', title: 'Compartilhar' });
    } catch (err) {
      showError(err?.message || 'Erro ao compartilhar');
    }
  });
  actDeleteClient?.addEventListener('click', async (e) => {
    e.preventDefault();
    closeActMenu();
    const delCid = parseInt(_activityFocusClientId, 10) || parseInt(_activeClientId, 10);
    if (!galleryId || !delCid) {
      toast('Selecione um cliente na lista.', { kind: 'warn', title: 'Excluir cliente' });
      return;
    }
    const email = _activeClientEmail || document.getElementById('ks-activity-email')?.textContent || 'este cliente';
    if (!confirm(`Excluir o cadastro de ${email}?\n\nIsso apaga o cadastro e também remove seleções, liberações e comprovantes vinculados a este cliente nesta galeria.`)) return;
    try {
      actDeleteClient.disabled = true;
      const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/clients/${delCid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao excluir cliente');
      toast('Cadastro do cliente excluído.', { kind: 'ok', title: 'Excluir cliente' });
      _activeClientId = null;
      _activeClientEmail = null;
      if (delCid === parseInt(_activityFocusClientId, 10)) _activityFocusClientId = null;
      await loadGallery();
    } catch (err) {
      showError(err?.message || 'Erro ao excluir cliente');
    } finally {
      actDeleteClient.disabled = false;
    }
  });
  actOpenWhatsappBtn?.addEventListener('click', () => {
    const url = String(actOpenWhatsappBtn.getAttribute('data-whats-link') || '').trim();
    if (!url) {
      toast('Este cliente não tem WhatsApp válido cadastrado.', { kind: 'warn', title: 'WhatsApp cliente' });
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  });
  actMainBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    const st = String(gallery?._panelClientStatus || gallery?.status || '').toLowerCase();
    // "Reativar" como ação principal só quando já está finalizado.
    // Em "revisao" (cliente já escolheu), o botão principal deve permitir Finalizar.
    if (st === 'finalizado') {
      await actReactivate?.click();
      return;
    }
    await actFinalize?.click();
  });

  navProjects?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = kingSelectionPainelUrl();
  });
  document.getElementById('ks-nav-clients')?.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveTab('clients');
    document.querySelectorAll('.ks-nav a').forEach(a => a.classList.remove('active'));
    document.getElementById('ks-nav-clients')?.classList.add('active');
  });
  document.getElementById('ks-nav-settings')?.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveTab('details');
    document.querySelectorAll('.ks-nav a').forEach(a => a.classList.remove('active'));
    document.getElementById('ks-nav-settings')?.classList.add('active');
  });

  // Botão "Voltar" (página anterior). Se não houver histórico, volta para "Meus projetos".
  btnBack?.addEventListener('click', (e) => {
    e.preventDefault();
    try {
      if (window.history && window.history.length > 1) {
        window.history.back();
        return;
      }
    } catch (_) { }
    window.location.href = kingSelectionPainelUrl();
  });

  // Botão "Painel" (dashboard principal)
  btnPanel?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/dashboard.html';
  });

  // Botão "Excluir projeto" (remove galeria + todas as fotos do R2)
  btnDeleteProject?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!galleryId) return;
    const nome = document.getElementById('ks-project-title')?.textContent || 'Projeto';
    if (!confirm(`Excluir o projeto "${nome}" e todas as fotos?\n\nEsta ação não pode ser desfeita.`)) return;
    try {
      btnDeleteProject.disabled = true;
      const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}`, { method: 'DELETE', headers: HEADERS });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao excluir');
      window.location.href = kingSelectionPainelUrl();
    } catch (err) {
      showError(err?.message || 'Erro ao excluir projeto');
      toast(err?.message || 'Erro ao excluir projeto', { kind: 'err', title: 'Erro' });
    } finally {
      btnDeleteProject.disabled = false;
    }
  });

  // save handlers
  fCategoria?.addEventListener('change', () => {
    const isOutro = fCategoria.value === '_outro';
    if (fCategoriaOutro) fCategoriaOutro.classList.toggle('hidden', !isOutro);
  });

  saveDetailsBtn?.addEventListener('click', async () => {
    try {
      saveDetailsBtn.disabled = true;
      const catVal = fCategoria.value === '_outro' ? (fCategoriaOutro?.value || '').trim() : (fCategoria.value || '').trim();
      const maxSel = fMaxSelections?.value !== undefined && fMaxSelections.value !== '' ? parseInt(fMaxSelections.value, 10) : undefined;
      const minSel = fMinSelections?.value !== undefined && fMinSelections.value !== '' ? parseInt(fMinSelections.value, 10) : undefined;
      const cardH = normalizeClientCardHeightPx(fClientCardHeight?.value);
      const payload = {
        nome_projeto: fNome.value,
        categoria: catVal || null,
        data_trabalho: fData.value || null,
        idioma: fIdioma.value,
        mensagem_acesso: fMsg.value,
        client_card_height_px: cardH
      };
      if (maxSel !== undefined) payload.total_fotos_contratadas = Math.max(0, maxSel);
      if (minSel !== undefined) payload.min_selections = Math.max(0, minSel);
      await savePatch(payload);
      await loadGallery();
      toast('Alterações salvas.', { kind: 'ok', title: 'Salvo' });
    } catch (e) {
      showError(e.message || 'Erro ao salvar');
    } finally {
      saveDetailsBtn.disabled = false;
    }
  });
  fClientCardHeight?.addEventListener('input', () => {
    refreshClientCardHeightLabel();
  });

  savePrivacyBtn?.addEventListener('click', async () => {
    try {
      savePrivacyBtn.disabled = true;
      const accessModeVal = getRadio('access_mode') || 'private';
      const patch = { access_mode: accessModeVal };
      if (accessModeVal === 'signup' || accessModeVal === 'paid_event_photos') patch.allow_self_signup = true;
      await savePatch(patch);
      await loadGallery();
      toast('Alterações salvas.', { kind: 'ok', title: 'Salvo' });
    } catch (e) {
      showError(e.message || 'Erro ao salvar');
    } finally {
      savePrivacyBtn.disabled = false;
    }
  });

  salesAddPackageBtn?.addEventListener('click', () => {
    salesPackagesCache = collectSalesPackagesDraftFromUi();
    salesPackagesCache = Array.isArray(salesPackagesCache) ? salesPackagesCache : [];
    const next = salesPackagesCache.length + 1;
    salesPackagesCache.push({ name: `Pacote ${next}`, photo_qty: 3, price_cents: 0, active: true });
    renderSalesPackagesEditor();
  });

  salesPackagesWrap?.addEventListener('click', (e) => {
    const moveBtn = e.target.closest('[data-pkg-move]');
    if (moveBtn) {
      salesPackagesCache = collectSalesPackagesDraftFromUi();
      const idx = parseInt(moveBtn.getAttribute('data-pkg-move') || '-1', 10);
      const dir = String(moveBtn.getAttribute('data-pkg-dir') || '');
      if (idx < 0 || !Array.isArray(salesPackagesCache) || !salesPackagesCache.length) return;
      const to = dir === 'up' ? (idx - 1) : (idx + 1);
      if (to < 0 || to >= salesPackagesCache.length) return;
      const next = salesPackagesCache.slice();
      const tmp = next[idx];
      next[idx] = next[to];
      next[to] = tmp;
      salesPackagesCache = next;
      renderSalesPackagesEditor();
      return;
    }
    const btn = e.target.closest('[data-pkg-remove]');
    if (!btn) return;
    salesPackagesCache = collectSalesPackagesDraftFromUi();
    const idx = parseInt(btn.getAttribute('data-pkg-remove') || '-1', 10);
    if (idx < 0) return;
    salesPackagesCache = (Array.isArray(salesPackagesCache) ? salesPackagesCache : []).filter((_, i) => i !== idx);
    renderSalesPackagesEditor();
  });

  salesPackagesWrap?.addEventListener('blur', (e) => {
    const money = e.target?.closest?.('[data-money="1"]');
    if (!money) return;
    normalizeMoneyInput(money);
  }, true);
  salesPackagesWrap?.addEventListener('input', (e) => {
    const money = e.target?.closest?.('[data-money="1"]');
    if (!money) return;
    // Evita "saltos" de valor enquanto digita (ex.: ao adicionar 0).
    // A normalização final continua no blur.
    if (shouldSkipMoneyMaskOnThisInput(e)) return;
  });

  function clearSalesPackageDropMarkers() {
    if (!salesPackagesWrap) return;
    salesPackagesWrap.querySelectorAll('[data-sales-package]').forEach((el) => {
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.opacity = '';
    });
  }

  salesPackagesWrap?.addEventListener('dragstart', (e) => {
    const card = e.target?.closest?.('[data-sales-package]');
    if (!card) return;
    salesPackagesCache = collectSalesPackagesDraftFromUi();
    const idx = parseInt(card.getAttribute('data-sales-package') || '-1', 10);
    if (idx < 0) return;
    salesPackageDragIdx = idx;
    try {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(idx));
    } catch (_) { }
    card.style.opacity = '0.55';
  });

  salesPackagesWrap?.addEventListener('dragover', (e) => {
    const card = e.target?.closest?.('[data-sales-package]');
    if (!card) return;
    e.preventDefault();
    try { e.dataTransfer.dropEffect = 'move'; } catch (_) { }
    clearSalesPackageDropMarkers();
    card.style.outline = '2px dashed rgba(251,191,36,.95)';
    card.style.outlineOffset = '2px';
  });

  salesPackagesWrap?.addEventListener('dragleave', (e) => {
    const card = e.target?.closest?.('[data-sales-package]');
    if (!card) return;
    card.style.outline = '';
    card.style.outlineOffset = '';
  });

  salesPackagesWrap?.addEventListener('drop', (e) => {
    const card = e.target?.closest?.('[data-sales-package]');
    if (!card) return;
    e.preventDefault();
    const to = parseInt(card.getAttribute('data-sales-package') || '-1', 10);
    const from = salesPackageDragIdx;
    clearSalesPackageDropMarkers();
    salesPackageDragIdx = -1;
    if (from < 0 || to < 0 || from === to) return;
    const src = Array.isArray(salesPackagesCache) && salesPackagesCache.length
      ? salesPackagesCache.slice()
      : collectSalesPackagesDraftFromUi();
    if (from >= src.length || to >= src.length) return;
    const next = src.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    salesPackagesCache = next;
    renderSalesPackagesEditor();
  });

  salesPackagesWrap?.addEventListener('dragend', () => {
    salesPackageDragIdx = -1;
    clearSalesPackageDropMarkers();
  });

  salesClientsList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-sales-client-card]');
    if (!btn) return;
    const cid = parseInt(btn.getAttribute('data-sales-client-card') || '0', 10) || 0;
    if (!cid || !salesClientSel) return;
    salesClientSel.value = String(cid);
    renderSalesClientsList();
    rebuildSalesRounds(true);
    await loadSalesDetail().catch((err) => showError(err?.message || 'Erro ao carregar detalhe de vendas'));
  });

  salesTopPending?.addEventListener('click', async (e) => {
    const openBtn = e.target.closest('[data-sales-top-client]');
    if (openBtn) {
      const cid = parseInt(openBtn.getAttribute('data-sales-top-client') || '0', 10) || 0;
      if (!cid || !salesClientSel) return;
      salesClientSel.value = String(cid);
      renderSalesClientsList();
      rebuildSalesRounds(true);
      await loadSalesDetail().catch((err) => showError(err?.message || 'Erro ao carregar detalhe de vendas'));
      return;
    }
    const waBtn = e.target.closest('[data-sales-top-whats]');
    if (waBtn) {
      const cid = parseInt(waBtn.getAttribute('data-sales-top-whats') || '0', 10) || 0;
      if (!cid) return;
      const cli = (Array.isArray(salesClientsCache) ? salesClientsCache : []).find((c) => (parseInt(c?.id, 10) || 0) === cid);
      const wd = resolveWhatsappDigits(cli?.telefone || '');
      if (!wd || wd.length < 10) {
        showError('Cliente sem WhatsApp válido (com DDD).');
        return;
      }
      const nome = String(cli?.nome || cli?.email || 'cliente');
      const msg = `Olá, ${nome}! Tudo bem? Aqui é o fotógrafo da galeria "${gallery?.nome_projeto || ''}". Vi uma pendência e estou te chamando para alinharmos.`;
      window.open(`https://wa.me/${encodeURIComponent(wd)}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    }
  });

  salesTopPendingPeriod?.addEventListener('change', () => {
    const v = String(salesTopPendingPeriod?.value || 'week').toLowerCase();
    salesTopPendingPeriodValue = ['today', 'week', 'month'].includes(v) ? v : 'week';
    try {
      localStorage.setItem(KS_TOP_PENDING_PERIOD_KEY, salesTopPendingPeriodValue);
    } catch (e) {}
    renderSalesDashboard();
  });

  salesClientsFilter?.addEventListener('change', () => {
    salesClientsListFilter = String(salesClientsFilter.value || 'all').toLowerCase();
    renderSalesClientsList();
  });

  salesWrap?.addEventListener('click', (e) => {
    const dashBtn = e.target.closest('[data-sales-dash-detail]');
    if (dashBtn) {
      const kind = dashBtn.getAttribute('data-sales-dash-detail');
      if (kind === 'received' || kind === 'missing' || kind === 'courtesy') openSalesDashDetailModal(kind);
      return;
    }
  });

  salesDashDetailClose?.addEventListener('click', () => closeSalesDashDetailModal());

  salesDashDetailModal?.addEventListener('click', async (e) => {
    if (e.target === salesDashDetailModal) {
      closeSalesDashDetailModal();
      return;
    }
    const openCli = e.target.closest('[data-sales-detail-open-client]');
    if (!openCli || !salesClientSel) return;
    const cid = parseInt(openCli.getAttribute('data-sales-detail-open-client') || '0', 10) || 0;
    if (!cid) return;
    closeSalesDashDetailModal();
    salesClientSel.value = String(cid);
    renderSalesClientsList();
    rebuildSalesRounds(true);
    await loadSalesDetail().catch((err) => showError(err?.message || 'Erro ao carregar detalhe de vendas'));
  });

  salesClientSearch?.addEventListener('input', () => {
    salesClientSearchTerm = String(salesClientSearch?.value || '').trim().toLowerCase();
    renderSalesClientsList();
  });

  salesClientSel?.addEventListener('change', async () => {
    renderSalesClientsList();
    rebuildSalesRounds(true);
    await loadSalesDetail().catch((e) => showError(e?.message || 'Erro ao carregar detalhe de vendas'));
  });

  salesRoundSel?.addEventListener('change', async () => {
    await loadSalesDetail().catch((e) => showError(e?.message || 'Erro ao carregar detalhe de vendas'));
  });

  salesSaveBtn?.addEventListener('click', async () => {
    try {
      if (!isSalesModeEnabled()) {
        throw new Error('Ative o modo "Fotos vendidas por evento" em Acesso e privacidade antes de salvar.');
      }
      salesSaveBtn.disabled = true;
      const payload = {
        pix_enabled: !!salesPixEnabled?.checked,
        pix_key: String(salesPixKey?.value || '').trim() || null,
        pix_holder_name: String(salesPixHolder?.value || '').trim() || null,
        pix_instructions: String(salesPixInstructions?.value || '').trim() || null,
        sales_over_limit_policy: String(salesOverLimit?.value || 'allow_and_warn'),
        sales_price_mode: String(salesPriceMode?.value || 'best_price_auto'),
        sales_unit_price_cents: Math.max(0, parseReaisInputToCents(salesUnitPrice?.value || '0')),
        packages: collectSalesPackagesFromUi()
      };
      const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/sales-config`, {
        method: 'PUT',
        headers: HEADERS,
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao salvar configuração comercial');
      await refreshSalesUi();
      toast('Configuração comercial salva.', { kind: 'ok', title: 'Vendas' });
    } catch (e) {
      showError(e?.message || 'Erro ao salvar configuração comercial');
    } finally {
      salesSaveBtn.disabled = false;
    }
  });

  salesTermsSave?.addEventListener('click', async () => {
    try {
      const cid = parseInt(salesClientSel?.value || '0', 10) || 0;
      const round = Math.max(1, parseInt(salesRoundSel?.value || '1', 10) || 1);
      if (!cid) throw new Error('Selecione um cliente.');
      salesTermsSave.disabled = true;
      const negRaw = String(salesTermsNegotiated?.value || '').trim();
      const downRaw = String(salesTermsDown?.value || '').trim();
      const remRaw = String(salesTermsRemaining?.value || '').trim();
      const instRaw = String(salesTermsInstallments?.value || '').trim();
      const daysRaw = String(salesTermsIntervalDays?.value || '').trim();
      const body = {};
      if (negRaw === '') body.negotiated_total_cents = null;
      else {
        const c = parseBrMoneyStringToCents(negRaw);
        if (c == null) throw new Error('Total acordado inválido.');
        body.negotiated_total_cents = c;
      }
      if (downRaw === '') body.down_payment_cents = null;
      else {
        const c = parseBrMoneyStringToCents(downRaw);
        if (c == null) throw new Error('Entrada declarada inválida.');
        body.down_payment_cents = c;
      }
      if (remRaw === '') {
        body.remaining_balance_cents = null;
        body.installment_count = null;
        body.installment_interval_days = null;
      } else {
        const c = parseBrMoneyStringToCents(remRaw);
        if (c == null) throw new Error('Valor restante inválido.');
        body.remaining_balance_cents = c;
        if (instRaw === '') {
          body.installment_count = 1;
        } else {
          const n = parseInt(instRaw, 10);
          if (!Number.isFinite(n) || n < 1 || n > 240) throw new Error('Parcelas do restante inválidas (1–240).');
          body.installment_count = n;
        }
        if (daysRaw === '') body.installment_interval_days = null;
        else {
          const nd = parseInt(daysRaw, 10);
          if (!Number.isFinite(nd) || nd < 1 || nd > 730) throw new Error('Dias para pagar inválidos (1–730).');
          body.installment_interval_days = nd;
        }
      }
      const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/sales/clients/${cid}/round/${round}/payment-terms`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao salvar valores combinados');
      await loadSalesClients();
      await loadSalesDetail();
      toast('Valores combinados salvos.', { kind: 'ok', title: 'Vendas' });
    } catch (e) {
      showError(e?.message || 'Erro ao salvar valores combinados');
    } finally {
      if (salesTermsSave) salesTermsSave.disabled = false;
    }
  });

  async function salesSubmitPaymentReviewAndApproveAll(body) {
    const cid = parseInt(salesClientSel?.value || '0', 10) || 0;
    const round = Math.max(1, parseInt(salesRoundSel?.value || '1', 10) || 1);
    if (!cid) throw new Error('Selecione um cliente.');
    const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/sales/clients/${cid}/round/${round}/payment-review`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao confirmar pagamento');
    let out = null;
    try {
      out = await salesApproveAll({ cid, round, status: 'approved', delivery_mode: 'original' });
    } catch (approveErr) {
      await loadSalesDetail().catch(() => { });
      throw new Error(`Pagamento atualizado, mas não foi possível aprovar todas as fotos automaticamente: ${approveErr?.message || 'erro desconhecido'}`);
    }
    await loadSalesDetail();
    await loadSalesClients();
    return out;
  }

  salesPaymentConfirmBtn?.addEventListener('click', async () => {
    try {
      const cid = parseInt(salesClientSel?.value || '0', 10) || 0;
      if (!cid) throw new Error('Selecione um cliente.');
      const amountRaw = window.prompt('Valor confirmado neste passo (R$). Ex.: 1000 ou 1000,00 — pode ser entrada parcial.', '');
      if (amountRaw == null) return;
      const amount = parseAdminAmountInputToCents(amountRaw);
      if (amount == null) throw new Error('Valor inválido. Use formato em reais, ex.: 200 ou 200,00.');
      const increment = window.confirm(
        'Como registrar?\n\nOK = ENTRADA/PARCELA (somar ao que já foi registrado)\nCancelar = TOTAL já recebido em dinheiro nesta conta (substitui o acumulado)'
      );
      const courtesyRest = window.confirm('Marcar o RESTANTE do pacote como CORTESIA e encerrar como quitado?');
      const note = (window.prompt('Observação interna (opcional):', '') || '').trim();
      const finalNote = note || (amount === 0 ? 'Abençoado (cortesia)' : null);
      const out = await salesSubmitPaymentReviewAndApproveAll({
        status: 'confirmed',
        photographer_confirmed_cents: amount,
        increment_mode: increment,
        remainder_as_courtesy: courtesyRest,
        note_admin: finalNote
      });
      toast(`Pagamento confirmado e ${out.updated || 0} foto(s) aprovadas automaticamente.`, { kind: 'ok', title: 'Vendas' });
    } catch (e) {
      showError(e?.message || 'Erro ao confirmar pagamento');
    }
  });

  salesPaymentAdiantamentoBtn?.addEventListener('click', async () => {
    try {
      const cid = parseInt(salesClientSel?.value || '0', 10) || 0;
      if (!cid) throw new Error('Selecione um cliente.');
      const amountRaw = window.prompt(
        'Valor do adiantamento recebido agora (R$).\n\nSerá somado ao recebido nesta rodada. Use de novo até quitar o combinado.',
        ''
      );
      if (amountRaw == null) return;
      const amount = parseAdminAmountInputToCents(amountRaw);
      if (amount == null || amount <= 0) throw new Error('Informe um valor maior que zero.');
      const noteExtra = (window.prompt('Observação interna (opcional):', '') || '').trim();
      const baseNote = `Adiantamento ${formatCentsBr(amount)}`;
      const noteAdmin = noteExtra ? `${baseNote}. ${noteExtra}` : baseNote;
      const out = await salesSubmitPaymentReviewAndApproveAll({
        status: 'confirmed',
        photographer_confirmed_cents: amount,
        increment_mode: true,
        remainder_as_courtesy: false,
        note_admin: noteAdmin
      });
      toast(`Adiantamento ${formatCentsBr(amount)} registrado. ${out.updated || 0} foto(s) aprovadas.`, { kind: 'ok', title: 'Vendas' });
    } catch (e) {
      showError(e?.message || 'Erro ao registrar adiantamento');
    }
  });

  salesPaymentCourtesyRestBtn?.addEventListener('click', async () => {
    try {
      const cid = parseInt(salesClientSel?.value || '0', 10) || 0;
      if (!cid) throw new Error('Selecione um cliente.');
      if (
        !window.confirm(
          'Abonar o valor RESTANTE do pacote como cortesia e encerrar como pagamento quitado?\n\nUse depois de registrar o que o cliente pagou em dinheiro; o sistema preenche a cortesia até fechar o total estimado.'
        )
      ) {
        return;
      }
      const note = (window.prompt('Observação interna (opcional):', 'Cortesia do restante') || '').trim();
      const out = await salesSubmitPaymentReviewAndApproveAll({
        status: 'confirmed',
        photographer_confirmed_cents: 0,
        increment_mode: false,
        remainder_as_courtesy: true,
        note_admin: note || 'Cortesia do restante'
      });
      toast(`Pacote encerrado (cortesia no restante) e ${out.updated || 0} foto(s) aprovadas.`, { kind: 'ok', title: 'Vendas' });
    } catch (e) {
      showError(e?.message || 'Erro ao aplicar cortesia no restante');
    }
  });

  salesPaymentFixAmountBtn?.addEventListener('click', async () => {
    try {
      const cid = parseInt(salesClientSel?.value || '0', 10) || 0;
      const round = Math.max(1, parseInt(salesRoundSel?.value || '1', 10) || 1);
      if (!cid) throw new Error('Selecione um cliente.');
      const current = salesDetailCache?.payment?.amount_cents != null
        ? formatCentsForInputBr(salesDetailCache.payment.amount_cents)
        : '';
      const amountRaw = window.prompt('Corrigir valor pago (R$). Ex.: 200 ou 200,00', current);
      if (amountRaw == null) return;
      const amount = parseAdminAmountInputToCents(amountRaw);
      if (amount == null) throw new Error('Valor inválido.');
      const note = (window.prompt('Obs. ADM (opcional):', String(salesDetailCache?.payment?.note_admin || '').trim()) || '').trim();
      const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/sales/clients/${cid}/round/${round}/payment-review`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          status: 'confirmed',
          photographer_confirmed_cents: amount,
          increment_mode: false,
          remainder_as_courtesy: false,
          note_admin: note || null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao corrigir valor pago');
      await loadSalesDetail();
      await loadSalesClients();
      toast('Valor pago corrigido com sucesso.', { kind: 'ok', title: 'Vendas' });
    } catch (e) {
      showError(e?.message || 'Erro ao corrigir valor');
    }
  });

  salesPaymentBlessBtn?.addEventListener('click', async () => {
    try {
      const cid = parseInt(salesClientSel?.value || '0', 10) || 0;
      if (!cid) throw new Error('Selecione um cliente.');
      const note = (window.prompt('Observação (opcional). Ex.: cliente abençoado / cortesia', 'Abençoado (cortesia)') || '').trim();
      const out = await salesSubmitPaymentReviewAndApproveAll({
        status: 'confirmed',
        amount_cents: 0,
        note_admin: note || 'Abençoado (cortesia)'
      });
      toast(`Cliente marcado como abençoado e ${out.updated || 0} foto(s) liberadas automaticamente.`, { kind: 'ok', title: 'Vendas' });
    } catch (e) {
      showError(e?.message || 'Erro ao marcar como abençoado');
    }
  });

  salesPaymentRejectBtn?.addEventListener('click', async () => {
    try {
      const cid = parseInt(salesClientSel?.value || '0', 10) || 0;
      const round = Math.max(1, parseInt(salesRoundSel?.value || '1', 10) || 1);
      if (!cid) throw new Error('Selecione um cliente.');
      const note = (window.prompt('Motivo da recusa do comprovante:', '') || '').trim();
      const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/sales/clients/${cid}/round/${round}/payment-review`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ status: 'rejected', note_admin: note || null })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao recusar comprovante');
      await loadSalesDetail();
      toast('Comprovante recusado.', { kind: 'warn', title: 'Vendas' });
    } catch (e) {
      showError(e?.message || 'Erro ao recusar comprovante');
    }
  });

  salesPaymentPendingBtn?.addEventListener('click', async () => {
    try {
      const cid = parseInt(salesClientSel?.value || '0', 10) || 0;
      const round = Math.max(1, parseInt(salesRoundSel?.value || '1', 10) || 1);
      if (!cid) throw new Error('Selecione um cliente.');
      const note = (window.prompt('Observação interna (opcional):', '') || '').trim();
      const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/sales/clients/${cid}/round/${round}/payment-review`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ status: 'pending', note_admin: note || null })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao voltar pagamento para pendente');
      await loadSalesDetail();
      await loadSalesClients();
      toast('Comprovante voltou para estado em espera.', { kind: 'ok', title: 'Vendas' });
    } catch (e) {
      showError(e?.message || 'Erro ao voltar pagamento para pendente');
    }
  });

  salesPaymentUndoConfirmBtn?.addEventListener('click', async () => {
    try {
      const cid = parseInt(salesClientSel?.value || '0', 10) || 0;
      const round = Math.max(1, parseInt(salesRoundSel?.value || '1', 10) || 1);
      if (!cid) throw new Error('Selecione um cliente.');
      if (
        !window.confirm(
          'Desfazer a confirmação desta rodada?\n\nSerá zerado o valor recebido/cortesia e o status volta a aguardar comprovante. O total acordado (se salvou em "Valores combinados") é mantido.'
        )
      ) {
        return;
      }
      const note = (window.prompt('Observação interna (opcional):', 'Desfeito — aguardando novo comprovante') || '').trim();
      const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/sales/clients/${cid}/round/${round}/payment-review`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          status: 'pending',
          clear_payment_amounts: true,
          note_admin: note || null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao desfazer confirmação');
      await loadSalesDetail();
      await loadSalesClients();
      toast('Pagamento voltou a aguardar comprovante (valores recebidos zerados).', { kind: 'ok', title: 'Vendas' });
    } catch (e) {
      showError(e?.message || 'Erro ao desfazer confirmação');
    }
  });

  salesOpenProofBtn?.addEventListener('click', () => {
    const pay = salesDetailCache?.payment || null;
    if (!pay) {
      toast('Nenhum pagamento cadastrado para esta rodada.', { kind: 'warn', title: 'Comprovante' });
      return;
    }
    renderSalesProofPanel(pay);
    if (!String(pay?.proof_file_path || '').trim()) {
      toast('Esta rodada ainda está sem comprovante anexado.', { kind: 'warn', title: 'Comprovante' });
    }
  });

  salesOpenClientWhatsBtn?.addEventListener('click', () => {
    const url = String(salesOpenClientWhatsBtn.getAttribute('data-whats-link') || '').trim();
    if (!url) {
      showError('WhatsApp indisponível para este cliente/sessão.');
      return;
    }
    window.open(url, '_blank', 'noopener');
  });

  salesApproveAllBtn?.addEventListener('click', async () => {
    try {
      const cid = parseInt(salesClientSel?.value || '0', 10) || 0;
      const round = Math.max(1, parseInt(salesRoundSel?.value || '1', 10) || 1);
      if (!cid) throw new Error('Selecione um cliente.');
      if (!confirm(`Aprovar TODAS as fotos da seleção ${round} deste cliente para download original?`)) return;
      const out = await salesApproveAll({ cid, round, status: 'approved', delivery_mode: 'original' });
      await loadSalesDetail();
      toast(`Todas aprovadas (${out.updated || 0} foto(s)).`, { kind: 'ok', title: 'Vendas' });
    } catch (e) {
      showError(e?.message || 'Erro ao aprovar todas as fotos');
    }
  });

  salesPhotosAllPendingBtn?.addEventListener('click', async () => {
    try {
      const cid = parseInt(salesClientSel?.value || '0', 10) || 0;
      const round = Math.max(1, parseInt(salesRoundSel?.value || '1', 10) || 1);
      if (!cid) throw new Error('Selecione um cliente.');
      if (
        !confirm(
          `Marcar TODAS as fotos da rodada ${round} como AGUARDANDO LIBERAÇÃO?\n\n(Igual ao botão por foto: volta para análise antes de liberar download.)`
        )
      ) {
        return;
      }
      const out = await salesApproveAll({ cid, round, status: 'pending', delivery_mode: 'original' });
      await loadSalesDetail();
      toast(`${out.updated || 0} foto(s) em aguardando liberação.`, { kind: 'ok', title: 'Vendas' });
    } catch (e) {
      showError(e?.message || 'Erro ao marcar todas como aguardando');
    }
  });

  salesApprovalsWrap?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-sales-photo-action]');
    const card = e.target.closest('[data-sales-photo]');
    if (!btn || !card) return;
    try {
      const action = btn.getAttribute('data-sales-photo-action');
      const photoId = parseInt(card.getAttribute('data-sales-photo') || '0', 10) || 0;
      const cid = parseInt(salesClientSel?.value || '0', 10) || 0;
      const round = Math.max(1, parseInt(salesRoundSel?.value || '1', 10) || 1);
      if (!photoId || !cid) throw new Error('Cliente/foto inválidos');
      if (action === 'upload-edited') {
        salesEditedPendingPhotoId = photoId;
        if (salesEditedFileInput) {
          salesEditedFileInput.value = '';
          salesEditedFileInput.click();
        }
        return;
      }
      let status = 'pending';
      let delivery_mode = 'original';
      if (action === 'approve-original') { status = 'approved'; delivery_mode = 'original'; }
      else if (action === 'bless') { status = 'approved'; delivery_mode = 'original'; }
      else if (action === 'pending') { status = 'pending'; delivery_mode = 'original'; }
      else if (action === 'reject') { status = 'rejected'; delivery_mode = 'original'; }
      await salesApprovePhoto({ cid, round, photoId, status, delivery_mode });
      await loadSalesDetail();
      toast(action === 'bless' ? 'Foto abençoada e liberada para download.' : 'Aprovação atualizada.', { kind: 'ok', title: 'Vendas' });
    } catch (err) {
      showError(err?.message || 'Erro ao atualizar aprovação');
    }
  });

  actSalesApproveAllBtn?.addEventListener('click', async () => {
    try {
      const cid = parseInt(_activityFocusClientId || '0', 10) || parseInt(_activeClientId || '0', 10) || 0;
      const round = Math.max(1, parseInt(actBatchFilter?.value || '1', 10) || 1);
      if (!cid || !round || String(actBatchFilter?.value || 'all') === 'all') {
        throw new Error('Selecione cliente e rodada na aba Atividades.');
      }
      if (!confirm(`Aprovar TODAS as fotos da Seleção ${round} deste cliente?`)) return;
      const out = await salesApproveAll({ cid, round, status: 'approved', delivery_mode: 'original' });
      await loadGallery();
      toast(`Aprovadas ${out.updated || 0} foto(s) na revisão.`, { kind: 'ok', title: 'Atividades' });
    } catch (e) {
      showError(e?.message || 'Erro ao aprovar todas na revisão');
    }
  });

  actSelPhotos?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act-sales-approve]');
    if (!btn) return;
    try {
      const photoId = parseInt(btn.getAttribute('data-act-sales-approve') || '0', 10) || 0;
      const cid = parseInt(_activityFocusClientId || '0', 10) || parseInt(_activeClientId || '0', 10) || 0;
      const round = Math.max(1, parseInt(actBatchFilter?.value || '1', 10) || 1);
      if (!photoId || !cid || !round || String(actBatchFilter?.value || 'all') === 'all') {
        throw new Error('Selecione uma rodada específica para aprovar fotos.');
      }
      btn.disabled = true;
      await salesApprovePhoto({ cid, round, photoId, status: 'approved', delivery_mode: 'original' });
      toast('Foto aprovada na revisão.', { kind: 'ok', title: 'Atividades' });
      await loadGallery();
    } catch (err) {
      showError(err?.message || 'Erro ao aprovar foto na revisão');
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  salesEditedFileInput?.addEventListener('change', async (e) => {
    const file = e?.target?.files?.[0] || null;
    const photoId = parseInt(salesEditedPendingPhotoId || '0', 10) || 0;
    salesEditedPendingPhotoId = 0;
    if (!file || !photoId) return;
    try {
      const cid = parseInt(salesClientSel?.value || '0', 10) || 0;
      const round = Math.max(1, parseInt(salesRoundSel?.value || '1', 10) || 1);
      if (!cid) throw new Error('Selecione um cliente antes de enviar a foto editada.');

      const fd = new FormData();
      fd.append('file', file);
      const up = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/photos/${photoId}/edited-upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok) throw new Error(upData.message || 'Erro ao enviar foto editada');

      const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/sales/clients/${cid}/round/${round}/approve-photo`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ photo_id: photoId, status: 'approved', delivery_mode: 'edited' })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao aprovar foto editada');
      await loadSalesDetail();
      toast('Foto editada enviada e aprovada para download.', { kind: 'ok', title: 'Vendas' });
    } catch (err) {
      showError(err?.message || 'Erro ao enviar foto editada');
    } finally {
      if (salesEditedFileInput) salesEditedFileInput.value = '';
    }
  });

  salesPriceMode?.addEventListener('change', () => {
    updateSalesPriceModeUi();
  });

  salesUnitPrice?.addEventListener('blur', () => {
    normalizeMoneyInput(salesUnitPrice);
  });
  salesUnitPrice?.addEventListener('input', (e) => {
    // Mesmo comportamento dos pacotes: não remascarar no input.
    // Formata no blur para não distorcer o número durante a digitação.
    if (shouldSkipMoneyMaskOnThisInput(e)) return;
  });

  salesPixGenerateBtn?.addEventListener('click', () => {
    if (!salesPixInstructions) return;
    salesPixInstructions.value = buildAutoPixInstructions();
    toast('Instrução automática preenchida. Clique em "Salvar configuração comercial".', { kind: 'ok', title: 'PIX' });
  });

  // ===== Clientes (multi-client) =====
  const _clientPwCache = new Map(); // clientId -> plain password
  let _openClientMenuFor = null; // clientId

  function openClientModal({ title } = {}) {
    if (!clientModal) return;
    clientModalTitle && (clientModalTitle.textContent = title || 'Cliente');
    clientModal.classList.remove('hidden');
    clientModal.classList.add('flex');
    clientModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => cfName?.focus(), 50);
  }
  function closeClientModal() {
    if (!clientModal) return;
    clientModal.classList.add('hidden');
    clientModal.classList.remove('flex');
    clientModal.setAttribute('aria-hidden', 'true');
    _activeClientId = null;
    _activeClientEmail = null;
  }

  function openShareModal() {
    if (!shareModal) return;
    shareModal.classList.remove('hidden');
    shareModal.classList.add('flex');
    shareModal.setAttribute('aria-hidden', 'false');
  }
  function closeShareModal() {
    if (!shareModal) return;
    shareModal.classList.add('hidden');
    shareModal.classList.remove('flex');
    shareModal.setAttribute('aria-hidden', 'true');
  }

  function randomPass6() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  async function fetchClientPassword(clientId) {
    const id = parseInt(clientId || 0, 10);
    if (!id) throw new Error('clientId inválido');
    if (_clientPwCache.has(id)) return _clientPwCache.get(id);
    const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/clients/${id}/password`, { headers: HEADERS });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao obter senha');
    const pw = String(data.password || '').trim();
    if (!pw) throw new Error('Senha vazia');
    _clientPwCache.set(id, pw);
    return pw;
  }

  /** Resumo em «Dados da galeria»: e-mail(s) e senha(s) dos clientes (acesso privado). */
  function syncDetailsClientSummary() {
    const wrap = document.getElementById('ks-details-client-summary');
    if (!wrap || !gallery) return;
    const clients = Array.isArray(gallery.clients) ? gallery.clients.filter((c) => c && c.enabled !== false) : [];
    const am = String(gallery.access_mode || 'private').toLowerCase();
    const showCred = am === 'private';
    if (!clients.length) {
      wrap.innerHTML =
        '<div class="text-slate-600">Nenhum cliente cadastrado. Use a aba <b>Clientes</b> para adicionar e-mail e senha de acesso à galeria.</div>';
      return;
    }
    const parts = [];
    for (const c of clients) {
      const cid = parseInt(c.id, 10);
      const nm = escapeHtml(String(c.nome || '').trim() || 'Cliente');
      const em = String(c.email || '').trim();
      const emHtml =
        em && !isPlaceholderClienteEmail(em)
          ? `<span class="select-all">${escapeHtml(em)}</span>`
          : '<span class="text-slate-400">(e-mail não informado)</span>';
      let pwdBlock = '';
      if (showCred && cid) {
        pwdBlock = `<div class="mt-2 flex flex-wrap items-center gap-2"><span class="text-xs text-slate-500">Senha:</span><span class="ks-pass-mask font-mono text-sm" data-cid="${cid}">••••••</span><button type="button" class="ks-btn ks-btn-sm" data-ks-reveal-pass="${cid}">Mostrar</button></div>`;
      }
      parts.push(
        `<div class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><div class="font-extrabold text-slate-900">${nm}</div><div class="mt-1"><span class="text-xs text-slate-500">E-mail:</span> ${emHtml}</div>${pwdBlock}</div>`
      );
    }
    if (clients.length > 1) {
      parts.push(
        '<p class="text-xs text-slate-500 mt-1">Vários clientes: cada um tem login próprio. Use <b>Mostrar</b> só quando precisar ver a senha.</p>'
      );
    }
    wrap.innerHTML = parts.join('');
  }

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-ks-reveal-pass]');
    if (!btn) return;
    const cid = parseInt(btn.getAttribute('data-ks-reveal-pass'), 10);
    if (!cid) return;
    const span = btn.previousElementSibling;
    if (!span || !span.classList.contains('ks-pass-mask')) return;
    if (span.getAttribute('data-revealed') === '1') {
      span.textContent = '••••••';
      span.removeAttribute('data-revealed');
      btn.textContent = 'Mostrar';
      return;
    }
    try {
      btn.disabled = true;
      const pw = await fetchClientPassword(cid);
      span.textContent = pw;
      span.setAttribute('data-revealed', '1');
      btn.textContent = 'Ocultar';
    } catch (err) {
      toast(String(err?.message || 'Erro ao obter senha'), { kind: 'err', title: 'Senha' });
    } finally {
      btn.disabled = false;
    }
  });

  function buildWhatsMessageForClient({ email, password }) {
    const link = buildClientShareLink();
    const nome = gallery?.nome_projeto || 'sua galeria';
    return [
      `Olá!`,
      ``,
      `As fotos de ${nome} estão disponíveis para seleção.`,
      ``,
      `Para realizar a seleção, utilize os seguintes dados:`,
      ``,
      `Link:`,
      link,
      ``,
      `E-mail: ${email || '-'}`,
      `Senha: ${password || '-'}`
    ].join('\n');
  }

  function getClientsFiltered() {
    const all = Array.isArray(gallery?.clients) ? gallery.clients : [];
    const q = String(clientSearch?.value || '').toLowerCase().trim();
    const enabled = all.filter(c => c && c.enabled !== false);
    const list = q
      ? enabled.filter(c => String(c.nome || '').toLowerCase().includes(q) || String(c.email || '').toLowerCase().includes(q))
      : enabled;
    return list;
  }

  function renderClients() {
    if (!clientListEl) return;
    const list = getClientsFiltered();
    if (clientCountEl) clientCountEl.textContent = String(list.length);
    if (clientEmptyEl) clientEmptyEl.classList.toggle('hidden', list.length > 0);
    clientListEl.innerHTML = list.map(c => {
      const cid = parseInt(c.id || 0, 10);
      const nm = escapeHtml(c.nome || 'Cliente');
      const em = escapeHtml(c.email || '-');
      const ph = escapeHtml(c.telefone || '');
      const passShown = _clientPwCache.has(cid) ? escapeHtml(_clientPwCache.get(cid)) : '••••••';
      const menuOpen = (_openClientMenuFor === cid) ? 'open' : '';
      return `
        <div class="rounded-2xl border border-white/10 bg-black/30 p-4 relative" data-client-id="${cid}">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="font-extrabold text-white">${nm}</div>
              <div class="text-sm ks-muted truncate">${em}</div>
              ${ph ? `<div class="text-sm ks-muted mt-1">${ph}</div>` : ''}
            </div>
            <div class="flex items-center gap-2">
              <button class="ks-btn" data-action="eye" title="Ver senha"><i class="fas fa-eye"></i></button>
              <button class="ks-btn" data-action="share" title="Compartilhar"><i class="fas fa-share"></i></button>
              <div class="relative">
                <button class="ks-btn" data-action="more" title="Mais ações"><i class="fas fa-ellipsis-vertical"></i></button>
                <div class="ks-menu ${menuOpen}" data-menu style="top:48px;right:0;z-index:90">
                  <button data-action="edit"><i class="fas fa-pen"></i> Editar</button>
                  <button data-action="share"><i class="fas fa-share"></i> Compartilhar</button>
                  <button data-action="remove" class="danger"><i class="fas fa-trash"></i> Remover</button>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-4 rounded-xl border border-white/10 bg-black/35 p-3">
            <div class="text-xs ks-muted font-extrabold" style="letter-spacing:.18em;text-transform:uppercase">Senha</div>
            <div class="mt-2 flex items-center justify-between gap-3">
              <div class="font-mono text-sm text-white" data-pass>${passShown}</div>
              <button class="ks-btn ks-btn-primary" data-action="copy"><i class="fas fa-copy"></i> Copiar acesso</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  saveSelfSignupBtn?.addEventListener('click', async () => {
    try {
      saveSelfSignupBtn.disabled = true;
      await savePatch({ allow_self_signup: !!selfSignup?.checked });
      await loadGallery();
      alert('Salvo!');
    } catch (e) {
      showError(e.message || 'Erro ao salvar');
    } finally {
      saveSelfSignupBtn.disabled = false;
    }
  });

  clientSearch?.addEventListener('input', () => renderClients());

  clientAddBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    _activeClientId = null;
    _activeClientEmail = null;
    if (cfName) cfName.value = '';
    if (cfEmail) cfEmail.value = '';
    if (cfPhone) cfPhone.value = '';
    if (cfNote) cfNote.value = '';
    if (cfPass) cfPass.value = randomPass6();
    openClientModal({ title: 'Adicionar cliente' });
  });

  // Menus: fechar ao clicar fora
  document.addEventListener('click', (e) => {
    if (!_openClientMenuFor) return;
    const t = e.target;
    const inList = clientListEl && clientListEl.contains(t);
    if (!inList) {
      _openClientMenuFor = null;
      renderClients();
      return;
    }
    const btn = t.closest && t.closest('[data-action="more"]');
    const menu = t.closest && t.closest('[data-menu]');
    if (btn || menu) return;
    _openClientMenuFor = null;
    renderClients();
  });

  clientListEl?.addEventListener('click', async (e) => {
    const btn = e.target.closest && e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const card = btn.closest('[data-client-id]');
    const clientId = parseInt(card?.getAttribute('data-client-id') || '0', 10);
    if (!clientId) return;

    const clientsAll = Array.isArray(gallery?.clients) ? gallery.clients : [];
    const c = clientsAll.find(x => parseInt(x.id || 0, 10) === clientId) || {};

    if (action === 'more') {
      e.preventDefault();
      e.stopPropagation();
      _openClientMenuFor = (_openClientMenuFor === clientId) ? null : clientId;
      renderClients();
      return;
    }

    if (action === 'edit') {
      e.preventDefault();
      _openClientMenuFor = null;
      _activeClientId = clientId;
      _activeClientEmail = String(c.email || '').toLowerCase().trim();
      if (cfName) cfName.value = c.nome || '';
      if (cfEmail) cfEmail.value = c.email || '';
      if (cfPhone) cfPhone.value = c.telefone || '';
      if (cfNote) cfNote.value = c.note || '';
      if (cfPass) cfPass.value = ''; // opcional: só muda se preencher
      openClientModal({ title: 'Editar cliente' });
      renderClients();
      return;
    }

    if (action === 'remove') {
      e.preventDefault();
      _openClientMenuFor = null;
      if (!confirm('Excluir este cadastro? Isso remove também seleções e liberações vinculadas na galeria atual.')) return;
      try {
        await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/clients/${clientId}`, { method: 'DELETE', headers: HEADERS });
        await loadGallery();
        toast('Cadastro excluído.', { kind: 'ok', title: 'OK' });
      } catch (err) {
        showError(err.message || 'Erro');
      }
      return;
    }

    if (action === 'eye') {
      e.preventDefault();
      try {
        const pw = await fetchClientPassword(clientId);
        const passEl = card.querySelector('[data-pass]');
        if (passEl) passEl.textContent = pw;
      } catch (err) {
        showError(err.message || 'Erro');
      }
      return;
    }

    if (action === 'share') {
      e.preventDefault();
      _openClientMenuFor = null;
      try {
        const link = buildClientLink();
        if (shareLink) shareLink.textContent = link;
        if (shareEmail) shareEmail.textContent = c.email || '-';
        if (sharePass) sharePass.textContent = '••••••';
        openShareModal();
        const pw = await fetchClientPassword(clientId);
        if (sharePass) sharePass.textContent = pw;
        _activeClientId = clientId;
        _activeClientEmail = String(c.email || '').toLowerCase().trim();
      } catch (err) {
        showError(err.message || 'Erro');
      }
      renderClients();
      return;
    }

    if (action === 'copy') {
      e.preventDefault();
      try {
        const pw = await fetchClientPassword(clientId);
        const msg = buildWhatsMessageForClient({ email: c.email, password: pw });
        await copyToClipboard(msg);
        toast('Acesso copiado. Cole no WhatsApp.', { kind: 'ok', title: 'Copiado' });
      } catch (err) {
        showError(err.message || 'Erro');
      }
    }
  });

  cfGenPass?.addEventListener('click', (e) => {
    e.preventDefault();
    if (cfPass) cfPass.value = randomPass6();
  });

  async function resetClientPassword(clientId, senha) {
    const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/clients/${clientId}/reset-password`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ senha })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao redefinir senha');
    const plain = String(data.client_password || senha);
    _clientPwCache.set(parseInt(clientId, 10), plain);
    return plain;
  }

  clientModalClose?.addEventListener('click', closeClientModal);
  clientModalCancel?.addEventListener('click', closeClientModal);
  clientModal?.addEventListener('click', (e) => { if (e.target === clientModal) closeClientModal(); });

  clientModalSave?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const nome = (cfName?.value || '').trim();
      const email = (cfEmail?.value || '').trim().toLowerCase();
      if (!nome || !email) throw new Error('Informe nome e e-mail do cliente.');

      clientModalSave.disabled = true;

      if (_activeClientId) {
        await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/clients/${_activeClientId}`, {
          method: 'PUT',
          headers: HEADERS,
          body: JSON.stringify({
            nome,
            email,
            telefone: (cfPhone?.value || '').trim(),
            note: (cfNote?.value || '').trim(),
            enabled: true
          })
        });
        const pass = (cfPass?.value || '').trim();
        if (pass) await resetClientPassword(_activeClientId, pass);
      } else {
        const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/clients`, {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            nome,
            email,
            telefone: (cfPhone?.value || '').trim(),
            senha: (cfPass?.value || '').trim(),
            note: (cfNote?.value || '').trim()
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Erro ao criar cliente');
        if (data.client && data.client.id && data.client_password) {
          _clientPwCache.set(parseInt(data.client.id, 10), String(data.client_password));
        }
      }

      await loadGallery();
      closeClientModal();
      toast('Cliente salvo.', { kind: 'ok', title: 'Salvo' });
    } catch (err) {
      showError(err.message || 'Erro');
    } finally {
      clientModalSave.disabled = false;
    }
  });

  shareClose?.addEventListener('click', closeShareModal);
  shareModal?.addEventListener('click', (e) => { if (e.target === shareModal) closeShareModal(); });
  shareCopy?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      if (!_activeClientId) throw new Error('Selecione um cliente.');
      const pw = await fetchClientPassword(_activeClientId);
      const msg = buildWhatsMessageForClient({ email: _activeClientEmail, password: pw });
      await copyToClipboard(msg);
      toast('Copiado.', { kind: 'ok', title: 'Copiado' });
    } catch (err) {
      showError(err.message || 'Erro');
    }
  });
  shareWhats?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      if (!_activeClientId) throw new Error('Selecione um cliente.');
      const pw = await fetchClientPassword(_activeClientId);
      const msg = buildWhatsMessageForClient({ email: _activeClientEmail, password: pw });
      const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    } catch (err) {
      showError(err.message || 'Erro');
    }
  });

  saveDownloadBtn?.addEventListener('click', async () => {
    try {
      saveDownloadBtn.disabled = true;
      const layPick = document.querySelector('input[name="ks_client_folder_layout"]:checked');
      const lay = layPick && String(layPick.value || '').toLowerCase() === 'flat' ? 'flat' : 'folders';
      await savePatch({
        allow_download: !!dAllow.checked,
        client_folder_layout: lay,
        client_entry_splash_enabled: !!(clientEntrySplash && clientEntrySplash.checked)
      });
      await loadGallery();
      toast('Alterações salvas.', { kind: 'ok', title: 'Salvo' });
    } catch (e) {
      showError(e.message || 'Erro');
    } finally {
      saveDownloadBtn.disabled = false;
    }
  });

  uploadWmBtnP?.addEventListener('click', () => wmFileP?.click());
  wmFileP?.addEventListener('change', async () => {
    const f = wmFileP.files && wmFileP.files[0];
    if (!f) return;
    try {
      uploadWmBtnP.disabled = true;
      await setWatermarkLogo(f, 'portrait');
      await loadGallery();
      refreshWatermarkFilePreview().catch(() => { });
      scheduleWatermarkPreview(true);
      toast('Marca d’água (retrato) enviada.', { kind: 'ok', title: 'OK' });
    } catch (e) {
      showError(e.message || 'Erro');
    } finally {
      uploadWmBtnP.disabled = false;
      wmFileP.value = '';
    }
  });
  uploadWmBtnL?.addEventListener('click', () => wmFileL?.click());
  wmFileL?.addEventListener('change', async () => {
    const f = wmFileL.files && wmFileL.files[0];
    if (!f) return;
    try {
      uploadWmBtnL.disabled = true;
      await setWatermarkLogo(f, 'landscape');
      await loadGallery();
      refreshWatermarkFilePreview().catch(() => { });
      scheduleWatermarkPreview(true);
      toast('Marca d’água (paisagem) enviada.', { kind: 'ok', title: 'OK' });
    } catch (e) {
      showError(e.message || 'Erro');
    } finally {
      uploadWmBtnL.disabled = false;
      wmFileL.value = '';
    }
  });

  saveWmBtn?.addEventListener('click', async () => {
    try {
      saveWmBtn.disabled = true;
      const mode = getRadio('wm_mode') || 'x';
      const {
        opacity,
        scale,
        scalePortrait,
        scaleLandscape,
        rotatePortrait,
        rotateLandscape,
        logoOffsetXPortrait,
        logoOffsetYPortrait,
        logoOffsetXLandscape,
        logoOffsetYLandscape,
        stretchWPctPortrait,
        stretchHPctPortrait,
        stretchWPctLandscape,
        stretchHPctLandscape
      } = getWmParams();
      // Todos os modos funcionam com a marca d’água padrão.
      // Colunas legado (offset/esticar únicos) espelham retrato — compatível com código antigo.
      await savePatch({
        watermark_mode: mode,
        watermark_opacity: opacity,
        watermark_scale: scale,
        watermark_scale_portrait: scalePortrait,
        watermark_scale_landscape: scaleLandscape,
        watermark_rotate: rotatePortrait,
        watermark_rotate_portrait: rotatePortrait,
        watermark_rotate_landscape: rotateLandscape,
        watermark_logo_fine_rotate: 0,
        watermark_tile_angle_landscape: 0,
        watermark_tile_angle_portrait: 0,
        watermark_logo_offset_x: logoOffsetXPortrait,
        watermark_logo_offset_y: logoOffsetYPortrait,
        watermark_stretch_w_pct: stretchWPctPortrait,
        watermark_stretch_h_pct: stretchHPctPortrait,
        watermark_logo_offset_x_portrait: logoOffsetXPortrait,
        watermark_logo_offset_y_portrait: logoOffsetYPortrait,
        watermark_logo_offset_x_landscape: logoOffsetXLandscape,
        watermark_logo_offset_y_landscape: logoOffsetYLandscape,
        watermark_stretch_w_pct_portrait: stretchWPctPortrait,
        watermark_stretch_h_pct_portrait: stretchHPctPortrait,
        watermark_stretch_w_pct_landscape: stretchWPctLandscape,
        watermark_stretch_h_pct_landscape: stretchHPctLandscape
      });
      await loadGallery();
      scheduleWatermarkPreview(true);
      toast('Configurações salvas.', { kind: 'ok', title: 'Salvo' });
    } catch (e) {
      showError(e.message || 'Erro');
    } finally {
      saveWmBtn.disabled = false;
    }
  });

  removeWmLogoBtn?.addEventListener('click', async () => {
    try {
      if (!confirm('Remover a marca d’água personalizada desta galeria?')) return;
      removeWmLogoBtn.disabled = true;
      // remove arquivo e volta para o padrão completo
      const out = await savePatch({
        watermark_path: null,
        watermark_path_portrait: null,
        watermark_path_landscape: null,
        watermark_mode: 'tile_dense'
      });
      await loadGallery();
      normalizeGalleryWatermarkPaths(gallery);
      await refreshWatermarkFilePreview();
      const cf = out && out.cloudflare_watermark;
      if (cf && cf.attempted) {
        toast(cf.deleted ? 'Marca d’água removida (Cloudflare: ok).' : 'Marca d’água removida (Cloudflare: não foi possível deletar).', { kind: cf.deleted ? 'ok' : 'warn', title: 'Marca d’água' });
      } else {
        toast('Marca d’água removida.', { kind: 'ok', title: 'Marca d’água' });
      }
      scheduleWatermarkPreview(true);
    } catch (e) {
      showError(e?.message || 'Erro');
    } finally {
      removeWmLogoBtn.disabled = false;
    }
  });

  const btnCleanupDry = document.getElementById('btn-cleanup-r2-dry');
  const btnCleanupR2 = document.getElementById('btn-cleanup-r2');
  const doCleanupR2 = async (dryRun) => {
    try {
      if (btnCleanupDry) btnCleanupDry.disabled = true;
      if (btnCleanupR2) btnCleanupR2.disabled = true;
      const res = await fetch(`${API_URL}/api/king-selection/cleanup-r2`, {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun, confirm: dryRun ? '' : 'SIM' })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro');
      if (dryRun) {
        toast(`Encontrados ${data.orphans || 0} arquivo(s) órfão(s) no R2. Use "Limpar R2" para remover.`, { kind: 'ok', title: 'Verificação' });
      } else {
        toast(`${data.deleted || 0} arquivo(s) removido(s) do R2.`, { kind: 'ok', title: 'Limpeza' });
      }
    } catch (e) {
      showError(e?.message || 'Erro');
      toast(e?.message || 'Erro', { kind: 'err', title: 'Erro' });
    } finally {
      if (btnCleanupDry) btnCleanupDry.disabled = false;
      if (btnCleanupR2) btnCleanupR2.disabled = false;
    }
  };
  btnCleanupDry?.addEventListener('click', () => doCleanupR2(true));
  btnCleanupR2?.addEventListener('click', async () => {
    if (!confirm('Remover do R2 todos os arquivos que não estão referenciados em nenhum projeto? Esta ação não pode ser desfeita.')) return;
    await doCleanupR2(false);
  });

  // Preview em tempo real
  wmOpacity?.addEventListener('input', scheduleWatermarkPreview);
  wmScaleP?.addEventListener('input', scheduleWatermarkPreview);
  wmScaleL?.addEventListener('input', scheduleWatermarkPreview);
  document.querySelectorAll('[data-wm-rotate-p]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = parseInt(btn.getAttribute('data-wm-rotate-p') || '0', 10) || 0;
      const rot = [0, 90, 180, 270].includes(v) ? v : 0;
      wmRotatePortraitDeg = rot;
      if (wmRotateP) wmRotateP.value = String(rot);
      updateWmRotateButtonsP();
      setWmRotateLabels(rot, wmRotateLandscapeDeg);
      scheduleWatermarkPreview();
    });
  });
  document.querySelectorAll('[data-wm-rotate-l]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = parseInt(btn.getAttribute('data-wm-rotate-l') || '0', 10) || 0;
      const rot = [0, 90, 180, 270].includes(v) ? v : 0;
      wmRotateLandscapeDeg = rot;
      if (wmRotateL) wmRotateL.value = String(rot);
      updateWmRotateButtonsL();
      setWmRotateLabels(wmRotatePortraitDeg, rot);
      scheduleWatermarkPreview();
    });
  });

  function nudgeWmLogoOffsetPortrait(dx, dy) {
    wmLogoOffsetXPctPortrait = clamp(parseFloat(String(wmLogoOffsetXPctPortrait)) + dx, -50, 50);
    wmLogoOffsetYPctPortrait = clamp(parseFloat(String(wmLogoOffsetYPctPortrait)) + dy, -50, 50);
    setWmOffsetLabelsPortrait(wmLogoOffsetXPctPortrait, wmLogoOffsetYPctPortrait);
    scheduleWatermarkPreview();
  }
  function nudgeWmLogoOffsetLandscape(dx, dy) {
    wmLogoOffsetXPctLandscape = clamp(parseFloat(String(wmLogoOffsetXPctLandscape)) + dx, -50, 50);
    wmLogoOffsetYPctLandscape = clamp(parseFloat(String(wmLogoOffsetYPctLandscape)) + dy, -50, 50);
    setWmOffsetLabelsLandscape(wmLogoOffsetXPctLandscape, wmLogoOffsetYPctLandscape);
    scheduleWatermarkPreview();
  }
  btnWmOffsetLeftP?.addEventListener('click', () => nudgeWmLogoOffsetPortrait(-3, 0));
  btnWmOffsetRightP?.addEventListener('click', () => nudgeWmLogoOffsetPortrait(3, 0));
  btnWmOffsetUpP?.addEventListener('click', () => nudgeWmLogoOffsetPortrait(0, -3));
  btnWmOffsetDownP?.addEventListener('click', () => nudgeWmLogoOffsetPortrait(0, 3));
  btnWmOffsetLeftL?.addEventListener('click', () => nudgeWmLogoOffsetLandscape(-3, 0));
  btnWmOffsetRightL?.addEventListener('click', () => nudgeWmLogoOffsetLandscape(3, 0));
  btnWmOffsetUpL?.addEventListener('click', () => nudgeWmLogoOffsetLandscape(0, -3));
  btnWmOffsetDownL?.addEventListener('click', () => nudgeWmLogoOffsetLandscape(0, 3));
  btnWmAlignTopP?.addEventListener('click', () => {
    wmLogoOffsetYPctPortrait = -50;
    setWmOffsetLabelsPortrait(wmLogoOffsetXPctPortrait, wmLogoOffsetYPctPortrait);
    scheduleWatermarkPreview();
  });
  btnWmAlignCenterVP?.addEventListener('click', () => {
    wmLogoOffsetYPctPortrait = 0;
    setWmOffsetLabelsPortrait(wmLogoOffsetXPctPortrait, wmLogoOffsetYPctPortrait);
    scheduleWatermarkPreview();
  });
  btnWmAlignBottomP?.addEventListener('click', () => {
    wmLogoOffsetYPctPortrait = 50;
    setWmOffsetLabelsPortrait(wmLogoOffsetXPctPortrait, wmLogoOffsetYPctPortrait);
    scheduleWatermarkPreview();
  });
  btnWmAlignLeftL?.addEventListener('click', () => {
    wmLogoOffsetXPctLandscape = -50;
    setWmOffsetLabelsLandscape(wmLogoOffsetXPctLandscape, wmLogoOffsetYPctLandscape);
    scheduleWatermarkPreview();
  });
  btnWmAlignCenterHL?.addEventListener('click', () => {
    wmLogoOffsetXPctLandscape = 0;
    setWmOffsetLabelsLandscape(wmLogoOffsetXPctLandscape, wmLogoOffsetYPctLandscape);
    scheduleWatermarkPreview();
  });
  btnWmAlignRightL?.addEventListener('click', () => {
    wmLogoOffsetXPctLandscape = 50;
    setWmOffsetLabelsLandscape(wmLogoOffsetXPctLandscape, wmLogoOffsetYPctLandscape);
    scheduleWatermarkPreview();
  });
  wmStretchWP?.addEventListener('input', () => {
    wmStretchWPctPortrait = clamp(parseInt(wmStretchWP.value, 10), 50, 400);
    setWmStretchLabelsPortrait(wmStretchWPctPortrait, wmStretchHPctPortrait);
    scheduleWatermarkPreview();
  });
  wmStretchHP?.addEventListener('input', () => {
    wmStretchHPctPortrait = clamp(parseInt(wmStretchHP.value, 10), 50, 400);
    setWmStretchLabelsPortrait(wmStretchWPctPortrait, wmStretchHPctPortrait);
    scheduleWatermarkPreview();
  });
  wmStretchWL?.addEventListener('input', () => {
    wmStretchWPctLandscape = clamp(parseInt(wmStretchWL.value, 10), 50, 400);
    setWmStretchLabelsLandscape(wmStretchWPctLandscape, wmStretchHPctLandscape);
    scheduleWatermarkPreview();
  });
  wmStretchHL?.addEventListener('input', () => {
    wmStretchHPctLandscape = clamp(parseInt(wmStretchHL.value, 10), 50, 400);
    setWmStretchLabelsLandscape(wmStretchWPctLandscape, wmStretchHPctLandscape);
    scheduleWatermarkPreview();
  });
  Array.from(document.querySelectorAll('input[name="wm_mode"]')).forEach(r => {
    r.addEventListener('change', scheduleWatermarkPreview);
  });

  // Clicar na porcentagem (opacidade/tamanho) para digitar o valor
  function makeWmPctEditable(labelEl, min, max, getCurrent, setValue, kind) {
    if (!labelEl) return;
    labelEl.style.cursor = 'pointer';
    labelEl.title = `Clique para digitar o valor (${min}-${max}%)`;
    labelEl.addEventListener('click', function onLabelClick() {
      if (labelEl.querySelector('input')) return;
      const cur = getCurrent();
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.min = min;
      inp.max = max;
      inp.value = cur;
      inp.className = 'w-14 text-right text-xs font-extrabold bg-slate-100 border border-slate-300 rounded px-1 py-0.5';
      const commit = () => {
        const n = clamp(parseInt(inp.value, 10), min, max);
        if (Number.isNaN(n)) return;
        setValue(n);
        setWmValueLabels({
          opPct: kind === 'opacity' ? n : wmOpacityPct,
          scPPct: kind === 'scaleP' ? n : wmScalePortraitPct,
          scLPct: kind === 'scaleL' ? n : wmScaleLandscapePct
        });
        inp.remove();
        labelEl.textContent = `${n}%`;
        labelEl.style.display = '';
        scheduleWatermarkPreview();
      };
      inp.addEventListener('blur', commit);
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
      labelEl.textContent = '';
      labelEl.style.display = 'inline-block';
      labelEl.appendChild(inp);
      inp.focus();
      inp.select();
    });
  }
  makeWmPctEditable(wmOpacityVal, 0, 100, () => parseInt(wmOpacity?.value || wmOpacityPct, 10), (n) => {
    wmOpacityPct = n;
    if (wmOpacity) wmOpacity.value = String(n);
  }, 'opacity');
  makeWmPctEditable(wmScalePVal, 10, 500, () => parseInt(wmScaleP?.value || wmScalePortraitPct, 10), (n) => {
    wmScalePortraitPct = n;
    if (wmScaleP) wmScaleP.value = String(n);
  }, 'scaleP');
  makeWmPctEditable(wmScaleLVal, 10, 500, () => parseInt(wmScaleL?.value || wmScaleLandscapePct, 10), (n) => {
    wmScaleLandscapePct = n;
    if (wmScaleL) wmScaleL.value = String(n);
  }, 'scaleL');

  /** Preencher: esticar forte para “cobrir” a área (largura+altura do ladrilho). Ajustar: proporção neutra. */
  const WM_FILL_STRETCH_PCT = 380;

  async function applyWmSuggestFit(column, mode) {
    const m = mode === 'fit' ? 'fit' : 'fill';
    const col = column === 'landscape' ? 'landscape' : 'portrait';
    try {
      if (!galleryId) throw new Error('URL sem galleryId. Abra o projeto com ?galleryId=…');
      const res = await fetch(
        `${API_URL}/api/king-selection/galleries/${galleryId}/watermark-suggest-scales?mode=${encodeURIComponent(m)}`,
        { headers: HEADERS }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao calcular');
      const sp = clamp(Math.round((parseFloat(data.watermark_scale_portrait) || 1) * 100), 10, 500);
      const sl = clamp(Math.round((parseFloat(data.watermark_scale_landscape) || 1) * 100), 10, 500);
      if (col === 'portrait') {
        wmScalePortraitPct = sp;
        if (wmScaleP) wmScaleP.value = String(sp);
      } else {
        wmScaleLandscapePct = sl;
        if (wmScaleL) wmScaleL.value = String(sl);
      }
      if (m === 'fill') {
        if (col === 'portrait') {
          wmStretchWPctPortrait = WM_FILL_STRETCH_PCT;
          wmStretchHPctPortrait = WM_FILL_STRETCH_PCT;
          if (wmStretchWP) wmStretchWP.value = String(wmStretchWPctPortrait);
          if (wmStretchHP) wmStretchHP.value = String(wmStretchHPctPortrait);
          wmLogoOffsetXPctPortrait = 0;
          wmLogoOffsetYPctPortrait = 0;
          setWmStretchLabelsPortrait(wmStretchWPctPortrait, wmStretchHPctPortrait);
          setWmOffsetLabelsPortrait(0, 0);
        } else {
          wmStretchWPctLandscape = WM_FILL_STRETCH_PCT;
          wmStretchHPctLandscape = WM_FILL_STRETCH_PCT;
          if (wmStretchWL) wmStretchWL.value = String(wmStretchWPctLandscape);
          if (wmStretchHL) wmStretchHL.value = String(wmStretchHPctLandscape);
          wmLogoOffsetXPctLandscape = 0;
          wmLogoOffsetYPctLandscape = 0;
          setWmStretchLabelsLandscape(wmStretchWPctLandscape, wmStretchHPctLandscape);
          setWmOffsetLabelsLandscape(0, 0);
        }
      } else if (col === 'portrait') {
        wmStretchWPctPortrait = 100;
        wmStretchHPctPortrait = 100;
        if (wmStretchWP) wmStretchWP.value = '100';
        if (wmStretchHP) wmStretchHP.value = '100';
        wmLogoOffsetXPctPortrait = 0;
        wmLogoOffsetYPctPortrait = 0;
        setWmStretchLabelsPortrait(100, 100);
        setWmOffsetLabelsPortrait(0, 0);
      } else {
        wmStretchWPctLandscape = 100;
        wmStretchHPctLandscape = 100;
        if (wmStretchWL) wmStretchWL.value = '100';
        if (wmStretchHL) wmStretchHL.value = '100';
        wmLogoOffsetXPctLandscape = 0;
        wmLogoOffsetYPctLandscape = 0;
        setWmStretchLabelsLandscape(100, 100);
        setWmOffsetLabelsLandscape(0, 0);
      }
      setWmValueLabels({ opPct: wmOpacityPct, scPPct: wmScalePortraitPct, scLPct: wmScaleLandscapePct });
      scheduleWatermarkPreview(true);
      const modePt = m === 'fill' ? 'Preencher' : 'Ajustar';
      const extra =
        m === 'fill'
          ? ' (escala + esticar + centro)'
          : ' (escala + ajuste proporcional + centro)';
      toast(`${modePt} no ${col === 'portrait' ? 'retrato' : 'paisagem'}${extra}. Salve para persistir.`, { kind: 'ok', title: 'Marca d’água' });
    } catch (e) {
      showError(e?.message || 'Erro');
    }
  }

  btnWmFillP?.addEventListener('click', () => applyWmSuggestFit('portrait', 'fill'));
  btnWmFitP?.addEventListener('click', () => applyWmSuggestFit('portrait', 'fit'));
  btnWmFillL?.addEventListener('click', () => applyWmSuggestFit('landscape', 'fill'));
  btnWmFitL?.addEventListener('click', () => applyWmSuggestFit('landscape', 'fit'));

  // Upload manager estilo Alboom (fila + paralelo)
  const uploadState = {
    running: false,
    cancelled: false,
    minConcurrency: 6,
    maxConcurrency: 20,
    // Começa “turbo” e ajusta sozinho (desce se der 429/timeout, sobe quando estabilizar).
    concurrency: 20,
    // Gap dinâmico do /api/upload/auth (ms). Começa agressivo e ajusta sozinho se vier 429.
    // (turbo, mas com piso no authUpload para não zerar)
    authMinGapMs: 120,
    authMaxGapMs: 1500,
    last429At: 0,
    // Upload em LOTES (evita travar a UI e reduz “tempestade” de ações)
    // Ex.: selecionou 1000 fotos → processa 100 por vez.
    batchSize: 100,
    pendingBatches: [], // File[][]
    batchIndex: 0,
    batchTotal: 0,
    queue: [],
    active: new Map(), // id -> { file, rowEl, controller, loaded }
    totalBytes: 0,
    doneBytes: 0,
    startAt: 0,
    // Amostras para calcular velocidade real (janela móvel) e evitar “média baixa” após travar.
    speedSamples: [], // [{ t, bytes }]
    ok: 0,
    errors: []
  };

  // ============================================================
  // Duplicatas (por nome/base do arquivo) - escolha do usuário
  // ============================================================
  let _pendingFiles = null; // { list, duplicates, mapExisting, total }
  function normalizeFileKey(name) {
    let s = String(name || '').trim();
    s = s.replace(/^.*[\\/]/, ''); // remove caminho
    const dot = s.lastIndexOf('.');
    if (dot > 0) s = s.slice(0, dot);
    return s.toUpperCase().replace(/\s+/g, ' ').trim();
  }
  function normalizeFolderNameKey(name) {
    const raw = String(name || '').trim().replace(/\s+/g, ' ');
    if (!raw) return '';
    if (/^\d+$/.test(raw)) return String(parseInt(raw, 10) || 0);
    return raw.toLowerCase();
  }
  function buildDupKey(fileName, folderId) {
    const nameKey = normalizeFileKey(fileName);
    if (!nameKey) return '';
    const fid = toPosInt(folderId) || 0;
    return `${nameKey}::${fid}`;
  }
  function buildExistingMap() {
    const map = new Map(); // key(name+folder) -> photoId
    const photos = Array.isArray(gallery?.photos) ? gallery.photos : [];
    for (const p of photos) {
      const k = buildDupKey(p?.original_name || '', p?.folder_id);
      if (!k) continue;
      if (!map.has(k)) map.set(k, p.id);
    }
    return map;
  }

  async function replaceExistingPhoto(photoId, file) {
    // Upload via Worker ou proxy (R2 somente)
    let key, receipt;
    try {
      const token = await getKsWorkerToken();
      const out = await uploadToWorker(file, { token });
      key = out?.key; receipt = out?.receipt;
    } catch (_) {
      await uploadToR2ProxyForReplace(photoId, file);
      return;
    }
    if (!key || !receipt) throw new Error('Falha no upload (Worker)');
    const res = await fetchWithTimeout(`${API_URL}/api/king-selection/photos/${photoId}/replace-r2`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ key, receipt, original_name: file.name || 'foto' })
    }, 35000);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao substituir foto');
  }

  function updateUploadMeta() {
    const inNow = uploadState.queue.length + uploadState.active.size;
    const pending = Array.isArray(uploadState.pendingBatches)
      ? uploadState.pendingBatches.reduce((acc, b) => acc + (Array.isArray(b) ? b.length : 0), 0)
      : 0;
    if (upListMeta) {
      upListMeta.textContent = pending
        ? `${inNow} agora • ${pending} pendente(s)`
        : `${inNow} arquivo(s) na fila`;
    }
  }

  function overallLoadedBytes() {
    let activeLoaded = 0;
    for (const [, v] of uploadState.active.entries()) activeLoaded += Math.min(v.loaded || 0, v.file.size || 0);
    return uploadState.doneBytes + activeLoaded;
  }

  let _lastUpdateOverall = 0;
  const UPDATE_OVERALL_THROTTLE_MS = 280;
  function updateOverallUi(overrideLine) {
    const now = Date.now();
    if (now - _lastUpdateOverall < UPDATE_OVERALL_THROTTLE_MS && !overrideLine) return;
    _lastUpdateOverall = now;
    const total = uploadState.totalBytes || 1;
    const done = overallLoadedBytes();
    // Velocidade por janela móvel (últimos ~10s), para não ficar “baixa” se travou no começo.
    uploadState.speedSamples = Array.isArray(uploadState.speedSamples) ? uploadState.speedSamples : [];
    uploadState.speedSamples.push({ t: now, bytes: done });
    // manter só últimos 12s
    uploadState.speedSamples = uploadState.speedSamples.filter(s => (now - s.t) <= 12000);
    const first = uploadState.speedSamples[0] || { t: now, bytes: done };
    const last = uploadState.speedSamples[uploadState.speedSamples.length - 1] || { t: now, bytes: done };
    const winSec = Math.max(0.15, (last.t - first.t) / 1000);
    let speed = Math.max(0, (last.bytes - first.bytes) / winSec);
    if (uploadState._speedEma == null) uploadState._speedEma = speed;
    uploadState._speedEma = 0.25 * speed + 0.75 * uploadState._speedEma;
    speed = uploadState._speedEma;
    const pct = (done / total) * 100;
    const eta = (total - done) / Math.max(1, speed);
    const bTotal = uploadState.batchTotal || 0;
    const bIndex = uploadState.batchIndex || 0;
    const batchInfo = bTotal > 1 ? `  •  Lote ${Math.min(bIndex + 1, bTotal)}/${bTotal}` : '';
    const etaTxt = (done > 256 * 1024 && speed > 8192 && winSec >= 2) ? formatEta(eta) : '--:--';
    const meta = `${pct.toFixed(0)}%  •  ${formatMbPerSec(speed)}  •  ETA ${etaTxt}${batchInfo}`;
    const pending = Array.isArray(uploadState.pendingBatches)
      ? uploadState.pendingBatches.reduce((acc, b) => acc + (Array.isArray(b) ? b.length : 0), 0)
      : 0;
    const totalCount = Math.max(1, uploadState.ok + uploadState.errors.length + uploadState.active.size + uploadState.queue.length + pending);
    const completed = uploadState.ok + uploadState.errors.length;
    const line = overrideLine || `Enviadas ${completed} de ${totalCount}${uploadState.active.size > 0 ? `  •  ${uploadState.active.size} em andamento` : ''}`;
    setUploadUi({ active: uploadState.running, line, file: undefined, pct, meta });
  }

  function splitIntoBatches(list, size) {
    const n = Math.max(1, parseInt(size || 0, 10) || 1);
    const out = [];
    for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
    return out;
  }

  async function startNextBatchIfNeeded() {
    if (uploadState.cancelled) return;
    if (!Array.isArray(uploadState.pendingBatches) || !uploadState.pendingBatches.length) return;
    if (uploadState.queue.length || uploadState.active.size) return;

    const batch = uploadState.pendingBatches.shift();
    if (!batch || !batch.length) return;

    uploadState.running = true;
    uploadState.batchIndex = Math.min(uploadState.batchIndex || 0, (uploadState.batchTotal || 1) - 1);
    const baseTotal = uploadState.ok + uploadState.errors.length;

    const toQueue = [];
    batch.forEach((entry, idx) => {
      const file = entry?.file || entry;
      const folderId = toPosInt(entry?.folderId);
      if (!file) return;
      const id = `u_${Date.now()}_${Math.random().toString(16).slice(2)}_${idx}`;
      const rowEl = createUploadRow({ id, file });
      const controller = new AbortController();
      rowEl?.addEventListener('click', (e) => {
        const btn = e.target?.getAttribute && e.target.getAttribute('data-up-cancel');
        if (btn && btn === id) {
          try { controller.abort(); } catch (_) { }
          markRowError(rowEl, 'Cancelado');
        }
      });
      toQueue.push({ id, file, folderId, rowEl, controller, loaded: 0 });
    });

    // 1) Presign (mais rápido: PUT direto do navegador pro R2). 2) Worker. 3) Proxy.
    let mode = 'worker';
    try {
      updateOverallUi('Preparando uploads (R2)…', batch[0]?.name || 'foto');
      const map = await presignBatchForR2(toQueue.map(x => ({ id: x.id, file: x.file })));
      toQueue.forEach(x => { x.presigned = map.get(String(x.id)) || null; });
      if (toQueue.some(x => x.presigned?.uploadUrl)) mode = 'presign';
    } catch (_) { }
    if (mode !== 'presign') {
      try {
        await getKsWorkerToken();
      } catch (e) {
        const msg = (e && e.message) ? String(e.message) : 'Não foi possível conectar ao R2.';
        showError(msg);
        uploadState.running = false;
        setUploadUi({ active: false });
        batch.forEach((_, idx) => { const row = toQueue[idx]?.rowEl; if (row) markRowError(row, msg); });
        toast(msg, { kind: 'err', title: 'Erro no upload' });
        return;
      }
    }
    uploadState._uploadMode = mode;
    toQueue.forEach(x => uploadState.queue.push(x));

    updateUploadMeta();
    updateOverallUi(`Enviando • ${baseTotal + 1}/${baseTotal + batch.length}`, batch[0]?.name || 'foto');
    pumpUploads();
  }

  function cancelAllUploads() {
    uploadState.cancelled = true;
    uploadState.queue = [];
    uploadState.pendingBatches = [];
    uploadState.speedSamples = [];
    uploadState._speedEma = null;
    for (const [, v] of uploadState.active.entries()) {
      try { v.controller.abort(); } catch (_) { }
      markRowError(v.rowEl, 'Cancelado');
    }
    uploadState.active.clear();
    uploadState.running = false;
    updateUploadMeta();
    updateOverallUi('Cancelado', '');
    setUploadUi({ active: false });
  }

  bubbleCancel?.addEventListener('click', () => cancelAllUploads());
  uploadCancel?.addEventListener('click', () => cancelAllUploads());

  let _dupeNewObjUrl = null;
  let _dupeSelectedIdx = 0;

  function clearDupeNewPreview() {
    if (_dupeNewObjUrl) {
      try { URL.revokeObjectURL(_dupeNewObjUrl); } catch (_) { }
    }
    _dupeNewObjUrl = null;
  }

  async function renderDupePreview(idx) {
    const p = _pendingFiles;
    if (!p) return;
    const dups = Array.isArray(p.duplicates) ? p.duplicates : [];
    const it = dups[idx] || dups[0];
    if (!it) return;
    _dupeSelectedIdx = Math.max(0, idx);

    // nomes
    if (dupeOldName) dupeOldName.textContent = it.photoId ? (it.key || it.name || '-') : '(não existe na galeria)';
    if (dupeNewName) dupeNewName.textContent = it.name || '-';

    // preview da nova (File)
    clearDupeNewPreview();
    if (dupeImgNew) {
      try {
        _dupeNewObjUrl = URL.createObjectURL(it.file);
        dupeImgNew.src = _dupeNewObjUrl;
      } catch (_) {
        dupeImgNew.removeAttribute('src');
      }
    }

    // preview da atual (na galeria)
    if (dupeImgOld) {
      if (it.photoId) {
        dupeImgOld.setAttribute('data-photo-id', String(it.photoId));
        // preview admin (sem marca para comparar melhor)
        const url = `${API_URL}/api/king-selection/photos/${it.photoId}/preview?wm_mode=none&max=720`;
        await setImgPreview(dupeImgOld, { url, photoId: it.photoId }).catch(() => { });
      } else {
        dupeImgOld.removeAttribute('src');
      }
    }

    // destacar item selecionado
    if (dupeList) {
      Array.from(dupeList.querySelectorAll('[data-dupe-idx]')).forEach(el => {
        const n = parseInt(el.getAttribute('data-dupe-idx') || '0', 10);
        el.style.background = (n === _dupeSelectedIdx) ? 'rgba(250,204,21,.10)' : 'transparent';
        el.style.borderColor = (n === _dupeSelectedIdx) ? 'rgba(250,204,21,.25)' : 'transparent';
      });
    }
  }

  const KS_DUPE_LIST_MAX = 400;

  function openDupeModal({ duplicates, total }) {
    if (!dupeOv) return;
    const dups = Array.isArray(duplicates) ? duplicates : [];
    if (dupeHint) dupeHint.textContent = `Encontramos ${dups.length} foto(s) repetida(s) de ${total} selecionada(s). O que você quer fazer?`;
    if (dupeList) {
      const cap = Math.min(dups.length, KS_DUPE_LIST_MAX);
      const rest = dups.length - cap;
      const rows = dups.slice(0, cap).map((d, i) => `
        <div data-dupe-idx="${i}" style="cursor:pointer;border:1px solid transparent;border-radius:12px;margin:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${escapeHtml(d.name || '')}
        </div>
      `).join('');
      const more = rest > 0
        ? `<div class="ks-dupe-list-more" style="padding:10px 12px;font-size:11px;color:rgba(255,255,255,.45);border-top:1px solid rgba(255,255,255,.08)">… e mais ${rest} (lista limitada a ${KS_DUPE_LIST_MAX} para o painel ficar rápido; total ${dups.length})</div>`
        : '';
      dupeList.innerHTML = (rows || '<div>(sem detalhes)</div>') + more;
    }
    dupeOv.classList.remove('hidden');
    dupeOv.setAttribute('aria-hidden', 'false');
    // preview inicial
    setTimeout(() => { renderDupePreview(0).catch(() => { }); }, 0);
  }
  function closeDupeModal() {
    if (!dupeOv) return;
    dupeOv.classList.add('hidden');
    dupeOv.setAttribute('aria-hidden', 'true');
    clearDupeNewPreview();
  }
  dupeClose?.addEventListener('click', closeDupeModal);
  dupeOv?.addEventListener('click', (e) => { if (e.target === dupeOv) closeDupeModal(); });
  dupeList?.addEventListener('click', (e) => {
    const el = e.target?.closest && e.target.closest('[data-dupe-idx]');
    if (!el) return;
    const idx = parseInt(el.getAttribute('data-dupe-idx') || '0', 10) || 0;
    renderDupePreview(idx).catch(() => { });
  });

  async function processOne(id, itemIndex, totalCount) {
    const v = uploadState.active.get(id);
    if (!v) return;
    const f = v.file;
    const folderIdForUpload = toPosInt(v.folderId) || getUploadFolderId();

    // 1) Presign (PUT direto pro R2 — mais rápido). 2) Worker. 3) Proxy.
    if (uploadState._uploadMode === 'presign' && v.presigned?.uploadUrl && v.presigned?.key) {
      try {
        setRowProgress(v.rowEl, 0, 'Enviando direto pro R2...');
        await uploadToR2WithRetry(v.presigned.uploadUrl, f, {
          signal: v.controller.signal,
          contentType: f.type || 'application/octet-stream',
          cacheControl: 'public, max-age=31536000, immutable',
          onProgress: ({ loaded, total }) => {
            v.loaded = loaded || 0;
            const pct = total ? (Math.min(loaded || 0, total) / total) * 100 : (Math.min(loaded || 0, f.size || 1) / (f.size || 1)) * 100;
            setRowProgress(v.rowEl, pct, `Enviando... ${pct.toFixed(0)}%`);
            updateOverallUi();
          }
        });
        setRowProgress(v.rowEl, 100, 'Salvando...');
        const photos = await savePhotosToDbBatch([{ key: v.presigned.key, name: f.name || 'foto', order: 0, folder_id: folderIdForUpload || null }]);
        const photo = photos?.[0];
        if (photo && gallery?.photos) {
          gallery.photos.push({ ...photo, is_favorite: !!photo.is_favorite, is_cover: !!photo.is_cover });
          scheduleRenderPhotos();
        }
        return;
      } catch (_) {
        uploadState._uploadMode = 'worker';
      }
    }

    try {
      setRowProgress(v.rowEl, 0, 'Enviando para R2...');
      const out = await uploadToWorkerWithRetry(f, {
        signal: v.controller.signal,
        onProgress: ({ loaded, total }) => {
          v.loaded = loaded || 0;
          const pct = total ? (Math.min(loaded || 0, total) / total) * 100 : (Math.min(loaded || 0, f.size || 1) / (f.size || 1)) * 100;
          setRowProgress(v.rowEl, pct, `Enviando... ${pct.toFixed(0)}%`);
          updateOverallUi();
        }
      });
      const key = out && out.key ? String(out.key) : '';
      const receipt = out && out.receipt ? String(out.receipt) : '';
      if (!key || !receipt) throw new Error('Falha no upload (Worker R2): resposta inválida');
      setRowProgress(v.rowEl, 100, 'Salvando na galeria...');
      const photo = await commitWorkerUpload({ key, receipt, originalName: f.name || 'foto', folderId: folderIdForUpload || null });
      if (photo && gallery && Array.isArray(gallery.photos)) {
        gallery.photos.push({ ...photo, is_favorite: !!photo.is_favorite, is_cover: !!photo.is_cover });
        scheduleRenderPhotos();
      }
      return;
    } catch (_) { }

    // Fallback: proxy via servidor (também grava no R2)
    setRowProgress(v.rowEl, 0, 'Enviando via servidor (R2)...');
    const proxyOut = await uploadToR2ProxyWithRetry(f, {
      signal: v.controller.signal,
      folderId: folderIdForUpload || null,
      onProgress: ({ loaded, total }) => {
        v.loaded = loaded || 0;
        const pct = total ? (Math.min(loaded || 0, total) / total) * 100 : (Math.min(loaded || 0, f.size || 1) / (f.size || 1)) * 100;
        setRowProgress(v.rowEl, pct, `Enviando... ${pct.toFixed(0)}%`);
        updateOverallUi();
      }
    });
    const photo = proxyOut && proxyOut.photo ? proxyOut.photo : null;
    if (photo && gallery && Array.isArray(gallery.photos)) {
      gallery.photos.push({ ...photo, is_favorite: !!photo.is_favorite, is_cover: !!photo.is_cover });
      scheduleRenderPhotos();
    }
  }

  async function pumpUploads() {
    if (uploadState.cancelled) return;
    if (!uploadState.running) return;
    updateUploadMeta();

    const pendingCount = Array.isArray(uploadState.pendingBatches)
      ? uploadState.pendingBatches.reduce((acc, b) => acc + (Array.isArray(b) ? b.length : 0), 0)
      : 0;
    const totalCount = uploadState.queue.length + uploadState.active.size + uploadState.ok + uploadState.errors.length + pendingCount;
    while (!uploadState.cancelled && uploadState.active.size < uploadState.concurrency && uploadState.queue.length) {
      const next = uploadState.queue.shift();
      const id = next.id;
      uploadState.active.set(id, next);
      updateUploadMeta();
      // eslint-disable-next-line no-void
      void (async () => {
        const itemIndex = uploadState.ok + uploadState.errors.length + 1;
        try {
          await processOne(id, itemIndex, totalCount);
          uploadState.ok += 1;
          markRowDone(next.rowEl);
        } catch (e) {
          const msg = e?.message ? String(e.message) : 'Erro no upload';
          uploadState.errors.push(`${next.file.name || 'arquivo'}: ${msg}`);
          markRowError(next.rowEl, msg);
        } finally {
          uploadState.doneBytes += (next.file.size || 0);
          uploadState.active.delete(id);
          updateOverallUi();
          // eslint-disable-next-line no-await-in-loop
          await sleep(40); // respiro leve (mais rápido)
          pumpUploads();
        }
      })();
    }

    if (!uploadState.queue.length && uploadState.active.size === 0) {
      // Se ainda há lotes pendentes, sincroniza e inicia o próximo lote
      if (Array.isArray(uploadState.pendingBatches) && uploadState.pendingBatches.length) {
        uploadState.batchIndex = (uploadState.batchIndex || 0) + 1;
        updateOverallUi(`Preparando próximo lote...`, '');
        // Não recarregar a galeria entre lotes (economiza requests e deixa o upload mais rápido).
        // A sincronização final ainda acontece ao terminar tudo.
        // eslint-disable-next-line no-await-in-loop
        await sleep(120);
        // eslint-disable-next-line no-void
        void startNextBatchIfNeeded();
        return;
      }

      uploadState.running = false;
      setBubbleDone();
      if (uploadState.errors.length) {
        showError(`Algumas fotos falharam:\n- ${uploadState.errors.slice(0, 10).join('\n- ')}${uploadState.errors.length > 10 ? `\n... (+${uploadState.errors.length - 10})` : ''}`);
      }
      toast(`${uploadState.ok} foto(s) adicionada(s)${uploadState.errors.length ? ` (falharam: ${uploadState.errors.length})` : ''}.`, { kind: uploadState.errors.length ? 'warn' : 'ok', title: 'Upload' });
      // sincronizar com servidor no final
      try {
        await loadGallery();
        // [AUTO] Se reconhecimento facial estiver habilitado, disparar processamento automático das novas fotos
        if (fFaceEnabled && fFaceEnabled.checked) {
          console.log('[AUTO-FACIAL] Disparando processamento automático...');
          processFacialAll({ silent: true }).catch(err => console.error('[AUTO-FACIAL] Erro:', err));
        }
      } catch (_) { }
    }
  }

  function enqueueFiles(files, { skipDupeCheck } = {}) {
    const entries = Array.from(files || [])
      .map((item) => {
        if (!item) return null;
        if (item.file) return { file: item.file, folderId: toPosInt(item.folderId) || null };
        return { file: item, folderId: null };
      })
      .filter((x) => x && x.file);
    if (!entries.length) return;
    hideError();

    // Detectar repetidas (por nome/base) vs fotos já existentes e vs a própria seleção
    if (!skipDupeCheck) {
      const existingMap = buildExistingMap();
      const seenInBatch = new Set();
      const duplicates = [];
      const uniqueList = [];
      for (const entry of entries) {
        const f = entry.file;
        const key = normalizeFileKey(f?.name || '');
        const targetFolderId = toPosInt(entry.folderId) || getUploadFolderId() || 0;
        const batchKey = key ? `${key}::${targetFolderId}` : '';
        const alreadyInGallery = !!(batchKey && existingMap.has(batchKey));
        const alreadyInBatch = !!(batchKey && seenInBatch.has(batchKey));
        if (key) seenInBatch.add(batchKey);
        if (alreadyInGallery || alreadyInBatch) {
          duplicates.push({
            name: f.name,
            key,
            photoId: batchKey ? (existingMap.get(batchKey) || null) : null,
            inGallery: !!alreadyInGallery,
            inBatch: !!alreadyInBatch,
            file: f,
            folderId: targetFolderId || null
          });
        } else {
          uniqueList.push(entry);
        }
      }
      if (duplicates.length) {
        _pendingFiles = { list: entries, duplicates, existingMap, total: entries.length, uniqueList };
        openDupeModal({ duplicates, total: entries.length });
        return;
      }
    }

    uploadState.cancelled = false;
    uploadState.startAt = uploadState.startAt || Date.now();
    uploadState.running = true;
    uploadState.totalBytes += entries.reduce((acc, x) => acc + (x.file.size || 0), 0);
    const allPending = (uploadState.pendingBatches || []).reduce((a, b) => a + (Array.isArray(b) ? b.length : 0), 0) + entries.length;
    uploadState._useOverlay = allPending >= 30;

    // Divide em lotes (não cria 1000 linhas no DOM de uma vez)
    const bs = Math.max(1, parseInt(uploadState.batchSize || 100, 10) || 100);
    const batches = splitIntoBatches(entries, bs);
    uploadState.pendingBatches = Array.isArray(uploadState.pendingBatches) ? uploadState.pendingBatches : [];
    uploadState.pendingBatches.push(...batches);
    uploadState.batchTotal = (uploadState.batchTotal || 0) + batches.length;
    uploadState.batchIndex = uploadState.batchIndex || 0;

    // Inicia imediatamente o lote atual se estiver “vazio”
    // eslint-disable-next-line no-void
    void startNextBatchIfNeeded();
  }

  async function ensureFoldersByNames(names) {
    const wanted = Array.from(new Set((names || []).map((n) => String(n || '').trim()).filter(Boolean)));
    const map = new Map();
    const current = getGalleryFolders();
    current.forEach((f) => {
      const key = normalizeFolderNameKey(f?.name || '');
      if (key && !map.has(key)) map.set(key, f.id);
    });
    for (const name of wanted) {
      const key = normalizeFolderNameKey(name);
      if (map.has(key)) continue;
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/folders`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ name })
      });
      // eslint-disable-next-line no-await-in-loop
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Erro ao criar pasta "${name}"`);
      if (gallery) gallery.folders = Array.isArray(data.folders) ? data.folders : (gallery.folders || []);
      const folder = (data.folder && parseInt(data.folder.id, 10))
        ? parseInt(data.folder.id, 10)
        : (getGalleryFolders().find((f) => normalizeFolderNameKey(f?.name || '') === key)?.id || null);
      if (folder) map.set(key, folder);
    }
    return map;
  }

  function isImageFile(f) {
    const t = String(f?.type || '').toLowerCase();
    if (t.startsWith('image/')) return true;
    return /\.(jpe?g|png|webp|gif|bmp|heic|heif|tiff?)$/i.test(String(f?.name || ''));
  }

  function getImportFolderNameFromFile(file) {
    const parts = String(file?.webkitRelativePath || file?.__ksRelativePath || file?.name || '')
      .replace(/\\/g, '/')
      .split('/')
      .filter(Boolean);
    // Usa sempre a pasta "pai" imediata do arquivo.
    // Ex.: JPEG/1/foto.jpg -> "1", BACKDROP/JPEG/1/foto.jpg -> "1"
    let folderName = parts.length >= 2 ? String(parts[parts.length - 2] || '').trim() : '';
    if (!folderName) return null;
    folderName = folderName.slice(0, 120);
    return folderName || null;
  }

  async function importFoldersFromDirectory(files) {
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return;
    const imageFiles = list.filter(isImageFile);
    if (!imageFiles.length) throw new Error('Nenhuma imagem encontrada na pasta selecionada.');

    const folderNames = new Set();
    const planned = imageFiles.map((file) => {
      const folderName = getImportFolderNameFromFile(file);
      if (folderName) folderNames.add(folderName);
      return { file, folderName };
    });

    const folderMap = await ensureFoldersByNames(Array.from(folderNames));
    const entries = planned.map((x) => ({
      file: x.file,
      folderId: x.folderName ? (folderMap.get(normalizeFolderNameKey(x.folderName)) || null) : null
    }));

    enqueueFiles(entries);
    renderFoldersAdminUi();
    const createdCount = Array.from(folderNames).length;
    toast(
      createdCount
        ? `Importação iniciada: ${entries.length} foto(s), pastas automáticas (${createdCount}).`
        : `Importação iniciada: ${entries.length} foto(s) (sem subpastas).`,
      { kind: 'ok', title: 'Importar pasta' }
    );
  }

  function tagDroppedFileWithRelativePath(file, relativePath) {
    if (!file || !relativePath) return file;
    try {
      Object.defineProperty(file, '__ksRelativePath', {
        value: String(relativePath).replace(/^\/+/, ''),
        enumerable: false,
        configurable: true
      });
    } catch (_) {
      try { file.__ksRelativePath = String(relativePath).replace(/^\/+/, ''); } catch (_) { }
    }
    return file;
  }

  function readAllDirectoryEntries(reader) {
    return new Promise((resolve, reject) => {
      const out = [];
      const readNext = () => {
        reader.readEntries((entries) => {
          if (!entries || !entries.length) {
            resolve(out);
            return;
          }
          out.push(...entries);
          readNext();
        }, reject);
      };
      readNext();
    });
  }

  async function collectFilesFromDroppedEntry(entry, parentPath = '') {
    if (!entry) return [];
    if (entry.isFile) {
      const file = await new Promise((resolve, reject) => {
        entry.file(resolve, reject);
      });
      const rel = `${parentPath}${file?.name || ''}`;
      return [tagDroppedFileWithRelativePath(file, rel)];
    }
    if (!entry.isDirectory) return [];
    const nextParent = `${parentPath}${entry.name || ''}/`;
    const reader = entry.createReader();
    const entries = await readAllDirectoryEntries(reader);
    const nested = await Promise.all(entries.map((child) => collectFilesFromDroppedEntry(child, nextParent)));
    return nested.flat();
  }

  async function extractDroppedFiles(dataTransfer) {
    const items = Array.from(dataTransfer?.items || []);
    if (!items.length) {
      return { files: Array.from(dataTransfer?.files || []), hasDirectory: false };
    }
    const files = [];
    let hasDirectory = false;
    for (const item of items) {
      if (item.kind !== 'file') continue;
      const entry = typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null;
      if (entry) {
        if (entry.isDirectory) hasDirectory = true;
        // eslint-disable-next-line no-await-in-loop
        const fromEntry = await collectFilesFromDroppedEntry(entry, '');
        files.push(...fromEntry);
      } else {
        const f = item.getAsFile?.();
        if (f) files.push(f);
      }
    }
    if (!files.length) files.push(...Array.from(dataTransfer?.files || []));
    return { files, hasDirectory };
  }

  async function handleDupeDecision(mode) {
    const p = _pendingFiles;
    if (!p) return;
    closeDupeModal();
    _pendingFiles = null;

    const all = p.list || [];
    const dups = p.duplicates || [];
    const uniqueList = p.uniqueList || [];

    // 1) Enviar mesmo assim: manda tudo
    if (mode === 'keep') {
      // Enviar mesmo assim: não reabrir modal de repetidas
      enqueueFiles(all, { skipDupeCheck: true });
      return;
    }

    // 2) Ignorar repetidas: manda só as não repetidas
    if (mode === 'skip') {
      if (!uniqueList.length) {
        showError('Todas as fotos selecionadas já existem nesta galeria (repetidas).');
        return;
      }
      enqueueFiles(uniqueList, { skipDupeCheck: true });
      return;
    }

    // 3) Substituir: substitui as que já existem + envia as novas
    if (mode === 'replace') {
      try {
        // substitui primeiro (as que têm photoId)
        const toReplace = dups.filter(x => x.photoId && x.file);
        const toNew = uniqueList;

        uploadState.cancelled = false;
        uploadState.startAt = uploadState.startAt || Date.now();
        uploadState.running = true;

        // Substituições em série (mais seguro)
        let i = 0;
        for (const d of toReplace) {
          i += 1;
          setUploadUi({ active: true, line: `Substituindo ${i}/${toReplace.length}`, file: `Arquivo: ${d.name}`, pct: 0 });
          // eslint-disable-next-line no-await-in-loop
          await replaceExistingPhoto(d.photoId, d.file);
        }

        // Depois, envia as novas normalmente
        if (toNew && toNew.length) {
          enqueueFiles(toNew);
          return;
        }

        // Se só substituiu, recarrega e fecha overlay
        setBubbleDone();
        await loadGallery();
      } catch (e) {
        showError(e?.message || 'Erro ao substituir foto repetida');
      } finally {
        setUploadUi({ active: false });
      }
    }
  }

  dupeSkip?.addEventListener('click', () => handleDupeDecision('skip'));
  dupeKeep?.addEventListener('click', () => handleDupeDecision('keep'));
  dupeReplace?.addEventListener('click', () => handleDupeDecision('replace'));

  function openImportChooser() {
    pFile?.click();
  }

  addPhotoBtn?.addEventListener('click', () => openImportChooser());
  pickBtn?.addEventListener('click', () => openImportChooser());
  /** Mesmo fluxo que «Pasta e subpastas»: uma pasta no disco com webkitRelativePath (subpastas). */
  pickFolderBtn?.addEventListener('click', () => {
    if (!pFolderFile) return;
    try { pFolderFile.value = ''; } catch (_) { }
    pFolderFile.click();
  });
  pFile?.addEventListener('change', async () => {
    try {
      enqueueFiles(pFile.files);
    } catch (e) {
      showError(e?.message || 'Erro ao adicionar fotos');
      toast(e?.message || 'Erro ao adicionar fotos', { kind: 'err', title: 'Erro' });
    } finally {
      pFile.value = '';
    }
  });

  if (pFolderFile) {
    try {
      pFolderFile.setAttribute('webkitdirectory', '');
      pFolderFile.setAttribute('directory', '');
    } catch (_) { }
    pFolderFile.addEventListener('change', async () => {
      try {
        await importFoldersFromDirectory(pFolderFile.files);
      } catch (e) {
        showError(e?.message || 'Erro ao importar pasta');
        toast(e?.message || 'Erro ao importar pasta', { kind: 'err', title: 'Pastas' });
      } finally {
        try { pFolderFile.value = ''; } catch (_) { }
      }
    });
  }

  // Drag & drop
  function prevent(e) { e.preventDefault(); e.stopPropagation(); }
  dropEl?.addEventListener('dragenter', (e) => { prevent(e); dropEl.classList.add('drag'); });
  dropEl?.addEventListener('dragover', (e) => { prevent(e); dropEl.classList.add('drag'); });
  dropEl?.addEventListener('dragleave', (e) => { prevent(e); dropEl.classList.remove('drag'); });
  dropEl?.addEventListener('drop', async (e) => {
    prevent(e);
    dropEl.classList.remove('drag');
    try {
      const dropped = await extractDroppedFiles(e.dataTransfer);
      if (!dropped.files.length) {
        toast('Nenhum arquivo encontrado no que foi arrastado.', { kind: 'warn', title: 'Upload' });
        return;
      }
      if (dropped.hasDirectory) {
        await importFoldersFromDirectory(dropped.files);
      } else {
        enqueueFiles(dropped.files);
      }
    } catch (err) {
      showError(err?.message || 'Erro ao processar item arrastado');
      toast(err?.message || 'Erro ao processar item arrastado', { kind: 'err', title: 'Erro' });
    }
  });

  // filtros da aba Fotos
  pFilterAll?.addEventListener('click', () => { photoFilter = 'all'; photoPageIndex = 0; renderPhotos(); });
  pFilterFav?.addEventListener('click', () => { photoFilter = 'fav'; photoPageIndex = 0; renderPhotos(); });
  pSearch?.addEventListener('input', () => { photoSearch = pSearch.value || ''; photoPageIndex = 0; renderPhotos(); });

  // paginação
  pPagePrev?.addEventListener('click', () => { photoPageIndex = Math.max(0, (photoPageIndex || 0) - 1); renderPhotos(); });
  pPageNext?.addEventListener('click', () => { photoPageIndex = (photoPageIndex || 0) + 1; renderPhotos(); });
  pPageNumbers?.addEventListener('click', (e) => {
    const btn = e.target?.closest && e.target.closest('button[data-page]');
    if (!btn) return;
    const n = parseInt(btn.getAttribute('data-page') || '0', 10) || 0;
    if (!n) return;
    photoPageIndex = Math.max(0, n - 1);
    renderPhotos();
  });

  // seleção em lote (igual Alboom)
  pSelectAll?.addEventListener('click', () => {
    const visible = getVisiblePhotos();
    if (!visible.length) return;
    selectedPhotoIds = new Set(visible.map(p => p.id).filter(Boolean));
    renderPhotos();
  });
  pClearSel?.addEventListener('click', () => { selectedPhotoIds = new Set(); renderPhotos(); });
  pDeleteSel?.addEventListener('click', async () => {
    if (!selectedPhotoIds.size) return;
    if (!confirm(`Excluir ${selectedPhotoIds.size} foto(s) selecionada(s)?`)) return;
    const ids = Array.from(selectedPhotoIds);
    try {
      // overlay de progresso (não “pisca” a tela durante reloads)
      if (uploadCancel) uploadCancel.classList.add('hidden');
      closeViewer();
      setUploadUi({ active: true, line: `Excluindo ${ids.length} foto(s)…`, file: undefined, pct: 0, meta: '0%' });
      const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/photos/delete-batch`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ photo_ids: ids })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao excluir fotos');
      selectedPhotoIds = new Set();
      setUploadUi({ active: true, line: 'Atualizando…', file: undefined, pct: 98, meta: '98%' });
      await loadGallery();
      toast('Fotos excluídas.', { kind: 'ok', title: 'Exclusão' });
    } catch (e) {
      showError(e?.message || 'Erro ao excluir fotos');
      toast(e?.message || 'Erro ao excluir fotos', { kind: 'err', title: 'Erro' });
    } finally {
      if (uploadCancel) uploadCancel.classList.remove('hidden');
      setUploadUi({ active: false });
    }
  });
  pDownloadSel?.addEventListener('click', async () => {
    if (!selectedPhotoIds.size) return;
    const ids = Array.from(selectedPhotoIds);
    for (const id of ids) {
      const p = (gallery?.photos || []).find(x => x.id === id);
      // eslint-disable-next-line no-await-in-loop
      await downloadPhoto(id, p?.original_name);
    }
  });

  // viewer binds
  viewerClose?.addEventListener('click', closeViewer);
  viewer?.addEventListener('click', (e) => { if (e.target === viewer) closeViewer(); });
  viewerPrev?.addEventListener('click', () => { viewerIndex = Math.max(0, viewerIndex - 1); renderViewer(); });
  viewerNext?.addEventListener('click', () => { viewerIndex = viewerIndex + 1; renderViewer(); });

  // Botão Selecionar no viewer (funciona quando a foto está ampliada)
  viewerSelect?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const list = getVisiblePhotos();
    const p = list[viewerIndex];
    if (!p) return;
    const next = !selectedPhotoIds.has(p.id);
    if (next) selectedPhotoIds.add(p.id);
    else selectedPhotoIds.delete(p.id);
    renderViewer();
    renderPhotos();
  });

  // Swipe/drag para navegar entre fotos (touch + mouse)
  (function initViewerSwipe() {
    const el = viewerArea || viewerImg;
    if (!el) return;
    let startX = 0;
    let startY = 0;
    const SWIPE_MIN = 50;
    const onStart = (e) => {
      const t = e.type === 'touchstart' ? e.touches[0] : e;
      startX = t.clientX;
      startY = t.clientY;
    };
    const onEnd = (e) => {
      const t = e.type === 'touchend' ? e.changedTouches[0] : e;
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const list = getVisiblePhotos();
      if (list.length <= 1) return;
      if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) {
        e.preventDefault();
        if (dx > 0 && viewerIndex > 0) {
          viewerIndex -= 1;
          renderViewer();
        } else if (dx < 0 && viewerIndex < list.length - 1) {
          viewerIndex += 1;
          renderViewer();
        }
      }
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: false });
    el.addEventListener('mousedown', onStart);
    el.addEventListener('mouseup', onEnd);
  })();

  document.addEventListener('keydown', (e) => {
    if (viewer?.classList.contains('flex')) {
      if (e.key === 'Escape') closeViewer();
      if (e.key === 'ArrowLeft') { viewerIndex = Math.max(0, viewerIndex - 1); renderViewer(); }
      if (e.key === 'ArrowRight') { viewerIndex = viewerIndex + 1; renderViewer(); }
    }
  });

  // Export modal
  function openExportModal() {
    rebuildExportBatchOptions();
    if (expBatchSel && actBatchFilter) {
      const bf = actBatchFilter.value;
      const ok = bf && Array.from(expBatchSel.options).some(o => o.value === bf);
      expBatchSel.value = ok ? bf : 'all';
    }
    applyExportModalOutput();
    expModal.classList.remove('hidden');
    expModal.classList.add('flex');
  }
  function closeExportModal() {
    expModal.classList.add('hidden');
    expModal.classList.remove('flex');
  }
  expClose?.addEventListener('click', closeExportModal);
  expModal?.addEventListener('click', (e) => { if (e.target === expModal) closeExportModal(); });

  expBtns.forEach(b => b.addEventListener('click', () => setExportModalKind(b.getAttribute('data-exp'))));
  expScopeAll?.addEventListener('change', () => applyExportModalOutput());
  expScopeFilter?.addEventListener('change', () => applyExportModalOutput());
  expBatchSel?.addEventListener('change', () => applyExportModalOutput());
  actBatchFilter?.addEventListener('change', () => {
    if (galleryId) activityBatchPrefByGallery[galleryId] = actBatchFilter.value;
    renderAll();
  });
  expFilterInput?.addEventListener('input', () => scheduleExportModalRefresh());
  expFilterApply?.addEventListener('click', () => flushExportFilterAndApply());

  expCopy?.addEventListener('click', async () => {
    const names = getExportNamesForModal();
    if (!names.length) {
      toast('Nada para copiar. Escolha “todas” ou ajuste números/códigos no filtro.', { kind: 'warn', title: 'Lista vazia' });
      return;
    }
    await copyToClipboard(expTa.value || '');
    toast('Copiado.', { kind: 'ok', title: 'Copiado' });
  });

  openExportBtn?.addEventListener('click', async () => {
    try {
      await loadExport();
      resetExportModalUi();
      openExportModal();
    } catch (e) {
      showError(e.message || 'Erro');
    }
  });

  // Compartilhar: abre a aba com link visível + opções de cópia (não copia às cegas)
  document.getElementById('ks-share')?.addEventListener('click', (e) => {
    e.preventDefault();
    try {
      document.querySelectorAll('.ks-nav a').forEach(n => n.classList.remove('active'));
      document.getElementById('ks-nav-projects')?.classList.add('active');
      setActiveTab('links');
      toast('Veja o link, abra para testar e use os botões para copiar só o link ou a mensagem inteira.', { kind: 'ok', title: 'Link e compartilhamento' });
    } catch (err) {
      showError(err?.message || 'Erro');
    }
  });

  document.getElementById('ks-links-copy-prod')?.addEventListener('click', async () => {
    const v = document.getElementById('ks-links-prod-url')?.value || buildClientShareLink();
    await copyToClipboard(v);
    toast('Link de produção copiado.', { kind: 'ok', title: 'Copiado' });
  });
  document.getElementById('ks-links-open-prod')?.addEventListener('click', () => {
    const v = document.getElementById('ks-links-prod-url')?.value || buildClientShareLink();
    if (v) window.open(v, '_blank', 'noopener,noreferrer');
  });
  document.getElementById('ks-links-copy-local')?.addEventListener('click', async () => {
    const v = document.getElementById('ks-links-local-url')?.value || buildClientLink();
    await copyToClipboard(v);
    toast('URL local copiada.', { kind: 'ok', title: 'Copiado' });
  });
  document.getElementById('ks-links-open-local')?.addEventListener('click', () => {
    const v = document.getElementById('ks-links-local-url')?.value || buildClientLink();
    if (v) window.open(v, '_blank', 'noopener,noreferrer');
  });
  document.getElementById('ks-links-copy-full')?.addEventListener('click', async () => {
    try {
      await loadExport();
    } catch (_) { }
    const msg = shareLinkHasFullOverride() ? getShareFullMessageText() : await resolveShareFullMessageForSend();
    if (linksFullMsg && !shareLinkHasFullOverride()) linksFullMsg.value = msg;
    await copyToClipboard(msg);
    toast('Mensagem completa copiada.', { kind: 'ok', title: 'Copiado' });
  });
  document.getElementById('ks-links-whats')?.addEventListener('click', async () => {
    try {
      const msg = await resolveShareFullMessageForSend();
      if (linksFullMsg && !shareLinkHasFullOverride()) linksFullMsg.value = msg;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
    } catch (e) {
      showError(e?.message || 'Erro ao montar mensagem para o WhatsApp');
    }
  });
  linksCustomMsg?.addEventListener('input', () => {
    customShareMsgByGallery[galleryId] = String(linksCustomMsg.value || '').trim();
    scheduleShareLinkSave({ share_link_custom_append: trimShareField(linksCustomMsg.value, 4000) });
    if (!shareLinkHasFullOverride()) {
      void refreshShareMessagePreview({ forceAuto: true }).catch(() => {});
    }
  });
  linksFullMsg?.addEventListener('input', () => {
    scheduleShareLinkSave({ share_link_full_message: trimShareField(linksFullMsg.value, 12000) });
  });
  document.getElementById('ks-links-full-reset')?.addEventListener('click', async () => {
    const btn = document.getElementById('ks-links-full-reset');
    try {
      if (btn) btn.disabled = true;
      await savePatch({ share_link_full_message: null });
      if (gallery && typeof gallery === 'object') gallery.share_link_full_message = null;
      await refreshShareMessagePreview({ forceAuto: true });
      toast('Modelo automático aplicado à mensagem completa.', { kind: 'ok', title: 'Partilha' });
    } catch (e) {
      showError(e?.message || 'Erro ao restaurar modelo');
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  async function callShareTextAi(kind) {
    const hintRaw = window.prompt(
      'Instruções opcionais para a IA (tom, detalhes, ou deixe em branco):',
      ''
    );
    if (hintRaw === null) return null;
    const hint = String(hintRaw).trim().slice(0, 600);
    const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/ai/share-text`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        kind,
        hint: hint || undefined,
        shareLink: buildClientShareLink(),
        projectName: gallery?.nome_projeto || '',
        currentCustom: linksCustomMsg?.value || '',
        currentFull: linksFullMsg?.value || ''
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao gerar texto com IA');
    return String(data.text || '').trim();
  }

  async function callSalesWaTemplateAi(kind) {
    const hintRaw = window.prompt(
      'Instruções opcionais para a IA (tom, detalhes, ou deixe em branco):',
      ''
    );
    if (hintRaw === null) return null;
    const hint = String(hintRaw).trim().slice(0, 600);
    const textareaMap = {
      pending: salesWaTplPending,
      rejected: salesWaTplRejected,
      awaiting: salesWaTplAwaiting,
      approved: salesWaTplApproved
    };
    const ta = textareaMap[kind];
    const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/ai/sales-whatsapp-template`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        kind,
        hint: hint || undefined,
        currentText: ta?.value || ''
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao gerar texto com IA');
    return String(data.text || '').trim();
  }

  function wireSalesWaTemplateAiButton(btnId, kind) {
    document.getElementById(btnId)?.addEventListener('click', async () => {
      const btn = document.getElementById(btnId);
      try {
        if (!galleryId) throw new Error('ID da galeria inválido.');
        if (btn) btn.disabled = true;
        const text = await callSalesWaTemplateAi(kind);
        if (text == null) return;
        if (!text) throw new Error('A IA devolveu texto vazio.');
        const textareaMap = {
          pending: salesWaTplPending,
          rejected: salesWaTplRejected,
          awaiting: salesWaTplAwaiting,
          approved: salesWaTplApproved
        };
        const ta = textareaMap[kind];
        if (ta) ta.value = text;
        toast('Texto gerado pela IA. Use "Salvar textos de vendas" para gravar no servidor.', { kind: 'ok', title: 'IA' });
      } catch (e) {
        showError(e?.message || 'Erro na IA');
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }
  wireSalesWaTemplateAiButton('ks-sales-wa-tpl-ai-pending', 'pending');
  wireSalesWaTemplateAiButton('ks-sales-wa-tpl-ai-rejected', 'rejected');
  wireSalesWaTemplateAiButton('ks-sales-wa-tpl-ai-awaiting', 'awaiting');
  wireSalesWaTemplateAiButton('ks-sales-wa-tpl-ai-approved', 'approved');

  document.getElementById('ks-links-ai-custom')?.addEventListener('click', async () => {
    const btn = document.getElementById('ks-links-ai-custom');
    try {
      if (btn) btn.disabled = true;
      const text = await callShareTextAi('custom_append');
      if (text == null) return;
      if (!text) throw new Error('A IA devolveu texto vazio.');
      if (linksCustomMsg) linksCustomMsg.value = text;
      customShareMsgByGallery[galleryId] = text;
      await persistShareLinkFields({ share_link_custom_append: trimShareField(text, 4000) });
      if (!shareLinkHasFullOverride()) await refreshShareMessagePreview({ forceAuto: true });
      toast('Texto opcional gerado pela IA.', { kind: 'ok', title: 'IA' });
    } catch (e) {
      showError(e?.message || 'Erro na IA');
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  document.getElementById('ks-links-ai-full')?.addEventListener('click', async () => {
    const btn = document.getElementById('ks-links-ai-full');
    try {
      if (btn) btn.disabled = true;
      const text = await callShareTextAi('full_message');
      if (text == null) return;
      if (!text) throw new Error('A IA devolveu texto vazio.');
      if (linksFullMsg) linksFullMsg.value = text;
      await persistShareLinkFields({ share_link_full_message: trimShareField(text, 12000) });
      toast('Mensagem completa gerada pela IA e guardada.', { kind: 'ok', title: 'IA' });
    } catch (e) {
      showError(e?.message || 'Erro na IA');
    } finally {
      if (btn) btn.disabled = false;
    }
  });
  linkCoverPhotoSel?.addEventListener('change', async () => {
    const pid = parseInt(linkCoverPhotoSel.value || '0', 10) || 0;
    if (!pid) {
      refreshLinkCoverPane();
      return;
    }
    const prevPhotoId = parseInt(gallery?.gallery_link_cover_photo_id || 0, 10) || 0;
    const extPath = String(gallery?.gallery_link_cover_file_path || '').trim();
    if (!extPath && pid === prevPhotoId) {
      refreshLinkCoverPane();
      return;
    }
    try {
      if (linkCoverPhotoSel) linkCoverPhotoSel.disabled = true;
      await setGalleryCover(pid);
      await loadGallery();
      toast('Capa do link atualizada.', { kind: 'ok', title: 'Capa do link' });
    } catch (e) {
      showError(e?.message || 'Erro ao salvar capa do link');
      try {
        await loadGallery();
      } catch (_) { /* ignore */ }
      refreshLinkCoverPane();
    } finally {
      if (linkCoverPhotoSel) linkCoverPhotoSel.disabled = false;
    }
  });
  linkCoverOpenGalleryBtn?.addEventListener('click', () => {
    openLinkCoverPicker();
  });
  linkCoverPickerCloseBtn?.addEventListener('click', () => {
    closeLinkCoverPicker();
  });
  linkCoverSearchInput?.addEventListener('input', () => {
    linkCoverSearchTerm = String(linkCoverSearchInput.value || '');
    renderLinkCoverPickerGrid();
  });
  linkCoverPicker?.addEventListener('click', (e) => {
    if (e.target === linkCoverPicker) closeLinkCoverPicker();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && linkCoverPicker && !linkCoverPicker.classList.contains('hidden')) {
      closeLinkCoverPicker();
    }
  });
  linkCoverGrid?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-link-cover-card]');
    if (!btn) return;
    const pid = parseInt(btn.getAttribute('data-link-cover-card') || '0', 10) || 0;
    if (!pid) return;
    linkCoverDraftPhotoId = pid;
    renderLinkCoverPickerGrid();
  });
  linkCoverPickerApplyBtn?.addEventListener('click', async () => {
    try {
      const pid = parseInt(linkCoverDraftPhotoId || 0, 10) || 0;
      if (!pid) throw new Error('Selecione uma foto para capa do link.');
      if (linkCoverPickerApplyBtn) linkCoverPickerApplyBtn.disabled = true;
      await setGalleryCover(pid);
      if (linkCoverPhotoSel) linkCoverPhotoSel.value = String(pid);
      await loadGallery();
      closeLinkCoverPicker();
      toast('Capa do link atualizada.', { kind: 'ok', title: 'Capa do link' });
    } catch (e) {
      showError(e?.message || 'Erro ao salvar capa do link');
    } finally {
      if (linkCoverPickerApplyBtn) linkCoverPickerApplyBtn.disabled = false;
    }
  });
  linkCoverUploadBtn?.addEventListener('click', () => {
    linkCoverUploadFile?.click();
  });
  linkCoverUploadFile?.addEventListener('change', async () => {
    try {
      const file = linkCoverUploadFile.files && linkCoverUploadFile.files[0];
      if (!file) return;
      if (!String(file.type || '').toLowerCase().startsWith('image/')) {
        throw new Error('Envie apenas imagem (JPG, PNG, WEBP...).');
      }
      if (linkCoverUploadBtn) linkCoverUploadBtn.disabled = true;
      if (linkCoverPickerApplyBtn) linkCoverPickerApplyBtn.disabled = true;
      await uploadExternalLinkCover(file);
      await loadGallery();
      closeLinkCoverPicker();
      toast('Capa externa enviada e ativada.', { kind: 'ok', title: 'Capa do link' });
    } catch (e) {
      showError(e?.message || 'Erro ao enviar capa externa');
    } finally {
      if (linkCoverUploadBtn) linkCoverUploadBtn.disabled = false;
      if (linkCoverPickerApplyBtn) linkCoverPickerApplyBtn.disabled = false;
      if (linkCoverUploadFile) linkCoverUploadFile.value = '';
    }
  });
  linksSupportSave?.addEventListener('click', async () => {
    try {
      linksSupportSave.disabled = true;
      const payload = buildSupportPayload(linksSupportWhats?.value, linksSupportLabel?.value, linksSupportMsg?.value);
      await savePatch(payload);
      await loadGallery();
      toast('Botão de suporte salvo.', { kind: 'ok', title: 'WhatsApp' });
    } catch (e) {
      showError(e?.message || 'Erro ao salvar WhatsApp de suporte');
    } finally {
      linksSupportSave.disabled = false;
    }
  });
  supportSave?.addEventListener('click', async () => {
    try {
      supportSave.disabled = true;
      const payload = buildSupportPayload(supportWhats?.value, supportLabel?.value, supportMsg?.value);
      await savePatch(payload);
      await loadGallery();
      toast('Suporte WhatsApp salvo.', { kind: 'ok', title: 'WhatsApp' });
    } catch (e) {
      showError(e?.message || 'Erro ao salvar suporte WhatsApp');
    } finally {
      supportSave.disabled = false;
    }
  });
  document.getElementById('ks-support-ai')?.addEventListener('click', async () => {
    const btn = document.getElementById('ks-support-ai');
    try {
      if (!galleryId) throw new Error('ID da galeria inválido.');
      if (btn) btn.disabled = true;
      const hintRaw = window.prompt(
        'Instruções opcionais para a IA (tom, detalhes, ou deixe em branco):',
        ''
      );
      if (hintRaw === null) return;
      const hint = String(hintRaw).trim().slice(0, 600);
      const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/ai/support-default-message`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          hint: hint || undefined,
          currentText: supportMsg?.value || '',
          buttonLabel: supportLabel?.value || ''
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao gerar texto com IA');
      const text = String(data.text || '').trim();
      if (!text) throw new Error('A IA devolveu texto vazio.');
      if (supportMsg) supportMsg.value = text;
      toast('Mensagem gerada pela IA. Revise e clique em «Salvar suporte WhatsApp».', { kind: 'ok', title: 'IA' });
    } catch (e) {
      showError(e?.message || 'Erro na IA');
    } finally {
      if (btn) btn.disabled = false;
    }
  });
  salesWaTplSave?.addEventListener('click', async () => {
    try {
      salesWaTplSave.disabled = true;
      await savePatch(buildSalesWaTemplatesPayload());
      await loadGallery();
      toast('Textos de vendas salvos.', { kind: 'ok', title: 'Fotos e vendas' });
    } catch (e) {
      showError(e?.message || 'Erro ao salvar textos de vendas');
    } finally {
      salesWaTplSave.disabled = false;
    }
  });
  salesWaTplReset?.addEventListener('click', async () => {
    try {
      salesWaTplReset.disabled = true;
      await savePatch({
        sales_whatsapp_template_approved: null,
        sales_whatsapp_template_pending: null,
        sales_whatsapp_template_rejected: null,
        sales_whatsapp_template_awaiting: null
      });
      await loadGallery();
      toast('Modelos padrão aplicados.', { kind: 'ok', title: 'Fotos e vendas' });
    } catch (e) {
      showError(e?.message || 'Erro ao aplicar padrões');
    } finally {
      salesWaTplReset.disabled = false;
    }
  });

  promoAddSocial?.addEventListener('click', () => {
    const cur = collectPromoSocialLinks();
    cur.push({ handle: '', url: '' });
    renderPromoSocialEditor(cur);
  });

  document.getElementById('ks-promo-gen-instructions')?.addEventListener('click', () => {
    if (!promoInstructions) return;
    const salesOn = isSalesModeEnabled();
    const maxFree = salesOn ? 50 : 5000;
    const code = String(promoCode?.value || '').trim();
    const n = Math.max(1, Math.min(maxFree, parseInt(promoFreePhotos?.value || '1', 10) || 1));
    const links = collectPromoSocialLinks();
    const handles = links.map((l) => String(l.handle || '').trim()).filter(Boolean);
    const codeDisp = code || '(defina o código do cupom acima)';
    let lines;
    if (salesOn) {
      lines = [
        `1) Siga o(s) perfil(is) do fotógrafo indicado(s) abaixo e marque a confirmação.`,
        `2) Digite o cupom «${codeDisp}» no campo e toque em «Validar cupom».`,
        n === 1
          ? `3) Benefício: ${n} foto fica de fora do valor estimado (o total no topo usa as demais fotos para calcular pacotes/preço).`
          : `3) Benefício: até ${n} fotos ficam de fora do valor estimado (o total no topo usa só as que entram na cobrança).`,
        `4) Depois de enviar a seleção, o fotógrafo aprova cada foto normalmente (cortesia, pago, etc.) — o cupom não substitui essa etapa.`,
        handles.length
          ? `Perfis: ${handles.map((h) => (h.startsWith('@') ? h : `@${h}`)).join(', ')}.`
          : `Dica: adicione ao menos um perfil (Instagram etc.) na lista abaixo — o cliente precisa seguir antes de validar o cupom.`
      ];
    } else {
      lines = [
        `1) Abra cada rede abaixo, siga o perfil do fotógrafo e volte marcando a confirmação nesta página.`,
        `2) Digite o cupom «${codeDisp}» e toque em «Validar cupom».`,
        n === 1
          ? `3) Benefício: pode baixar até ${n} foto selecionada (entre as liberadas pelo retratista).`
          : `3) Benefício: pode baixar até ${n} foto(s) selecionada(s) (entre as liberadas pelo retratista).`,
        handles.length
          ? `Perfis: ${handles.map((h) => (h.startsWith('@') ? h : `@${h}`)).join(', ')}.`
          : `Dica: adicione ao menos um perfil com URL (ex.: Instagram) na lista abaixo.`
      ];
    }
    promoInstructions.value = lines.join('\n');
    toast('Texto sugerido colado nas instruções. Revise, salve o cupom e atualize o link de partilha.', { kind: 'ok', title: 'Cupom' });
  });

  promoSave?.addEventListener('click', async () => {
    try {
      promoSave.disabled = true;
      const vdRaw = String(promoValidDays?.value || '').trim();
      const vd = vdRaw ? parseInt(vdRaw, 10) : NaN;
      const maxFree = isSalesModeEnabled() ? 50 : 5000;
      const payload = {
        promo_enabled: !!promoEnabled?.checked,
        promo_coupon_code: String(promoCode?.value || '').trim() || null,
        promo_free_photo_count: Math.max(1, Math.min(maxFree, parseInt(promoFreePhotos?.value || '1', 10) || 1)),
        promo_instructions: String(promoInstructions?.value || '').trim() || null,
        promo_social_links: collectPromoSocialLinks()
      };
      if (Number.isFinite(vd) && vd > 0) payload.promo_valid_days = vd;
      else payload.promo_valid_until = null;
      await savePatch(payload);
      await loadGallery();
      refreshLinksPane().catch(() => {});
      toast('Cupom salvo.', { kind: 'ok', title: 'OK' });
    } catch (e) {
      showError(e?.message || 'Erro ao salvar cupom');
    } finally {
      promoSave.disabled = false;
    }
  });
  document.getElementById('ks-publish')?.addEventListener('click', async () => {
    try {
      const next = !(gallery?.is_published);
      await savePatch({ is_published: next });
      await loadGallery();
      toast(next ? 'Publicado!' : 'Despublicado!', { kind: 'ok', title: 'OK' });
    } catch (e) {
      showError(e.message || 'Erro');
    }
  });

  async function saveClientImageQualityFromUi() {
    const picked = document.querySelector('input[name="ks-client-img-q"]:checked');
    const val = picked ? String(picked.value || 'low') : 'low';
    await savePatch({ client_image_quality: val });
    await loadGallery();
    loadImageQualityFromGallery();
    toast('Resolução salva para a galeria.', { kind: 'ok', title: 'OK' });
  }

  document.getElementById('btn-save-image-quality')?.addEventListener('click', async () => {
    try {
      await saveClientImageQualityFromUi();
    } catch (e) {
      toast(e.message || 'Erro ao salvar.', { kind: 'err', title: 'Erro' });
    }
  });

  async function loadFacialConfig() {
    try {
      const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}`, {
        headers: HEADERS
      });
      const data = await res.json();
      if (res.ok && data.gallery) {
        if (fFaceEnabled) fFaceEnabled.checked = !!data.gallery.face_recognition_enabled;
      }
      pollFacialStatus();
    } catch (e) {
      console.error('Erro ao carregar config facial:', e);
    }
  }

  async function saveFacialConfig() {
    try {
      if (btnSaveFacial) btnSaveFacial.disabled = true;
      const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}`, {
        method: 'PUT',
        headers: HEADERS,
        body: JSON.stringify({
          face_recognition_enabled: !!fFaceEnabled.checked
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast('Configuração facial salva!', { kind: 'ok', title: 'Sucesso' });
        await loadGallery();
      } else {
        toast(data.message || 'Erro ao salvar configuração.', { kind: 'err', title: 'Erro' });
      }
    } catch (e) {
      toast('Erro de conexão.', { kind: 'err', title: 'Erro' });
    } finally {
      if (btnSaveFacial) btnSaveFacial.disabled = false;
    }
  }

  async function processFacialAll(opts = {}) {
    const isSilent = opts.silent === true;
    if (!isSilent) {
      if (!confirm('Deseja enviar TODAS as fotos desta galeria para processamento de IA (Reconhecimento Facial)?')) return;
    }
    try {
      if (btnProcessFacial) btnProcessFacial.disabled = true;
      const res = await fetch(`${API_URL}/api/king-selection/galleries/${galleryId}/process-all-faces`, {
        method: 'POST',
        headers: HEADERS
      });
      const data = await res.json();
      if (res.ok) {
        if (!isSilent) toast('Processamento em lote iniciado!', { kind: 'ok', title: 'Sucesso' });
        pollFacialStatus();
      } else {
        if (!isSilent) toast(data.message || 'Erro ao iniciar processamento.', { kind: 'err', title: 'Erro' });
      }
    } catch (e) {
      if (!isSilent) toast('Erro de conexão.', { kind: 'err', title: 'Erro' });
    } finally {
      if (btnProcessFacial) btnProcessFacial.disabled = false;
    }
  }

  let facialPollTimer = null;
  async function pollFacialStatus() {
    if (facialPollTimer) clearTimeout(facialPollTimer);
    try {
      const res = await fetch(`${API_URL}/api/king-selection/facial/status?galleryId=${galleryId}`, {
        headers: HEADERS
      });
      const data = await res.json();
      if (res.ok) {
        if (data.rekogOnDemand) {
          if (facialStatusLabel) facialStatusLabel.textContent = 'Modo sob demanda';
          if (facialSpinner) facialSpinner.classList.add('hidden');
          if (facialProgressBar) facialProgressBar.style.width = '100%';
          if (facialProgressText) {
            facialProgressText.textContent =
              'Não é obrigatório processar todas: o visitante compara o rosto na hora; resultados repetidos usam cache (sem cobrar de novo).';
          }
        } else {
          const total = parseInt(data.totalPhotos || 0, 10);
          const processed = parseInt(data.processedPhotos || 0, 10);

          const isProcessing = total > 0 && processed < total;

          if (facialStatusLabel) {
            facialStatusLabel.textContent = isProcessing ? 'Processando...' : (processed >= total && total > 0 ? 'Concluído' : 'Aguardando');
          }
          if (facialSpinner) facialSpinner.classList.toggle('hidden', !isProcessing);

          const pct = total > 0 ? (processed / total) * 100 : 0;
          if (facialProgressBar) facialProgressBar.style.width = `${pct}%`;
          if (facialProgressText) facialProgressText.textContent = `${processed}/${total} fotos processadas`;

          if (isProcessing) {
            facialPollTimer = setTimeout(pollFacialStatus, 4000);
          }
        }
      }
    } catch (e) {
      console.error('Erro ao verificar status facial:', e);
    }
  }

  // init
  (async () => {
    try {
      const savedTab = String(localStorage.getItem(TAB_PREF_KEY) || '').trim();
      const startTab = savedTab || 'activity';
      setActiveTab(startTab);
      await loadGallery();
      // Após carregar, reforça a mesma aba salva para evitar reset visual.
      setActiveTab(startTab);
    } catch (e) {
      showError(e.message || 'Erro ao carregar');
    }
  })();
});

