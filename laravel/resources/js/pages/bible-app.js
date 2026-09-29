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

        // Controle de Velocidade do Áudio
        const btnSpeed = document.getElementById('btn-audio-speed');
        if (btnSpeed) {
            const SPEEDS = [1.0, 1.25, 1.5, 2.0, 0.8];
            btnSpeed.addEventListener('click', () => {
                let currentIdx = SPEEDS.indexOf(AudioEngine.speed);
                if (currentIdx === -1) currentIdx = 0;
                let nextIdx = (currentIdx + 1) % SPEEDS.length;
                let newSpeed = SPEEDS[nextIdx];
                AudioEngine.setSpeed(newSpeed);
                btnSpeed.textContent = newSpeed + 'x';
            });
        }

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

        // ---------------------------------------------------------
        // Modal de Busca Bíblica Global
        // ---------------------------------------------------------
        const searchModal = document.getElementById('bible-search-modal');
        const openSearchBtn = document.getElementById('btn-open-search');
        const closeSearchBtn = document.getElementById('btn-close-search');
        const searchInput = document.getElementById('bible-global-search-input');
        const searchResultsCont = document.getElementById('search-results-container');
        const searchStatusMsg = document.getElementById('search-status-msg');

        if (openSearchBtn && searchModal) {
            openSearchBtn.addEventListener('click', () => {
                searchModal.classList.add('open');
                setTimeout(() => searchInput?.focus(), 150);
            });
        }
        if (closeSearchBtn && searchModal) {
            closeSearchBtn.addEventListener('click', () => {
                searchModal.classList.remove('open');
            });
        }
        if (searchModal) {
            searchModal.addEventListener('click', (e) => {
                if (e.target === searchModal) searchModal.classList.remove('open');
            });
        }

        let searchDebounceTimer = null;
        function performSearch(term) {
            const q = (term || '').trim();
            if (q.length < 2) {
                if (searchResultsCont) searchResultsCont.innerHTML = '';
                if (searchStatusMsg) searchStatusMsg.style.display = 'none';
                return;
            }

            if (searchStatusMsg) {
                searchStatusMsg.style.display = 'block';
                searchStatusMsg.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando nas Escrituras...';
            }

            fetch(`/api/bible/search?q=${encodeURIComponent(q)}&limit=30`)
                .then(res => res.json())
                .then(data => {
                    if (!searchResultsCont) return;
                    searchResultsCont.innerHTML = '';

                    const results = data.data || [];
                    if (searchStatusMsg) {
                        if (results.length === 0) {
                            searchStatusMsg.innerHTML = `Nenhum versículo encontrado para "<strong>${q}</strong>".`;
                        } else {
                            searchStatusMsg.innerHTML = `Encontrado(s) <strong>${results.length}</strong> versículo(s) para "<strong>${q}</strong>":`;
                        }
                    }

                    const pathParts = window.location.pathname.split('/').filter(Boolean);
                    const slug = pathParts[0] || '';

                    results.forEach(item => {
                        const regex = new RegExp(`(${q.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
                        const highlighted = item.text.replace(regex, '<mark>$1</mark>');
                        const linkUrl = `/${slug}/biblia/${item.bookId}/${item.chapter}#v${item.verse}`;

                        const a = document.createElement('a');
                        a.href = linkUrl;
                        a.className = 'search-result-item';
                        a.innerHTML = `
                            <div class="search-result-ref"><i class="fas fa-book-open"></i> ${item.reference}</div>
                            <div class="search-result-text">"${highlighted}"</div>
                        `;
                        searchResultsCont.appendChild(a);
                    });
                })
                .catch(() => {
                    if (searchStatusMsg) searchStatusMsg.innerHTML = 'Erro ao realizar busca. Tente novamente.';
                });
        }

        if (searchInput) {
            searchInput.addEventListener('input', function () {
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(() => performSearch(this.value), 320);
            });
        }

        document.querySelectorAll('.search-tag').forEach(tag => {
            tag.addEventListener('click', function () {
                const term = this.dataset.tag || this.innerText;
                if (searchInput) {
                    searchInput.value = term;
                    performSearch(term);
                }
            });
        });

        // ---------------------------------------------------------
        // Modal Pergunte à Bíblia (Conselheiro Espiritual)
        // ---------------------------------------------------------
        const askModal = document.getElementById('bible-ask-modal');
        const openAskBtn = document.getElementById('btn-open-ask-ai');
        const closeAskBtn = document.getElementById('btn-close-ask');
        const askInput = document.getElementById('bible-ask-input');
        const btnSubmitAsk = document.getElementById('btn-submit-ask');
        const askAnswerCont = document.getElementById('ask-answer-container');

        if (openAskBtn && askModal) {
            openAskBtn.addEventListener('click', () => {
                askModal.classList.add('open');
                setTimeout(() => askInput?.focus(), 150);
            });
        }
        if (closeAskBtn && askModal) {
            closeAskBtn.addEventListener('click', () => {
                askModal.classList.remove('open');
            });
        }
        if (askModal) {
            askModal.addEventListener('click', (e) => {
                if (e.target === askModal) askModal.classList.remove('open');
            });
        }

        const BIBLE_COUNSEL_TOPICS = {
            ansiedade: {
                title: "Vencendo a Ansiedade e o Medo",
                verse: "Não andeis ansiosos de coisa alguma; em tudo, porém, sejam conhecidas diante de Deus as vossas petições, pela oração e pela súplica, com ações de graças. E a paz de Deus, que excede todo o entendimento, guardará os vossos corações e os vossos sentimentos em Cristo Jesus.",
                ref: "Filipenses 4:6-7",
                counsel: "Deus sabe exatamente as batalhas que você está enfrentando. Ele não quer que você carregue o fardo do amanhã sozinho. Entregue cada preocupação nas mãos do Pai agora mesmo e descanse na certeza de que Ele cuida de você.",
                prayer: "Senhor, coloco diante de Ti toda a ansiedade e incerteza. Enche meu coração com a Tua paz que excede todo entendimento. Amém!"
            },
            financas: {
                title: "Sabedoria Financeira e Provisão",
                verse: "O meu Deus suprirá todas as necessidades de vocês, de acordo com as suas gloriosas riquezas em Cristo Jesus.",
                ref: "Filipenses 4:19",
                counsel: "A verdadeira prosperidade começa com a fidelidade nos princípios e a sabedoria no trabalho diário (Provérbios 3:9-10). Deus é o provedor soberano que abre portas onde não há caminhos.",
                prayer: "Pai celestial, concede-me sabedoria para gerir tudo o que colocas em minhas mãos. Abre portas de oportunidade e abençoa o trabalho das minhas mãos. Amém!"
            },
            perdao: {
                title: "Cura do Coração e Perdão",
                verse: "Sejam bondosos e compassivos uns para com os outros, perdoando-se mutuamente, assim como Deus os perdoou em Cristo.",
                ref: "Efésios 4:32",
                counsel: "O perdão não é um sentimento, é uma decisão de libertar a sua própria alma da prisão do ressentimento. Ao perdoar, você abre espaço para a cura completa de Deus fluir em sua vida.",
                prayer: "Senhor Jesus, ajuda-me a liberar perdão assim como fui perdoado por Ti. Sara as feridas do meu coração e renova minhas forças. Amém!"
            },
            familia: {
                title: "Proteção e Amor no Lar",
                verse: "Eu e a minha família serviremos ao Senhor.",
                ref: "Josué 24:15",
                counsel: "A família é o projeto mais precioso de Deus na terra. Cubra seu lar com amor paciente, oração diária e palavras de bênção. O amor de Cristo sustenta o casamento e os filhos.",
                prayer: "Deus de amor, abençoa e protege minha família. Que haja unidade, respeito e a Tua presença diária em nosso lar. Amém!"
            },
            forca: {
                title: "Força nas Dificuldades",
                verse: "Tudo posso naquele que me fortalece.",
                ref: "Filipenses 4:13",
                counsel: "Nos momentos em que suas forças humanas se esgotam, o poder de Deus se aperfeiçoa em sua fraqueza (2 Coríntios 12:9). Você não está sozinho nesta travessia; a vitória já está decretada.",
                prayer: "Senhor Deus, renova minhas energias como a águia. Dá-me forças para continuar e fé inabalável para vencer as tempestades. Amém!"
            },
            gratidao: {
                title: "Gratidão e Louvor",
                verse: "Deem graças em todas as circunstâncias, pois esta é a vontade de Deus para vocês em Cristo Jesus.",
                ref: "1 Tessalonicenses 5:18",
                counsel: "A gratidão transforma o que temos em suficiência e abre as janelas do céu para novas bênçãos. Agradeça pelas vitórias e até pelos aprendizados da jornada.",
                prayer: "Pai bondoso, obrigado pela vida, pela Tua graça infalível e por cada livramento visível e invisível. Meu coração Te louva! Amém!"
            }
        };

        function showCounsel(topicKey, customQuery = '') {
            if (!askAnswerCont) return;
            const data = BIBLE_COUNSEL_TOPICS[topicKey] || {
                title: customQuery ? `Orientação para: "${customQuery}"` : "Palavra de Orientação",
                verse: "Lâmpada para os meus pés é tua palavra e luz, para o meu caminho.",
                ref: "Salmos 119:105",
                counsel: "A Bíblia Sagrada é o mapa vivo de Deus para cada passo seu. Busque primeiro o Reino de Deus e a Sua justiça, e todas as coisas lhe serão acrescentadas (Mateus 6:33).",
                prayer: "Senhor, guia meus passos conforme a Tua Palavra. Que a Tua verdade ilumine minhas escolhas diárias. Amém!"
            };

            askAnswerCont.style.display = 'block';
            askAnswerCont.innerHTML = `
                <div style="font-weight:700;font-size:1.05rem;color:var(--gold-primary);margin-bottom:8px;">
                    <i class="fas fa-feather-alt"></i> ${data.title}
                </div>
                <blockquote style="font-family:var(--bible-font-family);font-style:italic;color:var(--text-primary);margin:10px 0;padding-left:10px;border-left:3px solid var(--gold-primary);">
                    "${data.verse}"
                    <div style="font-weight:700;color:var(--gold-primary);font-size:0.85rem;margin-top:4px;font-style:normal;">— ${data.ref}</div>
                </blockquote>
                <p style="margin:10px 0;color:var(--text-secondary);">${data.counsel}</p>
                <div style="margin-top:12px;padding:10px;background:rgba(255,199,0,0.08);border-radius:8px;">
                    <strong style="color:var(--gold-primary);font-size:0.85rem;text-transform:uppercase;letter-spacing:0.04em;">Oração Guiada:</strong>
                    <div style="font-style:italic;margin-top:4px;color:var(--text-primary);">${data.prayer}</div>
                </div>
            `;
        }

        document.querySelectorAll('.ask-topic-chip').forEach(chip => {
            chip.addEventListener('click', function () {
                const topic = this.dataset.topic;
                showCounsel(topic);
            });
        });

        if (btnSubmitAsk) {
            btnSubmitAsk.addEventListener('click', () => {
                const q = (askInput?.value || '').trim();
                if (!q) {
                    showToast('Digite uma pergunta ou momento de oração.', 'fas fa-info-circle');
                    return;
                }
                const lower = q.toLowerCase();
                let matchedTopic = null;
                if (lower.includes('ansie') || lower.includes('medo') || lower.includes('paz') || lower.includes('dormir')) matchedTopic = 'ansiedade';
                else if (lower.includes('dinheiro') || lower.includes('finan') || lower.includes('trabalho') || lower.includes('divida')) matchedTopic = 'financas';
                else if (lower.includes('perdo') || lower.includes('magoa') || lower.includes('raiva') || lower.includes('cura')) matchedTopic = 'perdao';
                else if (lower.includes('casam') || lower.includes('filho') || lower.includes('famili') || lower.includes('espos')) matchedTopic = 'familia';
                else if (lower.includes('luta') || lower.includes('forca') || lower.includes('triste') || lower.includes('fraqu')) matchedTopic = 'forca';
                else if (lower.includes('grato') || lower.includes('obrigad') || lower.includes('louvor') || lower.includes('benc')) matchedTopic = 'gratidao';

                showCounsel(matchedTopic, q);
            });
        }

        // ---------------------------------------------------------
        // Continuar Leitura & Streak Espiritual
        // ---------------------------------------------------------
        const chapterContainer = document.getElementById('chapter-verses-container');
        if (chapterContainer) {
            const bId = chapterContainer.dataset.bookId;
            const bName = chapterContainer.dataset.bookName;
            const chNum = chapterContainer.dataset.chapter;
            const trans = chapterContainer.dataset.translation || 'nvi';

            if (bId && chNum) {
                const readRecord = {
                    bookId: bId,
                    bookName: bName || bId,
                    chapter: chNum,
                    translation: trans,
                    url: window.location.pathname,
                    date: new Date().toISOString()
                };
                try {
                    localStorage.setItem('ck_bible_last_read', JSON.stringify(readRecord));
                } catch (e) {}

                // Atualizar Streak diário
                try {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    const lastStreakDate = localStorage.getItem('ck_bible_streak_date');
                    let count = parseInt(localStorage.getItem('ck_bible_streak_count') || '1', 10);

                    if (lastStreakDate !== todayStr) {
                        if (lastStreakDate) {
                            const diffDays = Math.round((new Date(todayStr) - new Date(lastStreakDate)) / (1000 * 60 * 60 * 24));
                            if (diffDays === 1) count += 1;
                            else if (diffDays > 1) count = 1;
                        }
                        localStorage.setItem('ck_bible_streak_date', todayStr);
                        localStorage.setItem('ck_bible_streak_count', String(count));
                    }
                } catch (e) {}
            }
        }

        // Carregar Continuar Leitura e Streak no Hub
        const continueCard = document.getElementById('hub-continue-card');
        const continueTitle = document.getElementById('hub-continue-title');
        const streakCountElem = document.getElementById('hub-streak-count');

        try {
            const streakVal = localStorage.getItem('ck_bible_streak_count') || '1';
            if (streakCountElem) streakCountElem.textContent = streakVal;

            const savedLastRead = localStorage.getItem('ck_bible_last_read');
            if (savedLastRead && continueCard && continueTitle) {
                const item = JSON.parse(savedLastRead);
                if (item && item.url && item.bookName && item.chapter) {
                    continueTitle.textContent = `${item.bookName} · Capítulo ${item.chapter}`;
                    continueCard.href = item.url;
                    continueCard.style.display = 'flex';
                }
            }
        } catch (e) {}

        // ---------------------------------------------------------
        // Marca-Texto Colorido, Favoritos & Verse Action Bar
        // ---------------------------------------------------------
        const verseActionBar = document.getElementById('verse-action-bar');
        const LS_HIGHLIGHTS = 'ck_bible_highlights';
        let highlights = {};
        try {
            highlights = JSON.parse(localStorage.getItem(LS_HIGHLIGHTS) || '{}');
        } catch (e) {
            highlights = {};
        }

        // Aplicar marcações salvas nos versículos
        if (chapterContainer) {
            const bId = chapterContainer.dataset.bookId || '';
            const chNum = chapterContainer.dataset.chapter || '';

            document.querySelectorAll('.verse-item').forEach(vEl => {
                const vNum = vEl.dataset.verseNum || '';
                const key = `${bId}-${chNum}-${vNum}`;
                if (highlights[key]) {
                    vEl.classList.add('highlight-' + highlights[key]);
                }
            });
        }

        let activeVerseData = null;

        document.querySelectorAll('.verse-item').forEach(vEl => {
            vEl.addEventListener('click', function (e) {
                e.stopPropagation();
                const wasSelected = this.classList.contains('selected');
                document.querySelectorAll('.verse-item').forEach(v => v.classList.remove('selected'));

                if (!wasSelected) {
                    this.classList.add('selected');
                    const text = this.querySelector('.verse-text')?.innerText || this.innerText;
                    const num = this.dataset.verseNum || '';
                    const bId = chapterContainer?.dataset.bookId || '';
                    const bName = chapterContainer?.dataset.bookName || '';
                    const chNum = chapterContainer?.dataset.chapter || '';
                    const ref = `${bName} ${chNum}:${num}`;

                    activeVerseData = {
                        key: `${bId}-${chNum}-${num}`,
                        element: this,
                        text: text.trim(),
                        ref: ref,
                    };

                    if (verseActionBar) verseActionBar.classList.add('visible');
                } else {
                    activeVerseData = null;
                    if (verseActionBar) verseActionBar.classList.remove('visible');
                }
            });
        });

        // Fechar barra ao clicar fora
        document.addEventListener('click', (e) => {
            if (verseActionBar && !verseActionBar.contains(e.target) && !e.target.closest('.verse-item')) {
                verseActionBar.classList.remove('visible');
                document.querySelectorAll('.verse-item').forEach(v => v.classList.remove('selected'));
                activeVerseData = null;
            }
        });

        // Botões de Cores do Marca-Texto
        document.querySelectorAll('.color-picker-dot').forEach(dot => {
            dot.addEventListener('click', function () {
                if (!activeVerseData) return;
                const color = this.dataset.color;
                const el = activeVerseData.element;
                const key = activeVerseData.key;

                ['gold', 'green', 'blue', 'pink'].forEach(c => el.classList.remove('highlight-' + c));

                if (color === 'clear') {
                    delete highlights[key];
                    showToast('Marcação removida', 'fas fa-eraser');
                } else {
                    el.classList.add('highlight-' + color);
                    highlights[key] = color;
                    showToast(`Versículo marcado em ${color.toUpperCase()}`, 'fas fa-highlighter');
                }

                try {
                    localStorage.setItem(LS_HIGHLIGHTS, JSON.stringify(highlights));
                } catch (e) {}
            });
        });

        // Ações da Barra: WhatsApp
        const btnVerseWpp = document.getElementById('btn-verse-wpp');
        if (btnVerseWpp) {
            btnVerseWpp.addEventListener('click', () => {
                if (!activeVerseData) return;
                const msg = `"${activeVerseData.text}"\n— ${activeVerseData.ref}\n\n📖 Bíblia King · ${window.location.href}`;
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
            });
        }

        // Ações da Barra: Copiar
        const btnVerseCopy = document.getElementById('btn-verse-copy');
        if (btnVerseCopy) {
            btnVerseCopy.addEventListener('click', () => {
                if (!activeVerseData) return;
                const msg = `"${activeVerseData.text}" — ${activeVerseData.ref}`;
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(msg).then(() => {
                        showToast('Versículo copiado para a área de transferência!', 'fas fa-check');
                    });
                } else {
                    showToast('Copiado!', 'fas fa-check');
                }
            });
        }

        // Ações da Barra: Story
        const btnVerseStory = document.getElementById('btn-verse-story');
        if (btnVerseStory) {
            btnVerseStory.addEventListener('click', () => {
                if (!activeVerseData) return;
                generateStoriesCard(activeVerseData.text, activeVerseData.ref, 'Bíblia King');
            });
        }

        // Ações da Barra: Ouvir
        const btnVerseSpeak = document.getElementById('btn-verse-speak');
        if (btnVerseSpeak) {
            btnVerseSpeak.addEventListener('click', () => {
                if (!activeVerseData) return;
                AudioEngine.speak(activeVerseData.text, activeVerseData.ref);
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
