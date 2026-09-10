<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ConectaKing - Sua Presença Digital. Um Toque. Poder Absoluto.</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#DC2626">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="ConectaKing">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="description" content="O ConectaKing transforma seu contato em autoridade, conexão e vendas usando tecnologia NFC premium. Planos anuais e mensais disponveis. Atualizaes em tempo real.">
    
    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://conectaking.com.br/">
    <meta property="og:title" content="ConectaKing - Sua Presença Digital. Um Toque. Poder Absoluto.">
    <meta property="og:description" content="O ConectaKing transforma seu contato em autoridade, conexão e vendas usando tecnologia NFC premium. Planos anuais e mensais disponveis. Atualizaes em tempo real.">
    <meta property="og:image" content="https://conectaking.com.br/og-image.jpg">
    <meta property="og:image:secure_url" content="https://conectaking.com.br/og-image.jpg">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="ConectaKing - Sua Presença Digital">
    <meta property="og:site_name" content="ConectaKing">
    <meta property="og:locale" content="pt_BR">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="https://conectaking.com.br/">
    <meta name="twitter:title" content="ConectaKing - Sua Presença Digital. Um Toque. Poder Absoluto.">
    <meta name="twitter:description" content="O ConectaKing transforma seu contato em autoridade, conexão e vendas usando tecnologia NFC premium. Planos anuais e mensais disponveis.">
    <meta name="twitter:image" content="https://conectaking.com.br/og-image.jpg">
    <meta name="twitter:image:alt" content="ConectaKing - Sua Presença Digital">
    
    <!-- WhatsApp específico -->
    <meta property="og:image:type" content="image/jpeg">
    
    <!-- Fonts -->
<link rel="stylesheet" href="/vendor/fontawesome/css/all.min.css">
    
    <style>
        /* ============================================
           DESIGN SYSTEM PREMIUM DIN?MICO
           ============================================ */
        :root {
            /* Cores Premium */
            --black-absolute: #0B0B0B;
            --graphite: #1F1F1F;
            --white: #F5F5F5;
            --yellow-primary: #FFC700;
            --yellow-light: #FFD740;
            --red-primary: #DC2626;
            --red-dark: #991B1B;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        html {
            scroll-behavior: smooth;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            background: var(--black-absolute);
            color: var(--white);
            line-height: 1.6;
            overflow-x: hidden;
        }
        
        /* ============================================
           ANIMA?!?"ES E EFEITOS DIN?MICOS
           ============================================ */
        @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
        }
        
        @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px rgba(255, 199, 0, 0.3); }
            50% { box-shadow: 0 0 40px rgba(255, 199, 0, 0.6); }
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        
        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .shimmer-effect {
            background: linear-gradient(90deg, transparent, rgba(255, 199, 0, 0.3), transparent);
            background-size: 1000px 100%;
            animation: shimmer 3s infinite;
        }
        
        /* ============================================
           HEADER VERMELHO/PRETO DIN?MICO
           ============================================ */
        .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, var(--red-dark) 0%, #000000 50%, var(--red-dark) 100%);
            backdrop-filter: blur(10px);
            border-bottom: 2px solid var(--red-primary);
            z-index: 1000;
            padding: 15px 0;
            box-shadow: 0 4px 20px rgba(220, 38, 38, 0.3);
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            animation: shimmer 3s infinite;
        }
        
        .header::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle at 50% 50%, rgba(255, 199, 0, 0.1) 0%, transparent 70%);
            pointer-events: none;
            animation: pulse 3s ease-in-out infinite;
        }
        
        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            position: relative;
            z-index: 1;
        }
        
        .logo-container {
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
        }
        
        .logo-container img {
            height: 45px;
            width: auto;
            filter: drop-shadow(0 0 10px rgba(255, 199, 0, 0.5));
            animation: pulse 2s ease-in-out infinite;
        }
        
        .logo-text {
            font-family: 'Cinzel', serif;
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--white);
            letter-spacing: 1px;
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
        }
        
        .nav {
            display: flex;
            gap: clamp(14px, 2vw, 28px);
            align-items: center;
            flex-wrap: nowrap;
            padding-right: 12px;
            min-width: 0;
        }
        
        .nav-link {
            color: var(--white);
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s;
            position: relative;
            padding: 8px 0;
        }
        
        .nav-link::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 0;
            height: 2px;
            background: var(--yellow-primary);
            transition: width 0.3s;
            box-shadow: 0 0 10px var(--yellow-primary);
        }
        
        .nav-link:hover {
            color: var(--yellow-primary);
        }
        
        .nav-link:hover::after {
            width: 100%;
        }
        
        .nav-buttons {
            display: flex;
            gap: 12px;
            align-items: center;
        }
        
        /* Header: trbotes (Sair / Painel / Criar) ? mesmo tamanho, compactos, separados do FAQ */
        .header .nav-buttons {
            margin-left: 4px;
            flex-shrink: 0;
            gap: 8px;
            align-items: center;
        }
        
        .header .nav-buttons .btn {
            padding: 0 12px;
            font-size: 0.78rem;
            font-weight: 600;
            min-height: 34px;
            height: 34px;
            box-sizing: border-box;
            gap: 5px;
            line-height: 1.2;
            border-radius: 7px;
            white-space: nowrap;
            align-items: center;
            justify-content: center;
            animation: none !important;
            flex: 0 0 auto;
        }
        
        .header .nav-buttons .btn-primary {
            animation: none !important;
            box-shadow: 0 2px 10px rgba(255, 199, 0, 0.3);
        }
        
        .header .nav-buttons .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 14px rgba(255, 199, 0, 0.4);
        }
        
        .header .nav-buttons .btn-secondary {
            padding: 0 12px;
        }
        
        .header .nav-buttons .btn i {
            font-size: 0.72rem;
            flex-shrink: 0;
        }
        
        .header .nav-buttons .btn-secondary:hover {
            transform: translateY(-1px);
        }
        
        /* ============================================
           BOT?"ES DIN?MICOS
           ============================================ */
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 12px 24px;
            font-family: 'Inter', sans-serif;
            font-weight: 600;
            font-size: 0.95rem;
            text-decoration: none;
            border-radius: 8px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            border: none;
            position: relative;
            overflow: hidden;
        }
        
        .btn::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
        }
        
        .btn:hover::before {
            width: 300px;
            height: 300px;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, var(--yellow-primary), var(--yellow-light));
            color: var(--black-absolute);
            box-shadow: 0 4px 20px rgba(255, 199, 0, 0.4);
            animation: glow 2s ease-in-out infinite;
            position: relative;
            overflow: hidden;
        }
        
        .btn-primary::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            transition: left 0.5s;
        }
        
        .btn-primary:hover::before {
            left: 100%;
        }
        
        .btn-primary:hover {
            transform: translateY(-3px) scale(1.05);
            box-shadow: 0 8px 30px rgba(255, 199, 0, 0.6);
        }
        
        .btn-secondary {
            background: transparent;
            color: var(--white);
            border: 2px solid var(--white);
        }
        
        .btn-secondary:hover {
            background: var(--white);
            color: var(--black-absolute);
            transform: translateY(-3px);
        }
        
        .btn-lg {
            padding: 18px 36px;
            font-size: 1.1rem;
        }
        
        /* ============================================
           HERO SECTION DIN?MICO
           ============================================ */
        .hero {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--black-absolute);
            position: relative;
            padding: 140px 0 80px;
            overflow: hidden;
        }
        
        .hero::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
                radial-gradient(circle at 20% 50%, rgba(255, 199, 0, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 50%, rgba(220, 38, 38, 0.1) 0%, transparent 50%);
            pointer-events: none;
            animation: float 6s ease-in-out infinite;
        }
        
        .hero-content {
            text-align: center;
            max-width: 900px;
            margin: 0 auto;
            position: relative;
            z-index: 1;
            animation: slideInUp 1s ease-out;
        }
        
        .hero h1 {
            font-family: 'Cinzel', serif;
            font-size: clamp(2.5rem, 5vw, 4.5rem);
            font-weight: 700;
            color: var(--white);
            margin-bottom: 1.5rem;
            text-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
            line-height: 1.2;
        }
        
        .hero .subheadline {
            font-size: clamp(1.1rem, 2vw, 1.4rem);
            color: rgba(245, 245, 245, 0.9);
            margin-bottom: 3rem;
            line-height: 1.8;
        }
        
        .hero-ctas {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
            margin-bottom: 4rem;
        }
        
        /* Prova de Valor */
        .value-proof {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 4rem;
            padding-top: 3rem;
            border-top: 1px solid rgba(255, 199, 0, 0.2);
        }
        
        .value-item {
            display: flex;
            align-items: center;
            gap: 12px;
            color: var(--yellow-primary);
            font-weight: 500;
            transition: transform 0.3s;
        }
        
        .value-item:hover {
            transform: translateX(5px);
        }
        
        .value-item i {
            font-size: 1.2rem;
            filter: drop-shadow(0 0 5px var(--yellow-primary));
        }
        
        /* ============================================
           SE?!?"ES DIN?MICAS
           ============================================ */
        .section {
            padding: 80px 0;
            position: relative;
        }
        
        .section-header {
            text-align: center;
            margin-bottom: 60px;
        }
        
        .section-header h2 {
            font-family: 'Cinzel', serif;
            font-size: clamp(2rem, 4vw, 3.5rem);
            color: var(--white);
            margin-bottom: 1rem;
        }
        
        .section-header p {
            color: rgba(245, 245, 245, 0.8);
            font-size: 1.1rem;
        }
        
        /* Cards Dinmicos */
        .card {
            background: var(--graphite);
            border: 1px solid rgba(255, 199, 0, 0.2);
            border-radius: 16px;
            padding: 40px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .card::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(45deg, transparent, rgba(255, 199, 0, 0.1), transparent);
            transform: rotate(45deg);
            transition: all 0.5s;
            opacity: 0;
        }
        
        .card:hover::before {
            opacity: 1;
            animation: shimmer 2s infinite;
        }
        
        .card:hover {
            transform: translateY(-10px);
            border-color: var(--yellow-primary);
            box-shadow: 0 20px 60px rgba(255, 199, 0, 0.3);
        }
        
        /* ============================================
           PLANOS PREMIUM DIN?MICOS
           ============================================ */
        .pricing {
            background: var(--graphite);
        }
        
        .pricing-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 26px;
            margin-top: 28px;
            max-width: 1050px;
            margin-left: auto;
            margin-right: auto;
        }

        @media (max-width: 1100px) {
            .pricing-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                max-width: 760px;
            }
        }
        
        .pricing-card {
            background: linear-gradient(180deg, rgba(18, 18, 18, 0.95) 0%, rgba(10, 10, 10, 0.95) 100%);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 18px;
            padding: 24px;
            position: relative;
            transition: all 0.3s ease;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            min-height: 640px;
        }

        .pricing-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 30px 80px rgba(0, 0, 0, 0.75);
            border-color: rgba(255, 199, 0, 0.25);
        }

        .plan-title {
            font-size: 1.25rem;
            font-weight: 800;
            color: var(--white);
            margin-bottom: 10px;
        }

        .plan-price-row {
            display: flex;
            align-items: baseline;
            gap: 6px;
        }

        .plan-currency {
            color: rgba(245, 245, 245, 0.55);
            font-size: 0.95rem;
        }

        .plan-price {
            color: var(--yellow-primary);
            font-size: 2.5rem;
            font-weight: 900;
            letter-spacing: -0.02em;
        }

        .plan-period {
            color: rgba(245, 245, 245, 0.55);
            font-size: 0.9rem;
            margin-left: 2px;
        }

        .plan-pill {
            margin-top: 12px;
            background: rgba(255, 199, 0, 0.12);
            border: 1px solid rgba(255, 199, 0, 0.18);
            border-radius: 8px;
            padding: 10px 12px;
            text-align: center;
        }

        .plan-pill-amount {
            display: block;
            color: var(--yellow-primary);
            font-weight: 800;
            font-size: 0.92rem;
        }

        .plan-pill-note {
            display: block;
            color: rgba(245, 245, 245, 0.6);
            font-size: 0.75rem;
            margin-top: 2px;
        }

        .plan-desc {
            margin-top: 14px;
            color: rgba(245, 245, 245, 0.55);
            font-size: 0.92rem;
            line-height: 1.45;
            min-height: 54px;
        }

        .plan-features {
            list-style: none;
            margin-top: 14px;
            margin-bottom: 18px;
        }

        .plan-features li {
            padding: 10px 0;
            color: rgba(245, 245, 245, 0.84);
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            font-size: 0.92rem;
        }

        .plan-features li:last-child {
            border-bottom: none;
        }

        .plan-actions {
            margin-top: auto;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .plan-btn {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 12px 14px;
            border-radius: 10px;
            font-weight: 800;
            cursor: pointer;
            text-decoration: none;
            border: 1px solid transparent;
            transition: all 0.2s ease;
        }

        .plan-btn-primary {
            background: var(--yellow-primary);
            color: var(--black-absolute);
        }

        .plan-btn-primary:hover {
            filter: brightness(1.03);
            transform: translateY(-1px);
        }

        .plan-btn-secondary {
            background: rgba(255, 255, 255, 0.05);
            color: rgba(245, 245, 245, 0.92);
            border-color: rgba(255, 255, 255, 0.10);
        }

        .plan-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.07);
            border-color: rgba(255, 255, 255, 0.14);
            transform: translateY(-1px);
        }
        
        /* ============================================
           RESPONSIVO
           ============================================ */
        @media (max-width: 768px) {
            .nav {
                display: none;
            }
            
            .header {
                padding: 10px 0;
            }
            
            .header-content {
                padding: 0 10px;
                gap: 6px;
                justify-content: space-between;
            }
            
            .logo-container {
                gap: 4px;
                flex-shrink: 1;
                min-width: 0;
                max-width: calc(100% - 180px);
            }
            
            .logo-container img {
                height: 24px;
            }
            
            .logo-text {
                font-size: 0.75rem;
                letter-spacing: 0.1px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .nav-buttons {
                gap: 4px;
                flex-shrink: 0;
                display: flex !important;
                align-items: center;
                min-width: 0;
            }
            
            .header .nav-buttons {
                gap: 5px;
            }
            
            .header .nav-buttons > a.btn {
                min-height: 30px !important;
                height: 30px !important;
                padding: 0 7px !important;
                font-size: 0.64rem !important;
                white-space: nowrap;
                flex-shrink: 0;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                animation: none !important;
                box-sizing: border-box;
            }
            
            .header .nav-buttons .btn i {
                font-size: 0.58rem !important;
                margin-right: 3px !important;
            }
            
            .header .nav-buttons .btn-text {
                display: inline !important;
            }
            
            .hero-ctas {
                flex-direction: column;
                gap: 16px;
                width: 100%;
            }
            
            .hero-ctas .btn {
                width: 100%;
                padding: 16px 24px;
                font-size: 1rem;
            }
            
            .hero-ctas .btn-lg {
                padding: 18px 24px;
                font-size: 1.05rem;
            }
            
            .pricing-grid {
                grid-template-columns: 1fr;
                max-width: 420px;
                gap: 18px;
            }
            .pricing-card {
                min-height: auto;
            }
            
            .hero {
                padding: 120px 0 60px;
            }
            
            .hero h1 {
                font-size: clamp(2rem, 6vw, 3rem);
                margin-bottom: 1rem;
            }
            
            .hero .subheadline {
                font-size: clamp(1rem, 3vw, 1.2rem);
                margin-bottom: 2rem;
            }
        }
        
        @media (max-width: 480px) {
            .header {
                padding: 8px 0;
            }
            
            .logo-text {
                font-size: 0.7rem;
                letter-spacing: 0.1px;
            }
            
            .logo-container {
                gap: 3px;
                max-width: calc(100% - 160px);
            }
            
            .logo-container img {
                height: 22px;
            }
            
            .nav-buttons {
                gap: 3px;
                display: flex !important;
            }
            
            .header .nav-buttons > a.btn {
                min-height: 28px !important;
                height: 28px !important;
                padding: 0 6px !important;
                font-size: 0.6rem !important;
                animation: none !important;
            }
            
            .header .nav-buttons .btn i {
                font-size: 0.55rem !important;
                margin-right: 2px !important;
            }
            
            .header-content {
                padding: 0 6px;
                gap: 3px;
            }
        }
        
        /* Garantir que texto sempre aparéa em telas muito pequenas também */
        @media (max-width: 360px) {
            .logo-container {
                max-width: calc(100% - 150px);
            }
            
            .logo-text {
                font-size: 0.65rem;
            }
            
            .logo-container img {
                height: 20px;
            }
            
            .header .nav-buttons > a.btn {
                min-height: 26px !important;
                height: 26px !important;
                padding: 0 5px !important;
                font-size: 0.56rem !important;
            }
            
            .header .nav-buttons .btn-text {
                display: inline !important;
            }
        }
        
        /* Animaes ao scroll */
        .fade-in {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .fade-in.visible {
            opacity: 1;
            transform: translateY(0);
        }
        
        /* Seção Aplicativo: garantir que cards aparéam mesmo antes do scroll */
        #aplicativo .card.fade-in {
            opacity: 1;
            transform: translateY(0);
        }
        
        .install-hint-box {
            position: fixed; left: 0; top: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.75); z-index: 9999;
            display: flex; align-items: center; justify-content: center;
            padding: 20px; opacity: 0; visibility: hidden;
            transition: opacity 0.25s ease, visibility 0.25s ease;
        }
        .install-hint-box.show {
            opacity: 1; visibility: visible;
        }
        .install-hint-inner {
            background: var(--graphite);
            border: 2px solid var(--yellow-primary);
            border-radius: 16px;
            padding: 24px;
            max-width: 380px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .install-hint-msg {
            color: var(--white);
            line-height: 1.6;
            margin-bottom: 20px;
            font-size: 0.95rem;
        }
        .install-hint-buttons {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .install-hint-buttons .btn {
            width: 100%;
        }
        .install-hint-ok {
            width: 100%;
        }
        
        /* Estilos dos cards de plano - idnticos ao dashboard */
        .subscription-plan-card {
            background: #111111;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 24px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .subscription-plan-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
            border-color: #ffc700;
        }
        
        .subscription-plan-card h3 {
            color: #ffffff;
            margin-bottom: 16px;
            font-size: 1.5rem;
        }
        
        .plan-price {
            display: flex;
            align-items: baseline;
            gap: 4px;
            margin-bottom: 16px;
        }
        
        .plan-currency {
            color: #888888;
            font-size: 1.2rem;
        }
        
        .plan-amount {
            color: #ffc700;
            font-size: 2.5rem;
            font-weight: 700;
        }
        
        .plan-period {
            color: #888888;
            font-size: 1rem;
        }
        
        .plan-description {
            color: #888888;
            margin-bottom: 20px;
            line-height: 1.6;
        }
        
        .plan-features {
            list-style: none;
            padding: 0;
            margin: 0 0 24px 0;
        }
        
        .plan-features li {
            color: #ffffff;
            padding: 8px 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .plan-features li i {
            color: #ffc700;
            width: 20px;
        }
        
        .plan-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .subscription-plans-grid,
        .pricing-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 24px;
            margin-top: 40px;
        }
        
        .plan-highlighted {
            border-color: #ffc700 !important;
            box-shadow: 0 0 20px rgba(255, 199, 0, 0.3);
        }
    </style>
    
    </head>
    <body>
    <!-- Header Vermelho/Preto -->
    <header class="header">
        <div class="header-content">
            <a href="#" class="logo-container">
                <img src="/logo.png" alt="ConectaKing Logo">
                <span class="logo-text">CONECTAKING</span>
            </a>
            <nav class="nav">
                <a href="#como-funciona" class="nav-link">Como Funciona</a>
                <a href="#beneficios" class="nav-link">Benefícios</a>
                <a href="#planos" class="nav-link">Planos</a>
                <a href="#faq" class="nav-link">FAQ</a>
            </nav>
                    <div class="nav-buttons">
                        <a href="#" class="btn btn-secondary" id="landing-sair-btn" style="display: none !important;" title="Encerrar sessão e entrar com outra conta">
                            <i class="fas fa-sign-out-alt"></i> <span class="btn-text">Sair</span>
                        </a>
                        <a href="/login" class="btn btn-secondary" id="login-btn">Login</a>
                        <a href="/dashboard" class="btn btn-primary" id="access-panel-btn" style="display: none;">
                            <i class="fas fa-tachometer-alt"></i> <span class="btn-text">Acessar Painel</span>
                        </a>
                <a href="/registro" class="btn btn-primary" id="create-account-btn"><span class="btn-text">Criar Acesso</span></a>
                    </div>
        </div>
    </header>

    <!-- Hero Section -->
        <section class="hero">
        <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
                <div class="hero-content">
                <h1>Sua presena digital.<br>Um toque.<br>Poder absoluto.</h1>
                <p class="subheadline">
                    O ConectaKing transforma seu contato em autoridade, conexão e vendas usando tecnologia NFC premium.
                </p>
                <div class="hero-ctas">
                    <a href="#planos" class="btn btn-primary btn-lg">
                        <i class="fas fa-crown"></i> Quero meu ConectaKing agora
                    </a>
                    <a href="#como-funciona" class="btn btn-secondary btn-lg">
                        Ver como funciona
                    </a>
                    </div>
                
                <!-- Prova de Valor -->
                <div class="value-proof">
                    <div class="value-item">
                        <i class="fas fa-check-circle"></i>
                        <span>Planos anuais e mensais</span>
                        </div>
                    <div class="value-item">
                        <i class="fas fa-check-circle"></i>
                        <span>Atualizaes em tempo real</span>
                    </div>
                    <div class="value-item">
                        <i class="fas fa-check-circle"></i>
                        <span>Funciona em qualquer celular</span>
                </div>
                    <div class="value-item">
                        <i class="fas fa-check-circle"></i>
                        <span>Ideal para vendas e networking</span>
                            </div>
                    </div>
                </div>
            </div>
        </section>

    <!-- Preview do Carto Virtual -->
    <section class="section" style="background: var(--graphite); padding: 50px 0;">
        <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
            <div class="section-header" style="margin-bottom: 30px;">
                <h2 style="position: relative; display: inline-block; color: var(--white); font-family: 'Cinzel', serif;">
                    Veja Nosso Carto Virtual em Ao
                </h2>
                <p>Visualize como funciona o ConectaKing na prtica</p>
                </div>
            <div style="max-width: 600px; margin: 40px auto; position: relative;">
                <div style="background: var(--black-absolute); border: 3px solid var(--yellow-primary); border-radius: 24px; padding: 20px; box-shadow: 0 30px 90px rgba(255, 199, 0, 0.3); position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--yellow-primary), var(--red-primary));"></div>
                    <div style="height: 500px; overflow: hidden; border-radius: 16px;">
                        <iframe id="card-preview-iframe" src="https://tag.conectaking.com.br/adrianokingg" frameborder="0" style="width: 100%; height: 100%; border: none; border-radius: 16px;"></iframe>
                    </div>
                    <div style="margin-top: 16px; text-align: center;">
                        <a href="https://tag.conectaking.com.br/adrianokingg" target="_blank" class="btn btn-primary" style="width: 100%;">
                            <i class="fas fa-external-link-alt"></i> Ver Carto Completo
                        </a>
                    </div>
                    </div>
                </div>
            </div>
        </section>

    <!-- CTA Intermedirio 1 -->
    <section class="section" style="background: linear-gradient(135deg, var(--black-absolute) 0%, var(--red-dark) 100%); padding: 60px 0; text-align: center; position: relative; overflow: hidden;">
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at 50% 50%, rgba(255, 199, 0, 0.1) 0%, transparent 70%); pointer-events: none; animation: pulse 4s ease-in-out infinite;"></div>
        <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 20px; position: relative; z-index: 1;">
            <h3 style="font-family: 'Cinzel', serif; font-size: clamp(1.8rem, 3vw, 2.5rem); color: var(--white); margin-bottom: 1rem; text-shadow: 0 0 20px rgba(255, 255, 255, 0.2);">
                Profissionais de sucesso não trocam cartes.<br>Eles trocam conexões.
            </h3>
            <a href="#planos" class="btn btn-primary" style="animation: glow 2s ease-in-out infinite;">
                <i class="fas fa-rocket"></i> Quero Minha Conexo Agora
            </a>
        </div>
    </section>

    <!-- Como Funciona -->
    <section id="como-funciona" class="section" style="background: var(--graphite); padding: 60px 0;">
        <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
            <div class="section-header">
                <h2 style="font-family: 'Cinzel', serif; font-size: clamp(2rem, 4vw, 3.5rem); color: var(--white); margin-bottom: 1rem; text-shadow: 0 0 20px rgba(255, 255, 255, 0.2);">
                    Como Funciona
                </h2>
                <p style="color: rgba(245, 245, 245, 0.8); font-size: 1.1rem;">Sem aplicativo. Sem papel. Sem fric</p>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 40px; margin-top: 60px;">
                <div class="card fade-in">
                    <div style="width: 80px; height: 80px; background: var(--yellow-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 2rem; color: var(--black-absolute); box-shadow: 0 10px 30px rgba(255, 199, 0, 0.3);">
                        <i class="fas fa-hand-pointer"></i>
                    </div>
                    <h3 style="text-align: center; color: var(--white); margin-bottom: 12px; font-family: 'Cinzel', serif;">1. Encoste</h3>
                    <p style="text-align: center; color: rgba(245, 245, 245, 0.8);">Aproxime o celular do seu ConectaKing NFC</p>
                </div>
                <div class="card fade-in">
                    <div style="width: 80px; height: 80px; background: var(--yellow-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 2rem; color: var(--black-absolute); box-shadow: 0 10px 30px rgba(255, 199, 0, 0.3);">
                        <i class="fas fa-link"></i>
                </div>
                    <h3 style="text-align: center; color: var(--white); margin-bottom: 12px; font-family: 'Cinzel', serif;">2. Conecte</h3>
                    <p style="text-align: center; color: rgba(245, 245, 245, 0.8);">Seu perfil digital abre instantaneamente</p>
                    </div>
                <div class="card fade-in">
                    <div style="width: 80px; height: 80px; background: var(--yellow-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 2rem; color: var(--black-absolute); box-shadow: 0 10px 30px rgba(255, 199, 0, 0.3);">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <h3 style="text-align: center; color: var(--white); margin-bottom: 12px; font-family: 'Cinzel', serif;">3. Converta</h3>
                    <p style="text-align: center; color: rgba(245, 245, 245, 0.8);">Transforme contatos em clientes e conexões</p>
                    </div>
                </div>
            </div>
        </section>

    <!-- CTA Estratgico 1 -->
    <section class="section" style="background: linear-gradient(135deg, var(--red-dark) 0%, var(--black-absolute) 100%); padding: 80px 0; text-align: center;">
        <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
            <h2 style="font-family: 'Cinzel', serif; font-size: clamp(2rem, 4vw, 3rem); color: var(--white); margin-bottom: 1.5rem;">
                Sua marca não pede aten<br>Ela impe respeito.
            </h2>
            <p style="font-size: 1.2rem; color: rgba(245, 245, 245, 0.9); margin-bottom: 2rem;">
                Transforme cada contato em uma oportunidade real de negócio
            </p>
            <a href="#planos" class="btn btn-primary btn-lg">
                <i class="fas fa-crown"></i> Garanta seu ConectaKing agora
            </a>
        </div>
    </section>

    <!-- Benefícios -->
    <section id="beneficios" class="section" style="background: var(--black-absolute);">
        <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
            <div class="section-header">
                <h2 style="position: relative; display: inline-block; color: var(--white); font-family: 'Cinzel', serif;">
                    Por Que Escolher o ConectaKing?
                </h2>
                <p>Resultados reais para profissionais que pensam grande</p>
                </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-top: 60px;">
                <div class="card fade-in" style="animation: float 4s ease-in-out infinite;">
                    <div style="width: 60px; height: 60px; background: rgba(255, 199, 0, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; color: var(--yellow-primary); font-size: 1.5rem;">
                        <i class="fas fa-crown"></i>
            </div>
                    <h3 style="color: var(--white); margin-bottom: 12px; font-family: 'Cinzel', serif; font-size: 1.3rem;">Autoridade Profissional Instantnea</h3>
                    <p style="color: rgba(245, 245, 245, 0.8); line-height: 1.8;">Projete confiana e profissionalismo desde o primeiro contato. Seu carto digital fala por você.</p>
                </div>
                <div class="card fade-in" style="animation: float 4.5s ease-in-out infinite; animation-delay: 0.2s;">
                    <div style="width: 60px; height: 60px; background: rgba(255, 199, 0, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; color: var(--yellow-primary); font-size: 1.5rem; animation: pulse 2s ease-in-out infinite;">
                        <i class="fas fa-rocket"></i>
            </div>
                    <h3 style="color: var(--white); margin-bottom: 12px; font-family: 'Cinzel', serif; font-size: 1.3rem;">Mais Impacto em Reuníes e Eventos</h3>
                    <p style="color: rgba(245, 245, 245, 0.8); line-height: 1.8;">Destaque-se em networking, feiras e encontros profissionais com tecnologia de ponta.</p>
                </div>
                <div class="card fade-in" style="animation: float 5s ease-in-out infinite; animation-delay: 0.4s;">
                    <div style="width: 60px; height: 60px; background: rgba(255, 199, 0, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; color: var(--yellow-primary); font-size: 1.5rem; animation: pulse 2.2s ease-in-out infinite;">
                        <i class="fas fa-sync-alt"></i>
                    </div>
                    <h3 style="color: var(--white); margin-bottom: 12px; font-family: 'Cinzel', serif; font-size: 1.3rem;">Atualizaes Ilimitadas</h3>
                    <p style="color: rgba(245, 245, 245, 0.8); line-height: 1.8;">Mude links, adicione informações e atualize seu perfil quantas vezes precisar, sem custos extras.</p>
                </div>
                <div class="card fade-in" style="animation: float 4.8s ease-in-out infinite; animation-delay: 0.6s;">
                    <div style="width: 60px; height: 60px; background: rgba(255, 199, 0, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; color: var(--yellow-primary); font-size: 1.5rem; animation: pulse 2.4s ease-in-out infinite;">
                        <i class="fas fa-leaf"></i>
                    </div>
                    <h3 style="color: var(--white); margin-bottom: 12px; font-family: 'Cinzel', serif; font-size: 1.3rem;">Sustentvel e Reutilizvel</h3>
                    <p style="color: rgba(245, 245, 245, 0.8); line-height: 1.8;">Elimine o desperdcio de cartes de papel. Um ConectaKing dura para sempre.</p>
                </div>
                <div class="card fade-in" style="animation: float 5.2s ease-in-out infinite; animation-delay: 0.8s;">
                    <div style="width: 60px; height: 60px; background: rgba(255, 199, 0, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; color: var(--yellow-primary); font-size: 1.5rem; animation: pulse 2.6s ease-in-out infinite;">
                        <i class="fas fa-network-wired"></i>
                    </div>
                    <h3 style="color: var(--white); margin-bottom: 12px; font-family: 'Cinzel', serif; font-size: 1.3rem;">Centralizao Total da Presença Digital</h3>
                    <p style="color: rgba(245, 245, 245, 0.8); line-height: 1.8;">Todos os seus links, redes sociais e informações em um único lugar profissional.</p>
                </div>
                <div class="card fade-in" style="animation: float 5.5s ease-in-out infinite; animation-delay: 1s;">
                    <div style="width: 60px; height: 60px; background: rgba(255, 199, 0, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; color: var(--yellow-primary); font-size: 1.5rem; animation: pulse 2.8s ease-in-out infinite;">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <h3 style="color: var(--white); margin-bottom: 12px; font-family: 'Cinzel', serif; font-size: 1.3rem;">Segurana e Privacidade</h3>
                    <p style="color: rgba(245, 245, 245, 0.8); line-height: 1.8;">Tecnologia NFC confiável e segura. Você controla o que compartilha.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA Estratgico 2 -->
    <section class="section" style="background: var(--black-absolute); padding: 80px 0; text-align: center; position: relative; overflow: hidden;">
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at 50% 50%, rgba(255, 199, 0, 0.1) 0%, transparent 70%); pointer-events: none; animation: pulse 4s ease-in-out infinite;"></div>
        <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 20px; position: relative; z-index: 1;">
            <h2 style="font-family: 'Cinzel', serif; font-size: clamp(2rem, 4vw, 3rem); color: var(--white); margin-bottom: 1.5rem; text-shadow: 0 0 30px rgba(255, 255, 255, 0.3); position: relative; display: inline-block;">
                Pare de perder oportunidades.<br>Comece a criar conexões que vendem.
            </h2>
            <p style="font-size: 1.2rem; color: rgba(245, 245, 245, 0.9); margin-bottom: 2rem;">
                Junte-se a centenas de profissionais que já estão revolucionando seu networking
            </p>
            <a href="#planos" class="btn btn-primary btn-lg" style="animation: glow 2s ease-in-out infinite;">
                <i class="fas fa-rocket"></i> Quero Transformar Meu Networking Agora
            </a>
        </div>
</section>

    <!-- CTA Antes dos Planos -->
    <section class="section" style="background: linear-gradient(135deg, var(--red-dark) 0%, var(--black-absolute) 100%); padding: 60px 0; text-align: center; position: relative; overflow: hidden;">
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at 50% 50%, rgba(255, 199, 0, 0.12) 0%, transparent 70%); pointer-events: none; animation: pulse 4s ease-in-out infinite;"></div>
        <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 20px; position: relative; z-index: 1;">
            <h3 style="font-family: 'Cinzel', serif; font-size: clamp(1.8rem, 3vw, 2.5rem); color: var(--white); margin-bottom: 1rem; text-shadow: 0 0 20px rgba(255, 255, 255, 0.2);">
                Escolha o plano que transforma seu networking em vendas reais.
            </h3>
            <p style="font-size: 1.1rem; color: rgba(245, 245, 245, 0.8); margin-bottom: 1.5rem;">
                Planos flexveis para profissionais que querem resultados, não promessas.
            </p>
                </div>
    </section>

    <!-- Planos -->
    <section id="planos" class="section pricing" style="padding-top: 40px;">
        <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
            <div class="section-header" style="position: relative; margin-bottom: 40px;">
                <h2 style="position: relative; display: inline-block; color: var(--white); font-family: 'Cinzel', serif; text-shadow: 0 0 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(255, 255, 255, 0.2);">
                    Escolha Seu Plano
                </h2>
                <p>Planos anuais e mensais disponveis. Resultados imediatos e duradouros.</p>
            </div>
            <div class="pricing-grid" id="plans-container">
                <p style="text-align: center; grid-column: 1 / -1; color: rgba(245, 245, 245, 0.7);">Carregando planos...</p>
                </div>
            </div>
        </section>

    <!-- FAQ -->
    <section id="faq" class="section" style="background: var(--graphite);">
        <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
            <div class="section-header">
                <h2>Perguntas Frequentes</h2>
                <p>Tire suas dvidas sobre o ConectaKing</p>
                </div>
            <div style="max-width: 800px; margin: 60px auto 0;">
                <div class="faq-item" style="background: var(--black-absolute); border: 1px solid rgba(255, 199, 0, 0.2); border-radius: 12px; margin-bottom: 16px; overflow: hidden;">
                    <div class="faq-question" style="padding: 24px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: var(--white); font-weight: 600;">
                        <span>Tem mensalidade?</span>
                        <i class="fas fa-chevron-down" style="color: var(--yellow-primary); transition: transform 0.3s;"></i>
                            </div>
                    <div class="faq-answer" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
                        <div style="padding: 0 24px 24px; color: rgba(245, 245, 245, 0.8); line-height: 1.8;">
                            O ConectaKing oferece planos anuais e mensais. Você escolhe o formato de pagamento que melhor se adapta ao seu negócio. Todas as atualizações esto incluídas no período contratado.
                        </div>
                    </div>
                            </div>
                <div class="faq-item" style="background: var(--black-absolute); border: 1px solid rgba(255, 199, 0, 0.2); border-radius: 12px; margin-bottom: 16px; overflow: hidden;">
                    <div class="faq-question" style="padding: 24px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: var(--white); font-weight: 600;">
                        <span>Funciona em qualquer celular?</span>
                        <i class="fas fa-chevron-down" style="color: var(--yellow-primary); transition: transform 0.3s;"></i>
                        </div>
                    <div class="faq-answer" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
                        <div style="padding: 0 24px 24px; color: rgba(245, 245, 245, 0.8); line-height: 1.8;">
                            Sim. O ConectaKing usa tecnologia NFC, disponível na maioria dos smartphones modernos (Android e iPhone). Não é necessário instalar nenhum aplicativo.
                    </div>
                            </div>
                        </div>
                <div class="faq-item" style="background: var(--black-absolute); border: 1px solid rgba(255, 199, 0, 0.2); border-radius: 12px; margin-bottom: 16px; overflow: hidden;">
                    <div class="faq-question" style="padding: 24px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: var(--white); font-weight: 600;">
                        <span>Posso atualizar depois?</span>
                        <i class="fas fa-chevron-down" style="color: var(--yellow-primary); transition: transform 0.3s;"></i>
                    </div>
                    <div class="faq-answer" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
                        <div style="padding: 0 24px 24px; color: rgba(245, 245, 245, 0.8); line-height: 1.8;">
                            Sim, quantas vezes quiser. Você pode atualizar seus links, informações e personalização a qualquer momento, sem custos adicionais.
                            </div>
                        </div>
                    </div>
                <div class="faq-item" style="background: var(--black-absolute); border: 1px solid rgba(255, 199, 0, 0.2); border-radius: 12px; margin-bottom: 16px; overflow: hidden;">
                    <div class="faq-question" style="padding: 24px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: var(--white); font-weight: 600;">
                        <span>?0 seguro?</span>
                        <i class="fas fa-chevron-down" style="color: var(--yellow-primary); transition: transform 0.3s;"></i>
                    </div>
                    <div class="faq-answer" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
                        <div style="padding: 0 24px 24px; color: rgba(245, 245, 245, 0.8); line-height: 1.8;">
                            Sim. O ConectaKing usa tecnologia NFC confiável e segura. Você tem controle total sobre o que compartilha e todas as informações são protegidas.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

    <!-- CTA Final Estratgico -->
    <section class="section" style="background: linear-gradient(135deg, var(--black-absolute) 0%, var(--red-dark) 100%); padding: 100px 0; text-align: center; position: relative; overflow: hidden;">
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at 50% 50%, rgba(220, 38, 38, 0.2) 0%, transparent 70%); pointer-events: none; animation: pulse 4s ease-in-out infinite;"></div>
        <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 20px; position: relative; z-index: 1;">
            <h2 style="font-family: 'Cinzel', serif; font-size: clamp(2.5rem, 5vw, 4rem); color: var(--white); margin-bottom: 1.5rem; text-shadow: 0 0 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(220, 38, 38, 0.2); line-height: 1.3;">
                Não espere mais.<br>Comece a vender hoje.
            </h2>
            <p style="font-size: 1.3rem; color: rgba(245, 245, 245, 0.9); margin-bottom: 2.5rem; max-width: 700px; margin-left: auto; margin-right: auto; line-height: 1.8;">
                Cada dia sem o ConectaKing é um dia perdido de conexões e vendas. Garanta seu lugar entre os profissionais que estão dominando o networking digital.
            </p>
            <a href="#planos" class="btn btn-primary btn-lg" style="font-size: 1.2rem; padding: 22px 50px; animation: glow 2s ease-in-out infinite;">
                <i class="fas fa-crown"></i> Quero Meu ConectaKing Agora
            </a>
            <p style="margin-top: 20px; color: rgba(245, 245, 245, 0.6); font-size: 0.9rem;">
                <i class="fas fa-shield-alt"></i> Garantia de satisfao | <i class="fas fa-sync-alt"></i> Atualizaes ilimitadas | <i class="fas fa-headset"></i> Suporte prioritrio
            </p>
            </div>
        </section>

    

    <!-- Footer -->
    <footer style="background: var(--black-absolute); border-top: 2px solid rgba(255, 199, 0, 0.2); padding: 60px 0 30px; margin-top: 80px;">
        <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 40px; margin-bottom: 40px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                        <img src="/logo.png" alt="ConectaKing" style="height: 40px;">
                        <span style="font-family: 'Cinzel', serif; font-size: 1.3rem; font-weight: 700; color: var(--yellow-primary);">CONECTAKING</span>
                    </div>
                    <p style="color: rgba(245, 245, 245, 0.7); line-height: 1.8; margin-bottom: 20px;">
                        A nova era da conexão digital. Transforme cada contato em uma oportunidade real com tecnologia NFC premium.
                    </p>
                    <div style="display: flex; gap: 15px;">
                        <a href="https://www.instagram.com/conectaking" target="_blank" style="width: 40px; height: 40px; background: rgba(255, 199, 0, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--yellow-primary); text-decoration: none; transition: all 0.3s;" onmouseover="this.style.background='var(--yellow-primary)'; this.style.color='var(--black-absolute)'; this.style.transform='translateY(-3px)';" onmouseout="this.style.background='rgba(255, 199, 0, 0.1)'; this.style.color='var(--yellow-primary)'; this.style.transform='translateY(0)';">
                            <i class="fab fa-instagram"></i>
                        </a>
                    </div>
                </div>
                <div>
                    <h3 style="font-family: 'Cinzel', serif; color: var(--yellow-primary); margin-bottom: 20px; font-size: 1.2rem;">Navegação</h3>
                    <ul style="list-style: none;">
                        <li style="margin-bottom: 12px;"><a href="#como-funciona" style="color: rgba(245, 245, 245, 0.7); text-decoration: none; transition: color 0.3s;" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">Como Funciona</a></li>
                        <li style="margin-bottom: 12px;"><a href="#beneficios" style="color: rgba(245, 245, 245, 0.7); text-decoration: none; transition: color 0.3s;" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">Benefícios</a></li>
                        <li style="margin-bottom: 12px;"><a href="#planos" style="color: rgba(245, 245, 245, 0.7); text-decoration: none; transition: color 0.3s;" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">Planos</a></li>
                        <li style="margin-bottom: 12px;"><a href="#faq" style="color: rgba(245, 245, 245, 0.7); text-decoration: none; transition: color 0.3s;" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">FAQ</a></li>
                    </ul>
                </div>
                <div>
                    <h3 style="font-family: 'Cinzel', serif; color: var(--yellow-primary); margin-bottom: 20px; font-size: 1.2rem;">Suporte</h3>
                    <ul style="list-style: none;">
                        <li style="margin-bottom: 12px;" id="footer-login-item"><a href="/login" style="color: rgba(245, 245, 245, 0.7); text-decoration: none; transition: color 0.3s;" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">Login</a></li>
                        <li style="margin-bottom: 12px; display: none;" id="footer-access-panel-item"><a href="/dashboard" style="color: rgba(245, 245, 245, 0.7); text-decoration: none; transition: color 0.3s;" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">Acessar Painel</a></li>
                        <li style="margin-bottom: 12px;"><a href="/registro" style="color: rgba(245, 245, 245, 0.7); text-decoration: none; transition: color 0.3s;" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">Criar Acesso</a></li>
                        <li style="margin-bottom: 12px;"><a href="#planos" style="color: rgba(245, 245, 245, 0.7); text-decoration: none; transition: color 0.3s;" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">Falar com Vendedor</a></li>
                        <li style="margin-bottom: 12px;"><a href="https://www.instagram.com/conectaking" target="_blank" style="color: rgba(245, 245, 245, 0.7); text-decoration: none; transition: color 0.3s;" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">Instagram</a></li>
                    </ul>
                    </div>
                <div>
                    <h3 style="font-family: 'Cinzel', serif; color: var(--yellow-primary); margin-bottom: 20px; font-size: 1.2rem;">Legal</h3>
                    <ul style="list-style: none;">
                        <li style="margin-bottom: 12px;"><a href="/termos" style="color: rgba(245, 245, 245, 0.7); text-decoration: none; transition: color 0.3s;" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">Termos de Servío</a></li>
                        <li style="margin-bottom: 12px;"><a href="/privacidade" style="color: rgba(245, 245, 245, 0.7); text-decoration: none; transition: color 0.3s;" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">Poltica de Privacidade</a></li>
                    </ul>
                </div>
            </div>
            <div style="text-align: center; padding-top: 30px; border-top: 1px solid rgba(255, 199, 0, 0.1); color: rgba(245, 245, 245, 0.6);">
                <p>&copy; 2025 ConectaKing. Todos os direitos reservados.</p>
                <p style="margin-top: 8px; font-size: 0.9rem;">Desenvolvido com <i class="fas fa-heart" style="color: var(--red-primary);"></i> para profissionais que pensam grande</p>
            </div>
        </div>
    </footer>

    <!-- CTA Final Fixo Mobile -->
    <div style="position: fixed; bottom: 0; left: 0; right: 0; background: var(--black-absolute); border-top: 3px solid var(--yellow-primary); padding: 20px; z-index: 999; box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.9); display: none;" id="cta-fixed-mobile">
        <div style="max-width: 1200px; margin: 0 auto;">
            <a href="#planos" class="btn btn-primary" style="width: 100%;">
                <i class="fas fa-crown"></i> Quero meu ConectaKing agora
            </a>
        </div>
    </div>

    
    <script src="/config.js?v=2026-09-09-vite1"></script>
    @vite(['resources/js/pages/index.js'])
</body>
</html>
