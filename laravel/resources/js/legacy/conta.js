document.addEventListener('DOMContentLoaded', async () => {
    let token = localStorage.getItem('conectaKingToken') || '';
    if (!token) {
        try {
            const r = await fetch('/api/account/status', { credentials: 'include', headers: { Accept: 'application/json' }, cache: 'no-store' });
            if (!r.ok) {
                window.location.href = '/login';
                return;
            }
            try { localStorage.setItem('conectaKingSession', '1'); } catch (e) {}
        } catch (e) {
            window.location.href = '/login';
            return;
        }
    }

    const API_URL = String(window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || window.location.origin).replace(/\/$/, '');
    const HEADERS_JSON = { 'Content-Type': 'application/json' };
    const HEADERS_AUTH = {};
    if (token) {
        HEADERS_JSON.Authorization = `Bearer ${token}`;
        HEADERS_AUTH.Authorization = `Bearer ${token}`;
    }

    const photoUploadArea = document.getElementById('photo-upload-area');
    const photoPreview = document.getElementById('profile-photo-preview');
    const photoFileInput = document.getElementById('photo-file-input');
    const displayNameInput = document.getElementById('displayName');
    const profileForm = document.getElementById('profile-form');
    const profileMessage = document.getElementById('profile-message');
    const userIdInput = document.getElementById('user-id'); 
    const passwordForm = document.getElementById('password-form');
    const passwordMessage = document.getElementById('password-message');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const contentPanes = document.querySelectorAll('.content-pane');

    let newProfileImageUrl = null;


    async function loadProfileData() {
        try {
            const response = await fetch(`${API_URL}/api/profile`, { credentials: 'include', headers: HEADERS_JSON });
            if (!response.ok) throw new Error('Falha ao carregar dados do perfil.');
            
            const data = await response.json();
            const details = data?.details || data || {};
            
            if (displayNameInput) displayNameInput.value = details.display_name || '';
            const DEFAULT_AVATAR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNzUiIGN5PSI3NSIgcj0iNzAiIGZpbGw9IiMzMzMzMzMiLz48dGV4dCB4PSI3NSIgeT0iODUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI0MCI+8J+RiDwvdGV4dD48L3N2Zz4=';
            if (photoPreview) {
                photoPreview.src = details.profile_image_url || DEFAULT_AVATAR_PLACEHOLDER;
                photoPreview.onerror = function() {
                    this.onerror = null;
                    this.src = DEFAULT_AVATAR_PLACEHOLDER;
                };
            }
            newProfileImageUrl = details.profile_image_url;
            if (userIdInput) userIdInput.value = details.id || '';
        } catch (error) {
            if (profileMessage) {
            showMessage(profileMessage, error.message, 'error');
            } else {
                console.error('Erro ao carregar perfil:', error);
            }
        }
    }

async function loadSubscriptionData() {
    try {
        const response = await fetch(`${API_URL}/api/account/status`, { credentials: 'include', headers: HEADERS_JSON });
        if (!response.ok) throw new Error('Falha ao carregar dados da assinatura.');
        
        const sub = await response.json();

        const planNameEl = document.getElementById('plan-name');
        const planStatusEl = document.getElementById('plan-status');
        const planDetailsEl = document.getElementById('plan-details');
        const renewButton = document.getElementById('renew-button');

        if (!planNameEl || !planStatusEl || !planDetailsEl) {
            console.warn('Elementos de assinatura não encontrados no DOM');
            return;
        }

        if (sub.accountType === 'individual' || sub.accountType === 'business_owner') {
            planNameEl.textContent = 'Individual';
            const s = (sub.subscriptionStatus || '').toLowerCase();
            planStatusEl.textContent = (s === 'active' || s === 'active_onetime' || s === 'pre_sale_trial') ? 'Ativo' : (s === 'expired' || s === 'expired_trial') ? 'Expirado' : (sub.subscriptionStatus || 'Ativo');

            if (sub.subscriptionExpiresAt) {
                const expiresDate = new Date(sub.subscriptionExpiresAt);
                const today = new Date();
                const diffTime = expiresDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                planDetailsEl.textContent = `Sua assinatura expira em ${expiresDate.toLocaleDateString('pt-BR')}.`;

                if (diffDays <= 7) {
                    planDetailsEl.textContent += ` (Faltam ${diffDays} dias)`;
                    planDetailsEl.style.color = 'var(--highlight-primary)'; 
                    if (renewButton) renewButton.style.display = 'inline-block'; 
                }
            } else {
                planDetailsEl.textContent = 'Sua conta não possui uma data de expiração definida.';
            }
        } else {
            planNameEl.textContent = 'Free';
            planStatusEl.textContent = 'N/A';
            planDetailsEl.innerHTML = 'Faça um upgrade para ter acesso a todos os recursos. <a href="/#planos">Ver Planos</a>';
        }
    } catch (error) {
        console.error('Erro ao carregar assinatura:', error);
    }
}

    async function handlePhotoUpload(file) {
        if (!photoUploadArea) return;
        
        photoUploadArea.classList.add('is-uploading');
        try {
            const authResponse = await fetch(`${API_URL}/api/upload/auth`, { method: 'POST', headers: HEADERS_AUTH });
            if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');
            const { uploadURL, imageId } = await authResponse.json();

            const formData = new FormData();
            formData.append('file', file);
            const uploadResponse = await fetch(uploadURL, { method: 'POST', body: formData });
            if (!uploadResponse.ok) throw new Error('Falha no upload para o Cloudflare.');
            const uploadData = await uploadResponse.json();
            
            const accountHash = "MBdqwyqeFtFBvKiQjgzjtQ"; // Lembre-se de colocar seu Account Hash aqui
            const finalUrl = `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public`;

            if (photoPreview) photoPreview.src = finalUrl;
            newProfileImageUrl = finalUrl;
            if (profileMessage) {
            showMessage(profileMessage, 'Pré-visualização atualizada. Salve as alterações para confirmar.', 'success');
            }

        } catch (error) {
            if (profileMessage) {
            showMessage(profileMessage, error.message, 'error');
            }
        } finally {
            if (photoUploadArea) {
            photoUploadArea.classList.remove('is-uploading');
            }
        }
    }

    async function saveProfileChanges(e) {
        e.preventDefault();
        const payload = {
            displayName: displayNameInput.value,
            profileImageUrl: newProfileImageUrl
        };
        try {
            const response = await fetch(`${API_URL}/api/profile/details`, {
                method: 'PUT',
                headers: HEADERS_JSON,
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Falha ao salvar o perfil.');
            showMessage(profileMessage, data.message, 'success');
        } catch (error) {
            showMessage(profileMessage, error.message, 'error');
        }
    }

    async function savePasswordChanges(e) {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const payload = { currentPassword, newPassword };
        try {
            const response = await fetch(`${API_URL}/api/account/password`, {
                method: 'PUT',
                headers: HEADERS_JSON,
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Falha ao alterar a senha.');
            showMessage(passwordMessage, data.message, 'success');
            passwordForm.reset();
        } catch (error) {
            showMessage(passwordMessage, error.message, 'error');
        }
    }
    
    function showMessage(element, msg, type) {
        if (!element) {
            console.error('Elemento não encontrado para mostrar mensagem:', msg);
            return;
        }
        element.textContent = msg;
        element.className = `message ${type}`;
        setTimeout(() => {
            if (element) {
            element.textContent = '';
            element.className = 'message';
            }
        }, 3000);
    }

    // --- 4. EVENT LISTENERS ---

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            sidebarLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const targetId = link.getAttribute('data-target');
            contentPanes.forEach(pane => pane.classList.toggle('active', pane.id === targetId));
        });
    });

    photoUploadArea.addEventListener('click', () => photoFileInput.click());
    photoFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handlePhotoUpload(file);
    });
    profileForm.addEventListener('submit', saveProfileChanges);
    passwordForm.addEventListener('submit', savePasswordChanges);

    loadProfileData();
    loadSubscriptionData();
});