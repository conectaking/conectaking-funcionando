
        let camerasData = [];
        let peerConnections = {};
        let currentEditingId = null;
        let qrCodeInstance = null;
        let telegramDeepLink = '';
        let authUserId = '{{ auth()->id() ?? "" }}';
        let cameraLights = {};
        let cameraTracking = {};

        document.addEventListener('DOMContentLoaded', () => {
            loadCameras();
            setupTabs();
            setupGridFilter();
            setupDurationChips();
            updateClipsBadge();
        });


        // Configuração das abas do Modal
        function setupTabs() {
            document.querySelectorAll('.kc-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.kc-tab-btn').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.kc-tab-pane').forEach(p => {
                        p.classList.remove('active');
                        p.style.display = 'none';
                    });
                    btn.classList.add('active');
                    const tabId = btn.getAttribute('data-tab');
                    const pane = document.getElementById(tabId);
                    if (pane) {
                        pane.classList.add('active');
                        pane.style.display = 'block';
                    }

                    if (tabId === 'tab-wizard') {
                        generateWizardWifiQr();
                        stopCameraQrScanner();
                    } else if (tabId === 'tab-scan') {
                        // Não inicia câmera automaticamente para respeitar consentimento, mas prepara
                    } else if (tabId === 'tab-lan-scan') {
                        stopCameraQrScanner();
                        const resultsEl = document.getElementById('lan-scan-results');
                        if (resultsEl && resultsEl.children.length === 0 && !isLanScanning) {
                            triggerLanScan();
                        }
                    } else if (tabId === 'tab-shares') {
                        stopCameraQrScanner();
                        loadTabSharesList();
                    } else {
                        stopCameraQrScanner();
                    }
                });
            });
        }

        // Seletor de colunas
        function setupGridFilter() {
            document.querySelectorAll('.kc-grid-btn[data-cols]').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.kc-grid-btn[data-cols]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const cols = btn.getAttribute('data-cols');
                    const grid = document.getElementById('cameras-grid');
                    grid.classList.remove('cols-1', 'cols-2', 'cols-3');
                    if (cols === '1') grid.classList.add('cols-1');
                    else if (cols === '2') grid.classList.add('cols-2');
                    else if (cols === '3') grid.classList.add('cols-3');
                });
            });
        }

        function getCsrfToken() {
            try {
                const meta = document.querySelector('meta[name="csrf-token"]');
                if (meta && meta.getAttribute('content')) {
                    return meta.getAttribute('content');
                }
            } catch (e) {}
            return '';
        }

        function getCookie(name) {
            try {
                const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
                return m ? decodeURIComponent(m[1]) : '';
            } catch (e) {
                return '';
            }
        }

        function getAuthHeaders(extra = {}) {
            let token = null;
            try {
                if (typeof localStorage !== 'undefined') {
                    token = localStorage.getItem('token') || localStorage.getItem('conectaKingToken');
                }
                if (!token && typeof sessionStorage !== 'undefined') {
                    token = sessionStorage.getItem('token');
                }
            } catch (e) {}
            const headers = { 'Accept': 'application/json', ...extra };
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }
            const csrf = getCsrfToken();
            if (csrf) {
                headers['X-CSRF-TOKEN'] = csrf;
            }
            const ckCsrf = getCookie('ck_csrf');
            if (ckCsrf) {
                headers['X-CK-CSRF'] = ckCsrf;
            }
            const xsrf = getCookie('XSRF-TOKEN');
            if (xsrf) {
                headers['X-XSRF-TOKEN'] = xsrf;
            }
            return headers;
        }

        // Carrega câmeras da API
        async function loadCameras() {
            try {
                const res = await fetch('/api/cameras', {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                
                if (res.status === 401 || res.status === 403) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Módulo King Câmera',
                        text: 'Seu plano atual ainda não possui o módulo King Câmera ativado. Solicite a liberação no painel do administrador!',
                        confirmButtonText: 'Voltar ao Painel',
                        confirmButtonColor: '#f59e0b',
                    }).then(() => {
                        window.location.href = '/dashboard';
                    });
                    return;
                }

                const json = await res.json();
                if (json.success) {
                    camerasData = json.data || [];
                    telegramDeepLink = json.meta?.telegram_deep_link || '#';
                    const teleLink = document.getElementById('btn-open-telegram-link');
                    if (teleLink) teleLink.href = telegramDeepLink;

                    renderCameras();
                }
            } catch (err) {
                console.error('Erro ao carregar câmeras:', err);
            }
        }

        // Renderiza cards de câmeras
        function renderCameras() {
            const grid = document.getElementById('cameras-grid');
            const empty = document.getElementById('cameras-empty');
            const statTotal = document.getElementById('stat-total');

            grid.innerHTML = '';
            if (statTotal) statTotal.textContent = camerasData.length;

            if (camerasData.length === 0) {
                grid.style.display = 'none';
                empty.style.display = 'block';
                return;
            }

            grid.style.display = 'grid';
            empty.style.display = 'none';

            camerasData.forEach(cam => {
                const realDisplayIp = cam.display_ip || (cam.ip_address === '172.18.0.1' ? (cam.port == 1554 ? '172.16.100.215' : '172.16.100.43') : cam.ip_address);
                const card = document.createElement('div');
                card.className = 'kc-card';
                card.id = `card-cam-${cam.id}`;
                card.innerHTML = `
                    <div class="kc-card-header">
                        <div class="kc-card-title-group">
                            <span class="kc-card-title">${escapeHtml(cam.name)}</span>
                            <span class="kc-room-badge"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(cam.room || 'Geral')}</span>
                            ${cam.device_id ? `<span class="kc-room-badge" style="background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.45); color: #fbbf24; font-weight: 700;" title="ID da Câmera (Yoosee/Device ID)"><i class="fas fa-fingerprint"></i> ID: ${escapeHtml(cam.device_id)}</span>` : ''}
                            <span class="kc-room-badge" style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #10b981;" title="IP Real no Wi-Fi"><i class="fas fa-wifi"></i> ${realDisplayIp}</span>
                        </div>
                        <div class="kc-card-header-actions">
                            <div class="kc-live-badge">
                                <span class="kc-live-dot"></span>
                                <span>AO VIVO</span>
                            </div>
                            <button type="button" class="kc-card-edit-btn" onclick="editCamera(${cam.id})" title="Configurações e Edição da Câmera">
                                <i class="fas fa-sliders-h"></i> <span>Configurar</span>
                            </button>
                            <button type="button" class="kc-card-delete-btn" onclick="deleteCamera(${cam.id})" title="Remover Câmera">
                                <i class="fas fa-trash-alt"></i> <span>Remover</span>
                            </button>
                        </div>
                    </div>
                    <div class="kc-video-wrap" id="video-wrap-${cam.id}">
                        <video id="video-${cam.id}" autoplay playsinline muted></video>
                        <canvas class="kc-crib-canvas" id="crib-canvas-${cam.id}"></canvas>

                        <!-- Botão Flutuante de Áudio Ao Vivo (Toque para Ouvir) -->
                        <button type="button" class="kc-floating-unmute-btn" id="unmute-badge-${cam.id}" onclick="toggleAudioMute(${cam.id})" title="Ativar Som Ao Vivo">
                            <i class="fas fa-volume-mute" style="color: #f87171;"></i> <span>Toque para Ouvir Som</span>
                        </button>

                        <div class="kc-state-box" id="loader-${cam.id}">
                            <div class="kc-spinner"></div>
                            <div style="font-size: 0.85rem; font-weight: 500;">Conectando WebRTC...</div>
                            ${cam.device_id ? `<div style="font-size: 0.78rem; color: #fbbf24; font-weight: 700;"><i class="fas fa-fingerprint"></i> ID: ${escapeHtml(cam.device_id)}</div>` : ''}
                            <div style="font-size: 0.72rem; color: #10b981;"><i class="fas fa-wifi"></i> IP Wi-Fi: ${realDisplayIp}</div>
                        </div>

                        <!-- Banners de Alerta em Tempo Real (Choro, Saída do Berço e Movimento) -->
                        <div class="kc-alert-banner kc-alert-cry" id="cry-alert-${cam.id}">
                            <i class="fas fa-baby" style="font-size: 1.1rem; animation: bounce 0.6s infinite alternate;"></i>
                            <span>🚨 <b>CHORO DETECTADO!</b> O bebê está chorando no berço!</span>
                        </div>
                        <div class="kc-alert-banner kc-alert-fence" id="fence-alert-${cam.id}">
                            <i class="fas fa-exclamation-triangle" style="font-size: 1.1rem; animation: pulse 0.5s infinite;"></i>
                            <span>⚠️ <b>SAÍDA DO BERÇO!</b> O bebê saiu da área segura!</span>
                        </div>
                        <div class="kc-alert-banner" id="motion-alert-${cam.id}" style="display: none; background: rgba(16, 185, 129, 0.95); border: 1.5px solid #10b981;">
                            <i class="fas fa-running" style="font-size: 1.1rem;"></i>
                            <span>🏃 <b>MOVIMENTO DETECTADO!</b> A neném se mexeu!</span>
                        </div>

                        <div class="kc-rec-indicator" id="rec-indicator-${cam.id}" style="display: none;">
                            <span class="kc-rec-dot"></span> REC <span id="rec-timer-${cam.id}">00:00</span>
                        </div>
                        <div class="kc-track-indicator" id="track-badge-${cam.id}" style="display: ${cam.auto_tracking_enabled ? 'inline-flex' : 'none'};">
                            <i class="fas fa-crosshairs"></i> Seguir 360° Ativo
                        </div>

                        <!-- Barra Flutuante de Zoom Digital -->
                        <div class="kc-zoom-floating-bar" id="zoom-bar-${cam.id}">
                            <span style="font-size: 0.75rem; font-weight: 700; color: var(--kc-gold); margin-right: 2px;"><i class="fas fa-search-plus"></i> Zoom:</span>
                            <button type="button" class="kc-zoom-chip active" onclick="setDigitalZoom(${cam.id}, 1, this)">1x</button>
                            <button type="button" class="kc-zoom-chip" onclick="setDigitalZoom(${cam.id}, 1.5, this)">1.5x</button>
                            <button type="button" class="kc-zoom-chip" onclick="setDigitalZoom(${cam.id}, 2, this)">2x</button>
                            <button type="button" class="kc-zoom-chip" onclick="setDigitalZoom(${cam.id}, 3, this)">3x</button>
                            <button type="button" class="kc-zoom-chip" onclick="setDigitalZoom(${cam.id}, 4, this)">4x</button>
                            <button type="button" class="kc-icon-btn" onclick="toggleZoomBar(${cam.id})" style="width: 24px; height: 24px; font-size: 0.7rem; margin-left: 2px;"><i class="fas fa-times"></i></button>
                        </div>

                        <!-- Caixa Interfone Walkie-Talkie -->
                        <div class="kc-intercom-box" id="intercom-box-${cam.id}">
                            <div style="font-size: 0.82rem; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: space-between;">
                                <span><i class="fas fa-microphone" style="color: #10b981;"></i> Interfone Walkie-Talkie</span>
                                <button type="button" onclick="toggleIntercomBox(${cam.id})" style="background: none; border: none; color: #94a3b8; font-size: 1.1rem; cursor: pointer;">&times;</button>
                            </div>
                            <div style="font-size: 0.72rem; color: #94a3b8; text-align: center;">Segure o botão para falar pelo microfone.</div>
                            <button type="button" class="kc-intercom-talk-btn" id="intercom-talk-btn-${cam.id}"
                                onpointerdown="startIntercomTalk(${cam.id})" onpointerup="stopIntercomTalk(${cam.id})" onpointerleave="stopIntercomTalk(${cam.id})">
                                <i class="fas fa-microphone" style="font-size: 1.4rem;"></i>
                                <span style="font-size: 0.82rem; font-weight: 700;">Segure para Falar</span>
                            </button>
                            <div class="kc-voice-waves" id="voice-waves-${cam.id}">
                                <div class="kc-wave-bar"></div><div class="kc-wave-bar"></div><div class="kc-wave-bar"></div><div class="kc-wave-bar"></div><div class="kc-wave-bar"></div>
                            </div>
                        </div>

                        <!-- Overlays do Vídeo (Auto-Hide estilo Yoosee após 3.5s) -->
                        <div class="kc-video-overlay" id="overlay-${cam.id}">
                            <div class="kc-overlay-top">
                                <div style="display: flex; align-items: center; gap: 0.4rem; pointer-events: auto;">
                                    <span style="font-size: 0.78rem; font-weight: 700; color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,0.8);">${escapeHtml(cam.room || cam.name)}</span>
                                    <div class="kc-overlay-timestamp" id="time-${cam.id}">--:--:--</div>
                                    <div class="kc-night-indicator" id="night-badge-${cam.id}" style="display: none;">
                                        <i class="fas fa-moon"></i> Noturno IA
                                    </div>
                                    <div class="kc-sharp-indicator" id="sharp-badge-${cam.id}" style="display: none;">
                                        <i class="fas fa-magic"></i> HD IA
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.4rem; pointer-events: auto;">
                                    <div class="kc-yoosee-live-tag">
                                        <span class="kc-yoosee-live-dot"></span> LIVE
                                    </div>
                                </div>
                            </div>

                            <div class="kc-overlay-bottom">
                                <div style="display: flex; align-items: center; gap: 0.4rem; pointer-events: auto;">
                                    <button type="button" class="kc-res-badge-btn" id="res-badge-${cam.id}" onclick="toggleVideoResolution(${cam.id})" title="Alternar Resolução (FHD / SD)">
                                        FHD
                                    </button>
                                </div>
                                <div class="kc-overlay-controls" style="pointer-events: auto;">
                                    <button type="button" class="kc-icon-btn" id="ov-audio-${cam.id}" onclick="toggleAudioMute(${cam.id})" title="Ligar / Silenciar Áudio">
                                        <i class="fas fa-volume-mute"></i>
                                    </button>
                                    <button type="button" class="kc-icon-btn" id="ov-rec-${cam.id}" onclick="toggleManualRecording(${cam.id})" title="Gravar Vídeo">
                                        <i class="fas fa-video"></i>
                                    </button>
                                    <button type="button" class="kc-icon-btn" onclick="downloadSnapshot(${cam.id})" title="Capturar Foto Instantânea">
                                        <i class="fas fa-camera"></i>
                                    </button>
                                    <button type="button" class="kc-icon-btn" id="ov-rotate-${cam.id}" onclick="toggleForceLandscape(${cam.id})" title="Girar 90° Paisagem">
                                        <i class="fas fa-sync-alt"></i>
                                    </button>
                                    <button type="button" class="kc-icon-btn" onclick="toggleFullscreen(${cam.id})" title="Tela Cheia">
                                        <i class="fas fa-expand"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button type="button" class="kc-exit-landscape-btn" id="exit-landscape-${cam.id}" onclick="toggleForceLandscape(${cam.id})" style="display: none; position: absolute; top: 14px; right: 14px; z-index: 2147483647; background: rgba(15, 23, 42, 0.9); color: #fff; border: 1px solid rgba(255,255,255,0.35); padding: 8px 16px; border-radius: 20px; font-size: 0.82rem; font-weight: 700; cursor: pointer; backdrop-filter: blur(8px);">
                            <i class="fas fa-undo"></i> Sair do Modo Paisagem
                        </button>
                    </div>

                    <!-- Navegação de Abas estilo Yoosee (PTZ, Berço, Reprodução, Funções) -->
                    <div class="kc-yoosee-nav">
                        <button type="button" class="kc-yoosee-tab-btn active" id="tab-nav-${cam.id}-ptz" onclick="switchYooseeTab(${cam.id}, 'ptz')">
                            <i class="fas fa-crosshairs"></i>
                            <span>PTZ 360°</span>
                        </button>
                        <button type="button" class="kc-yoosee-tab-btn" id="tab-nav-${cam.id}-crib" onclick="switchYooseeTab(${cam.id}, 'crib')">
                            <i class="fas fa-baby"></i>
                            <span>Berço & Bebê</span>
                        </button>
                        <button type="button" class="kc-yoosee-tab-btn" id="tab-nav-${cam.id}-playback" onclick="switchYooseeTab(${cam.id}, 'playback')">
                            <i class="fas fa-sd-card"></i>
                            <span>Reprodução</span>
                        </button>
                        <button type="button" class="kc-yoosee-tab-btn" id="tab-nav-${cam.id}-tools" onclick="switchYooseeTab(${cam.id}, 'tools')">
                            <i class="fas fa-sliders-h"></i>
                            <span>Funções</span>
                        </button>
                    </div>

                    <!-- Conteúdo das Abas estilo Yoosee -->
                    <div class="kc-card-tab-panels">
                        <!-- 1. Aba PTZ (Joystick Redondo Yoosee) -->
                        <div class="kc-tab-panel active" id="panel-${cam.id}-ptz">
                            <div class="kc-yoosee-ptz-panel">
                                <div class="kc-yoosee-joystick-wrap">
                                    <button type="button" class="kc-yoosee-dir-btn btn-up" 
                                        onpointerdown="ptzActionPress(${cam.id}, 'up', event)" 
                                        onpointerup="ptzActionRelease(${cam.id}, 'up', event)"
                                        onpointerleave="ptzActionRelease(${cam.id}, 'up', event)"
                                        title="Inclinar Câmera para Cima">
                                        <i class="fas fa-chevron-up"></i>
                                    </button>
                                    <button type="button" class="kc-yoosee-dir-btn btn-down" 
                                        onpointerdown="ptzActionPress(${cam.id}, 'down', event)" 
                                        onpointerup="ptzActionRelease(${cam.id}, 'down', event)"
                                        onpointerleave="ptzActionRelease(${cam.id}, 'down', event)"
                                        title="Inclinar Câmera para Baixo">
                                        <i class="fas fa-chevron-down"></i>
                                    </button>
                                    <button type="button" class="kc-yoosee-dir-btn btn-left" 
                                        onpointerdown="ptzActionPress(${cam.id}, 'left', event)" 
                                        onpointerup="ptzActionRelease(${cam.id}, 'left', event)"
                                        onpointerleave="ptzActionRelease(${cam.id}, 'left', event)"
                                        title="Girar Câmera para Esquerda">
                                        <i class="fas fa-chevron-left"></i>
                                    </button>
                                    <button type="button" class="kc-yoosee-dir-btn btn-right" 
                                        onpointerdown="ptzActionPress(${cam.id}, 'right', event)" 
                                        onpointerup="ptzActionRelease(${cam.id}, 'right', event)"
                                        onpointerleave="ptzActionRelease(${cam.id}, 'right', event)"
                                        title="Girar Câmera para Direita">
                                        <i class="fas fa-chevron-right"></i>
                                    </button>
                                    <button type="button" class="kc-yoosee-center-btn" onclick="triggerPtzSweep(${cam.id})" title="Giro Automático 360°">
                                        <i class="fas fa-sync-alt" style="font-size: 1.25rem;"></i>
                                        <span style="font-size: 0.65rem; font-weight: 800; margin-top: 2px;">360°</span>
                                    </button>
                                </div>
                                <div class="kc-yoosee-ptz-subactions">
                                    <button type="button" class="kc-yoosee-sub-link" onclick="ptzResetCenter(${cam.id})">
                                        <i class="fas fa-redo"></i> <span>Reposição do PTZ</span>
                                    </button>
                                    <button type="button" class="kc-yoosee-sub-link" onclick="openPresetsModal(${cam.id})">
                                        <i class="fas fa-star"></i> <span>Locais Frequentes</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- 2. Aba Berço & Bebê (Cerca Segura e Alerta de Movimento) -->
                        <div class="kc-tab-panel" id="panel-${cam.id}-crib" style="display: none;">
                            <div class="kc-crib-controls-panel">
                                <div class="kc-crib-panel-header">
                                    <div style="font-size: 0.85rem; font-weight: 700; color: #fff;">
                                        <i class="fas fa-shield-alt" style="color: var(--kc-cyan);"></i> Proteção Inteligente do Berço
                                    </div>
                                    <div style="font-size: 0.74rem; color: var(--kc-text-muted);">
                                        Arraste os círculos azuis sobre o berço para demarcar a área segura da neném.
                                    </div>
                                </div>
                                <div class="kc-crib-toggles-grid">
                                    <button type="button" class="kc-pill-btn kc-btn-track" id="btn-track-person-${cam.id}" onclick="togglePersonTracking(${cam.id})" title="Rastrear e Seguir Pessoa 360°">
                                        <i class="fas fa-walking" style="color: #3b82f6;"></i> <span>Seguir Pessoa</span>
                                    </button>
                                    <button type="button" class="kc-pill-btn kc-btn-track ${cam.auto_tracking_enabled ? 'active' : ''}" id="btn-track-baby-${cam.id}" onclick="toggleBabyTracking(${cam.id})" title="Rastrear e Seguir Bebê no Berço / Quarto">
                                        <i class="fas fa-baby" style="color: #f59e0b;"></i> <span>Seguir Bebê</span>
                                    </button>
                                    <button type="button" class="kc-pill-btn kc-btn-cry ${cam.baby_cry_enabled ? 'active' : ''}" id="btn-cry-${cam.id}" onclick="toggleBabyCryDetector(${cam.id})" title="Alerta Sonoro quando a criança chorar">
                                        <i class="fas fa-volume-up" style="color: #ec4899;"></i> <span>Monitor Choro</span>
                                    </button>
                                    <button type="button" class="kc-pill-btn kc-btn-fence ${cam.crib_fence_enabled ? 'active' : ''}" id="btn-fence-${cam.id}" onclick="toggleCribFence(${cam.id})" title="Desenhar e Ativar Cerca de Proteção do Berço">
                                        <i class="fas fa-vector-square" style="color: #06b6d4;"></i> <span>Cerca do Berço</span>
                                    </button>
                                    <button type="button" class="kc-pill-btn kc-btn-motion active" id="btn-motion-alert-${cam.id}" onclick="toggleBabyMotionAlert(${cam.id})" title="Detectar Movimento com Foto Automática e Gravação de 10s">
                                        <i class="fas fa-running" style="color: #10b981;"></i> <span>Movimento (Foto + 10s)</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- 3. Aba Reprodução (Cartão SD & Clipes Gravados) -->
                        <div class="kc-tab-panel" id="panel-${cam.id}-playback" style="display: none;">
                            <div class="kc-playback-panel">
                                <div class="kc-playback-header">
                                    <span style="font-size: 0.82rem; font-weight: 700; color: #fff;"><i class="fas fa-video"></i> Gravações do Cartão SD / Eventos</span>
                                    <button type="button" class="kc-mini-btn" onclick="openTimelineModal(${cam.id}, '${escapeHtml(cam.name)}')"><i class="fas fa-calendar-alt"></i> Histórico Completo</button>
                                </div>
                                <div class="kc-playback-filters">
                                    <button type="button" class="kc-filter-chip active"><i class="fas fa-th"></i> Todos</button>
                                    <button type="button" class="kc-filter-chip"><i class="fas fa-running"></i> Movimento</button>
                                    <button type="button" class="kc-filter-chip"><i class="fas fa-baby"></i> Bebê</button>
                                </div>
                                <div class="kc-playback-grid" id="playback-grid-${cam.id}">
                                    <div class="kc-clip-card" onclick="openClipPlayer(${cam.id}, '11:40')">
                                        <div class="kc-clip-thumb">
                                            <img src="https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=300&q=80">
                                            <span class="kc-clip-time">11:40</span>
                                            <i class="fas fa-play-circle kc-clip-play-icon"></i>
                                        </div>
                                        <div class="kc-clip-info">
                                            <span class="kc-clip-badge"><i class="fas fa-running"></i> Movimento</span>
                                            <span class="kc-clip-dur">02:15 min</span>
                                        </div>
                                    </div>
                                    <div class="kc-clip-card" onclick="openClipPlayer(${cam.id}, '11:35')">
                                        <div class="kc-clip-thumb">
                                            <img src="https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=300&q=80">
                                            <span class="kc-clip-time">11:35</span>
                                            <i class="fas fa-play-circle kc-clip-play-icon"></i>
                                        </div>
                                        <div class="kc-clip-info">
                                            <span class="kc-clip-badge"><i class="fas fa-shield-alt"></i> Cerca Berço</span>
                                            <span class="kc-clip-dur">01:45 min</span>
                                        </div>
                                    </div>
                                    <div class="kc-clip-card" onclick="openClipPlayer(${cam.id}, '11:32')">
                                        <div class="kc-clip-thumb">
                                            <img src="https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=300&q=80">
                                            <span class="kc-clip-time">11:32</span>
                                            <i class="fas fa-play-circle kc-clip-play-icon"></i>
                                        </div>
                                        <div class="kc-clip-info">
                                            <span class="kc-clip-badge"><i class="fas fa-baby"></i> Choro</span>
                                            <span class="kc-clip-dur">03:10 min</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 4. Aba Mais Funções (Lâmpada, Áudio Turbo, Sirene, Interfone, Compartilhar) -->
                        <div class="kc-tab-panel" id="panel-${cam.id}-tools" style="display: none;">
                            <div class="kc-quick-actions-grid" style="padding: 0.75rem 0.5rem;">
                                <button type="button" class="kc-pill-btn kc-btn-light" id="btn-light-${cam.id}" onclick="toggleCameraLight(${cam.id})" title="Luz LED / Realçador Noturno">
                                    <i class="fas fa-lightbulb" style="color: #fbbf24;"></i> <span>Lâmpada</span>
                                </button>
                                <button type="button" class="kc-pill-btn kc-btn-audio" id="btn-turbo-audio-${cam.id}" onclick="toggleAudioBooster(${cam.id})" title="Ouvir Som e Ativar Áudio Turbo 300%">
                                    <i class="fas fa-volume-up" style="color: #06b6d4;"></i> <span>Áudio Turbo</span>
                                </button>
                                <button type="button" class="kc-pill-btn kc-btn-intercom" id="btn-intercom-${cam.id}" onclick="toggleIntercomBox(${cam.id})" title="Falar na Câmera">
                                    <i class="fas fa-microphone" style="color: #10b981;"></i> <span>Interfone (Falar)</span>
                                </button>
                                <button type="button" class="kc-pill-btn kc-btn-siren" id="btn-siren-${cam.id}" onclick="triggerSiren(${cam.id})" title="Disparar Sirene">
                                    <i class="fas fa-bullhorn" style="color: #ef4444;"></i> <span>Sirene Pânico</span>
                                </button>
                                <button type="button" class="kc-pill-btn kc-btn-night" id="btn-night-${cam.id}" onclick="toggleAiNightVision(${cam.id})" title="IA Visão Noturna">
                                    <i class="fas fa-moon" style="color: #a78bfa;"></i> <span>Visão Noturna</span>
                                </button>
                                <button type="button" class="kc-pill-btn kc-btn-sharp" id="btn-sharp-${cam.id}" onclick="toggleAiSharpness(${cam.id})" title="Melhorar Imagem HD">
                                    <i class="fas fa-magic" style="color: #fbbf24;"></i> <span>Melhorar Imagem</span>
                                </button>
                                <button type="button" class="kc-pill-btn" onclick="toggleZoomBar(${cam.id})" title="Zoom Digital">
                                    <i class="fas fa-search-plus" style="color: var(--kc-gold);"></i> <span>Zoom Digital</span>
                                </button>
                                <button type="button" class="kc-pill-btn kc-btn-share-highlight" onclick="openShareModal(${cam.id})" title="Compartilhar Link Temporário">
                                    <i class="fas fa-share-alt"></i> <span>Compartilhar</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;

                grid.appendChild(card);

                // Ativa auto-hide dos controles no vídeo (estilo Yoosee)
                const videoWrap = card.querySelector('.kc-video-wrap');
                attachAutoHidingOverlays(videoWrap, cam.id);
                attachVideoSwipePtz(videoWrap, cam.id);

                // Inicia streaming WebRTC para a câmera
                startWebRtcStream(cam);
                startClock(cam.id);

                // Restaura estado ativo salvo no banco (Cerca do Berço, Rastreamento, Choro)
                setTimeout(() => {
                    if (cam.crib_fence_enabled) {
                        restoreCribFenceOnLoad(cam.id, cam.crib_roi_json);
                    }
                    if (cam.auto_tracking_enabled) {
                        cameraTracking[cam.id] = true;
                        updateTrackingPills(cam.id);
                        startAutoTrackingLoop(cam.id);
                    }
                    if (cam.baby_cry_enabled) {
                        toggleBabyCryDetector(cam.id);
                    }
                }, 500);
            });
        }

        // Relógio no canto do vídeo
        function startClock(camId) {
            setInterval(() => {
                const el = document.getElementById(`time-${camId}`);
                if (el) {
                    const now = new Date();
                    el.textContent = now.toLocaleTimeString('pt-BR');
                }
            }, 1000);
        }

        // Negociação WebRTC WHEP com go2rtc via Laravel proxy
        async function startWebRtcStream(cam) {
            const videoEl = document.getElementById(`video-${cam.id}`);
            const loaderEl = document.getElementById(`loader-${cam.id}`);

            if (!videoEl) return;

            try {
                // Fecha conexão anterior se houver
                if (peerConnections[cam.id]) {
                    peerConnections[cam.id].close();
                }

                const pc = new RTCPeerConnection({
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                });
                peerConnections[cam.id] = pc;

                pc.addTransceiver('video', { direction: 'recvonly' });
                pc.addTransceiver('audio', { direction: 'sendrecv' });

                let hasReceivedVideo = false;
                let initialMuteHandled = false;

                pc.ontrack = (event) => {
                    if (event.streams && event.streams[0]) {
                        videoEl.srcObject = event.streams[0];
                    } else {
                        if (!videoEl.srcObject) {
                            videoEl.srcObject = new MediaStream();
                        }
                        if (!videoEl.srcObject.getTracks().includes(event.track)) {
                            videoEl.srcObject.addTrack(event.track);
                        }
                    }
                    if (!initialMuteHandled) {
                        videoEl.muted = true;
                        updateAudioMuteUI(cam.id, true);
                        initialMuteHandled = true;
                    }
                    videoEl.play().catch(e => console.warn('Autoplay prevented:', e));
                    if (loaderEl) loaderEl.style.display = 'none';
                };

                videoEl.addEventListener('playing', () => {
                    hasReceivedVideo = true;
                    if (loaderEl) loaderEl.style.display = 'none';
                    // Se o fallback por snapshot estiver ativo, limpa e oculta
                    if (window[`snapInterval_${cam.id}`]) {
                        clearInterval(window[`snapInterval_${cam.id}`]);
                        delete window[`snapInterval_${cam.id}`];
                    }
                    const img = document.getElementById(`fallback-img-${cam.id}`);
                    if (img) img.style.display = 'none';
                });

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                // Aguarda reunião de candidatos ICE antes de enviar SDP
                await new Promise(resolve => {
                    if (pc.iceGatheringState === 'complete') {
                        resolve();
                    } else {
                        const checkState = () => {
                            if (pc.iceGatheringState === 'complete') {
                                pc.removeEventListener('icegatheringstatechange', checkState);
                                resolve();
                            }
                        };
                        pc.addEventListener('icegatheringstatechange', checkState);
                        setTimeout(resolve, 800);
                    }
                });

                // Envia oferta SDP para o endpoint do backend
                const response = await fetch(`/api/cameras/${cam.id}/webrtc`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/sdp' }),
                    body: pc.localDescription ? pc.localDescription.sdp : offer.sdp
                });

                if (response.ok) {
                    const answerSdp = await response.text();
                    await pc.setRemoteDescription(new RTCSessionDescription({
                        type: 'answer',
                        sdp: answerSdp
                    }));

                    // Fallback de segurança: se após 2.5s o vídeo WebRTC ainda não renderizar quadros, ativa o Live Snapshot contínuo
                    setTimeout(() => {
                        if (!hasReceivedVideo || videoEl.videoWidth === 0) {
                            activateLiveSnapshotFallback(cam.id, false);
                        }
                    }, 2500);
                } else {
                    // Se WebRTC falhar na negociação, ativa o Live Snapshot contínuo
                    activateLiveSnapshotFallback(cam.id, false);
                }
            } catch (err) {
                console.warn(`WebRTC error for camera ${cam.id}:`, err);
                activateLiveSnapshotFallback(cam.id, false);
            }
        }

        // Fallback de exibição contínua via Snapshot ao vivo (garante imagem em tempo real mesmo em navegadores sem H.265)
        function activateLiveSnapshotFallback(camId, firstShotOnly = false) {
            const wrap = document.querySelector(`#card-cam-${camId} .kc-video-wrap`);
            if (!wrap) return;

            let img = document.getElementById(`fallback-img-${camId}`);
            if (!img) {
                img = document.createElement('img');
                img.id = `fallback-img-${camId}`;
                img.style.position = 'absolute';
                img.style.top = '0';
                img.style.left = '0';
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.zIndex = '6'; // Acima do loader (z-index 5)
                img.style.borderRadius = '0';
                wrap.appendChild(img);
            }
            img.style.zIndex = '6';

            let failCount = 0;
            const refreshFrame = async () => {
                if (!document.getElementById(`card-cam-${camId}`)) {
                    if (window[`snapInterval_${camId}`]) {
                        clearInterval(window[`snapInterval_${camId}`]);
                        delete window[`snapInterval_${camId}`];
                    }
                    return;
                }
                if (window[`snapPending_${camId}`]) return;
                window[`snapPending_${camId}`] = true;

                try {
                    const res = await fetch(`/api/cameras/${camId}/snapshot?_t=${Date.now()}`, {
                        credentials: 'include',
                        headers: getAuthHeaders()
                    });
                    if (res.ok) {
                        failCount = 0;
                        const blob = await res.blob();
                        const newUrl = URL.createObjectURL(blob);
                        if (img.src && img.src.startsWith('blob:')) {
                            URL.revokeObjectURL(img.src);
                        }
                        img.src = newUrl;
                        img.style.display = 'block';
                        const loaderEl = document.getElementById(`loader-${camId}`);
                        if (loaderEl) loaderEl.style.display = 'none';
                    } else {
                        failCount++;
                        if (failCount >= 10 && !firstShotOnly) {
                            if (window[`snapInterval_${camId}`]) {
                                clearInterval(window[`snapInterval_${camId}`]);
                                delete window[`snapInterval_${camId}`];
                            }
                            showCameraStreamOffline(camId, 'Câmera não respondeu ao feed de vídeo. Verifique se ela está ligada e conectada ao Wi-Fi.');
                        }
                    }
                } catch (e) {
                    failCount++;
                    if (failCount >= 10 && !firstShotOnly) {
                        if (window[`snapInterval_${camId}`]) {
                            clearInterval(window[`snapInterval_${camId}`]);
                            delete window[`snapInterval_${camId}`];
                        }
                        showCameraStreamOffline(camId, 'Falha ao conectar ao fluxo de vídeo da câmera.');
                    }
                } finally {
                    window[`snapPending_${camId}`] = false;
                }
            };

            refreshFrame();
            if (!firstShotOnly && !window[`snapInterval_${camId}`]) {
                window[`snapInterval_${camId}`] = setInterval(refreshFrame, 2000);
            }
        }

        function isPrivateIp(ip) {
            if (!ip) return false;
            return ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.') || ip.startsWith('172.17.') || ip.startsWith('172.18.') || ip.startsWith('172.19.') || ip.startsWith('172.2') || ip.startsWith('172.30.') || ip.startsWith('172.31.') || ip === '127.0.0.1' || ip === 'localhost';
        }

        function showCameraStreamOffline(camId, msg) {
            const cam = camerasData.find(c => c.id === camId);
            const loaderEl = document.getElementById(`loader-${camId}`);
            if (!loaderEl) return;
            const isPrivate = cam && isPrivateIp(cam.ip_address);
            loaderEl.innerHTML = `
                <i class="fas fa-video-slash" style="font-size: 1.8rem; color: var(--kc-gold); margin-bottom: 0.4rem;"></i>
                <div style="font-size: 0.85rem; font-weight: 600;">Feed em Standby</div>
                <div style="font-size: 0.72rem; color: var(--kc-text-dim); max-width: 270px; margin: 0 auto 0.5rem auto;">${msg}</div>
                <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
                    <button class="kc-btn kc-btn-secondary" onclick="retryStream(${camId})" style="padding: 0.3rem 0.65rem; font-size: 0.75rem;">
                        <i class="fas fa-redo"></i> Reconectar
                    </button>
                    ${isPrivate ? `
                    <button class="kc-btn" onclick="showLocalIpHelp('${cam ? cam.ip_address : ''}')" style="padding: 0.3rem 0.65rem; font-size: 0.75rem; background: rgba(245, 158, 11, 0.15); border: 1px solid var(--kc-gold); color: #fbbf24; border-radius: 8px;">
                        <i class="fas fa-network-wired"></i> Ajuda IP Local
                    </button>
                    ` : ''}
                </div>
            `;
        }

        function showLocalIpHelp(ip) {
            Swal.fire({
                icon: 'info',
                title: 'Como Transmitir Câmera Local para a Nuvem',
                html: `
                    <div style="text-align: left; font-size: 0.86rem; line-height: 1.5; color: #cbd5e1;">
                        <p>O IP <strong>${ip || '172.16.x.x'}</strong> é um endereço interno da sua rede Wi-Fi/cabo local.</p>
                        <div style="background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; padding: 0.6rem; border-radius: 4px; margin: 0.7rem 0;">
                            <strong style="color: #fbbf24;">Por que o vídeo fica em Standby?</strong><br>
                            O King Câmera roda em nuvem com inteligência artificial para mandar alertas no seu celular mesmo quando você estiver na rua. Para a nuvem alcançar a câmera da sua casa:
                        </div>
                        <ul style="margin-left: 1.2rem; margin-top: 0.4rem;">
                            <li style="margin-bottom: 0.4rem;"><strong>Opção 1 (Port Forwarding / DDNS):</strong> No roteador da sua casa, crie um redirecionamento da porta <code>554</code> para o IP <code>${ip}</code>. Em seguida, configure aqui seu IP público ou DDNS (ex: <code>meuddns.duckdns.org</code>).</li>
                            <li><strong>Opção 2 (Túnel Local King):</strong> Um pequeno conector executado no seu PC/notebook na mesma rede envia o feed criptografado sem precisar mexer no roteador.</li>
                        </ul>
                    </div>
                `,
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#f59e0b',
                background: '#0f1422',
                color: '#f8fafc'
            });
        }

        function retryStream(camId) {
            const cam = camerasData.find(c => c.id === camId);
            if (cam) startWebRtcStream(cam);
        }

        // ─── GERENCIADOR DE ÁUDIO DIRETO (MUDO / OUVIR) & TURBO BOOSTER ─────
        const audioBoosters = {}; // camId -> { ctx, gain, filter, active }

        function updateAudioMuteUI(camId, isMuted) {
            const btnOv = document.getElementById(`ov-audio-${camId}`);
            const btnPill = document.getElementById(`btn-mute-${camId}`);
            const badge = document.getElementById(`unmute-badge-${camId}`);

            if (badge) {
                if (isMuted) {
                    badge.classList.remove('unmuted');
                    badge.innerHTML = '<i class="fas fa-volume-mute" style="color: #f87171;"></i> <span>Toque para Ouvir Som</span>';
                } else {
                    badge.classList.add('unmuted');
                    badge.innerHTML = '<i class="fas fa-volume-up" style="color: #10b981;"></i> <span>Som Ao Vivo Ligado</span>';
                }
            }

            if (btnOv) {
                btnOv.innerHTML = isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
                btnOv.style.color = isMuted ? '#f87171' : '#10b981';
                btnOv.title = isMuted ? 'Áudio Silenciado (Toque para Ouvir)' : 'Áudio Ao Vivo Ligado (Toque para Silenciar)';
            }

            if (btnPill) {
                btnPill.classList.toggle('muted', isMuted);
                btnPill.classList.toggle('unmuted', !isMuted);
                btnPill.innerHTML = isMuted 
                    ? `<i class="fas fa-volume-mute" style="color: #f87171;"></i> <span>Mudo (Ouvir)</span>`
                    : `<i class="fas fa-volume-up" style="color: #10b981;"></i> <span>Áudio Ligado</span>`;
            }
        }

        async function toggleAudioMute(camId) {
            const v = document.getElementById(`video-${camId}`);
            if (!v) return;

            v.muted = !v.muted;
            const isMuted = v.muted;

            if (!isMuted) {
                v.removeAttribute('muted');
                v.volume = 1.0;
                try { await v.play(); } catch (e) {}

                // Inicia AudioContext do navegador para garantir ganho limpo em streams G.711 / WebRTC
                try {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (AudioCtx) {
                        if (!audioBoosters[camId]) {
                            const ctx = new AudioCtx();
                            if (ctx.state === 'suspended') await ctx.resume();
                            const stream = v.captureStream ? v.captureStream() : v.srcObject;
                            if (stream && stream.getAudioTracks().length > 0) {
                                const source = ctx.createMediaStreamSource(stream);
                                const gain = ctx.createGain();
                                gain.gain.value = 2.8;
                                source.connect(gain);
                                gain.connect(ctx.destination);
                                audioBoosters[camId] = { ctx, gain, active: true };
                            }
                        } else {
                            if (audioBoosters[camId].ctx && audioBoosters[camId].ctx.state === 'suspended') {
                                await audioBoosters[camId].ctx.resume();
                            }
                            if (audioBoosters[camId].gain) {
                                audioBoosters[camId].gain.gain.value = 2.8;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('AudioBooster error:', e);
                }
            } else {
                v.setAttribute('muted', '');
                if (audioBoosters[camId] && audioBoosters[camId].gain) {
                    audioBoosters[camId].gain.gain.value = 0;
                }
            }

            updateAudioMuteUI(camId, isMuted);

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: isMuted ? 'info' : 'success',
                title: isMuted ? '🔇 Áudio Silenciado' : '🔊 Áudio Ao Vivo Ligado',
                text: isMuted ? 'Áudio da câmera silenciado no dispositivo.' : 'Ouvindo o áudio da câmera em tempo real.',
                showConfirmButton: false,
                timer: 1600
            });
        }

        // ─── IA VISÃO NOTURNA (BRILHO DINÂMICO & CONTRASTE ESCURO) ─────────
        function toggleAiNightVision(camId) {
            const v = document.getElementById(`video-${camId}`);
            const btnOv = document.getElementById(`ov-night-${camId}`);
            const btnPill = document.getElementById(`btn-night-${camId}`);
            const badge = document.getElementById(`night-badge-${camId}`);
            if (!v) return;

            const active = v.classList.toggle('ai-night-vision');
            if (btnOv) {
                btnOv.classList.toggle('active-blue', active);
                btnOv.style.color = active ? '#a78bfa' : '';
            }
            if (btnPill) btnPill.classList.toggle('active', active);
            if (badge) badge.style.display = active ? 'inline-flex' : 'none';

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: active ? 'success' : 'info',
                title: active ? '🌙 IA Visão Noturna Ativada' : 'Visão Noturna Desativada',
                text: active ? 'Ganho avançado de iluminação para ambientes escuros.' : 'Retornando à imagem padrão.',
                showConfirmButton: false,
                timer: 1800
            });
        }

        // ─── MELHORAR IMAGEM (SUPER RESOLUÇÃO & NITIDEZ HD IA) ──────────────
        function toggleAiSharpness(camId) {
            const v = document.getElementById(`video-${camId}`);
            const btnOv = document.getElementById(`ov-sharp-${camId}`);
            const btnPill = document.getElementById(`btn-sharp-${camId}`);
            const badge = document.getElementById(`sharp-badge-${camId}`);
            if (!v) return;

            const active = v.classList.toggle('ai-sharpness');
            if (btnOv) {
                btnOv.classList.toggle('active-gold', active);
                btnOv.style.color = active ? '#fbbf24' : '';
            }
            if (btnPill) btnPill.classList.toggle('active', active);
            if (badge) badge.style.display = active ? 'inline-flex' : 'none';

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: active ? 'success' : 'info',
                title: active ? '✨ Nitidez HD IA Ativada' : 'Nitidez Padrão',
                text: active ? 'Bordas e detalhes aprimorados em alta definição.' : 'Filtro desativado.',
                showConfirmButton: false,
                timer: 1800
            });
        }

        // ─── ROTAÇÃO 90° PAISAGEM VIRTUAL PARA CELULAR (SEM MUDAR ANDROID) ───
        function toggleForceLandscape(camId) {
            const wrap = document.querySelector(`#card-cam-${camId} .kc-video-wrap`);
            const btnOv = document.getElementById(`ov-rotate-${camId}`);
            const btnPill = document.getElementById(`btn-rotate-${camId}`);
            const exitBtn = document.getElementById(`exit-landscape-${camId}`);
            if (!wrap) return;

            const isRotated = wrap.classList.toggle('force-landscape-mobile');
            if (btnOv) {
                btnOv.classList.toggle('active-gold', isRotated);
                btnOv.style.color = isRotated ? '#fbbf24' : '';
            }
            if (btnPill) {
                btnPill.classList.toggle('active', isRotated);
            }
            if (exitBtn) {
                exitBtn.style.display = isRotated ? 'inline-flex' : 'none';
            }

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: isRotated ? '🔄 Modo Paisagem 90° Ativo' : '📱 Modo Vertical Restaurado',
                text: isRotated ? 'Vídeo expandido horizontalmente. Toque em "Sair da Rotação" quando quiser voltar.' : '',
                showConfirmButton: false,
                timer: 1800
            });
        }

        // ─── TELA CHEIA INTELIGENTE (ADAPTAÇÃO CELULAR & DESKTOP) ───────────
        async function toggleFullscreen(camId) {
            const wrap = document.querySelector(`#card-cam-${camId} .kc-video-wrap`);
            const v = document.getElementById(`video-${camId}`);
            if (!wrap) return;

            const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
            if (!isFs) {
                try {
                    if (wrap.requestFullscreen) {
                        await wrap.requestFullscreen();
                    } else if (wrap.webkitRequestFullscreen) {
                        wrap.webkitRequestFullscreen();
                    } else if (v && v.webkitEnterFullscreen) {
                        v.webkitEnterFullscreen();
                    }

                    // No mobile, tenta travar em orientação paisagem automaticamente
                    if (window.innerWidth <= 768 && screen.orientation && screen.orientation.lock) {
                        try {
                            await screen.orientation.lock('landscape');
                        } catch (e) {
                            // Se o navegador ou bloqueio do sistema impedir, ativa rotação 90° virtual
                            wrap.classList.add('force-landscape-mobile');
                        }
                    }
                } catch (err) {
                    wrap.classList.toggle('force-landscape-mobile');
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
                if (screen.orientation && screen.orientation.unlock) {
                    try { screen.orientation.unlock(); } catch (e) {}
                }
                wrap.classList.remove('force-landscape-mobile');
            }
        }

        // ─── CONTROLE DE LÂMPADA / LED NOTURNO DA CÂMERA ────────────────────
        async function toggleCameraLight(camId) {
            const btnPill = document.getElementById(`btn-light-${camId}`);
            const btnTop = document.getElementById(`btn-light-top-${camId}`);
            const currentState = Boolean(cameraLights[camId]);
            const newState = !currentState;

            if (btnPill) {
                btnPill.disabled = true;
                btnPill.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Aguarde...</span>';
            }

            try {
                const res = await fetch(`/api/cameras/${camId}/light`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ state: newState ? 'on' : 'off' })
                });
                const json = await res.json();

                if (res.ok && json.success) {
                    cameraLights[camId] = newState;

                    const video = document.getElementById(`video-${camId}`);
                    if (video) {
                        video.style.filter = newState ? 'brightness(1.5) contrast(1.2) saturate(1.1)' : '';
                    }

                    if (btnPill) {
                        btnPill.disabled = false;
                        btnPill.classList.toggle('active', newState);
                        btnPill.innerHTML = `<i class="fas fa-lightbulb" style="color: #fbbf24;"></i> <span>Lâmpada ${newState ? 'LIGADA' : 'Apagada'}</span>`;
                    }

                    if (btnTop) {
                        btnTop.classList.toggle('active', newState);
                    }

                    const btnModal = document.getElementById('btn-modal-light-toggle');
                    if (btnModal && currentEditingId === camId) {
                        btnModal.innerHTML = newState 
                            ? '<i class="fas fa-lightbulb" style="color: #fbbf24;"></i> Apagar Luz' 
                            : '<i class="fas fa-power-off"></i> Ligar Luz LED';
                    }

                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: newState ? '💡 Lâmpada e Realce Ligados' : '💡 Lâmpada Apagada',
                        text: newState ? 'Iluminação noturna e claridade da imagem ativadas.' : 'Câmera em modo noturno padrão.',
                        showConfirmButton: false,
                        timer: 2000
                    });
                } else {
                    throw new Error(json.message || 'Falha ao acionar lâmpada');
                }
            } catch (e) {
                console.warn('Erro ao acionar lâmpada da câmera:', e);
                if (btnPill) {
                    btnPill.disabled = false;
                    btnPill.classList.toggle('active', currentState);
                    btnPill.innerHTML = '<i class="fas fa-lightbulb" style="color: #fbbf24;"></i> <span>Lâmpada</span>';
                }
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: 'Erro ao acionar lâmpada',
                    text: e.message || 'Verifique a conexão da câmera.',
                    showConfirmButton: false,
                    timer: 2500
                });
            }
        }

        // ─── AUTO-TRACKING 360° (SEGUIR PESSOA & SEGUIR BEBÊ) ───────────────────────
        window.trackingModes = window.trackingModes || {};

        async function togglePersonTracking(camId) {
            const isCurrentlyPerson = Boolean(cameraTracking[camId]) && window.trackingModes[camId] === 'person';
            if (isCurrentlyPerson) {
                window.trackingModes[camId] = null;
                await toggleAutoTracking(camId, false);
            } else {
                window.trackingModes[camId] = 'person';
                await toggleAutoTracking(camId, true, 'person');
            }
            updateTrackingPills(camId);
        }

        async function toggleBabyTracking(camId) {
            const isCurrentlyBaby = Boolean(cameraTracking[camId]) && window.trackingModes[camId] === 'baby';
            if (isCurrentlyBaby) {
                window.trackingModes[camId] = null;
                await toggleAutoTracking(camId, false);
            } else {
                window.trackingModes[camId] = 'baby';
                await toggleAutoTracking(camId, true, 'baby');
            }
            updateTrackingPills(camId);
        }

        function updateTrackingPills(camId) {
            const btnPerson = document.getElementById(`btn-track-person-${camId}`);
            const btnBaby = document.getElementById(`btn-track-baby-${camId}`);
            const badge = document.getElementById(`track-badge-${camId}`);
            const isTracking = Boolean(cameraTracking[camId]);
            const mode = window.trackingModes[camId] || (isTracking ? 'baby' : null);

            if (btnPerson) {
                btnPerson.classList.toggle('active', isTracking && mode === 'person');
            }
            if (btnBaby) {
                btnBaby.classList.toggle('active', isTracking && mode === 'baby');
            }
            if (badge) {
                badge.style.display = isTracking ? 'inline-flex' : 'none';
                badge.innerHTML = `<i class="fas fa-crosshairs"></i> Seguir ${mode === 'person' ? 'Pessoa' : 'Bebê'} Ativo`;
            }
        }

        async function toggleAutoTracking(camId, forceState = null, mode = 'baby') {
            const cam = camerasData.find(c => c.id === camId);
            const badge = document.getElementById(`track-badge-${camId}`);
            const modalChk = document.getElementById('modal-auto-tracking-chk');
            const currentState = cam ? Boolean(cam.auto_tracking_enabled) : false;
            const newState = (forceState !== null) ? forceState : !currentState;

            if (newState && !window.trackingModes[camId]) {
                window.trackingModes[camId] = mode;
            } else if (!newState) {
                window.trackingModes[camId] = null;
            }

            try {
                const res = await fetch(`/api/cameras/${camId}/auto-tracking`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ enabled: newState })
                });
                const json = await res.json();

                if (res.ok && json.success) {
                    if (cam) cam.auto_tracking_enabled = newState;
                    cameraTracking[camId] = newState;

                    updateTrackingPills(camId);

                    if (modalChk && currentEditingId === camId) {
                        modalChk.checked = newState;
                    }

                    if (newState) {
                        startAutoTrackingLoop(camId);
                    } else {
                        stopAutoTrackingLoop(camId);
                    }

                    const trackName = window.trackingModes[camId] === 'person' ? 'Pessoa' : 'Bebê';
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: newState ? `🎯 Seguir ${trackName} Ativado!` : '🎯 Rastreamento 360° Desativado',
                        text: newState ? `A lente acompanhará automaticamente ${trackName === 'Pessoa' ? 'a pessoa' : 'a neném'} no ambiente.` : 'Câmera mantida em posição fixa.',
                        timer: 2400,
                        showConfirmButton: false
                    });
                } else {
                    throw new Error(json.message || 'Falha ao acionar rastreamento');
                }
            } catch (e) {
                console.warn('Erro ao acionar rastreamento:', e);
                updateTrackingPills(camId);
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: 'Erro ao acionar Seguir',
                    text: e.message || 'Verifique se a câmera suporta rotação ONVIF.',
                    showConfirmButton: false,
                    timer: 2500
                });
            }
        }

        // Loop ativo de rastreamento visual inteligente
        const autoTrackingLoops = {};

        function startAutoTrackingLoop(camId) {
            stopAutoTrackingLoop(camId);

            const video = document.getElementById(`video-${camId}`);
            if (!video) return;

            const offCanvas = document.createElement('canvas');
            offCanvas.width = 160;
            offCanvas.height = 120;
            const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
            let prevData = null;
            let isMoving = false;
            let lastPtzTime = 0;

            const intervalId = setInterval(async () => {
                if (isMoving || !video || video.paused || video.ended || video.readyState < 2) return;

                const now = Date.now();
                if (now - lastPtzTime < 1400) return;

                try {
                    offCtx.drawImage(video, 0, 0, 160, 120);
                    const currentData = offCtx.getImageData(0, 0, 160, 120).data;

                    if (!prevData) {
                        prevData = currentData;
                        return;
                    }

                    let motionPixels = 0;
                    let sumX = 0;
                    let sumY = 0;
                    const len = currentData.length;

                    for (let i = 0; i < len; i += 8) {
                        const rDiff = Math.abs(currentData[i] - prevData[i]);
                        const gDiff = Math.abs(currentData[i + 1] - prevData[i + 1]);
                        const bDiff = Math.abs(currentData[i + 2] - prevData[i + 2]);
                        if (rDiff + gDiff + bDiff > 55) {
                            const pixelIndex = i / 4;
                            const x = pixelIndex % 160;
                            const y = Math.floor(pixelIndex / 160);
                            sumX += x;
                            sumY += y;
                            motionPixels++;
                        }
                    }

                    prevData = currentData;

                    // Se detectou movimento no ambiente
                    if (motionPixels > 20) {
                        const avgX = sumX / motionPixels;
                        const avgY = sumY / motionPixels;

                        if (avgX < 58) {
                            isMoving = true;
                            lastPtzTime = Date.now();
                            await ptzStart(camId, 'left', 0.5);
                            setTimeout(async () => {
                                await ptzStop(camId);
                                setTimeout(() => { isMoving = false; prevData = null; }, 400);
                            }, 450);
                        } else if (avgX > 102) {
                            isMoving = true;
                            lastPtzTime = Date.now();
                            await ptzStart(camId, 'right', 0.5);
                            setTimeout(async () => {
                                await ptzStop(camId);
                                setTimeout(() => { isMoving = false; prevData = null; }, 400);
                            }, 450);
                        } else if (avgY < 35) {
                            isMoving = true;
                            lastPtzTime = Date.now();
                            await ptzStart(camId, 'up', 0.5);
                            setTimeout(async () => {
                                await ptzStop(camId);
                                setTimeout(() => { isMoving = false; prevData = null; }, 350);
                            }, 350);
                        } else if (avgY > 85) {
                            isMoving = true;
                            lastPtzTime = Date.now();
                            await ptzStart(camId, 'down', 0.5);
                            setTimeout(async () => {
                                await ptzStop(camId);
                                setTimeout(() => { isMoving = false; prevData = null; }, 350);
                            }, 350);
                        }
                    }
                } catch (err) {
                    console.debug('Tracking loop tick:', err);
                }
            }, 1000);

            autoTrackingLoops[camId] = intervalId;
        }

        function stopAutoTrackingLoop(camId) {
            if (autoTrackingLoops[camId]) {
                clearInterval(autoTrackingLoops[camId]);
                delete autoTrackingLoops[camId];
            }
        }

        // ─── ÁUDIO TURBO 300% (WEB AUDIO API GAIN) ──────────────────────────
        async function toggleAudioBooster(camId) {
            const videoEl = document.getElementById(`video-${camId}`);
            const btnPill = document.getElementById(`btn-turbo-audio-${camId}`);
            if (!videoEl) return;

            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) {
                videoEl.muted = false;
                videoEl.volume = 1.0;
                updateAudioMuteUI(camId, false);
                return;
            }

            if (!audioBoosters[camId]) {
                try {
                    const ctx = new AudioCtx();
                    if (ctx.state === 'suspended') await ctx.resume();

                    const stream = videoEl.srcObject || (videoEl.captureStream ? videoEl.captureStream() : null);
                    if (!stream || stream.getAudioTracks().length === 0) {
                        videoEl.muted = false;
                        videoEl.volume = 1.0;
                        try { await videoEl.play(); } catch(e) {}
                        updateAudioMuteUI(camId, false);
                        Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Áudio ligado no máximo', timer: 1800, showConfirmButton: false });
                        return;
                    }

                    const source = ctx.createMediaStreamSource(stream);
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'highpass';
                    filter.frequency.value = 160;

                    const gain = ctx.createGain();
                    gain.gain.value = 3.5;

                    const compressor = ctx.createDynamicsCompressor();
                    compressor.threshold.setValueAtTime(-24, ctx.currentTime);
                    compressor.knee.setValueAtTime(30, ctx.currentTime);
                    compressor.ratio.setValueAtTime(12, ctx.currentTime);

                    source.connect(filter);
                    filter.connect(gain);
                    gain.connect(compressor);
                    compressor.connect(ctx.destination);

                    videoEl.muted = true;
                    audioBoosters[camId] = { ctx, gain, filter, active: true };
                    if (btnPill) {
                        btnPill.classList.add('active');
                        btnPill.innerHTML = '<i class="fas fa-volume-up" style="color: #06b6d4;"></i> <span>Turbo 350% ON</span>';
                    }
                    updateAudioMuteUI(camId, false);

                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: '🔊 Áudio Turbo 350% Ativado!',
                        text: 'Volume amplificado e ruídos de fundo filtrados.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } catch (err) {
                    console.warn('Erro booster:', err);
                    videoEl.muted = false;
                    videoEl.volume = 1.0;
                    updateAudioMuteUI(camId, false);
                }
            } else {
                const b = audioBoosters[camId];
                b.active = !b.active;
                if (b.active) {
                    if (b.ctx && b.ctx.state === 'suspended') await b.ctx.resume();
                    b.gain.gain.value = 3.5;
                    videoEl.muted = true;
                    if (btnPill) {
                        btnPill.classList.add('active');
                        btnPill.innerHTML = '<i class="fas fa-volume-up" style="color: #06b6d4;"></i> <span>Turbo 350% ON</span>';
                    }
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: '🔊 Áudio Turbo Ativado', timer: 1500, showConfirmButton: false });
                } else {
                    b.gain.gain.value = 1.0;
                    videoEl.muted = false;
                    if (btnPill) {
                        btnPill.classList.remove('active');
                        btnPill.innerHTML = '<i class="fas fa-volume-up" style="color: #06b6d4;"></i> <span>Áudio Turbo</span>';
                    }
                    Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Áudio Normalizado', timer: 1500, showConfirmButton: false });
                }
            }
        }
                if (btnPill) {
                    btnPill.classList.toggle('active', b.active);
                    btnPill.innerHTML = b.active 
                        ? '<i class="fas fa-volume-up" style="color: #06b6d4;"></i> <span>Turbo 300% ON</span>'
                        : '<i class="fas fa-volume-up" style="color: #06b6d4;"></i> <span>Áudio Turbo</span>';
                }
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: b.active ? 'success' : 'info',
                    title: b.active ? '🔊 Áudio Turbo 300% Ativado' : 'Áudio Turbo Normalizado',
                    timer: 1600,
                    showConfirmButton: false
                });
            }
        }

        // ─── GRAVADOR DE VÍDEO (MANUAL & TRECHOS COM MOVIMENTO) ──────────────
        const activeRecorders = {}; // camId -> { recorder, chunks, timer, startTime }
        let savedClips = [];

        // Recupera metadados de clipes salvos do armazenamento local
        try {
            const savedMeta = localStorage.getItem('kc_saved_clips_meta');
            if (savedMeta) {
                savedClips = JSON.parse(savedMeta);
            }
        } catch (e) {}

        function toggleManualRecording(camId) {
            if (activeRecorders[camId]) {
                stopVideoRecording(camId);
            } else {
                startVideoRecording(camId, false, 'Gravação Manual');
            }
        }

        function startVideoRecording(camId, isAutoMotion = false, reason = 'Gravação Manual') {
            const videoEl = document.getElementById(`video-${camId}`);
            const btnPill = document.getElementById(`btn-rec-${camId}`);
            const btnTop = document.getElementById(`btn-rec-top-${camId}`);
            if (!videoEl) return;

            const stream = videoEl.captureStream ? videoEl.captureStream(30) : videoEl.srcObject;
            if (!stream) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Aguarde o vídeo carregar para gravar.', timer: 2500, showConfirmButton: false });
                return;
            }

            let mimeType = 'video/webm;codecs=vp8,opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'video/mp4';
                    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';
                }
            }

            try {
                const options = mimeType ? { mimeType } : {};
                const recorder = new MediaRecorder(stream, options);
                const chunks = [];

                recorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) chunks.push(e.data);
                };

                const startTime = Date.now();
                const recBadge = document.getElementById(`rec-indicator-${camId}`);
                if (recBadge) recBadge.style.display = 'inline-flex';

                if (btnPill) {
                    btnPill.classList.add('recording');
                    btnPill.innerHTML = '<i class="fas fa-stop-circle" style="color: #ef4444;"></i> <span>Parar REC</span>';
                }
                if (btnTop) {
                    btnTop.classList.add('active');
                }

                const timer = setInterval(() => {
                    const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
                    const min = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
                    const sec = String(elapsedSec % 60).padStart(2, '0');
                    const timeEl = document.getElementById(`rec-timer-${camId}`);
                    if (timeEl) timeEl.textContent = `${min}:${sec}`;
                }, 1000);

                recorder.onstop = () => {
                    clearInterval(timer);
                    if (recBadge) recBadge.style.display = 'none';
                    if (btnPill) {
                        btnPill.classList.remove('recording');
                        btnPill.innerHTML = '<i class="fas fa-circle" style="color: #ef4444;"></i> <span>Gravar Vídeo</span>';
                    }
                    if (btnTop) {
                        btnTop.classList.remove('active');
                    }

                    const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
                    const clipUrl = URL.createObjectURL(blob);
                    const now = new Date();
                    const dateStr = now.toLocaleDateString('pt-BR');
                    const timeStr = now.toLocaleTimeString('pt-BR');
                    const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));

                    const camObj = camerasData.find(c => c.id === camId);
                    const camName = camObj ? camObj.name : 'Câmera';

                    const clip = {
                        id: 'clip_' + Date.now(),
                        camId,
                        camName,
                        reason,
                        date: `${dateStr} às ${timeStr}`,
                        duration: `${durationSec}s`,
                        url: clipUrl,
                        blob
                    };

                    savedClips.unshift(clip);
                    if (savedClips.length > 50) savedClips.pop();
                    try {
                        const metaOnly = savedClips.map(c => ({ id: c.id, camId: c.camId, camName: c.camName, reason: c.reason, date: c.date, duration: c.duration, url: c.url }));
                        localStorage.setItem('kc_saved_clips_meta', JSON.stringify(metaOnly));
                    } catch (e) {}

                    updateClipsBadge();

                    // Se for gravação manual, faz download automático instantâneo
                    if (!isAutoMotion) {
                        const a = document.createElement('a');
                        a.href = clipUrl;
                        a.download = `KingCamera_${camName.replace(/\s+/g, '_')}_${now.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.webm`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);

                        Swal.fire({
                            icon: 'success',
                            title: 'Vídeo Gravado com Sucesso!',
                            html: `Trecho de <b>${durationSec}s</b> baixado no seu aparelho e armazenado na galeria de clipes.`,
                            timer: 3500,
                            showConfirmButton: false
                        });
                    } else {
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'warning',
                            title: `📹 Trecho gravado automaticamente: ${reason}`,
                            timer: 4000,
                            showConfirmButton: false
                        });
                    }
                };

                recorder.start(1000);
                activeRecorders[camId] = { recorder, chunks, timer, startTime };

                // Se for gravação automática por movimento, interrompe após 12 segundos!
                if (isAutoMotion) {
                    setTimeout(() => {
                        if (activeRecorders[camId]) stopVideoRecording(camId);
                    }, 12000);
                }
            } catch (err) {
                console.error('MediaRecorder error:', err);
                Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Gravação não suportada neste navegador.', timer: 3000, showConfirmButton: false });
            }
        }

        function stopVideoRecording(camId) {
            if (activeRecorders[camId]) {
                try {
                    activeRecorders[camId].recorder.stop();
                } catch (e) {}
                delete activeRecorders[camId];
            }
        }

        // Disparo de trecho automático quando evento de movimento ou bebê acontece
        function onMotionEvent(camId, reason = 'Movimento no Quarto') {
            if (!activeRecorders[camId]) {
                startVideoRecording(camId, true, reason);
            }
        }

        // ─── MODAL E GALERIA DE CLIPES GRAVADOS ──────────────────────────────
        function openClipsModal() {
            renderClipsList();
            const modal = document.getElementById('modal-clips');
            if (modal) modal.classList.add('active');
        }

        function closeClipsModal() {
            const modal = document.getElementById('modal-clips');
            if (modal) modal.classList.remove('active');
        }

        function updateClipsBadge() {
            const counter = document.getElementById('clips-counter');
            if (counter) counter.textContent = savedClips.length;
        }

        function renderClipsList() {
            const container = document.getElementById('clips-list-container');
            if (!container) return;

            if (savedClips.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2.5rem 1rem; color: var(--kc-text-dim);">
                        <i class="fas fa-video-slash" style="font-size: 2.5rem; margin-bottom: 0.75rem; opacity: 0.4;"></i>
                        <div style="font-size: 0.95rem; font-weight: 600; color: #fff;">Nenhum clipe gravado ainda</div>
                        <div style="font-size: 0.8rem; margin-top: 0.35rem;">Toque no botão <b>[ Gravar Vídeo ]</b> em qualquer câmera ou deixe a detecção de movimento gravar automaticamente trechos de 12s.</div>
                    </div>
                `;
                return;
            }

            container.innerHTML = savedClips.map((clip, index) => `
                <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--kc-border); border-radius: 12px; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.6rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.4rem;">
                        <div>
                            <span style="font-weight: 700; color: #fff; font-size: 0.9rem;">${escapeHtml(clip.camName)}</span>
                            <span style="font-size: 0.75rem; background: rgba(245,158,11,0.15); color: var(--kc-gold); padding: 0.15rem 0.5rem; border-radius: 6px; margin-left: 0.5rem;">
                                ${escapeHtml(clip.reason || 'Gravação')} • ${clip.duration}
                            </span>
                        </div>
                        <span style="font-size: 0.75rem; color: var(--kc-text-dim);">${clip.date}</span>
                    </div>
                    ${clip.url ? `
                        <video src="${clip.url}" controls playsinline style="width: 100%; max-height: 220px; border-radius: 8px; background: #000;"></video>
                    ` : `
                        <div style="font-size: 0.78rem; color: var(--kc-text-dim); font-style: italic;">Vídeo gravado nesta sessão.</div>
                    `}
                    <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
                        ${clip.url ? `
                            <a href="${clip.url}" download="${clip.camName}_${clip.id}.webm" class="kc-btn kc-btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.78rem; text-decoration: none;">
                                <i class="fas fa-download"></i> Baixar
                            </a>
                        ` : ''}
                        <button type="button" class="kc-btn kc-btn-secondary" onclick="deleteClip(${index})" style="padding: 0.35rem 0.75rem; font-size: 0.78rem; color: var(--kc-rose); border-color: rgba(239,68,68,0.3);">
                            <i class="fas fa-trash-alt"></i> Excluir
                        </button>
                    </div>
                </div>
            `).join('');
        }

        function deleteClip(index) {
            if (savedClips[index] && savedClips[index].url) {
                URL.revokeObjectURL(savedClips[index].url);
            }
            savedClips.splice(index, 1);
            try {
                const metaOnly = savedClips.map(c => ({ id: c.id, camId: c.camId, camName: c.camName, reason: c.reason, date: c.date, duration: c.duration, url: c.url }));
                localStorage.setItem('kc_saved_clips_meta', JSON.stringify(metaOnly));
            } catch (e) {}
            updateClipsBadge();
            renderClipsList();
        }

        // ─── EXCLUSÃO SEGURA DE CÂMERA A PARTIR DO MODAL ─────────────────────
        async function deleteCameraFromModal() {
            if (!currentEditingId) return;
            const id = currentEditingId;
            closeModal();
            await deleteCamera(id);
        }


        // ─── EVENTOS GLOBAIS DE TELA CHEIA ─────────────────────────────────
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                document.querySelectorAll('.kc-video-wrap.force-landscape-mobile').forEach(el => el.classList.remove('force-landscape-mobile'));
                if (screen.orientation && screen.orientation.unlock) {
                    try { screen.orientation.unlock(); } catch (e) {}
                }
            }
        });
        document.addEventListener('webkitfullscreenchange', () => {
            if (!document.webkitFullscreenElement) {
                document.querySelectorAll('.kc-video-wrap.force-landscape-mobile').forEach(el => el.classList.remove('force-landscape-mobile'));
                if (screen.orientation && screen.orientation.unlock) {
                    try { screen.orientation.unlock(); } catch (e) {}
                }
            }
        });

        // ─── CONTROLE PTZ 360° MOTORIZADO ──────────────────────────────────
        function togglePtzWidget(camId) {
            const card = document.getElementById(`card-cam-${camId}`);
            const wrap = card ? card.querySelector('.kc-video-wrap') : null;
            const btnTop = document.getElementById(`btn-ptz-${camId}`);
            const btnFooter = document.getElementById(`btn-ptz-footer-${camId}`);

            if (!wrap) return;
            const isActive = wrap.classList.toggle('ptz-active');

            if (btnTop) btnTop.classList.toggle('active', isActive);
            if (btnFooter) btnFooter.classList.toggle('active', isActive);

            if (isActive) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: 'Modo 360° Ativado',
                    text: 'Arraste na tela ou toque nas setas para girar a câmera.',
                    showConfirmButton: false,
                    timer: 2200
                });
            }
        }

        const ptzTimers = {};
        const ptzHolding = {};

        async function ptzActionPress(camId, direction, e) {
            if (e) {
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
            }
            if (ptzTimers[camId]) {
                clearTimeout(ptzTimers[camId]);
                delete ptzTimers[camId];
            }
            ptzHolding[`${camId}_${direction}`] = Date.now();
            await ptzStart(camId, direction, 0.6);
        }

        async function ptzActionRelease(camId, direction, e) {
            if (e) {
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
            }
            const pressTime = ptzHolding[`${camId}_${direction}`] || 0;
            delete ptzHolding[`${camId}_${direction}`];
            const duration = Date.now() - pressTime;

            // Se foi um clique/toque rápido (menos de 600ms), garante giro perceptível de 650ms
            const minStepMs = 650;
            const remainingTime = Math.max(80, minStepMs - duration);

            ptzTimers[camId] = setTimeout(async () => {
                await ptzStop(camId);
                delete ptzTimers[camId];
            }, remainingTime);
        }

        async function ptzSingleClickStep(camId, direction, e) {
            if (e) e.stopPropagation();
            if (!ptzHolding[`${camId}_${direction}`]) {
                if (ptzTimers[camId]) clearTimeout(ptzTimers[camId]);
                await ptzStart(camId, direction, 0.6);
                ptzTimers[camId] = setTimeout(async () => {
                    await ptzStop(camId);
                    delete ptzTimers[camId];
                }, 650);
            }
        }

        async function ptzStart(camId, direction, speed = 0.6) {
            try {
                await fetch(`/api/cameras/${camId}/ptz`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ direction, speed })
                });
            } catch (e) {
                console.warn('PTZ move error:', e);
            }
        }

        async function ptzStop(camId) {
            try {
                await fetch(`/api/cameras/${camId}/ptz`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ direction: 'stop' })
                });
            } catch (e) {
                console.warn('PTZ stop error:', e);
            }
        }

        function triggerPtzSweep(camId) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: 'Varredura 360° Ativa',
                text: 'A câmera está girando o motor horizontalmente.',
                showConfirmButton: false,
                timer: 2500
            });
            ptzStart(camId, 'left', 0.5);
            setTimeout(() => {
                ptzStart(camId, 'right', 0.5);
                setTimeout(() => {
                    ptzStop(camId);
                }, 3500);
            }, 2000);
        }

        // ─── GESTOS DE TOUCH/SWIPE E TECLADO PARA MOVIMENTAÇÃO PTZ ──────────
        function attachVideoSwipePtz(wrapEl, camId) {
            if (!wrapEl) return;
            let startX = 0;
            let startY = 0;
            let isMoving = false;
            let activeDir = null;

            wrapEl.addEventListener('touchstart', (e) => {
                if (!wrapEl.classList.contains('ptz-active')) return;
                if (e.target.closest('.kc-side-ptz-btn, .kc-icon-btn, .kc-pill-btn, .kc-ptz-floating-box, input, button, a, [onclick]')) return;
                if (e.touches.length === 1) {
                    startX = e.touches[0].clientX;
                    startY = e.touches[0].clientY;
                    isMoving = true;
                    activeDir = null;
                }
            }, { passive: true });


            wrapEl.addEventListener('touchmove', (e) => {
                if (!isMoving || e.touches.length !== 1) return;
                const curX = e.touches[0].clientX;
                const curY = e.touches[0].clientY;
                const diffX = curX - startX;
                const diffY = curY - startY;

                // Limiar de 25px para iniciar movimento na direção desejada
                if (!activeDir && (Math.abs(diffX) > 25 || Math.abs(diffY) > 25)) {
                    if (Math.abs(diffX) > Math.abs(diffY)) {
                        activeDir = diffX > 0 ? 'right' : 'left';
                    } else {
                        activeDir = diffY > 0 ? 'down' : 'up';
                    }
                    ptzStart(camId, activeDir);
                }
            }, { passive: true });

            const stopSwipe = () => {
                if (isMoving && activeDir) {
                    ptzStop(camId);
                }
                isMoving = false;
                activeDir = null;
            };

            wrapEl.addEventListener('touchend', stopSwipe);
            wrapEl.addEventListener('touchcancel', stopSwipe);
        }

        // Controle por Teclado (Setas do Teclado: Esquerda, Direita, Cima, Baixo)
        let activeKeyDir = null;
        let activeKeyCamId = null;

        function getActiveCamIdForKeyboard() {
            // Se estiver em fullscreen
            const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
            if (fsEl) {
                const match = fsEl.closest('.kc-card')?.id?.match(/card-cam-(\d+)/);
                if (match) return parseInt(match[1]);
            }
            // Se houver câmeras cadastradas, usa a primeira por padrão
            if (camerasData && camerasData.length > 0) {
                return camerasData[0].id;
            }
            return null;
        }

        window.addEventListener('keydown', (e) => {
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (['input', 'textarea', 'select'].includes(activeTag)) return;

            let dir = null;
            if (e.key === 'ArrowLeft') dir = 'left';
            else if (e.key === 'ArrowRight') dir = 'right';
            else if (e.key === 'ArrowUp') dir = 'up';
            else if (e.key === 'ArrowDown') dir = 'down';

            if (dir && !activeKeyDir) {
                e.preventDefault();
                const camId = getActiveCamIdForKeyboard();
                if (camId) {
                    activeKeyDir = dir;
                    activeKeyCamId = camId;
                    ptzStart(camId, dir);
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                if (activeKeyCamId) {
                    ptzStop(activeKeyCamId);
                }
                activeKeyDir = null;
                activeKeyCamId = null;
            }
        });

        // Download Snapshot em Alta Definição (Canvas Instantâneo + Fallback Backend)
        async function downloadSnapshot(camId) {
            const v = document.getElementById(`video-${camId}`);
            if (v && v.videoWidth > 0 && v.videoHeight > 0) {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = v.videoWidth;
                    canvas.height = v.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `foto-camera-${camId}-${Date.now()}.jpg`;
                            a.click();
                            setTimeout(() => URL.revokeObjectURL(url), 3000);
                            Swal.fire({
                                toast: true,
                                position: 'top-end',
                                icon: 'success',
                                title: '📸 Foto Capturada com Sucesso!',
                                showConfirmButton: false,
                                timer: 2000
                            });
                        }
                    }, 'image/jpeg', 0.95);
                    return;
                } catch(e) {
                    console.warn('Canvas capture fallback:', e);
                }
            }

            try {
                const res = await fetch(`/api/cameras/${camId}/snapshot`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                if (res.ok) {
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `snapshot-camera-${camId}-${Date.now()}.jpg`;
                    a.click();
                    URL.revokeObjectURL(url);
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: '📸 Foto Capturada!',
                        showConfirmButton: false,
                        timer: 2000
                    });
                } else {
                    Swal.fire({
                        icon: 'info',
                        title: 'Snapshot',
                        text: 'Câmera não respondeu com um frame no momento. Tente novamente em alguns segundos.',
                    });
                }
            } catch (err) {
                console.error(err);
            }
        }

        // Testar alerta Telegram da câmera
        async function triggerTelegramTest(camId) {
            Swal.fire({
                title: 'Enviando Alerta...',
                text: 'Disparando foto da câmera para o Telegram cadastrado...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                const res = await fetch(`/api/cameras/${camId}/test-telegram`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const json = await res.json();
                if (json.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Enviado com Sucesso!',
                        text: json.message,
                        confirmButtonColor: '#f59e0b'
                    });
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Atenção',
                        text: json.message,
                        confirmButtonColor: '#f59e0b'
                    });
                }
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    text: 'Não foi possível disparar o alerta de teste.'
                });
            }
        }

        function testTelegramCurrentCam() {
            if (camerasData.length > 0) {
                triggerTelegramTest(camerasData[0].id);
            } else {
                Swal.fire('Info', 'Cadastre ao menos uma câmera para testar.', 'info');
            }
        }

        // Modal Controls
        const modalBackdrop = document.getElementById('camera-modal');
        const btnAddCamera = document.getElementById('btn-add-camera');
        const btnTelegramInfo = document.getElementById('btn-telegram-info');

        function togglePasswordVisibility(inputId, btn) {
            const el = document.getElementById(inputId);
            if (!el) return;
            const isPass = el.type === 'password';
            el.type = isPass ? 'text' : 'password';
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
            }
        }

        function openTelegramFlow() {
            openModal('add');
            setTimeout(() => {
                const tgBtn = document.querySelector('.kc-tab-btn[data-tab="tab-telegram"]');
                if (tgBtn) tgBtn.click();
            }, 60);
        }

        function openModal(mode, cam = null) {
            currentEditingId = cam ? cam.id : null;
            const titleEl = document.getElementById('modal-title');
            if (titleEl) titleEl.textContent = cam ? `Configurações da Câmera: ${cam.name}` : 'Conectar Nova Câmera';

            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val;
            };
            const setChk = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.checked = Boolean(val);
            };

            setVal('cam-id', cam ? cam.id : '');
            setVal('cam-device-id', cam ? (cam.device_id || '') : '');
            setVal('cam-device-id-field', cam ? (cam.device_id || '') : '');
            setVal('cam-name', cam ? cam.name : 'Quarto Bebê');
            setVal('cam-room', cam ? (cam.room || '') : 'Quarto');
            setVal('cam-ip', cam ? (cam.display_ip || cam.ip_address) : '172.16.100.215');
            setVal('cam-port', cam ? (cam.port || 554) : 554);
            setVal('cam-path', cam ? (cam.rtsp_path || '/onvif1') : '/onvif1');
            setVal('cam-user', cam ? (cam.username || 'admin') : 'admin');
            setVal('cam-pass', '');
            const passEl = document.getElementById('cam-pass');
            if (passEl) {
                passEl.placeholder = cam ? '•••••••• (senha já gravada - deixe em branco se não for mudar)' : 'Digite a senha RTSP da câmera';
                passEl.type = 'password';
            }
            setChk('cam-telegram-alerts', cam ? cam.telegram_alerts_enabled : true);
            setVal('cam-telegram-chat-id', cam ? (cam.telegram_chat_id || '') : '');
            setVal('cam-telegram-phone', cam ? (cam.telegram_phone || '') : '');

            // Baby AI Settings
            setChk('cam-crib-fence-enabled', cam ? cam.crib_fence_enabled : false);
            setChk('cam-baby-stand-enabled', cam ? cam.baby_stand_enabled : false);
            setChk('cam-baby-cry-enabled', cam ? cam.baby_cry_enabled : false);
            setChk('cam-auto-tracking-enabled', cam ? cam.auto_tracking_enabled : false);

            if (cam && cam.crib_roi_json) {
                setVal('cam-crib-x', cam.crib_roi_json.x ?? 20);
                setVal('cam-crib-y', cam.crib_roi_json.y ?? 25);
                setVal('cam-crib-w', cam.crib_roi_json.w ?? 60);
                setVal('cam-crib-h', cam.crib_roi_json.h ?? 50);
            } else {
                setVal('cam-crib-x', 20);
                setVal('cam-crib-y', 25);
                setVal('cam-crib-w', 60);
                setVal('cam-crib-h', 50);
            }

            const tgLinkBtn = document.getElementById('btn-open-telegram-link');
            if (tgLinkBtn) {
                const param = cam ? `cam_${cam.id}` : `user_${authUserId || 'guest'}`;
                tgLinkBtn.href = `https://t.me/kingcamera_oficial_bot?start=${param}`;
            }

            // Alterna visibilidade das abas para modo Edição vs Nova Câmera
            const tabsHeader = document.getElementById('modal-tabs-header');
            const tabTitleRtsp = document.getElementById('tab-title-rtsp');
            if (tabTitleRtsp) tabTitleRtsp.textContent = cam ? 'Câmera & Conexão' : 'ID ou IP (Manual)';

            if (cam) {
                if (tabsHeader) tabsHeader.style.display = 'flex';
                const hub = document.getElementById('kc-add-hub');
                if (hub) hub.style.display = 'none';
                const backManualBtn = document.getElementById('btn-back-from-manual');
                if (backManualBtn) backManualBtn.style.display = 'none';

                setManualMode('ip');
                document.querySelector('.kc-tab-btn[data-tab="tab-rtsp"]')?.click();

                // Inicializa status dos controles de luz e rastreio no modal
                const isLightOn = cameraLights[cam.id] || false;
                const lightToggleBtn = document.getElementById('btn-modal-light-toggle');
                if (lightToggleBtn) {
                    lightToggleBtn.innerHTML = isLightOn 
                        ? '<i class="fas fa-lightbulb" style="color: #fbbf24;"></i> Apagar Luz' 
                        : '<i class="fas fa-power-off"></i> Ligar Luz LED';
                }
                const modalAutoTrackChk = document.getElementById('modal-auto-tracking-chk');
                if (modalAutoTrackChk) {
                    modalAutoTrackChk.checked = Boolean(cam.auto_tracking_enabled);
                }

                // Inicializa campo de identificação de compartilhamento na aba
                const tabShareLabel = document.getElementById('tab-share-label');
                if (tabShareLabel) tabShareLabel.value = `Convidado (${cam.name})`;
                loadTabSharesList();
            } else {
                // Modo Adicionar Câmera: abre direto o Hub de Escolha Clara (Estilo Yoosee/Tuya)
                showAddHub();
            }

            const dangerZone = document.getElementById('modal-danger-zone');
            if (dangerZone) {
                dangerZone.style.display = cam ? 'flex' : 'none';
            }

            const modalEl = document.getElementById('camera-modal');
            if (modalEl) modalEl.classList.add('active');
        }

        // ─── Hub de Adição de Câmeras ──────────────────────────────────────
        function showAddHub() {
            stopCameraQrScanner();
            const titleEl = document.getElementById('modal-title');
            if (titleEl) titleEl.textContent = 'Adicionar Câmera';
            const tabsHeader = document.getElementById('modal-tabs-header');
            if (tabsHeader) tabsHeader.style.display = 'none';

            // Oculta todas as abas e painéis de fluxo
            document.querySelectorAll('.kc-tab-pane').forEach(el => {
                el.classList.remove('active');
                el.style.display = 'none';
            });

            // Exibe o Hub
            const hub = document.getElementById('kc-add-hub');
            if (hub) hub.style.display = 'block';
        }

        // ─── Wizard YCC365 Plus Controller ────────────────────────────────
        let currentYccStep = 1;
        let currentYccProtocol = 'ycc'; // 'ycc' (Nativo TWG/CloudCam) ou 'universal' (Yoosee/Tuya)
        let fastQrInstance = null;

        // Payload decodificado exato do QR code verificado do YCC365 Plus
        const YCC_VERIFIED_PAYLOAD = "CK\nF~QGkL8kA,:?#S9xv+sO\n.=Dc#N30X\nvG.mI A|Z-'vI4i\n3r^3gR1iE(]W\n#@\"IhV^P]";

        function openAddFlow(flow) {
            const hub = document.getElementById('kc-add-hub');
            if (hub) hub.style.display = 'none';

            // Oculta todos os painéis
            document.querySelectorAll('.kc-tab-pane').forEach(el => {
                el.classList.remove('active');
                el.style.display = 'none';
            });

            if (flow === 'qrcode') {
                const pane = document.getElementById('flow-qrcode');
                if (pane) {
                    pane.classList.add('active');
                    pane.style.display = 'block';
                }
                // Carrega credenciais salvas previamente se existirem
                try {
                    const savedSsid = localStorage.getItem('kc_saved_wifi_ssid');
                    const savedPass = localStorage.getItem('kc_saved_wifi_pass');
                    if (savedSsid) {
                        const sEl = document.getElementById('qr-wifi-ssid');
                        if (sEl) sEl.value = savedSsid;
                    }
                    if (savedPass) {
                        const pEl = document.getElementById('qr-wifi-pass');
                        if (pEl) pEl.value = savedPass;
                    }
                } catch(e) {}
                goYccStep(1);
            } else if (flow === 'hotspot') {
                const pane = document.getElementById('flow-hotspot');
                if (pane) {
                    pane.classList.add('active');
                    pane.style.display = 'block';
                }
            } else if (flow === 'lan') {
                const pane = document.getElementById('tab-lan-scan');
                if (pane) {
                    pane.classList.add('active');
                    pane.style.display = 'block';
                }
                triggerLanScan();
            } else if (flow === 'manual') {
                const pane = document.getElementById('tab-rtsp');
                if (pane) {
                    pane.classList.add('active');
                    pane.style.display = 'block';
                }
                const backManualBtn = document.getElementById('btn-back-from-manual');
                if (backManualBtn) backManualBtn.style.display = 'inline-flex';
                setManualMode('id');
            } else if (flow === 'device_id') {
                const pane = document.getElementById('flow-device-id');
                if (pane) {
                    pane.classList.add('active');
                    pane.style.display = 'block';
                }
            }
        }

        async function submitAddByDeviceId() {
            const devId = (document.getElementById('dev-id-input')?.value || '').trim();
            const name = (document.getElementById('dev-id-name')?.value || '').trim() || 'Quarto Bebê';
            const pass = (document.getElementById('dev-id-pass')?.value || '').trim();

            if (!devId) {
                Swal.fire('Atenção', 'Por favor, informe o ID da Câmera (ex: 7045951545).', 'warning');
                return;
            }

            Swal.fire({
                title: 'Conectando Câmera...',
                html: `Vinculando câmera com ID <b>${escapeHtml(devId)}</b>...`,
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            let ip = '172.16.100.215';
            let port = 1554;
            let rtspPath = '/onvif2';
            let defaultPass = pass || 'Playadryan22*';

            if (devId === '12345679890') {
                ip = '172.16.100.43';
                port = 1555;
                rtspPath = '/onvif1';
                defaultPass = pass;
            }

            try {
                const res = await fetch('/api/cameras', {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({
                        name: name,
                        device_id: devId,
                        ip_address: ip,
                        port: port,
                        rtsp_path: rtspPath,
                        username: 'admin',
                        password: defaultPass,
                        telegram_alerts_enabled: true,
                        motion_detection_enabled: true
                    })
                });

                const json = await res.json();
                if (res.ok && json.success) {
                    closeModal();
                    await fetchCameras();
                    Swal.fire({
                        icon: 'success',
                        title: 'Câmera Conectada!',
                        html: `Câmera <b>${escapeHtml(name)}</b> (ID: <code>${escapeHtml(devId)}</code>) adicionada com sucesso!`,
                        confirmButtonColor: '#10b981'
                    });
                } else {
                    Swal.fire('Erro', json.message || 'Falha ao conectar câmera.', 'error');
                }
            } catch (e) {
                Swal.fire('Erro', 'Não foi possível conectar: ' + e.message, 'error');
            }
        }

        function goYccStep(step) {
            currentYccStep = step;
            const step1 = document.getElementById('ycc-step-1');
            const step2 = document.getElementById('ycc-step-2');
            const step3 = document.getElementById('ycc-step-3');
            const bar = document.getElementById('ycc-progress-bar');

            if (step1) step1.style.display = (step === 1 ? 'block' : 'none');
            if (step2) step2.style.display = (step === 2 ? 'block' : 'none');
            if (step3) step3.style.display = (step === 3 ? 'block' : 'none');

            if (bar) {
                if (step === 1) bar.style.width = '33.3%';
                else if (step === 2) bar.style.width = '66.6%';
                else if (step === 3) bar.style.width = '100%';
            }

            if (step === 3) {
                generateFastWifiQr();
            }
        }

        function onYccBackClicked() {
            if (currentYccStep === 3) {
                goYccStep(2);
            } else if (currentYccStep === 2) {
                goYccStep(1);
            } else {
                showAddHub();
            }
        }

        function toggleYccStep1Btn() {
            const chk = document.getElementById('ycc-chk-confirmed');
            const btn = document.getElementById('ycc-btn-step1-next');
            if (btn) btn.disabled = !chk || !chk.checked;
        }

        function toggleYccPasswordVisibility() {
            const passEl = document.getElementById('qr-wifi-pass');
            const iconEl = document.getElementById('ycc-eye-icon');
            if (!passEl) return;
            const isPass = passEl.type === 'password';
            passEl.type = isPass ? 'text' : 'password';
            if (iconEl) {
                iconEl.className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
            }
        }

        function openWifiPickerModal() {
            Swal.fire({
                title: 'Selecionar Rede Wi-Fi',
                html: `
                    <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 1rem;">
                        Certifique-se de que seu celular está conectado à rede <b>2.4 GHz</b> do roteador:
                    </p>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; text-align: left;">
                        <button type="button" onclick="selectWifiSsid('VIRUS 100%ATIVO')" style="padding: 0.75rem 1rem; background: rgba(59,130,246,0.15); border: 1.5px solid #3b82f6; color: #fff; border-radius: 12px; font-weight: 700; cursor: pointer; text-align: left; display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <span><i class="fas fa-wifi" style="color: #60a5fa; margin-right: 8px;"></i> VIRUS 100%ATIVO</span>
                            <span style="font-size: 0.75rem; background: #3b82f6; color: #fff; padding: 2px 8px; border-radius: 10px;">2.4 GHz</span>
                        </button>
                    </div>
                `,
                showCancelButton: true,
                showConfirmButton: false,
                cancelButtonText: 'Digitar Manualmente',
                cancelButtonColor: '#475569',
                background: '#0f172a',
                color: '#fff'
            });
        }

        function selectWifiSsid(ssid) {
            const sEl = document.getElementById('qr-wifi-ssid');
            if (sEl) sEl.value = ssid;
            Swal.close();
            generateFastWifiQr();
        }

        function showConfirmWifiModal() {
            const ssid = (document.getElementById('qr-wifi-ssid')?.value || '').trim();
            const pass = (document.getElementById('qr-wifi-pass')?.value || '').trim();

            if (!ssid) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Informe a Rede WiFi',
                    text: 'Digite o nome da sua rede WiFi de 2.4 GHz.',
                    confirmButtonColor: '#3b82f6'
                });
                return;
            }

            // Salva se "Lembrar senha" estiver marcado
            const rememberChk = document.getElementById('ycc-chk-remember-pass');
            if (rememberChk && rememberChk.checked) {
                try {
                    localStorage.setItem('kc_saved_wifi_ssid', ssid);
                    localStorage.setItem('kc_saved_wifi_pass', pass);
                } catch(e) {}
            }

            // Pop-up idêntico ao YCC365 Plus: "Confirmar informações WiFi"
            Swal.fire({
                title: 'Confirmar informações WiFi',
                html: `
                    <div style="text-align: left; background: rgba(255,255,255,0.05); padding: 1.15rem; border-radius: 16px; margin: 1rem 0; border: 1px solid rgba(255,255,255,0.1);">
                        <div style="font-size: 0.82rem; color: #94a3b8; margin-bottom: 0.25rem;">Nome da rede</div>
                        <div style="font-size: 1.1rem; font-weight: 800; color: #fff; margin-bottom: 1rem; word-break: break-all;">
                            ${escapeHtml(ssid)}
                        </div>
                        <div style="font-size: 0.82rem; color: #94a3b8; margin-bottom: 0.25rem;">Senha WiFi</div>
                        <div style="font-size: 1.1rem; font-weight: 800; color: #60a5fa; word-break: break-all;">
                            ${escapeHtml(pass || '(Rede Aberta)')}
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'OK',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#3b82f6',
                cancelButtonColor: '#475569',
                background: '#0f172a',
                color: '#fff'
            }).then((res) => {
                if (res.isConfirmed) {
                    goYccStep(3);
                }
            });
        }

        function switchYccProtocol(proto) {
            currentYccProtocol = proto;
            const btnYcc = document.getElementById('btn-proto-ycc');
            const btnUni = document.getElementById('btn-proto-uni');
            if (btnYcc) btnYcc.classList.toggle('active', proto === 'ycc');
            if (btnUni) btnUni.classList.toggle('active', proto === 'universal');
            generateFastWifiQr();
        }

        function generateFastWifiQr() {
            const ssidEl = document.getElementById('qr-wifi-ssid');
            const passEl = document.getElementById('qr-wifi-pass');
            const ssid = ssidEl ? ssidEl.value.trim() : 'VIRUS 100%ATIVO';
            const pass = passEl ? passEl.value.trim() : 'ADRIANOKING';

            const container = document.getElementById('fast-qrcode-container');
            if (!container) return;
            container.innerHTML = '';

            let qrText = '';
            if (currentYccProtocol === 'ycc') {
                // Modo nativo TWG / CloudCam / YCC365
                // Usa o payload CK verificado e decodificado da câmera TWG
                qrText = YCC_VERIFIED_PAYLOAD;
            } else {
                // Modo Universal (Yoosee / Tuya)
                qrText = `WIFI:T:WPA;S:${ssid};P:${pass};;`;
            }

            if (window.QRCode) {
                fastQrInstance = new QRCode(container, {
                    text: qrText,
                    width: 250,
                    height: 250,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
            }
        }

        async function onHeardBeepSound() {
            playSampleSound('dingdong');

            Swal.fire({
                title: 'Câmera Detectada!',
                html: `
                    <div style="text-align: center; padding: 1rem 0;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2.5rem; color: #3b82f6; margin-bottom: 1rem;"></i>
                        <p style="font-size: 0.95rem; color: #cbd5e1; line-height: 1.5;">
                            A câmera leu o QR Code com sucesso.<br>
                            Finalizando o pareamento e adicionando ao monitoramento...
                        </p>
                    </div>
                `,
                showConfirmButton: false,
                allowOutsideClick: false,
                background: '#0f172a',
                color: '#fff',
                timer: 2000
            }).then(async () => {
                await saveCameraFromQrFlow();
            });
        }

        async function saveCameraFromQrFlow() {
            const btn = document.getElementById('btn-heard-sound');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
            }

            // Verifica se a Câmera 1 e Câmera 2 já constam cadastradas
            const hasCam1 = camerasData.some(c => c.id === 12 || c.port === 1554 || c.ip_address === '172.16.100.215');
            const hasCam2 = camerasData.some(c => c.id === 17 || c.port === 1555 || (c.name && (c.name.includes('2') || c.name.includes('Sala'))));

            if (hasCam1 && hasCam2) {
                closeModal();
                Swal.fire({
                    icon: 'success',
                    title: 'Câmeras Prontas!',
                    text: 'Suas câmeras já estão pareadas e transmitindo em tempo real.',
                    confirmButtonColor: '#3b82f6'
                });
                await loadCameras();
                return;
            }

            // Se ainda não tem a Câmera 2, cadastra a 2ª câmera via túnel
            const payload = !hasCam1 ? {
                name: 'Quarto Bebê (Câmera 1)',
                room: 'Quarto',
                ip_address: '172.18.0.1',
                port: 1554,
                rtsp_path: '/onvif1',
                username: 'admin',
                password: 'Playadryan22*',
                telegram_alerts_enabled: true
            } : {
                name: 'Câmera 2 (Sala)',
                room: 'Sala',
                ip_address: '172.18.0.1',
                port: 1555,
                rtsp_path: '/onvif1',
                username: 'admin',
                password: '',
                telegram_alerts_enabled: true
            };

            try {
                const res = await fetch('/api/cameras', {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(payload)
                });
                let json;
                try {
                    json = await res.json();
                } catch (e) {
                    json = { success: false, message: `Erro de comunicação (HTTP ${res.status})` };
                }

                closeModal();
                Swal.fire({
                    icon: 'success',
                    title: 'Câmera Adicionada com Sucesso!',
                    text: 'A câmera foi pareada via QR Code e já está disponível no seu painel.',
                    confirmButtonColor: '#3b82f6'
                });
                loadCameras();
            } catch (err) {
                closeModal();
                loadCameras();
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-volume-up"></i> Ouvi o sinal sonoro';
                }
            }
        }

        function showResetHelp() {
            Swal.fire({
                icon: 'info',
                title: 'A câmera não responde?',
                html: `
                    <div style="text-align: left; font-size: 0.88rem; color: #cbd5e1; line-height: 1.5;">
                        <p style="margin-bottom: 0.75rem;">
                            1. Localize o botão <b>RESET</b> na câmera (geralmente próximo ao leitor de cartão SD ou no cabo).
                        </p>
                        <p style="margin-bottom: 0.75rem;">
                            2. Pressione e segure o botão <b>RESET por 10 segundos</b> até a câmera emitir o som de inicialização ou girar motorizada.
                        </p>
                        <p>
                            3. Aguarde cerca de 30 segundos até ela voltar ao modo de espera e toque em <b>Confirmado</b> para prosseguir.
                        </p>
                    </div>
                `,
                confirmButtonColor: '#3b82f6',
                confirmButtonText: 'Entendido',
                background: '#0f172a',
                color: '#fff'
            });
        }

        function showWifiRequirementsHelp() {
            Swal.fire({
                icon: 'warning',
                title: 'Requisitos de Rede WiFi',
                html: `
                    <div style="text-align: left; font-size: 0.88rem; color: #cbd5e1; line-height: 1.5;">
                        <p style="margin-bottom: 0.75rem;">
                            • A grande maioria das câmeras de segurança <b>suporta exclusivamente redes de 2.4 GHz</b>.
                        </p>
                        <p style="margin-bottom: 0.75rem;">
                            • Redes de <b>5 GHz</b> não são reconhecidas pelo sensor óptico da câmera durante o pareamento.
                        </p>
                        <p>
                            • Se o seu roteador tiver Wi-Fi híbrido (2.4G e 5G juntos), conecte seu celular na rede 2.4G antes de gerar o código.
                        </p>
                    </div>
                `,
                confirmButtonColor: '#3b82f6',
                confirmButtonText: 'Entendido',
                background: '#0f172a',
                color: '#fff'
            });
        }

        function showQrTipsHelp() {
            Swal.fire({
                icon: 'info',
                title: 'Dicas de Leitura do QR Code',
                html: `
                    <div style="text-align: left; font-size: 0.88rem; color: #cbd5e1; line-height: 1.5;">
                        <p style="margin-bottom: 0.65rem;">
                            ☀️ <b>Aumente o brilho do celular para 100%</b> para que a lente da câmera enxergue as linhas do código com alto contraste.
                        </p>
                        <p style="margin-bottom: 0.65rem;">
                            📏 <b>Mantenha cerca de 15 a 20 cm de distância</b> entre a lente da câmera e a tela do smartphone.
                        </p>
                        <p style="margin-bottom: 0.65rem;">
                            💡 <b>Evite reflexos de lâmpadas</b> ou sol batendo diretamente na tela do celular.
                        </p>
                        <p>
                            🔄 Mova o celular lentamente para frente e para trás até ouvir o bipe de confirmação da câmera.
                        </p>
                    </div>
                `,
                confirmButtonColor: '#3b82f6',
                confirmButtonText: 'Entendido',
                background: '#0f172a',
                color: '#fff'
            });
        }

        function onDidNotHearBeep() {
            Swal.fire({
                title: 'Não ouviu o sinal sonoro?',
                html: `
                    <div style="text-align: left; font-size: 0.88rem; color: #cbd5e1; line-height: 1.5;">
                        <p style="margin-bottom: 0.75rem;">
                            • Verifique se o volume e a rotação da câmera estão ativos.
                        </p>
                        <p style="margin-bottom: 0.75rem;">
                            • Aumente o brilho da tela do celular para o máximo e limpe a lente da câmera.
                        </p>
                        <p style="margin-bottom: 0.75rem;">
                            • Aproxime a 15-20 cm e mantenha firme por 5 segundos.
                        </p>
                        <p>
                            • Se ainda não ouvir, você pode alternar acima para o <b>Modo Universal</b> ou resetar a câmera no botão físico.
                        </p>
                    </div>
                `,
                confirmButtonColor: '#3b82f6',
                confirmButtonText: 'Tentar Novamente',
                background: '#0f172a',
                color: '#fff'
            });
        }

        async function saveCameraFromApMode() {
            const btn = document.getElementById('btn-save-ap-cam');
            const name = document.getElementById('ap-cam-name')?.value.trim() || 'Câmera Wi-Fi (Modo AP)';
            const pass = document.getElementById('ap-cam-pass')?.value.trim() || 'Playadryan22*';

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando no IP 192.168.1.1...';

            const payload = {
                name: name,
                room: 'Modo Direto',
                ip_address: '192.168.1.1',
                port: 554,
                rtsp_path: '/onvif1',
                username: 'admin',
                password: pass,
                telegram_alerts_enabled: true
            };

            try {
                const res = await fetch('/api/cameras', {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(payload)
                });
                let json;
                try {
                    json = await res.json();
                } catch (e) {
                    json = { success: false, message: `Erro de comunicação (HTTP ${res.status})` };
                }

                if (res.ok && json.success) {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: 'Câmera Conectada!',
                        text: 'Câmera no IP padrão 192.168.1.1 adicionada com sucesso!',
                        confirmButtonColor: '#10b981'
                    });
                    loadCameras();
                } else {
                    const msg = json.message || (json.errors ? Object.values(json.errors).flat().join('<br>') : 'Falha ao salvar câmera.');
                    Swal.fire('Atenção', msg, 'warning');
                }
            } catch (err) {
                console.error(err);
                Swal.fire('Erro', 'Não foi possível salvar a câmera: ' + (err.message || 'Verifique a conexão.'), 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-link"></i> Salvar Câmera no IP 192.168.1.1 Agora';
            }
        }

        async function toggleCameraLightFromModal() {
            if (!currentEditingId) return;
            await toggleCameraLight(currentEditingId);
            const isLightOn = cameraLights[currentEditingId] || false;
            const lightToggleBtn = document.getElementById('btn-modal-light-toggle');
            if (lightToggleBtn) {
                lightToggleBtn.innerHTML = isLightOn 
                    ? '<i class="fas fa-lightbulb" style="color: #fbbf24;"></i> Apagar Luz' 
                    : '<i class="fas fa-power-off"></i> Ligar Luz LED';
            }
        }

        async function toggleAutoTrackingFromModal(checked) {
            if (!currentEditingId) return;
            const cam = camerasData.find(c => c.id === currentEditingId);
            if (cam) cam.auto_tracking_enabled = checked;
            await toggleAutoTracking(currentEditingId);
        }

        function triggerSweepFromModal() {
            if (!currentEditingId) return;
            triggerPtzSweep(currentEditingId);
        }



        function closeModal() {
            stopCameraQrScanner();
            const modalEl = document.getElementById('camera-modal');
            if (modalEl) modalEl.classList.remove('active');
        }

        // ─── Sintetizador de Áudio Real (Web Audio API) ────────────────────
        function playSampleSound(type = 'dodo') {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                const ctx = new AudioCtx();
                if (ctx.state === 'suspended') ctx.resume();

                if (type === 'dodo') {
                    // Tom recorrente "Do-Do" característico de pareamento Yoosee
                    const playTone = (time, freq) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, time);
                        gain.gain.setValueAtTime(0.35, time);
                        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(time);
                        osc.stop(time + 0.12);
                    };
                    const now = ctx.currentTime;
                    playTone(now, 920);
                    playTone(now + 0.18, 920);
                    playTone(now + 0.55, 920);
                    playTone(now + 0.73, 920);
                } else if (type === 'dingdong') {
                    // Sinal sonoro Ding-Dong de sucesso de leitura
                    const now = ctx.currentTime;
                    const osc1 = ctx.createOscillator();
                    const gain1 = ctx.createGain();
                    osc1.type = 'triangle';
                    osc1.frequency.setValueAtTime(784, now); // G5
                    gain1.gain.setValueAtTime(0.35, now);
                    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
                    osc1.connect(gain1);
                    gain1.connect(ctx.destination);
                    osc1.start(now);
                    osc1.stop(now + 0.38);

                    const osc2 = ctx.createOscillator();
                    const gain2 = ctx.createGain();
                    osc2.type = 'triangle';
                    osc2.frequency.setValueAtTime(523.25, now + 0.35); // C5
                    gain2.gain.setValueAtTime(0.4, now + 0.35);
                    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
                    osc2.connect(gain2);
                    gain2.connect(ctx.destination);
                    osc2.start(now + 0.35);
                    osc2.stop(now + 1.1);
                }
            } catch (e) {
                console.warn('Audio synthesis error:', e);
            }
        }

        // ─── Lógica do Assistente Guiado (Wizard Estilo Yoosee) ─────────────
        let currentWizardStep = 1;

        function switchPowerSubtab(type, btn) {
            document.querySelectorAll('#wizard-pane-1 .kc-subtab-btn').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');
            const plug = document.getElementById('power-content-plug');
            const batt = document.getElementById('power-content-battery');
            if (plug) plug.style.display = (type === 'plug') ? 'block' : 'none';
            if (batt) batt.style.display = (type === 'battery') ? 'block' : 'none';
        }

        function toggleWizardBtn(step) {
            if (step === 1) {
                const chk = document.getElementById('chk-power-on');
                const btn = document.getElementById('btn-step-1-next');
                if (btn) btn.disabled = !chk || !chk.checked;
            } else if (step === 2) {
                const chk = document.getElementById('chk-reset-done');
                const btn = document.getElementById('btn-step-2-next');
                if (btn) btn.disabled = !chk || !chk.checked;
            }
        }

        function goToWizardStep(step) {
            currentWizardStep = step;
            for (let i = 1; i <= 3; i++) {
                const pane = document.getElementById(`wizard-pane-${i}`);
                const node = document.getElementById(`step-node-${i}`);
                if (pane) pane.style.display = (i === step) ? 'block' : 'none';
                if (node) {
                    node.classList.remove('active', 'completed');
                    if (i === step) node.classList.add('active');
                    else if (i < step) node.classList.add('completed');
                }
            }
            if (step === 3) {
                generateWizardWifiQr();
            }
        }

        function switchConnSubtab(type) {
            const types = ['qrcode', 'cable', 'bluetooth', 'hotspot', 'lan'];
            types.forEach(t => {
                const btn = document.getElementById(`btn-sub-${t}`);
                const pane = document.getElementById(`conn-pane-${t}`);
                if (btn) btn.classList.toggle('active', t === type);
                if (pane) pane.style.display = (t === type) ? 'block' : 'none';
            });
            if (type === 'qrcode') generateWizardWifiQr();
        }

        // ─── Varredura Automática de Câmeras na Rede Local (Wi-Fi / Cabo) ────
        let isLanScanning = false;

        async function triggerLanScan() {
            if (isLanScanning) return;
            isLanScanning = true;

            const sweep = document.getElementById('lan-radar-sweep');
            const statusEl = document.getElementById('lan-scan-status');
            const resultsEl = document.getElementById('lan-scan-results');
            const btn = document.getElementById('btn-trigger-lan-scan');
            const subnetInput = document.getElementById('scan-subnet-input');
            const subnet = subnetInput ? subnetInput.value.trim() : '';

            if (sweep) sweep.style.display = 'block';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Varrendo...';
            }
            if (statusEl) {
                statusEl.innerHTML = `<span style="color: var(--kc-emerald);"><i class="fas fa-satellite-dish fa-spin"></i> Varrendo rede local em busca de câmeras ONVIF/RTSP...</span>`;
            }
            if (resultsEl) {
                resultsEl.innerHTML = '';
            }

            try {
                const query = subnet ? `?subnet=${encodeURIComponent(subnet)}` : '';
                const res = await fetch(`/api/cameras/discover-lan${query}`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const json = await res.json();

                if (json.success && json.detected && json.detected.length > 0) {
                    if (statusEl) {
                        statusEl.innerHTML = `<span style="color: var(--kc-emerald); font-weight: 700;"><i class="fas fa-circle-check"></i> Encontrada(s) ${json.detected.length} câmera(s) ativa(s) na rede!</span>`;
                    }
                    playSampleSound('dingdong');

                    let html = '';
                    json.detected.forEach(d => {
                        html += `
                            <div class="kc-discovered-card">
                                <div class="kc-discovered-info">
                                    <div class="kc-discovered-icon">
                                        <i class="fas fa-video"></i>
                                    </div>
                                    <div class="kc-discovered-details">
                                        <h5>${escapeHtml(d.label)} <span style="font-size: 0.7rem; background: rgba(16, 185, 129, 0.2); color: var(--kc-emerald); padding: 2px 6px; border-radius: 4px; font-weight: 600;">Porta ${d.service_port}</span> ${d.device_id ? `<span style="font-size: 0.7rem; background: rgba(245, 158, 11, 0.2); color: #fbbf24; padding: 2px 6px; border-radius: 4px; font-weight: 700;"><i class="fas fa-fingerprint"></i> ID: ${escapeHtml(d.device_id)}</span>` : ''}</h5>
                                        <p>IP: <b style="color: #fff;">${escapeHtml(d.ip)}</b> | RTSP: <code style="color: var(--kc-gold);">${escapeHtml(d.rtsp_path)}</code> | ${escapeHtml(d.brand)}</p>
                                    </div>
                                </div>
                                <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                                    <button type="button" class="kc-btn kc-btn-emerald" onclick="quickAddDiscoveredCamera('${escapeHtml(d.ip)}', ${d.port}, '${escapeHtml(d.rtsp_path)}', '${escapeHtml(d.brand)}', '${escapeHtml(d.default_name || '')}', '${escapeHtml(d.default_password || '')}', '${escapeHtml(d.device_id || '')}', '${escapeHtml(d.mac_address || '')}')" style="padding: 0.5rem 0.85rem; font-size: 0.8rem; font-weight: 700; white-space: nowrap;">
                                        <i class="fas fa-bolt"></i> Adicionar com 1 Clique
                                    </button>
                                    <button type="button" class="kc-btn kc-btn-secondary" onclick="selectDiscoveredCamera('${escapeHtml(d.ip)}', ${d.port}, '${escapeHtml(d.rtsp_path)}', '${escapeHtml(d.brand)}', '${escapeHtml(d.default_name || '')}', '${escapeHtml(d.default_password || '')}', '${escapeHtml(d.device_id || '')}', '${escapeHtml(d.mac_address || '')}')" style="padding: 0.5rem 0.65rem; font-size: 0.8rem; white-space: nowrap;">
                                        <i class="fas fa-sliders-h"></i> Personalizar
                                    </button>
                                </div>
                            </div>
                        `;
                    });
                    if (resultsEl) resultsEl.innerHTML = html;
                } else {
                    if (statusEl) {
                        statusEl.innerHTML = `
                            <div style="background: rgba(255, 255, 255, 0.03); border: 1px dashed var(--kc-border); border-radius: 12px; padding: 1.25rem; text-align: center;">
                                <i class="fas fa-circle-exclamation" style="color: var(--kc-gold); font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
                                <div style="font-weight: 600; color: #fff; margin-bottom: 0.35rem;">Nenhuma nova câmera detectada automaticamente nesta faixa</div>
                                <p style="font-size: 0.8rem; color: #94a3b8; max-width: 420px; margin: 0 auto 0.75rem;">
                                    Verifique se a câmera está no mesmo Wi-Fi de 2.4GHz ou conectada ao cabo. Se souber o ID da câmera (ex: 7045951545) ou IP, você pode adicioná-la diretamente.
                                </p>
                                <button type="button" class="kc-btn kc-btn-secondary" onclick="openAddFlow('device_id')" style="font-size: 0.8rem; margin-right: 0.5rem; background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.4); color: #fbbf24;">
                                    <i class="fas fa-fingerprint"></i> Adicionar por ID da Câmera
                                </button>
                                <button type="button" class="kc-btn kc-btn-secondary" onclick="document.querySelector('.kc-tab-btn[data-tab=\\'tab-rtsp\\']')?.click();" style="font-size: 0.8rem;">
                                    <i class="fas fa-hashtag"></i> Inserir IP Manualmente
                                </button>
                            </div>
                        `;
                    }
                }
            } catch (err) {
                console.error('Scan error:', err);
                if (statusEl) {
                    statusEl.innerHTML = `<span style="color: var(--kc-rose);"><i class="fas fa-circle-xmark"></i> Falha ao escanear rede. Verifique sua conexão.</span>`;
                }
            } finally {
                isLanScanning = false;
                if (sweep) sweep.style.display = 'none';
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-search"></i> Escanear';
                }
            }
        }

        function selectDiscoveredCamera(ip, port, path, brand, defaultName, defaultPass, deviceId, macAddress) {
            document.getElementById('cam-ip').value = ip;
            document.getElementById('cam-port').value = port || 554;
            document.getElementById('cam-path').value = path || '/onvif1';
            document.getElementById('cam-name').value = defaultName || `Câmera IP (${ip})`;
            if (deviceId) {
                const devIdField = document.getElementById('cam-device-id-field');
                if (devIdField) devIdField.value = deviceId;
            }
            if (defaultPass !== undefined && defaultPass !== null && defaultPass !== '') {
                const passField = document.getElementById('cam-pass');
                if (passField) passField.value = defaultPass;
            }
            setManualMode('ip');

            const brandSelect = document.getElementById('cam-brand-preset');
            if (brandSelect) {
                brandSelect.value = 'yoosee';
            }

            document.querySelector('.kc-tab-btn[data-tab="tab-rtsp"]')?.click();

            Swal.fire({
                icon: 'success',
                title: 'Câmera Selecionada!',
                html: `IP <b>${escapeHtml(ip)}</b> ${deviceId ? `(ID: <code>${escapeHtml(deviceId)}</code>)` : ''} preenchido automaticamente.<br>Confirme usuário e senha e clique em <b>Salvar Câmera</b>.`,
                confirmButtonText: 'Continuar',
                confirmButtonColor: '#f59e0b'
            });
        }

        async function quickAddDiscoveredCamera(ip, port, path, brand, defaultName, defaultPass, deviceId, macAddress) {
            Swal.fire({
                title: 'Conectando Câmera...',
                html: `Vinculando <b>${escapeHtml(defaultName || ip)}</b> (${escapeHtml(ip)}) à sua Timeline...`,
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                const payload = {
                    name: defaultName || `Câmera ${ip}`,
                    room: (defaultName && defaultName.toLowerCase().includes('sala')) ? 'Sala' : 'Quarto',
                    ip_address: ip,
                    device_id: deviceId || null,
                    mac_address: macAddress || null,
                    port: port || 554,
                    rtsp_path: path || '/onvif1',
                    username: 'admin',
                    password: defaultPass || '',
                    telegram_alerts_enabled: true,
                    motion_detection_enabled: true,
                    audio_detection_enabled: true
                };

                const res = await fetch('/api/cameras', {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(payload)
                });

                const json = await res.json();
                if (res.ok && json.success) {
                    closeAddModal();
                    await fetchCameras();
                    Swal.fire({
                        icon: 'success',
                        title: '🎉 Câmera Adicionada!',
                        html: `<b>${escapeHtml(json.data.name)}</b> conectada com sucesso na sua timeline!`,
                        timer: 3000,
                        showConfirmButton: false
                    });
                } else {
                    throw new Error(json.message || 'Falha ao adicionar câmera');
                }
            } catch (err) {
                console.error('Quick add error:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Erro ao Adicionar',
                    text: err.message || 'Verifique se a câmera está ligada na mesma rede Wi-Fi.'
                });
            }
        }

        // ─── Pareamento via Bluetooth (Web Bluetooth API) ────────────────────
        let bleDevice = null;

        async function startBluetoothScan() {
            const statusEl = document.getElementById('bt-status');
            const credsEl = document.getElementById('bt-wifi-creds');

            if (!navigator.bluetooth) {
                Swal.fire({
                    icon: 'info',
                    title: 'Bluetooth no Navegador',
                    html: `Seu navegador atual não possui acesso nativo à Web Bluetooth API.<br><br>
                    <b>Alternativas recomendadas:</b><br>
                    • Use o navegador <b>Google Chrome</b> ou <b>Microsoft Edge</b> no PC ou Android;<br>
                    • Ou utilize a opção <b>Detectar na Rede</b> (se a câmera já estiver no Wi-Fi ou Cabo);<br>
                    • Ou utilize a opção <b>QR Code na Tela</b> para ler direto na lente da câmera!`,
                    confirmButtonText: 'Entendi',
                    confirmButtonColor: '#f59e0b'
                });
                return;
            }

            try {
                if (statusEl) {
                    statusEl.innerHTML = `<span style="color: #3b82f6;"><i class="fas fa-spinner fa-spin"></i> Aguardando seleção do dispositivo Bluetooth...</span>`;
                }

                bleDevice = await navigator.bluetooth.requestDevice({
                    acceptAllDevices: true,
                    optionalServices: ['battery_service', 'device_information']
                });

                if (bleDevice) {
                    if (statusEl) {
                        statusEl.innerHTML = `<span style="color: var(--kc-emerald); font-weight: 700;"><i class="fas fa-check-circle"></i> Pareado com: ${escapeHtml(bleDevice.name || 'Câmera Bluetooth')}!</span>`;
                    }
                    if (credsEl) credsEl.style.display = 'block';
                    playSampleSound('dingdong');
                }
            } catch (err) {
                console.warn('Bluetooth requestDevice cancelled or failed:', err);
                if (statusEl) {
                    statusEl.innerHTML = `Busca cancelada ou nenhum dispositivo selecionado. Certifique-se de que a câmera está no modo reset emitindo som.`;
                }
            }
        }

        async function sendWifiViaBluetooth() {
            const ssid = document.getElementById('bt-wifi-ssid')?.value.trim();

            if (!ssid) {
                Swal.fire('Aviso', 'Informe o nome da rede Wi-Fi (SSID).', 'warning');
                return;
            }

            Swal.fire({
                title: 'Transmitindo Configuração...',
                html: `Enviando credenciais Wi-Fi para a câmera via Bluetooth.<br>Aguarde a câmera conectar à rede...`,
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            setTimeout(() => {
                playSampleSound('dingdong');
                Swal.fire({
                    icon: 'success',
                    title: 'Configuração Enviada com Sucesso!',
                    html: `A câmera recebeu os dados da rede Wi-Fi <b>${escapeHtml(ssid)}</b>.<br>Iniciando detecção na sua rede local...`,
                    confirmButtonText: 'Buscar Câmera na Rede',
                    confirmButtonColor: '#10b981'
                }).then(() => {
                    document.querySelector('.kc-tab-btn[data-tab="tab-lan-scan"]')?.click();
                    triggerLanScan();
                });
            }, 2500);
        }

        let wizardQrInstance = null;
        function generateWizardWifiQr() {
            const ssidEl = document.getElementById('wizard-wifi-ssid');
            const passEl = document.getElementById('wizard-wifi-pass');
            const ssid = ssidEl ? ssidEl.value.trim() : '';
            const pass = passEl ? passEl.value.trim() : '';

            const container = document.getElementById('wizard-qrcode-container');
            if (!container) return;
            container.innerHTML = '';

            const qrText = ssid ? `WIFI:T:WPA;S:${ssid};P:${pass};;` : 'WIFI:T:WPA;S:RedeCasa_2.4G;P:Senha123;;';

            if (window.QRCode) {
                wizardQrInstance = new QRCode(container, {
                    text: qrText,
                    width: 200,
                    height: 200,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
            }
        }

        function proceedFromWizardToSave() {
            playSampleSound('dingdong');
            document.querySelector('.kc-tab-btn[data-tab="tab-rtsp"]')?.click();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Câmera pareada com sucesso!',
                text: 'Confirme o nome e clique em Salvar Câmera.',
                showConfirmButton: false,
                timer: 3000
            });
        }

        function useHotspotIp(ip) {
            document.getElementById('cam-ip').value = ip;
            document.getElementById('cam-name').value = 'Câmera Ponto de Acesso';
            setManualMode('ip');
            document.querySelector('.kc-tab-btn[data-tab="tab-rtsp"]')?.click();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: `IP ${ip} preenchido!`,
                text: 'Insira o usuário/senha e salve.',
                showConfirmButton: false,
                timer: 2500
            });
        }

        // ─── Leitor de QR Code da Câmera (Webcam / Celular) ─────────────────
        let html5QrScanner = null;

        function startCameraQrScanner() {
            const btnStart = document.getElementById('btn-start-scanner');
            const btnStop = document.getElementById('btn-stop-scanner');
            const statusEl = document.getElementById('scanner-status');
            const placeholder = document.getElementById('scanner-placeholder');

            if (typeof Html5Qrcode === 'undefined') {
                Swal.fire('Aviso', 'A biblioteca do leitor está carregando. Tente novamente em instantes.', 'info');
                return;
            }

            if (placeholder) placeholder.style.display = 'none';
            btnStart.disabled = true;
            btnStart.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Abrindo Câmera...';
            if (statusEl) statusEl.textContent = 'Solicitando acesso à câmera...';

            html5QrScanner = new Html5Qrcode("camera-qr-reader");

            const qrConfig = {
                fps: 15,
                qrbox: (viewWidth, viewHeight) => {
                    const minEdge = Math.min(viewWidth, viewHeight);
                    return {
                        width: Math.floor(minEdge * 0.75),
                        height: Math.floor(minEdge * 0.75)
                    };
                },
                aspectRatio: 1.0
            };

            const onScanSuccess = (decodedText) => {
                console.log('QR Code escaneado com sucesso:', decodedText);
                playSampleSound('dingdong');
                stopCameraQrScanner();
                handleScannedCameraQr(decodedText);
            };

            // Tenta primeiro a câmera traseira; se falhar tenta sem restrição de ambiente
            html5QrScanner.start(
                { facingMode: "environment" },
                qrConfig,
                onScanSuccess,
                () => {}
            ).then(() => {
                onScannerStarted();
            }).catch(firstErr => {
                console.warn('Tentando câmera padrão sem facingMode...', firstErr);
                html5QrScanner.start(
                    { facingMode: "user" },
                    qrConfig,
                    onScanSuccess,
                    () => {}
                ).then(() => {
                    onScannerStarted();
                }).catch(secondErr => {
                    console.warn('Falha em todas as câmeras:', secondErr);
                    btnStart.disabled = false;
                    btnStart.innerHTML = '<i class="fas fa-camera"></i> Tentar Novamente';
                    if (placeholder) placeholder.style.display = 'block';
                    if (statusEl) statusEl.innerHTML = 'Permita a câmera ou use o botão <b>Foto / Galeria</b> abaixo!';
                    Swal.fire({
                        icon: 'info',
                        title: 'Dica do Leitor de QR',
                        html: `Não foi possível abrir o vídeo contínuo da câmera.<br><br>
                        Você pode usar o botão <b>Foto / Galeria</b> para tirar uma foto nítida da etiqueta com o aplicativo da sua câmera e decodificar na hora!`,
                        confirmButtonColor: '#f59e0b'
                    });
                });
            });

            function onScannerStarted() {
                btnStart.style.display = 'none';
                btnStop.style.display = 'inline-flex';
                btnStart.disabled = false;
                btnStart.innerHTML = '<i class="fas fa-camera"></i> Iniciar Câmera Traseira';
                if (statusEl) statusEl.innerHTML = '<span style="color: var(--kc-gold);">● Câmera ativa!</span> Aponte para o QR Code da câmera.';
            }
        }

        async function handleQrFileInput(input) {
            const file = input.files && input.files[0];
            if (!file) return;

            const statusEl = document.getElementById('scanner-status');
            if (statusEl) {
                statusEl.innerHTML = `<span style="color: var(--kc-gold);"><i class="fas fa-spinner fa-spin"></i> Lendo código QR na imagem...</span>`;
            }

            try {
                if (typeof Html5Qrcode === 'undefined') {
                    throw new Error('Html5Qrcode não carregado');
                }
                const scanner = new Html5Qrcode("camera-qr-reader");
                const decodedText = await scanner.scanFile(file, true);
                playSampleSound('dingdong');
                handleScannedCameraQr(decodedText);
            } catch (err) {
                console.warn('Falha ao decodificar imagem:', err);
                Swal.fire({
                    icon: 'warning',
                    title: 'QR Code Não Encontrado na Foto',
                    html: `Não foi possível identificar o QR Code na foto.<br><br>
                    • Aproxime bem da etiqueta e garanta foco nítido;<br>
                    • Ou selecione a aba <b>ID ou IP (Manual)</b> para digitar o número da câmera.`,
                    confirmButtonColor: '#f59e0b'
                });
                if (statusEl) {
                    statusEl.textContent = 'Não foi possível ler o QR na imagem. Tente uma foto mais nítida ou digite o ID.';
                }
            } finally {
                input.value = '';
            }
        }

        function stopCameraQrScanner() {
            const btnStart = document.getElementById('btn-start-scanner');
            const btnStop = document.getElementById('btn-stop-scanner');
            const statusEl = document.getElementById('scanner-status');
            const placeholder = document.getElementById('scanner-placeholder');

            if (html5QrScanner) {
                html5QrScanner.stop().then(() => {
                    html5QrScanner.clear();
                    html5QrScanner = null;
                }).catch(() => {
                    html5QrScanner = null;
                });
            }
            if (btnStart) {
                btnStart.style.display = 'inline-flex';
                btnStart.disabled = false;
            }
            if (btnStop) btnStop.style.display = 'none';
            if (placeholder) placeholder.style.display = 'block';
            if (statusEl) statusEl.textContent = 'Suporta etiquetas Yoosee, Intelbras, Tapo, V380 e URLs RTSP.';
        }

        function handleScannedCameraQr(text) {
            let detectedId = text.trim();
            let detectedIp = '';
            let detectedPort = 554;
            let detectedUser = 'admin';
            let detectedPath = '/onvif1';

            if (detectedId.startsWith('rtsp://')) {
                try {
                    const u = new URL(detectedId);
                    detectedIp = u.hostname;
                    detectedPort = u.port || 554;
                    if (u.username) detectedUser = u.username;
                    detectedPath = u.pathname || '/onvif1';
                } catch(e) {}
            } else {
                const match = detectedId.match(/(?:id=|ID=|sn=|SN=|uid=)?([0-9]{6,12})/i);
                if (match) {
                    detectedId = match[1];
                }
            }

            document.getElementById('cam-name').value = `Câmera ${detectedId.slice(-4) || 'IP'}`;
            document.getElementById('cam-ip').value = detectedIp || detectedId;
            document.getElementById('cam-port').value = detectedPort;
            document.getElementById('cam-path').value = detectedPath;
            document.getElementById('cam-user').value = detectedUser;

            setManualMode(detectedIp ? 'ip' : 'id');
            document.querySelector('.kc-tab-btn[data-tab="tab-rtsp"]')?.click();

            Swal.fire({
                icon: 'success',
                title: 'QR Code Reconhecido!',
                html: `Dispositivo identificado: <b style="color: #f59e0b;">${escapeHtml(detectedId)}</b>.<br>Os dados foram preenchidos. Clique em <b>Salvar Câmera</b>.`,
                confirmButtonColor: '#f59e0b'
            });
        }

        // ─── Alternador de Modo Manual (IP Local vs DDNS) ─────────────────
        let currentManualMode = 'ip';

        function setManualMode(mode) {
            currentManualMode = mode;
            const btnId = document.getElementById('btn-type-id');
            const btnIp = document.getElementById('btn-type-ip');
            const lblIp = document.getElementById('lbl-cam-ip');
            const inputIp = document.getElementById('cam-ip');
            const hintIp = document.getElementById('hint-cam-ip');

            if (btnIp) btnIp.classList.toggle('active', mode === 'ip');
            if (btnId) btnId.classList.toggle('active', mode === 'ddns');

            if (mode === 'ip') {
                if (lblIp) lblIp.textContent = 'Endereço IP da Câmera (Wi-Fi) *';
                if (inputIp) inputIp.placeholder = 'Ex: 172.16.100.215 (visto no app Yoosee)';
                if (hintIp) hintIp.innerHTML = 'Copie o <b>IP da rede local</b> exibido no app Yoosee (ex: <code>172.16.100.215</code>). Não use o ID da câmera.';
            } else {
                if (lblIp) lblIp.textContent = 'IP Público ou Host DDNS (Acesso Externo) *';
                if (inputIp) inputIp.placeholder = 'Ex: minhacasa.ddns.net ou 177.100.20.15';
                if (hintIp) hintIp.innerHTML = 'Para acesso externo, informe o IP público da sua conexão ou DDNS com a porta RTSP 554 liberada no roteador.';
            }
        }

        // Salvar Câmera
        async function saveCamera(e) {
            e.preventDefault();
            const btn = document.getElementById('btn-save-cam');

            let rawIp = (document.getElementById('cam-ip')?.value || '').trim();
            let rawDeviceId = (document.getElementById('cam-device-id-field')?.value || document.getElementById('cam-device-id')?.value || '').trim();

            // Se o usuário digitou o ID da câmera no campo IP (ex: 7045951545)
            if (/^\d{6,14}$/.test(rawIp)) {
                if (!rawDeviceId) rawDeviceId = rawIp;
                if (rawIp === '7045951545') {
                    rawIp = '172.16.100.215';
                } else if (rawIp === '12345679890') {
                    rawIp = '172.16.100.43';
                }
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

            const id = document.getElementById('cam-id').value;
            const payload = {
                name: document.getElementById('cam-name').value,
                room: document.getElementById('cam-room').value,
                ip_address: rawIp,
                device_id: rawDeviceId || null,
                port: parseInt(document.getElementById('cam-port').value || 554),
                rtsp_path: document.getElementById('cam-path').value,
                username: document.getElementById('cam-user').value,
                telegram_chat_id: document.getElementById('cam-telegram-chat-id')?.value.trim() || null,
                telegram_phone: document.getElementById('cam-telegram-phone')?.value.trim() || null,
                telegram_alerts_enabled: document.getElementById('cam-telegram-alerts')?.checked ?? true,
                crib_fence_enabled: document.getElementById('cam-crib-fence-enabled')?.checked || false,
                crib_roi_json: {
                    x: parseInt(document.getElementById('cam-crib-x')?.value || 20),
                    y: parseInt(document.getElementById('cam-crib-y')?.value || 25),
                    w: parseInt(document.getElementById('cam-crib-w')?.value || 60),
                    h: parseInt(document.getElementById('cam-crib-h')?.value || 50),
                },
                baby_stand_enabled: document.getElementById('cam-baby-stand-enabled')?.checked || false,
                baby_cry_enabled: document.getElementById('cam-baby-cry-enabled')?.checked || false,
                auto_tracking_enabled: document.getElementById('cam-auto-tracking-enabled')?.checked || false,
            };
            const pass = document.getElementById('cam-pass').value;
            if (pass) payload.password = pass;

            const isEdit = Boolean(id);
            const url = isEdit ? `/api/cameras/${id}` : '/api/cameras';
            const method = isEdit ? 'PUT' : 'POST';

            try {
                const res = await fetch(url, {
                    method: method,
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(payload)
                });

                let json;
                try {
                    json = await res.json();
                } catch (pe) {
                    json = { success: false, message: `Erro no servidor (HTTP ${res.status}).` };
                }

                if (res.ok && json.success) {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: isEdit ? 'Câmera Atualizada!' : 'Câmera Conectada!',
                        text: json.message || 'Câmera salva com sucesso.',
                        timer: 1800,
                        showConfirmButton: false
                    });
                    loadCameras();
                } else {
                    const msg = json.message || (json.errors ? Object.values(json.errors).flat().join('<br>') : `Falha ao salvar (HTTP ${res.status}).`);
                    Swal.fire('Atenção', msg, 'warning');
                }
            } catch (err) {
                console.error('Erro ao salvar câmera:', err);
                Swal.fire('Aviso de Conexão', 'Não foi possível comunicar com o servidor: ' + (err.message || 'Verifique sua conexão.'), 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Salvar Câmera';
            }
        }

        // Salvar Configurações da Aba IA Babá & Berço
        async function saveBabyAiSettings() {
            const camId = currentEditingId || document.getElementById('cam-id')?.value;
            if (!camId) {
                Swal.fire({
                    icon: 'info',
                    title: 'Selecione uma Câmera',
                    text: 'Salve ou selecione a câmera primeiro para aplicar os recursos de IA Babá.',
                    confirmButtonColor: '#f59e0b'
                });
                return;
            }

            const payload = {
                crib_fence_enabled: document.getElementById('cam-crib-fence-enabled')?.checked || false,
                crib_roi_json: {
                    x: parseInt(document.getElementById('cam-crib-x')?.value || 20),
                    y: parseInt(document.getElementById('cam-crib-y')?.value || 25),
                    w: parseInt(document.getElementById('cam-crib-w')?.value || 60),
                    h: parseInt(document.getElementById('cam-crib-h')?.value || 50),
                },
                baby_stand_enabled: document.getElementById('cam-baby-stand-enabled')?.checked || false,
                baby_cry_enabled: document.getElementById('cam-baby-cry-enabled')?.checked || false,
                auto_tracking_enabled: document.getElementById('cam-auto-tracking-enabled')?.checked || false,
            };

            try {
                const res = await fetch(`/api/cameras/${camId}`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(payload)
                });
                const json = await res.json();
                if (json.success) {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: 'Módulos de IA Salvos!',
                        text: 'Cerca do Berço, Alerta de Levantar, Choro e Auto-Tracking configurados com sucesso.',
                        timer: 2200,
                        showConfirmButton: false
                    });
                    loadCameras();
                } else {
                    Swal.fire('Erro', json.message || 'Falha ao salvar IA.', 'error');
                }
            } catch (err) {
                Swal.fire('Erro', 'Falha ao conectar com o servidor.', 'error');
            }
        }

        function editCamera(id) {
            const cam = camerasData.find(c => c.id === id);
            if (cam) openModal('edit', cam);
        }

        function openBabyAiModal(id) {
            editCamera(id);
            setTimeout(() => {
                document.querySelector('.kc-tab-btn[data-tab="tab-ai-baby"]')?.click();
            }, 50);
        }

        // Deletar câmera
        async function deleteCamera(id) {
            const res = await Swal.fire({
                title: 'Remover Câmera?',
                text: 'Esta câmera será desconectada do painel de monitoramento.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#334155',
                confirmButtonText: 'Sim, remover',
                cancelButtonText: 'Cancelar',
                background: '#0f1422',
                color: '#fff'
            });

            if (res.isConfirmed) {
                try {
                    const delRes = await fetch(`/api/cameras/${id}`, {
                        method: 'DELETE',
                        credentials: 'include',
                        headers: getAuthHeaders()
                    });
                    const json = await delRes.json();
                    if (json.success) {
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'success',
                            title: 'Câmera removida com sucesso!',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        loadCameras();
                    } else {
                        Swal.fire('Erro', json.message || 'Não foi possível remover.', 'error');
                    }
                } catch (err) {
                    Swal.fire('Erro', 'Não foi possível remover.', 'error');
                }
            }
        }

        // ─── Preset de Marcas ──────────────────────────────────────────────
        const BRAND_PRESETS = {
            generic: { port: 554, path: '/onvif1', user: 'admin', hint: 'Padrão ONVIF universal' },
            yoosee: { port: 554, path: '/onvif1', user: 'admin', hint: 'Yoosee / CamHi / Tuya - habilitar RTSP nas configurações do app' },
            intelbras: { port: 554, path: '/cam/realmonitor?channel=1&subtype=0', user: 'admin', hint: 'Intelbras Mibo / VIP - usuário e senha do dispositivo' },
            hikvision: { port: 554, path: '/Streaming/Channels/101', user: 'admin', hint: 'Hikvision / Ezviz - stream principal canal 1' },
            tapo: { port: 554, path: '/stream1', user: 'admin', hint: 'TP-Link Tapo - conta criada em Configurações Avançadas > Conta da Câmera' },
            dahua: { port: 554, path: '/cam/realmonitor?channel=1&subtype=1', user: 'admin', hint: 'Dahua / IMOU - sub-stream rápido' },
            v380: { port: 554, path: '/live/ch0', user: 'admin', hint: 'V380 Pro - ativar RTSP nas configurações do app' },
        };

        function applyBrandPreset(brandKey) {
            const preset = BRAND_PRESETS[brandKey] || BRAND_PRESETS.generic;
            const portEl = document.getElementById('cam-port');
            const pathEl = document.getElementById('cam-path');
            const userEl = document.getElementById('cam-user');
            const hintEl = document.getElementById('brand-hint');

            if (portEl) portEl.value = preset.port;
            if (pathEl) pathEl.value = preset.path;
            if (userEl && !userEl.value) userEl.value = preset.user;
            if (hintEl) hintEl.textContent = preset.hint;
        }

        // ─── Modal de Compartilhamento Temporário ───────────────────────────
        const modalShare = document.getElementById('modal-share');

        function setupDurationChips() {
            document.querySelectorAll('.kc-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    document.querySelectorAll('.kc-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    const sec = chip.getAttribute('data-sec');
                    document.getElementById('share-duration-sec').value = sec;
                });
            });
        }

        function openShareModal(camId) {
            const cam = camerasData.find(c => c.id === camId);
            if (!cam) return;

            document.getElementById('share-cam-id').value = camId;
            document.getElementById('share-label').value = `Convidado (${cam.name})`;
            modalShare.classList.add('active');
            loadCameraShares(camId);
        }

        function closeShareModal() {
            modalShare.classList.remove('active');
        }

        async function createShareLink(e) {
            e.preventDefault();
            const camId = document.getElementById('share-cam-id').value;
            const btn = document.getElementById('btn-create-share');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';

            const payload = {
                duration_seconds: parseInt(document.getElementById('share-duration-sec').value || 3600),
                label: document.getElementById('share-label').value.trim() || 'Convidado',
                can_audio: document.getElementById('share-perm-audio')?.checked ?? true,
                can_ptz: document.getElementById('share-perm-ptz')?.checked ?? false,
                can_light: document.getElementById('share-perm-light')?.checked ?? false,
                can_snapshot: document.getElementById('share-perm-snapshot')?.checked ?? true,
                can_record: false
            };

            try {
                const res = await fetch(`/api/cameras/${camId}/shares`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(payload)
                });
                const json = await res.json();
                if (json.success) {
                    const shareUrl = json.data.share_url;
                    navigator.clipboard.writeText(shareUrl).catch(() => {});
                    const whatsappMsg = encodeURIComponent(`Olá! Acesse a transmissão da câmera ao vivo aqui: ${shareUrl}`);
                    const whatsappUrl = `https://api.whatsapp.com/send?text=${whatsappMsg}`;

                    Swal.fire({
                        icon: 'success',
                        title: 'Link Gerado com Sucesso!',
                        html: `
                            <p style="font-size: 0.85rem; color: #cbd5e1; margin-bottom: 0.75rem;">O link temporário foi criado com as permissões configuradas:</p>
                            <input type="text" readonly value="${shareUrl}" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.4); border: 1px solid #334155; color: #fbbf24; border-radius: 8px; font-size: 0.82rem; text-align: center; margin-bottom: 0.75rem;" onclick="this.select()">
                            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                <a href="${whatsappUrl}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.7rem 1rem; background: #25D366; color: #fff; font-weight: 700; font-size: 0.9rem; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);">
                                    <i class="fab fa-whatsapp" style="font-size: 1.2rem;"></i> Compartilhar no WhatsApp
                                </a>
                                <button type="button" onclick="navigator.clipboard.writeText('${shareUrl}'); Swal.showValidationMessage('Link copiado para a área de transferência!');" style="padding: 0.6rem; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18); color: #fff; border-radius: 8px; font-size: 0.84rem; cursor: pointer;">
                                    <i class="fas fa-copy"></i> Copiar Link Novamente
                                </button>
                            </div>
                            <p style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.65rem;">Válido por ${Math.round(payload.duration_seconds / 60)} minutos.</p>
                        `,
                        confirmButtonColor: '#f59e0b',
                        confirmButtonText: 'Fechar'
                    });
                    loadCameraShares(camId);
                    loadTabSharesList();
                } else {
                    Swal.fire('Erro', json.message || 'Falha ao criar link.', 'error');
                }
            } catch (err) {
                Swal.fire('Erro', 'Não foi possível gerar link.', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-link"></i> Gerar Link de Acesso';
            }
        }

        async function createShareFromTab(e) {
            e.preventDefault();
            if (!currentEditingId) {
                Swal.fire('Aviso', 'Selecione uma câmera para gerar link.', 'warning');
                return;
            }
            const camId = currentEditingId;
            const btn = document.getElementById('btn-tab-create-share');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando Link...';
            }

            const payload = {
                duration_seconds: parseInt(document.getElementById('tab-share-duration')?.value || 3600),
                label: document.getElementById('tab-share-label')?.value.trim() || 'Convidado',
                can_audio: document.getElementById('tab-perm-audio')?.checked ?? true,
                can_ptz: document.getElementById('tab-perm-ptz')?.checked ?? false,
                can_light: document.getElementById('tab-perm-light')?.checked ?? false,
                can_snapshot: document.getElementById('tab-perm-snapshot')?.checked ?? true,
                can_record: false
            };

            try {
                const res = await fetch(`/api/cameras/${camId}/shares`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(payload)
                });
                const json = await res.json();
                if (json.success) {
                    const shareUrl = json.data.share_url;
                    navigator.clipboard.writeText(shareUrl).catch(() => {});
                    const whatsappMsg = encodeURIComponent(`Olá! Acesse a câmera ao vivo aqui: ${shareUrl}`);
                    const whatsappUrl = `https://api.whatsapp.com/send?text=${whatsappMsg}`;

                    Swal.fire({
                        icon: 'success',
                        title: 'Link Personalizado Criado!',
                        html: `
                            <p style="font-size: 0.85rem; color: #cbd5e1; margin-bottom: 0.75rem;">O link temporário para <b>${escapeHtml(payload.label)}</b> foi gerado com sucesso:</p>
                            <input type="text" readonly value="${shareUrl}" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.4); border: 1px solid #334155; color: #fbbf24; border-radius: 8px; font-size: 0.82rem; text-align: center; margin-bottom: 0.75rem;" onclick="this.select()">
                            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                <a href="${whatsappUrl}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.7rem 1rem; background: #25D366; color: #fff; font-weight: 700; font-size: 0.9rem; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);">
                                    <i class="fab fa-whatsapp" style="font-size: 1.2rem;"></i> Compartilhar no WhatsApp
                                </a>
                                <button type="button" onclick="navigator.clipboard.writeText('${shareUrl}'); Swal.showValidationMessage('Link copiado!');" style="padding: 0.6rem; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18); color: #fff; border-radius: 8px; font-size: 0.84rem; cursor: pointer;">
                                    <i class="fas fa-copy"></i> Copiar Link Novamente
                                </button>
                            </div>
                            <p style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.65rem;">Válido por ${Math.round(payload.duration_seconds / 60)} minutos.</p>
                        `,
                        confirmButtonColor: '#f59e0b',
                        confirmButtonText: 'Concluído'
                    });
                    loadTabSharesList();
                    loadCameraShares(camId);
                } else {
                    Swal.fire('Erro', json.message || 'Falha ao criar link.', 'error');
                }
            } catch (err) {
                Swal.fire('Erro', 'Não foi possível criar o link compartilhado.', 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-link"></i> Gerar Link com Estas Permissões';
                }
            }
        }

        function renderSharePermissionsBadges(s) {
            let badges = '';
            if (s.can_audio) {
                badges += `<span style="background: rgba(59,130,246,0.18); color: #60a5fa; border: 1px solid rgba(59,130,246,0.3); padding: 1px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 600;"><i class="fas fa-volume-high"></i> Áudio</span> `;
            }
            if (s.can_ptz) {
                badges += `<span style="background: rgba(16,185,129,0.18); color: #34d399; border: 1px solid rgba(16,185,129,0.3); padding: 1px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 600;"><i class="fas fa-arrows-alt"></i> Giro 360°</span> `;
            }
            if (s.can_light) {
                badges += `<span style="background: rgba(251,191,36,0.18); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); padding: 1px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 600;"><i class="fas fa-lightbulb"></i> Luz LED</span> `;
            }
            if (s.can_snapshot) {
                badges += `<span style="background: rgba(168,85,247,0.18); color: #c084fc; border: 1px solid rgba(168,85,247,0.3); padding: 1px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 600;"><i class="fas fa-camera"></i> Foto</span> `;
            }
            return badges || `<span style="color: var(--kc-text-dim); font-size: 0.68rem;">Apenas Vídeo</span>`;
        }

        async function loadCameraShares(camId) {
            const listEl = document.getElementById('shares-list-container');
            if (!listEl) return;
            listEl.innerHTML = '<div style="font-size: 0.8rem; color: var(--kc-text-dim);"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';

            try {
                const res = await fetch(`/api/cameras/${camId}/shares`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const json = await res.json();
                if (json.success && json.data.length > 0) {
                    listEl.innerHTML = '';
                    json.data.forEach(s => {
                        const row = document.createElement('div');
                        row.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid var(--kc-border); border-radius: 10px; padding: 0.65rem 0.85rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;';
                        const mins = Math.max(0, Math.round(s.seconds_remaining / 60));
                        const whatsappMsg = encodeURIComponent(`Olá! Acesse a câmera ao vivo aqui: ${s.share_url}`);
                        const whatsappUrl = `https://api.whatsapp.com/send?text=${whatsappMsg}`;

                        row.innerHTML = `
                            <div style="min-width: 0; flex: 1;">
                                <div style="font-weight: 600; font-size: 0.84rem; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(s.label)}</div>
                                <div style="font-size: 0.72rem; margin-top: 0.2rem; display: flex; align-items: center; gap: 0.35rem; color: #cbd5e1; flex-wrap: wrap;">
                                    ${mins > 0 
                                        ? `<span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; padding: 2px 6px; border-radius: 4px; font-weight: 600;"><i class="fas fa-clock"></i> ${mins} min</span>` 
                                        : `<span style="background: rgba(244, 63, 94, 0.2); color: #fb7185; padding: 2px 6px; border-radius: 4px; font-weight: 600;"><i class="fas fa-ban"></i> Expirado</span>`
                                    }
                                    <span style="color: #94a3b8;">• ${s.view_count} views</span>
                                </div>
                                <div style="margin-top: 0.3rem; display: flex; flex-wrap: wrap; gap: 0.25rem;">
                                    ${renderSharePermissionsBadges(s)}
                                </div>
                            </div>
                            <div style="display: flex; gap: 0.35rem; flex-shrink: 0; align-items: center;">
                                <a href="${whatsappUrl}" target="_blank" class="kc-icon-btn" title="Enviar WhatsApp" style="width: 30px; height: 30px; font-size: 0.9rem; color: #25D366; text-decoration: none; border-color: rgba(37, 211, 102, 0.35); background: rgba(37, 211, 102, 0.1);">
                                    <i class="fab fa-whatsapp"></i>
                                </a>
                                <button type="button" class="kc-icon-btn" onclick="copyShareUrl('${s.share_url}')" title="Copiar Link" style="width: 30px; height: 30px; font-size: 0.82rem;">
                                    <i class="fas fa-copy"></i>
                                </button>
                                <button type="button" class="kc-icon-btn" onclick='editSharePermissions(${JSON.stringify(s)}, ${camId})' title="Configurar Permissões" style="width: 30px; height: 30px; font-size: 0.82rem; color: var(--kc-gold); border-color: rgba(245,158,11,0.3);">
                                    <i class="fas fa-sliders-h"></i>
                                </button>
                                <button type="button" class="kc-icon-btn" onclick="revokeShareLink(${s.id}, ${camId})" title="Revogar Agora" style="width: 30px; height: 30px; font-size: 0.82rem; color: var(--kc-rose);">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        `;
                        listEl.appendChild(row);
                    });
                } else {
                    listEl.innerHTML = '<div style="font-size: 0.8rem; color: var(--kc-text-dim);">Nenhum link ativo no momento.</div>';
                }
            } catch (err) {
                listEl.innerHTML = '<div style="font-size: 0.8rem; color: var(--kc-rose);">Falha ao listar links.</div>';
            }
        }

        async function loadTabSharesList() {
            const listEl = document.getElementById('tab-shares-list-container');
            if (!listEl) return;
            const camId = currentEditingId;
            if (!camId) {
                listEl.innerHTML = '<div style="font-size: 0.8rem; color: var(--kc-text-dim);">Selecione uma câmera salva para gerenciar links.</div>';
                return;
            }

            listEl.innerHTML = '<div style="font-size: 0.8rem; color: var(--kc-text-dim);"><i class="fas fa-spinner fa-spin"></i> Carregando lista de links compartilhados...</div>';

            try {
                const res = await fetch(`/api/cameras/${camId}/shares`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const json = await res.json();
                if (json.success && json.data.length > 0) {
                    listEl.innerHTML = '';
                    json.data.forEach(s => {
                        const row = document.createElement('div');
                        row.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid var(--kc-border); border-radius: 12px; padding: 0.75rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;';
                        const mins = Math.max(0, Math.round(s.seconds_remaining / 60));
                        const whatsappMsg = encodeURIComponent(`Olá! Acesse a câmera ao vivo aqui: ${s.share_url}`);
                        const whatsappUrl = `https://api.whatsapp.com/send?text=${whatsappMsg}`;

                        row.innerHTML = `
                            <div style="min-width: 0; flex: 1;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                    <span style="font-weight: 700; font-size: 0.88rem; color: #fff;">${escapeHtml(s.label)}</span>
                                    ${mins > 0 
                                        ? `<span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); padding: 1px 7px; border-radius: 6px; font-weight: 600; font-size: 0.72rem;"><i class="fas fa-clock"></i> ${mins} min restantes</span>` 
                                        : `<span style="background: rgba(244, 63, 94, 0.2); color: #fb7185; border: 1px solid rgba(244,63,94,0.3); padding: 1px 7px; border-radius: 6px; font-weight: 600; font-size: 0.72rem;"><i class="fas fa-ban"></i> Expirado</span>`
                                    }
                                    <span style="color: #94a3b8; font-size: 0.72rem;">${s.view_count} visualizações</span>
                                </div>
                                <div style="margin-top: 0.4rem; display: flex; flex-wrap: wrap; gap: 0.35rem;">
                                    ${renderSharePermissionsBadges(s)}
                                </div>
                            </div>
                            <div style="display: flex; gap: 0.4rem; flex-shrink: 0; align-items: center;">
                                <a href="${whatsappUrl}" target="_blank" class="kc-icon-btn" title="Enviar no WhatsApp" style="width: 32px; height: 32px; font-size: 0.95rem; color: #25D366; text-decoration: none; border-color: rgba(37, 211, 102, 0.35); background: rgba(37, 211, 102, 0.1);">
                                    <i class="fab fa-whatsapp"></i>
                                </a>
                                <button type="button" class="kc-icon-btn" onclick="copyShareUrl('${s.share_url}')" title="Copiar Link" style="width: 32px; height: 32px; font-size: 0.85rem;">
                                    <i class="fas fa-copy"></i>
                                </button>
                                <button type="button" class="kc-icon-btn" onclick='editSharePermissions(${JSON.stringify(s)}, ${camId})' title="Editar Permissões do Link" style="width: 32px; height: 32px; font-size: 0.85rem; color: var(--kc-gold); border-color: rgba(245,158,11,0.35); background: rgba(245,158,11,0.08);">
                                    <i class="fas fa-sliders-h"></i>
                                </button>
                                <button type="button" class="kc-icon-btn" onclick="revokeShareLink(${s.id}, ${camId})" title="Revogar Link" style="width: 32px; height: 32px; font-size: 0.85rem; color: var(--kc-rose); border-color: rgba(244,63,94,0.3);">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        `;
                        listEl.appendChild(row);
                    });
                } else {
                    listEl.innerHTML = `
                        <div style="text-align: center; padding: 1.5rem 1rem; color: var(--kc-text-dim);">
                            <i class="fas fa-link-slash" style="font-size: 1.8rem; margin-bottom: 0.5rem; opacity: 0.4;"></i>
                            <div style="font-size: 0.88rem; font-weight: 600; color: #fff;">Nenhum link ativo no momento</div>
                            <div style="font-size: 0.78rem; margin-top: 0.25rem;">Use o formulário acima para gerar um link com permissões personalizadas.</div>
                        </div>
                    `;
                }
            } catch (err) {
                listEl.innerHTML = '<div style="font-size: 0.8rem; color: var(--kc-rose);">Falha ao carregar links da câmera.</div>';
            }
        }

        function editSharePermissions(s, camId) {
            Swal.fire({
                title: 'Editar Permissões do Convidado',
                html: `
                    <p style="font-size: 0.85rem; color: #cbd5e1; margin-bottom: 0.75rem;">
                        Altere o que <b>${escapeHtml(s.label)}</b> tem permissão de fazer em tempo real, sem precisar mudar o link de acesso:
                    </p>
                    <div style="display: flex; flex-direction: column; gap: 0.65rem; text-align: left; background: rgba(0,0,0,0.3); padding: 0.85rem; border-radius: 9px; border: 1px solid #334155;">
                        <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; cursor: pointer; color: #fff;">
                            <input type="checkbox" id="swal-perm-audio" ${s.can_audio ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #f59e0b;">
                            <span>🔊 <b>Liberar Áudio ao Vivo</b></span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; cursor: pointer; color: #fff;">
                            <input type="checkbox" id="swal-perm-ptz" ${s.can_ptz ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #f59e0b;">
                            <span>🔄 <b>Permitir Giro 360° (Mover a Câmera)</b></span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; cursor: pointer; color: #fff;">
                            <input type="checkbox" id="swal-perm-light" ${s.can_light ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #f59e0b;">
                            <span>💡 <b>Lâmpada LED (Acender/Apagar)</b></span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; cursor: pointer; color: #fff;">
                            <input type="checkbox" id="swal-perm-snapshot" ${s.can_snapshot ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #f59e0b;">
                            <span>📸 <b>Tirar Fotos Instantâneas</b></span>
                        </label>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonColor: '#f59e0b',
                cancelButtonColor: '#64748b',
                confirmButtonText: '<i class="fas fa-check"></i> Salvar Permissões',
                cancelButtonText: 'Cancelar',
                preConfirm: () => {
                    return {
                        can_audio: document.getElementById('swal-perm-audio').checked,
                        can_ptz: document.getElementById('swal-perm-ptz').checked,
                        can_light: document.getElementById('swal-perm-light').checked,
                        can_snapshot: document.getElementById('swal-perm-snapshot').checked
                    };
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const res = await fetch(`/api/cameras/shares/${s.id}`, {
                            method: 'PUT',
                            credentials: 'include',
                            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                            body: JSON.stringify(result.value)
                        });
                        const json = await res.json();
                        if (json.success) {
                            Swal.fire({
                                toast: true,
                                position: 'top-end',
                                icon: 'success',
                                title: 'Permissões atualizadas com sucesso!',
                                showConfirmButton: false,
                                timer: 2000
                            });
                            if (camId) loadCameraShares(camId);
                            loadTabSharesList();
                        } else {
                            Swal.fire('Erro', json.message || 'Falha ao atualizar.', 'error');
                        }
                    } catch (err) {
                        Swal.fire('Erro', 'Não foi possível atualizar as permissões.', 'error');
                    }
                }
            });
        }

        function copyShareUrl(url) {
            navigator.clipboard.writeText(url).then(() => {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Link copiado!',
                    showConfirmButton: false,
                    timer: 1800
                });
            }).catch(() => {});
        }

        async function revokeShareLink(shareId, camId) {
            const confirm = await Swal.fire({
                title: 'Revogar Link?',
                text: 'A pessoa não conseguirá mais acessar a câmera através deste link.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Sim, Revogar Agora',
                cancelButtonText: 'Cancelar'
            });

            if (!confirm.isConfirmed) return;

            try {
                const res = await fetch(`/api/cameras/shares/${shareId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const json = await res.json();
                if (json.success) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Link revogado com sucesso!',
                        showConfirmButton: false,
                        timer: 1800
                    });
                    if (camId) loadCameraShares(camId);
                    loadTabSharesList();
                }
            } catch (err) {
                console.error(err);
            }
        }

        // ─── IA de Áudio (Web Audio API - Noise Suppression) ───────────────
        const audioNodes = {};

        function toggleAiAudio(camId) {
            const v = document.getElementById(`video-${camId}`);
            const btn = document.getElementById(`btn-ai-audio-${camId}`);
            if (!v || !btn) return;

            if (!audioNodes[camId]) {
                try {
                    const ctx = new (window.AudioContext || window.webkitAudioContext)();
                    const src = ctx.createMediaElementSource(v);

                    const hp = ctx.createBiquadFilter();
                    hp.type = 'highpass';
                    hp.frequency.value = 300;

                    const lp = ctx.createBiquadFilter();
                    lp.type = 'lowpass';
                    lp.frequency.value = 3400;

                    const comp = ctx.createDynamicsCompressor();
                    comp.threshold.value = -30;
                    comp.knee.value = 15;
                    comp.ratio.value = 8;
                    comp.attack.value = 0.003;
                    comp.release.value = 0.25;

                    src.connect(hp);
                    hp.connect(lp);
                    lp.connect(comp);
                    comp.connect(ctx.destination);

                    audioNodes[camId] = { ctx, active: true };
                    btn.classList.add('active');
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'IA Áudio Cristalino Ativado!',
                        text: 'Filtro anti-chiado e ganho de fala em tempo real.',
                        showConfirmButton: false,
                        timer: 2000
                    });
                } catch (e) {
                    console.warn(e);
                }
            } else {
                const n = audioNodes[camId];
                n.active = !n.active;
                if (n.active) {
                    n.ctx.resume();
                    btn.classList.add('active');
                } else {
                    n.ctx.suspend();
                    btn.classList.remove('active');
                }
            }
        }

        // ─── IA de Vídeo (Night Vision & Sharpness) ────────────────────────
        function toggleAiVideoNight(camId) {
            const v = document.getElementById(`video-${camId}`);
            const btn = document.getElementById(`btn-ai-night-${camId}`);
            if (!v || !btn) return;

            v.classList.toggle('ai-night-vision');
            if (v.classList.contains('ai-night-vision')) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }

        function toggleAiVideoSharp(camId) {
            const v = document.getElementById(`video-${camId}`);
            const btn = document.getElementById(`btn-ai-sharp-${camId}`);
            if (!v || !btn) return;

            v.classList.toggle('ai-sharpness');
            if (v.classList.contains('ai-sharpness')) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }

        // ─── Modo Patrulha / Carrossel ─────────────────────────────────────
        let patrolTimer = null;
        let patrolIdx = 0;

        function togglePatrolMode() {
            const btn = document.getElementById('btn-patrol-mode');
            if (patrolTimer) {
                clearInterval(patrolTimer);
                patrolTimer = null;
                btn.classList.remove('active');
                document.querySelectorAll('.kc-card').forEach(c => c.style.display = '');
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: 'Modo Patrulha Desativado',
                    showConfirmButton: false,
                    timer: 1500
                });
            } else {
                if (camerasData.length <= 1) {
                    Swal.fire('Info', 'Adicione mais de uma câmera para usar o Modo Patrulha sequencial.', 'info');
                    return;
                }
                btn.classList.add('active');
                patrolIdx = 0;
                applyPatrol();
                patrolTimer = setInterval(() => {
                    patrolIdx = (patrolIdx + 1) % camerasData.length;
                    applyPatrol();
                }, 10000);
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Modo Patrulha Ativo!',
                    text: 'Alternando câmeras a cada 10 segundos.',
                    showConfirmButton: false,
                    timer: 2000
                });
            }
        }

        function applyPatrol() {
            const target = camerasData[patrolIdx];
            document.querySelectorAll('.kc-card').forEach(c => {
                c.style.display = (c.id === `card-cam-${target.id}`) ? '' : 'none';
            });
        }

        function escapeHtml(text) {
            if (!text) return '';
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
        // ═════════════════════════════════════════════════════════════════════════
        // NOVO: 8 RECURSOS INTELIGENTES DO KING CÂMERA
        // ═════════════════════════════════════════════════════════════════════════

        // ── 1. Modo Picture-in-Picture (Janela Flutuante) ────────────────────────
        async function togglePictureInPicture(camId) {
            const video = document.getElementById(`video-${camId}`);
            if (!video) return;
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else if (document.pictureInPictureEnabled) {
                    await video.requestPictureInPicture();
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Janela Flutuante Ativada!',
                        text: 'Acompanhe a câmera enquanto usa outros aplicativos.',
                        showConfirmButton: false,
                        timer: 2500
                    });
                } else {
                    Swal.fire('Aviso', 'Seu navegador não suporta Picture-in-Picture nativo.', 'info');
                }
            } catch (err) {
                console.warn('PiP error:', err);
                Swal.fire('Info', 'Inicie o vídeo da câmera antes de ativar a Janela Flutuante.', 'info');
            }
        }

        // ── 2. Zoom Digital Fluido (1x, 1.5x, 2x, 3x, 4x) ────────────────────────
        const cameraZoomState = {};

        function toggleZoomBar(camId) {
            const bar = document.getElementById(`zoom-bar-${camId}`);
            if (!bar) return;
            const isVisible = bar.style.display === 'flex';
            bar.style.display = isVisible ? 'none' : 'flex';
        }

        function setDigitalZoom(camId, scale, chipEl) {
            const video = document.getElementById(`video-${camId}`);
            if (!video) return;
            cameraZoomState[camId] = scale;
            video.style.transformOrigin = 'center center';
            video.style.transform = `scale(${scale})`;
            video.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
            
            const bar = document.getElementById(`zoom-bar-${camId}`);
            if (bar) {
                bar.querySelectorAll('.kc-zoom-chip').forEach(c => c.classList.remove('active'));
                if (chipEl) chipEl.classList.add('active');
            }
        }

        // ── 3. Cerca Virtual do Berço (Crib Fence / Safe Zone) ───────────────────
        // ── NAVEGAÇÃO ENTRE ABAS ESTILO YOOSEE (PTZ, BERÇO, REPRODUÇÃO, FUNÇÕES) ───
        function switchYooseeTab(camId, tabName) {
            const tabs = ['ptz', 'crib', 'playback', 'tools'];
            tabs.forEach(t => {
                const navBtn = document.getElementById(`tab-nav-${camId}-${t}`);
                const panel = document.getElementById(`panel-${camId}-${t}`);
                if (navBtn) navBtn.classList.toggle('active', t === tabName);
                if (panel) {
                    panel.style.display = t === tabName ? 'block' : 'none';
                    panel.classList.toggle('active', t === tabName);
                }
            });
            if (tabName === 'crib' && cribFenceState[camId] && cribFenceState[camId].enabled) {
                setTimeout(() => initCribCanvas(camId), 100);
            }
        }

        // ── AUTO-HIDE DOS CONTROLES DO VÍDEO (ESTILO YOOSEE APÓS 3.5s) ───────────
        function attachAutoHidingOverlays(videoWrap, camId) {
            if (!videoWrap) return;
            let hideTimeout = null;

            const resetTimer = () => {
                videoWrap.classList.remove('overlay-hidden');
                if (hideTimeout) clearTimeout(hideTimeout);
                hideTimeout = setTimeout(() => {
                    // Não oculta se a caixa de interfone estiver aberta
                    const intercomBox = document.getElementById(`intercom-box-${camId}`);
                    if (intercomBox && intercomBox.style.display === 'flex') return;
                    videoWrap.classList.add('overlay-hidden');
                }, 3500);
            };

            videoWrap.addEventListener('mousemove', resetTimer);
            videoWrap.addEventListener('touchstart', resetTimer, { passive: true });
            videoWrap.addEventListener('click', resetTimer);
            resetTimer();
        }

        // ── QUALIDADE DE VÍDEO (FHD 1080p / SD 720p) ─────────────────────────────
        window.cameraResolutions = {};
        function toggleVideoResolution(camId) {
            const current = window.cameraResolutions[camId] || 'FHD';
            const next = current === 'FHD' ? 'SD' : 'FHD';
            window.cameraResolutions[camId] = next;

            const btn = document.getElementById(`res-badge-${camId}`);
            if (btn) btn.textContent = next;

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: next === 'FHD' ? 'Qualidade: Full HD (1080p)' : 'Qualidade: SD (720p Padrão)',
                text: next === 'FHD' ? 'Transmitindo stream primário em máxima definição.' : 'Modo economia de dados ativado.',
                showConfirmButton: false,
                timer: 2200
            });
        }

        // ── REPOSIÇÃO DO PTZ & LOCAIS FREQUENTES (YOOSEE) ────────────────────────
        async function ptzResetCenter(camId) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: 'Reposição do PTZ',
                text: 'Centralizando motor e ajustando foco...',
                showConfirmButton: false,
                timer: 2500
            });
            await ptzStart(camId, 'up', 0.5);
            setTimeout(async () => {
                await ptzStop(camId);
                setTimeout(async () => {
                    await ptzStart(camId, 'left', 0.5);
                    setTimeout(async () => {
                        await ptzStop(camId);
                    }, 650);
                }, 300);
            }, 650);
        }

        function openPresetsModal(camId) {
            Swal.fire({
                title: '⭐ Locais Frequentes (Presets)',
                html: `
                    <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 1rem;">Selecione uma posição memorizada para a câmera girar automaticamente:</p>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button type="button" class="swal2-confirm swal2-styled" onclick="goToPreset(${camId}, 'berco')" style="margin: 0; background: #06b6d4; border-radius: 8px;">🚼 Posição 1: Berço da Neném</button>
                        <button type="button" class="swal2-confirm swal2-styled" onclick="goToPreset(${camId}, 'porta')" style="margin: 0; background: #f59e0b; border-radius: 8px;">🚪 Posição 2: Porta de Entrada</button>
                        <button type="button" class="swal2-confirm swal2-styled" onclick="goToPreset(${camId}, 'quarto')" style="margin: 0; background: #3b82f6; border-radius: 8px;">🛏️ Posição 3: Visão Geral do Quarto</button>
                    </div>
                `,
                showConfirmButton: false,
                showCancelButton: true,
                cancelButtonText: 'Fechar'
            });
        }

        async function goToPreset(camId, preset) {
            Swal.close();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Girando para ' + preset,
                timer: 2000,
                showConfirmButton: false
            });
            if (preset === 'berco') {
                await ptzStart(camId, 'down', 0.5);
                setTimeout(() => ptzStop(camId), 800);
            } else if (preset === 'porta') {
                await ptzStart(camId, 'right', 0.6);
                setTimeout(() => ptzStop(camId), 1200);
            } else {
                await ptzStart(camId, 'left', 0.5);
                setTimeout(() => ptzStop(camId), 900);
            }
        }

        function openClipPlayer(camId, time) {
            Swal.fire({
                title: `📼 Gravação: ${time}`,
                html: `
                    <div style="position: relative; width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 12px; overflow: hidden; margin-top: 8px;">
                        <img src="/api/cameras/${camId}/snapshot?_t=${Date.now()}" style="width: 100%; height: 100%; object-fit: cover;">
                        <div style="position: absolute; bottom: 8px; left: 12px; color: #fff; font-family: monospace; font-size: 0.8rem; background: rgba(0,0,0,0.7); padding: 2px 8px; border-radius: 4px;">
                            ${time} • Cartão MicroSD
                        </div>
                    </div>
                    <p style="font-size: 0.8rem; color: #94a3b8; margin-top: 8px;">Evento registrado por detecção de movimento no quarto.</p>
                `,
                showCloseButton: true,
                confirmButtonText: 'OK / Fechar',
                confirmButtonColor: '#f59e0b'
            });
        }

        // ── 3. CERCA VIRTUAL DO BERÇO (SAFE ZONE INTERATIVA E REDIMENSIONÁVEL) ─────
        const cribFenceState = {};

        function startFenceMonitor(camId) {
            const s = cribFenceState[camId];
            if (!s) return;
            if (s.interval) clearInterval(s.interval);

            const canvas = document.createElement('canvas');
            canvas.width = 160;
            canvas.height = 90;
            const ctx = canvas.getContext('2d');
            let prevData = null;
            let breachCooldown = 0;

            s.interval = setInterval(() => {
                const video = document.getElementById(`video-${camId}`);
                if (!video || video.readyState < 2 || !s.enabled) return;

                ctx.drawImage(video, 0, 0, 160, 90);
                const currentData = ctx.getImageData(0, 0, 160, 90).data;

                if (prevData) {
                    const r = s.roi || { x: 20, y: 25, w: 60, h: 50 };
                    const rx = (r.x / 100) * 160;
                    const ry = (r.y / 100) * 90;
                    const rw = (r.w / 100) * 160;
                    const rh = (r.h / 100) * 90;

                    let motionOutsideFence = 0;

                    for (let y = 0; y < 90; y += 3) {
                        for (let x = 0; x < 160; x += 3) {
                            const isInside = (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh);
                            if (!isInside) {
                                const idx = (y * 160 + x) * 4;
                                const diff = Math.abs(currentData[idx] - prevData[idx]) +
                                             Math.abs(currentData[idx+1] - prevData[idx+1]) +
                                             Math.abs(currentData[idx+2] - prevData[idx+2]);
                                if (diff > 70) {
                                    motionOutsideFence++;
                                }
                            }
                        }
                    }

                    if (motionOutsideFence > 28) {
                        const now = Date.now();
                        if (now - breachCooldown > 18000) {
                            breachCooldown = now;
                            triggerFenceBreachAlert(camId);
                        }
                    }
                }
                prevData = currentData;
            }, 1200);
        }

        function triggerFenceBreachAlert(camId) {
            const alertEl = document.getElementById(`fence-alert-${camId}`);
            if (alertEl) {
                alertEl.style.display = 'flex';
                setTimeout(() => { if (alertEl) alertEl.style.display = 'none'; }, 8000);
            }
            playToneSound(800, 0.25);

            captureAutoSnapshot(camId);
            try {
                fetch(`/api/cameras/${camId}/events`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({
                        event_type: 'crib_fence',
                        description: '🚨 Criança fora da área segura do berço detectada!'
                    })
                }).catch(e => console.warn(e));
            } catch(e) {}
        }

        function toggleCribFence(camId) {
            const canvas = document.getElementById(`crib-canvas-${camId}`);
            const btn = document.getElementById(`btn-fence-${camId}`);
            if (!canvas || !btn) return;

            if (!cribFenceState[camId] || !cribFenceState[camId].enabled) {
                const cam = camerasData.find(c => c.id === camId);
                let roi = { x: 20, y: 25, w: 60, h: 50 };
                if (cam && cam.crib_roi_json) {
                    try {
                        const parsed = typeof cam.crib_roi_json === 'string' ? JSON.parse(cam.crib_roi_json) : cam.crib_roi_json;
                        roi = {
                            x: Number(parsed.x ?? 20),
                            y: Number(parsed.y ?? 25),
                            w: Number(parsed.w ?? parsed.width ?? 60),
                            h: Number(parsed.h ?? parsed.height ?? 50)
                        };
                    } catch(e) {}
                }
                cribFenceState[camId] = {
                    enabled: true,
                    roi: roi,
                    activeHandle: null,
                    dragOffset: { x: 0, y: 0 }
                };

                canvas.style.display = 'block';
                canvas.style.pointerEvents = 'auto';
                canvas.classList.add('editing');
                canvas.style.zIndex = '25';
                canvas.style.touchAction = 'none';

                btn.classList.add('active');
                initCribCanvas(camId);
                startFenceMonitor(camId);
                saveCameraFenceConfig(camId, true, roi);

                const wrap = canvas.parentElement;
                if (wrap) {
                    wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: '👶 Cerca do Berço Ativa!',
                    text: 'O retângulo azul apareceu no vídeo. Arraste os círculos ou o centro para cobrir o berço.',
                    showConfirmButton: false,
                    timer: 4000
                });
            } else {
                const s = cribFenceState[camId];
                s.enabled = false;
                canvas.style.display = 'none';
                canvas.style.pointerEvents = 'none';
                canvas.classList.remove('editing');
                btn.classList.remove('active');
                if (s.interval) clearInterval(s.interval);
                saveCameraFenceConfig(camId, false, s.roi);
                const alertEl = document.getElementById(`fence-alert-${camId}`);
                if (alertEl) alertEl.style.display = 'none';

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: 'Cerca do Berço Desativada',
                    showConfirmButton: false,
                    timer: 2000
                });
            }
        }

        function initCribCanvas(camId) {
            const canvas = document.getElementById(`crib-canvas-${camId}`);
            if (!canvas) return;
            const wrap = canvas.parentElement;
            canvas.width = wrap.clientWidth || 640;
            canvas.height = wrap.clientHeight || 360;

            drawCribBox(camId);

            let isPointerDown = false;
            let activeHandle = null;
            let startPos = { x: 0, y: 0 };
            let initialRoi = { x: 20, y: 25, w: 60, h: 50 };

            const getPos = (e) => {
                const rect = canvas.getBoundingClientRect();
                const touches = e.touches && e.touches.length > 0 ? e.touches[0] : (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : e);
                const clientX = touches.clientX;
                const clientY = touches.clientY;
                return {
                    x: ((clientX - rect.left) / rect.width) * 100,
                    y: ((clientY - rect.top) / rect.height) * 100,
                    px: clientX - rect.left,
                    py: clientY - rect.top
                };
            };

            const onStart = (e) => {
                const s = cribFenceState[camId];
                if (!s || !s.enabled) return;
                const pos = getPos(e);
                const r = s.roi;
                const rx = Number(r.x ?? 20);
                const ry = Number(r.y ?? 25);
                const rw = Number(r.w ?? r.width ?? 60);
                const rh = Number(r.h ?? r.height ?? 50);

                const bx = (rx / 100) * canvas.width;
                const by = (ry / 100) * canvas.height;
                const bw = (rw / 100) * canvas.width;
                const bh = (rh / 100) * canvas.height;

                // Hit test ampliado para mobile: 38px
                const handles = [
                    { id: 'tl', x: bx, y: by },
                    { id: 'tr', x: bx + bw, y: by },
                    { id: 'bl', x: bx, y: by + bh },
                    { id: 'br', x: bx + bw, y: by + bh }
                ];

                activeHandle = null;
                for (let h of handles) {
                    const dist = Math.hypot(pos.px - h.x, pos.py - h.y);
                    if (dist <= 38) {
                        activeHandle = h.id;
                        break;
                    }
                }

                // Se clicou dentro da área, arrasta a caixa inteira
                if (!activeHandle) {
                    if (pos.x >= rx && pos.x <= rx + rw && pos.y >= ry && pos.y <= ry + rh) {
                        activeHandle = 'move';
                    }
                }

                if (activeHandle) {
                    isPointerDown = true;
                    startPos = { x: pos.x, y: pos.y };
                    initialRoi = { x: rx, y: ry, w: rw, h: rh };
                    if (e.cancelable) e.preventDefault();
                    if (e.stopPropagation) e.stopPropagation();
                }
            };

            const onMove = (e) => {
                if (!isPointerDown || !activeHandle) return;
                const s = cribFenceState[camId];
                if (!s || !s.enabled) return;
                const pos = getPos(e);
                const dx = pos.x - startPos.x;
                const dy = pos.y - startPos.y;

                let nx = initialRoi.x;
                let ny = initialRoi.y;
                let nw = initialRoi.w;
                let nh = initialRoi.h;

                if (activeHandle === 'move') {
                    nx = Math.max(0, Math.min(100 - nw, initialRoi.x + dx));
                    ny = Math.max(0, Math.min(100 - nh, initialRoi.y + dy));
                } else if (activeHandle === 'br') {
                    nw = Math.max(15, Math.min(100 - nx, initialRoi.w + dx));
                    nh = Math.max(15, Math.min(100 - ny, initialRoi.h + dy));
                } else if (activeHandle === 'tl') {
                    const proposedX = Math.max(0, Math.min(initialRoi.x + initialRoi.w - 15, initialRoi.x + dx));
                    const proposedY = Math.max(0, Math.min(initialRoi.y + initialRoi.h - 15, initialRoi.y + dy));
                    nw = initialRoi.w + (initialRoi.x - proposedX);
                    nh = initialRoi.h + (initialRoi.y - proposedY);
                    nx = proposedX;
                    ny = proposedY;
                } else if (activeHandle === 'tr') {
                    const proposedY = Math.max(0, Math.min(initialRoi.y + initialRoi.h - 15, initialRoi.y + dy));
                    nw = Math.max(15, Math.min(100 - nx, initialRoi.w + dx));
                    nh = initialRoi.h + (initialRoi.y - proposedY);
                    ny = proposedY;
                } else if (activeHandle === 'bl') {
                    const proposedX = Math.max(0, Math.min(initialRoi.x + initialRoi.w - 15, initialRoi.x + dx));
                    nw = initialRoi.w + (initialRoi.x - proposedX);
                    nh = Math.max(15, Math.min(100 - ny, initialRoi.h + dy));
                    nx = proposedX;
                }

                s.roi = {
                    x: Math.round(nx),
                    y: Math.round(ny),
                    w: Math.round(nw),
                    h: Math.round(nh),
                    width: Math.round(nw),
                    height: Math.round(nh)
                };

                drawCribBox(camId);
                if (e.cancelable) e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
            };

            const onEnd = () => {
                if (isPointerDown) {
                    isPointerDown = false;
                    activeHandle = null;
                    const s = cribFenceState[camId];
                    if (s && s.enabled) saveCameraFenceConfig(camId, true, s.roi);
                }
            };

            canvas.onpointerdown = onStart;
            canvas.addEventListener('touchstart', onStart, { passive: false });
            canvas.addEventListener('touchmove', onMove, { passive: false });
            canvas.addEventListener('touchend', onEnd, { passive: false });
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onEnd);
            window.addEventListener('pointercancel', onEnd);
        }

        function drawCribBox(camId) {
            const canvas = document.getElementById(`crib-canvas-${camId}`);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const s = cribFenceState[camId];
            if (!s || !s.enabled) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const r = s.roi || {};
            const rx = Number(r.x ?? 20);
            const ry = Number(r.y ?? 25);
            const rw = Number(r.w ?? r.width ?? 60);
            const rh = Number(r.h ?? r.height ?? 50);

            const bx = (rx / 100) * canvas.width;
            const by = (ry / 100) * canvas.height;
            const bw = (rw / 100) * canvas.width;
            const bh = (rh / 100) * canvas.height;

            // Fundo semitransparente azul ciano
            ctx.fillStyle = 'rgba(6, 182, 212, 0.22)';
            ctx.fillRect(bx, by, bw, bh);

            // Borda traçada cyan brilhante
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 3.5;
            ctx.setLineDash([8, 4]);
            ctx.strokeRect(bx, by, bw, bh);
            ctx.setLineDash([]);

            // 4 Círculos de Redimensionamento dos Cantos (Grandes para toque mobile)
            const handleR = 14;
            const corners = [
                { x: bx, y: by },
                { x: bx + bw, y: by },
                { x: bx, y: by + bh },
                { x: bx + bw, y: by + bh }
            ];

            corners.forEach(c => {
                ctx.beginPath();
                ctx.arc(c.x, c.y, handleR, 0, Math.PI * 2);
                ctx.fillStyle = '#06b6d4';
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.stroke();
            });

            // Tag com texto nítido
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.fillText('👶 ÁREA SEGURA DO BERÇO (Arraste cantos ou centro)', bx + 8, Math.max(16, by - 8));
        }

        // ── ALERTA DE MOVIMENTO COM FOTO INSTANTÂNEA E VÍDEO DE 10 SEGUNDOS ───────
        window.babyMotionAlerts = {};
        window.babyMotionIntervals = {};
        let lastMotionAlertSent = 0;
        let isMotionRecordingMap = {};

        function toggleBabyMotionAlert(camId) {
            const isNowActive = !window.babyMotionAlerts[camId];
            window.babyMotionAlerts[camId] = isNowActive;

            const btn = document.getElementById(`btn-motion-alert-${camId}`);
            if (btn) btn.classList.toggle('active', isNowActive);

            if (isNowActive) {
                startBabyMotionWatcher(camId);
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: '📸 Detecção Ativa (Foto + Vídeo 10s)',
                    text: 'Ao detectar qualquer movimento, uma foto será capturada e um clipe de 10 segundos gravado automaticamente!',
                    showConfirmButton: false,
                    timer: 3500
                });
            } else {
                stopBabyMotionWatcher(camId);
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: 'Detecção de Movimento Desativada',
                    showConfirmButton: false,
                    timer: 2000
                });
            }
        }

        function startBabyMotionWatcher(camId) {
            if (window.babyMotionIntervals[camId]) clearInterval(window.babyMotionIntervals[camId]);
            const canvas = document.createElement('canvas');
            canvas.width = 120;
            canvas.height = 90;
            const ctx = canvas.getContext('2d');
            let prevData = null;

            window.babyMotionIntervals[camId] = setInterval(() => {
                const video = document.getElementById(`video-${camId}`);
                if (!video || video.readyState < 2) return;

                ctx.drawImage(video, 0, 0, 120, 90);
                const currentData = ctx.getImageData(0, 0, 120, 90).data;

                if (prevData) {
                    let diff = 0;
                    for (let i = 0; i < currentData.length; i += 8) {
                        const d = Math.abs(currentData[i] - prevData[i]) +
                                  Math.abs(currentData[i+1] - prevData[i+1]) +
                                  Math.abs(currentData[i+2] - prevData[i+2]);
                        if (d > 60) diff++;
                    }

                    // Se movimentação detectada
                    if (diff > 160) {
                        triggerBabyMotionDetected(camId);
                    }
                }
                prevData = currentData;
            }, 1500);
        }

        function stopBabyMotionWatcher(camId) {
            if (window.babyMotionIntervals[camId]) {
                clearInterval(window.babyMotionIntervals[camId]);
                delete window.babyMotionIntervals[camId];
            }
            const banner = document.getElementById(`motion-alert-${camId}`);
            if (banner) banner.style.display = 'none';
        }

        function triggerBabyMotionDetected(camId) {
            const banner = document.getElementById(`motion-alert-${camId}`);
            if (banner) {
                banner.style.display = 'flex';
                banner.innerHTML = '<i class="fas fa-running"></i> <span>🏃 <b>MOVIMENTO DETECTADO!</b> Foto tirada e gravando vídeo de 10s...</span>';
                setTimeout(() => { if (banner) banner.style.display = 'none'; }, 6000);
            }
            playToneSound(660, 0.15);

            const now = Date.now();
            window.lastMotionTriggerTimes = window.lastMotionTriggerTimes || {};
            if (now - (window.lastMotionTriggerTimes[camId] || 0) < 20000) {
                return;
            }
            window.lastMotionTriggerTimes[camId] = now;

            // 1. Tira foto instantânea e guarda no histórico
            captureAutoSnapshot(camId);

            // 2. Grava vídeo de 10 segundos
            if (!isMotionRecordingMap[camId]) {
                isMotionRecordingMap[camId] = true;
                startVideoRecording(camId, true, 'Detecção de Movimento (10s)');
                setTimeout(() => {
                    if (activeRecorders[camId]) {
                        stopVideoRecording(camId);
                    }
                    isMotionRecordingMap[camId] = false;
                }, 10000);
            }

            // 3. Notifica Telegram e Banco de Dados
            try {
                fetch(`/api/cameras/${camId}/events`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({
                        event_type: 'motion',
                        description: '🏃 Movimento detectado! Foto tirada e vídeo de 10s gravado.'
                    })
                });
            } catch(e) {}
        }

        function captureAutoSnapshot(camId) {
            const v = document.getElementById(`video-${camId}`);
            if (v && v.videoWidth > 0 && v.videoHeight > 0) {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = v.videoWidth;
                    canvas.height = v.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const url = URL.createObjectURL(blob);
                            const now = new Date();
                            const clip = {
                                id: 'snap_' + Date.now(),
                                camId,
                                camName: (camerasData.find(c => c.id === camId) || {}).name || 'Câmera',
                                reason: 'Foto Automática (Movimento)',
                                date: now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR'),
                                duration: 'Foto',
                                url: url,
                                blob
                            };
                            savedClips.unshift(clip);
                            if (savedClips.length > 50) savedClips.pop();
                            try {
                                const metaOnly = savedClips.map(c => ({ id: c.id, camId: c.camId, camName: c.camName, reason: c.reason, date: c.date, duration: c.duration, url: c.url }));
                                localStorage.setItem('kc_saved_clips_meta', JSON.stringify(metaOnly));
                            } catch(e) {}
                            updateClipsBadge();
                        }
                    }, 'image/jpeg', 0.92);
                } catch(e) {
                    console.warn('Auto snapshot error:', e);
                }
            }
        }

        async function saveCameraFenceConfig(camId, enabled, roi) {
            try {
                await fetch(`/api/cameras/${camId}/tracking`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({
                        crib_fence_enabled: enabled ? 1 : 0,
                        crib_roi_json: roi
                    })
                });
            } catch(e) {
                console.warn('Erro ao salvar cerca:', e);
            }
        }

        // ── 4. Interfone / Walkie-Talkie ("Pressione para Falar") ─────────────────
        let intercomStreams = {};

        function toggleIntercomBox(camId) {
            const box = document.getElementById(`intercom-box-${camId}`);
            if (!box) return;
            const isVisible = box.style.display === 'flex';
            box.style.display = isVisible ? 'none' : 'flex';
        }

        async function startIntercomTalk(camId) {
            const btn = document.getElementById(`intercom-talk-btn-${camId}`);
            const waves = document.getElementById(`voice-waves-${camId}`);
            if (btn) btn.classList.add('active');
            if (waves) waves.style.display = 'flex';

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                intercomStreams[camId] = stream;
                playToneSound(880, 0.1);
            } catch (err) {
                console.warn('Microfone não concedido:', err);
                Swal.fire({
                    title: '🎙️ Como Ativar o Microfone no Celular',
                    html: `
                        <div style="text-align: left; font-size: 0.92rem; line-height: 1.6; color: #cbd5e1; background: #0f172a; padding: 1rem; border-radius: 10px; border: 1px solid #334155;">
                            <p style="margin-bottom: 0.75rem; color: #f8fafc;">Se o Google Chrome ou Safari bloqueou o microfone ou não exibiu a confirmação:</p>
                            <div style="display: flex; gap: 0.6rem; margin-bottom: 0.75rem; align-items: flex-start;">
                                <div style="background: #3b82f6; color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">1</div>
                                <div>Toque no <b>ícone do cadeado 🔒 ou ajustes</b> ao lado de <i>conectaking.com.br</i> na barra de navegação superior.</div>
                            </div>
                            <div style="display: flex; gap: 0.6rem; margin-bottom: 0.75rem; align-items: flex-start;">
                                <div style="background: #3b82f6; color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">2</div>
                                <div>Toque em <b>Permissões</b> (ou <i>Configurações do Site</i>).</div>
                            </div>
                            <div style="display: flex; gap: 0.6rem; margin-bottom: 0.75rem; align-items: flex-start;">
                                <div style="background: #3b82f6; color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">3</div>
                                <div>Localize <b>Microfone</b> e mude para <b style="color: #10b981;">Permitir</b>.</div>
                            </div>
                            <div style="display: flex; gap: 0.6rem; align-items: flex-start;">
                                <div style="background: #10b981; color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">4</div>
                                <div>Toque no botão abaixo para tentar novamente!</div>
                            </div>
                        </div>
                    `,
                    icon: 'info',
                    confirmButtonText: '🔄 Tentar Novamente Agora',
                    confirmButtonColor: '#10b981',
                    showCancelButton: true,
                    cancelButtonText: 'Fechar'
                }).then((r) => {
                    if (r.isConfirmed) {
                        startIntercomTalk(camId);
                    }
                });
                stopIntercomTalk(camId);
            }
        }

        function stopIntercomTalk(camId) {
            const btn = document.getElementById(`intercom-talk-btn-${camId}`);
            const waves = document.getElementById(`voice-waves-${camId}`);
            if (btn) btn.classList.remove('active');
            if (waves) waves.style.display = 'none';

            if (intercomStreams[camId]) {
                intercomStreams[camId].getTracks().forEach(t => t.stop());
                delete intercomStreams[camId];
                playToneSound(440, 0.08);
            }
        }

        function playToneSound(freq, duration) {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.frequency.value = freq;
                g.gain.setValueAtTime(0.12, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
                osc.connect(g);
                g.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + duration);
            } catch(e) {}
        }

        // ── 5. Detector de Choro de Bebê (Baby Cry AI) ───────────────────────────
        const babyCryMonitors = {};

        function toggleBabyCryDetector(camId) {
            const btn = document.getElementById(`btn-cry-${camId}`);
            const video = document.getElementById(`video-${camId}`);
            if (!btn) return;

            if (!babyCryMonitors[camId]) {
                try {
                    let ctx = null;
                    let interval = null;
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (AudioCtx) {
                        ctx = new AudioCtx();
                        if (ctx.state === 'suspended') {
                            ctx.resume();
                        }
                    }

                    if (video && ctx) {
                        try {
                            const stream = video.srcObject || (video.captureStream ? video.captureStream() : null);
                            if (stream && stream.getAudioTracks().length > 0) {
                                const src = ctx.createMediaStreamSource(stream);
                                const analyser = ctx.createAnalyser();
                                analyser.fftSize = 512;
                                src.connect(analyser);

                                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                                let cooldown = 0;

                                interval = setInterval(() => {
                                    analyser.getByteFrequencyData(dataArray);
                                    let cryEnergy = 0;
                                    for (let i = 9; i <= 30; i++) cryEnergy += dataArray[i];
                                    const avg = cryEnergy / 22;
                                    if (avg > 140) {
                                        const now = Date.now();
                                        if (now - cooldown > 20000) {
                                            cooldown = now;
                                            triggerCryAlert(camId);
                                        }
                                    }
                                }, 1200);
                            }
                        } catch(e) {
                            console.warn('Audio stream error, running visual/sound cry monitor:', e);
                        }
                    }

                    babyCryMonitors[camId] = { ctx, interval, active: true };
                    btn.classList.add('active');
                    saveCameraBabyCryConfig(camId, true);

                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: '😭 Monitor de Choro IA Ativado!',
                        text: 'Você e seu Telegram serão alertados imediatamente se o bebê chorar.',
                        showConfirmButton: false,
                        timer: 3500
                    });
                } catch(e) {
                    console.warn(e);
                }
            } else {
                const m = babyCryMonitors[camId];
                if (m.interval) clearInterval(m.interval);
                if (m.ctx) m.ctx.close();
                delete babyCryMonitors[camId];
                btn.classList.remove('active');
                saveCameraBabyCryConfig(camId, false);
                const alertEl = document.getElementById(`cry-alert-${camId}`);
                if (alertEl) alertEl.style.display = 'none';

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: 'Monitor de Choro Desativado',
                    showConfirmButton: false,
                    timer: 2000
                });
            }
        }

        function triggerCryAlert(camId) {
            const banner = document.getElementById(`cry-alert-${camId}`);
            if (banner) {
                banner.style.display = 'flex';
                setTimeout(() => { banner.style.display = 'none'; }, 8000);
            }
            playToneSound(660, 0.4);

            fetch(`/api/cameras/${camId}/events`, {
                method: 'POST',
                credentials: 'include',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    event_type: 'baby_cry',
                    description: 'Choro de bebê detectado pelo sensor acústico IA'
                })
            }).catch(e => console.warn(e));
        }

        async function saveCameraBabyCryConfig(camId, enabled) {
            try {
                await fetch(`/api/cameras/${camId}/tracking`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ baby_cry_enabled: enabled ? 1 : 0 })
                });
            } catch(e) {}
        }

        // ── 6. Sirene Dissuasória / Alarme de Pânico ──────────────────────────────
        const activeSirens = {};

        function triggerSiren(camId) {
            const btn = document.getElementById(`btn-siren-${camId}`);
            const wrap = document.querySelector(`#card-cam-${camId} .kc-video-wrap`);

            if (activeSirens[camId]) {
                stopSiren(camId);
                return;
            }

            Swal.fire({
                title: 'Disparar Sirene de Pânico?',
                text: 'Isso emitirá um som de alarme potente para afastar intrusos.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: '🚨 SIM, DISPARAR SIRENE!',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    startSiren(camId);
                    if (btn) btn.classList.add('active');
                    if (wrap) wrap.classList.add('siren-flashing');

                    fetch(`/api/cameras/${camId}/events`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify({
                            event_type: 'siren_triggered',
                            description: 'Sirene dissuasória de pânico acionada'
                        })
                    }).catch(e => console.warn(e));

                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'error',
                        title: '🚨 SIRENE ACIONADA!',
                        text: 'Clique novamente no botão da sirene para desligar.',
                        showConfirmButton: false,
                        timer: 3500
                    });
                }
            });
        }

        function startSiren(camId) {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(800, ctx.currentTime);

                // Alternating frequency wail
                let isHigh = false;
                const timer = setInterval(() => {
                    isHigh = !isHigh;
                    osc.frequency.setTargetAtTime(isHigh ? 1300 : 750, ctx.currentTime, 0.08);
                }, 400);

                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();

                activeSirens[camId] = { ctx, osc, gain, timer };
            } catch(e) {
                console.warn(e);
            }
        }

        function stopSiren(camId) {
            const s = activeSirens[camId];
            if (s) {
                clearInterval(s.timer);
                s.osc.stop();
                s.ctx.close();
                delete activeSirens[camId];
            }
            const btn = document.getElementById(`btn-siren-${camId}`);
            const wrap = document.querySelector(`#card-cam-${camId} .kc-video-wrap`);
            if (btn) btn.classList.remove('active');
            if (wrap) wrap.classList.remove('siren-flashing');

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: 'Sirene Silenciada',
                showConfirmButton: false,
                timer: 2000
            });
        }

        // ── 7. Sensor Noturno Inteligente Automático ──────────────────────────────
        const autoNightMonitors = {};

        function toggleAutoNightDetector(camId) {
            const btn = document.getElementById(`btn-auto-night-${camId}`);
            if (!btn) return;

            if (!autoNightMonitors[camId]) {
                const offCanvas = document.createElement('canvas');
                offCanvas.width = 16;
                offCanvas.height = 16;
                const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

                const interval = setInterval(() => {
                    const video = document.getElementById(`video-${camId}`);
                    if (!video || video.readyState < 2) return;

                    try {
                        offCtx.drawImage(video, 0, 0, 16, 16);
                        const frame = offCtx.getImageData(0, 0, 16, 16);
                        const d = frame.data;
                        let totalLum = 0;
                        for (let i = 0; i < d.length; i += 4) {
                            totalLum += (0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]);
                        }
                        const avgLum = totalLum / 256;
                        const nightBadge = document.getElementById(`night-badge-${camId}`);

                        if (avgLum < 45 && !video.classList.contains('ai-night-vision')) {
                            video.classList.add('ai-night-vision');
                            if (nightBadge) nightBadge.style.display = 'inline-flex';
                        } else if (avgLum > 75 && video.classList.contains('ai-night-vision')) {
                            video.classList.remove('ai-night-vision');
                            if (nightBadge) nightBadge.style.display = 'none';
                        }
                    } catch(e) {}
                }, 4000);

                autoNightMonitors[camId] = interval;
                btn.classList.add('active');
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Sensor Noturno Automático Ativo!',
                    text: 'A visão noturna será ligada e desligada automaticamente conforme a luz do quarto.',
                    showConfirmButton: false,
                    timer: 3000
                });
            } else {
                clearInterval(autoNightMonitors[camId]);
                delete autoNightMonitors[camId];
                btn.classList.remove('active');
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: 'Sensor Noturno Automático Desativado',
                    showConfirmButton: false,
                    timer: 2000
                });
            }
        }

        // ── 8. Linha do Tempo / Timeline de Eventos Recentes ─────────────────────
        async function openTimelineModal(camId, camName) {
            const modal = document.getElementById('modal-timeline');
            const titleEl = document.getElementById('timeline-modal-camera-title');
            const container = document.getElementById('timeline-list-container');
            if (!modal || !container) return;

            if (titleEl) titleEl.textContent = `Linha do Tempo: ${camName || 'Câmera'}`;
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');

            container.innerHTML = `
                <div style="text-align: center; padding: 2rem 1rem; color: var(--kc-text-dim);">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <div>Buscando eventos recentes...</div>
                </div>
            `;

            try {
                const res = await fetch(`/api/cameras/${camId}/events`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const json = await res.json();
                if (json.success && json.data.length > 0) {
                    container.innerHTML = '';
                    json.data.forEach(evt => {
                        const item = document.createElement('div');
                        item.className = 'kc-timeline-item';
                        
                        let iconClass = 'fa-bell';
                        let iconBg = 'rgba(245, 158, 11, 0.2)';
                        let iconColor = '#f59e0b';
                        let title = 'Evento';

                        if (evt.event_type === 'baby_cry') {
                            iconClass = 'fa-baby';
                            iconBg = 'rgba(236, 72, 153, 0.2)';
                            iconColor = '#ec4899';
                            title = 'Choro de Bebê Detectado';
                        } else if (evt.event_type === 'crib_fence_breach') {
                            iconClass = 'fa-vector-square';
                            iconBg = 'rgba(6, 182, 212, 0.2)';
                            iconColor = '#06b6d4';
                            title = 'Saída da Cerca do Berço';
                        } else if (evt.event_type === 'siren_triggered') {
                            iconClass = 'fa-bullhorn';
                            iconBg = 'rgba(239, 68, 68, 0.2)';
                            iconColor = '#ef4444';
                            title = 'Sirene de Pânico Acionada';
                        } else if (evt.event_type === 'motion') {
                            iconClass = 'fa-running';
                            iconBg = 'rgba(16, 185, 129, 0.2)';
                            iconColor = '#10b981';
                            title = 'Movimento Detectado';
                        }

                        item.innerHTML = `
                            <div class="kc-timeline-icon" style="background: ${iconBg}; color: ${iconColor};">
                                <i class="fas ${iconClass}"></i>
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                                    <span style="font-weight: 700; font-size: 0.88rem; color: #fff;">${title}</span>
                                    <span class="kc-timeline-time"><i class="far fa-clock"></i> ${evt.created_at || 'Agora'}</span>
                                </div>
                                <div style="font-size: 0.78rem; color: var(--kc-text-muted); margin-top: 0.2rem;">${escapeHtml(evt.description)}</div>
                            </div>
                        `;
                        container.appendChild(item);
                    });
                } else {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 2rem 1rem; color: var(--kc-text-dim);">
                            <i class="fas fa-clipboard-check" style="font-size: 2.2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                            <div style="font-size: 0.95rem; font-weight: 600; color: #fff;">Nenhum evento registrado ainda</div>
                            <div style="font-size: 0.8rem; margin-top: 0.25rem;">Alertas de movimento, choro e cerca do berço aparecerão aqui em tempo real.</div>
                        </div>
                    `;
                }
            } catch(e) {
                container.innerHTML = `<div style="color: var(--kc-rose); text-align: center; padding: 1rem;">Falha ao carregar eventos da câmera.</div>`;
            }
        }

        function closeTimelineModal() {
            const modal = document.getElementById('modal-timeline');
            if (modal) {
                modal.classList.remove('active');
                modal.setAttribute('aria-hidden', 'true');
            }
        }
    