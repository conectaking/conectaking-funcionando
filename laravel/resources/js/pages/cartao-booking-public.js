/**
 * King Agenda — Public Booking System JS
 */

document.addEventListener('DOMContentLoaded', () => {
    const appEl = document.getElementById('bookingApp');
    if (!appEl) return;

    const slug = appEl.getAttribute('data-slug') || '';

    // State
    const state = {
        step: 1,
        selectedService: null,
        selectedProfessional: null,
        selectedDate: null,
        selectedTime: null,
        availableSlots: [],
    };

    // DOM Elements
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const stepSuccess = document.getElementById('stepSuccess');

    const btnGoToStep2 = document.getElementById('btnGoToStep2');
    const btnGoToStep3 = document.getElementById('btnGoToStep3');
    const btnSubmitBooking = document.getElementById('btnSubmitBooking');
    const btnSubmitText = document.getElementById('btnSubmitText');
    const btnSubmitIcon = document.getElementById('btnSubmitIcon');
    const bookingErrorMsg = document.getElementById('bookingErrorMsg');

    const datePickerDays = document.getElementById('datePickerDays');
    const slotsContainer = document.getElementById('slotsContainer');
    const slotsLoading = document.getElementById('slotsLoading');

    const summarySelectedService = document.getElementById('summarySelectedService');
    const confirmServiceName = document.getElementById('confirmServiceName');
    const confirmDateTime = document.getElementById('confirmDateTime');
    const confirmPrice = document.getElementById('confirmPrice');

    const formFinalBooking = document.getElementById('formFinalBooking');
    const clientPhoneInput = document.getElementById('clientPhoneInput');

    const successService = document.getElementById('successService');
    const successDateTime = document.getElementById('successDateTime');
    const successClient = document.getElementById('successClient');
    const btnSuccessWhatsApp = document.getElementById('btnSuccessWhatsApp');

    // Phone input mask
    if (clientPhoneInput) {
        clientPhoneInput.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length > 11) v = v.substring(0, 11);
            if (v.length > 6) {
                e.target.value = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
            } else if (v.length > 2) {
                e.target.value = `(${v.substring(0, 2)}) ${v.substring(2)}`;
            } else if (v.length > 0) {
                e.target.value = `(${v}`;
            } else {
                e.target.value = '';
            }
        });
    }

    // Step navigation
    function setStep(newStep) {
        state.step = newStep;

        step1.classList.toggle('hidden', newStep !== 1);
        step2.classList.toggle('hidden', newStep !== 2);
        step3.classList.toggle('hidden', newStep !== 3);
        stepSuccess.classList.toggle('hidden', newStep !== 4);

        // Update stepper indicators
        document.querySelectorAll('.step-item').forEach((item) => {
            const stepNum = parseInt(item.getAttribute('data-step-indicator'), 10);
            if (stepNum <= newStep) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        window.scrollTo({ top: appEl.offsetTop - 20, behavior: 'smooth' });
    }

    document.querySelectorAll('.btnBackStep').forEach((btn) => {
        btn.addEventListener('click', () => {
            if (state.step === 2) setStep(1);
            else if (state.step === 3) setStep(2);
        });
    });

    // 1. Service Selection
    document.querySelectorAll('input[name="selected_service"]').forEach((radio) => {
        radio.addEventListener('change', (e) => {
            const card = e.target.closest('.service-card');
            document.querySelectorAll('.service-card').forEach((c) => c.classList.remove('selected'));
            if (card) card.classList.add('selected');

            state.selectedService = {
                id: e.target.value,
                name: e.target.getAttribute('data-name'),
                duration: parseInt(e.target.getAttribute('data-duration'), 10) || 30,
                price: parseFloat(e.target.getAttribute('data-price')) || 0,
            };

            btnGoToStep2.disabled = false;
        });
    });

    // Professional Selection
    document.querySelectorAll('input[name="selected_prof"]').forEach((radio) => {
        radio.addEventListener('change', (e) => {
            document.querySelectorAll('.prof-card').forEach((c) => c.classList.remove('selected'));
            const card = e.target.closest('.prof-card');
            if (card) card.classList.add('selected');

            state.selectedProfessional = e.target.value ? {
                id: e.target.value,
                name: e.target.getAttribute('data-name'),
            } : null;

            if (state.selectedDate) {
                fetchAvailableSlots();
            }
        });
    });

    // Next to Step 2
    btnGoToStep2.addEventListener('click', () => {
        if (!state.selectedService) return;

        summarySelectedService.textContent = `${state.selectedService.name} (${state.selectedService.duration} min)`;
        buildDateSlider();
        setStep(2);
    });

    // 2. Date Slider Builder
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    function buildDateSlider() {
        datePickerDays.innerHTML = '';
        const today = new Date();

        for (let i = 0; i < 21; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);

            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;

            const isToday = i === 0;
            const weekDayName = isToday ? 'Hoje' : weekDays[d.getDay()];

            const chip = document.createElement('div');
            chip.className = `date-chip ${i === 0 ? 'selected' : ''}`;
            chip.setAttribute('data-date', dateStr);
            chip.innerHTML = `
                <div class="text-[10px] uppercase font-bold text-slate-400">${weekDayName}</div>
                <div class="text-base font-extrabold text-white my-0.5">${dd}</div>
                <div class="text-[10px] text-slate-400">${months[d.getMonth()]}</div>
            `;

            chip.addEventListener('click', () => {
                document.querySelectorAll('.date-chip').forEach((c) => c.classList.remove('selected'));
                chip.classList.add('selected');
                state.selectedDate = dateStr;
                state.selectedTime = null;
                btnGoToStep3.disabled = true;
                fetchAvailableSlots();
            });

            datePickerDays.appendChild(chip);

            if (i === 0) {
                state.selectedDate = dateStr;
            }
        }

        fetchAvailableSlots();
    }

    // Fetch Slots from API
    async function fetchAvailableSlots() {
        if (!state.selectedDate || !state.selectedService) return;

        slotsLoading.classList.remove('hidden');
        slotsContainer.innerHTML = '';
        btnGoToStep3.disabled = true;

        try {
            const profParam = state.selectedProfessional ? `&professional_id=${state.selectedProfessional.id}` : '';
            const res = await fetch(`/api/booking/public/${slug}/slots?date=${state.selectedDate}&duration=${state.selectedService.duration}${profParam}`);
            const data = await res.json();

            slotsLoading.classList.add('hidden');

            if (data.slots && data.slots.length > 0) {
                state.availableSlots = data.slots;
                slotsContainer.innerHTML = '';

                data.slots.forEach((slot) => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'slot-chip';
                    btn.textContent = slot.time;

                    btn.addEventListener('click', () => {
                        document.querySelectorAll('.slot-chip').forEach((s) => s.classList.remove('selected'));
                        btn.classList.add('selected');
                        state.selectedTime = slot.time;
                        btnGoToStep3.disabled = false;
                    });

                    slotsContainer.appendChild(btn);
                });
            } else {
                slotsContainer.innerHTML = `
                    <div class="col-span-full py-8 text-center text-slate-500">
                        <i class="far fa-calendar-times text-2xl mb-1 text-slate-600 block"></i>
                        <p class="text-xs">Nenhum horário disponível nesta data.</p>
                    </div>
                `;
            }
        } catch (err) {
            slotsLoading.classList.add('hidden');
            slotsContainer.innerHTML = `
                <div class="col-span-full py-6 text-center text-red-400 text-xs">
                    Erro ao carregar horários. Tente novamente.
                </div>
            `;
        }
    }

    // Next to Step 3
    btnGoToStep3.addEventListener('click', () => {
        if (!state.selectedDate || !state.selectedTime) return;

        const dateParts = state.selectedDate.split('-');
        const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

        confirmServiceName.textContent = state.selectedService.name;
        confirmDateTime.textContent = `${formattedDate} às ${state.selectedTime}`;
        confirmPrice.textContent = `R$ ${state.selectedService.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

        setStep(3);
    });

    // 3. Submit Booking
    if (formFinalBooking) {
        formFinalBooking.addEventListener('submit', async (e) => {
            e.preventDefault();
            bookingErrorMsg.classList.add('hidden');

            const formData = new FormData(formFinalBooking);
            const payload = {
                service_id: state.selectedService.id,
                professional_id: state.selectedProfessional ? state.selectedProfessional.id : null,
                appointment_date: state.selectedDate,
                start_time: state.selectedTime,
                client_name: formData.get('client_name'),
                client_phone: formData.get('client_phone'),
                notes: formData.get('notes'),
            };

            btnSubmitBooking.disabled = true;
            btnSubmitText.textContent = 'Agendando...';
            btnSubmitIcon.className = 'fas fa-circle-notch fa-spin text-xs';

            try {
                const res = await fetch(`/api/booking/public/${slug}/book`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                    },
                    body: JSON.stringify(payload),
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Erro ao realizar agendamento.');
                }

                // Success
                const dateParts = state.selectedDate.split('-');
                const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

                successService.textContent = state.selectedService.name;
                successDateTime.textContent = `${formattedDate} às ${state.selectedTime}`;
                successClient.textContent = payload.client_name;

                if (data.whatsapp_url) {
                    btnSuccessWhatsApp.href = data.whatsapp_url;
                    btnSuccessWhatsApp.classList.remove('hidden');
                } else {
                    btnSuccessWhatsApp.classList.add('hidden');
                }

                setStep(4);
            } catch (err) {
                bookingErrorMsg.textContent = err.message;
                bookingErrorMsg.classList.remove('hidden');
            } finally {
                btnSubmitBooking.disabled = false;
                btnSubmitText.textContent = 'Confirmar Agendamento';
                btnSubmitIcon.className = 'fas fa-check text-xs';
            }
        });
    }
});
