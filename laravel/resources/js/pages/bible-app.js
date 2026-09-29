/**
 * Bible App Logic — Conecta King
 * Narração de Voz (TTS pt-BR), Temas, Tipografia, Compartilhamento & Stories
 */

import '../../css/fonts.css';
import '../../css/fontawesome.css';
import '@css/pages/bible-app.css';

(function () {
    'use strict';

    // -------------------------------------------------------------
    // 1. Toast System
    // -------------------------------------------------------------
    function showToast(message, icon) {
        let toast = document.getElementById('bible-toast-elem');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'bible-toast-elem';
            toast.className = 'bible-toast';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<i class="${icon || 'fas fa-check-circle'}"></i> <span>${message}</span>`;
        toast.classList.add('show');
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2800);
    }

    // -------------------------------------------------------------
    // 2. Themes & Typography Manager
    // -------------------------------------------------------------
    const THEMES = ['dark', 'oled', 'sepia', 'light'];
    const LS_THEME = 'ck_bible_theme';
    const LS_FS = 'ck_bible_fs_idx';
    const LS_FONT = 'ck_bible_font_mode';

    const FONT_SIZES = ['0.95rem', '1.05rem', '1.15rem', '1.28rem', '1.45rem', '1.65rem'];
    let currentFsIdx = 2; // Default 1.15rem

    function initThemesAndFont() {
        const savedTheme = localStorage.getItem(LS_THEME) || 'dark';
        applyTheme(savedTheme, false);

        const savedFs = parseInt(localStorage.getItem(LS_FS), 10);
        if (!isNaN(savedFs) && savedFs >= 0 && savedFs < FONT_SIZES.length) {
            currentFsIdx = savedFs;
        }
        applyFontSize(currentFsIdx, false);

        const savedFontMode = localStorage.getItem(LS_FONT) || 'serif';
        applyFontMode(savedFontMode, false);
    }

    function applyTheme(theme, save = true) {
        THEMES.forEach(t => document.body.classList.remove('theme-' + t));
        if (theme !== 'dark') {
            document.body.classList.add('theme-' + theme);
        }
        document.querySelectorAll('[data-set-theme]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.setTheme === theme);
        });
        if (save) {
            localStorage.setItem(LS_THEME, theme);
            showToast(`Tema ${theme.toUpperCase()} aplicado`, 'fas fa-paint-brush');
        }
    }

    function applyFontSize(idx, save = true) {
        if (idx < 0) idx = 0;
        if (idx >= FONT_SIZES.length) idx = FONT_SIZES.length - 1;
        currentFsIdx = idx;
        document.documentElement.style.setProperty('--bible-fs', FONT_SIZES[currentFsIdx]);
        if (save) {
            localStorage.setItem(LS_FS, String(currentFsIdx));
        }
    }

    function applyFontMode(mode, save = true) {
        if (mode === 'sans') {
            document.body.classList.add('font-sans-mode');
        } else {
            document.body.classList.remove('font-sans-mode');
        }
        document.querySelectorAll('[data-set-font]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.setFont === mode);
        });
        if (save) {
            localStorage.setItem(LS_FONT, mode);
        }
    }

    // -------------------------------------------------------------
    // 3. Audio Narration (Web Speech Synthesis in pt-BR)
    // -------------------------------------------------------------
    const AudioEngine = {
        synth: window.speechSynthesis,
        currentUtterance: null,
        isPlaying: false,
        isPaused: false,
        speed: 1.0,
        textQueue: '',
        ptVoice: null,

        init() {
            if (!this.synth) return;
            const loadVoices = () => {
                const voices = this.synth.getVoices();
                this.ptVoice = voices.find(v => v.lang === 'pt-BR' || v.lang.startsWith('pt')) || null;
            };
            loadVoices();
            if (this.synth.onvoiceschanged !== undefined) {
                this.synth.onvoiceschanged = loadVoices;
            }
        },

        speak(text, previewTitle = 'Reproduzindo áudio...') {
            if (!this.synth) {
                showToast('Navegador não suporta narração de voz.', 'fas fa-exclamation-circle');
                return;
            }

            this.stop();
            const cleanText = text.replace(/<[^>]*>/g, '').trim();
            if (!cleanText) return;

            this.textQueue = cleanText;
            const utter = new SpeechSynthesisUtterance(cleanText);
            utter.lang = 'pt-BR';
            utter.rate = this.speed;
            if (this.ptVoice) utter.voice = this.ptVoice;

            utter.onstart = () => {
                this.isPlaying = true;
                this.isPaused = false;
                this.showPlayer(previewTitle);
                document.querySelectorAll('.btn-audio').forEach(b => b.classList.add('playing'));
            };

            utter.onend = () => {
                this.stop();
            };

            utter.onerror = () => {
                this.stop();
            };

            this.currentUtterance = utter;
            this.synth.speak(utter);
        },

        togglePlayPause() {
            if (!this.synth || !this.isPlaying) return;
            if (this.isPaused) {
                this.synth.resume();
                this.isPaused = false;
                this.updatePlayBtn(true);
            } else {
                this.synth.pause();
                this.isPaused = true;
                this.updatePlayBtn(false);
            }
        },

        stop() {
            if (this.synth) {
                this.synth.cancel();
            }
            this.isPlaying = false;
            this.isPaused = false;
            this.currentUtterance = null;
            this.hidePlayer();
            document.querySelectorAll('.btn-audio').forEach(b => b.classList.remove('playing'));
        },

        setSpeed(rate) {
            this.speed = rate;
            if (this.isPlaying && this.textQueue) {
                this.speak(this.textQueue);
            }
            showToast(`Velocidade: ${rate}x`, 'fas fa-tachometer-alt');
        },

        showPlayer(title) {
            let player = document.getElementById('bible-audio-player');
            if (player) {
                player.classList.add('visible');
                const titleElem = player.querySelector('.audio-text-preview');
                if (titleElem) titleElem.textContent = title;
                this.updatePlayBtn(true);
            }
        },

        hidePlayer() {
            let player = document.getElementById('bible-audio-player');
            if (player) {
                player.classList.remove('visible');
            }
        },

        updatePlayBtn(playing) {
            let btn = document.getElementById('btn-audio-toggle-pause');
            if (btn) {
                btn.innerHTML = playing ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
            }
        }
    };

    // -------------------------------------------------------------
    // 4. Instagram Stories Card Generator (Canvas 1080x1920)
    // -------------------------------------------------------------
    function generateStoriesCard(verseText, reference, ownerName = 'Bíblia Conecta King') {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext('2d');

        // Background Gradient luxuoso
        const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
        bgGrad.addColorStop(0, '#09090C');
        bgGrad.addColorStop(0.45, '#121217');
        bgGrad.addColorStop(0.7, '#16161D');
        bgGrad.addColorStop(1, '#09090C');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1080, 1920);

        // Moldura dourada elegante
        ctx.strokeStyle = 'rgba(255, 199, 0, 0.4)';
        ctx.lineWidth = 4;
        ctx.strokeRect(60, 60, 960, 1800);

        ctx.strokeStyle = 'rgba(255, 199, 0, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(75, 75, 930, 1770);

        // Header: Coroa e Título
        ctx.fillStyle = '#FFC700';
        ctx.font = 'bold 36px "Cinzel", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('♛ CONECTA KING BÍBLIA', 540, 240);

        // Divisor dourado
        const divGrad = ctx.createLinearGradient(300, 280, 780, 280);
        divGrad.addColorStop(0, 'rgba(255, 199, 0, 0)');
        divGrad.addColorStop(0.5, '#FFC700');
        divGrad.addColorStop(1, 'rgba(255, 199, 0, 0)');
        ctx.strokeStyle = divGrad;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(300, 280);
        ctx.lineTo(780, 280);
        ctx.stroke();

        // Aspas de abertura
        ctx.fillStyle = '#FFC700';
        ctx.font = 'italic 120px "Cinzel", serif';
        ctx.fillText('“', 540, 520);

        // Texto do versículo com quebra de linha automática
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '400 48px "Source Serif 4", Georgia, serif';
        const maxWidth = 800;
        const lineHeight = 76;
        const words = verseText.split(' ');
        let line = '';
        let y = 620;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                ctx.fillText(line.trim(), 540, y);
                line = words[n] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line.trim(), 540, y);

        // Referência Bíblica
        y += 110;
        ctx.fillStyle = '#FFC700';
        ctx.font = 'bold 44px "Cinzel", Georgia, serif';
        ctx.fillText(`— ${reference.toUpperCase()} —`, 540, y);

        // Footer: Branding
        ctx.fillStyle = '#94A3B8';
        ctx.font = '500 28px "Inter", sans-serif';
        ctx.fillText(ownerName, 540, 1660);

        ctx.fillStyle = '#64748B';
        ctx.font = '400 22px "Inter", sans-serif';
        ctx.fillText('Medite na Palavra de Deus diariamente', 540, 1710);

        // Download trigger
        const link = document.createElement('a');
        link.download = `versiculo-${reference.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('Imagem para Stories gerada!', 'fas fa-camera');
    }

    // -------------------------------------------------------------
    // 5. Global Initializer & Event Listeners
    // -------------------------------------------------------------
    document.addEventListener('DOMContentLoaded', function () {
        initThemesAndFont();
        AudioEngine.init();

        // Botão Ouvir Versículo / Narração
        document.querySelectorAll('[data-speak-target]').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                const selector = this.dataset.speakTarget;
                const targetElem = document.querySelector(selector);
                if (targetElem) {
                    const text = targetElem.innerText || targetElem.textContent;
                    const title = this.dataset.speakTitle || 'Versículo do Dia';
                    if (AudioEngine.isPlaying) {
                        AudioEngine.stop();
                    } else {
                        AudioEngine.speak(text, title);
                    }
                }
            });
        });

        // Botões de áudio player bar
        const btnToggleAudio = document.getElementById('btn-audio-toggle-pause');
        if (btnToggleAudio) {
            btnToggleAudio.addEventListener('click', () => AudioEngine.togglePlayPause());
        }

        const btnStopAudio = document.getElementById('btn-audio-stop');
        if (btnStopAudio) {
            btnStopAudio.addEventListener('click', () => AudioEngine.stop());
        }

        const btnSpeedAudio = document.getElementById('btn-audio-speed');
        if (btnSpeedAudio) {
            const speeds = [1.0, 1.25, 1.5];
            let sIdx = 0;
            btnSpeedAudio.addEventListener('click', () => {
                sIdx = (sIdx + 1) % speeds.length;
                const newSpeed = speeds[sIdx];
                btnSpeedAudio.textContent = newSpeed + 'x';
                AudioEngine.setSpeed(newSpeed);
            });
        }

        // Botão Compartilhar WhatsApp
        document.querySelectorAll('[data-share-wa]').forEach(btn => {
            btn.addEventListener('click', function (e) {
                const text = this.dataset.shareWa;
                if (!text) return;
                const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
                window.open(url, '_blank', 'noopener');
            });
        });

        // Botão Copiar Texto
        document.querySelectorAll('[data-copy-text]').forEach(btn => {
            btn.addEventListener('click', function (e) {
                const text = this.dataset.copyText;
                if (!text) return;
                navigator.clipboard.writeText(text).then(() => {
                    showToast('Copiado para a área de transferência!', 'fas fa-copy');
                }).catch(() => {
                    showToast('Erro ao copiar', 'fas fa-exclamation');
                });
            });
        });

        // Botão Stories
        document.querySelectorAll('[data-stories-verse]').forEach(btn => {
            btn.addEventListener('click', function (e) {
                const verse = this.dataset.storiesVerse;
                const ref = this.dataset.storiesRef || '';
                const owner = this.dataset.storiesOwner || 'Bíblia Conecta King';
                generateStoriesCard(verse, ref, owner);
            });
        });

        // Modal de Preferências
        const prefModal = document.getElementById('bible-pref-modal');
        const openPrefBtn = document.getElementById('btn-open-prefs');
        const closePrefBtn = document.getElementById('btn-close-prefs');

        if (openPrefBtn && prefModal) {
            openPrefBtn.addEventListener('click', () => {
                prefModal.classList.add('open');
            });
        }
        if (closePrefBtn && prefModal) {
            closePrefBtn.addEventListener('click', () => {
                prefModal.classList.remove('open');
            });
        }
        if (prefModal) {
            prefModal.addEventListener('click', (e) => {
                if (e.target === prefModal) prefModal.classList.remove('open');
            });
        }

        // Seleção de Tema
        document.querySelectorAll('[data-set-theme]').forEach(btn => {
            btn.addEventListener('click', function () {
                applyTheme(this.dataset.setTheme);
            });
        });

        // Seleção de Tipografia
        document.querySelectorAll('[data-set-font]').forEach(btn => {
            btn.addEventListener('click', function () {
                applyFontMode(this.dataset.setFont);
            });
        });

        // Tamanho da fonte A- / A+
        const btnFontDec = document.getElementById('btn-font-dec');
        const btnFontInc = document.getElementById('btn-font-inc');
        if (btnFontDec) {
            btnFontDec.addEventListener('click', () => applyFontSize(currentFsIdx - 1));
        }
        if (btnFontInc) {
            btnFontInc.addEventListener('click', () => applyFontSize(currentFsIdx + 1));
        }

        // Busca instantânea de livros na página do Hub
        const bookSearchInput = document.getElementById('bible-book-search');
        if (bookSearchInput) {
            bookSearchInput.addEventListener('input', function () {
                const q = this.value.toLowerCase().trim();
                document.querySelectorAll('.bible-book-card').forEach(card => {
                    const name = (card.dataset.bookName || card.innerText).toLowerCase();
                    card.style.display = name.includes(q) ? '' : 'none';
                });
            });
        }

        // Filtro por Testamento (Todos / AT / NT)
        document.querySelectorAll('[data-testament-tab]').forEach(tab => {
            tab.addEventListener('click', function () {
                document.querySelectorAll('[data-testament-tab]').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                const filter = this.dataset.testamentTab;
                document.querySelectorAll('.bible-book-card').forEach(card => {
                    if (filter === 'all') {
                        card.style.display = '';
                    } else {
                        card.style.display = card.dataset.testament === filter ? '' : 'none';
                    }
                });
            });
        });

        // Seleção e clique em versículos no Leitor
        document.querySelectorAll('.verse-item').forEach(vEl => {
            vEl.addEventListener('click', function () {
                const wasSelected = this.classList.contains('selected');
                document.querySelectorAll('.verse-item').forEach(v => v.classList.remove('selected'));
                if (!wasSelected) {
                    this.classList.add('selected');
                    const text = this.querySelector('.verse-text')?.innerText || this.innerText;
                    const num = this.querySelector('.verse-num')?.innerText || '';
                    showToast(`Versículo ${num} selecionado. Toque no topo para ouvir ou copiar.`, 'fas fa-bookmark');
                }
            });
        });
    });

    // Expor globalmente para páginas individuais
    window.BibleApp = {
        toast: showToast,
        speak: (text, title) => AudioEngine.speak(text, title),
        stopAudio: () => AudioEngine.stop(),
        generateStories: generateStoriesCard,
        applyTheme: applyTheme,
    };
})();
