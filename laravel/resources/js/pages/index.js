/** Landing — Vite entry */
import '@legacy/js/planRenderer.js';

// Detectar URL da API - mesma lógica do dashboard
        let API_URL = window.location.origin;
        
        // Se estiver em localhost com porta estática (:5500), apontar para FrankenPHP :8080
        if (API_URL.includes('127.0.0.1:5500') || API_URL.includes('localhost:5500')) {
            const protocol = window.location.protocol;
            const hostname = window.location.hostname;
            API_URL = `${protocol}//${hostname}:8080`;
            console.log('Servidor estático local detectado. Usando Laravel/FrankenPHP na porta 8080.');
        }
        
        // Em produção, mesma origem (www)
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            API_URL = 'https://www.conectaking.com.br';
        }
        
        console.log('API URL configurada:', API_URL);
        
        // Tornar API_URL disponível globalmente para planRenderer.js
        window.API_URL = API_URL;

        // Contato padrão do site (usado nos botes "Assinar agora")
        // Formato: apenas dgitos (ex.: 5511999999999)
        window.CONTACT_WHATSAPP_NUMBER = window.CONTACT_WHATSAPP_NUMBER || '5511988161364';

        // Opcional: chave PIX padrão (se a API não retornar `pix_key` no plano)
        // window.CONECTAKING_PIX_KEY = 'SUA_CHAVE_PIX_AQUI';
        
        // Mapear plan_code para account_type
        const planCodeToAccountType = {
            'basic': 'individual',
            'premium': 'individual_com_logo',
            'enterprise': 'business_owner'
        };
        
        // Calcular préos
        function calculatePrices(basePrice) {
            const pixPrice = basePrice; // Valor  vista no PIX
            const cardPrice = basePrice * 1.20; // +20% no carto (para clculo total)
            const cardPricePerMonth = cardPrice / 12; // Dividido em 12x
            const monthlyPrice = (basePrice / 12) * 1.25; // Mensal: valor/12 + 25%
            
            return {
                pix: pixPrice,
                card: cardPrice,
                cardPerMonth: cardPricePerMonth,
                monthly: monthlyPrice
            };
        }
        
        // Buscar módulos disponveis por plano
        async function loadPlanModules(planCode) {
            try {
                if (!planCode) return { available: [], unavailable: [] };
                
                const response = await fetch(`${API_URL}/api/modules/plan-availability-public`);
                if (!response.ok) return { available: [], unavailable: [] };
                
                const data = await response.json();
                const modules = data.modules || [];
                
                // Mapear todos os módulos importantes, incluindo premium
                const importantModules = {
                    'carousel': 'Carrossel',
                    'sales_page': 'Loja Virtual',
                    'digital_form': 'King Forms',
                    'portfolio': 'Portfólio',
                    'banner': 'Banner',
                    'finance': 'Gestão Financeira',
                    'contract': 'Contratos',
                    'agenda': 'Agenda Inteligente'
                };
                
                const available = [];
                const unavailable = [];
                
                // Buscar módulos usando plan_code diretamente (não account_type)
                Object.keys(importantModules).forEach(moduleType => {
                    const module = modules.find(m => m.module_type === moduleType);
                    // Usar plan_code diretamente, não account_type
                    if (module && module.plans && module.plans[planCode]?.is_available === true) {
                        available.push(importantModules[moduleType]);
                    } else {
                        unavailable.push(importantModules[moduleType]);
                    }
                });
                
                return { available, unavailable };
            } catch (error) {
                console.error('Erro ao carregar módulos:', error);
                return { available: [], unavailable: [] };
            }
        }
        
        // Carregar planos - mesma lógica do dashboard
        async function loadPlans() {
            try {
                console.log(' Tentando carregar planos de:', `${API_URL}/api/subscription/plans-public`);
                
                // Criar timeout manual para compatibilidade
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch(`${API_URL}/api/subscription/plans-public`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    cache: 'no-cache',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                console.log(' Resposta recebida:', response.status, response.statusText);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('?R Erro na resposta:', errorText);
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
                
                const data = await response.json();
                
                if (data.success && data.plans && data.plans.length > 0) {
                    // Filtrar planos: excluir King Essential (king_base)
                    const filteredPlans = data.plans.filter(plan => plan.plan_code !== 'king_base');
                    console.log(` Planos filtrados: ${filteredPlans.length} planos (excludo: King Essential)`);
                    
                    // Usar função compartilhada se disponível (garante sincronizao com dashboard)
                    if (typeof window.renderPlansShared === 'function') {
                        await window.renderPlansShared(filteredPlans, 'plans-container', false);
                    } else {
                        // Fallback: carregar módulos e usar função antiga
                        const plansWithModules = await Promise.all(filteredPlans.map(async (plan) => {
                            const modules = await loadPlanModules(plan.plan_code);
                            return { ...plan, modules };
                        }));
                        renderPlans(plansWithModules);
                    }
                    observeAllFadeIns();
                } else {
                    document.getElementById('plans-container').innerHTML = '<p style="text-align: center; grid-column: 1 / -1; color: rgba(245, 245, 245, 0.7);">Nenhum plano disponível no momento.</p>';
                }
            } catch (error) {
                console.error('?R Erro ao carregar planos:', error);
                
                let errorMessage = 'Erro ao carregar planos. ';
                let instructions = '';
                
                if (error.name === 'TimeoutError' || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    errorMessage = 'Não foi possvel conectar ao servidor.';
                    instructions = `
                        <div style="margin-top: 20px; padding: 20px; background: rgba(255, 199, 0, 0.1); border: 1px solid var(--yellow-primary); border-radius: 8px; text-align: left;">
                            <p style="color: var(--yellow-primary); font-weight: 600; margin-bottom: 12px;">
                                <i class="fas fa-info-circle"></i> Para visualizar os planos:
                            </p>
                            <ol style="color: rgba(245, 245, 245, 0.9); line-height: 1.8; padding-left: 20px;">
                                <li>Abra um terminal na pasta do projeto</li>
                                <li>Execute: <code style="background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px;">docker compose up</code></li>
                                <li>Aguarde o health em <code style="background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px;">http://localhost:8080/health</code></li>
                                <li>Recarregue esta página</li>
                            </ol>
                            <p style="color: rgba(245, 245, 245, 0.7); font-size: 0.9rem; margin-top: 12px;">
                                <strong>URL da API tentada:</strong> ${API_URL}/api/subscription/plans-public
                            </p>
                </div>
                    `;
                } else if (error.message.includes('404')) {
                    errorMessage = 'Servidor não encontrado.';
                    instructions = '<p style="color: rgba(245, 245, 245, 0.7); margin-top: 12px;">Certifique-se de que o Laravel está a correr em <code>http://localhost:8080</code>.</p>';
                } else {
                    errorMessage += 'Por favor, recarregue a página.';
                }
                
                document.getElementById('plans-container').innerHTML = `
                    <div style="text-align: center; grid-column: 1 / -1; padding: 40px; background: rgba(220, 38, 38, 0.1); border: 2px solid #DC2626; border-radius: 12px;">
                        <p style="color: #DC2626; font-size: 1.1rem; margin-bottom: 12px;">
                            <i class="fas fa-exclamation-triangle"></i> ${errorMessage}
                        </p>
                        ${instructions}
                        <button onclick="loadPlans()" class="btn btn-primary" style="margin-top: 20px; padding: 12px 24px; background: var(--yellow-primary); color: var(--black-absolute); border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                            <i class="fas fa-sync-alt"></i> Tentar Novamente
                        </button>
                    </div>
                `;
            }
        }
        
        async function renderPlans(plans) {
            // Usar função compartilhada se disponível
            if (typeof window.renderPlansShared === 'function') {
                await window.renderPlansShared(plans, 'plans-container', false);
                return;
            }
            
            // Fallback para lógica antiga
            const container = document.getElementById('plans-container');
            
            if (plans.length === 0) {
                container.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Nenhum plano disponível no momento.</p>';
                return;
            }
            
            container.innerHTML = plans.map(plan => {
                const features = plan.features || {};
                const modules = plan.modules || { available: [], unavailable: [] };
                
                const basePrice = parseFloat(plan.price);
                const prices = calculatePrices(basePrice);
                
                const isStart = plan.plan_code === 'basic';
                const isPrime = plan.plan_code === 'premium';
                const isBase = plan.plan_code === 'king_base';
                const isFinance = plan.plan_code === 'king_finance';
                const isFinancePlus = plan.plan_code === 'king_finance_plus';
                const isPremiumPlus = plan.plan_code === 'king_premium_plus';
                const isCorporate = plan.plan_code === 'enterprise' || plan.plan_code === 'king_corporate';
                const isFeatured = isPrime;
                
                // Textos personalizados para cada plano
                let ctaText = 'Coméar agora';
                let whatsappMsg = `Ol! Gostaria de adquirir o plano ${plan.plan_name} do ConectaKing!`;
                
                if (isStart) {
                    ctaText = 'Coméar agora';
                    whatsappMsg = 'Ol! Gostaria de adquirir o plano King Start do ConectaKing!';
                } else if (isPrime) {
                    ctaText = 'Quero o Prime';
                    whatsappMsg = 'Ol! Gostaria de adquirir o plano King Prime do ConectaKing!';
                } else if (isBase) {
                    ctaText = 'Quero o Essential';
                    whatsappMsg = 'Ol! Gostaria de adquirir o plano King Essential do ConectaKing!';
                } else if (isFinance) {
                    ctaText = 'Quero o Finance';
                    whatsappMsg = 'Ol! Gostaria de adquirir o plano King Finance do ConectaKing!';
                } else if (isFinancePlus) {
                    ctaText = 'Quero o Finance Plus';
                    whatsappMsg = 'Ol! Gostaria de adquirir o plano King Finance Plus do ConectaKing!';
                } else if (isPremiumPlus) {
                    ctaText = 'Quero o Premium Plus';
                    whatsappMsg = 'Ol! Gostaria de adquirir o plano King Premium Plus do ConectaKing!';
                } else if (isCorporate) {
                    ctaText = 'Ativar modo empresa';
                    whatsappMsg = 'Ol! Gostaria de adquirir o plano King Corporate do ConectaKing!';
                } else {
                    // Plano genrico
                    ctaText = `Quero o ${plan.plan_name}`;
                    whatsappMsg = `Ol! Gostaria de adquirir o plano ${plan.plan_name} do ConectaKing!`;
                }
                
                // Usar mensagem personalizada do plano se existir, senão usar a padrão
                const finalWhatsappMessage = plan.whatsapp_message || whatsappMsg;
                // Usar número do plano se existir, senão usar número padrão
                const whatsappNumber = plan.whatsapp_number || '5511999999999';
                
                return `
                    <div class="pricing-card ${isFeatured ? 'featured' : ''} fade-in">
                        <div class="plan-name">${plan.plan_name}</div>
                        <div class="plan-price-section">
                            <div class="plan-price-main">
                                <span class="currency">R$</span>${basePrice.toFixed(2).replace('.', ',')}
                            </div>
                            <div class="payment-options">
                                <div class="payment-option">
                                    <span><strong>PIX:</strong>  vista</span>
                                    <span class="value">R$ ${prices.pix.toFixed(2).replace('.', ',')}</span>
                                </div>
                                <div class="payment-option">
                                    <span><strong>Carto:</strong> At 12x</span>
                                    <span class="value">R$ ${prices.cardPerMonth.toFixed(2).replace('.', ',')}/m</span>
                                </div>
                                <div class="payment-option">
                                    <span><strong>Mensal:</strong> Recorrente</span>
                                    <span class="value">R$ ${prices.monthly.toFixed(2).replace('.', ',')}/m</span>
                                </div>
                            </div>
                        </div>
                        <p class="plan-description">${plan.description || ''}</p>
                        <ul class="plan-features">
                            ${features.can_edit_logo ? '<li><i class="fas fa-check"></i> Logomarca editável</li>' : '<li><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4);"></i> Logomarca não editável</li>'}
                            ${features.max_profiles ? `<li><i class="fas fa-check"></i> ${features.max_profiles} perfil(is)</li>` : ''}
                            ${features.is_enterprise ? '<li><i class="fas fa-check"></i> Modo Empresarial</li>' : ''}
                            
                            ${isStart ? `
                            <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 199, 0, 0.2);">
                                <strong style="color: var(--yellow-primary); font-size: 0.95rem;">• Você tem acesso a todos os módulos, menos estes que estão abaixo:</strong>
                            </li>
                            <li style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255, 199, 0, 0.1);">
                                <strong style="color: rgba(245, 245, 245, 0.6); font-size: 0.9rem;">• Não Incluído:</strong>
                            </li>
                            ${!features.can_edit_logo ? '<li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> Logomarca editável</li>' : ''}
                            ${modules.unavailable.map(module => `<li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> ${module}</li>`).join('')}
                            <li style="padding-left: 8px; opacity: 0.8; margin-top: 8px; color: var(--yellow-primary);">
                                <i class="fas fa-gift" style="color: var(--yellow-primary); margin-right: 8px;"></i> <strong>Bnus:</strong> Link Personalizado
                            </li>
                            ` : ''}
                            
                            ${isPrime && modules.available.length > 0 ? `
                            <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 199, 0, 0.2);">
                                <strong style="color: var(--yellow-primary); font-size: 0.9rem;">• Módulos Incluídos:</strong>
                            </li>
                            ${modules.available.map(module => `<li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> ${module}</li>`).join('')}
                            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Link Personalizado</li>
                            ` : ''}
                            
                            ${isCorporate ? `
                            <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 199, 0, 0.2);">
                                <strong style="color: var(--yellow-primary); font-size: 0.9rem;">• Todos os Módulos Disponíveis:</strong>
                            </li>
                            ${modules.available.length > 0 ? modules.available.map(module => `<li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> ${module}</li>`).join('') : ''}
                            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Link Personalizado</li>
                            <li style="padding-left: 8px; margin-top: 4px; font-size: 0.9rem; color: rgba(245, 245, 245, 0.6);">
                                <i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> E todos os outros módulos
                            </li>
                            ` : ''}
                    </ul>
                    <a href="https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(finalWhatsappMessage)}" target="_blank" class="btn btn-primary" style="width: 100%; margin-top: 20px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <i class="fab fa-whatsapp"></i> ${ctaText}
                    </a>
                </div>
                `;
            }).join('');
            
            observeAllFadeIns();
        }
        
        // Observer global para animar todos os .fade-in (Como Funciona, Benefícios, Aplicativo, Planos)
        var fadeInObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) entry.target.classList.add('visible');
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
        function observeAllFadeIns() {
            document.querySelectorAll('.fade-in').forEach(function(el) { fadeInObserver.observe(el); });
        }
        observeAllFadeIns();

        // FAQ Accordion
        document.querySelectorAll('.faq-question').forEach(question => {
            question.addEventListener('click', () => {
                const item = question.closest('.faq-item');
                const answer = item.querySelector('.faq-answer');
                const icon = question.querySelector('i');
                const isActive = item.classList.contains('active');
                
                // Fechar todos
                document.querySelectorAll('.faq-item').forEach(i => {
                    i.classList.remove('active');
                    i.querySelector('.faq-answer').style.maxHeight = '0';
                    i.querySelector('.faq-question i').style.transform = 'rotate(0deg)';
                });
                
                // Abrir o clicado se não estava ativo
                if (!isActive) {
                    item.classList.add('active');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                    icon.style.transform = 'rotate(180deg)';
                }
            });
        });
        
        // PWA: instalao direta no clique quando o Chrome permitir
        let deferredPrompt = null;
        window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            deferredPrompt = e;
            var lbl = document.getElementById('android-install-label');
            if (lbl) lbl.textContent = 'Instalar agora (1 toque)';
        });
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register(new URL('sw.js', window.location.href).href).catch(function() {});
        }
        function installPWA(platform) {
            if (platform === 'android' && deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(function(choice) {
                    if (choice.outcome === 'accepted') deferredPrompt = null;
                });
                return;
            }
            if (platform === 'android') {
                showInstallHint('android');
                return;
            }
            if (platform === 'ios') {
                showInstallHint('ios');
                return;
            }
        }
        function showInstallHint(platform) {
            var msg = platform === 'android'
                ? 'Neste momento o Chrome não mostrou a instalao direta. Toque no cone "Abrir na app" na barra de enderéo (ao lado da estrela) para instalar. Ou use o menu ?9? ?  "Adicionar  tela inicial".'
                : '1) Abra este site no Safari (se estiver em outro app, copie o link e cole no Safari).<br>2) Toque no cone de Compartilhar (quadrado com seta) na barra inferior.<br>3) Role e toque em "Adicionar  Tela de Incio".';
            var isIos = platform === 'ios';
            var box = document.getElementById('install-hint-box');
            if (box) {
                box.querySelector('.install-hint-msg').innerHTML = msg;
                var wrap = box.querySelector('.install-hint-buttons');
                if (wrap) wrap.remove();
                var btns = document.createElement('div');
                btns.className = 'install-hint-buttons';
                if (isIos) {
                    var copyBtn = document.createElement('button');
                    copyBtn.type = 'button';
                    copyBtn.className = 'btn btn-primary install-copy-link-btn';
                    copyBtn.style.marginBottom = '10px';
                    copyBtn.innerHTML = '<i class="fas fa-link"></i> Copiar link (abrir no Safari)';
                    copyBtn.onclick = function() {
                        try {
                            navigator.clipboard.writeText(window.location.href);
                            copyBtn.innerHTML = '<i class="fas fa-check"></i> Link copiado! Cole no Safari.';
                        } catch (e) {}
                    };
                    btns.appendChild(copyBtn);
                }
                var okBtn = document.createElement('button');
                okBtn.type = 'button';
                okBtn.className = 'install-hint-ok btn btn-primary';
                okBtn.textContent = 'OK';
                okBtn.onclick = function() { box.classList.remove('show'); };
                btns.appendChild(okBtn);
                box.appendChild(btns);
                box.classList.add('show');
                return;
            }
            box = document.createElement('div');
            box.id = 'install-hint-box';
            box.className = 'install-hint-box';
            box.innerHTML = '<div class="install-hint-inner"><p class="install-hint-msg">' + msg + '</p><div class="install-hint-buttons"></div></div>';
            var inner = box.querySelector('.install-hint-inner');
            var okBtn = document.createElement('button');
            okBtn.type = 'button';
            okBtn.className = 'install-hint-ok btn btn-primary';
            okBtn.textContent = 'OK';
            okBtn.onclick = function() { box.classList.remove('show'); };
            if (isIos) {
                var copyBtn = document.createElement('button');
                copyBtn.type = 'button';
                copyBtn.className = 'btn btn-primary install-copy-link-btn';
                copyBtn.style.marginBottom = '10px';
                copyBtn.innerHTML = '<i class="fas fa-link"></i> Copiar link (abrir no Safari)';
                copyBtn.onclick = function() {
                    try {
                        navigator.clipboard.writeText(window.location.href);
                        copyBtn.innerHTML = '<i class="fas fa-check"></i> Link copiado! Cole no Safari.';
                    } catch (e) {}
                };
                inner.querySelector('.install-hint-buttons').appendChild(copyBtn);
            }
            inner.querySelector('.install-hint-buttons').appendChild(okBtn);
            document.body.appendChild(box);
            box.classList.add('show');
        }

        // Carregar planos ao carregar a página
        loadPlans();
        
        // CTA Fixo Mobile
        const ctaFixed = document.getElementById('cta-fixed-mobile');
        if (ctaFixed) {
            let lastScroll = 0;
            
            window.addEventListener('scroll', () => {
                const currentScroll = window.pageYOffset;
                
                if (window.innerWidth <= 768) {
                    if (currentScroll > 300 && currentScroll < lastScroll) {
                        ctaFixed.style.display = 'block';
                    } else if (currentScroll < 100) {
                        ctaFixed.style.display = 'none';
                    }
                } else {
                    ctaFixed.style.display = 'none';
                }
                
                lastScroll = currentScroll;
            });
        }

// Verificar se usuário est logado e ajustar botes do header e footer
        (function() {
            const user = JSON.parse(localStorage.getItem('conectaKingUser') || 'null');
            const token = localStorage.getItem('conectaKingToken');
            const loginBtn = document.getElementById('login-btn');
            const accessPanelBtn = document.getElementById('access-panel-btn');
            const sairBtn = document.getElementById('landing-sair-btn');
            const footerLoginItem = document.getElementById('footer-login-item');
            const footerAccessPanelItem = document.getElementById('footer-access-panel-item');
            
            // Verificar se user  válido (não null, não string 'null')
            const isLoggedIn = user && user !== 'null' && user !== null && typeof user === 'object' && token && token !== 'null' && token !== '';
            
            function clearAuthStorage() {
                ['conectaKingToken', 'conectaKingUser', 'token', 'refreshToken', 'user', 'dashboard_last_pane'].forEach(function (k) {
                    try { localStorage.removeItem(k); } catch (e) {}
                    try { sessionStorage.removeItem(k); } catch (e2) {}
                });
            }
            
            function doLogout() {
                if (!window.confirm('Sair desta conta? Pode entrar com outro utilizador em seguida.')) return;
                var rt = null;
                try {
                    rt = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
                } catch (e) {}
                var base = 'https://www.conectaking.com.br';
                function done() {
                    clearAuthStorage();
                    window.location.reload();
                }
                if (rt) {
                    fetch(base + '/api/auth/logout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refreshToken: rt }),
                        credentials: 'omit'
                    }).catch(function () {}).finally(done);
                } else {
                    done();
                }
            }
            
            if (sairBtn) {
                sairBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    doLogout();
                });
            }
            
            if (isLoggedIn) {
                // Usuário est logado - mostrar "Acessar Painel", "Sair" e esconder "Login"
                if (loginBtn) {
                    loginBtn.style.display = 'none';
                    loginBtn.style.setProperty('display', 'none', 'important');
                }
                if (sairBtn) {
                    sairBtn.style.display = 'inline-flex';
                    sairBtn.style.setProperty('display', 'inline-flex', 'important');
                }
                if (accessPanelBtn) {
                    accessPanelBtn.style.display = 'inline-flex';
                    accessPanelBtn.style.setProperty('display', 'inline-flex', 'important');
                }
                if (footerLoginItem) {
                    footerLoginItem.style.display = 'none';
                }
                if (footerAccessPanelItem) {
                    footerAccessPanelItem.style.display = 'block';
                }
            } else {
                // Usuário não est logado - mostrar "Login" e esconder "Acessar Painel" e "Sair"
                if (loginBtn) {
                    loginBtn.style.display = 'inline-flex';
                    loginBtn.style.setProperty('display', 'inline-flex', 'important');
                }
                if (sairBtn) {
                    sairBtn.style.display = 'none';
                    sairBtn.style.setProperty('display', 'none', 'important');
                }
                if (accessPanelBtn) {
                    accessPanelBtn.style.display = 'none';
                    accessPanelBtn.style.setProperty('display', 'none', 'important');
                }
                if (footerLoginItem) {
                    footerLoginItem.style.display = 'block';
                }
                if (footerAccessPanelItem) {
                    footerAccessPanelItem.style.display = 'none';
                }
            }
            
            // Garantir que "Criar Acesso" sempre esteja visvel
            const createAccountBtn = document.getElementById('create-account-btn');
            if (createAccountBtn) {
                createAccountBtn.style.display = 'inline-flex';
                createAccountBtn.style.setProperty('display', 'inline-flex', 'important');
            }
        })();
