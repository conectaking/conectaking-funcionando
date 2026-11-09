<!DOCTYPE html>
<html class="dark" lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
  <title>KingSelection — Login & Planos para Fotógrafos | Conecta King</title>
  <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"/>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>

  <style>
    @layer base {
      html, body { margin: 0; padding: 0; }
      body { overscroll-behavior: none; }
      main > :first-child { margin-top: 0 !important; }
      main > :last-child { margin-bottom: 0 !important; }
    }
    ::-webkit-scrollbar { display: none; }
    
    /* Previne autofill branco no Android/Chrome */
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus {
      -webkit-text-fill-color: #dfe2ec !important;
      -webkit-box-shadow: 0 0 0px 1000px #0a0e15 inset !important;
      box-shadow: 0 0 0px 1000px #0a0e15 inset !important;
      transition: background-color 5000s ease-in-out 0s;
    }

    .material-symbols-outlined {
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
  </style>

  <script id="tailwind-config">
    tailwind.config = {
      darkMode: "class",
      theme: {
        extend: {
          colors: {
            "secondary-fixed": "#6ffbbe",
            "tertiary-fixed": "#ffddb8",
            "surface-variant": "#31353d",
            "surface-dim": "#0f131b",
            "on-tertiary": "#472a00",
            "on-error-container": "#ffdad6",
            "surface-tint": "#f59e0b",
            "inverse-surface": "#dfe2ec",
            "tertiary": "#ffb95f",
            "secondary-fixed-dim": "#4edea3",
            "on-primary-fixed": "#2a1700",
            "on-secondary-container": "#00311f",
            "on-primary-container": "#472a00",
            "surface-container": "#1c2027",
            "outline": "#a08e7a",
            "error": "#ffb4ab",
            "surface-bright": "#353941",
            "primary-fixed-dim": "#ffb95f",
            "on-tertiary-fixed-variant": "#653e00",
            "surface-container-lowest": "#0a0e15",
            "tertiary-container": "#d97706",
            "surface-container-low": "#181c23",
            "surface": "#0f131b",
            "surface-container-highest": "#31353d",
            "surface-container-high": "#262a32",
            "secondary-container": "#065f46",
            "primary-fixed": "#ffddb8",
            "inverse-primary": "#855300",
            "on-secondary-fixed": "#002113",
            "background": "#0f131b",
            "on-surface": "#dfe2ec",
            "primary": "#f59e0b",
            "secondary": "#10b981",
            "tertiary-fixed-dim": "#ffb95f",
            "error-container": "#93000a",
            "on-secondary": "#003824",
            "outline-variant": "#2a313d",
            "primary-container": "#f59e0b",
            "on-primary-fixed-variant": "#653e00",
            "on-secondary-fixed-variant": "#005236",
            "inverse-on-surface": "#2d3038",
            "on-surface-variant": "#94a3b8",
            "on-background": "#dfe2ec",
            "on-error": "#690005",
            "on-tertiary-container": "#563400",
            "on-tertiary-fixed": "#2a1700",
            "on-primary": "#2a1700"
          },
          borderRadius: {
            "DEFAULT": "0.25rem",
            "lg": "0.5rem",
            "xl": "0.75rem",
            "full": "9999px"
          },
          spacing: {
            "margin": "2rem",
            "space-md": "1rem",
            "space-lg": "1.5rem",
            "space-xl": "2.5rem",
            "margin-mobile": "1rem",
            "space-sm": "0.5rem",
            "gutter-mobile": "1rem",
            "gutter": "1.5rem",
            "space-xs": "0.25rem"
          },
          fontFamily: {
            "body-sm": ["Plus Jakarta Sans", "sans-serif"],
            "label-sm": ["Plus Jakarta Sans", "sans-serif"],
            "body-md": ["Plus Jakarta Sans", "sans-serif"],
            "label-md": ["Plus Jakarta Sans", "sans-serif"],
            "headline-xl": ["Plus Jakarta Sans", "sans-serif"],
            "headline-md": ["Plus Jakarta Sans", "sans-serif"],
            "headline-xl-mobile": ["Plus Jakarta Sans", "sans-serif"],
            "display-lg": ["Plus Jakarta Sans", "sans-serif"],
            "display-lg-mobile": ["Plus Jakarta Sans", "sans-serif"],
            "headline-sm": ["Plus Jakarta Sans", "sans-serif"],
            "body-lg": ["Plus Jakarta Sans", "sans-serif"]
          },
          fontSize: {
            "body-sm": ["12px", { "lineHeight": "18px", "letterSpacing": "0.01em", "fontWeight": "400" }],
            "label-sm": ["10px", { "lineHeight": "14px", "letterSpacing": "0.08em", "fontWeight": "700" }],
            "body-md": ["14px", { "lineHeight": "20px", "letterSpacing": "0em", "fontWeight": "400" }],
            "label-md": ["12px", { "lineHeight": "16px", "letterSpacing": "0.04em", "fontWeight": "600" }],
            "headline-xl": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
            "headline-md": ["22px", { "lineHeight": "30px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
            "headline-xl-mobile": ["26px", { "lineHeight": "34px", "letterSpacing": "-0.015em", "fontWeight": "700" }],
            "display-lg": ["48px", { "lineHeight": "56px", "letterSpacing": "-0.03em", "fontWeight": "800" }],
            "display-lg-mobile": ["36px", { "lineHeight": "44px", "letterSpacing": "-0.025em", "fontWeight": "800" }],
            "headline-sm": ["18px", { "lineHeight": "26px", "letterSpacing": "-0.005em", "fontWeight": "600" }],
            "body-lg": ["16px", { "lineHeight": "24px", "letterSpacing": "0em", "fontWeight": "400" }]
          }
        }
      }
    };
  </script>
</head>

<body class="bg-background font-body-md text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container min-h-screen">

  <!-- TOP HEADER -->
  <header class="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-primary/10 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
    <div class="h-20 max-w-[1440px] mx-auto px-margin flex items-center justify-between gap-space-md">
      
      <!-- Brand Logo -->
      <a href="/" class="flex items-center gap-space-md shrink-0 text-decoration-none">
        <img alt="King Selection Logo" class="h-8 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]" src="https://i.ibb.co/60sW9k75/logo.png"/>
        <div class="hidden sm:flex flex-col">
          <span class="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight leading-none">King Selection</span>
          <span class="font-label-sm text-label-sm text-primary/80 leading-none mt-1">Conecta King Fotografia</span>
        </div>
      </a>

      <!-- Navigation Links -->
      <nav class="hidden xl:flex items-center gap-space-md">
        <a class="px-space-sm py-space-xs rounded transition-colors bg-surface-container-high text-primary font-semibold border border-primary/20 shadow-[0_0_12px_rgba(245,158,11,0.15)]" href="#">Início</a>
        <a class="px-space-sm py-space-xs font-label-md text-label-md text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded transition-colors" href="#como-funciona">Como Funciona</a>
        <a class="px-space-sm py-space-xs font-label-md text-label-md text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded transition-colors" href="#simulador">Simulador de Fotos</a>
        <a class="px-space-sm py-space-xs font-label-md text-label-md text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded transition-colors" href="#planos">Planos & Preços</a>
        <a class="px-space-sm py-space-xs font-label-md text-label-md text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded transition-colors" href="#diferenciais">Diferenciais</a>
      </nav>

      <!-- Action Buttons -->
      <div class="flex items-center gap-space-sm">
        <a class="hidden sm:inline-flex items-center gap-space-xs px-space-md py-space-sm rounded bg-surface-container-high border border-outline-variant text-on-surface hover:bg-surface-container-highest hover:text-primary hover:border-primary/40 transition-colors font-label-md text-label-md" href="#painel-fotografo">
          <span class="material-symbols-outlined text-primary text-[18px]">lock_open</span>
          <span>Área do Fotógrafo</span>
        </a>
        <a class="inline-flex items-center gap-space-xs px-space-md py-space-sm rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/40 hover:text-emerald-300 transition-colors font-label-md text-label-md shadow-[0_0_12px_rgba(16,185,129,0.15)]" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Gostaria%20de%20conversar%20com%20um%20especialista%20do%20King%20Selection." target="_blank">
          <span class="material-symbols-outlined text-[18px]">chat</span>
          <span>Falar no WhatsApp</span>
        </a>
        <a href="#painel-fotografo" class="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.4)] flex items-center justify-center shrink-0 text-decoration-none" title="Ir para Login">
          <span class="material-symbols-outlined text-stone-950 text-[18px] font-bold">person</span>
        </a>
      </div>

    </div>
  </header>

  <main class="w-full pt-20 bg-background">
    <div class="flex flex-col w-full text-on-surface">

      <!-- Ambient Glow Elements -->
      <div class="relative w-full overflow-hidden">
        <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-primary/10 blur-[140px] pointer-events-none rounded-full"></div>
        <div class="absolute top-[750px] -left-32 w-[400px] h-[400px] bg-primary/5 blur-[120px] pointer-events-none rounded-full"></div>
        <div class="absolute top-[1300px] -right-32 w-[450px] h-[450px] bg-emerald-500/10 blur-[130px] pointer-events-none rounded-full"></div>

        <!-- HERO & LOGIN SECTION -->
        <section class="relative max-w-[1440px] mx-auto px-margin pt-space-lg lg:pt-space-xl pb-space-xl">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
            
            <!-- Left Column: Copy & Value Proposition -->
            <div class="lg:col-span-7 flex flex-col space-y-5 pt-2 z-10">
              <!-- Prestige Eyebrow Badge -->
              <div class="inline-flex items-center gap-space-xs px-3 py-1.5 rounded-full bg-surface-container-high border border-primary/25 shadow-[0_0_20px_rgba(245,158,11,0.2)] w-fit">
                <span class="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                <span class="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">
                  A Plataforma Definitiva para Fotógrafos Profissionais
                </span>
              </div>

              <!-- Hero Headline -->
              <h1 class="font-display-lg text-display-lg text-on-surface tracking-tight leading-[1.08]">
                Entregue galerias deslumbrantes e <br/>
                <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  multiplique suas vendas
                </span> com IA.
              </h1>

              <!-- Commercial Subheadline -->
              <p class="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
                Acelere a aprovação dos seus clientes em até 4x com visualização ultra-rápida, prova de fotos sem perdas de nitidez e reconhecimento facial inteligente para ensaios, eventos e casamentos.
              </p>

              <!-- Double High-Conversion CTAs -->
              <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-sm pt-2">
                <a class="inline-flex items-center justify-center gap-space-xs px-6 py-3.5 rounded bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-stone-950 font-headline-sm text-label-md font-bold shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:brightness-110 hover:shadow-[0_0_35px_rgba(251,191,36,0.6)] transition-all active:scale-[0.98]" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Gostaria%20de%20assinar%20o%20King%20Selection%20para%20fot%C3%B3grafos." target="_blank">
                  <span>Contratar Plano Agora</span>
                  <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                </a>
                <a class="inline-flex items-center justify-center gap-space-xs px-6 py-3.5 rounded bg-surface-container-high border border-outline-variant text-on-surface hover:bg-surface-container-highest hover:text-primary hover:border-primary/40 font-label-md text-label-md transition-all" href="#painel-fotografo">
                  <span class="material-symbols-outlined text-primary text-[18px]">lock_open</span>
                  <span>Acessar Painel</span>
                </a>
              </div>

              <!-- Direct WhatsApp Consultation link -->
              <div class="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
                <span class="material-symbols-outlined text-secondary text-[18px]">support_agent</span>
                <span>Dúvidas técnicas ou migração?</span>
                <a class="text-secondary font-semibold hover:underline" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Gostaria%20de%20conversar%20com%20um%20especialista%20do%20King%20Selection." target="_blank">Falar no WhatsApp oficial (11) 98878-9417</a>
              </div>

              <!-- Badges & Seals Matrix -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                <div class="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant/40 flex flex-col gap-1.5">
                  <span class="material-symbols-outlined text-primary text-[22px]">bolt</span>
                  <span class="font-label-md text-label-md text-on-surface font-bold">0.2s Resposta</span>
                  <span class="font-body-sm text-body-sm text-on-surface-variant">Sem compressão borrada</span>
                </div>
                <div class="p-3.5 rounded-lg bg-surface-container-low border border-emerald-500/25 flex flex-col gap-1.5">
                  <span class="material-symbols-outlined text-secondary text-[22px]">face</span>
                  <span class="font-label-md text-label-md text-on-surface font-bold">IA Facial</span>
                  <span class="font-body-sm text-body-sm text-on-surface-variant">Selfie acha na hora</span>
                </div>
                <div class="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant/40 flex flex-col gap-1.5">
                  <span class="material-symbols-outlined text-secondary text-[22px]">verified_user</span>
                  <span class="font-label-md text-label-md text-on-surface font-bold">Anti-Print</span>
                  <span class="font-body-sm text-body-sm text-on-surface-variant">Marca d'água dinâmica</span>
                </div>
                <div class="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant/40 flex flex-col gap-1.5">
                  <span class="material-symbols-outlined text-primary text-[22px]">devices</span>
                  <span class="font-label-md text-label-md text-on-surface font-bold">100% Mobile</span>
                  <span class="font-body-sm text-body-sm text-on-surface-variant">Experiência app nativa</span>
                </div>
              </div>
            </div>

            <!-- Right Column: Interactive Login Glass Card (Totalmente Funcional) -->
            <div class="lg:col-span-5 w-full z-10" id="painel-fotografo">
              <div class="relative rounded-2xl bg-surface-container border border-primary/20 backdrop-blur-xl p-8 lg:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] shadow-black/80">
                
                <div class="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-surface-container-high border border-primary/30 text-primary font-label-sm text-label-sm uppercase flex items-center gap-1.5 font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <span class="w-1.5 h-1.5 rounded-full bg-secondary animate-ping"></span>
                  Acesso Seguro
                </div>

                <!-- Login Header -->
                <div class="flex flex-col items-center text-center pb-6">
                  <div class="w-12 h-12 rounded-xl bg-amber-500/15 border border-primary/30 flex items-center justify-center mb-3 text-primary shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                    <span class="material-symbols-outlined text-[26px]">photo_camera</span>
                  </div>
                  <h2 class="font-headline-xl text-headline-xl font-bold text-on-surface">Painel do Fotógrafo</h2>
                  <p class="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Acesse suas galerias, clientes e seleções em andamento
                  </p>
                </div>

                <!-- Auth Form Conectado ao Backend -->
                <form id="ks-login-form" class="space-y-4" onsubmit="handleKsLogin(event)">
                  <div class="space-y-1.5">
                    <label class="block font-label-md text-label-md text-on-surface-variant" for="ks-email">E-mail ou Usuário</label>
                    <div class="relative">
                      <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">mail</span>
                      <input 
                        id="ks-email" 
                        name="email"
                        class="w-full h-12 pl-11 pr-4 rounded-lg bg-surface-container-lowest border border-outline-variant text-on-surface placeholder:text-on-surface-variant/60 font-body-md text-body-md focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/40 transition-colors" 
                        placeholder="seuemail@exemplo.com" 
                        type="text" 
                        required 
                        autocomplete="username"
                      />
                    </div>
                  </div>

                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                      <label class="font-label-md text-label-md text-on-surface-variant" for="ks-password">Senha de Acesso</label>
                      <a class="font-label-sm text-label-sm text-primary hover:underline font-bold" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Esqueci%20minha%20senha%20de%20acesso%20do%20King%20Selection." target="_blank">Esqueci</a>
                    </div>
                    <div class="relative">
                      <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">key</span>
                      <input 
                        id="ks-password" 
                        name="password"
                        class="w-full h-12 pl-11 pr-12 rounded-lg bg-surface-container-lowest border border-outline-variant text-on-surface placeholder:text-on-surface-variant/60 font-body-md text-body-md focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/40 transition-colors" 
                        placeholder="••••••••" 
                        type="password" 
                        required 
                        autocomplete="current-password"
                      />
                      <!-- Olhinho de Visualização de Senha com SVG Nativo -->
                      <button 
                        type="button" 
                        id="ks-toggle-pwd-btn" 
                        onclick="togglePasswordVisibility()" 
                        class="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:text-amber-300 rounded transition-transform active:scale-90 flex items-center justify-center cursor-pointer" 
                        aria-label="Mostrar/Ocultar Senha" 
                        title="Mostrar senha"
                      >
                        <svg id="ks-pwd-eye-open" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        <svg id="ks-pwd-eye-closed" style="display:none;" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    id="ks-btn-submit" 
                    class="w-full h-12 rounded bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-stone-950 font-headline-sm text-label-md font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:brightness-110 hover:shadow-[0_0_28px_rgba(245,158,11,0.5)] transition-all active:scale-[0.98] mt-2 cursor-pointer"
                  >
                    <span>Acessar Meus Projetos</span>
                    <span class="material-symbols-outlined text-[20px]">login</span>
                  </button>
                </form>

                <!-- Links Auxiliares -->
                <div class="pt-5 mt-5 bg-surface-container-high/60 border border-outline-variant/40 rounded-lg p-4 space-y-2 text-center font-body-sm text-body-sm">
                  <p class="text-on-surface-variant">
                    Ainda não é fotógrafo assinante? 
                    <a class="text-primary font-bold hover:underline" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Gostaria%20de%20assinar%20o%20King%20Selection%20para%20fot%C3%B3grafos." target="_blank">Contratar Plano</a>
                  </p>
                  <p class="text-on-surface-variant">
                    Problemas no acesso? 
                    <a class="text-secondary font-semibold hover:underline flex items-center justify-center gap-1" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20para%20acessar%20meu%20painel%20do%20King%20Selection." target="_blank">
                      <span class="material-symbols-outlined text-[16px]">chat</span> Falar com Suporte WhatsApp
                    </a>
                  </p>
                </div>

              </div>
            </div>

          </div>
        </section>

        <!-- LIVE PHOTO EXPERIENCE PREVIEW -->
        <section class="max-w-[1440px] mx-auto px-margin py-space-lg" id="como-funciona">
          <div class="rounded-2xl bg-surface-container border border-primary/20 p-6 lg:p-8 shadow-xl">
            <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <span class="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">Experiência do Cliente Final</span>
                <h3 class="font-headline-xl text-headline-xl text-on-surface font-bold mt-1">Como seus clientes navegam e selecionam com paixão</h3>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-3 py-1 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-label-sm text-label-sm flex items-center gap-1.5 font-bold">
                  <span class="material-symbols-outlined text-[16px]">favorite</span> 48 Fotos Selecionadas
                </span>
                <span class="px-3 py-1 rounded bg-surface-container-high border border-outline-variant/40 text-on-surface-variant font-label-sm text-label-sm">
                  Ensaio Gestante • Luiza & Marcos
                </span>
              </div>
            </div>

            <!-- Photo Grid Simulation -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="relative rounded-xl overflow-hidden group aspect-[4/5] bg-surface-container-high border border-outline-variant/40 hover:border-primary/40 transition-all">
                <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Ensaio Gestante de Luxo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiEBPO51fMkbe7hcS5Td3tjY1mhSx5o_Ph2LNIcOaVfZBhJjGSTj-6k861Fh2F-C9vrj4ijlSx8_s10mr62NQvDy_p9gi3x6Udsl-pfoRaEJlBO7SKAKUwYtX_m4pJi6B4ENobPId5D_foIWwzBki5kgwTAgZ3OakNTOkVVZ9bsJk0kdue17DzjWHvvJ5W6y1mpapXjpPT7Ie6NFGGDpNbSzbDHvLYXtraD6Un9i4P"/>
                <div class="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/80 via-transparent to-transparent opacity-90"></div>
                <div class="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-container-lowest/80 border border-primary/30 backdrop-blur-md flex items-center justify-center text-primary shadow-lg">
                  <span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' 1;">favorite</span>
                </div>
                <div class="absolute bottom-3 left-3 text-on-surface font-label-sm text-label-sm font-semibold">
                  #IMG_0412.JPG • 7.2 MB
                </div>
              </div>

              <div class="relative rounded-xl overflow-hidden group aspect-[4/5] bg-surface-container-high border border-outline-variant/40 hover:border-primary/40 transition-all">
                <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Casamento ao Pôr do Sol" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDYwi6Ipeoti-R8315Zzao-ELA0oiIBkDjdxZ9u7RI1L28SxLS71Mo_6SmO4fyfp4651ooFxg6boyLZ-WELxaOc8ThUyTFZzvtRbQ43dtYinSUOyzwMbNqoSH5VmHBfGYekdyxq6nfEgNl3rd0LBSjhJQuzVP9nO7lM66WeEQsdID7isUseMW0CU2flkRXTDwCwF0Ypl9TbbHWELeS6nM9R5mCxG9oJbnbpqhLcvJT4"/>
                <div class="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/80 via-transparent to-transparent opacity-90"></div>
                <div class="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-container-lowest/80 border border-outline-variant backdrop-blur-md flex items-center justify-center text-on-surface-variant hover:text-primary shadow-lg transition-colors">
                  <span class="material-symbols-outlined text-[18px]">favorite</span>
                </div>
                <div class="absolute bottom-3 left-3 text-on-surface font-label-sm text-label-sm font-semibold">
                  #IMG_0588.JPG • 6.9 MB
                </div>
              </div>

              <div class="relative rounded-xl overflow-hidden group aspect-[4/5] bg-surface-container-high border border-outline-variant/40 hover:border-primary/40 transition-all">
                <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Retrato Editorial" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCm14j7ZR3v3mhGWV8nE9kuRnhXyROUACL7GXHai6OvG3Qym0yPJOQh622pBcJLBPE4T3S5AlyijgPyVqqDYMiw6akQqa53_4gZy-nffckD60u0iCA9idwkziY1eI-_rzYRiyrlLlAcH2MKETLplF7TXGknepoMxgrdhu05nlNuQisDzusNV751nwiG2ZT7e0GYHkydJyIMap2o_q_hy5_oVs1J4b1PAWtp6LdW32RE"/>
                <div class="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/80 via-transparent to-transparent opacity-90"></div>
                <div class="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-container-lowest/80 border border-primary/30 backdrop-blur-md flex items-center justify-center text-primary shadow-lg">
                  <span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' 1;">favorite</span>
                </div>
                <div class="absolute bottom-3 left-3 flex items-center justify-between w-[calc(100%-1.5rem)] text-on-surface font-label-sm text-label-sm font-semibold">
                  <span>#IMG_0691.JPG</span>
                  <span class="px-2 py-0.5 rounded bg-primary text-stone-950 text-[10px] font-extrabold uppercase">Extra</span>
                </div>
              </div>

              <div class="relative rounded-xl overflow-hidden group aspect-[4/5] bg-surface-container-high border border-outline-variant/40 hover:border-primary/40 transition-all">
                <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Festa e Celebração" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-4GU6eszXiaIPcJyYuUmE42sG9LXJ2RrMwUvinq3xXM13knZiNWdc0OXqwAgTjAREtcNioZnr7y_bFraMSkutkXX5YrevVeTfEoIA1B0VtXOuClkHjZjpELloPpyLk5iCubEt3Pl9T_MMjZUOxqcsmISrhURcXhiMZ_to6xDn27_17bVL8kLNtbHCueLAbeh2qjpnH0QMvG886qgCGQlQ8s4YYdkiYgn4yKOPHXti"/>
                <div class="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/80 via-transparent to-transparent opacity-90"></div>
                <div class="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-container-lowest/80 border border-primary/30 backdrop-blur-md flex items-center justify-center text-primary shadow-lg">
                  <span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' 1;">favorite</span>
                </div>
                <div class="absolute bottom-3 left-3 text-on-surface font-label-sm text-label-sm font-semibold">
                  #IMG_0834.JPG • 7.4 MB
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 4 CORE ADVANTAGES SECTION -->
        <section class="max-w-[1440px] mx-auto px-margin py-space-xl" id="diferenciais">
          <div class="text-center max-w-3xl mx-auto mb-10">
            <span class="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">Vantagens Comerciais Reais</span>
            <h2 class="font-headline-xl text-headline-xl text-on-surface font-bold mt-2">Por que fotógrafos de sucesso escolhem o King Selection</h2>
            <p class="font-body-md text-body-md text-on-surface-variant mt-2">
              Elimine o retrabalho via Google Drive ou WeTransfer. Uma experiência luxuosa pensada para você fechar contratos maiores.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
            <!-- Benefit 1 -->
            <div class="p-6 rounded-2xl bg-surface-container border border-primary/20 hover:border-primary/40 transition-all flex flex-col justify-between shadow-lg">
              <div>
                <div class="w-12 h-12 rounded-xl bg-amber-500/15 border border-primary/30 text-primary flex items-center justify-center mb-5 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <span class="material-symbols-outlined text-[26px]">speed</span>
                </div>
                <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold mb-2">Velocidade Relâmpago</h3>
                <p class="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Visualizador ultra otimizado sem travamentos, mesmo em galerias com mais de 2.000 fotos em alta definição com caching inteligente.
                </p>
              </div>
              <div class="pt-5 mt-5 border-t border-surface-container-highest/60 font-label-sm text-label-sm text-primary flex items-center gap-1 font-bold">
                Sem lentidão no celular <span class="material-symbols-outlined text-[16px]">chevron_right</span>
              </div>
            </div>

            <!-- Benefit 2 -->
            <div class="p-6 rounded-2xl bg-surface-container border border-emerald-500/25 hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-lg">
              <div>
                <div class="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-secondary flex items-center justify-center mb-5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <span class="material-symbols-outlined text-[26px]">face</span>
                </div>
                <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold mb-2">Reconhecimento Facial IA</h3>
                <p class="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  O cliente ou convidados de eventos tiram uma selfie e o sistema filtra instantaneamente apenas as fotos em que eles aparecem.
                </p>
              </div>
              <div class="pt-5 mt-5 border-t border-surface-container-highest/60 font-label-sm text-label-sm text-secondary flex items-center gap-1 font-bold">
                Perfeito para casamentos <span class="material-symbols-outlined text-[16px]">chevron_right</span>
              </div>
            </div>

            <!-- Benefit 3 -->
            <div class="p-6 rounded-2xl bg-surface-container border border-primary/20 hover:border-primary/40 transition-all flex flex-col justify-between shadow-lg">
              <div>
                <div class="w-12 h-12 rounded-xl bg-secondary-container/30 border border-secondary/30 text-secondary flex items-center justify-center mb-5">
                  <span class="material-symbols-outlined text-[26px]">touch_app</span>
                </div>
                <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold mb-2">Seleção de 1 Clique</h3>
                <p class="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Seus clientes marcam corações, adicionam notas de retoque por foto e finalizam a lista com um toque direto pelo WhatsApp.
                </p>
              </div>
              <div class="pt-5 mt-5 border-t border-surface-container-highest/60 font-label-sm text-label-sm text-secondary flex items-center gap-1 font-bold">
                Zero dúvidas de clientes <span class="material-symbols-outlined text-[16px]">chevron_right</span>
              </div>
            </div>

            <!-- Benefit 4 -->
            <div class="p-6 rounded-2xl bg-surface-container border border-primary/20 hover:border-primary/40 transition-all flex flex-col justify-between shadow-lg">
              <div>
                <div class="w-12 h-12 rounded-xl bg-amber-500/15 border border-primary/30 text-primary flex items-center justify-center mb-5 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <span class="material-symbols-outlined text-[26px]">payments</span>
                </div>
                <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold mb-2">Up-selling Automático</h3>
                <p class="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Monetize fotos extras além do pacote contratado. Defina o valor por foto excedente e receba antes do download final.
                </p>
              </div>
              <div class="pt-5 mt-5 border-t border-surface-container-highest/60 font-label-sm text-label-sm text-primary flex items-center gap-1 font-bold">
                Aumente seu ticket médio <span class="material-symbols-outlined text-[16px]">chevron_right</span>
              </div>
            </div>
          </div>
        </section>

        <!-- INTERACTIVE PHOTO CAPACITY SIMULATOR & PRICING -->
        <section class="max-w-[1440px] mx-auto px-margin py-space-xl" id="simulador">
          <div class="rounded-3xl bg-surface-container border border-primary/20 p-8 lg:p-14 shadow-2xl relative overflow-hidden">
            
            <div class="text-center max-w-3xl mx-auto mb-10">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high border border-primary/25 text-primary font-label-sm text-label-sm uppercase mb-3 font-bold">
                <span class="material-symbols-outlined text-[16px]">calculate</span>
                Calculadora de Rendimento
              </div>
              <h2 class="font-headline-xl text-headline-xl text-on-surface font-bold">Simulador de Capacidade de Fotos</h2>
              <p class="font-body-md text-body-md text-on-surface-variant mt-2">
                Descubra exatamente quantas fotos e ensaios cabem em cada plano de acordo com o tamanho médio dos seus arquivos.
              </p>
            </div>

            <!-- Simulator Controls Box -->
            <div class="max-w-4xl mx-auto rounded-2xl bg-surface-container-low border border-outline-variant/40 p-6 lg:p-8 mb-12">
              <p class="text-center font-label-md text-label-md text-on-surface mb-5 font-bold">
                Qual o peso médio dos seus arquivos exportados?
              </p>

              <!-- Preset Chips -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8" id="preset-buttons">
                <button class="preset-btn py-3 px-4 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high font-label-md text-label-md transition-all flex flex-col items-center justify-center text-center cursor-pointer" id="btn-3" onclick="setPreset(3)" type="button">
                  <span class="font-bold text-on-surface text-[14px]">3 MB</span>
                  <span class="text-[11px] text-on-surface-variant">Web Rápida</span>
                </button>
                <button class="preset-btn py-3 px-4 rounded-xl bg-surface-container-high border border-primary text-primary shadow-[0_0_15px_rgba(245,158,11,0.25)] font-label-md text-label-md transition-all flex flex-col items-center justify-center text-center cursor-pointer" id="btn-7" onclick="setPreset(7)" type="button">
                  <div class="flex items-center gap-1 font-bold text-[14px]">
                    <span>7 MB</span>
                    <span class="material-symbols-outlined text-[14px] text-primary">star</span>
                  </div>
                  <span class="text-[11px] text-primary/90 font-semibold">Recomendado</span>
                </button>
                <button class="preset-btn py-3 px-4 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high font-label-md text-label-md transition-all flex flex-col items-center justify-center text-center cursor-pointer" id="btn-10" onclick="setPreset(10)" type="button">
                  <span class="font-bold text-on-surface text-[14px]">10 MB</span>
                  <span class="text-[11px] text-on-surface-variant">Alta Definição</span>
                </button>
                <button class="preset-btn py-3 px-4 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high font-label-md text-label-md transition-all flex flex-col items-center justify-center text-center cursor-pointer" id="btn-15" onclick="setPreset(15)" type="button">
                  <span class="font-bold text-on-surface text-[14px]">15 MB</span>
                  <span class="text-[11px] text-on-surface-variant">Original / Full</span>
                </button>
              </div>

              <!-- Range Slider & Pill -->
              <div class="flex flex-col sm:flex-row items-center gap-6">
                <div class="relative w-full flex-1">
                  <input class="w-full h-2 rounded-lg bg-surface-container appearance-none cursor-pointer accent-primary" id="mb-slider" max="25" min="1" oninput="updateCalculations(this.value)" step="0.5" type="range" value="7"/>
                  <div class="flex justify-between text-on-surface-variant font-body-sm text-[11px] mt-2 px-1">
                    <span>1 MB</span>
                    <span>7 MB (Padrão Pro)</span>
                    <span>15 MB</span>
                    <span>25 MB</span>
                  </div>
                </div>
                <div class="w-32 py-2.5 px-4 rounded-xl bg-surface-container-lowest border border-primary/30 flex items-center justify-center shrink-0">
                  <span class="font-headline-sm text-headline-sm text-primary font-bold" id="display-mb">7.0 MB</span>
                </div>
              </div>
            </div>

            <!-- 3-TIER PRICING CARDS ROW -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-stretch pt-4" id="planos">
              
              <!-- Card 1: Starter (20 GB) -->
              <div class="rounded-2xl bg-surface-container-low border border-outline-variant/40 p-8 flex flex-col justify-between transition-transform hover:-translate-y-1 shadow-lg">
                <div>
                  <div class="flex justify-between items-center mb-4">
                    <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">★ Plano Starter</span>
                    <span class="px-2.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">Para Começar</span>
                  </div>
                  <div class="flex items-baseline gap-1 mb-2">
                    <span class="font-display-lg text-display-lg font-extrabold text-on-surface">20 GB</span>
                  </div>
                  <div class="flex items-baseline gap-1 text-on-surface-variant font-body-md text-body-md mb-6">
                    <span class="font-headline-md text-headline-md text-on-surface font-bold">R$ 39,90</span>
                    <span>/ mês</span>
                  </div>
                  <!-- Computed Specs -->
                  <div class="space-y-3.5 py-6 bg-surface-container/60 border border-outline-variant/30 rounded-xl px-5 mb-8">
                    <div class="flex items-center justify-between text-body-sm">
                      <span class="text-on-surface-variant flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[16px]">photo_library</span> Total de Fotos:
                      </span>
                      <span class="font-bold text-on-surface" id="starter-photos">~2.900 fotos</span>
                    </div>
                    <div class="flex items-center justify-between text-body-sm">
                      <span class="text-on-surface-variant flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[16px]">groups</span> Ensaios Médios:
                      </span>
                      <span class="font-bold text-on-surface" id="starter-shoots">~10 ensaios (300 fotos)</span>
                    </div>
                    <div class="flex items-center justify-between text-body-sm">
                      <span class="text-on-surface-variant flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[16px]">compress</span> Redutor Automático:
                      </span>
                      <span class="font-semibold text-secondary">Incluso</span>
                    </div>
                    <div class="flex items-center justify-between text-body-sm">
                      <span class="text-on-surface-variant flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[16px]">cloud_done</span> Galerias Ativas:
                      </span>
                      <span class="font-semibold text-on-surface">Ilimitadas</span>
                    </div>
                  </div>
                </div>
                <a class="w-full h-12 rounded bg-surface-container-high border border-outline-variant/50 hover:bg-surface-container-highest hover:text-primary hover:border-primary/40 text-on-surface font-label-md text-label-md font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Quero%20assinar%20o%20Plano%20Starter%20de%2020%20GB%20do%20King%20Selection." target="_blank">
                  <span>Escolher 20 GB</span>
                  <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                </a>
              </div>

              <!-- Card 2: Pro (30 GB) - HIGHLIGHTED "MAIS POPULAR" -->
              <div class="relative rounded-2xl bg-surface-container border-2 border-primary p-8 flex flex-col justify-between shadow-[0_0_35px_rgba(245,158,11,0.25)] lg:-translate-y-4">
                <div class="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 rounded-t-2xl"></div>
                <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-label-sm text-label-sm font-extrabold uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[14px]">star</span>
                  Mais Popular • Melhor Custo
                </div>
                <div>
                  <div class="flex justify-between items-center mb-4 pt-1">
                    <span class="font-label-md text-label-md uppercase tracking-wider text-primary font-bold">Plano Pro</span>
                    <span class="px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300 font-label-sm text-label-sm font-bold">Ideal p/ Ensaios</span>
                  </div>
                  <div class="flex items-baseline gap-1 mb-2">
                    <span class="font-display-lg text-display-lg font-extrabold text-primary">30 GB</span>
                  </div>
                  <div class="flex items-baseline gap-1 text-on-surface-variant font-body-md text-body-md mb-6">
                    <span class="font-headline-md text-headline-md text-on-surface font-bold">R$ 59,90</span>
                    <span>/ mês</span>
                  </div>
                  <!-- Computed Specs -->
                  <div class="space-y-3.5 py-6 bg-surface-container-high/70 border border-primary/20 rounded-xl px-5 mb-8">
                    <div class="flex items-center justify-between text-body-sm">
                      <span class="text-on-surface-variant flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[16px]">photo_library</span> Total de Fotos:
                      </span>
                      <span class="font-bold text-primary text-[15px]" id="pro-photos">~4.350 fotos</span>
                    </div>
                    <div class="flex items-center justify-between text-body-sm">
                      <span class="text-on-surface-variant flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[16px]">groups</span> Ensaios Médios:
                      </span>
                      <span class="font-bold text-on-surface" id="pro-shoots">~15 ensaios (300 fotos)</span>
                    </div>
                    <div class="flex items-center justify-between text-body-sm">
                      <span class="text-on-surface-variant flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[16px]">face</span> Reconhecimento Facial:
                      </span>
                      <span class="font-bold text-secondary flex items-center gap-1">
                        <span class="material-symbols-outlined text-[16px]">check_circle</span> Ativado
                      </span>
                    </div>
                    <div class="flex items-center justify-between text-body-sm">
                      <span class="text-on-surface-variant flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[16px]">branding_watermark</span> Marca d'Água:
                      </span>
                      <span class="font-semibold text-secondary">Personalizada</span>
                    </div>
                  </div>
                </div>
                <a class="w-full h-12 rounded bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-stone-950 font-headline-sm text-label-md font-extrabold flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.5)] hover:brightness-110 hover:shadow-[0_0_35px_rgba(251,191,36,0.7)] transition-all active:scale-[0.98] cursor-pointer" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Quero%20assinar%20o%20Plano%20Pro%20de%2030%20GB%20do%20King%20Selection." target="_blank">
                  <span>Escolher 30 GB</span>
                  <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                </a>
              </div>

              <!-- Card 3: Studio King (60 GB) -->
              <div class="rounded-2xl bg-surface-container-low border border-outline-variant/40 p-8 flex flex-col justify-between transition-transform hover:-translate-y-1 shadow-lg">
                <div>
                  <div class="flex justify-between items-center mb-4">
                    <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Plano Studio King</span>
                    <span class="px-2.5 py-0.5 rounded bg-amber-500/10 border border-primary/30 text-primary font-label-sm text-label-sm font-semibold">High Volume</span>
                  </div>
                  <div class="flex items-baseline gap-1 mb-2">
                    <span class="font-display-lg text-display-lg font-extrabold text-on-surface">60 GB</span>
                  </div>
                  <div class="flex items-baseline gap-1 text-on-surface-variant font-body-md text-body-md mb-6">
                    <span class="font-headline-md text-headline-md text-on-surface font-bold">R$ 99,90</span>
                    <span>/ mês</span>
                  </div>
                  <!-- Computed Specs -->
                  <div class="space-y-3.5 py-6 bg-surface-container/60 border border-outline-variant/30 rounded-xl px-5 mb-8">
                    <div class="flex items-center justify-between text-body-sm">
                      <span class="text-on-surface-variant flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[16px]">photo_library</span> Total de Fotos:
                      </span>
                      <span class="font-bold text-on-surface" id="king-photos">~8.700 fotos</span>
                    </div>
                    <div class="flex items-center justify-between text-body-sm">
                      <span class="text-on-surface-variant flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[16px]">celebration</span> Eventos & Casamentos:
                      </span>
                      <span class="font-bold text-on-surface" id="king-shoots">~30 ensaios / 8 casamentos</span>
                    </div>
                    <div class="flex items-center justify-between text-body-sm">
                      <span class="text-on-surface-variant flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[16px]">bolt</span> Prioridade Máxima:
                      </span>
                      <span class="font-bold text-primary">Ilimitada</span>
                    </div>
                    <div class="flex items-center justify-between text-body-sm">
                      <span class="text-on-surface-variant flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[16px]">diamond</span> Suporte VIP:
                      </span>
                      <span class="font-semibold text-secondary">WhatsApp Direto</span>
                    </div>
                  </div>
                </div>
                <a class="w-full h-12 rounded bg-surface-container-high border border-outline-variant/50 hover:bg-surface-container-highest hover:text-primary hover:border-primary/40 text-on-surface font-label-md text-label-md font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Quero%20assinar%20o%20Plano%20Studio%20King%20de%2060%20GB%20do%20King%20Selection." target="_blank">
                  <span>Escolher 60 GB</span>
                  <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                </a>
              </div>

            </div>
          </div>
        </section>

        <!-- FAQ & COMMERCIAL OBJECTION HANDLING -->
        <section class="max-w-5xl mx-auto px-margin py-space-xl">
          <div class="text-center mb-10">
            <span class="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">Transparência Total</span>
            <h2 class="font-headline-xl text-headline-xl text-on-surface font-bold mt-2">Dúvidas Frequentes de Fotógrafos</h2>
          </div>

          <div class="space-y-4">
            <div class="p-6 rounded-xl bg-surface-container border border-outline-variant/40 hover:border-primary/30 transition-colors">
              <h4 class="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[20px]">help_outline</span>
                Tem taxa de adesão ou fidelidade obrigatória?
              </h4>
              <p class="font-body-md text-body-md text-on-surface-variant mt-2 pl-7">
                Não. Os planos são mensais recorrentes sem taxas de setup ocultas. Você pode cancelar ou fazer upgrade a qualquer momento diretamente pelo painel ou via WhatsApp de atendimento.
              </p>
            </div>

            <div class="p-6 rounded-xl bg-surface-container border border-outline-variant/40 hover:border-primary/30 transition-colors">
              <h4 class="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[20px]">help_outline</span>
                Como funciona o Reconhecimento Facial nos eventos?
              </h4>
              <p class="font-body-md text-body-md text-on-surface-variant mt-2 pl-7">
                Nossa Inteligência Artificial processa cada galeria rapidamente. Ao abrir o link, seu cliente ou convidado faz o upload de uma selfie rápida e a plataforma mostra unicamente as fotos em que o rosto dele foi detectado.
              </p>
            </div>

            <div class="p-6 rounded-xl bg-surface-container border border-outline-variant/40 hover:border-primary/30 transition-colors">
              <h4 class="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[20px]">help_outline</span>
                O que acontece quando eu encher o armazenamento do plano?
              </h4>
              <p class="font-body-md text-body-md text-on-surface-variant mt-2 pl-7">
                Você pode arquivar projetos finalizados e entregues para liberar espaço imediato ou fazer upgrade para um plano superior (como 60 GB ou customizado para produtoras) pagando apenas a diferença proporcional.
              </p>
            </div>

            <div class="p-6 rounded-xl bg-surface-container border border-outline-variant/40 hover:border-primary/30 transition-colors">
              <h4 class="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[20px]">help_outline</span>
                O cliente precisa baixar algum aplicativo no celular?
              </h4>
              <p class="font-body-md text-body-md text-on-surface-variant mt-2 pl-7">
                Nenhum aplicativo! O King Selection funciona 100% via navegador com tecnologia PWA, abrindo instantaneamente em qualquer smartphone (iOS e Android), tablet ou computador.
              </p>
            </div>
          </div>
        </section>

        <!-- FINAL CLOSING CTA BANNER -->
        <section class="max-w-[1440px] mx-auto px-margin py-space-xl">
          <div class="relative rounded-2xl bg-gradient-to-r from-surface-container-low via-surface-container to-surface-container-low border border-primary/25 p-space-lg lg:p-space-xl overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-space-lg">
            <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none"></div>
            
            <div class="flex flex-col gap-space-xs max-w-2xl z-10">
              <div class="inline-flex items-center gap-space-xs px-3 py-1 rounded bg-surface-container border border-emerald-500/20 text-secondary font-label-sm text-label-sm w-fit mb-2">
                <span class="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                <span>Ativação Imediata • Garantia de Qualidade</span>
              </div>
              <h2 class="font-headline-xl text-headline-xl text-on-surface font-extrabold tracking-tight">
                Pronto para profissionalizar a entrega das suas fotos?
              </h2>
              <p class="font-body-md text-body-md text-on-surface-variant">
                Comece hoje mesmo com suporte humanizado e migração assistida das suas galerias. Atendimento ágil pelo WhatsApp oficial da Conecta King.
              </p>
              <div class="flex items-center gap-6 mt-4 text-on-surface-variant font-body-sm text-body-sm">
                <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-secondary text-[16px]">check</span> Ativação Imediata</span>
                <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-secondary text-[16px]">check</span> Suporte em Português</span>
                <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-secondary text-[16px]">check</span> Sem Fidelidade</span>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row items-center gap-space-sm z-10 shrink-0 w-full sm:w-auto">
              <a class="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-6 py-3.5 rounded bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-headline-sm text-label-md font-bold shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98]" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Gostaria%20de%20falar%20com%20um%20especialista%20do%20King%20Selection%20agora." target="_blank">
                <span class="material-symbols-outlined text-[20px]">chat</span>
                <span>Falar no WhatsApp: (11) 98878-9417</span>
              </a>
              <a class="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-6 py-3.5 rounded bg-surface-container-high border border-outline-variant/60 text-on-surface font-label-md text-label-md font-bold hover:bg-surface-container-highest hover:text-primary hover:border-primary/40 transition-all" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Quero%20assinar%20o%20Plano%20Pro%20de%2030%20GB%20do%20King%20Selection." target="_blank">
                <span>Assinar Plano Pro (R$ 59,90)</span>
                <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  </main>

  <!-- LUXURY FOOTER -->
  <footer class="w-full bg-surface-container-lowest border-t border-primary/10">
    <div class="max-w-[1440px] mx-auto px-margin py-space-xl">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-space-xl">
        
        <div class="flex flex-col gap-space-sm">
          <div class="flex items-center gap-space-sm">
            <img alt="King Selection Logo" class="h-7 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(245,158,11,0.25)]" src="https://i.ibb.co/60sW9k75/logo.png"/>
            <span class="font-headline-sm text-headline-sm font-bold text-on-surface">King Selection</span>
          </div>
          <p class="font-body-sm text-body-sm text-on-surface-variant mt-2">Plataforma de alta performance para seleção e entrega inteligente de fotos com Reconhecimento Facial.</p>
          <div class="inline-flex items-center gap-space-xs px-space-sm py-1 rounded bg-surface-container border border-emerald-500/20 text-secondary font-label-sm text-label-sm w-fit">
            <span class="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            <span>Reconhecimento Facial IA • 100% Online</span>
          </div>
        </div>

        <div class="flex flex-col gap-space-sm">
          <span class="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">Navegação Rápida</span>
          <nav class="flex flex-col gap-space-xs">
            <a class="transition-colors text-primary font-bold" href="#">Início do Sistema</a>
            <a class="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors" href="#como-funciona">Como Funciona</a>
            <a class="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors" href="#simulador">Calculadora de Capacidade</a>
            <a class="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors" href="#planos">Planos & Preços 2026</a>
          </nav>
        </div>

        <div class="flex flex-col gap-space-sm">
          <span class="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">Segurança e Tecnologia</span>
          <div class="flex flex-col gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
            <div class="flex items-center gap-space-xs"><span class="material-symbols-outlined text-secondary text-[16px]">verified_user</span><span>Proteção Anti-Print e Marca d'Água</span></div>
            <div class="flex items-center gap-space-xs"><span class="material-symbols-outlined text-secondary text-[16px]">gavel</span><span>Em conformidade com a LGPD</span></div>
            <div class="flex items-center gap-space-xs"><span class="material-symbols-outlined text-secondary text-[16px]">cloud_done</span><span>Backup em Nuvem Redundante</span></div>
            <div class="flex items-center gap-space-xs"><span class="material-symbols-outlined text-secondary text-[16px]">devices</span><span>Acesso Instantâneo PWA Mobile</span></div>
          </div>
        </div>

        <div class="flex flex-col gap-space-sm">
          <span class="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">Atendimento Oficial</span>
          <p class="font-body-sm text-body-sm text-on-surface-variant">Central executiva para fotógrafos, estúdios e produtoras de eventos.</p>
          <a class="inline-flex items-center justify-center gap-space-xs px-space-md py-space-sm rounded bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high hover:text-emerald-400 hover:border-emerald-500/30 transition-colors font-label-md text-label-md w-fit" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Gostaria%20de%20falar%20com%20o%20suporte%20do%20King%20Selection." target="_blank">
            <span class="material-symbols-outlined text-[16px]">support_agent</span>
            <span>Canal WhatsApp Dedicado</span>
          </a>
        </div>

      </div>

      <div class="pt-space-lg bg-surface-container-lowest border-t border-surface-container-highest/60 flex flex-col md:flex-row items-center justify-between gap-space-sm text-on-surface-variant font-body-sm text-body-sm">
        <p>© 2026 Conecta King Tecnologia. Todos os direitos reservados.</p>
        <div class="flex items-center gap-space-md">
          <span class="font-label-sm text-label-sm text-on-surface-variant">Sistemas de Seleção Fotográfica King Selection</span>
          <span class="w-1 h-1 rounded-full bg-outline-variant"></span>
          <span class="font-label-sm text-label-sm text-secondary font-semibold">Status Operacional: 100% Online</span>
        </div>
      </div>
    </div>
  </footer>

  <!-- INTERACTIVE LOGIC: SIMULATOR & AUTHENTICATION -->
  <script>
    // ── SIMULADOR DE CAPACIDADE ──
    function updateCalculations(fileSizeMB) {
      const mb = parseFloat(fileSizeMB);
      document.getElementById('display-mb').innerText = mb.toFixed(1) + ' MB';
      
      const slider = document.getElementById('mb-slider');
      if (slider && slider.value != mb) {
        slider.value = mb;
      }

      // 1 GB = 1024 MB
      const starterMB = 20 * 1024;
      const proMB = 30 * 1024;
      const kingMB = 60 * 1024;

      const starterPhotos = Math.floor(starterMB / mb);
      const proPhotos = Math.floor(proMB / mb);
      const kingPhotos = Math.floor(kingMB / mb);

      const starterShoots = Math.round(starterPhotos / 300);
      const proShoots = Math.round(proPhotos / 300);
      const kingShoots = Math.round(kingPhotos / 300);
      const kingWeddings = Math.max(1, Math.round(kingPhotos / 1000));

      const fmt = (num) => new Intl.NumberFormat('pt-BR').format(num);

      const sPhotosEl = document.getElementById('starter-photos');
      if (sPhotosEl) sPhotosEl.innerText = '~' + fmt(starterPhotos) + ' fotos';
      const sShootsEl = document.getElementById('starter-shoots');
      if (sShootsEl) sShootsEl.innerText = '~' + starterShoots + ' ensaios (300 fotos)';

      const pPhotosEl = document.getElementById('pro-photos');
      if (pPhotosEl) pPhotosEl.innerText = '~' + fmt(proPhotos) + ' fotos';
      const pShootsEl = document.getElementById('pro-shoots');
      if (pShootsEl) pShootsEl.innerText = '~' + proShoots + ' ensaios (300 fotos)';

      const kPhotosEl = document.getElementById('king-photos');
      if (kPhotosEl) kPhotosEl.innerText = '~' + fmt(kingPhotos) + ' fotos';
      const kShootsEl = document.getElementById('king-shoots');
      if (kShootsEl) kShootsEl.innerText = '~' + kingShoots + ' ensaios / ' + kingWeddings + ' casamentos';
    }

    function setPreset(mb) {
      const buttons = [3, 7, 10, 15];
      buttons.forEach(val => {
        const btn = document.getElementById('btn-' + val);
        if (btn) {
          if (val === mb) {
            btn.className = 'preset-btn py-3 px-4 rounded-xl bg-surface-container-high border border-primary text-primary shadow-[0_0_15px_rgba(245,158,11,0.25)] font-label-md text-label-md transition-all flex flex-col items-center justify-center text-center cursor-pointer';
          } else {
            btn.className = 'preset-btn py-3 px-4 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high font-label-md text-label-md transition-all flex flex-col items-center justify-center text-center cursor-pointer';
          }
        }
      });

      updateCalculations(mb);
    }

    // ── VISIBILIDADE DE SENHA ──
    function togglePasswordVisibility() {
      const pwd = document.getElementById('ks-password');
      const openEye = document.getElementById('ks-pwd-eye-open');
      const closedEye = document.getElementById('ks-pwd-eye-closed');
      const btn = document.getElementById('ks-toggle-pwd-btn');
      if (!pwd) return;
      const isPass = pwd.type === 'password';
      pwd.type = isPass ? 'text' : 'password';
      if (openEye && closedEye) {
        openEye.style.display = isPass ? 'none' : 'block';
        closedEye.style.display = isPass ? 'block' : 'none';
      }
      if (btn) {
        btn.setAttribute('title', isPass ? 'Ocultar senha' : 'Mostrar senha');
      }
    }

    // ── LIMPEZA PÓS-LOGOUT ──
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('logout') === '1' || urlParams.get('session_expired') === '1') {
        localStorage.clear();
        sessionStorage.clear();
      }
    } catch (_) {}

    // ── AUTENTICAÇÃO REAL (KING SELECTION & ADM) ──
    async function handleKsLogin(e) {
      e.preventDefault();
      const btn = document.getElementById('ks-btn-submit');
      const emailInput = document.getElementById('ks-email');
      const passInput = document.getElementById('ks-password');
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passInput ? passInput.value : '';

      if (!email || !password) {
        Swal.fire({
          icon: 'warning',
          title: 'Campos Obrigatórios',
          text: 'Por favor, informe seu e-mail e senha de acesso.',
          background: '#1c2027',
          color: '#dfe2ec',
          confirmButtonColor: '#f59e0b'
        });
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span><span>Autenticando...</span>';

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
          credentials: 'include',
          headers: headers,
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          const isAdmin = !!(data.user?.isAdmin || data.isAdmin);
          if (data.token) {
            try {
              localStorage.setItem('conectaKingToken', data.token);
              localStorage.setItem('token', data.token);
              localStorage.setItem('conectaKingSession', '1');
              if (data.user) {
                localStorage.setItem('conectaKingUser', JSON.stringify(data.user));
              }
            } catch (_) {}
          }
          Swal.fire({
            icon: 'success',
            title: isAdmin ? '👑 Bem-vindo, Administrador Master!' : 'Bem-vindo ao King Selection!',
            text: data.message || (isAdmin ? 'Acessando Painel Master ADM e Estúdio...' : 'Abrindo seus projetos...'),
            timer: 1500,
            showConfirmButton: false,
            background: '#1c2027',
            color: '#dfe2ec'
          }).then(() => {
            window.location.href = data.redirect || (isAdmin ? '/admin' : '/kingSelection');
          });
        } else if (data.code === 'MODULE_NOT_ENABLED') {
          Swal.fire({
            icon: 'warning',
            title: 'Módulo Não Habilitado',
            text: data.message || 'Seu plano ainda não possui o módulo King Selection ativado.',
            showCancelButton: true,
            confirmButtonText: 'Falar com Suporte no WhatsApp',
            cancelButtonText: 'Fechar',
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#31353d',
            background: '#1c2027',
            color: '#dfe2ec'
          }).then((result) => {
            if (result.isConfirmed) {
              window.open('https://wa.me/5511988789417?text=Ol%C3%A1!%20Meu%20e-mail%20%C3%A9%20' + encodeURIComponent(email) + '%20e%20gostaria%20de%20ativar%20meu%20plano%20do%20King%20Selection.', '_blank');
            }
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Acesso Não Autorizado',
            text: data.message || 'E-mail ou senha incorretos.',
            background: '#1c2027',
            color: '#dfe2ec',
            confirmButtonColor: '#f59e0b'
          });
        }
      } catch (err) {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: 'Erro de Conexão',
          text: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
          background: '#1c2027',
          color: '#dfe2ec',
          confirmButtonColor: '#f59e0b'
        });
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Acessar Meus Projetos</span><span class="material-symbols-outlined text-[20px]">login</span>';
      }
    }

    // Inicialização da calculadora com preset 7 MB
    document.addEventListener('DOMContentLoaded', () => {
      updateCalculations(7);
    });
  </script>

</body>
</html>
