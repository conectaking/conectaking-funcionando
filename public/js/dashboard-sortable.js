/**
 * Dashboard Sortable — módulo isolado (Conecta King).
 * Depende de window.DashboardCore (+ Cartao/Editor quando aplicável).
 * Gerado por scripts/extract-dashboard-save-sortable.js
 */
(function (global) {
    'use strict';

    function core() { return global.DashboardCore || {}; }
    function cartao() { return global.DashboardCartao || {}; }
    function editor() { return global.DashboardEditor || {}; }

    var env = {
        get API_URL() {
            var c = core();
            if (typeof c.getApiUrl === 'function') return c.getApiUrl() || '';
            return global.API_URL || global.API_BASE || '';
        },
        get HEADERS() {
            var c = core();
            if (typeof c.getHeaders === 'function') return c.getHeaders() || {};
            return { 'Content-Type': 'application/json' };
        },
        get HEADERS_AUTH() {
            var c = core();
            if (typeof c.getHeadersAuth === 'function') return c.getHeadersAuth() || {};
            return {};
        },
        safeFetch: function (url, options) {
            var c = core();
            if (typeof c.safeFetch === 'function') return c.safeFetch(url, options);
            return fetch(url, options);
        },
        getDefaultIcon: function (t) {
            var c = core();
            if (typeof c.getDefaultIcon === 'function') return c.getDefaultIcon(t);
            return 'fas fa-link';
        },
        updateItemFromApiResponse: function () {
            var c = core();
            if (typeof c.updateItemFromApiResponse === 'function') return c.updateItemFromApiResponse.apply(c, arguments);
        },
        fetchProfileData: function () {
            var c = core();
            if (typeof c.fetchProfileData === 'function') return c.fetchProfileData.apply(c, arguments);
            if (typeof global.fetchProfileData === 'function') return global.fetchProfileData.apply(global, arguments);
        },
        renderEditor: function (data) {
            var e = editor();
            if (e && typeof e.renderEditor === 'function') return e.renderEditor(data);
            if (typeof global.renderEditor === 'function') return global.renderEditor(data);
        },
        updateLivePreviewFromForm: function () {
            var k = cartao();
            if (k && typeof k.updateLivePreviewFromForm === 'function') return k.updateLivePreviewFromForm();
            if (typeof global.updateLivePreviewFromForm === 'function') return global.updateLivePreviewFromForm();
        },
        initSortable: function () {
            if (global.DashboardSortable && typeof global.DashboardSortable.initSortable === 'function') {
                return global.DashboardSortable.initSortable();
            }
            var c = core();
            if (typeof c.initSortable === 'function') return c.initSortable();
        },
        saveItemOrder: function (order) {
            if (global.DashboardSortable && typeof global.DashboardSortable.saveItemOrder === 'function') {
                return global.DashboardSortable.saveItemOrder(order);
            }
            var c = core();
            if (typeof c.saveItemOrder === 'function') return c.saveItemOrder(order);
        },
        serializeBannerDestination: function () {
            var c = core();
            if (typeof c.serializeBannerDestination === 'function') return c.serializeBannerDestination.apply(c, arguments);
            return String(arguments[0] || '').trim();
        },
        bannerDestDisplayLabel: function (raw) {
            var c = core();
            if (typeof c.bannerDestDisplayLabel === 'function') return c.bannerDestDisplayLabel(raw);
            return String(raw || '').trim();
        },
        moduleListDisplayTitle: function (item) {
            var c = core();
            if (typeof c.moduleListDisplayTitle === 'function') return c.moduleListDisplayTitle(item);
            return (item && (item.title || item.item_type)) || 'Módulo';
        }
    };

    var SELECTORS = new Proxy({}, {
        get: function (_t, prop) {
            var c = core();
            var s = typeof c.getSelectors === 'function' ? c.getSelectors() : null;
            return s ? s[prop] : null;
        }
    });

async function saveItemOrder(itemsOrder) {
    try {
        // Atualizar a ordem de cada item no servidor
        const updatePromises = itemsOrder.map(item => {
            return fetch(`${env.API_URL}/api/profile/items/${item.id}`, {
                method: 'PUT',
                headers: env.HEADERS,
                body: JSON.stringify({ display_order: item.display_order })
            });
        });

        await Promise.all(updatePromises);
        console.log('Ordem dos módulos atualizada com sucesso');
    } catch (error) {
        console.error('Erro ao salvar ordem dos módulos:', error);
    }
}

if (window.DashboardCore) window.DashboardCore.initSortable = function () { return initSortable(); };
if (window.DashboardCore) window.DashboardCore.setupMoveButtons = function () { return setupMoveButtons(); };

function initSortable() {
    if (!SELECTORS.itemsContainer) {
        console.warn('initSortable: itemsContainer não encontrado');
        return;
    }

    // Verificar se há itens no container
    const items = SELECTORS.itemsContainer.querySelectorAll('.module-item');
    if (items.length === 0) {
        console.warn('initSortable: Nenhum item encontrado no container');
        return;
    }

    // Verificar se há handles de arraste
    const handles = SELECTORS.itemsContainer.querySelectorAll('.module-drag-handle');
    if (handles.length === 0) {
        console.warn('initSortable: Nenhum handle de arraste encontrado. Aguardando renderização...');
        // Tentar novamente após um pequeno delay
        setTimeout(() => {
            if (SELECTORS.itemsContainer.querySelectorAll('.module-drag-handle').length > 0) {
                initSortable();
            }
        }, 100);
        return;
    }

    console.log(` Inicializando Sortable (mobile: ${window.innerWidth <= 768}, ${items.length} itens, ${handles.length} handles)`);

    // Destruir instância anterior se existir
    if (SELECTORS.itemsContainer.sortable) {
        SELECTORS.itemsContainer.sortable.destroy();
        SELECTORS.itemsContainer.sortable = null;
    }

    // Detectar se é mobile - detecção universal para TODOS os mobiles
    const isMobile = window.innerWidth <= 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent) ||
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);

    console.log(`Detecção mobile: ${isMobile} (width: ${window.innerWidth}, touch: ${'ontouchstart' in window}, maxTouchPoints: ${navigator.maxTouchPoints})`);

    SELECTORS.itemsContainer.sortable = new Sortable(SELECTORS.itemsContainer, {
        animation: 150,
        // SEMPRE usar handle (três pontinhos) - tanto no mobile quanto desktop
        handle: '.module-drag-handle',
        // Configuração para mobile - SEM delay para resposta imediata
        delay: 0, // SEM delay - resposta imediata
        delayOnTouchStart: false, // SEM delay no touch
        touchStartThreshold: 0, // Zero - detecta movimento imediatamente
        // Fallback no mobile - NÃO usar fallbackOnBody para manter eventos no container
        forceFallback: isMobile,
        fallbackOnBody: false, // false = drag fica no container = touch contínuo no mobile
        fallbackTolerance: 0,
        fallbackOffset: { x: 0, y: -8 },
        fallbackClass: 'sortable-fallback',
        // Scroll durante drag - usar padrão do Sortable (não customizar)
        scroll: true,
        scrollSensitivity: 20,
        scrollSpeed: 15,
        bubbleScroll: true,
        // MOVIMENTO LIVRE: invertSwap FALSE = troca "no lugar" do item = desliza contínuo
        // invertSwap true = "entre" = pode travar um por vez no mobile
        swapThreshold: 1, // 1 = item todo é zona de troca
        invertSwap: false, // false = arrasta sobre o item e ocupa o lugar = contínuo
        direction: 'vertical',
        emptyInsertThreshold: 5,
        disabled: false,
        draggable: '.module-item',
        // Melhorar feedback visual
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        // Filtrar botões para não arrastar quando clicar neles
        filter: '.module-move-btn, .module-action-btn, .module-toggle, .module-toggle-input, .module-toggle-slider, button, a',
        preventOnFilter: true,
        // Callback para quando começar a arrastar
        onStart: function (evt) {
            try {
                console.log('YY Drag iniciado', { item: evt.item, index: evt.oldIndex, isMobile: isMobile });

                // Prevenir seleção de texto
                document.body.style.userSelect = 'none';
                document.body.style.webkitUserSelect = 'none';

                // CRÍTICO: Fazer módulo "LEVANTAR" imediatamente
                if (evt.item && evt.item.style) {
                    // Módulo LEVANTA visualmente
                    evt.item.style.touchAction = 'none';
                    evt.item.style.webkitTouchCallout = 'none';
                    evt.item.style.pointerEvents = 'auto';
                    evt.item.style.position = 'relative';
                    evt.item.style.zIndex = '10000';
                    evt.item.style.transform = 'translateY(-10px) scale(1.05)';
                    evt.item.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.5)';
                    evt.item.style.opacity = '0.95';
                }

                // Adicionar classes para feedback visual (módulo "LEVANTA")
                if (evt.item) {
                    evt.item.classList.add('sortable-dragging');

                    if (isMobile) {
                        evt.item.classList.add('sortable-dragging-mobile');

                        // Vibrar se disponível (todos os mobiles)
                        if (navigator.vibrate) {
                            navigator.vibrate(30);
                        }

                        // Garantir que o item arrastado não cause scroll da página
                        // Mas NÃO bloquear o body para não cortar touchmove do Sortable
                        evt.item.style.touchAction = 'none';
                    }
                }
            } catch (error) {
                console.error('Erro no onStart do Sortable:', error);
            }
        },
        // Callback durante o drag - permitir movimento livre
        onMove: function (evt) {
            try {
                // Permitir movimento livre sem interferências
                return true; // Sempre permitir movimento
            } catch (error) {
                console.error('Erro no onMove do Sortable:', error);
                return true; // Permitir movimento mesmo com erro
            }
        },
        // Callback para quando terminar de arrastar
        onEnd: function (evt) {
            try {
                console.log('Drag finalizado', { oldIndex: evt.oldIndex, newIndex: evt.newIndex });

                // Restaurar scroll da página
                if (isMobile) {
                    document.body.style.overflow = '';
                    document.body.style.touchAction = '';
                    document.documentElement.style.overflow = '';
                    document.documentElement.style.touchAction = '';
                }

                // Restaurar seleção
                document.body.style.userSelect = '';
                document.body.style.webkitUserSelect = '';

                // Restaurar touch-action e estilos do item (módulo volta ao normal)
                if (evt.item && evt.item.style) {
                    evt.item.style.touchAction = '';
                    evt.item.style.webkitTouchCallout = '';
                    evt.item.style.pointerEvents = '';
                    evt.item.style.transform = ''; // Remove o "levante"
                    evt.item.style.boxShadow = ''; // Remove sombra
                    evt.item.style.opacity = '';
                    evt.item.style.position = '';
                    evt.item.style.zIndex = '';
                }

                // Remover classes de drag
                if (evt.item) {
                    evt.item.classList.remove('sortable-dragging', 'sortable-dragging-mobile', 'sortable-ghost', 'sortable-chosen', 'sortable-drag');
                }

                // Atualizar a ordem dos itens no servidor E no DOM
                const items = Array.from(SELECTORS.itemsContainer.children);
                const newOrder = items.map((item, index) => {
                    const itemId = item.dataset.id || item.querySelector('[data-item-id]')?.dataset.itemId;
                    const displayOrder = index + 1;

                    // Atualizar data-display-order no DOM para manter sincronizado
                    if (itemId) {
                        item.dataset.displayOrder = displayOrder;
                        item.setAttribute('data-display-order', displayOrder);
                    }

                    return { id: itemId, display_order: displayOrder };
                }).filter(item => item.id);

                // Salvar a nova ordem apenas se realmente mudou
                if (newOrder.length > 0 && evt.oldIndex !== evt.newIndex) {
                    console.log(`Y' Salvando nova ordem (${newOrder.length} itens)`);
                    saveItemOrder(newOrder).catch(err => {
                        console.error('Erro ao salvar ordem:', err);
                    });
                }

                updateLivePreviewFromForm();

                // CRÍTICO: Garantir que o Sortable continue habilitado e funcionando
                if (SELECTORS.itemsContainer && SELECTORS.itemsContainer.sortable) {
                    // Garantir que não está desabilitado
                    SELECTORS.itemsContainer.sortable.option('disabled', false);
                    console.log('Sortable ainda ativo e habilitado após drag - pode arrastar novamente');
                } else {
                    console.warn('Sortable não encontrado após drag - reinicializando...');
                    setTimeout(() => {
                        initSortable();
                    }, 100);
                }

            } catch (error) {
                console.error('Erro no onEnd do Sortable:', error);
                // Tentar restaurar estado mesmo com erro
                if (evt.item) {
                    evt.item.classList.remove('sortable-dragging', 'sortable-dragging-mobile');
                    if (evt.item.style) {
                        evt.item.style.touchAction = '';
                        evt.item.style.transform = '';
                    }
                }
                document.body.style.userSelect = '';
                document.body.style.webkitUserSelect = '';
            }
        }
    });

    console.log('Sortable inicializado - movimento livre habilitado para TODOS os mobiles');

    // Adicionar event listeners para botões de seta
    setupMoveButtons();

    // Garantir que o Sortable permaneça habilitado
    if (SELECTORS.itemsContainer.sortable) {
        SELECTORS.itemsContainer.sortable.option('disabled', false);
        SELECTORS.itemsContainer.sortable.option('swapThreshold', 1);
        SELECTORS.itemsContainer.sortable.option('invertSwap', false); // false = desliza contínuo
        SELECTORS.itemsContainer.sortable.option('scroll', true);
        SELECTORS.itemsContainer.sortable.option('fallbackOnBody', false); // mantém no container no mobile
        console.log('Sortable movimento livre (invertSwap:false fallbackOnBody:false) para mobile');
    }
}

// Função para configurar botões de mover para cima/baixo
// Usa event delegation única para evitar múltiplos listeners
let moveButtonsHandler = null;

function setupMoveButtons() {
    // Remover handler anterior se existir
    if (moveButtonsHandler) {
        document.removeEventListener('click', moveButtonsHandler);
        moveButtonsHandler = null;
    }

    // Criar novo handler único
    moveButtonsHandler = function (e) {
        const btn = e.target.closest('.module-move-btn');
        if (!btn) return;

        // Só prevenir default se realmente for um botão de mover
        if (btn.classList.contains('module-move-btn')) {
            e.preventDefault();
            e.stopPropagation();
        } else {
            return; // Não é um botão de mover, deixar o evento seguir normalmente
        }

        const itemId = btn.dataset.itemId;
        const direction = btn.dataset.direction;

        if (!itemId || !direction || !SELECTORS.itemsContainer) {
            console.warn('Dados incompletos para mover módulo:', { itemId, direction, hasContainer: !!SELECTORS.itemsContainer });
            return;
        }

        const itemEl = document.querySelector(`.module-item[data-id="${itemId}"]`);
        if (!itemEl) return;

        const items = Array.from(SELECTORS.itemsContainer.children);
        const currentIndex = items.indexOf(itemEl);

        if (currentIndex === -1) return;

        let newIndex;
        if (direction === 'up' && currentIndex > 0) {
            newIndex = currentIndex - 1;
        } else if (direction === 'down' && currentIndex < items.length - 1) {
            newIndex = currentIndex + 1;
        } else {
            return; // Já está no topo ou no final
        }

        // Mover o elemento
        const nextItem = items[newIndex];
        if (direction === 'up') {
            SELECTORS.itemsContainer.insertBefore(itemEl, nextItem);
        } else {
            SELECTORS.itemsContainer.insertBefore(itemEl, nextItem.nextSibling);
        }

        // Atualizar ordem no servidor E no DOM
        const newOrder = Array.from(SELECTORS.itemsContainer.children).map((item, index) => {
            const id = item.dataset.id || item.querySelector('[data-item-id]')?.dataset.itemId;
            const displayOrder = index + 1;

            // Atualizar data-display-order no DOM para manter sincronizado
            if (id) {
                item.dataset.displayOrder = displayOrder;
                item.setAttribute('data-display-order', displayOrder);
            }

            return { id, display_order: displayOrder };
        }).filter(item => item.id);

        if (newOrder.length > 0) {
            saveItemOrder(newOrder);
        }

        updateLivePreviewFromForm();
    };

    // Adicionar listener único usando event delegation
    document.addEventListener('click', moveButtonsHandler);
}



    var DashboardSortable = {
        saveItemOrder: saveItemOrder,
        initSortable: initSortable,
        setupMoveButtons: setupMoveButtons
    };
    global.DashboardSortable = DashboardSortable;
    global.saveItemOrder = saveItemOrder;
    global.initSortable = initSortable;
    global.setupMoveButtons = setupMoveButtons;
    if (global.DashboardCore) {
        global.DashboardCore.initSortable = initSortable;
        global.DashboardCore.setupMoveButtons = setupMoveButtons;
        global.DashboardCore.saveItemOrder = saveItemOrder;
    }

})(typeof window !== 'undefined' ? window : this);
