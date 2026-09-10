document.addEventListener('DOMContentLoaded', () => {
    const loggedOutState = document.querySelector('.logged-out-state');
    const loggedInState = document.querySelector('.logged-in-state');
    const userProfileBtn = document.getElementById('user-profile-btn');
    const logoutBtnGlobal = document.getElementById('logout-btn-global');
    const logoutBtnDashboard = document.getElementById('logout-btn');
    const themeToggleBtns = document.querySelectorAll('#theme-toggle');
    

    const handleLogout = () => {
        localStorage.removeItem('conectaKingToken');
        localStorage.removeItem('conectaKingUser');
        window.location.href = '/';
    };

    const applyTheme = (theme) => {
        if (theme === 'light') {
            document.body.classList.add('light-theme');
            themeToggleBtns.forEach(btn => {
                const icon = btn.querySelector('i');
                if (icon) icon.className = 'fas fa-moon';
            });
        } else {
            document.body.classList.remove('light-theme');
            themeToggleBtns.forEach(btn => {
                const icon = btn.querySelector('i');
                if (icon) icon.className = 'fas fa-sun';
            });
        }
    };
    
    /**
     * Atualiza a interface do usuário (navbar) com base nos dados do usuário.
     * @param {object | null} user - O objeto do usuário ou null se estiver deslogado.
     */
const updateNavUI = (user) => {
    if (user) {
        // Usuário está logado
        if (loggedOutState) loggedOutState.style.display = 'none';
        if (loggedInState) loggedInState.style.display = 'flex';

        const meuPainelBtn = document.querySelector('.logged-in-state a[href="/dashboard"], .logged-in-state a[href="dashboard.html"]');
        
        if (meuPainelBtn) {
            if (user.accountType === 'free') {
                meuPainelBtn.style.display = 'none';
            } else {
                meuPainelBtn.style.display = 'inline-flex';
            }
        }

        const avatarImg = document.getElementById('navbar-user-avatar');
        const DEFAULT_AVATAR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNzUiIGN5PSI3NSIgcj0iNzAiIGZpbGw9IiMzMzMzMzMiLz48dGV4dCB4PSI3NSIgeT0iODUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI0MCI+8J+RiDwvdGV4dD48L3N2Zz4=';
        if (avatarImg && user.profileImageUrl) {
            avatarImg.src = user.profileImageUrl;
            avatarImg.onerror = function() {
                this.onerror = null;
                this.src = DEFAULT_AVATAR_PLACEHOLDER;
            };
        } else if (avatarImg) {
            avatarImg.src = DEFAULT_AVATAR_PLACEHOLDER;
        }

    } else {
        if (loggedOutState) loggedOutState.style.display = 'flex';
        if (loggedInState) loggedInState.style.display = 'none';
    }

    displayExpirationBanner(user);
};

    const displayExpirationBanner = (user) => {
    if (window.location.pathname.includes('/admin/') || window.location.pathname.includes('/business/')) {
        return;
    }
    
    const existingBanner = document.getElementById('expiration-banner');
    if (existingBanner) existingBanner.remove();
    document.body.classList.remove('expiration-banner-visible');

    if (user && user.subscriptionExpiresAt) {
        const expiresDate = new Date(user.subscriptionExpiresAt);
        const today = new Date();
        const diffTime = expiresDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 7 && diffDays >= 0) {
            const banner = document.createElement('div');
            banner.id = 'expiration-banner';
            banner.className = 'expiration-banner';

            const numeroWhatsapp = '+5511988161364';
            const textoWhatsapp = `Ol%C3%A1%21%20Gostaria%20de%20renovar%20minha%20assinatura%20do%20Conecta%20King.`;
            const linkWhatsapp = `https://api.whatsapp.com/send?phone=${numeroWhatsapp}&text=${textoWhatsapp}`;
            
            banner.innerHTML = `
                <span class="expiration-banner-text">Sua assinatura expira em ${diffDays} dia(s)! Renove agora para não perder o acesso.</span>
                <a href="${linkWhatsapp}" target="_blank" class="btn-renew">Renovar Agora</a>
            `;

            // Adiciona o banner no topo da página e a classe no body
            document.body.prepend(banner);
            document.body.classList.add('expiration-banner-visible');
        }
    }
};

    const checkUserStatus = async () => {
        const token = localStorage.getItem('conectaKingToken');
        let localUser = null;
        try {
            const userStr = localStorage.getItem('conectaKingUser');
            if (userStr) {
                localUser = JSON.parse(userStr);
            }
        } catch (e) {
            console.error('Erro ao parsear dados do usuário:', e);
            localUser = null;
        }

        // Cookie-first: sem JWT no LS ainda pode haver sessão HttpOnly
        if (!token || !localUser) {
            try {
                const statusApiBase = (typeof window !== 'undefined' && (window.API_URL || window.API_BASE))
                    ? String(window.API_URL || window.API_BASE).replace(/\/$/, '')
                    : (window.location && window.location.origin) || '';
                let ok = false;
                if (window.CkAuth && typeof window.CkAuth.probeCookieAuth === 'function') {
                    ok = await window.CkAuth.probeCookieAuth();
                } else {
                    const probe = await fetch(`${statusApiBase}/api/account/status`, {
                        credentials: 'include',
                        headers: { Accept: 'application/json' },
                        cache: 'no-store'
                    });
                    ok = probe.ok;
                    if (ok) {
                        const freshUser = await probe.json();
                        try { localStorage.setItem('conectaKingUser', JSON.stringify(freshUser)); } catch (e) {}
                        try { localStorage.setItem('conectaKingSession', '1'); } catch (e) {}
                        updateNavUI(freshUser);
                        return freshUser;
                    }
                }
                if (ok) {
                    const response = await fetch(`${statusApiBase}/api/account/status`, {
                        credentials: 'include',
                        headers: { Accept: 'application/json' }
                    });
                    if (response.ok) {
                        const freshUser = await response.json();
                        try { localStorage.setItem('conectaKingUser', JSON.stringify(freshUser)); } catch (e) {}
                        updateNavUI(freshUser);
                        return freshUser;
                    }
                }
            } catch (e) {}
            updateNavUI(null);
            return;
        }

        try {
            // Verificar se há cooldown ativo para evitar muitas requisições
            const now = Date.now();
            const lastStatusCheck = localStorage.getItem('lastStatusCheck');
            const STATUS_CHECK_COOLDOWN = 5000; // 5 segundos entre verificações
            
            if (lastStatusCheck && (now - parseInt(lastStatusCheck)) < STATUS_CHECK_COOLDOWN) {
                console.log('⏳ Cooldown ativo para verificação de status. Usando dados locais.');
                const localUserCooldown = JSON.parse(localStorage.getItem('conectaKingUser') || 'null');
                if (localUserCooldown) {
                    updateNavUI(localUserCooldown);
                    return localUserCooldown;
                }
                return null;
            }
            
            localStorage.setItem('lastStatusCheck', now.toString());

            const statusApiBase = (typeof window !== 'undefined' && (window.API_URL || window.API_BASE))
                ? String(window.API_URL || window.API_BASE).replace(/\/$/, '')
                : 'https://www.conectaking.com.br';
            const headers = { Accept: 'application/json' };
            if (token) headers.Authorization = `Bearer ${token}`;
            const response = await fetch(`${statusApiBase}/api/account/status`, {
                credentials: 'include',
                headers
            });

            if (response.status === 401) {
                // JWT no LS pode estar stale — tentar cookie HttpOnly antes de expulsar
                try {
                    localStorage.removeItem('conectaKingToken');
                    const probe = await fetch(`${statusApiBase}/api/account/status`, {
                        credentials: 'include',
                        headers: { Accept: 'application/json' },
                        cache: 'no-store'
                    });
                    if (probe.ok) {
                        const freshUser = await probe.json();
                        try { localStorage.setItem('conectaKingUser', JSON.stringify(freshUser)); } catch (e) {}
                        try { localStorage.setItem('conectaKingSession', '1'); } catch (e) {}
                        updateNavUI(freshUser);
                        return freshUser;
                    }
                } catch (e) {}
                handleLogout();
                return;
            }

            // Tratar 429 (Rate Limit) especificamente
            if (response.status === 429) {
                console.warn('Rate limit atingido na verificação de status. Usando dados locais.');
                updateNavUI(localUser);
                return localUser;
            }

            if (!response.ok) {
                // Outro erro de servidor, usa os dados locais como fallback
                throw new Error('Falha ao verificar status, usando dados locais.');
            }

            const freshUser = await response.json();
            
            // Compara o tipo de conta local com o do servidor
            if (localUser.accountType !== freshUser.account_type) {
                console.log('Status da conta atualizado! Sincronizando localStorage.');
                // Atualiza o localStorage com os dados novos do servidor
                localStorage.setItem('conectaKingUser', JSON.stringify(freshUser));
            }
            
            // Atualiza a UI com os dados mais recentes do servidor
            updateNavUI(freshUser);

        } catch (error) {
            // Tratar erro 429 especificamente
            if (error.status === 429 || (error.message && error.message.includes('429'))) {
                console.warn('Rate limit atingido. Usando dados locais.');
            } else {
                console.warn(error.message || 'Erro ao verificar status');
            }
            // Se a API falhar, usa os dados antigos do localStorage para não quebrar a UI
            updateNavUI(localUser);
        }
    };


    // --- INICIALIZA—fO ---

    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        applyTheme(currentTheme);
    }
    
    themeToggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            let theme = document.body.classList.contains('light-theme') ? 'dark' : 'light';
            localStorage.setItem('theme', theme);
            applyTheme(theme);
        });
    });
    
    // Configuração dos dropdowns e botões de logout
    if (userProfileBtn) {
        const dropdown = userProfileBtn.querySelector('.profile-dropdown');
        if (dropdown) {
            userProfileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('active');
            });
        }
    }
    document.addEventListener('click', () => {
        const activeDropdown = document.querySelector('.profile-dropdown.active');
        if (activeDropdown) activeDropdown.classList.remove('active');
    });
    if (logoutBtnGlobal) logoutBtnGlobal.addEventListener('click', handleLogout);
    if (logoutBtnDashboard) logoutBtnDashboard.addEventListener('click', handleLogout);

    // PONTO DE ENTRADA PRINCIPAL: Inicia a verificação de status
    checkUserStatus();
});