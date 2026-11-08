<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KingSelection — Login & Planos para Fotógrafos</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Cinzel:wght@700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
        :root {
            --bg-deep: #07090e;
            --bg-card: rgba(18, 24, 38, 0.75);
            --bg-card-hover: rgba(26, 34, 53, 0.85);
            --border-gold: rgba(245, 158, 11, 0.35);
            --border-subtle: rgba(255, 255, 255, 0.08);
            --gold-primary: #f59e0b;
            --gold-light: #fbbf24;
            --gold-glow: rgba(245, 158, 11, 0.25);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Plus Jakarta Sans', sans-serif;
        }

        body {
            background-color: var(--bg-deep);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            position: relative;
            overflow-x: hidden;
            background-image: 
                radial-gradient(circle at 50% -20%, rgba(245, 158, 11, 0.15), transparent 60%),
                radial-gradient(circle at 10% 80%, rgba(30, 58, 138, 0.1), transparent 50%);
        }

        /* Top Bar */
        .ks-header {
            width: 100%;
            padding: 1.25rem 2rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--border-subtle);
            backdrop-filter: blur(12px);
            background: rgba(7, 9, 14, 0.7);
            position: sticky;
            top: 0;
            z-index: 50;
        }

        .ks-brand {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            text-decoration: none;
        }

        .ks-brand img {
            width: 38px;
            height: 38px;
            object-fit: contain;
            filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.4));
        }

        .ks-brand-title {
            font-size: 1.35rem;
            font-weight: 800;
            letter-spacing: -0.5px;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 0.35rem;
        }

        .ks-brand-title span {
            color: var(--gold-light);
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .ks-header-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.35rem 0.85rem;
            border-radius: 9999px;
            background: rgba(245, 158, 11, 0.12);
            border: 1px solid rgba(245, 158, 11, 0.3);
            color: var(--gold-light);
            font-size: 0.8rem;
            font-weight: 700;
        }

        /* Main Container */
        .ks-main-container {
            width: 100%;
            max-width: 1100px;
            padding: 2.5rem 1.5rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3.5rem;
        }

        /* Login Card */
        .ks-auth-box {
            width: 100%;
            max-width: 440px;
            background: var(--bg-card);
            border: 1px solid var(--border-gold);
            border-radius: 20px;
            padding: 2.25rem 2rem;
            box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 35px -10px var(--gold-glow);
            backdrop-filter: blur(16px);
            position: relative;
        }

        .ks-auth-box::before {
            content: '';
            position: absolute;
            top: 0;
            left: 20%;
            right: 20%;
            height: 2px;
            background: linear-gradient(90deg, transparent, var(--gold-light), transparent);
        }

        .ks-auth-header {
            text-align: center;
            margin-bottom: 2rem;
        }

        .ks-auth-header h1 {
            font-size: 1.6rem;
            font-weight: 800;
            color: #fff;
            margin-bottom: 0.4rem;
        }

        .ks-auth-header p {
            color: var(--text-muted);
            font-size: 0.9rem;
        }

        .ks-form-group {
            margin-bottom: 1.25rem;
        }

        .ks-form-group label {
            display: block;
            font-size: 0.85rem;
            font-weight: 600;
            color: #e2e8f0;
            margin-bottom: 0.45rem;
        }

        .ks-input-wrap {
            position: relative;
            display: flex;
            align-items: center;
        }

        .ks-input-wrap i.prefix {
            position: absolute;
            left: 1rem;
            color: var(--text-muted);
            font-size: 0.95rem;
            pointer-events: none;
        }

        .ks-input {
            width: 100%;
            padding: 0.85rem 1rem 0.85rem 2.65rem;
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 12px;
            color: #fff;
            font-size: 0.95rem;
            transition: all 0.2s ease;
        }

        .ks-input:focus {
            outline: none;
            border-color: var(--gold-primary);
            box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
            background: rgba(15, 23, 42, 1);
        }

        .ks-toggle-pwd {
            position: absolute;
            right: 1rem;
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            font-size: 0.95rem;
            padding: 0.25rem;
        }

        .ks-toggle-pwd:hover {
            color: var(--gold-light);
        }

        .ks-btn-login {
            width: 100%;
            padding: 0.95rem 1.5rem;
            border: none;
            border-radius: 12px;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: #0f172a;
            font-size: 1rem;
            font-weight: 800;
            letter-spacing: 0.3px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.6rem;
            transition: all 0.25s ease;
            box-shadow: 0 6px 20px -4px rgba(245, 158, 11, 0.4);
            margin-top: 1.5rem;
        }

        .ks-btn-login:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px -4px rgba(245, 158, 11, 0.6);
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        }

        .ks-btn-login:disabled {
            opacity: 0.65;
            cursor: not-allowed;
            transform: none;
        }

        .ks-auth-footer {
            margin-top: 1.5rem;
            padding-top: 1.25rem;
            border-top: 1px solid var(--border-subtle);
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            text-align: center;
            font-size: 0.85rem;
            color: var(--text-muted);
        }

        .ks-auth-footer a {
            color: var(--gold-light);
            text-decoration: none;
            font-weight: 600;
        }

        .ks-auth-footer a:hover {
            text-decoration: underline;
        }

        /* Simulator Section */
        .ks-sim-section {
            width: 100%;
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            border-radius: 24px;
            padding: 2.75rem 2.25rem;
            backdrop-filter: blur(14px);
            position: relative;
        }

        .ks-sim-header {
            text-align: center;
            max-width: 680px;
            margin: 0 auto 2.5rem;
        }

        .ks-sim-header h2 {
            font-size: 1.85rem;
            font-weight: 800;
            color: #fff;
            margin-bottom: 0.6rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }

        .ks-sim-header p {
            color: var(--text-muted);
            font-size: 0.95rem;
            line-height: 1.5;
        }

        /* Controls Box */
        .ks-sim-controls {
            background: rgba(15, 23, 42, 0.9);
            border: 1px solid rgba(245, 158, 11, 0.2);
            border-radius: 18px;
            padding: 1.75rem;
            margin-bottom: 2.5rem;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
        }

        .ks-presets-row {
            display: flex;
            flex-wrap: wrap;
            gap: 0.65rem;
            align-items: center;
            justify-content: center;
        }

        .ks-preset-btn {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #e2e8f0;
            padding: 0.6rem 1.1rem;
            border-radius: 10px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }

        .ks-preset-btn:hover {
            border-color: var(--gold-light);
            background: rgba(245, 158, 11, 0.1);
            color: #fff;
        }

        .ks-preset-btn.active {
            background: rgba(245, 158, 11, 0.2);
            border-color: var(--gold-primary);
            color: var(--gold-light);
            box-shadow: 0 0 15px -3px var(--gold-glow);
        }

        .ks-slider-box {
            display: flex;
            align-items: center;
            gap: 1.25rem;
            margin-top: 0.5rem;
        }

        .ks-slider {
            flex: 1;
            height: 8px;
            -webkit-appearance: none;
            background: rgba(255, 255, 255, 0.12);
            border-radius: 4px;
            outline: none;
            cursor: pointer;
        }

        .ks-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: var(--gold-primary);
            border: 2px solid #fff;
            box-shadow: 0 0 12px var(--gold-primary);
            cursor: grab;
        }

        .ks-slider-val {
            min-width: 90px;
            font-size: 1.15rem;
            font-weight: 800;
            color: var(--gold-light);
            background: rgba(245, 158, 11, 0.1);
            padding: 0.4rem 0.8rem;
            border-radius: 8px;
            text-align: center;
            border: 1px solid rgba(245, 158, 11, 0.25);
        }

        /* Plan Cards Grid */
        .ks-plans-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
            gap: 1.5rem;
            width: 100%;
        }

        .ks-plan-card {
            background: rgba(15, 23, 42, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 18px;
            padding: 2rem 1.6rem;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
            position: relative;
            transition: all 0.3s ease;
        }

        .ks-plan-card:hover {
            transform: translateY(-4px);
            border-color: rgba(245, 158, 11, 0.4);
            box-shadow: 0 15px 30px -10px rgba(0, 0, 0, 0.5);
        }

        .ks-plan-card.featured {
            border-color: var(--gold-primary);
            background: linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.9) 100%);
            box-shadow: 0 10px 30px -5px var(--gold-glow);
        }

        .ks-plan-badge {
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: #0f172a;
            padding: 0.25rem 0.85rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .ks-plan-header {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .ks-plan-name {
            font-size: 1.25rem;
            font-weight: 800;
            color: #fff;
        }

        .ks-plan-storage {
            font-size: 1.85rem;
            font-weight: 800;
            color: var(--gold-light);
        }

        .ks-plan-price {
            font-size: 1.15rem;
            font-weight: 700;
            color: #e2e8f0;
        }

        .ks-plan-price span {
            font-size: 0.85rem;
            color: var(--text-muted);
            font-weight: 500;
        }

        .ks-capacity-box {
            background: rgba(0, 0, 0, 0.35);
            border-radius: 12px;
            padding: 1.1rem;
            border: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
        }

        .ks-cap-metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.9rem;
        }

        .ks-cap-metric span.label {
            color: var(--text-muted);
        }

        .ks-cap-metric span.val {
            font-weight: 800;
            color: #fff;
        }

        .ks-plan-btn {
            width: 100%;
            padding: 0.85rem 1rem;
            border-radius: 10px;
            font-size: 0.9rem;
            font-weight: 700;
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            transition: all 0.2s ease;
            margin-top: auto;
        }

        .ks-btn-outline {
            background: transparent;
            border: 1px solid rgba(245, 158, 11, 0.4);
            color: var(--gold-light);
        }

        .ks-btn-outline:hover {
            background: rgba(245, 158, 11, 0.15);
            border-color: var(--gold-light);
        }

        .ks-btn-solid {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            border: none;
            color: #0f172a;
        }

        .ks-btn-solid:hover {
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            box-shadow: 0 4px 15px var(--gold-glow);
        }

        @media (max-width: 640px) {
            .ks-header {
                padding: 1rem 1.25rem;
            }
            .ks-main-container {
                padding: 1.5rem 1rem;
                gap: 2.5rem;
            }
            .ks-auth-box {
                padding: 1.75rem 1.25rem;
            }
            .ks-sim-section {
                padding: 1.75rem 1.25rem;
            }
            .ks-slider-box {
                flex-direction: column;
                align-items: stretch;
            }
            .ks-slider-val {
                text-align: center;
            }
        }
    </style>
</head>
<body>

    <!-- Header -->
    <header class="ks-header">
        <a href="/" class="ks-brand">
            <img src="https://i.ibb.co/60sW9k75/logo.png" alt="Conecta King Logo">
            <div class="ks-brand-title">King<span>Selection</span></div>
        </a>
        <div class="ks-header-badge">
            <i class="fas fa-camera"></i> Área do Fotógrafo
        </div>
    </header>

    <!-- Main Content -->
    <main class="ks-main-container">

        <!-- Login Box -->
        <div class="ks-auth-box">
            <div class="ks-auth-header">
                <h1>Painel do Fotógrafo</h1>
                <p>Acesse suas galerias, clientes e seleções em andamento</p>
            </div>

            <form id="ks-login-form" onsubmit="handleKsLogin(event)">
                <div class="ks-form-group">
                    <label for="ks-email">E-mail ou Usuário</label>
                    <div class="ks-input-wrap">
                        <i class="fas fa-envelope prefix"></i>
                        <input type="text" id="ks-email" class="ks-input" placeholder="seuemail@exemplo.com" required autocomplete="username">
                    </div>
                </div>

                <div class="ks-form-group">
                    <label for="ks-password">Senha de Acesso</label>
                    <div class="ks-input-wrap">
                        <i class="fas fa-lock prefix"></i>
                        <input type="password" id="ks-password" class="ks-input" placeholder="••••••••" required autocomplete="current-password">
                        <button type="button" class="ks-toggle-pwd" onclick="togglePasswordVisibility()" aria-label="Mostrar Senha">
                            <i class="fas fa-eye" id="ks-pwd-icon"></i>
                        </button>
                    </div>
                </div>

                <button type="submit" class="ks-btn-login" id="ks-btn-submit">
                    <span>Acessar Meus Projetos</span>
                    <i class="fas fa-arrow-right"></i>
                </button>
            </form>

            <div class="ks-auth-footer">
                <div>Ainda não é fotógrafo assinante? <a href="https://wa.me/5594991599815?text=Ol%C3%A1!%20Gostaria%20de%20assinar%20o%20King%20Selection%20para%20fot%C3%B3grafos." target="_blank">Contratar Plano</a></div>
                <div>Problemas no acesso? <a href="https://wa.me/5594991599815?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20para%20acessar%20meu%20painel%20do%20King%20Selection." target="_blank">Falar com Suporte WhatsApp</a></div>
            </div>
        </div>

        <!-- Simulator Section -->
        <section class="ks-sim-section" id="simulador">
            <div class="ks-sim-header">
                <h2><i class="fas fa-calculator" style="color: var(--gold-light);"></i> Simulador de Capacidade de Fotos</h2>
                <p>Descubra exatamente quantas fotos e ensaios cabem em cada plano de acordo com o tamanho médio dos seus arquivos.</p>
            </div>

            <!-- Controls -->
            <div class="ks-sim-controls">
                <div style="font-size: 0.9rem; font-weight: 700; color: #fff; text-align: center;">
                    Qual o peso médio dos seus arquivos exportados?
                </div>

                <div class="ks-presets-row">
                    <button type="button" class="ks-preset-btn active" onclick="setPresetSize(3.0, this)">
                        <i class="fas fa-bolt"></i> 3 MB (Web Rápida)
                    </button>
                    <button type="button" class="ks-preset-btn" onclick="setPresetSize(7.0, this)">
                        <i class="fas fa-star" style="color: var(--gold-light);"></i> 7 MB (Recomendado)
                    </button>
                    <button type="button" class="ks-preset-btn" onclick="setPresetSize(10.0, this)">
                        <i class="fas fa-image"></i> 10 MB (Alta Definição)
                    </button>
                    <button type="button" class="ks-preset-btn" onclick="setPresetSize(15.0, this)">
                        <i class="fas fa-camera"></i> 15 MB (Original/Full)
                    </button>
                </div>

                <div class="ks-slider-box">
                    <input type="range" min="1.0" max="20.0" step="0.5" value="7.0" class="ks-slider" id="photo-size-slider" oninput="onSliderChange(this.value)">
                    <div class="ks-slider-val" id="photo-size-display">7.0 MB</div>
                </div>
            </div>

            <!-- Plans Grid with dynamic capacity -->
            <div class="ks-plans-grid">
                <!-- 20 GB -->
                <div class="ks-plan-card">
                    <div class="ks-plan-header">
                        <div class="ks-plan-name">Plano Starter</div>
                        <div class="ks-plan-storage">20 GB</div>
                        <div class="ks-plan-price">R$ 39,90 <span>/ mês</span></div>
                    </div>

                    <div class="ks-capacity-box">
                        <div class="ks-cap-metric">
                            <span class="label"><i class="fas fa-images"></i> Total de Fotos:</span>
                            <span class="val" id="plan-20-photos">~2.900 fotos</span>
                        </div>
                        <div class="ks-cap-metric">
                            <span class="label"><i class="fas fa-folder-open"></i> Ensaios Médios:</span>
                            <span class="val" id="plan-20-shoots">~10 ensaios (300 fotos)</span>
                        </div>
                        <div class="ks-cap-metric">
                            <span class="label"><i class="fas fa-tachometer-alt"></i> Redutor Automático:</span>
                            <span class="val" style="color: #10b981;">Incluso</span>
                        </div>
                    </div>

                    <a href="https://wa.me/5594991599815?text=Ol%C3%A1!%20Quero%20assinar%20o%20Plano%20Starter%20de%2020%20GB%20do%20King%20Selection." target="_blank" class="ks-plan-btn ks-btn-outline">
                        <span>Escolher 20 GB</span>
                        <i class="fas fa-chevron-right"></i>
                    </a>
                </div>

                <!-- 30 GB -->
                <div class="ks-plan-card featured">
                    <div class="ks-plan-badge">Mais Popular</div>
                    <div class="ks-plan-header">
                        <div class="ks-plan-name">Plano Pro</div>
                        <div class="ks-plan-storage">30 GB</div>
                        <div class="ks-plan-price">R$ 59,90 <span>/ mês</span></div>
                    </div>

                    <div class="ks-capacity-box">
                        <div class="ks-cap-metric">
                            <span class="label"><i class="fas fa-images"></i> Total de Fotos:</span>
                            <span class="val" id="plan-30-photos">~4.350 fotos</span>
                        </div>
                        <div class="ks-cap-metric">
                            <span class="label"><i class="fas fa-folder-open"></i> Ensaios Médios:</span>
                            <span class="val" id="plan-30-shoots">~15 ensaios (300 fotos)</span>
                        </div>
                        <div class="ks-cap-metric">
                            <span class="label"><i class="fas fa-id-badge"></i> Reconhecimento Facial:</span>
                            <span class="val" style="color: var(--gold-light);">Ativado</span>
                        </div>
                    </div>

                    <a href="https://wa.me/5594991599815?text=Ol%C3%A1!%20Quero%20assinar%20o%20Plano%20Pro%20de%2030%20GB%20do%20King%20Selection." target="_blank" class="ks-plan-btn ks-btn-solid">
                        <span>Escolher 30 GB</span>
                        <i class="fas fa-chevron-right"></i>
                    </a>
                </div>

                <!-- 60 GB -->
                <div class="ks-plan-card">
                    <div class="ks-plan-header">
                        <div class="ks-plan-name">Plano Studio King</div>
                        <div class="ks-plan-storage">60 GB</div>
                        <div class="ks-plan-price">R$ 99,90 <span>/ mês</span></div>
                    </div>

                    <div class="ks-capacity-box">
                        <div class="ks-cap-metric">
                            <span class="label"><i class="fas fa-images"></i> Total de Fotos:</span>
                            <span class="val" id="plan-60-photos">~8.700 fotos</span>
                        </div>
                        <div class="ks-cap-metric">
                            <span class="label"><i class="fas fa-folder-open"></i> Eventos & Casamentos:</span>
                            <span class="val" id="plan-60-shoots">~30 ensaios / 8 casamentos</span>
                        </div>
                        <div class="ks-cap-metric">
                            <span class="label"><i class="fas fa-crown"></i> Prioridade Máxima:</span>
                            <span class="val" style="color: #38bdf8;">Ilimitada</span>
                        </div>
                    </div>

                    <a href="https://wa.me/5594991599815?text=Ol%C3%A1!%20Quero%20assinar%20o%20Plano%20Studio%20King%20de%2060%20GB%20do%20King%20Selection." target="_blank" class="ks-plan-btn ks-plan-btn-outline">
                        <span>Escolher 60 GB</span>
                        <i class="fas fa-chevron-right"></i>
                    </a>
                </div>
            </div>
        </section>

    </main>

    <script>
        function togglePasswordVisibility() {
            const pwd = document.getElementById('ks-password');
            const icon = document.getElementById('ks-pwd-icon');
            if (pwd.type === 'password') {
                pwd.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                pwd.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        }

        async function handleKsLogin(e) {
            e.preventDefault();
            const btn = document.getElementById('ks-btn-submit');
            const email = document.getElementById('ks-email').value.trim();
            const password = document.getElementById('ks-password').value;

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Autenticando...';

            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };
            try {
                const csrfMatch = document.cookie.match(/(?:^|; )ck_csrf=([^;]*)/);
                const xsrfMatch = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
                if (csrfMatch) headers['X-CK-CSRF'] = decodeURIComponent(csrfMatch[1]);
                if (xsrfMatch) headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfMatch[1]);
            } catch (_) {}

            try {
                const res = await fetch('/api/king-selection/auth/login', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (res.ok && data.success) {
                    const isAdmin = !!(data.user?.isAdmin || data.isAdmin);
                    if (data.token) {
                        try {
                            localStorage.setItem('conectaKingToken', data.token);
                            localStorage.setItem('conectaKingSession', '1');
                            if (data.user) {
                                localStorage.setItem('conectaKingUser', JSON.stringify(data.user));
                            }
                        } catch (_) {}
                    }
                    Swal.fire({
                        icon: 'success',
                        title: isAdmin ? '👑 Bem-vindo, Administrador!' : 'Bem-vindo ao King Selection!',
                        text: data.message || (isAdmin ? 'Acessando Painel Master e Estúdio...' : 'Abrindo seus projetos...'),
                        timer: 1500,
                        showConfirmButton: false,
                        background: '#0f172a',
                        color: '#fff'
                    }).then(() => {
                        window.location.href = data.redirect || (isAdmin ? '/admin#king-selection' : '/kingSelection');
                    });
                } else if (data.code === 'MODULE_NOT_ENABLED') {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Módulo King Selection Não Habilitado',
                        text: data.message,
                        showCancelButton: true,
                        confirmButtonText: '<i class="fab fa-whatsapp"></i> Falar com Suporte',
                        cancelButtonText: 'Fechar',
                        confirmButtonColor: '#22c55e',
                        cancelButtonColor: '#475569',
                        background: '#0f172a',
                        color: '#fff'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.open('https://wa.me/5594991599815?text=Ol%C3%A1!%20Meu%20e-mail%20%C3%A9%20' + encodeURIComponent(email) + '%20e%20gostaria%20de%20ativar%20meu%20plano%20do%20King%20Selection.', '_blank');
                        }
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Acesso Não Autorizado',
                        text: data.message || 'E-mail ou senha incorretos.',
                        background: '#0f172a',
                        color: '#fff',
                        confirmButtonColor: '#f59e0b'
                    });
                }
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro de Conexão',
                    text: 'Não foi possível conectar ao servidor. Tente novamente.',
                    background: '#0f172a',
                    color: '#fff'
                });
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<span>Acessar Meus Projetos</span> <i class="fas fa-arrow-right"></i>';
            }
        }

        // ── SIMULADOR DE CAPACIDADE ──
        function updateCapacityCalculations(mbPerPhoto) {
            const size = parseFloat(mbPerPhoto);
            document.getElementById('photo-size-display').innerText = size.toFixed(1) + ' MB';

            // 20 GB = 20.480 MB
            const p20Photos = Math.floor(20480 / size);
            const p20Shoots = Math.floor(p20Photos / 300);

            // 30 GB = 30.720 MB
            const p30Photos = Math.floor(30720 / size);
            const p30Shoots = Math.floor(p30Photos / 300);

            // 60 GB = 61.440 MB
            const p60Photos = Math.floor(61440 / size);
            const p60Shoots = Math.floor(p60Photos / 300);

            document.getElementById('plan-20-photos').innerText = '~' + p20Photos.toLocaleString('pt-BR') + ' fotos';
            document.getElementById('plan-20-shoots').innerText = '~' + p20Shoots + ' ensaios (300 fotos)';

            document.getElementById('plan-30-photos').innerText = '~' + p30Photos.toLocaleString('pt-BR') + ' fotos';
            document.getElementById('plan-30-shoots').innerText = '~' + p30Shoots + ' ensaios (300 fotos)';

            document.getElementById('plan-60-photos').innerText = '~' + p60Photos.toLocaleString('pt-BR') + ' fotos';
            document.getElementById('plan-60-shoots').innerText = '~' + p60Shoots + ' ensaios / casamentos';
        }

        function onSliderChange(val) {
            // Desmarca presets caso o valor fuja dos fixos
            document.querySelectorAll('.ks-preset-btn').forEach(b => b.classList.remove('active'));
            updateCapacityCalculations(val);
        }

        function setPresetSize(val, btn) {
            document.querySelectorAll('.ks-preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('photo-size-slider').value = val;
            updateCapacityCalculations(val);
        }

        // Inicializa com 7 MB (Recomendado)
        document.addEventListener('DOMContentLoaded', () => {
            setPresetSize(7.0, document.querySelectorAll('.ks-preset-btn')[1]);
        });
    </script>
</body>
</html>

