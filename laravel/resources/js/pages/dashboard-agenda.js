/**
 * King Agenda — Admin Dashboard JS
 */

document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        appointments: [],
        services: [],
        professionals: [],
        settings: null,
        currentFilter: 'today',
        profileSlug: '',
    };

    // DOM Elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const badgeCountAppointments = document.getElementById('badgeCountAppointments');
    const appointmentsGrid = document.getElementById('appointmentsGrid');
    const servicesGrid = document.getElementById('servicesGrid');
    const professionalsGrid = document.getElementById('professionalsGrid');
    const workingHoursContainer = document.getElementById('workingHoursContainer');
    const formSettings = document.getElementById('formSettings');

    const btnNewService = document.getElementById('btnNewService');
    const modalService = document.getElementById('modalService');
    const formServiceModal = document.getElementById('formServiceModal');
    const modalServiceTitle = document.getElementById('modalServiceTitle');

    const btnNewProf = document.getElementById('btnNewProf');
    const modalProf = document.getElementById('modalProf');
    const formProfModal = document.getElementById('formProfModal');
    const modalProfTitle = document.getElementById('modalProfTitle');

    const btnCopyPublicLink = document.getElementById('btnCopyPublicLink');
    const btnOpenPublicLink = document.getElementById('btnOpenPublicLink');
    const copyLinkText = document.getElementById('copyLinkText');

    const filterBtns = document.querySelectorAll('.filter-btn');
    const filterSpecificDate = document.getElementById('filterSpecificDate');

    // Tab Switching
    tabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-tab');
            tabBtns.forEach((b) => {
                b.classList.remove('active', 'text-white');
                b.classList.add('text-slate-400');
            });
            btn.classList.add('active', 'text-white');
            btn.classList.remove('text-slate-400');

            tabPanes.forEach((pane) => {
                pane.classList.toggle('hidden', pane.id !== target);
            });
        });
    });

    // Close Modals
    document.querySelectorAll('.btnCloseModal').forEach((btn) => {
        btn.addEventListener('click', () => {
            modalService.classList.add('hidden');
            modalProf.classList.add('hidden');
        });
    });

    // Date filters
    filterBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            filterBtns.forEach((b) => {
                b.classList.remove('active', 'bg-amber-500', 'text-slate-950');
                b.classList.add('bg-slate-800', 'text-slate-300');
            });
            btn.classList.add('active', 'bg-amber-500', 'text-slate-950');
            btn.classList.remove('bg-slate-800', 'text-slate-300');

            state.currentFilter = btn.getAttribute('data-filter');
            filterSpecificDate.value = '';
            renderAppointments();
        });
    });

    if (filterSpecificDate) {
        filterSpecificDate.addEventListener('change', (e) => {
            if (e.target.value) {
                filterBtns.forEach((b) => {
                    b.classList.remove('active', 'bg-amber-500', 'text-slate-950');
                    b.classList.add('bg-slate-800', 'text-slate-300');
                });
                state.currentFilter = 'specific';
                renderAppointments();
            }
        });
    }

    // 1. Load All Data
    async function loadData() {
        try {
            const [settRes, servRes, profRes, appRes] = await Promise.all([
                fetch('/api/booking/settings'),
                fetch('/api/booking/services'),
                fetch('/api/booking/professionals'),
                fetch('/api/booking/appointments'),
            ]);

            state.settings = await settRes.json();
            state.services = await servRes.json();
            state.professionals = await profRes.json();
            state.appointments = await appRes.json();

            // Set profile slug link
            fetch('/api/user/profile-core').then(r => r.json()).then(p => {
                const slug = p.profile?.profile_slug || p.user?.profile_slug || '';
                state.profileSlug = slug;
                if (slug) {
                    const publicUrl = `/${slug}/agendar`;
                    btnOpenPublicLink.href = publicUrl;
                    btnCopyPublicLink.classList.remove('hidden');
                }
            }).catch(() => {});

            renderSettings();
            renderServices();
            renderProfessionals();
            renderAppointments();
        } catch (err) {
            console.error('Erro ao carregar dados da agenda:', err);
        }
    }

    // Copy Link Handler
    if (btnCopyPublicLink) {
        btnCopyPublicLink.addEventListener('click', () => {
            if (!state.profileSlug) return;
            const fullUrl = `${window.location.origin}/${state.profileSlug}/agendar`;
            navigator.clipboard.writeText(fullUrl).then(() => {
                copyLinkText.textContent = 'Link Copiado!';
                setTimeout(() => {
                    copyLinkText.textContent = 'Copiar Link de Agendamento';
                }, 2000);
            });
        });
    }

    // 2. Render Appointments
    function renderAppointments() {
        const todayStr = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        let filtered = state.appointments;

        if (state.currentFilter === 'today') {
            filtered = filtered.filter(a => a.appointment_date === todayStr);
        } else if (state.currentFilter === 'tomorrow') {
            filtered = filtered.filter(a => a.appointment_date === tomorrowStr);
        } else if (state.currentFilter === 'specific' && filterSpecificDate.value) {
            filtered = filtered.filter(a => a.appointment_date === filterSpecificDate.value);
        }

        badgeCountAppointments.textContent = filtered.length;
        appointmentsGrid.innerHTML = '';

        if (filtered.length === 0) {
            appointmentsGrid.innerHTML = `
                <div class="col-span-full text-center py-12 text-slate-500 bg-slate-900/40 border border-slate-800/80 rounded-3xl">
                    <i class="far fa-calendar-check text-4xl mb-2 text-slate-600 block"></i>
                    <p class="text-sm font-semibold">Nenhum agendamento encontrado para este filtro.</p>
                </div>
            `;
            return;
        }

        filtered.forEach((apt) => {
            const dateParts = apt.appointment_date.split('-');
            const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
            const timeStart = apt.start_time.substring(0, 5);
            const timeEnd = apt.end_time.substring(0, 5);

            let statusBadge = '';
            if (apt.status === 'confirmed') {
                statusBadge = '<span class="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold">Confirmado</span>';
            } else if (apt.status === 'pending') {
                statusBadge = '<span class="px-2.5 py-1 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-bold">Pendente</span>';
            } else if (apt.status === 'completed') {
                statusBadge = '<span class="px-2.5 py-1 bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-bold">Concluído</span>';
            } else {
                statusBadge = '<span class="px-2.5 py-1 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-bold">Cancelado</span>';
            }

            const phoneClean = apt.client_phone.replace(/\D/g, '');
            const waPhone = (phoneClean.length <= 11 && !phoneClean.startsWith('55')) ? `55${phoneClean}` : phoneClean;
            const waMsg = encodeURIComponent(`Olá ${apt.client_name}! Confirmando seu horário para ${apt.service_name} no dia ${formattedDate} às ${timeStart}.`);

            const card = document.createElement('div');
            card.className = 'bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 relative hover:border-slate-700 transition';
            card.innerHTML = `
                <div class="flex items-start justify-between gap-2">
                    <div>
                        <div class="text-base font-bold text-white">${apt.client_name}</div>
                        <div class="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <i class="fas fa-scissors text-amber-400"></i>
                            <span>${apt.service_name}</span>
                        </div>
                    </div>
                    ${statusBadge}
                </div>

                <div class="bg-slate-950/60 p-2.5 rounded-xl text-xs space-y-1">
                    <div class="flex items-center justify-between text-slate-300">
                        <span><i class="far fa-calendar text-amber-400 mr-1"></i> ${formattedDate}</span>
                        <span class="font-bold text-white"><i class="far fa-clock text-amber-400 mr-1"></i> ${timeStart} - ${timeEnd}</span>
                    </div>
                    <div class="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/80">
                        <span>Valor:</span>
                        <span class="font-bold text-amber-400">R$ ${parseFloat(apt.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                ${apt.notes ? `<div class="text-[11px] text-slate-400 italic bg-slate-950/30 p-2 rounded-lg">Obs: ${apt.notes}</div>` : ''}

                <div class="flex items-center gap-1.5 pt-1">
                    <a href="https://wa.me/${waPhone}?text=${waMsg}" target="_blank" class="flex-1 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/30 font-bold rounded-xl text-xs text-center transition flex items-center justify-center gap-1">
                        <i class="fab fa-whatsapp"></i>
                        <span>WhatsApp</span>
                    </a>

                    ${apt.status !== 'completed' && apt.status !== 'cancelled' ? `
                        <button type="button" class="btnUpdateStatus px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold" data-id="${apt.id}" data-status="completed" title="Marcar como Concluído">
                            <i class="fas fa-check text-emerald-400"></i>
                        </button>
                        <button type="button" class="btnUpdateStatus px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold" data-id="${apt.id}" data-status="cancelled" title="Cancelar Agendamento">
                            <i class="fas fa-ban text-red-400"></i>
                        </button>
                    ` : ''}
                </div>
            `;

            appointmentsGrid.appendChild(card);
        });

        // Event listeners for action buttons
        document.querySelectorAll('.btnUpdateStatus').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const status = btn.getAttribute('data-status');
                if (confirm(`Deseja alterar o status para "${status}"?`)) {
                    await fetch(`/api/booking/appointments/${id}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status }),
                    });
                    loadData();
                }
            });
        });
    }

    // 3. Render Services
    function renderServices() {
        servicesGrid.innerHTML = '';
        state.services.forEach((s) => {
            const card = document.createElement('div');
            card.className = 'bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 relative hover:border-slate-700 transition';
            card.innerHTML = `
                <div class="flex items-start justify-between gap-2">
                    <div>
                        <h3 class="font-bold text-white text-base">${s.name}</h3>
                        <p class="text-xs text-slate-400 mt-0.5">${s.description || 'Sem descrição'}</p>
                    </div>
                    <span class="text-sm font-extrabold text-amber-400">R$ ${parseFloat(s.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                    <span class="flex items-center gap-1"><i class="far fa-clock text-amber-400"></i> ${s.duration_minutes} min</span>
                    <div class="flex gap-1.5">
                        <button type="button" class="btnEditService px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs" data-id="${s.id}"><i class="fas fa-pen"></i></button>
                        <button type="button" class="btnDeleteService px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs" data-id="${s.id}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
            servicesGrid.appendChild(card);
        });

        // Edit / Delete Service buttons
        document.querySelectorAll('.btnEditService').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'), 10);
                const s = state.services.find(x => x.id === id);
                if (s) {
                    modalServiceTitle.textContent = 'Editar Serviço';
                    document.getElementById('serviceModalId').value = s.id;
                    document.getElementById('serviceModalName').value = s.name;
                    document.getElementById('serviceModalDuration').value = s.duration_minutes;
                    document.getElementById('serviceModalPrice').value = s.price;
                    document.getElementById('serviceModalDesc').value = s.description || '';
                    document.getElementById('serviceModalActive').checked = s.is_active;
                    modalService.classList.remove('hidden');
                }
            });
        });

        document.querySelectorAll('.btnDeleteService').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (confirm('Tem certeza que deseja excluir este serviço?')) {
                    await fetch(`/api/booking/services/${id}`, { method: 'DELETE' });
                    loadData();
                }
            });
        });
    }

    // New Service button
    if (btnNewService) {
        btnNewService.addEventListener('click', () => {
            modalServiceTitle.textContent = 'Novo Serviço';
            formServiceModal.reset();
            document.getElementById('serviceModalId').value = '';
            modalService.classList.remove('hidden');
        });
    }

    if (formServiceModal) {
        formServiceModal.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('serviceModalId').value;
            const payload = {
                name: document.getElementById('serviceModalName').value,
                duration_minutes: parseInt(document.getElementById('serviceModalDuration').value, 10),
                price: parseFloat(document.getElementById('serviceModalPrice').value),
                description: document.getElementById('serviceModalDesc').value,
                is_active: document.getElementById('serviceModalActive').checked,
            };

            const url = id ? `/api/booking/services/${id}` : '/api/booking/services';
            const method = id ? 'PUT' : 'POST';

            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            modalService.classList.add('hidden');
            loadData();
        });
    }

    // 4. Render Professionals
    function renderProfessionals() {
        professionalsGrid.innerHTML = '';
        if (state.professionals.length === 0) {
            professionalsGrid.innerHTML = `
                <div class="col-span-full text-center py-8 text-slate-500 bg-slate-900/40 border border-slate-800 rounded-2xl">
                    <p class="text-xs">Nenhum profissional cadastrado. A agenda funcionará no nome principal do estabelecimento.</p>
                </div>
            `;
            return;
        }

        state.professionals.forEach((p) => {
            const card = document.createElement('div');
            card.className = 'bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3';
            card.innerHTML = `
                <div class="flex items-center gap-3">
                    <img src="${p.avatar_url || 'https://i.ibb.co/60sW9k75/logo.png'}" class="w-10 h-10 rounded-full object-cover ring-1 ring-slate-700">
                    <div>
                        <div class="font-bold text-white text-sm">${p.name}</div>
                        <div class="text-xs text-slate-400">${p.phone || 'Sem telefone'}</div>
                    </div>
                </div>
                <button type="button" class="btnDeleteProf px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs" data-id="${p.id}"><i class="fas fa-trash"></i></button>
            `;
            professionalsGrid.appendChild(card);
        });

        document.querySelectorAll('.btnDeleteProf').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (confirm('Excluir este profissional?')) {
                    await fetch(`/api/booking/professionals/${id}`, { method: 'DELETE' });
                    loadData();
                }
            });
        });
    }

    if (btnNewProf) {
        btnNewProf.addEventListener('click', () => {
            formProfModal.reset();
            document.getElementById('profModalId').value = '';
            modalProf.classList.remove('hidden');
        });
    }

    if (formProfModal) {
        formProfModal.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                name: document.getElementById('profModalName').value,
                phone: document.getElementById('profModalPhone').value,
                avatar_url: document.getElementById('profModalAvatar').value,
            };

            await fetch('/api/booking/professionals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            modalProf.classList.add('hidden');
            loadData();
        });
    }

    // 5. Render Settings & Working Hours
    const weekDayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    function renderSettings() {
        if (!state.settings) return;

        document.getElementById('cfgBusinessName').value = state.settings.business_name || '';
        document.getElementById('cfgBusinessPhone').value = state.settings.business_phone || '';
        document.getElementById('cfgBusinessAddress').value = state.settings.business_address || '';
        document.getElementById('cfgSlotInterval').value = state.settings.slot_interval_minutes || 30;
        document.getElementById('cfgMinNotice').value = state.settings.min_notice_hours || 1;
        document.getElementById('cfgMaxDays').value = state.settings.max_days_advance || 30;

        const wh = state.settings.working_hours || {};
        workingHoursContainer.innerHTML = '';

        for (let day = 0; day < 7; day++) {
            const dayCfg = wh[day] || { enabled: day !== 0, start: '09:00', end: '18:00', break_start: '12:00', break_end: '13:00' };

            const row = document.createElement('div');
            row.className = 'grid grid-cols-1 sm:grid-cols-5 gap-2 items-center p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs';
            row.innerHTML = `
                <div class="flex items-center gap-2 sm:col-span-2">
                    <input type="checkbox" id="wh_enabled_${day}" ${dayCfg.enabled ? 'checked' : ''} class="wh-toggle rounded border-slate-800 text-amber-500 focus:ring-amber-500">
                    <label for="wh_enabled_${day}" class="font-bold text-slate-200">${weekDayNames[day]}</label>
                </div>
                <div>
                    <label class="block text-[10px] text-slate-400">Início</label>
                    <input type="time" id="wh_start_${day}" value="${dayCfg.start || '09:00'}" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-white">
                </div>
                <div>
                    <label class="block text-[10px] text-slate-400">Fim</label>
                    <input type="time" id="wh_end_${day}" value="${dayCfg.end || '18:00'}" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-white">
                </div>
                <div>
                    <label class="block text-[10px] text-slate-400">Almoço (Início/Fim)</label>
                    <div class="flex gap-1">
                        <input type="time" id="wh_bstart_${day}" value="${dayCfg.break_start || '12:00'}" class="w-1/2 bg-slate-900 border border-slate-800 rounded-lg px-1 py-1 text-white text-[10px]">
                        <input type="time" id="wh_bend_${day}" value="${dayCfg.break_end || '13:00'}" class="w-1/2 bg-slate-900 border border-slate-800 rounded-lg px-1 py-1 text-white text-[10px]">
                    </div>
                </div>
            `;
            workingHoursContainer.appendChild(row);
        }
    }

    // Save Settings
    if (formSettings) {
        formSettings.addEventListener('submit', async (e) => {
            e.preventDefault();

            const working_hours = {};
            for (let day = 0; day < 7; day++) {
                working_hours[day] = {
                    enabled: document.getElementById(`wh_enabled_${day}`).checked,
                    start: document.getElementById(`wh_start_${day}`).value,
                    end: document.getElementById(`wh_end_${day}`).value,
                    break_start: document.getElementById(`wh_bstart_${day}`).value,
                    break_end: document.getElementById(`wh_bend_${day}`).value,
                };
            }

            const payload = {
                business_name: document.getElementById('cfgBusinessName').value,
                business_phone: document.getElementById('cfgBusinessPhone').value,
                business_address: document.getElementById('cfgBusinessAddress').value,
                slot_interval_minutes: parseInt(document.getElementById('cfgSlotInterval').value, 10),
                min_notice_hours: parseInt(document.getElementById('cfgMinNotice').value, 10),
                max_days_advance: parseInt(document.getElementById('cfgMaxDays').value, 10),
                working_hours,
            };

            await fetch('/api/booking/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            alert('Configurações salvas com sucesso!');
            loadData();
        });
    }

    // Initialize
    loadData();
});
