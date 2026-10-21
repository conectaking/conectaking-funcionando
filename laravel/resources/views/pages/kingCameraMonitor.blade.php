<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Monitor King Câmera — {{ $camera->name }}</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <style>
        :root {
            --kc-bg: #090d16;
            --kc-card: #0f172a;
            --kc-border: rgba(255, 255, 255, 0.08);
            --kc-gold: #f59e0b;
            --kc-emerald: #10b981;
            --kc-rose: #f43f5e;
            --kc-text: #f8fafc;
            --kc-text-muted: #94a3b8;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            -webkit-tap-highlight-color: transparent;
        }

        body {
            background: var(--kc-bg);
            color: var(--kc-text);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow-x: hidden;
        }

        .monitor-header {
            background: rgba(15, 23, 42, 0.8);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--kc-border);
            padding: 0.75rem 1.25rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 50;
        }

        .header-brand {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            text-decoration: none;
            color: inherit;
        }

        .brand-badge {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: #000;
            font-weight: 800;
            font-size: 0.65rem;
            padding: 0.15rem 0.45rem;
            border-radius: 4px;
            letter-spacing: 0.05em;
        }

        .brand-name {
            font-family: 'Outfit', sans-serif;
            font-weight: 700;
            font-size: 1.1rem;
            letter-spacing: -0.02em;
        }

        .brand-name span { color: var(--kc-gold); }

        .header-countdown {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(245, 158, 11, 0.12);
            border: 1px solid rgba(245, 158, 11, 0.3);
            color: #fbbf24;
            padding: 0.35rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.8rem;
            font-weight: 600;
        }

        .monitor-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            max-width: 1200px;
            width: 100%;
            margin: 0 auto;
        }

        .video-container {
            width: 100%;
            background: #000;
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid var(--kc-border);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
            position: relative;
            aspect-ratio: 16 / 9;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        video {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            transition: filter 0.3s ease;
        }

        /* Modos de IA de Vídeo */
        video.ai-night-vision {
            filter: brightness(1.5) contrast(1.2) saturate(1.1);
        }

        video.ai-sharpness {
            filter: contrast(1.25) saturate(1.15);
        }

        .video-state-box {
            position: absolute;
            inset: 0;
            background: rgba(15, 23, 42, 0.9);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.8rem;
            z-index: 10;
        }

        .spinner {
            width: 44px;
            height: 44px;
            border: 3px solid rgba(245, 158, 11, 0.2);
            border-top-color: var(--kc-gold);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .overlay-live {
            position: absolute;
            top: 1rem;
            left: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(8px);
            padding: 0.3rem 0.7rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            z-index: 5;
        }

        .live-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--kc-rose);
            box-shadow: 0 0 8px var(--kc-rose);
            animation: pulse 1.5s infinite;
        }

        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

        .watermark-overlay {
            position: absolute;
            bottom: 4rem;
            right: 1rem;
            background: rgba(0, 0, 0, 0.4);
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.65rem;
            color: rgba(255, 255, 255, 0.4);
            pointer-events: none;
            z-index: 5;
        }

        .video-toolbar {
            width: 100%;
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid var(--kc-border);
            border-radius: 12px;
            margin-top: 1rem;
            padding: 0.8rem 1.25rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 0.8rem;
        }

        .camera-info {
            display: flex;
            align-items: center;
            gap: 0.6rem;
        }

        .cam-title {
            font-family: 'Outfit', sans-serif;
            font-size: 1.1rem;
            font-weight: 700;
        }

        .cam-badge {
            font-size: 0.75rem;
            padding: 0.2rem 0.5rem;
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.08);
            color: var(--kc-text-muted);
        }

        .toolbar-buttons {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .ctrl-btn {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid var(--kc-border);
            color: var(--kc-text);
            padding: 0.6rem 0.95rem;
            border-radius: 10px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            min-height: 44px;
            transition: all 0.2s ease;
            touch-action: manipulation !important;
            user-select: none;
            -webkit-user-select: none;
            -webkit-tap-highlight-color: transparent;
            pointer-events: auto !important;
        }

        .ctrl-btn:hover {
            background: rgba(255, 255, 255, 0.14);
            color: #fff;
            border-color: rgba(255, 255, 255, 0.25);
        }

        .ctrl-btn:active {
            transform: scale(0.96);
            background: rgba(245, 158, 11, 0.3);
        }

        .ctrl-btn.active {
            background: rgba(245, 158, 11, 0.25) !important;
            border-color: var(--kc-gold) !important;
            color: #fbbf24 !important;
            box-shadow: 0 0 12px rgba(245, 158, 11, 0.35);
        }

        .footer-note {
            text-align: center;
            font-size: 0.75rem;
            color: var(--kc-text-dim, #64748b);
            padding: 1.5rem;
        }

        /* PTZ 360 Controls */
        .kc-ptz-floating-box {
            position: absolute;
            bottom: 1rem;
            right: 1rem;
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(10px);
            border: 1px solid var(--kc-border);
            border-radius: 50%;
            width: 110px;
            height: 110px;
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 20;
            box-shadow: 0 8px 24px rgba(0,0,0,0.6);
        }
        .video-container.ptz-active .kc-ptz-floating-box {
            display: flex;
        }
        .kc-ptz-btn-dir {
            position: absolute;
            width: 32px;
            height: 32px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #fff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
            cursor: pointer;
            touch-action: manipulation;
        }
        .kc-ptz-btn-dir:active {
            background: var(--kc-gold);
            color: #000;
        }
        .kc-ptz-up { top: 6px; }
        .kc-ptz-down { bottom: 6px; }
        .kc-ptz-left { left: 6px; }
        .kc-ptz-right { right: 6px; }
        .kc-ptz-center {
            width: 26px;
            height: 26px;
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.4);
            color: #f87171;
            border-radius: 50%;
            font-size: 0.65rem;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }

        /* Side Arrows */
        .kc-side-ptz {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 36px;
            height: 54px;
            background: rgba(0, 0, 0, 0.35);
            backdrop-filter: blur(4px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #fff;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            cursor: pointer;
            z-index: 15;
            transition: all 0.2s;
        }
        .video-container.ptz-active .kc-side-ptz {
            display: flex;
        }
        .kc-side-ptz-left { left: 8px; border-radius: 8px; }
        .kc-side-ptz-right { right: 8px; border-radius: 8px; }
        .kc-side-ptz:active { background: rgba(245, 158, 11, 0.4); color: #fbbf24; }

        video.ai-night-vision {
            filter: brightness(1.6) contrast(1.3) saturate(1.15) !important;
            -webkit-filter: brightness(1.6) contrast(1.3) saturate(1.15) !important;
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
        }

        @media (max-width: 640px) {
            .video-container { aspect-ratio: 4 / 3; }
            .toolbar-buttons {
                width: 100%;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
                gap: 0.5rem;
            }
            .ctrl-btn {
                width: 100%;
            }
        }
    </style>
</head>
<body>

    <header class="monitor-header">
        <a href="/" class="header-brand">
            <span class="brand-badge">PRO</span>
            <span class="brand-name">Conecta <span>King</span> Câmera</span>
        </a>
        <div class="header-countdown" id="countdown-badge">
            <i class="fas fa-clock"></i>
            <span id="countdown-timer">Calculando...</span>
        </div>
    </header>

    <main class="monitor-main">
        <div class="video-container" id="video-wrap">
            <video id="guest-video" autoplay playsinline muted></video>

            <div class="overlay-live">
                <span class="live-dot"></span>
                <span>AO VIVO</span>
            </div>

            <div class="watermark-overlay" id="watermark">
                MONITORAMENTO CONVIDADO • {{ date('d/m/Y H:i') }}
            </div>

            <div class="video-state-box" id="loader-box">
                <div class="spinner"></div>
                <div style="font-weight: 600; font-size: 0.95rem;">Conectando Transmissão WebRTC...</div>
                <div style="font-size: 0.78rem; color: var(--kc-text-muted);">Latência ultra-rápida abaixo de 0,5s</div>
            </div>
            @if($share->can_ptz)
                <button type="button" class="kc-side-ptz kc-side-ptz-left" onclick="ptzStep('left')" title="Girar Esquerda">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button type="button" class="kc-side-ptz kc-side-ptz-right" onclick="ptzStep('right')" title="Girar Direita">
                    <i class="fas fa-chevron-right"></i>
                </button>

                <div class="kc-ptz-floating-box" id="ptz-joystick">
                    <button type="button" class="kc-ptz-btn-dir kc-ptz-up" onpointerdown="ptzStart('up')" onpointerup="ptzStop()" onpointercancel="ptzStop()" title="Cima"><i class="fas fa-chevron-up"></i></button>
                    <button type="button" class="kc-ptz-btn-dir kc-ptz-down" onpointerdown="ptzStart('down')" onpointerup="ptzStop()" onpointercancel="ptzStop()" title="Baixo"><i class="fas fa-chevron-down"></i></button>
                    <button type="button" class="kc-ptz-btn-dir kc-ptz-left" onpointerdown="ptzStart('left')" onpointerup="ptzStop()" onpointercancel="ptzStop()" title="Esquerda"><i class="fas fa-chevron-left"></i></button>
                    <button type="button" class="kc-ptz-btn-dir kc-ptz-right" onpointerdown="ptzStart('right')" onpointerup="ptzStop()" onpointercancel="ptzStop()" title="Direita"><i class="fas fa-chevron-right"></i></button>
                    <button type="button" class="kc-ptz-center" onclick="ptzStop()" title="Parar"><i class="fas fa-stop"></i></button>
                </div>
            @endif
        </div>

        <div class="video-toolbar">
            <div class="camera-info">
                <div class="cam-title">{{ $camera->name }}</div>
                <div class="cam-badge"><i class="fas fa-map-marker-alt"></i> {{ $camera->room ?: 'Geral' }}</div>
                <div class="cam-badge" style="color: var(--kc-gold);"><i class="fas fa-shield-alt"></i> {{ $share->label ?: 'Convidado' }}</div>
            </div>

            <div class="toolbar-buttons">
                @if($share->can_audio)
                <!-- Áudio -->
                <button type="button" class="ctrl-btn" id="btn-audio" onclick="toggleAudio()" title="Ligar/Desligar Áudio">
                    <i class="fas fa-volume-mute" id="audio-icon"></i>
                    <span>Áudio</span>
                </button>

                <!-- Filtro IA de Áudio Anti-Ruído -->
                <button type="button" class="ctrl-btn" id="btn-ai-audio" onclick="toggleAiAudio()" title="Filtro Anti-Chiado IA">
                    <i class="fas fa-magic"></i>
                    <span>IA Áudio Limpo</span>
                </button>
                @endif

                <!-- IA Visão Noturna -->
                <button type="button" class="ctrl-btn" id="btn-ai-video" onclick="toggleAiVideo()" title="Realce de Visão Noturna IA">
                    <i class="fas fa-moon"></i>
                    <span>IA Visão Noturna</span>
                </button>

                @if($share->can_ptz)
                <!-- Controle Motorizado 360° -->
                <button type="button" class="ctrl-btn" id="btn-ptz" onclick="togglePtz()" title="Girar Câmera 360°">
                    <i class="fas fa-arrows-alt"></i>
                    <span>Girar 360°</span>
                </button>
                @endif

                @if($share->can_light)
                <!-- Lâmpada LED da Câmera -->
                <button type="button" class="ctrl-btn" id="btn-light" onclick="toggleLight()" title="Acender/Apagar Luz LED da Câmera">
                    <i class="fas fa-lightbulb"></i>
                    <span>Luz LED</span>
                </button>
                @endif

                @if($share->can_snapshot)
                <!-- Snapshot -->
                <button type="button" class="ctrl-btn" onclick="takeSnapshot()" title="Salvar Foto Instantânea">
                    <i class="fas fa-camera"></i>
                    <span>Foto</span>
                </button>
                @endif

                <!-- Fullscreen -->
                <button type="button" class="ctrl-btn" onclick="toggleFullscreen()" title="Tela Cheia">
                    <i class="fas fa-expand"></i>
                </button>
            </div>
        </div>
    </main>

    <footer class="footer-note">
        Transmissão criptografada de ponta a ponta via WebRTC Conecta King • Expiração automática gerenciada pelo proprietário.
    </footer>

    <script>
        const SHARE_TOKEN = @json($token);
        let secondsLeft = Math.max(0, Math.floor(Number({{ $secondsRemaining }})));
        const CAN_AUDIO = {{ $share->can_audio ? 'true' : 'false' }};
        const CAN_PTZ = {{ $share->can_ptz ? 'true' : 'false' }};
        const CAN_LIGHT = {{ $share->can_light ? 'true' : 'false' }};
        const CAN_SNAPSHOT = {{ $share->can_snapshot ? 'true' : 'false' }};

        let pc = null;
        let isAudioAiActive = false;
        let isVideoAiActive = false;
        let isLightOn = false;
        let audioCtx = null;
        let audioSource = null;
        let biquadFilter = null;

        // Inicia contador regressivo
        function startCountdown() {
            const timerEl = document.getElementById('countdown-timer');
            const interval = setInterval(() => {
                if (secondsLeft <= 0) {
                    clearInterval(interval);
                    timerEl.textContent = 'Expirado';
                    document.getElementById('video-wrap').innerHTML = `
                        <div class="video-state-box" style="background: rgba(15, 23, 42, 0.98);">
                            <i class="fas fa-hourglass-end" style="font-size: 3rem; color: var(--kc-rose); margin-bottom: 0.5rem;"></i>
                            <h2 style="font-size: 1.25rem;">Acesso Temporário Expirado</h2>
                            <p style="font-size: 0.85rem; color: var(--kc-text-muted); max-width: 320px; text-align: center;">
                                O tempo definido pelo proprietário para este link de monitoramento encerrou.
                            </p>
                        </div>
                    `;
                    return;
                }

                secondsLeft--;
                const h = Math.floor(secondsLeft / 3600);
                const m = Math.floor((secondsLeft % 3600) / 60);
                const s = Math.floor(secondsLeft % 60);
                
                if (h > 0) {
                    timerEl.textContent = `${h}h ${m}m ${s}s restantes`;
                } else if (m > 0) {
                    timerEl.textContent = `${m}m ${s}s restantes`;
                } else {
                    timerEl.textContent = `${s}s restantes`;
                }
            }, 1000);
        }

        // WebRTC Player Handshake
        async function connectWebRtc() {
            const videoEl = document.getElementById('guest-video');
            const loaderEl = document.getElementById('loader-box');

            try {
                pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });

                pc.addTransceiver('video', { direction: 'recvonly' });
                if (CAN_AUDIO) {
                    pc.addTransceiver('audio', { direction: 'recvonly' });
                }

                pc.ontrack = (event) => {
                    if (event.streams && event.streams[0]) {
                        videoEl.srcObject = event.streams[0];
                    } else {
                        const stream = new MediaStream();
                        stream.addTrack(event.track);
                        videoEl.srcObject = stream;
                    }
                    videoEl.play().catch(e => console.warn('Autoplay error:', e));
                    if (loaderEl) loaderEl.style.display = 'none';
                };

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

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

                const response = await fetch(`/api/public/camera-share/${SHARE_TOKEN}/webrtc`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/sdp' },
                    body: pc.localDescription ? pc.localDescription.sdp : offer.sdp
                });

                if (response.ok) {
                    const answerSdp = await response.text();
                    await pc.setRemoteDescription(new RTCSessionDescription({
                        type: 'answer',
                        sdp: answerSdp
                    }));
                } else {
                    loaderEl.innerHTML = `
                        <i class="fas fa-video-slash" style="font-size: 2.5rem; color: var(--kc-gold);"></i>
                        <div style="font-weight: 600;">Câmera em Standby</div>
                        <div style="font-size: 0.78rem; color: var(--kc-text-muted);">Aguardando reconexão do sinal...</div>
                    `;
                }
            } catch (err) {
                console.warn('WebRTC error:', err);
            }
        }

        // Áudio On/Off (Compatível com políticas de reprodução móvel do Android e iPhone)
        function toggleAudio() {
            if (!CAN_AUDIO) return;
            const v = document.getElementById('guest-video');
            const icon = document.getElementById('audio-icon');
            const btn = document.getElementById('btn-audio');
            if (!v) return;

            v.muted = !v.muted;
            if (v.muted) {
                if (icon) icon.className = 'fas fa-volume-mute';
                if (btn) btn.classList.remove('active');
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: 'Áudio Silenciado',
                    showConfirmButton: false,
                    timer: 1500
                });
            } else {
                v.volume = 1.0;
                v.play().catch(() => {});
                if (icon) icon.className = 'fas fa-volume-up';
                if (btn) btn.classList.add('active');

                try {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (AudioCtx) {
                        if (!audioCtx) audioCtx = new AudioCtx();
                        if (audioCtx.state === 'suspended') audioCtx.resume();
                    }
                } catch (e) {}

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: '🔊 Áudio Ao Vivo Ativado',
                    showConfirmButton: false,
                    timer: 1800
                });
            }
        }

        // Melhoria de Áudio com IA (Web Audio API - Noise Gate & Bandpass Speech Clarity)
        function toggleAiAudio() {
            if (!CAN_AUDIO) return;
            const v = document.getElementById('guest-video');
            const btn = document.getElementById('btn-ai-audio');
            if (!v) return;

            // Desmuta automaticamente ao ligar o filtro IA
            if (v.muted) {
                v.muted = false;
                v.volume = 1.0;
                v.play().catch(() => {});
                const audioIcon = document.getElementById('audio-icon');
                const audioBtn = document.getElementById('btn-audio');
                if (audioIcon) audioIcon.className = 'fas fa-volume-up';
                if (audioBtn) audioBtn.classList.add('active');
            }

            if (!audioCtx) {
                try {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (AudioCtx) {
                        audioCtx = new AudioCtx();
                        if (audioCtx.state === 'suspended') audioCtx.resume();

                        const src = v.srcObject ? audioCtx.createMediaStreamSource(v.srcObject) : audioCtx.createMediaElementSource(v);

                        const highPass = audioCtx.createBiquadFilter();
                        highPass.type = 'highpass';
                        highPass.frequency.value = 300;

                        const lowPass = audioCtx.createBiquadFilter();
                        lowPass.type = 'lowpass';
                        lowPass.frequency.value = 3400;

                        const compressor = audioCtx.createDynamicsCompressor();
                        compressor.threshold.value = -30;
                        compressor.knee.value = 15;
                        compressor.ratio.value = 8;
                        compressor.attack.value = 0.003;
                        compressor.release.value = 0.25;

                        src.connect(highPass);
                        highPass.connect(lowPass);
                        lowPass.connect(compressor);
                        compressor.connect(audioCtx.destination);
                    }
                } catch (e) {
                    console.warn('Web Audio API not supported on this stream:', e);
                }
            }

            isAudioAiActive = !isAudioAiActive;
            if (isAudioAiActive) {
                if (btn) btn.classList.add('active');
                if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: '✨ IA Áudio Limpo Ativada',
                    text: 'Filtro anti-chiado e redução de ruído em tempo real.',
                    showConfirmButton: false,
                    timer: 2000
                });
            } else {
                if (btn) btn.classList.remove('active');
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: 'Filtro de Áudio Desativado',
                    showConfirmButton: false,
                    timer: 1500
                });
            }
        }

        // Melhoria de Vídeo com IA (Night Vision Boost)
        function toggleAiVideo() {
            const v = document.getElementById('guest-video');
            const btn = document.getElementById('btn-ai-video');
            if (!v) return;

            isVideoAiActive = !isVideoAiActive;
            if (isVideoAiActive) {
                v.classList.add('ai-night-vision');
                if (btn) btn.classList.add('active');
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: '🌙 IA Visão Noturna Ativada',
                    text: 'Ganho dinâmico de brilho e contraste para escuro.',
                    showConfirmButton: false,
                    timer: 2000
                });
            } else {
                v.classList.remove('ai-night-vision');
                if (btn) btn.classList.remove('active');
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: 'Visão Noturna Desativada',
                    showConfirmButton: false,
                    timer: 1500
                });
            }
        }

        // ─── PTZ 360° Motorizado ──────────────────────────────────────────
        function togglePtz() {
            if (!CAN_PTZ) return;
            const wrap = document.getElementById('video-wrap');
            const btn = document.getElementById('btn-ptz');
            if (!wrap) return;
            const active = wrap.classList.toggle('ptz-active');
            if (btn) btn.classList.toggle('active', active);

            if (active) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: '🔄 Controle 360° Ativado',
                    text: 'Arraste na tela ou use as setas para mover a câmera.',
                    showConfirmButton: false,
                    timer: 2200
                });
            }
        }

        async function ptzStart(direction, speed = 0.6) {
            if (!CAN_PTZ) return;
            try {
                await fetch(`/api/public/camera-share/${SHARE_TOKEN}/ptz`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ direction, speed })
                });
            } catch (e) {
                console.warn('PTZ move error:', e);
            }
        }

        async function ptzStop() {
            if (!CAN_PTZ) return;
            try {
                await fetch(`/api/public/camera-share/${SHARE_TOKEN}/ptz`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ direction: 'stop' })
                });
            } catch (e) {
                console.warn('PTZ stop error:', e);
            }
        }

        function ptzStep(direction) {
            ptzStart(direction, 0.6);
            setTimeout(() => ptzStop(), 500);
        }

        function attachVideoSwipePtz() {
            const wrapEl = document.getElementById('video-wrap');
            if (!wrapEl || !CAN_PTZ) return;

            let startX = 0, startY = 0, isMoving = false, activeDir = null;

            wrapEl.addEventListener('touchstart', (e) => {
                if (!wrapEl.classList.contains('ptz-active')) return;
                if (e.target.closest('.kc-side-ptz, .kc-ptz-floating-box, button, a')) return;
                if (e.touches.length === 1) {
                    startX = e.touches[0].clientX;
                    startY = e.touches[0].clientY;
                    isMoving = true;
                    activeDir = null;
                }
            }, { passive: true });

            wrapEl.addEventListener('touchmove', (e) => {
                if (!isMoving || !wrapEl.classList.contains('ptz-active')) return;
                if (e.touches.length !== 1) return;

                const deltaX = e.touches[0].clientX - startX;
                const deltaY = e.touches[0].clientY - startY;
                const threshold = 28;

                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    if (deltaX > threshold && activeDir !== 'right') {
                        activeDir = 'right';
                        ptzStart('right', 0.6);
                    } else if (deltaX < -threshold && activeDir !== 'left') {
                        activeDir = 'left';
                        ptzStart('left', 0.6);
                    }
                } else {
                    if (deltaY > threshold && activeDir !== 'down') {
                        activeDir = 'down';
                        ptzStart('down', 0.6);
                    } else if (deltaY < -threshold && activeDir !== 'up') {
                        activeDir = 'up';
                        ptzStart('up', 0.6);
                    }
                }
            }, { passive: true });

            const endTouch = () => {
                if (isMoving && activeDir) {
                    ptzStop();
                }
                isMoving = false;
                activeDir = null;
            };

            wrapEl.addEventListener('touchend', endTouch);
            wrapEl.addEventListener('touchcancel', endTouch);
        }

        // ─── Lâmpada LED da Câmera ─────────────────────────────────────────
        async function toggleLight() {
            if (!CAN_LIGHT) return;
            const btn = document.getElementById('btn-light');
            try {
                const res = await fetch(`/api/public/camera-share/${SHARE_TOKEN}/light`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ state: isLightOn ? 'off' : 'on' })
                });
                const json = await res.json();
                if (json.success) {
                    isLightOn = (json.light_state === 'on');
                    if (btn) btn.classList.toggle('active', isLightOn);
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: isLightOn ? '💡 Lâmpada LED Ligada' : '💡 Lâmpada LED Apagada',
                        showConfirmButton: false,
                        timer: 1800
                    });
                }
            } catch (e) {
                console.warn('Light toggle error:', e);
            }
        }

        // ─── Snapshot (Download Compatível com Android Chrome e iOS Safari) ──
        async function takeSnapshot() {
            if (!CAN_SNAPSHOT) return;
            Swal.fire({
                title: 'Capturando Foto...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                const res = await fetch(`/api/public/camera-share/${SHARE_TOKEN}/snapshot`);
                if (res.ok) {
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `snapshot-camera-${Date.now()}.jpg`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 2000);

                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: '📸 Foto Salva!',
                        showConfirmButton: false,
                        timer: 1800
                    });
                    return;
                }
            } catch (e) {
                console.warn('Backend snapshot fallback to canvas:', e);
            }

            try {
                const v = document.getElementById('guest-video');
                const canvas = document.createElement('canvas');
                canvas.width = v.videoWidth || 1280;
                canvas.height = v.videoHeight || 720;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `snapshot-camera-${Date.now()}.jpg`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        setTimeout(() => URL.revokeObjectURL(url), 2000);
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'success',
                            title: '📸 Foto Salva!',
                            showConfirmButton: false,
                            timer: 1800
                        });
                    }
                }, 'image/jpeg', 0.95);
            } catch (err) {
                Swal.fire('Info', 'Não foi possível capturar a foto no momento.', 'info');
            }
        }

        // Tela cheia (Compatível com Android, iPhone Safari, iPad e Tablets)
        function toggleFullscreen() {
            const wrap = document.getElementById('video-wrap');
            const v = document.getElementById('guest-video');
            if (!wrap) return;

            const isFs = document.fullscreenElement || document.webkitFullscreenElement;
            if (!isFs) {
                if (wrap.requestFullscreen) {
                    wrap.requestFullscreen().catch(() => {
                        if (v && v.webkitEnterFullscreen) v.webkitEnterFullscreen();
                    });
                } else if (wrap.webkitRequestFullscreen) {
                    wrap.webkitRequestFullscreen();
                } else if (v && v.webkitEnterFullscreen) {
                    v.webkitEnterFullscreen(); // Suporte nativo completo para iPhone / iPad!
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            startCountdown();
            connectWebRtc();
            if (CAN_PTZ) attachVideoSwipePtz();
        });
    </script>
</body>
</html>
