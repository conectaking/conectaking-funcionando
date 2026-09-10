/**
 * Dashboard Relatórios — módulo isolado (Conecta King).
 * Depende de window.DashboardCore e Chart.js no HTML.
 * Gerado por scripts/extract-dashboard-relatorios.js
 */
(function (global) {
    'use strict';

    function core() {
        return global.DashboardCore || {};
    }

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
        }
    };

    var els = {
        periodSelector: function () { return document.getElementById('period-selector'); },
        kpiTotalViews: function () { return document.getElementById('kpi-total-views'); },
        kpiTotalClicks: function () { return document.getElementById('kpi-total-clicks'); },
        kpiCtr: function () { return document.getElementById('kpi-ctr'); },
        kpiTotalSaves: function () { return document.getElementById('kpi-total-saves'); },
        performanceChartCanvas: function () { return document.getElementById('performance-chart'); },
        topItemsList: function () { return document.getElementById('top-items-list'); }
    };

    var performanceChartInstance = null;
    var clientPerformanceChart = null;
    var clientLinksChart = null;
    var reportsLoaded = false;

async function fetchAnalyticsData(period = '30') {
    try {
        const [kpisRes, performanceRes, topItemsRes] = await Promise.all([
            fetch(`${env.API_URL}/api/analytics/kpis?period=${period}`, { credentials: 'include', headers: env.HEADERS }),
            fetch(`${env.API_URL}/api/analytics/performance?period=${period}`, { credentials: 'include', headers: env.HEADERS }),
            fetch(`${env.API_URL}/api/analytics/top-items?period=${period}`, { credentials: 'include', headers: env.HEADERS })
        ]);

        if (!kpisRes.ok || !performanceRes.ok || !topItemsRes.ok) {
            throw new Error('Falha ao buscar dados de analytics.');
        }

        return {
            kpis: await kpisRes.json(),
            performance: await performanceRes.json(),
            topItems: await topItemsRes.json()
        };
    } catch (error) {
        console.error(error);
        alert(error.message);
        return null;
    }
}

function renderKPIs(data) {
    if (!data) return;
    els.kpiTotalViews().textContent = data.totalViews || 0;
    els.kpiTotalClicks().textContent = data.totalClicks || 0;
    els.kpiCtr().textContent = `${data.clickThroughRate || '0.0'}%`;
    els.kpiTotalSaves().textContent = data.totalSaves || 0;
}

function renderTopItems(data) {
    els.topItemsList().innerHTML = '';
    if (data.length === 0) {
        els.topItemsList().innerHTML = '<li>Nenhum clique registrado no período.</li>';
        return;
    }
    data.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="item-info">
                <i class="${item.icon_class || 'fas fa-link'}"></i>
                <span>${item.title}</span>
            </div>
            <span class="click-count">${item.click_count} cliques</span>
        `;
        els.topItemsList().appendChild(li);
    });
}

function renderPerformanceChart(data) {
    if (performanceChartInstance) {
        performanceChartInstance.destroy();
    }

    const labels = data.map(d => new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    const viewsData = data.map(d => parseInt(d.views, 10));
    const clicksData = data.map(d => parseInt(d.clicks, 10));

    const ctx = els.performanceChartCanvas().getContext('2d');
    performanceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Visualizações',
                    data: viewsData,
                    borderColor: 'rgba(201, 164, 68, 0.8)', // Dourado
                    backgroundColor: 'rgba(201, 164, 68, 0.2)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Cliques',
                    data: clicksData,
                    borderColor: 'rgba(236, 236, 236, 0.8)', // Branco/Cinza
                    backgroundColor: 'rgba(236, 236, 236, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#A1A1A1' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    ticks: { color: '#A1A1A1' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            plugins: {
                legend: { labels: { color: '#ECECEC' } }
            }
        }
    });
}

async function loadReportsData() {
    const period = els.periodSelector().value;

    // Mostra um feedback de carregamento para o usuário
    els.kpiTotalViews().textContent = '...';
    els.kpiTotalClicks().textContent = '...';
    els.kpiCtr().textContent = '...%';
    els.kpiTotalSaves().textContent = '...';

    const allLinksDetailsEl = document.getElementById('all-links-details');
    if (allLinksDetailsEl) {
        allLinksDetailsEl.innerHTML = '<p style="color: var(--text-dark); text-align: center; padding: 20px;">Carregando detalhes dos links...</p>';
    }

    try {
        const [kpisRes, performanceRes, topItemsRes] = await Promise.all([
            fetch(`${env.API_URL}/api/analytics/kpis?period=${period}`, { credentials: 'include', headers: env.HEADERS }),
            fetch(`${env.API_URL}/api/analytics/performance?period=${period}`, { credentials: 'include', headers: env.HEADERS }),
            fetch(`${env.API_URL}/api/analytics/top-items?period=${period}`, { credentials: 'include', headers: env.HEADERS })
        ]);

        if (!kpisRes.ok || !performanceRes.ok || !topItemsRes.ok) {
            throw new Error('Falha ao buscar um ou mais dados de analytics.');
        }

        const kpisData = await kpisRes.json();
        const performanceData = await performanceRes.json();
        const topItemsData = await topItemsRes.json();

        // Buscar detalhes completos com período
        let detailsData = null;
        const detailsUrl = `${env.API_URL}/api/analytics/details?period=${period}`;
        const detailsResponse = await fetch(detailsUrl, { credentials: 'include', headers: env.HEADERS });
        if (detailsResponse.ok) {
            detailsData = await detailsResponse.json();
            renderAllLinksDetails(detailsData, period);
        } else {
            console.warn('Endpoint de detalhes não disponível ainda');
            if (allLinksDetailsEl) {
                allLinksDetailsEl.innerHTML = '<p style="color: var(--text-dark); text-align: center; padding: 20px;">Detalhes dos links serão carregados em breve.</p>';
            }
        }

        renderKPIs(kpisData);
        renderPerformanceChart(performanceData);
        renderTopItems(topItemsData);
        reportsLoaded = true;

    } catch (error) {
        console.error("Erro ao carregar dados dos relatórios:", error);
        if (allLinksDetailsEl) {
            allLinksDetailsEl.innerHTML = '<p style="color: var(--danger); text-align: center; padding: 20px;">Erro ao carregar detalhes dos links.</p>';
        }
        alert(error.message);
    }
}


// clientPerformanceChart / clientLinksChart — declarados no topo do módulo

function renderAllLinksDetails(detailsData, period = '30') {
    const allLinksDetailsEl = document.getElementById('all-links-details');
    if (!allLinksDetailsEl || !detailsData) return;

    const links = detailsData.links || [];
    const stats = detailsData.stats || {};
    const periodStats = detailsData.period_stats || {};
    const performance = detailsData.performance || [];
    const recentClicks = detailsData.recent_clicks || [];

    if (links.length === 0 && performance.length === 0) {
        allLinksDetailsEl.innerHTML = '<p style="color: var(--text-dark); text-align: center; padding: 20px;">Você ainda não possui links cadastrados ou dados de analytics. Adicione links na aba "Editar Tag" e comece a compartilhar sua Tag!</p>';
        return;
    }

    const totalViews = parseInt(stats.total_views) || 0;
    const totalClicks = parseInt(stats.total_clicks) || 0;
    const totalVcards = parseInt(stats.total_vcard_downloads) || 0;
    const viewsPeriod = parseInt(periodStats.views_period) || 0;
    const clicksPeriod = parseInt(periodStats.clicks_period) || 0;
    const lastViewDate = stats.last_view_date ? new Date(stats.last_view_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nunca';
    const lastClickDate = stats.last_click_date ? new Date(stats.last_click_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nunca';
    const firstViewDate = stats.first_view_date ? new Date(stats.first_view_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Nunca';

    const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0';
    const ctrPeriod = viewsPeriod > 0 ? ((clicksPeriod / viewsPeriod) * 100).toFixed(1) : '0.0';

    // Renderizar HTML completo
    let html = `
    <!-- Estatísticas Gerais -->
    <div style="margin-bottom: 30px;">
        <h3 style="color: var(--text, #ECECEC); margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-chart-bar"></i> Estatísticas Gerais do Seu Perfil
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <!-- Visualizações Totais -->
            <div style="background: var(--card-background-color, #1C1C21); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color, #2C2C2F); text-align: center;">
                <div style="color: var(--dourado-principal, #FFC700); font-size: 2.5rem; font-weight: bold; margin-bottom: 5px;">${totalViews.toLocaleString()}</div>
                <div style="color: var(--text-dark, #A1A1A1); font-size: 0.85rem;">Visualizações Totais</div>
            </div>
            <!-- Visualizações no Período -->
            <div style="background: var(--card-background-color, #1C1C21); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color, #2C2C2F); text-align: center;">
                <div style="color: var(--dourado-principal, #FFC700); font-size: 2.5rem; font-weight: bold; margin-bottom: 5px;">${viewsPeriod.toLocaleString()}</div>
                <div style="color: var(--text-dark, #A1A1A1); font-size: 0.85rem;">Visualizações no Período</div>
            </div>
            <!-- Cliques Totais -->
            <div style="background: var(--card-background-color, #1C1C21); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color, #2C2C2F); text-align: center;">
                <div style="color: var(--text, #ECECEC); font-size: 2.5rem; font-weight: bold; margin-bottom: 5px;">${totalClicks.toLocaleString()}</div>
                <div style="color: var(--text-dark, #A1A1A1); font-size: 0.85rem;">Cliques Totais</div>
            </div>
            <!-- Cliques no Período -->
            <div style="background: var(--card-background-color, #1C1C21); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color, #2C2C2F); text-align: center;">
                <div style="color: var(--text, #ECECEC); font-size: 2.5rem; font-weight: bold; margin-bottom: 5px;">${clicksPeriod.toLocaleString()}</div>
                <div style="color: var(--text-dark, #A1A1A1); font-size: 0.85rem;">Cliques no Período</div>
            </div>
            <!-- Taxa de Conversão Total -->
            <div style="background: var(--card-background-color, #1C1C21); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color, #2C2C2F); text-align: center;">
                <div style="color: var(--text, #ECECEC); font-size: 2.5rem; font-weight: bold; margin-bottom: 5px;">${ctr}%</div>
                <div style="color: var(--text-dark, #A1A1A1); font-size: 0.85rem;">Taxa de Conversão Total</div>
            </div>
            <!-- Taxa de Conversão no Período -->
            <div style="background: var(--card-background-color, #1C1C21); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color, #2C2C2F); text-align: center;">
                <div style="color: var(--text, #ECECEC); font-size: 2.5rem; font-weight: bold; margin-bottom: 5px;">${ctrPeriod}%</div>
                <div style="color: var(--text-dark, #A1A1A1); font-size: 0.85rem;">Taxa de Conversão no Período</div>
            </div>
            <!-- vCards Baixados -->
            <div style="background: var(--card-background-color, #1C1C21); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color, #2C2C2F); text-align: center;">
                <div style="color: var(--text, #ECECEC); font-size: 2.5rem; font-weight: bold; margin-bottom: 5px;">${totalVcards.toLocaleString()}</div>
                <div style="color: var(--text-dark, #A1A1A1); font-size: 0.85rem;">vCards Baixados</div>
            </div>
        </div>
        <div style="background: var(--card-background-color, #1C1C21); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color, #2C2C2F); display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            <div>
                <div style="color: var(--text-dark, #A1A1A1); font-size: 0.85rem; margin-bottom: 3px;">Primeira visualização:</div>
                <div style="color: var(--text, #ECECEC); font-size: 0.9rem; font-weight: 500;">${firstViewDate}</div>
            </div>
            <div>
                <div style="color: var(--text-dark, #A1A1A1); font-size: 0.85rem; margin-bottom: 3px;">ltima visualização:</div>
                <div style="color: var(--text, #ECECEC); font-size: 0.9rem; font-weight: 500;">${lastViewDate}</div>
            </div>
            <div>
                <div style="color: var(--text-dark, #A1A1A1); font-size: 0.85rem; margin-bottom: 3px;">ltimo clique:</div>
                <div style="color: var(--text, #ECECEC); font-size: 0.9rem; font-weight: 500;">${lastClickDate}</div>
            </div>
        </div>
    </div>
    
    <!-- Gráfico de Performance -->
    ${performance.length > 0 ? `
    <div style="margin-bottom: 30px;">
        <h3 style="color: var(--text, #ECECEC); margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-chart-line"></i> Performance ao Longo do Tempo
        </h3>
        <div style="background: var(--card-background-color, #1C1C21); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color, #2C2C2F);">
            <canvas id="client-performance-chart" style="max-height: 300px;"></canvas>
        </div>
    </div>
    ` : ''}
    
    <!-- Gráfico de Distribuição de Cliques por Link -->
    ${links.length > 0 ? `
    <div style="margin-bottom: 30px;">
        <h3 style="color: var(--text, #ECECEC); margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-chart-pie"></i> Distribuição de Cliques por Link
        </h3>
        <div style="background: var(--card-background-color, #1C1C21); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color, #2C2C2F);">
            <canvas id="client-links-distribution-chart" style="max-height: 300px;"></canvas>
        </div>
    </div>
    ` : ''}
    
    <!-- Detalhes por Link -->
    <div style="margin-bottom: 30px;">
        <h3 style="color: var(--text, #ECECEC); margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-link"></i> Detalhes de Cada Link (${links.length} ${links.length === 1 ? 'link cadastrado' : 'links cadastrados'})
        </h3>
    </div>
`;

    // Renderizar links
    if (links.length === 0) {
        html += '<p style="color: var(--text-dark); text-align: center; padding: 20px;">Você ainda não possui links cadastrados. Adicione links na aba "Editar Tag".</p>';
    } else {
        const sortedLinks = [...links].sort((a, b) => (parseInt(b.click_count) || 0) - (parseInt(a.click_count) || 0));

        html += '<div style="display: grid; gap: 15px;">' + sortedLinks.map((link) => {
            const clickCount = parseInt(link.click_count) || 0;
            const clickCountPeriod = parseInt(link.click_count_period) || 0;
            const lastClick = link.last_click_date ? new Date(link.last_click_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nunca';
            const firstClick = link.first_click_date ? new Date(link.first_click_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Nunca';
            const iconClass = link.icon_class || 'fas fa-link';
            const linkTitle = link.title || 'Sem título';
            const linkUrl = link.url || 'N/A';

            // Detectar tipo de link
            let linkType = 'Link Personalizado';
            let linkTypeColor = 'var(--dourado-principal, #FFC700)';
            if (linkUrl.includes('whatsapp.com') || linkUrl.includes('wa.me')) {
                linkType = 'WhatsApp';
                linkTypeColor = '#25D366';
            } else if (linkUrl.includes('instagram.com')) {
                linkType = 'Instagram';
                linkTypeColor = '#E4405F';
            } else if (linkUrl.includes('facebook.com')) {
                linkType = 'Facebook';
                linkTypeColor = '#1877F2';
            } else if (linkUrl.includes('youtube.com')) {
                linkType = 'YouTube';
                linkTypeColor = '#FF0000';
            } else if (linkUrl.includes('linkedin.com')) {
                linkType = 'LinkedIn';
                linkTypeColor = '#0077B5';
            }

            const conversionRate = totalViews > 0 ? ((clickCount / totalViews) * 100).toFixed(1) : '0.0';

            return `
            <div style="background: var(--card-background-color, #1C1C21); padding: 20px; border-radius: 12px; border: 2px solid var(--border-color, #2C2C2F); transition: all 0.2s;" 
                 onmouseover="this.style.borderColor='var(--dourado-principal, #FFC700)'; this.style.transform='translateY(-2px)'"
                 onmouseout="this.style.borderColor='var(--border-color, #2C2C2F)'; this.style.transform='translateY(0)'">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                    <div style="background: rgba(255, 199, 0, 0.1); padding: 15px; border-radius: 10px; border: 2px solid ${linkTypeColor};">
                        <i class="${iconClass}" style="color: ${linkTypeColor}; font-size: 2rem;"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px; flex-wrap: wrap;">
                            <span style="color: var(--text, #ECECEC); font-weight: 600; font-size: 1.1rem;">${linkTitle}</span>
                            <span style="background: ${linkTypeColor}; color: white; padding: 4px 10px; border-radius: 5px; font-size: 0.75rem; font-weight: bold;">${linkType}</span>
                        </div>
                        <div style="color: var(--text-dark, #A1A1A1); font-size: 0.9rem; word-break: break-all; margin-bottom: 5px;">${linkUrl}</div>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; padding-top: 15px; border-top: 1px solid var(--border-color, #2C2C2F);">
                    <div>
                        <div style="color: ${linkTypeColor}; font-weight: bold; font-size: 1.8rem; margin-bottom: 3px;">${clickCount.toLocaleString()}</div>
                        <div style="color: var(--text-dark, #A1A1A1); font-size: 0.75rem;">Total de Cliques</div>
                        <div style="color: var(--text-dark, #A1A1A1); font-size: 0.7rem; margin-top: 3px; opacity: 0.7;">${clickCountPeriod} no período</div>
                    </div>
                    <div>
                        <div style="color: var(--text-dark, #A1A1A1); font-size: 0.85rem; margin-bottom: 3px;">Primeiro clique:</div>
                        <div style="color: var(--text, #ECECEC); font-size: 0.85rem; font-weight: 500;">${firstClick}</div>
                    </div>
                    <div>
                        <div style="color: var(--text-dark, #A1A1A1); font-size: 0.85rem; margin-bottom: 3px;">ltimo clique:</div>
                        <div style="color: var(--text, #ECECEC); font-size: 0.85rem; font-weight: 500;">${lastClick}</div>
                    </div>
                    <div>
                        <div style="color: var(--text-dark, #A1A1A1); font-size: 0.85rem; margin-bottom: 3px;">Taxa de conversão:</div>
                        <div style="color: var(--text, #ECECEC); font-size: 0.85rem; font-weight: 500;">${conversionRate}%</div>
                    </div>
                </div>
            </div>
        `;
        }).join('') + '</div>';
    }

    // Adicionar tabela de histórico recente
    if (recentClicks.length > 0) {
        html += `
        <div style="margin-bottom: 30px; margin-top: 30px;">
            <h3 style="color: var(--text, #ECECEC); margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-history"></i> Histórico Recente de Cliques (últimos ${recentClicks.length})
            </h3>
            <div style="background: var(--card-background-color, #1C1C21); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color, #2C2C2F); overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border-color, #2C2C2F);">
                            <th style="padding: 10px; text-align: left; color: var(--text, #ECECEC); font-weight: 600;">Data/Hora</th>
                            <th style="padding: 10px; text-align: left; color: var(--text, #ECECEC); font-weight: 600;">Link</th>
                            <th style="padding: 10px; text-align: left; color: var(--text, #ECECEC); font-weight: 600;">Tipo</th>
                            <th style="padding: 10px; text-align: left; color: var(--text, #ECECEC); font-weight: 600;">URL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${recentClicks.map(click => {
            const clickDate = new Date(click.created_at).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            const linkTitle = click.title || 'Sem título';
            const linkUrl = click.url || 'N/A';

            let linkType = 'Outro';
            let linkTypeColor = 'var(--dourado-principal, #FFC700)';
            if (linkUrl.includes('whatsapp.com') || linkUrl.includes('wa.me')) {
                linkType = 'WhatsApp';
                linkTypeColor = '#25D366';
            } else if (linkUrl.includes('instagram.com')) {
                linkType = 'Instagram';
                linkTypeColor = '#E4405F';
            } else if (linkUrl.includes('facebook.com')) {
                linkType = 'Facebook';
                linkTypeColor = '#1877F2';
            } else if (linkUrl.includes('youtube.com')) {
                linkType = 'YouTube';
                linkTypeColor = '#FF0000';
            } else if (linkUrl.includes('linkedin.com')) {
                linkType = 'LinkedIn';
                linkTypeColor = '#0077B5';
            }

            return `
                                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                    <td style="padding: 10px; color: var(--text-dark, #A1A1A1); font-size: 0.9rem;">${clickDate}</td>
                                    <td style="padding: 10px; color: var(--text, #ECECEC);">${linkTitle}</td>
                                    <td style="padding: 10px;"><span style="background: ${linkTypeColor}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">${linkType}</span></td>
                                    <td style="padding: 10px;"><a href="${linkUrl}" target="_blank" style="color: var(--dourado-principal, #FFC700); text-decoration: none; font-size: 0.85rem; word-break: break-all;">${linkUrl.length > 40 ? linkUrl.substring(0, 40) + '...' : linkUrl}</a></td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    }

    allLinksDetailsEl.innerHTML = html;

    // Renderizar gráfico de performance
    if (performance.length > 0 && typeof Chart !== 'undefined') {
        const ctx = document.getElementById('client-performance-chart');
        if (ctx) {
            // Destruir gráfico anterior se existir
            if (clientPerformanceChart) {
                clientPerformanceChart.destroy();
            }

            const labels = performance.map(p => {
                const date = new Date(p.date);
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            });

            clientPerformanceChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Visualizações',
                        data: performance.map(p => parseInt(p.views) || 0),
                        borderColor: 'rgb(255, 199, 0)',
                        backgroundColor: 'rgba(255, 199, 0, 0.1)',
                        tension: 0.4,
                        fill: true
                    }, {
                        label: 'Cliques',
                        data: performance.map(p => parseInt(p.clicks) || 0),
                        borderColor: 'rgb(255, 255, 255)',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            labels: { color: '#ECECEC' }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: '#A1A1A1' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        },
                        x: {
                            ticks: { color: '#A1A1A1' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        }
                    }
                }
            });
        }
    }

    // Renderizar gráfico de distribuição de cliques
    if (links.length > 0 && typeof Chart !== 'undefined') {
        const ctx2 = document.getElementById('client-links-distribution-chart');
        if (ctx2) {
            // Destruir gráfico anterior se existir
            if (clientLinksChart) {
                clientLinksChart.destroy();
            }

            const sortedLinksForChart = [...links].sort((a, b) => (parseInt(b.click_count) || 0) - (parseInt(a.click_count) || 0)).slice(0, 10);

            clientLinksChart = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: sortedLinksForChart.map(l => {
                        const title = l.title || 'Sem título';
                        return title.length > 20 ? title.substring(0, 20) + '...' : title;
                    }),
                    datasets: [{
                        label: 'Cliques',
                        data: sortedLinksForChart.map(l => parseInt(l.click_count) || 0),
                        backgroundColor: 'rgba(255, 199, 0, 0.8)',
                        borderColor: 'rgb(255, 199, 0)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: '#A1A1A1' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        },
                        x: {
                            ticks: { color: '#A1A1A1', maxRotation: 45, minRotation: 45 },
                            grid: { display: false }
                        }
                    }
                }
            });
        }
    }
}


    // Null-safe wrappers for KPI updates
    var _renderKPIs = renderKPIs;
    renderKPIs = function (data) {
        if (!els.kpiTotalViews()) return;
        return _renderKPIs(data);
    };
    var _renderTopItems = renderTopItems;
    renderTopItems = function (data) {
        if (!els.topItemsList()) return;
        return _renderTopItems(data);
    };
    var _renderPerformanceChart = renderPerformanceChart;
    renderPerformanceChart = function (data) {
        var canvas = els.performanceChartCanvas();
        if (!canvas || typeof Chart === 'undefined') return;
        return _renderPerformanceChart(data);
    };
    var _loadReportsData = loadReportsData;
    loadReportsData = async function () {
        if (!els.periodSelector()) {
            console.warn('[DashboardRelatorios] period-selector não encontrado');
            return;
        }
        return _loadReportsData();
    };

    global.loadReportsData = loadReportsData;
    global.DashboardRelatorios = {
        init: function () {
            var sel = els.periodSelector();
            if (sel && !sel.dataset.relatoriosBound) {
                sel.addEventListener('change', function () { loadReportsData(); });
                sel.dataset.relatoriosBound = '1';
            }
        },
        load: loadReportsData,
        fetchAnalyticsData: fetchAnalyticsData
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            if (global.DashboardRelatorios) global.DashboardRelatorios.init();
        });
    } else {
        global.DashboardRelatorios.init();
    }
})(typeof window !== 'undefined' ? window : this);
