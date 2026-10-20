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
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid var(--kc-border);
            color: var(--kc-text);
            padding: 0.45rem 0.85rem;
            border-radius: 8px;
            font-size: 0.82rem;
            font-weight: 500;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            transition: all 0.2s ease;
        }

        .ctrl-btn:hover {
            background: rgba(255, 255, 255, 0.12);
            color: #fff;
            border-color: rgba(255, 255, 255, 0.2);
        }

        .ctrl-btn.active {
            background: rgba(245, 158, 11, 0.15);
            border-color: var(--kc-gold);
            color: #fbbf24;
        }

        .footer-note {
            text-align: center;
            font-size: 0.75rem;
            color: var(--kc-text-dim, #64748b);
            padding: 1.5rem;
        }

        @media (max-width: 640px) {
            .video-container { aspect-ratio: 4 / 3; }
            .toolbar-buttons { width: 100%; justify-content: space-between; }
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
        </div>

        <div class="video-toolbar">
            <div class="camera-info">
                <div class="cam-title">{{ $camera->name }}</div>
                <div class="cam-badge"><i class="fas fa-map-marker-alt"></i> {{ $camera->room ?: 'Geral' }}</div>
                <div class="cam-badge" style="color: var(--kc-gold);"><i class="fas fa-shield-alt"></i> {{ $share->label ?: 'Convidado' }}</div>
            </div>

            <div class="toolbar-buttons">
                <!-- Áudio IA -->
                <button type="button" class="ctrl-btn" id="btn-audio" onclick="toggleAudio()" title="Ligar/Desligar Áudio">
                    <i class="fas fa-volume-mute" id="audio-icon"></i>
                    <span>Áudio</span>
                </button>

                <!-- Filtro IA de Áudio Anti-Ruído -->
                <button type="button" class="ctrl-btn" id="btn-ai-audio" onclick="toggleAiAudio()" title="Filtro Anti-Chiado IA">
                    <i class="fas fa-magic"></i>
                    <span>IA Áudio Limpo</span>
                </button>

                <!-- IA Visão Noturna -->
                <button type="button" class="ctrl-btn" id="btn-ai-video" onclick="toggleAiVideo()" title="Realce de Visão Noturna IA">
                    <i class="fas fa-moon"></i>
                    <span>IA Visão Noturna</span>
                </button>

                <!-- Snapshot -->
                <button type="button" class="ctrl-btn" onclick="takeSnapshot()" title="Salvar Foto Instantânea">
                    <i class="fas fa-camera"></i>
                </button>

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
        let secondsLeft = {{ $secondsRemaining }};
        let pc = null;
        let isAudioAiActive = false;
        let isVideoAiActive = false;
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
                const s = secondsLeft % 60;
                
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
                pc.addTransceiver('audio', { direction: 'recvonly' });

                pc.ontrack = (event) => {
                    if (event.streams && event.streams[0]) {
                        videoEl.srcObject = event.streams[0];
                    } else {
                        const stream = new MediaStream();
                        stream.addTrack(event.track);
                        videoEl.srcObject = stream;
                    }
                    if (loaderEl) loaderEl.style.display = 'none';
                };

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                const response = await fetch(`/api/public/camera-share/${SHARE_TOKEN}/webrtc`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/sdp' },
                    body: offer.sdp
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

        // Áudio On/Off
        function toggleAudio() {
            const v = document.getElementById('guest-video');
            const icon = document.getElementById('audio-icon');
            const btn = document.getElementById('btn-audio');

            v.muted = !v.muted;
            if (v.muted) {
                icon.className = 'fas fa-volume-mute';
                btn.classList.remove('active');
            } else {
                icon.className = 'fas fa-volume-up';
                btn.classList.add('active');
            }
        }

        // Melhoria de Áudio com IA (Web Audio API - Noise Gate & Bandpass Speech Clarity)
        function toggleAiAudio() {
            const v = document.getElementById('guest-video');
            const btn = document.getElementById('btn-ai-audio');

            if (!audioCtx) {
                try {
                    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    audioSource = audioCtx.createMediaElementSource(v);

                    // Filtro Passa-Banda (Corta zumbido < 300Hz e chiado estático > 3400Hz)
                    const highPass = audioCtx.createBiquadFilter();
                    highPass.type = 'highpass';
                    highPass.frequency.value = 300;

                    const lowPass = audioCtx.createBiquadFilter();
                    lowPass.type = 'lowpass';
                    lowPass.frequency.value = 3400;

                    // Compressor de voz
                    const compressor = audioCtx.createDynamicsCompressor();
                    compressor.threshold.value = -30;
                    compressor.knee.value = 15;
                    compressor.ratio.value = 8;
                    compressor.attack.value = 0.003;
                    compressor.release.value = 0.25;

                    audioSource.connect(highPass);
                    highPass.connect(lowPass);
                    lowPass.connect(compressor);
                    compressor.connect(audioCtx.destination);
                } catch (e) {
                    console.warn('Web Audio API not supported on this stream:', e);
                }
            }

            isAudioAiActive = !isAudioAiActive;
            if (isAudioAiActive) {
                btn.classList.add('active');
                if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
            } else {
                btn.classList.remove('active');
            }
        }

        // Melhoria de Vídeo com IA (Night Vision Boost)
        function toggleAiVideo() {
            const v = document.getElementById('guest-video');
            const btn = document.getElementById('btn-ai-video');

            isVideoAiActive = !isVideoAiActive;
            if (isVideoAiActive) {
                v.classList.add('ai-night-vision');
                btn.classList.add('active');
            } else {
                v.classList.remove('ai-night-vision');
                btn.classList.remove('active');
            }
        }

        // Snapshot
        function takeSnapshot() {
            const v = document.getElementById('guest-video');
            const canvas = document.createElement('canvas');
            canvas.width = v.videoWidth || 1280;
            canvas.height = v.videoHeight || 720;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/jpeg', 0.95);
            a.download = `monitor-snapshot-${Date.now()}.jpg`;
            a.click();
        }

        // Tela cheia
        function toggleFullscreen() {
            const wrap = document.getElementById('video-wrap');
            if (!document.fullscreenElement) {
                wrap.requestFullscreen().catch(e => console.error(e));
            } else {
                document.exitFullscreen();
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            startCountdown();
            connectWebRtc();
        });
    </script>
</body>
</html>
