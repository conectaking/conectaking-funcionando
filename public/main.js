document.addEventListener('DOMContentLoaded', () => {

    // --- ANIMAÃ‡ÃƒO DE REVELAR AO ROLAR ---
    const revealElements = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    revealElements.forEach(el => observer.observe(el));

    // --- NOVA ANIMAÃ‡ÃƒO PARA A GALERIA DE EXEMPLOS ---
    const galleryImages = document.querySelectorAll('.showcase-gallery img');
    galleryImages.forEach(img => {
        img.addEventListener('mouseenter', () => {
            // Remove o destaque de todas as imagens
            galleryImages.forEach(i => {
                i.classList.remove('main-showcase-img');
                i.style.filter = 'brightness(0.7)';
                i.style.transform = 'scale(0.95)';
            });
            // Adiciona o destaque na imagem que o mouse está sobre
            img.classList.add('main-showcase-img');
            img.style.filter = 'brightness(1)';
            img.style.transform = 'scale(1.15)';
        });
    });

    // Opcional: Efeito para o mouse sair da galeria e resetar
    const gallery = document.querySelector('.showcase-gallery');
    if(gallery) {
        gallery.addEventListener('mouseleave', () => {
             galleryImages.forEach((img, index) => {
                // Reseta a imagem do meio para ser a principal
                if(index === 1) { // A segunda imagem (índice 1) é a central
                     img.classList.add('main-showcase-img');
                     img.style.filter = 'brightness(1)';
                     img.style.transform = 'scale(1.15)';
                } else {
                     img.classList.remove('main-showcase-img');
                     img.style.filter = 'brightness(0.7)';
                     img.style.transform = 'scale(1)';
                }
            });
        });
    }

const initializePayment = async () => {
    const token = localStorage.getItem('conectaKingToken');
    let user = null;
    try {
        const userStr = localStorage.getItem('conectaKingUser');
        if (userStr) {
            user = JSON.parse(userStr);
        }
    } catch (e) {
        console.error('Erro ao parsear dados do usuário:', e);
        user = null;
    }
    const container = document.getElementById('wallet-brick-container');

    if (!container) return; 

    if (token && user) {
        // Cenário 1: Usuário está LOGADO

        if (user.accountType === 'individual' || user.accountType === 'business_owner') {
            // Se o usuário JÃ TEM um plano pago, mostra o botão "Acessar Painel"
            container.innerHTML = `<a href="dashboard.html" class="btn btn-secondary btn-full">Acessar Painel</a>`;
            return;
        }

        // Se o usuário está logado mas é 'free' ou 'team_member', tenta renderizar o botão de pagamento
        try {
            const preferenceResponse = await fetch('https://www.conectaking.com.br/api/payment/create-preference', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!preferenceResponse.ok) {
                const errorText = await preferenceResponse.text();
                throw new Error(`Erro ${preferenceResponse.status}: ${errorText}`);
            }

            const preferenceData = await preferenceResponse.json();

            const mp = new MercadoPago('APP_USR-d6de5ac3-9132-457d-8556-15841077ca1f', { locale: 'pt-BR' });
            const bricksBuilder = mp.bricks();

            await bricksBuilder.create("wallet", "wallet-brick-container", {
                initialization: { preferenceId: preferenceData.preferenceId },
                customization: { texts: { valueProp: 'smart_option', action: 'Pagar R$19.99/mês' } },
            });

        } catch (error) {
            // Cenário de Erro: Se a API falhar, mostra uma mensagem de erro útil
            console.error("Erro ao inicializar pagamento:", error);
            container.innerHTML = `<p class="payment-error">Não foi possível carregar o botão de pagamento. Tente recarregar a página.</p>`;
        }
    } else {
        // Cenário 2: Usuário está DESLOGADO
        container.innerHTML = `<a href="login.html" class="btn btn-primary btn-full">Fazer Login para Assinar</a>`;
    }
};

     initializePayment();

});