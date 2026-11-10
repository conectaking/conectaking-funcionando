@php
    $hasTokenCookie = request()->hasCookie('conectaKingToken') || request()->hasCookie('token') || request()->hasCookie('conectaking-session');
@endphp
<!DOCTYPE html>
<html class="dark" lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta content="width=device-width, initial-scale=1.0" name="viewport">
  <meta content="web_standard" name="shell-type">
  <title>ConectaKing — Landing Page Oficial | Tecnologia NFC de Luxo & Identidade Digital</title>
  <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
  <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
  <link href="https://fonts.googleapis.com" rel="preconnect">
  <link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  
  <style>
    @layer base {
      html, body { margin: 0; padding: 0; }
      body { overscroll-behavior: none; }
      main > :first-child { margin-top: 0 !important; }
      main > :last-child { margin-bottom: 0 !important; }
    }
    ::-webkit-scrollbar { display: none; }
    .tilt-card {
      transform-style: preserve-3d;
      transition: transform 0.15s ease-out, box-shadow 0.3s ease;
    }
  </style>

  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  <script id="tailwind-config">
    tailwind.config = {
      darkMode: "class",
      theme: {
        extend: {
          colors: {
            "surface-container": "#1c2027",
            "surface-container-low": "#181c23",
            "surface-container-lowest": "#0a0e15",
            "surface-container-high": "#262a32",
            "surface-container-highest": "#31353d",
            "surface": "#0f131b",
            "on-surface": "#dfe2ec",
            "on-surface-variant": "#d8c3ad",
            "primary": "#ffc174",
            "primary-container": "#f59e0b",
            "on-primary": "#472a00",
            "secondary": "#4edea3",
            "secondary-container": "#00a572",
            "on-secondary": "#003824",
            "tertiary": "#98d3ff",
            "error": "#ffb4ab",
            "error-container": "#93000a"
          },
          fontFamily: {
            "headline-lg": ["Plus Jakarta Sans", "sans-serif"],
            "headline-md": ["Plus Jakarta Sans", "sans-serif"],
            "headline-sm": ["Plus Jakarta Sans", "sans-serif"],
            "body-lg": ["Plus Jakarta Sans", "sans-serif"],
            "body-md": ["Plus Jakarta Sans", "sans-serif"],
            "body-sm": ["Plus Jakarta Sans", "sans-serif"],
            "label-mono-sm": ["JetBrains Mono", "monospace"]
          }
        }
      }
    };
  </script>
</head>

<body class="bg-[#0f131b] font-body-md text-[#dfe2ec] antialiased selection:bg-amber-500 selection:text-black min-h-screen flex flex-col justify-between">

  <!-- TOP NAVIGATION -->
  <header class="fixed top-0 left-0 right-0 z-50 bg-[#0f131b]/85 backdrop-blur-xl shadow-[0_1px_12px_rgba(0,0,0,0.4)] border-b border-white/5">
    <div class="h-20 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between gap-6">
      
      <!-- Brand Logo Oficial Conecta King -->
      <a class="flex items-center gap-3 group transition-transform active:scale-95 text-decoration-none" href="/">
        <img 
          src="/logo.png" 
          onerror="this.onerror=null;this.src='https://i.ibb.co/60sW9k75/logo.png';" 
          alt="Conecta King" 
          class="h-10 w-auto object-contain filter drop-shadow-[0_0_12px_rgba(245,158,11,0.4)] transition-transform group-hover:scale-105"
        />
        <div class="flex flex-col">
          <span class="font-bold text-xl tracking-tight text-white leading-none">Conecta <span class="text-[#fbbf24] font-extrabold drop-shadow-[0_0_14px_rgba(251,191,36,0.65)]">King</span></span>
          <span class="font-mono text-[10px] tracking-widest uppercase text-amber-400/80 leading-none mt-1">O Poder da Conexão</span>
        </div>
      </a>

      <!-- Desktop Navigation Links -->
      <nav class="hidden xl:flex items-center gap-7">
        <a class="text-sm text-[#d8c3ad] hover:text-white transition-colors py-2" href="#como-funciona">Como Funciona</a>
        <a class="text-sm text-[#d8c3ad] hover:text-white transition-colors py-2" href="#vantagens-nfc">Vantagens NFC</a>
        <a class="text-sm text-[#d8c3ad] hover:text-white transition-colors py-2" href="#demonstracao-interativa">Demonstração Interativa</a>
        <a class="text-sm text-[#d8c3ad] hover:text-white transition-colors py-2" href="#planos-valores">Planos & Valores</a>
        <a class="text-sm text-[#d8c3ad] hover:text-white transition-colors py-2" href="#faq">FAQ</a>
      </nav>

      <!-- Right Action Buttons -->
      <div class="flex items-center gap-3">
        <a class="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#262a32] hover:bg-[#31353d] transition-all group" href="https://wa.me/5511988789417" rel="noopener noreferrer" target="_blank">
          <span class="flex h-2 w-2 relative">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          <span class="material-symbols-outlined text-emerald-400 text-[18px]">chat</span>
          <span class="font-mono text-xs text-emerald-400 font-semibold">WhatsApp</span>
        </a>

        @if($hasTokenCookie)
          <a class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#f59e0b] hover:from-[#fbbf24] hover:to-[#f59e0b] text-[#1c1200] text-sm font-extrabold shadow-[0_0_25px_rgba(245,158,11,0.55)] transition-all border border-[#fef08a]/60 active:scale-95" href="/dashboard">
            <span class="material-symbols-outlined text-[18px]">dashboard</span>
            <span>Acessar Painel</span>
          </a>
        @else
          <a class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#f59e0b] hover:from-[#fbbf24] hover:to-[#f59e0b] text-[#1c1200] text-sm font-extrabold shadow-[0_0_25px_rgba(245,158,11,0.55)] transition-all border border-[#fef08a]/60 active:scale-95" href="/login">
            <span class="material-symbols-outlined text-[18px]">lock_open</span>
            <span>Acessar Painel</span>
          </a>
        @endif
      </div>
    </div>
  </header>

  <main class="w-full pt-20 bg-[#0f131b] flex-1">
    <div class="flex flex-col w-full">

      <!-- HERO SECTION -->
      <section class="relative w-full overflow-hidden bg-[#0f131b] py-12 lg:py-20" id="como-funciona">
        <div class="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute top-1/2 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div class="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
          
          <div class="flex justify-start sm:justify-center mb-6">
            <div class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#262a32] shadow-lg border border-white/5">
              <span class="relative flex h-2.5 w-2.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_12px_rgba(78,222,163,0.8)]"></span>
              </span>
              <span class="font-mono text-xs text-[#ffc174] uppercase tracking-widest font-semibold">Tecnologia NFC de Luxo • Sem Aplicativo • 100% Compatível • Atualização Instantânea</span>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            <div class="lg:col-span-7 flex flex-col gap-6">
              <h1 class="text-4xl sm:text-5xl lg:text-[62px] lg:leading-[1.1] font-extrabold text-white tracking-tight">
                Sua Presença Digital.<br>
                <span class="bg-gradient-to-r from-[#ffc174] via-[#fbbf24] to-[#f59e0b] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(245,158,11,0.35)]">
                  Um Toque. Poder Absoluto.
                </span>
              </h1>
              <p class="text-base sm:text-lg text-[#d8c3ad] max-w-2xl leading-relaxed">
                O <strong class="text-white font-semibold">ConectaKing</strong> transforma seu networking em autoridade imediata, conexões magnéticas e vendas reais usando tecnologia de aproximação NFC premium. Substitua de vez cartões de papel amassados por um cartão de prestígio que grava seus dados direto na agenda do cliente.
              </p>
              
              <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <a class="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-[#d97706] via-[#fbbf24] to-[#f59e0b] hover:brightness-110 text-[#1a0f00] text-lg font-extrabold shadow-[0_0_35px_rgba(245,158,11,0.6)] border border-[#fef08a]/80 transition-all transform hover:-translate-y-0.5 text-center animate-pulse" href="#planos-valores">
                  <span>Garantir Meu ConectaKing Agora</span>
                  <span class="material-symbols-outlined text-[22px]">arrow_forward</span>
                </a>

                <a class="inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-base font-bold shadow-[0_0_24px_rgba(78,222,163,0.3)] transition-all animate-pulse" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Desejo%20conhecer%20o%20cart%C3%A3o%20NFC%20ConectaKing%20de%20alta%20performance." rel="noopener noreferrer" target="_blank">
                  <span class="material-symbols-outlined text-[22px]">chat</span>
                  <span>WhatsApp (11) 98878-9417</span>
                </a>
              </div>

              <div class="flex flex-wrap items-center gap-6 pt-3" id="vantagens-nfc">
                <div class="flex items-center gap-2 text-[#d8c3ad]">
                  <span class="material-symbols-outlined text-emerald-400 text-[20px]">verified</span>
                  <span class="font-mono text-xs">Certificado ISO/IEC 14443A</span>
                </div>
                <div class="flex items-center gap-2 text-[#d8c3ad]">
                  <span class="material-symbols-outlined text-[#ffc174] text-[20px]">schedule</span>
                  <span class="font-mono text-xs">Leitura ultrarrápida em 0.1s</span>
                </div>
                <div class="flex items-center gap-2 text-[#d8c3ad]">
                  <span class="material-symbols-outlined text-sky-400 text-[20px]">smartphone</span>
                  <span class="font-mono text-xs">iOS e Android Nativos</span>
                </div>
              </div>
            </div>

            <!-- Mockup Phone & Card Stage with animated NFC transmission waves -->
            <div class="lg:col-span-5 relative flex justify-center">
              <div class="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-emerald-500/15 to-transparent rounded-3xl blur-2xl transform scale-95 pointer-events-none"></div>
              
              <!-- NFC Transmission Radiance Waves between Card and Phone -->
              <div class="absolute -bottom-2 left-12 w-28 h-28 pointer-events-none z-20 flex items-center justify-center">
                <div class="absolute w-12 h-12 rounded-full border-2 border-emerald-400/80 animate-ping"></div>
                <div class="absolute w-20 h-20 rounded-full border border-[#fef08a]/60 animate-pulse"></div>
                <div class="absolute w-28 h-28 rounded-full border border-emerald-400/30 animate-ping" style="animation-duration: 2.2s;"></div>
              </div>

              <div class="relative w-full max-w-[340px] sm:max-w-[360px] bg-[#0a0e15] rounded-[2.5rem] p-3 shadow-2xl z-10 border border-white/10">
                <div class="w-full bg-[#1c2027] rounded-[2rem] overflow-hidden pt-8 pb-5 px-4 flex flex-col gap-4 relative">
                  <div class="flex items-center justify-between p-2.5 rounded-xl bg-[#262a32] shadow-inner">
                    <div class="flex items-center gap-2">
                      <span class="relative flex h-2.5 w-2.5">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
                      </span>
                      <span class="font-mono text-xs text-emerald-400 font-semibold">NFC LIDO EM 0.1s</span>
                    </div>
                    <span class="font-mono text-xs text-[#d8c3ad]">256-bit AES</span>
                  </div>

                  <!-- Inside Phone Profile -->
                  <div class="bg-[#181c23] rounded-2xl p-4 flex flex-col items-center text-center shadow-lg relative border border-white/5">
                    <div class="relative w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-[#f59e0b] via-emerald-400 to-[#fbbf24] shadow-[0_0_20px_rgba(245,158,11,0.3)] mb-2">
                      <img alt="Adriano King" class="w-full h-full object-cover rounded-full" id="hero-phone-avatar" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80">
                      <div class="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center text-black shadow-md font-bold">
                        <span class="material-symbols-outlined text-[14px]">check</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <h3 class="text-lg font-bold text-white" id="hero-phone-name">Adriano King</h3>
                      <span class="material-symbols-outlined text-[#ffc174] text-[18px]">verified</span>
                    </div>
                    <p class="font-mono text-[11px] text-[#ffc174] uppercase tracking-wider font-semibold" id="hero-phone-role">CEO • Grupo Conecta Sovereign</p>
                    <p class="text-xs text-[#d8c3ad] mt-1">Networking Estratégico • Venture • Tech</p>
                    
                    <button class="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#f59e0b] hover:from-[#fbbf24] hover:to-[#d97706] text-[#1c1200] text-sm font-extrabold flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.65)] border border-[#fef08a] animate-bounce transition-all cursor-pointer" type="button">
                      <span class="material-symbols-outlined text-[20px]">person_add</span>
                      <span>Salvar na Minha Agenda</span>
                    </button>
                    
                    <div class="w-full flex flex-col gap-2 mt-3">
                      <div class="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#262a32] text-white">
                        <div class="flex items-center gap-2.5">
                          <span class="material-symbols-outlined text-emerald-400 text-[20px]">chat</span>
                          <span class="text-xs font-semibold">Iniciar Conversa no WhatsApp</span>
                        </div>
                        <span class="material-symbols-outlined text-[#d8c3ad] text-[16px]">chevron_right</span>
                      </div>
                      <div class="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#262a32] text-white">
                        <div class="flex items-center gap-2.5">
                          <span class="material-symbols-outlined text-[#ffc174] text-[20px]">payments</span>
                          <span class="text-xs font-semibold">Copiar Chave Pix Instantânea</span>
                        </div>
                        <span class="material-symbols-outlined text-[#d8c3ad] text-[16px]">content_copy</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Overlapping Physical Card Mockup with NFC Radiance -->
                <div class="absolute -bottom-8 -left-10 sm:-left-14 w-64 sm:w-72 bg-gradient-to-br from-[#31353d] via-[#181c23] to-[#0a0e15] rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-30 transform -rotate-6 hover:rotate-0 transition-transform duration-500 border border-[#fef08a]/60 shadow-[0_0_35px_rgba(245,158,11,0.35)]">
                  <div class="absolute -top-6 -right-6 w-24 h-24 bg-amber-500/30 rounded-full blur-xl pointer-events-none animate-pulse"></div>
                  <div class="absolute -top-4 -right-4 w-16 h-16 rounded-full border border-emerald-400/60 animate-ping opacity-75 pointer-events-none"></div>
                  
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                      <img src="/logo.png" onerror="this.onerror=null;this.src='https://i.ibb.co/60sW9k75/logo.png';" alt="Conecta King" class="h-6 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                      <span class="text-sm font-bold text-white tracking-tight">Conecta <span class="text-[#fbbf24] font-extrabold">King</span></span>
                    </div>
                    <div class="relative w-8 h-8 rounded-lg bg-[#1c2027] flex items-center justify-center shadow-[0_0_15px_rgba(78,222,163,0.3)]">
                      <span class="material-symbols-outlined text-emerald-400 text-[20px] animate-pulse">contactless</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-3 my-2">
                    <div class="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-[#f59e0b] via-[#fbbf24] to-[#fef08a] shadow-[0_0_15px_rgba(245,158,11,0.4)] flex-shrink-0">
                      <img alt="Adriano King" class="w-full h-full object-cover rounded-full" id="hero-card-avatar" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80">
                    </div>
                    <div class="flex flex-col">
                      <span class="font-mono text-[9px] text-[#d8c3ad]">TITULAR EXECUTIVO</span>
                      <span class="text-sm text-white font-bold tracking-tight" id="hero-card-name">ADRIANO KING</span>
                      <span class="font-mono text-[9px] text-[#ffc174] font-medium" id="hero-card-role">SOVEREIGN MEMBER • 0019</span>
                    </div>
                  </div>

                  <div class="mt-3 pt-2.5 flex items-center justify-between border-t border-white/10">
                    <div class="flex items-center gap-1.5">
                      <span class="relative flex h-2 w-2">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                      </span>
                      <span class="font-mono text-[10px] text-emerald-400 font-semibold">APROXIMOU, CONECTOU</span>
                    </div>
                    <span class="material-symbols-outlined text-[#ffc174] text-[18px]">verified_user</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- METRICS & AUTHORITY BAR -->
      <section class="w-full bg-[#0a0e15] py-10 shadow-inner border-y border-white/5">
        <div class="max-w-7xl mx-auto px-6 lg:px-12">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
            <div class="flex flex-col items-center sm:items-start p-4 rounded-xl bg-[#181c23]/50 relative overflow-hidden group hover:bg-[#181c23] transition-all">
              <span class="text-3xl lg:text-4xl bg-gradient-to-r from-[#ffc174] via-[#fbbf24] to-[#f59e0b] bg-clip-text text-transparent font-extrabold">+18.000</span>
              <span class="text-sm text-white font-semibold mt-1">Líderes • Executivos</span>
              <span class="font-mono text-xs text-[#d8c3ad]">Conectados em todo Brasil</span>
            </div>
            <div class="flex flex-col items-center sm:items-start p-4 rounded-xl bg-[#181c23]/50 relative overflow-hidden group hover:bg-[#181c23] transition-all">
              <span class="text-3xl lg:text-4xl bg-gradient-to-r from-emerald-400 via-[#6ffbbe] to-emerald-500 bg-clip-text text-transparent font-extrabold">0.1s</span>
              <span class="text-sm text-white font-semibold mt-1">Transmissão Instantânea</span>
              <span class="font-mono text-xs text-[#d8c3ad]">Sem latência ou fricção</span>
            </div>
            <div class="flex flex-col items-center sm:items-start p-4 rounded-xl bg-[#181c23]/50 relative overflow-hidden group hover:bg-[#181c23] transition-all">
              <span class="text-3xl lg:text-4xl bg-gradient-to-r from-white via-[#d8c3ad] to-white bg-clip-text text-transparent font-extrabold">100%</span>
              <span class="text-sm text-white font-semibold mt-1">Sem Necessidade de App</span>
              <span class="font-mono text-xs text-[#d8c3ad]">Abre no Safari e Chrome</span>
            </div>
            <div class="flex flex-col items-center sm:items-start p-4 rounded-xl bg-[#181c23]/50 relative overflow-hidden group hover:bg-[#181c23] transition-all">
              <span class="text-3xl lg:text-4xl bg-gradient-to-r from-[#ffc174] via-[#fef08a] to-[#f59e0b] bg-clip-text text-transparent font-extrabold">Zero</span>
              <span class="text-sm text-white font-semibold mt-1">Desperdício de Papel</span>
              <span class="font-mono text-xs text-[#d8c3ad]">Infinito e Sustentável</span>
            </div>
          </div>
        </div>
      </section>

      <!-- SHOWROOM 3D WITH INTERACTIVE TRIGGER & 3D TILT EFFECT -->
      <section class="w-full bg-[#0a0e15] py-20 relative" id="demonstracao-interativa">
        <div class="max-w-7xl mx-auto px-6 lg:px-12">
          <div class="text-center max-w-3xl mx-auto mb-16 flex flex-col gap-3">
            <span class="font-mono text-xs text-[#ffc174] uppercase tracking-widest font-semibold">Engenharia de Materiais Nobres</span>
            <h2 class="text-3xl sm:text-4xl font-extrabold text-white">
              Escolha Seu <span class="text-[#ffc174]">Instrumento de Poder</span>
            </h2>
            <p class="text-base text-[#d8c3ad]">
              Cada cartão ConectaKing é forjado com camadas resistentes ao desgaste, gravação com foto e logotipo em alta definição, além de chip NFC criptografado.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8" style="perspective: 1200px;">
            
            <!-- Black Matte -->
            <div class="tilt-card p-6 rounded-2xl bg-[#181c23] shadow-xl flex flex-col justify-between group hover:scale-[1.02] transition-all cursor-pointer border border-white/5" onmouseleave="resetCardTilt(this)" onmousemove="handleCardTilt(event, this)">
              <div class="flex flex-col gap-4">
                <div class="w-full aspect-[1.58/1] rounded-2xl bg-gradient-to-tr from-[#0a0e15] via-[#262a32] to-[#31353d] p-5 flex flex-col justify-between relative overflow-hidden shadow-2xl border border-white/10 pointer-events-none">
                  <div class="flex items-center justify-between">
                    <span class="material-symbols-outlined text-[#ffc174] text-[26px]">crown</span>
                    <span class="material-symbols-outlined text-[#d8c3ad] text-[20px]">contactless</span>
                  </div>
                  <div class="flex items-center gap-3 my-auto">
                    <div class="w-10 h-10 rounded-full border border-amber-400/60 overflow-hidden flex-shrink-0">
                      <img alt="Preview Avatar" class="w-full h-full object-cover showroom-card-avatar" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80">
                    </div>
                    <div class="flex flex-col">
                      <span class="font-mono text-[9px] text-[#d8c3ad]">BLACK MATTE EDITION</span>
                      <span class="text-base text-white font-bold tracking-wider showroom-card-name">SEU NOME AQUI</span>
                      <span class="font-mono text-[9px] text-[#ffc174]">FOTO + NFC INTEGRADO</span>
                    </div>
                  </div>
                </div>
                <div class="flex flex-col gap-1 pt-2">
                  <span class="font-mono text-xs text-[#ffc174] font-semibold uppercase">Linha Black Matte</span>
                  <h3 class="text-lg text-white font-bold">Preto Fosco Nobre</h3>
                  <p class="text-xs text-[#d8c3ad]">Acabamento aveludado fosco com verniz localizado nas iniciais e foto nítida. O modelo mais desejado por advogados e consultores.</p>
                </div>
              </div>
              <div class="pt-6 flex items-center justify-between border-t border-white/5">
                <a href="#planos-valores" class="inline-flex items-center gap-1.5 text-[#ffc174] text-xs font-bold hover:underline">
                  <span class="material-symbols-outlined text-[18px]">credit_card</span>Disponível nos Pacotes
                </a>
                <span class="material-symbols-outlined text-[#ffc174] text-[20px]">verified</span>
              </div>
            </div>

            <!-- King Gold -->
            <div class="tilt-card p-6 rounded-2xl bg-[#1c2027] shadow-2xl flex flex-col justify-between group hover:scale-[1.02] transition-all relative overflow-hidden cursor-pointer border border-[#fef08a]/60 shadow-[0_0_35px_rgba(245,158,11,0.25)]" onmouseleave="resetCardTilt(this)" onmousemove="handleCardTilt(event, this)">
              <div class="absolute top-0 right-0 px-4 py-1 rounded-bl-xl bg-[#f59e0b] text-black font-mono text-xs font-bold">EDIÇÃO VIP</div>
              <div class="flex flex-col gap-4">
                <div class="w-full aspect-[1.58/1] rounded-2xl bg-gradient-to-tr from-[#262a32] via-[#f59e0b]/20 to-[#ffc174]/30 p-5 flex flex-col justify-between relative overflow-hidden border border-[#fef08a]/60 pointer-events-none">
                  <div class="flex items-center justify-between">
                    <span class="material-symbols-outlined text-[#ffc174] text-[28px]">crown</span>
                    <span class="material-symbols-outlined text-[#ffc174] text-[22px]">contactless</span>
                  </div>
                  <div class="flex items-center gap-3 my-auto">
                    <div class="w-10 h-10 rounded-full border-2 border-[#fef08a] overflow-hidden flex-shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                      <img alt="Preview Avatar" class="w-full h-full object-cover showroom-card-avatar" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80">
                    </div>
                    <div class="flex flex-col">
                      <span class="font-mono text-[9px] text-[#ffc174] font-semibold">SOVEREIGN GOLD EDITION</span>
                      <span class="text-base text-white font-extrabold tracking-wider showroom-card-name">SEU NOME AQUI</span>
                      <span class="font-mono text-[9px] text-emerald-400">FOTO VIP + HIGH DENSITY NFC</span>
                    </div>
                  </div>
                </div>
                <div class="flex flex-col gap-1 pt-2">
                  <span class="font-mono text-xs text-[#ffc174] font-bold uppercase">Linha King Gold</span>
                  <h3 class="text-lg text-white font-bold">Dourado Metálico Escovado</h3>
                  <p class="text-xs text-[#d8c3ad]">Lâmina reforçada com efeito metálico cintilante e reflexos nobres. Desenvolvido para sócios de fundos, médicos e CEOs.</p>
                </div>
              </div>
              <div class="pt-6 flex items-center justify-between border-t border-white/5">
                <a href="#planos-valores" class="inline-flex items-center gap-1.5 text-[#ffc174] text-xs font-bold hover:underline">
                  <span class="material-symbols-outlined text-[18px]">stars</span>Incluso no Pacote Executive
                </a>
                <span class="material-symbols-outlined text-[#ffc174] text-[20px]">stars</span>
              </div>
            </div>

            <!-- Carbon Tech -->
            <div class="tilt-card p-6 rounded-2xl bg-[#181c23] shadow-xl flex flex-col justify-between group hover:scale-[1.02] transition-all cursor-pointer border border-white/5" onmouseleave="resetCardTilt(this)" onmousemove="handleCardTilt(event, this)">
              <div class="flex flex-col gap-4">
                <div class="w-full aspect-[1.58/1] rounded-2xl bg-[#0a0e15] p-5 flex flex-col justify-between relative overflow-hidden shadow-2xl border border-emerald-500/30 pointer-events-none">
                  <div class="flex items-center justify-between">
                    <span class="material-symbols-outlined text-emerald-400 text-[24px]">terminal</span>
                    <span class="material-symbols-outlined text-emerald-400 text-[20px]">contactless</span>
                  </div>
                  <div class="flex items-center gap-3 my-auto">
                    <div class="w-10 h-10 rounded-full border border-emerald-400/60 overflow-hidden flex-shrink-0">
                      <img alt="Preview Avatar" class="w-full h-full object-cover showroom-card-avatar" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80">
                    </div>
                    <div class="flex flex-col">
                      <span class="font-mono text-[9px] text-[#d8c3ad]">CARBON FIBER TECH</span>
                      <span class="text-base text-white font-bold tracking-wider showroom-card-name">SEU NOME AQUI</span>
                      <span class="font-mono text-[9px] text-emerald-400">MICROTEXTURA + FOTO HD</span>
                    </div>
                  </div>
                </div>
                <div class="flex flex-col gap-1 pt-2">
                  <span class="font-mono text-xs text-emerald-400 font-semibold uppercase">Linha Carbon Minimalist</span>
                  <h3 class="text-lg text-white font-bold">Textura Fibra & Tech</h3>
                  <p class="text-xs text-[#d8c3ad]">Design tático com microtextura geométrica. Ideal para executivos de tecnologia, founders de startups e investidores anjo.</p>
                </div>
              </div>
              <div class="pt-6 flex items-center justify-between border-t border-white/5">
                <a href="#planos-valores" class="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-bold hover:underline">
                  <span class="material-symbols-outlined text-[18px]">shield</span>Incluso no Pacote Duo
                </a>
                <span class="material-symbols-outlined text-emerald-400 text-[20px]">shield</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- PRICING & PLANS -->
      <section class="w-full bg-[#0f131b] py-20 relative" id="planos-valores">
        <div class="max-w-7xl mx-auto px-6 lg:px-12">
          <div class="text-center max-w-3xl mx-auto mb-10 flex flex-col gap-3">
            <span class="font-mono text-xs text-[#ffc174] uppercase tracking-widest font-semibold">INVESTIMENTO TRANSPARENTE & MANUTENÇÃO ATIVA</span>
            <h2 class="text-3xl sm:text-4xl font-extrabold text-white">Veja Nossos <span class="text-[#ffc174]">Pacotes Exclusivos!</span></h2>
            <p class="text-base text-[#d8c3ad]">Plataforma em nuvem com sincronização instantânea de contatos, servidores dedicados e suporte contínuo. Escolha o pacote ideal para potencializar seu networking profissional.</p>
          </div>

          <!-- INTERACTIVE BILLING TOGGLE (PARCELADO 12x vs À VISTA PIX) -->
          <div class="flex justify-center mb-12">
            <div class="inline-flex p-1.5 rounded-2xl bg-[#181c23] border border-[#fef08a]/30 shadow-[0_10px_30px_rgba(0,0,0,0.6)] relative z-10 gap-1.5">
              <button class="px-5 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-extrabold transition-all duration-300 flex items-center gap-2 cursor-pointer bg-gradient-to-r from-[#d97706] via-[#fbbf24] to-[#f59e0b] text-[#1a0f00] shadow-[0_0_20px_rgba(245,158,11,0.5)] border border-[#fef08a]" id="toggle-installment" onclick="switchBillingMode('installment')" type="button">
                <span class="material-symbols-outlined text-[18px]">credit_card</span>
                <span>Parcelamento Facilitado (12x)</span>
              </button>
              <button class="px-5 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-2 cursor-pointer text-[#d8c3ad] hover:text-white hover:bg-[#262a32]" id="toggle-pix" onclick="switchBillingMode('pix')" type="button">
                <span class="material-symbols-outlined text-emerald-400 text-[18px]">bolt</span>
                <span>À Vista com Desconto PIX ⚡</span>
                <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-400/40">Economize até 17%</span>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            
            <!-- PACOTE 1: START -->
            <div class="p-8 rounded-2xl bg-[#181c23] shadow-xl flex flex-col justify-between border border-white/10 hover:border-amber-400/50 transition-all">
              <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between">
                  <span class="font-mono text-xs text-[#d8c3ad] uppercase font-semibold">Pacote Individual</span>
                  <span class="px-2.5 py-1 rounded bg-[#262a32] text-[#ffc174] font-mono text-xs font-bold">1. START</span>
                </div>
                <h3 class="text-2xl text-white font-black tracking-tight">1. START</h3>
                <p class="text-xs text-[#d8c3ad]">Plataforma digital completa sincronizada a 1 tag NFC física de alto padrão.</p>
                <div class="p-4 rounded-xl bg-[#0a0e15] border border-white/5 flex flex-col gap-2 my-2">
                  <div class="flex items-center gap-2 text-white text-sm font-bold">
                    <span class="material-symbols-outlined text-[#ffc174] text-[20px]">cloud_done</span>
                    <span>Plataforma ConectaKing</span>
                  </div>
                  <div class="flex items-center gap-2 text-[#ffc174] text-sm font-semibold">
                    <span class="material-symbols-outlined text-emerald-400 text-[20px]">contactless</span>
                    <span>+ 1 Tag NFC</span>
                  </div>
                </div>

                <!-- Pricing Area Start -->
                <div class="my-4 pb-4 border-b border-[#31353d]">
                  <span class="font-mono text-xs text-[#d8c3ad] block mb-1" id="pricing-label-start">Parcelamento Facilitado:</span>
                  <div class="flex items-baseline gap-1 text-white" id="pricing-main-start">
                    <span class="text-lg font-bold">12x de R$</span>
                    <span class="text-4xl font-extrabold text-[#ffc174]">35</span>
                    <span class="text-lg font-bold">,00</span>
                  </div>
                  <div class="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono" id="pricing-sub-start">
                    <span class="text-[#d8c3ad]">À VISTA (PIX):</span>
                    <span class="font-bold text-white text-sm">R$ 350,00</span>
                  </div>
                </div>

                <ul class="flex flex-col gap-3 text-xs mb-4">
                  <li class="flex items-center gap-2.5 text-white">
                    <span class="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>Plataforma Web com Manutenção Ativa
                  </li>
                  <li class="flex items-center gap-2.5 text-white">
                    <span class="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>1 Tag NFC com Foto / Identificação Gravada
                  </li>
                  <li class="flex items-center gap-2.5 text-white">
                    <span class="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>Sincronização instantânea na agenda do cliente
                  </li>
                  <li class="flex items-center gap-2.5 text-white">
                    <span class="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>Suporte contínuo via WhatsApp
                  </li>
                </ul>
              </div>

              <div class="flex flex-col gap-2 pt-2">
                <a class="w-full py-3.5 px-4 rounded-xl bg-[#262a32] hover:bg-[#31353d] text-[#ffc174] border border-[#fef08a]/40 text-sm font-extrabold text-center transition-all flex items-center justify-center gap-2 shadow-md" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Desejo%20contratar%20o%20Pacote%201%20START%20(12x%20de%20R$%2035,00%20ou%20R$%20350%20PIX)" id="cta-link-start" rel="noopener noreferrer" target="_blank">
                  <span class="material-symbols-outlined text-[18px]">shopping_bag</span>
                  <span>Contratar Pacote Start</span>
                </a>
              </div>
            </div>

            <!-- PACOTE 2: EXECUTIVE (MAIS VENDIDO) -->
            <div class="p-8 rounded-2xl bg-[#1c2027] shadow-2xl flex flex-col justify-between relative overflow-hidden border-2 border-[#fef08a] shadow-[0_0_35px_rgba(245,158,11,0.5)] transform lg:-translate-y-2">
              <div class="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/20 rounded-full blur-2xl pointer-events-none"></div>
              
              <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between">
                  <span class="px-3 py-1 rounded-full bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-black font-mono text-xs font-extrabold shadow-[0_0_12px_rgba(245,158,11,0.6)] flex items-center gap-1">MAIS VENDIDO ⭐</span>
                  <span class="material-symbols-outlined text-[#fef08a] text-[24px] drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]">stars</span>
                </div>
                <h3 class="text-2xl text-white font-black tracking-tight flex items-center gap-2">2. EXECUTIVE</h3>
                <p class="text-xs text-[#d8c3ad]">O combo definitivo de prestígio: Plataforma, Tag NFC e Pulseira em Silicone resistente.</p>
                
                <div class="p-4 rounded-xl bg-[#0a0e15] border border-amber-400/30 flex flex-col gap-2 my-2">
                  <div class="flex items-center gap-2 text-white text-sm font-bold">
                    <span class="material-symbols-outlined text-[#ffc174] text-[20px]">cloud_done</span>
                    <span>Plataforma ConectaKing</span>
                  </div>
                  <div class="flex items-center gap-2 text-[#ffc174] text-sm font-semibold">
                    <span class="material-symbols-outlined text-emerald-400 text-[20px]">contactless</span>
                    <span>+ 1 Tag NFC</span>
                  </div>
                  <div class="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                    <span class="material-symbols-outlined text-[#ffc174] text-[20px]">watch</span>
                    <span>+ 1 Pulseira Silicone NFC</span>
                  </div>
                </div>

                <!-- Pricing Area Executive -->
                <div class="my-4 pb-4 border-b border-[#31353d]">
                  <span class="font-mono text-xs text-[#d8c3ad] block mb-1" id="pricing-label-executive">Parcelamento Facilitado:</span>
                  <div class="flex items-baseline gap-1 text-white" id="pricing-main-executive">
                    <span class="text-lg font-bold">12x de R$</span>
                    <span class="text-4xl font-black text-[#ffc174]">42</span>
                    <span class="text-lg font-bold">,00</span>
                  </div>
                  <div class="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono" id="pricing-sub-executive">
                    <span class="text-[#d8c3ad]">À VISTA (PIX):</span>
                    <span class="font-bold text-[#ffc174] text-sm">R$ 429,90</span>
                  </div>
                </div>

                <ul class="flex flex-col gap-3 text-xs mb-4">
                  <li class="flex items-center gap-2.5 text-white font-semibold">
                    <span class="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>Plataforma Completa com Manutenção e Servidores Dedicados
                  </li>
                  <li class="flex items-center gap-2.5 text-white font-semibold">
                    <span class="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>1 Tag NFC de Luxo com Gravação a Laser
                  </li>
                  <li class="flex items-center gap-2.5 text-white font-semibold">
                    <span class="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>1 Pulseira de Silicone NFC ConectaKing
                  </li>
                  <li class="flex items-center gap-2.5 text-white font-semibold">
                    <span class="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>Atualizações ilimitadas e Suporte VIP Prioritário
                  </li>
                </ul>
              </div>

              <div class="flex flex-col gap-2.5 pt-2">
                <a class="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-[#d97706] via-[#fbbf24] to-[#f59e0b] hover:brightness-110 text-[#1a0f00] text-base font-black text-center shadow-[0_0_35px_rgba(245,158,11,0.6)] border border-[#fef08a] transition-all flex items-center justify-center gap-2 animate-pulse" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Desejo%20adquirir%20o%20Pacote%202%20EXECUTIVE%20Mais%20Vendido%20(12x%20de%20R$%2042,00%20ou%20R$%20429,90%20PIX)" id="cta-link-executive" rel="noopener noreferrer" target="_blank">
                  <span class="material-symbols-outlined text-[22px]">stars</span>
                  <span>Adquirir Pacote Executive</span>
                </a>
              </div>
            </div>

            <!-- PACOTE 3: DUO / SOCIEDADE -->
            <div class="p-8 rounded-2xl bg-[#181c23] shadow-xl flex flex-col justify-between border border-white/10 hover:border-amber-400/50 transition-all">
              <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between">
                  <span class="font-mono text-xs text-[#d8c3ad] uppercase font-semibold">Para Sócios & Parcerias</span>
                  <span class="px-2.5 py-1 rounded bg-[#262a32] text-emerald-400 font-mono text-xs font-bold">3. DUO</span>
                </div>
                <h3 class="text-2xl text-white font-black tracking-tight">3. DUO / SOCIEDADE</h3>
                <p class="text-xs text-[#d8c3ad]">Solução para 2 profissionais ou sócios com conjunto duplo de hardware NFC.</p>
                
                <div class="p-4 rounded-xl bg-[#0a0e15] border border-white/5 flex flex-col gap-2 my-2">
                  <div class="flex items-center gap-2 text-white text-sm font-bold">
                    <span class="material-symbols-outlined text-[#ffc174] text-[20px]">cloud_done</span>
                    <span>Plataforma ConectaKing</span>
                  </div>
                  <div class="flex items-center gap-2 text-[#ffc174] text-sm font-semibold">
                    <span class="material-symbols-outlined text-emerald-400 text-[20px]">contactless</span>
                    <span>+ 2 Tags NFC</span>
                  </div>
                  <div class="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                    <span class="material-symbols-outlined text-[#ffc174] text-[20px]">watch</span>
                    <span>+ 2 Pulseiras Silicone NFC</span>
                  </div>
                </div>

                <!-- Pricing Area Duo -->
                <div class="my-4 pb-4 border-b border-[#31353d]">
                  <span class="font-mono text-xs text-[#d8c3ad] block mb-1" id="pricing-label-duo">Parcelamento Facilitado:</span>
                  <div class="flex items-baseline gap-1 text-white" id="pricing-main-duo">
                    <span class="text-lg font-bold">12x de R$</span>
                    <span class="text-4xl font-extrabold text-[#ffc174]">49</span>
                    <span class="text-lg font-bold">,90</span>
                  </div>
                  <div class="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono" id="pricing-sub-duo">
                    <span class="text-[#d8c3ad]">À VISTA (PIX):</span>
                    <span class="font-bold text-white text-sm">R$ 499,00</span>
                  </div>
                </div>

                <ul class="flex flex-col gap-3 text-xs mb-4">
                  <li class="flex items-center gap-2.5 text-white">
                    <span class="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>Plataforma ConectaKing para 2 perfis sincronizados
                  </li>
                  <li class="flex items-center gap-2.5 text-white">
                    <span class="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>2 Tags NFC com Gravação de Foto/Logomarca
                  </li>
                  <li class="flex items-center gap-2.5 text-white">
                    <span class="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>2 Pulseiras de Silicone NFC ConectaKing
                  </li>
                  <li class="flex items-center gap-2.5 text-white">
                    <span class="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>Manutenção contínua e suporte para ambos os sócios
                  </li>
                </ul>
              </div>

              <div class="flex flex-col gap-2 pt-2">
                <a class="w-full py-3.5 px-4 rounded-xl bg-[#262a32] hover:bg-[#31353d] text-emerald-400 hover:text-emerald-300 border border-emerald-400/50 text-sm font-extrabold text-center transition-all flex items-center justify-center gap-2 shadow-md" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Desejo%20contratar%20o%20Pacote%203%20DUO%20/%20SOCIEDADE%20(12x%20de%20R$%2049,90%20ou%20R$%20499%20PIX)" id="cta-link-duo" rel="noopener noreferrer" target="_blank">
                  <span class="material-symbols-outlined text-[18px]">groups</span>
                  <span>Contratar Duo / Sociedade</span>
                </a>
              </div>
            </div>

          </div>

          <!-- GUARANTEE BADGE (SELO 7 DIAS ANIMADO) -->
          <div class="mt-12 flex justify-center">
            <div class="inline-flex items-center gap-4 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#181c23] via-[#262a32] to-[#181c23] border border-emerald-400/40 shadow-[0_0_25px_rgba(78,222,163,0.2)]">
              <div class="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 animate-pulse border border-emerald-400/50">
                <span class="material-symbols-outlined text-[24px]">verified_user</span>
              </div>
              <div class="flex flex-col text-left">
                <span class="text-sm font-extrabold text-white flex items-center gap-2">
                  Garantia Incondicional de 7 Dias
                  <span class="px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-400 font-mono text-[10px] font-bold">100% SEGURO</span>
                </span>
                <span class="font-mono text-xs text-[#d8c3ad]">Teste a tecnologia ConectaKing sem riscos. Satisfação comprovada ou seu investimento de volta.</span>
              </div>
            </div>
          </div>

          <!-- FAQ Explicativo sobre Mensalidade -->
          <div class="mt-16 pt-12 border-t border-white/10 max-w-5xl mx-auto flex flex-col gap-10" id="faq">
            <div class="flex flex-col gap-4 text-left">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[#ffc174] text-[24px]">help</span>
                <h4 class="text-lg font-bold text-white">Perguntas Frequentes (FAQ)</h4>
              </div>
              
              <div class="p-5 rounded-xl bg-[#181c23] border border-white/5 flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-bold text-white flex items-center gap-2">
                    <span class="material-symbols-outlined text-amber-500 text-[18px]">payments</span>O sistema ConectaKing possui mensalidade/manutenção?
                  </span>
                  <span class="px-2 py-0.5 rounded bg-amber-500/15 text-[#ffc174] font-mono text-[11px] font-bold">SIM, ATIVO</span>
                </div>
                <p class="text-xs text-[#d8c3ad] leading-relaxed mt-1"><strong>Sim.</strong> O ecossistema ConectaKing não é um simples cartão descartável com link estático, mas sim uma infraestrutura digital viva. A assinatura de manutenção cobre a hospedagem ininterrupta de alta velocidade, backup contínuo de contatos, atualizações em tempo real dos seus links e dados, criptografia AES e atendimento prioritário.</p>
              </div>

              <div class="p-5 rounded-xl bg-[#181c23] border border-white/5 flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-bold text-white flex items-center gap-2">
                    <span class="material-symbols-outlined text-emerald-400 text-[18px]">all_inclusive</span>Como funcionam as opções de pagamento?
                  </span>
                  <span class="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[11px] font-bold">FLEXÍVEL</span>
                </div>
                <p class="text-xs text-[#d8c3ad] leading-relaxed mt-1">Você pode optar pelo parcelamento em 12x no cartão de crédito ou pelo valor com desconto promocional à vista via PIX (Start: R$ 350,00 | Executive: R$ 429,90 | Duo: R$ 499,00), incluindo os respectivos hardwares NFC (Tags e Pulseiras de Silicone).</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      <!-- GUARANTEE & CLOSING CTA -->
      <section class="w-full bg-[#0a0e15] py-20 relative overflow-hidden border-t border-white/5">
        <div class="max-w-5xl mx-auto px-6 lg:px-12 relative z-10 text-center flex flex-col items-center gap-6">
          <div class="flex items-center gap-2 text-white font-bold text-lg"><span class="material-symbols-outlined text-emerald-400 text-[24px]">chat</span><span>WhatsApp Oficial: +55 (11) 98878-9417</span></div>
          <div class="flex items-center gap-2 text-[#d8c3ad]"><span class="material-symbols-outlined text-[#ffc174] text-[20px]">tag</span><span>Instagram: @conectaking</span></div>
          <div class="flex items-center gap-2 text-[#d8c3ad] text-xs font-mono"><span class="material-symbols-outlined text-sky-400 text-[18px]">lock</span><span>Criptografia 256-bit • Ecossistema ConectaKing Tecnologia</span></div>
        </div>
      </section>

    </div>
  </main>

  <!-- FOOTER -->
  <footer class="w-full bg-[#0a0e15] py-8 border-t border-white/5 text-xs text-[#d8c3ad]">
    <div class="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <img src="/logo.png" onerror="this.onerror=null;this.src='https://i.ibb.co/60sW9k75/logo.png';" alt="Conecta King" class="h-7 w-auto object-contain">
        <p>&copy; 2026 ConectaKing Tecnologia. Todos os direitos reservados.</p>
      </div>
      <div class="flex items-center gap-6">
        <a href="/termos" class="hover:text-white transition-colors">Termos de Serviço</a>
        <a href="/privacidade" class="hover:text-white transition-colors">Privacidade</a>
        <a href="https://wa.me/5511988789417" target="_blank" rel="noopener noreferrer" class="text-emerald-400 font-semibold hover:underline">Suporte WhatsApp</a>
      </div>
    </div>
  </footer>

  <!-- JAVASCRIPT FOR REAL-TIME SIMULATOR, PHOTO UPLOAD, 3D TILT & BILLING TOGGLE -->
  <script>
    let currentFinish = 'gold';
    let selectedPlanName = 'King Prime NFC';
    let currentPhotoData = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
    let isUsingInitials = false;
    let currentBillingMode = 'installment'; // 'installment' ou 'pix'

    const finishStyles = {
      matte: {
        tag: 'ACABAMENTO: PRETO FOSCO NOBRE',
        cardClass: 'border-zinc-800',
        textureBg: 'linear-gradient(135deg, #090c10 0%, #161a22 50%, #21262d 100%)',
        textColor: '#dfe2ec',
        nameGlow: '0 0 12px rgba(255, 255, 255, 0.25)',
        roleColor: '#d8c3ad',
        boxShadow: 'rgba(0, 0, 0, 0.9) 0px 25px 45px -15px, rgba(255, 255, 255, 0.08) 0px 0px 25px'
      },
      gold: {
        tag: 'ACABAMENTO: DOURADO METÁLICO ESCOVADO',
        cardClass: 'border-[#fef08a]/60',
        textureBg: 'radial-gradient(ellipse at 80% 20%, rgba(245, 158, 11, 0.25) 0%, transparent 70%), linear-gradient(135deg, #1c1811 0%, #262013 40%, #17130c 100%)',
        textColor: '#ffffff',
        nameGlow: '0 0 20px rgba(245, 158, 11, 0.65)',
        roleColor: '#ffc174',
        boxShadow: 'rgba(245, 158, 11, 0.45) 0px 25px 45px -15px, rgba(245, 158, 11, 0.35) 0px 0px 35px'
      },
      carbon: {
        tag: 'ACABAMENTO: FIBRA DE CARBONO TECH',
        cardClass: 'border-emerald-500/40',
        textureBg: 'radial-gradient(#27272a 15%, transparent 16%) 0 0, radial-gradient(#27272a 15%, transparent 16%) 4px 4px, linear-gradient(135deg, #090c10 0%, #12151c 100%)',
        textColor: '#f1f5f9',
        nameGlow: '0 0 16px rgba(78, 222, 163, 0.4)',
        roleColor: '#4edea3',
        boxShadow: 'rgba(0, 0, 0, 0.9) 0px 25px 45px -15px, rgba(78, 222, 163, 0.3) 0px 0px 30px'
      }
    };

    // 3D Tilt Effect on Showroom Cards
    function handleCardTilt(e, card) {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -10;
      const rotateY = ((x - centerX) / centerX) * 10;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
      card.style.boxShadow = '0 20px 40px rgba(0,0,0,0.8), 0 0 25px rgba(245,158,11,0.3)';
    }

    function resetCardTilt(card) {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      card.style.boxShadow = '';
    }

    // Interactive Billing Mode Switcher
    function switchBillingMode(mode) {
      currentBillingMode = mode;
      const btnInstallment = document.getElementById('toggle-installment');
      const btnPix = document.getElementById('toggle-pix');

      const labelStart = document.getElementById('pricing-label-start');
      const mainStart = document.getElementById('pricing-main-start');
      const subStart = document.getElementById('pricing-sub-start');
      const ctaStart = document.getElementById('cta-link-start');

      const labelExec = document.getElementById('pricing-label-executive');
      const mainExec = document.getElementById('pricing-main-executive');
      const subExec = document.getElementById('pricing-sub-executive');
      const ctaExec = document.getElementById('cta-link-executive');

      const labelDuo = document.getElementById('pricing-label-duo');
      const mainDuo = document.getElementById('pricing-main-duo');
      const subDuo = document.getElementById('pricing-sub-duo');
      const ctaDuo = document.getElementById('cta-link-duo');

      if (mode === 'pix') {
        // Toggle Buttons Style
        btnPix.className = 'px-5 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-extrabold transition-all duration-300 flex items-center gap-2 cursor-pointer bg-gradient-to-r from-emerald-500 via-[#4edea3] to-emerald-500 text-black shadow-[0_0_20px_rgba(78,222,163,0.5)] border border-emerald-300';
        btnInstallment.className = 'px-5 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-2 cursor-pointer text-[#d8c3ad] hover:text-white hover:bg-[#262a32]';

        // START Card PIX
        labelStart.innerHTML = '<span class="text-emerald-400 font-bold">À Vista com Desconto PIX:</span>';
        mainStart.innerHTML = '<span class="text-lg font-bold">R$</span><span class="text-4xl font-extrabold text-emerald-400">350</span><span class="text-lg font-bold">,00</span><span class="ml-2 px-2 py-0.5 rounded bg-emerald-400/15 text-emerald-400 font-mono text-[10px] font-bold">Pagamento único</span>';
        subStart.innerHTML = '<span class="text-[#d8c3ad]">OU NO CARTÃO:</span><span class="font-bold text-white text-sm">12x de R$ 35,00</span>';
        ctaStart.href = 'https://wa.me/5511988789417?text=Ol%C3%A1!%20Desejo%20contratar%20o%20Pacote%201%20START%20%C3%A0%20vista%20com%20desconto%20PIX%20por%20R$%20350,00';

        // EXECUTIVE Card PIX
        labelExec.innerHTML = '<span class="text-emerald-400 font-bold">À Vista com Desconto PIX:</span>';
        mainExec.innerHTML = '<span class="text-lg font-bold">R$</span><span class="text-4xl font-black text-emerald-400">429</span><span class="text-lg font-bold">,90</span><span class="ml-2 px-2 py-0.5 rounded bg-emerald-400/15 text-emerald-400 font-mono text-[10px] font-bold">Pagamento único</span>';
        subExec.innerHTML = '<span class="text-[#d8c3ad]">OU NO CARTÃO:</span><span class="font-bold text-[#ffc174] text-sm">12x de R$ 42,00</span>';
        ctaExec.href = 'https://wa.me/5511988789417?text=Ol%C3%A1!%20Desejo%20adquirir%20o%20Pacote%202%20EXECUTIVE%20%C3%A0%20vista%20com%20desconto%20PIX%20por%20R$%20429,90';

        // DUO Card PIX
        labelDuo.innerHTML = '<span class="text-emerald-400 font-bold">À Vista com Desconto PIX:</span>';
        mainDuo.innerHTML = '<span class="text-lg font-bold">R$</span><span class="text-4xl font-extrabold text-emerald-400">499</span><span class="text-lg font-bold">,00</span><span class="ml-2 px-2 py-0.5 rounded bg-emerald-400/15 text-emerald-400 font-mono text-[10px] font-bold">Pagamento único</span>';
        subDuo.innerHTML = '<span class="text-[#d8c3ad]">OU NO CARTÃO:</span><span class="font-bold text-white text-sm">12x de R$ 49,90</span>';
        ctaDuo.href = 'https://wa.me/5511988789417?text=Ol%C3%A1!%20Desejo%20contratar%20o%20Pacote%203%20DUO%20/%20SOCIEDADE%20%C3%A0%20vista%20com%20desconto%20PIX%20por%20R$%20499,00';
      } else {
        // Toggle Buttons Style
        btnInstallment.className = 'px-5 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-extrabold transition-all duration-300 flex items-center gap-2 cursor-pointer bg-gradient-to-r from-[#d97706] via-[#fbbf24] to-[#f59e0b] text-[#1a0f00] shadow-[0_0_20px_rgba(245,158,11,0.5)] border border-[#fef08a]';
        btnPix.className = 'px-5 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-2 cursor-pointer text-[#d8c3ad] hover:text-white hover:bg-[#262a32]';

        // START Card Installment
        labelStart.textContent = 'Parcelamento Facilitado:';
        mainStart.innerHTML = '<span class="text-lg font-bold">12x de R$</span><span class="text-4xl font-extrabold text-[#ffc174]">35</span><span class="text-lg font-bold">,00</span>';
        subStart.innerHTML = '<span class="text-[#d8c3ad]">À VISTA (PIX):</span><span class="font-bold text-white text-sm">R$ 350,00</span>';
        ctaStart.href = 'https://wa.me/5511988789417?text=Ol%C3%A1!%20Desejo%20contratar%20o%20Pacote%201%20START%20(12x%20de%20R$%2035,00%20ou%20R$%20350%20PIX)';

        // EXECUTIVE Card Installment
        labelExec.textContent = 'Parcelamento Facilitado:';
        mainExec.innerHTML = '<span class="text-lg font-bold">12x de R$</span><span class="text-4xl font-black text-[#ffc174]">42</span><span class="text-lg font-bold">,00</span>';
        subExec.innerHTML = '<span class="text-[#d8c3ad]">À VISTA (PIX):</span><span class="font-bold text-[#ffc174] text-sm">R$ 429,90</span>';
        ctaExec.href = 'https://wa.me/5511988789417?text=Ol%C3%A1!%20Desejo%20adquirir%20o%20Pacote%202%20EXECUTIVE%20Mais%20Vendido%20(12x%20de%20R$%2042,00%20ou%20R$%20429,90%20PIX)';

        // DUO Card Installment
        labelDuo.textContent = 'Parcelamento Facilitado:';
        mainDuo.innerHTML = '<span class="text-lg font-bold">12x de R$</span><span class="text-4xl font-extrabold text-[#ffc174]">49</span><span class="text-lg font-bold">,90</span>';
        subDuo.innerHTML = '<span class="text-[#d8c3ad]">À VISTA (PIX):</span><span class="font-bold text-white text-sm">R$ 499,00</span>';
        ctaDuo.href = 'https://wa.me/5511988789417?text=Ol%C3%A1!%20Desejo%20contratar%20o%20Pacote%203%20DUO%20/%20SOCIEDADE%20(12x%20de%20R$%2049,90%20ou%20R$%20499%20PIX)';
      }
    }
  </script>

</body>
</html>
