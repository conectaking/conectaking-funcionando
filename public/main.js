document.addEventListener('DOMContentLoaded', () => {
    // Animação de revelar ao rolar
    const revealElements = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    revealElements.forEach(el => observer.observe(el));

    // Galeria de exemplos
    const galleryImages = document.querySelectorAll('.showcase-gallery img');
    galleryImages.forEach(img => {
        img.addEventListener('mouseenter', () => {
            galleryImages.forEach(i => {
                i.classList.remove('main-showcase-img');
                i.style.filter = 'brightness(0.7)';
                i.style.transform = 'scale(0.95)';
            });
            img.classList.add('main-showcase-img');
            img.style.filter = 'brightness(1)';
            img.style.transform = 'scale(1.15)';
        });
    });

    const gallery = document.querySelector('.showcase-gallery');
    if (gallery) {
        gallery.addEventListener('mouseleave', () => {
            galleryImages.forEach((img, index) => {
                if (index === 1) {
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

    // Checkout/Mercado Pago fora de escopo: se ainda existir o container legado, mostra CTA de login/painel.
    const container = document.getElementById('wallet-brick-container');
    if (!container) return;

    (async function () {
        const token = localStorage.getItem('conectaKingToken');
        let user = null;
        try {
            const userStr = localStorage.getItem('conectaKingUser');
            if (userStr) user = JSON.parse(userStr);
        } catch (e) {
            user = null;
        }

        if (token && user) {
            container.innerHTML = '<a href="/dashboard" class="btn btn-secondary btn-full">Acessar Painel</a>';
            return;
        }

        try {
            const r = await fetch('/api/account/status', {
                credentials: 'include',
                headers: { Accept: 'application/json' },
                cache: 'no-store',
            });
            if (r.ok) {
                try { localStorage.setItem('conectaKingSession', '1'); } catch (e) {}
                container.innerHTML = '<a href="/dashboard" class="btn btn-secondary btn-full">Acessar Painel</a>';
                return;
            }
        } catch (e) {}

        container.innerHTML = '<a href="/login" class="btn btn-primary btn-full">Fazer Login</a>';
    })();
});
