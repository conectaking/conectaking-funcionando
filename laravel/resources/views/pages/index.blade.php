<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ConectaKing - Sua Presença Digital. Um Toque. Poder Absoluto.</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
    {{-- PWA desativada (fatia 30): sem manifest/SW — ver docs/STAGING.md / A11Y --}}
    <meta name="theme-color" content="#DC2626">
    <meta name="description" content="O ConectaKing transforma seu contato em autoridade, conexão e vendas usando tecnologia NFC premium. Planos anuais e mensais disponíveis. Atualizações em tempo real.">
    
    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://conectaking.com.br/">
    <meta property="og:title" content="ConectaKing - Sua Presença Digital. Um Toque. Poder Absoluto.">
    <meta property="og:description" content="O ConectaKing transforma seu contato em autoridade, conexão e vendas usando tecnologia NFC premium. Planos anuais e mensais disponíveis. Atualizações em tempo real.">
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
    <meta name="twitter:description" content="O ConectaKing transforma seu contato em autoridade, conexão e vendas usando tecnologia NFC premium. Planos anuais e mensais disponíveis.">
    <meta name="twitter:image" content="https://conectaking.com.br/og-image.jpg">
    <meta name="twitter:image:alt" content="ConectaKing - Sua Presença Digital">
    
    <!-- WhatsApp específico -->
    <meta property="og:image:type" content="image/jpeg">
    
    <!-- Fonts: carregadas no head para evitar FOUC -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

    <script src="/config.js?v=2026-09-09-vite1"></script>
    {{-- CSS da landing carregado via Vite (evita FOUC) --}}
    @vite(['resources/css/fontawesome.css', 'resources/css/pub/pages/index-extra.css', 'resources/js/pages/index.js'])

    @php
        $hasTokenCookie = !empty(request()->cookie('token')) || !empty(request()->cookie('refresh_token'));
    @endphp

    {{-- CSS crítico inline: evita flash de fundo branco antes do Vite carregar --}}
    <style>
        html, body { background: #0B0B0B; color: #F5F5F5; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
        .ck-hidden { display: none !important; }
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
                        <a href="#" class="btn btn-secondary {{ $hasTokenCookie ? '' : 'ck-hidden' }}" id="landing-sair-btn" title="Encerrar sessão e entrar com outra conta">
                            <i class="fas fa-sign-out-alt"></i> <span class="btn-text">Sair</span>
                        </a>
                        <a href="/login" class="btn btn-secondary {{ $hasTokenCookie ? 'ck-hidden' : '' }}" id="login-btn">Login</a>
                        <a href="/dashboard" class="btn btn-primary {{ $hasTokenCookie ? '' : 'ck-hidden' }}" id="access-panel-btn">
                            <i class="fas fa-tachometer-alt"></i> <span class="btn-text">Acessar Painel</span>
                        </a>
                        <a href="/registro" class="btn btn-primary {{ $hasTokenCookie ? 'ck-hidden' : '' }}" id="create-account-btn"><span class="btn-text">Criar Acesso</span></a>
                    </div>
        </div>
    </header>

    <!-- Hero Section -->
        <section class="hero">
        <div class="container ck-container-1200">
                <div class="hero-content">
                <h1>Sua presença digital.<br>Um toque.<br>Poder absoluto.</h1>
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
                        <span>Atualizações em tempo real</span>
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

    <!-- Preview do Cartão Virtual -->
    <section class="section ck-ix-8800b7">
        <div class="container ck-container-1200">
            <div class="section-header ck-ix-dd7272">
                <h2 class="ck-ix-d12637">
                    Veja Nosso Cartão Virtual em Ação
                </h2>
                <p>Visualize como funciona o ConectaKing na prática</p>
                </div>
            <div class="ck-ix-3c8d3f">
                <div class="ck-ix-3f6e8d">
                    <div class="ck-ix-e5e8bd"></div>
                    <div class="ck-ix-6cfd8e ck-card-preview-wrap">
                        <!-- Preview visual do cartão (iframe removido: X-Frame-Options bloqueava o embed) -->
                        <a href="https://tag.conectaking.com.br/adrianokingg" target="_blank" rel="noopener" class="ck-card-preview-link" aria-label="Abrir cartão digital de exemplo">
                            <div class="ck-card-mockup">
                                <div class="ck-card-mockup-inner">
                                    <img src="/logo.png" alt="ConectaKing Logo" class="ck-mockup-logo">
                                    <p class="ck-mockup-name">Adriano King</p>
                                    <p class="ck-mockup-tagline">Cartão Digital NFC</p>
                                    <div class="ck-mockup-links">
                                        <span><i class="fab fa-instagram"></i></span>
                                        <span><i class="fab fa-whatsapp"></i></span>
                                        <span><i class="fas fa-globe"></i></span>
                                    </div>
                                    <div class="ck-mockup-cta">
                                        <i class="fas fa-external-link-alt"></i> Toque para abrir
                                    </div>
                                </div>
                            </div>
                        </a>
                    </div>
                    <div class="ck-ix-d1b3fe">
                        <a href="https://tag.conectaking.com.br/adrianokingg" target="_blank" rel="noopener" class="btn btn-primary ck-w-full">
                            <i class="fas fa-external-link-alt"></i> Ver Cartão Completo
                        </a>
                    </div>
                    </div>
                </div>
            </div>
        </section>


    <!-- CTA Intermedirio 1 -->
    <section class="section ck-ix-8a066a">
        <div class="ck-ix-0ab009"></div>
        <div class="container ck-container-1200-z">
            <h3 class="ck-ix-247950">
                Profissionais de sucesso não trocam cartões.<br>Eles trocam conexões.
            </h3>
            <a href="#planos" class="btn btn-primary ck-ix-d95d00">
                <i class="fas fa-rocket"></i> Quero Minha Conexão Agora
            </a>
        </div>
    </section>

    <!-- Como Funciona -->
    <section id="como-funciona" class="section ck-ix-554fcc">
        <div class="container ck-container-1200">
            <div class="section-header">
                <h2 class="ck-ix-78406c">
                    Como Funciona
                </h2>
                <p class="ck-ix-37bb63">Sem aplicativo. Sem papel. Sem fricção.</p>
            </div>
            <div class="ck-ix-53c586">
                <div class="card fade-in">
                    <div class="ck-ix-076bc6">
                        <i class="fas fa-hand-pointer"></i>
                    </div>
                    <h3 class="ck-heading-cinzel-center">1. Encoste</h3>
                    <p class="ck-text-muted-center">Aproxime o celular do seu ConectaKing NFC</p>
                </div>
                <div class="card fade-in">
                    <div class="ck-ix-076bc6">
                        <i class="fas fa-link"></i>
                </div>
                    <h3 class="ck-heading-cinzel-center">2. Conecte</h3>
                    <p class="ck-text-muted-center">Seu perfil digital abre instantaneamente</p>
                    </div>
                <div class="card fade-in">
                    <div class="ck-ix-076bc6">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <h3 class="ck-heading-cinzel-center">3. Converta</h3>
                    <p class="ck-text-muted-center">Transforme contatos em clientes e conexões</p>
                    </div>
                </div>
            </div>
        </section>

    <!-- CTA Estratgico 1 -->
    <section class="section ck-ix-c054f7">
        <div class="container ck-container-1200">
            <h2 class="ck-ix-651430">
                Sua marca não pede atenção.<br>Ela impõe respeito.
            </h2>
            <p class="ck-ix-cde788">
                Transforme cada contato em uma oportunidade real de negócio
            </p>
            <a href="#planos" class="btn btn-primary btn-lg">
                <i class="fas fa-crown"></i> Garanta seu ConectaKing agora
            </a>
        </div>
    </section>

    <!-- Benefícios -->
    <section id="beneficios" class="section ck-ix-df3688">
        <div class="container ck-container-1200">
            <div class="section-header">
                <h2 class="ck-ix-d12637">
                    Por Que Escolher o ConectaKing?
                </h2>
                <p>Resultados reais para profissionais que pensam grande</p>
                </div>
            <div class="ck-ix-67e4c4">
                <div class="card fade-in ck-ix-40395e">
                    <div class="ck-ix-9ac385">
                        <i class="fas fa-crown"></i>
            </div>
                    <h3 class="ck-heading-cinzel">Autoridade Profissional Instantânea</h3>
                    <p class="ck-text-muted">Projete confiança e profissionalismo desde o primeiro contato. Seu cartão digital fala por você.</p>
                </div>
                <div class="card fade-in ck-ix-2cd543">
                    <div class="ck-ix-256dcd">
                        <i class="fas fa-rocket"></i>
            </div>
                    <h3 class="ck-heading-cinzel">Mais Impacto em Reuniões e Eventos</h3>
                    <p class="ck-text-muted">Destaque-se em networking, feiras e encontros profissionais com tecnologia de ponta.</p>
                </div>
                <div class="card fade-in ck-ix-8f0a3c">
                    <div class="ck-ix-eddda4">
                        <i class="fas fa-sync-alt"></i>
                    </div>
                    <h3 class="ck-heading-cinzel">Atualizações Ilimitadas</h3>
                    <p class="ck-text-muted">Mude links, adicione informações e atualize seu perfil quantas vezes precisar, sem custos extras.</p>
                </div>
                <div class="card fade-in ck-ix-2f8030">
                    <div class="ck-ix-7ee99b">
                        <i class="fas fa-leaf"></i>
                    </div>
                    <h3 class="ck-heading-cinzel">Sustentável e Reutilizável</h3>
                    <p class="ck-text-muted">Elimine o desperdício de cartões de papel. Um ConectaKing dura para sempre.</p>
                </div>
                <div class="card fade-in ck-ix-c6de4f">
                    <div class="ck-ix-07d152">
                        <i class="fas fa-network-wired"></i>
                    </div>
                    <h3 class="ck-heading-cinzel">Centralização Total da Presença Digital</h3>
                    <p class="ck-text-muted">Todos os seus links, redes sociais e informações em um único lugar profissional.</p>
                </div>
                <div class="card fade-in ck-ix-44adfc">
                    <div class="ck-ix-51d5ba">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <h3 class="ck-heading-cinzel">Segurana e Privacidade</h3>
                    <p class="ck-text-muted">Tecnologia NFC confiável e segura. Você controla o que compartilha.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA Estratgico 2 -->
    <section class="section ck-ix-f9a77c">
        <div class="ck-ix-0ab009"></div>
        <div class="container ck-container-1200-z">
            <h2 class="ck-ix-74e673">
                Pare de perder oportunidades.<br>Comece a criar conexões que vendem.
            </h2>
            <p class="ck-ix-cde788">
                Junte-se a centenas de profissionais que já estão revolucionando seu networking
            </p>
            <a href="#planos" class="btn btn-primary btn-lg ck-ix-d95d00">
                <i class="fas fa-rocket"></i> Quero Transformar Meu Networking Agora
            </a>
        </div>
</section>

    <!-- CTA Antes dos Planos -->
    <section class="section ck-ix-3f19d1">
        <div class="ck-ix-9d755b"></div>
        <div class="container ck-container-1200-z">
            <h3 class="ck-ix-247950">
                Escolha o plano que transforma seu networking em vendas reais.
            </h3>
            <p class="ck-ix-26fc4b">
                Planos flexíveis para profissionais que querem resultados, não promessas.
            </p>
                </div>
    </section>

    <!-- Planos -->
    <section id="planos" class="section pricing ck-ix-74b1d6" style="padding: 70px 0; background: linear-gradient(180deg, #0b0b0b 0%, #151515 50%, #0b0b0b 100%);">
        <div class="container ck-container-1200" style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
            <div class="section-header ck-ix-50f774" style="text-align: center; margin-bottom: 45px;">
                <div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; border-radius: 9999px; background: rgba(255, 199, 0, 0.12); border: 1px solid rgba(255, 199, 0, 0.35); color: #FFC700; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px;">
                    <i class="fas fa-crown"></i> Conecta King • O Poder da Conexão
                </div>
                <h2 style="font-size: clamp(26px, 4vw, 38px); font-weight: 900; color: #FFFFFF; text-transform: uppercase; letter-spacing: -0.01em; margin-bottom: 12px; text-shadow: 0 0 30px rgba(255, 199, 0, 0.25);">
                    Veja Nossos <span style="background: linear-gradient(90deg, #FFC700, #FFE082, #FFC700); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Pacotes Exclusivos!</span>
                </h2>
                <p style="color: rgba(245, 245, 245, 0.75); font-size: clamp(14px, 1.8vw, 16px); max-width: 650px; margin: 0 auto;">
                    Tecnologia NFC de aproximação, tags e pulseiras de silicone premium aliadas à plataforma digital mais completa do mercado.
                </p>
            </div>

            <!-- Grid dos 3 Pacotes -->
            <div id="exclusive-packages-container" data-static-packages="true" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 28px; max-width: 1100px; margin: 0 auto; align-items: stretch;">
                
                <!-- Pacote 1: START -->
                <div class="pricing-card" style="background: linear-gradient(180deg, #181818 0%, #101010 100%); border: 2px solid rgba(255, 255, 255, 0.12); border-radius: 22px; padding: 32px 24px; display: flex; flex-direction: column; justify-content: space-between; position: relative; transition: all 0.3s ease; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    <div>
                        <!-- Header do Card -->
                        <div style="background: #000000; border: 1px solid rgba(255, 199, 0, 0.3); border-radius: 12px; padding: 10px 16px; text-align: center; margin-bottom: 18px;">
                            <h3 style="font-size: 20px; font-weight: 900; color: #FFC700; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">1. START</h3>
                        </div>

                        <!-- Itens do Pacote -->
                        <div style="text-align: center; margin-bottom: 22px;">
                            <div style="font-size: 17px; font-weight: 800; color: #FFFFFF; margin-bottom: 10px;">
                                Plataforma + 1 Tag NFC
                            </div>
                            <div style="display: flex; justify-content: center; align-items: center; gap: 12px; font-size: 26px; color: #FFC700; opacity: 0.95;">
                                <i class="fas fa-mobile-alt" title="Plataforma Conecta King"></i>
                                <span style="font-size: 18px; color: rgba(255,255,255,0.4);">+</span>
                                <i class="fas fa-wifi" title="Tag NFC de Aproximação"></i>
                            </div>
                        </div>

                        <!-- Bloco de Preço -->
                        <div style="background: linear-gradient(135deg, rgba(255, 199, 0, 0.15), rgba(255, 199, 0, 0.05)); border: 1px solid rgba(255, 199, 0, 0.4); border-radius: 14px; padding: 18px 14px; text-align: center; margin-bottom: 24px;">
                            <div style="font-size: 13px; text-transform: uppercase; color: rgba(245, 245, 245, 0.7); font-weight: 600; margin-bottom: 4px;">Em até 12x no cartão</div>
                            <div style="font-size: 32px; font-weight: 900; color: #FFC700; line-height: 1.1;">
                                12x de R$ 35<span style="font-size: 20px;">,00</span>
                            </div>
                            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255, 199, 0, 0.2); font-size: 14px; font-weight: 800; color: #FFFFFF;">
                                À VISTA (PIX): <span style="color: #4EDE72;">R$ 350,00</span>
                            </div>
                        </div>

                        <!-- Lista de Benefícios -->
                        <ul style="list-style: none; padding: 0; margin: 0 0 24px 0; font-size: 14px; color: rgba(245, 245, 245, 0.85); line-height: 1.8;">
                            <li style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <i class="fas fa-check-circle" style="color: #4EDE72; font-size: 15px;"></i>
                                <span><strong>1 Tag NFC</strong> chaveiro de alta durabilidade</span>
                            </li>
                            <li style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <i class="fas fa-check-circle" style="color: #4EDE72; font-size: 15px;"></i>
                                <span>Acesso completo à <strong>Plataforma Conecta King</strong></span>
                            </li>
                            <li style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <i class="fas fa-check-circle" style="color: #4EDE72; font-size: 15px;"></i>
                                <span><strong>Salvar Contato</strong> na agenda do cliente em 1 toque</span>
                            </li>
                            <li style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <i class="fas fa-check-circle" style="color: #4EDE72; font-size: 15px;"></i>
                                <span>QR Code Dinâmico no verso</span>
                            </li>
                            <li style="display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-check-circle" style="color: #4EDE72; font-size: 15px;"></i>
                                <span>Atualização de dados em tempo real</span>
                            </li>
                        </ul>
                    </div>

                    <!-- Botão de Compra -->
                    <a href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Gostaria%20de%20adquirir%20o%20Pacote%201%20-%20START%20(Plataforma%20%2B%201%20Tag%20NFC)%20por%2012x%20de%20R$%2035,00%20ou%20R$%20350,00%20%C3%A0%20vista." target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px 20px; border-radius: 12px; background: #FFC700; color: #000000; font-weight: 800; font-size: 15px; text-transform: uppercase; letter-spacing: 0.04em; text-decoration: none; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(255, 199, 0, 0.35);">
                        <span>Adquira Já o Seu</span>
                        <i class="fas fa-arrow-right"></i>
                    </a>
                </div>

                <!-- Pacote 2: EXECUTIVE (DESTAQUE / MAIS VENDIDO) -->
                <div class="pricing-card" style="background: linear-gradient(180deg, #221c08 0%, #151103 100%); border: 2px solid #FFC700; border-radius: 22px; padding: 32px 24px; display: flex; flex-direction: column; justify-content: space-between; position: relative; transition: all 0.3s ease; box-shadow: 0 0 40px rgba(255, 199, 0, 0.25); transform: scale(1.03);">
                    
                    <!-- Selo Mais Vendido -->
                    <div style="position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: linear-gradient(90deg, #FFC700, #FFE082, #FFC700); color: #000000; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; padding: 5px 18px; border-radius: 9999px; box-shadow: 0 4px 15px rgba(255, 199, 0, 0.5); display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                        <span>⭐ MAIS VENDIDO</span>
                    </div>

                    <div>
                        <!-- Header do Card -->
                        <div style="background: #000000; border: 1px solid #FFC700; border-radius: 12px; padding: 10px 16px; text-align: center; margin-bottom: 18px; margin-top: 4px;">
                            <h3 style="font-size: 20px; font-weight: 900; color: #FFC700; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">2. EXECUTIVE</h3>
                        </div>

                        <!-- Itens do Pacote -->
                        <div style="text-align: center; margin-bottom: 22px;">
                            <div style="font-size: 17px; font-weight: 800; color: #FFFFFF; margin-bottom: 10px;">
                                Plataforma + 1 Tag NFC + 1 Pulseira Silicone
                            </div>
                            <div style="display: flex; justify-content: center; align-items: center; gap: 10px; font-size: 24px; color: #FFC700;">
                                <i class="fas fa-mobile-alt" title="Plataforma Conecta King"></i>
                                <span style="font-size: 16px; color: rgba(255,255,255,0.4);">+</span>
                                <i class="fas fa-wifi" title="Tag NFC"></i>
                                <span style="font-size: 16px; color: rgba(255,255,255,0.4);">+</span>
                                <i class="fas fa-ring" title="Pulseira Silicone NFC"></i>
                            </div>
                        </div>

                        <!-- Bloco de Preço -->
                        <div style="background: linear-gradient(135deg, rgba(255, 199, 0, 0.25), rgba(255, 199, 0, 0.08)); border: 1.5px solid #FFC700; border-radius: 14px; padding: 18px 14px; text-align: center; margin-bottom: 24px; box-shadow: 0 0 20px rgba(255, 199, 0, 0.15);">
                            <div style="font-size: 13px; text-transform: uppercase; color: #FFE082; font-weight: 700; margin-bottom: 4px;">Em até 12x no cartão</div>
                            <div style="font-size: 34px; font-weight: 900; color: #FFC700; line-height: 1.1;">
                                12x de R$ 42<span style="font-size: 20px;">,00</span>
                            </div>
                            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255, 199, 0, 0.3); font-size: 14px; font-weight: 800; color: #FFFFFF;">
                                À VISTA (PIX): <span style="color: #4EDE72;">R$ 429,90</span>
                            </div>
                        </div>

                        <!-- Lista de Benefícios -->
                        <ul style="list-style: none; padding: 0; margin: 0 0 24px 0; font-size: 14px; color: rgba(245, 245, 245, 0.85); line-height: 1.8;">
                            <li style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <i class="fas fa-check-circle" style="color: #4EDE72; font-size: 15px;"></i>
                                <span><strong>1 Tag NFC</strong> chaveiro premium</span>
                            </li>
                            <li style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <i class="fas fa-check-circle" style="color: #4EDE72; font-size: 15px;"></i>
                                <span><strong>1 Pulseira Silicone NFC</strong> elegante e à prova d'água</span>
                            </li>
                            <li style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <i class="fas fa-check-circle" style="color: #4EDE72; font-size: 15px;"></i>
                                <span>Plataforma completa + <strong>Logomarca editável</strong></span>
                            </li>
                            <li style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <i class="fas fa-check-circle" style="color: #4EDE72; font-size: 15px;"></i>
                                <span>Portfólio, Carrossel & Catálogo de Produtos</span>
                            </li>
                            <li style="display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-check-circle" style="color: #4EDE72; font-size: 15px;"></i>
                                <span><strong>Salvar Contato</strong> na agenda em 1 toque</span>
                            </li>
                        </ul>
                    </div>

                    <!-- Botão de Compra Dourado Forte -->
                    <a href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Gostaria%20de%20adquirir%20o%20Pacote%202%20-%20EXECUTIVE%20(Plataforma%20%2B%201%20Tag%20NFC%20%2B%201%20Pulseira%20Silicone)%20por%2012x%20de%20R$%2042,00%20ou%20R$%20429,90%20%C3%A0%20vista." target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 15px 20px; border-radius: 12px; background: linear-gradient(90deg, #FFC700, #FFE082, #FFC700); color: #000000; font-weight: 900; font-size: 15px; text-transform: uppercase; letter-spacing: 0.04em; text-decoration: none; transition: all 0.3s ease; box-shadow: 0 4px 20px rgba(255, 199, 0, 0.5);">
                        <span>Adquira Já o Seu</span>
                        <i class="fas fa-arrow-right"></i>
                    </a>
                </div>

                <!-- Pacote 3: DUO / SOCIEDADE -->
                <div class="pricing-card" style="background: linear-gradient(180deg, #181818 0%, #101010 100%); border: 2px solid rgba(255, 255, 255, 0.12); border-radius: 22px; padding: 32px 24px; display: flex; flex-direction: column; justify-content: space-between; position: relative; transition: all 0.3s ease; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    <div>
                        <!-- Header do Card -->
                        <div style="background: #000000; border: 1px solid rgba(255, 199, 0, 0.3); border-radius: 12px; padding: 10px 16px; text-align: center; margin-bottom: 18px;">
                            <h3 style="font-size: 20px; font-weight: 900; color: #FFC700; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">3. DUO / SOCIEDADE</h3>
                        </div>

                        <!-- Itens do Pacote -->
                        <div style="text-align: center; margin-bottom: 22px;">
                            <div style="font-size: 17px; font-weight: 800; color: #FFFFFF; margin-bottom: 10px;">
                                Plataforma + 2 Tags NFC + 2 Pulseiras Silicone
                            </div>
                            <div style="display: flex; justify-content: center; align-items: center; gap: 10px; font-size: 24px; color: #FFC700; opacity: 0.95;">
                                <i class="fas fa-mobile-alt" title="Plataforma Conecta King"></i>
                                <span style="font-size: 16px; color: rgba(255,255,255,0.4);">+</span>
                                <i class="fas fa-tags" title="2 Tags NFC"></i>
                                <span style="font-size: 16px; color: rgba(255,255,255,0.4);">+</span>
                                <i class="fas fa-ring" title="2 Pulseiras Silicone"></i>
                            </div>
                        </div>

                        <!-- Bloco de Preço -->
                        <div style="background: linear-gradient(135deg, rgba(255, 199, 0, 0.15), rgba(255, 199, 0, 0.05)); border: 1px solid rgba(255, 199, 0, 0.4); border-radius: 14px; padding: 18px 14px; text-align: center; margin-bottom: 24px;">
                            <div style="font-size: 13px; text-transform: uppercase; color: rgba(245, 245, 245, 0.7); font-weight: 600; margin-bottom: 4px;">Em até 12x no cartão</div>
                            <div style="font-size: 32px; font-weight: 900; color: #FFC700; line-height: 1.1;">
                                12x de R$ 49<span style="font-size: 20px;">,90</span>
                            </div>
                            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255, 199, 0, 0.2); font-size: 14px; font-weight: 800; color: #FFFFFF;">
                                À VISTA (PIX): <span style="color: #4EDE72;">R$ 499,00</span>
                            </div>
                        </div>

                        <!-- Lista de Benefícios -->
                        <ul style="list-style: none; padding: 0; margin: 0 0 24px 0; font-size: 14px; color: rgba(245, 245, 245, 0.85); line-height: 1.8;">
                            <li style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <i class="fas fa-check-circle" style="color: #4EDE72; font-size: 15px;"></i>
                                <span><strong>2 Tags NFC</strong> chaveiros de aproximação</span>
                            </li>
                            <li style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <i class="fas fa-check-circle" style="color: #4EDE72; font-size: 15px;"></i>
                                <span><strong>2 Pulseiras Silicone NFC</strong> completas</span>
                            </li>
                            <li style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <i class="fas fa-check-circle" style="color: #4EDE72; font-size: 15px;"></i>
                                <span>Ideal para <strong>sócios, parceiros ou duplas</strong></span>
                            </li>
                            <li style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <i class="fas fa-check-circle" style="color: #4EDE72; font-size: 15px;"></i>
                                <span>Acesso completo à plataforma Conecta King</span>
                            </li>
                            <li style="display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-check-circle" style="color: #4EDE72; font-size: 15px;"></i>
                                <span>Suporte VIP e atendimento personalizado</span>
                            </li>
                        </ul>
                    </div>

                    <!-- Botão de Compra -->
                    <a href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Gostaria%20de%20adquirir%20o%20Pacote%203%20-%20DUO%20%2F%20SOCIEDADE%20(Plataforma%20%2B%202%20Tags%20NFC%20%2B%202%20Pulseiras%20Silicone)%20por%2012x%20de%20R$%2049,90%20ou%20R$%20499,00%20%C3%A0%20vista." target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px 20px; border-radius: 12px; background: #FFC700; color: #000000; font-weight: 800; font-size: 15px; text-transform: uppercase; letter-spacing: 0.04em; text-decoration: none; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(255, 199, 0, 0.35);">
                        <span>Adquira Já o Seu</span>
                        <i class="fas fa-arrow-right"></i>
                    </a>
                </div>

            </div>

            <!-- Banner Inferior de Contato / WhatsApp Oficial -->
            <div style="margin-top: 45px; text-align: center; background: rgba(255, 199, 0, 0.06); border: 1px solid rgba(255, 199, 0, 0.25); border-radius: 18px; padding: 22px 20px; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 18px;">
                <span style="font-size: 15px; font-weight: 700; color: #FFFFFF;">
                    Dúvidas ou pedidos especiais? Fale com nosso consultor oficial:
                </span>
                <a href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Gostaria%20de%20tirar%20d%C3%BAvidas%20sobre%20os%20pacotes%20exclusivos%20do%20Conecta%20King." target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 8px; background: #25D366; color: #000000; font-weight: 800; font-size: 14px; padding: 10px 20px; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 15px rgba(37, 211, 102, 0.35);">
                    <i class="fab fa-whatsapp" style="font-size: 18px;"></i>
                    <span>+55 (11) 98878-9417</span>
                </a>
                <a href="https://www.instagram.com/conectaking" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 8px; color: #FFC700; font-weight: 700; font-size: 14px; text-decoration: none;">
                    <i class="fab fa-instagram" style="font-size: 18px;"></i>
                    <span>@conectaking</span>
                </a>
            </div>

        </div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="section ck-ix-63f1f0">
        <div class="container ck-container-1200">
            <div class="section-header">
                <h2>Perguntas Frequentes</h2>
                <p>Tire suas dúvidas sobre o ConectaKing</p>
                </div>
            <div class="ck-ix-f8c54a">
                <div class="faq-item ck-faq-item">
                    <div class="faq-question ck-faq-q">
                        <span>Tem mensalidade?</span>
                        <i class="fas fa-chevron-down ck-faq-chevron"></i>
                            </div>
                    <div class="faq-answer ck-faq-a">
                        <div class="ck-faq-body">
                            O ConectaKing oferece planos anuais e mensais. Você escolhe o formato de pagamento que melhor se adapta ao seu negócio. Todas as atualizações estão incluídas no período contratado.
                        </div>
                    </div>
                            </div>
                <div class="faq-item ck-faq-item">
                    <div class="faq-question ck-faq-q">
                        <span>Funciona em qualquer celular?</span>
                        <i class="fas fa-chevron-down ck-faq-chevron"></i>
                        </div>
                    <div class="faq-answer ck-faq-a">
                        <div class="ck-faq-body">
                            Sim. O ConectaKing usa tecnologia NFC, disponível na maioria dos smartphones modernos (Android e iPhone). Não é necessário instalar nenhum aplicativo.
                    </div>
                            </div>
                        </div>
                <div class="faq-item ck-faq-item">
                    <div class="faq-question ck-faq-q">
                        <span>Posso atualizar depois?</span>
                        <i class="fas fa-chevron-down ck-faq-chevron"></i>
                    </div>
                    <div class="faq-answer ck-faq-a">
                        <div class="ck-faq-body">
                            Sim, quantas vezes quiser. Você pode atualizar seus links, informações e personalização a qualquer momento, sem custos adicionais.
                            </div>
                        </div>
                    </div>
                <div class="faq-item ck-faq-item">
                    <div class="faq-question ck-faq-q">
                        <span>É seguro?</span>
                        <i class="fas fa-chevron-down ck-faq-chevron"></i>
                    </div>
                    <div class="faq-answer ck-faq-a">
                        <div class="ck-faq-body">
                            Sim. O ConectaKing usa tecnologia NFC confiável e segura. Você tem controle total sobre o que compartilha e todas as informações são protegidas.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

    <!-- CTA Final Estratgico -->
    <section class="section ck-ix-bbf4c5">
        <div class="ck-ix-b24b34"></div>
        <div class="container ck-container-1200-z">
            <h2 class="ck-ix-61b320">
                Não espere mais.<br>Comece a vender hoje.
            </h2>
            <p class="ck-ix-b24dfc">
                Cada dia sem o ConectaKing é um dia perdido de conexões e vendas. Garanta seu lugar entre os profissionais que estão dominando o networking digital.
            </p>
            <a href="#planos" class="btn btn-primary btn-lg ck-ix-083b98">
                <i class="fas fa-crown"></i> Quero Meu ConectaKing Agora
            </a>
            <p class="ck-ix-2cc7c8">
                <i class="fas fa-shield-alt"></i> Garantia de satisfação | <i class="fas fa-sync-alt"></i> Atualizações ilimitadas | <i class="fas fa-headset"></i> Suporte prioritário
            </p>
            </div>
        </section>

    

    <!-- Footer -->
    <footer class="ck-ix-c106d8">
        <div class="container ck-container-1200">
            <div class="ck-ix-32963c">
                <div>
                    <div class="ck-ix-a0185c">
                        <img class="ck-ix-b62d66" src="/logo.png" alt="ConectaKing">
                        <span class="ck-ix-78a687">CONECTAKING</span>
                    </div>
                    <p class="ck-ix-3b5f7f">
                        A nova era da conexão digital. Transforme cada contato em uma oportunidade real com tecnologia NFC premium.
                    </p>
                    <div class="ck-ix-0bac17">
                        <a class="ck-ix-043935" href="https://www.instagram.com/conectaking" target="_blank" onmouseover="this.style.background='var(--yellow-primary)'; this.style.color='var(--black-absolute)'; this.style.transform='translateY(-3px)';" onmouseout="this.style.background='rgba(255, 199, 0, 0.1)'; this.style.color='var(--yellow-primary)'; this.style.transform='translateY(0)';">
                            <i class="fab fa-instagram"></i>
                        </a>
                    </div>
                </div>
                <div>
                    <h3 class="ck-heading-gold">Navegação</h3>
                    <ul class="ck-list-none">
                        <li class="ck-mb-12"><a class="ck-link-muted" href="#como-funciona" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">Como Funciona</a></li>
                        <li class="ck-mb-12"><a class="ck-link-muted" href="#beneficios" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">Benefícios</a></li>
                        <li class="ck-mb-12"><a class="ck-link-muted" href="#planos" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">Planos</a></li>
                        <li class="ck-mb-12"><a class="ck-link-muted" href="#faq" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">FAQ</a></li>
                    </ul>
                </div>
                <div>
                    <h3 class="ck-heading-gold">Suporte</h3>
                    <ul class="ck-list-none">
                        <li class="ck-mb-12 {{ $hasTokenCookie ? 'ck-hidden' : '' }}" id="footer-login-item"><a class="ck-link-muted" href="/login" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">Login</a></li>
                        <li class="ck-ix-62d461 {{ $hasTokenCookie ? '' : 'ck-hidden' }}" id="footer-access-panel-item"><a class="ck-link-muted" href="/dashboard" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">Acessar Painel</a></li>
                        <li class="ck-mb-12 {{ $hasTokenCookie ? 'ck-hidden' : '' }}" id="footer-register-item"><a class="ck-link-muted" href="/registro" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">Criar Acesso</a></li>
                        <li class="ck-mb-12"><a class="ck-link-muted" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Gostaria%20de%20falar%20com%20um%20vendedor%20da%20Conecta%20King." target="_blank" rel="noopener noreferrer" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">Falar com Vendedor</a></li>
                        <li class="ck-mb-12"><a class="ck-link-muted" href="https://www.instagram.com/conectaking" target="_blank" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">Instagram</a></li>
                    </ul>
                    </div>
                <div>
                    <h3 class="ck-heading-gold">Legal</h3>
                    <ul class="ck-list-none">
                        <li class="ck-mb-12"><a class="ck-link-muted" href="/termos" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">Termos de Serviço</a></li>
                        <li class="ck-mb-12"><a class="ck-link-muted" href="/privacidade" onmouseover="this.style.color='var(--yellow-primary)';" onmouseout="this.style.color='rgba(245, 245, 245, 0.7)';">Política de Privacidade</a></li>
                    </ul>
                </div>
            </div>
            <div class="ck-ix-a6c657">
                <p>&copy; 2025 ConectaKing. Todos os direitos reservados.</p>
                <p class="ck-ix-eec01a">Desenvolvido com <i class="fas fa-heart ck-ix-3c9ec7"></i> para profissionais que pensam grande</p>
            </div>
        </div>
    </footer>

    <!-- CTA Final Fixo Mobile -->
    <div class="ck-ix-34cce3" id="cta-fixed-mobile">
        <div class="ck-ix-e42940">
            <a href="#planos" class="btn btn-primary ck-w-full">
                <i class="fas fa-crown"></i> Quero meu ConectaKing agora
            </a>
        </div>
    </div>
</body>
</html>
