<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bíblia &amp; Devocionais (ADM)</title>
</head>
<body>
    <!-- admin-dev365-ui: gerar-por-ia + checkboxes + remover-seleccionados — se não vir isto no "Ver código-fonte", o ficheiro no servidor está desactualizado -->
    <div class="wrap">
        <h1 class="ck-ad365-739949">
            <span class="ck-ad365-c78809"><i class="fas fa-book-bible"></i> Bíblia &amp; Devocionais (ADM)</span>
            <a class="btn btn-secondary ck-ad365-80d654" href="/admin/" id="btn-voltar-dashboard" title="Voltar à tela anterior"><i class="fas fa-arrow-left"></i> Voltar</a>
        </h1>
        <p class="sub">Admin da Bíblia no cartão: <strong>Devocional 365</strong>, <strong>Prosperidade antes de dormir</strong> (Do Fracasso ao Legado), plano de leitura e estudos por livro. Requer token de administrador.</p>

        <div id="flash"></div>

        <div class="auth-bar">
            <label class="ck-ad365-6c0d09">Sessão admin (cookie). Bearer opcional só para sync:
                <form class="token-form" id="token-form" onsubmit="return false;">
                    <input type="password" class="token-input" id="token-manual" name="bearer_token" placeholder="Opcional: Bearer para sync cookie" autocomplete="off">
                </form>
            </label>
            <button type="button" class="btn btn-secondary" id="btn-save-token"><i class="fas fa-cookie"></i> Sync cookie</button>
        </div>
        <div class="auth-bar ck-ad365-0e283d">
            <label class="ck-ad365-a58e8b">URL base da API (opcional — vazio = mesma origem Laravel — ex.: <code class="ck-ad365-f0440e">https://www.conectaking.com.br</code>)
                <input type="text" class="token-input" id="api-base-url" placeholder="Deixe vazio para usar o mesmo domínio desta página" autocomplete="off">
            </label>
            <button type="button" class="btn btn-secondary" id="btn-save-api-base"><i class="fas fa-link"></i> Guardar URL</button>
        </div>

        <div class="tabs" role="tablist">
            <button type="button" class="active" data-tab="dev365"><i class="fas fa-calendar-alt"></i> Devocionais 365</button>
            <button type="button" data-tab="prosperidade"><i class="fas fa-moon"></i> Prosperidade antes de dormir</button>
            <button type="button" data-tab="plano"><i class="fas fa-book-open"></i> Um capítulo por dia</button>
            <button type="button" data-tab="estudo"><i class="fas fa-book-reader"></i> Estudo por livro</button>
            <button type="button" data-tab="ajuda"><i class="fas fa-question-circle"></i> Ajuda</button>
        </div>

        <section id="panel-dev365" class="panel active">
            <div class="card">
                <h2><i class="fas fa-palette"></i> Temas por mês (servidor / base de dados)</h2>
                <p class="ck-ad365-da12f2"><strong>Carregar do servidor</strong> busca Janeiro–Dezembro gravados na base de dados. <strong>Guardar no servidor</strong> grava os 12 meses na base (e espelha num ficheiro de backup). Também pode importar/exportar JSON no computador com os botões à parte. A geração com IA usa a URL da API + token.</p>
                <input class="ck-hidden" type="file" id="themes-file-input" accept=".json,application/json" aria-hidden="true">
                <div class="row">
                    <div>
                        <label for="themes-year">Ano dos temas</label>
                        <input class="ck-w-100" type="number" id="themes-year" min="2000" max="2100">
                    </div>
                    <button type="button" class="btn" id="btn-themes-load-server"><i class="fas fa-cloud-download-alt"></i> Carregar do servidor</button>
                    <button type="button" class="btn" id="btn-themes-save"><i class="fas fa-save"></i> Guardar no servidor</button>
                    <button type="button" class="btn btn-secondary" id="btn-themes-load"><i class="fas fa-folder-open"></i> Importar JSON</button>
                    <button type="button" class="btn btn-secondary" id="btn-themes-export"><i class="fas fa-download"></i> Exportar JSON</button>
                    <button type="button" class="btn btn-secondary" id="btn-themes-generate-all"><i class="fas fa-magic"></i> Gerar linha para os 12 meses (automático)</button>
                </div>
                <div class="ck-ad365-d6f2af" id="themes-months-host"></div>
            </div>

            <div class="card" id="card-batch-job">
                <h2><i class="fas fa-cloud"></i> Gerar vários meses (civil) — síncrono ou segundo plano</h2>
                <p class="ck-mb-10">Marque os meses e o ano civil. <strong>Gerar agora</strong> bloqueia até terminar. <strong>Segundo plano</strong> continua no servidor; ao recarregar a página, o progresso reaparece se o trabalho ainda estiver em curso neste servidor.</p>
                <div class="row">
                    <div>
                        <label for="batch-year">Ano civil</label>
                        <input class="ck-w-100" type="number" id="batch-year" min="2000" max="2100">
                    </div>
                </div>
                <div class="month-checks" id="batch-month-checks"></div>
                <div class="row ck-mt-8">
                    <button type="button" class="btn" id="btn-batch-sync"><i class="fas fa-play"></i> Gerar agora (síncrono)</button>
                    <button type="button" class="btn btn-secondary" id="btn-batch-async"><i class="fas fa-server"></i> Gerar em segundo plano (servidor)</button>
                    <button type="button" class="btn btn-secondary ck-ad365-83319a" id="btn-batch-stop"><i class="fas fa-stop"></i> Parar</button>
                </div>
                <div class="ck-ad365-3ac041" id="batch-job-panel">
                    <div class="progress-wrap"><div class="progress-bar" id="batch-progress-bar"></div></div>
                    <p class="job-status" id="batch-job-status"></p>
                </div>
            </div>

            <div class="card">
                <h2><i class="fas fa-robot"></i> Gerar com IA — por dia ou por mês civil</h2>
                <p class="ck-ad365-2b583d">Use os atalhos abaixo ou a tabela. Cada pedido chama a API neste servidor (OpenAI via <code>OPENAI_API_KEY</code> no ambiente).</p>
                <div class="row">
                    <div>
                        <label for="gen-day">Dia do ano (1—365)</label>
                        <input class="ck-w-100" type="number" id="gen-day" min="1" max="365" value="1">
                    </div>
                    <div>
                        <label for="gen-year-day">Ano civil</label>
                        <input class="ck-w-100" type="number" id="gen-year-day" min="2000" max="2100">
                    </div>
                    <div>
                        <label for="gen-tema">Modo de tema</label>
                        <select id="gen-tema">
                            <option value="mes_auto">Automático do mês</option>
                            <option value="ano_auto">Automático do ano</option>
                            <option value="mes_e_ano">Mês + ano</option>
                            <option value="personalizado">Personalizado</option>
                        </select>
                    </div>
                    <div>
                        <label for="gen-estilo">Estilo</label>
                        <select id="gen-estilo">
                            <option value="padrao">Padrão</option>
                            <option value="cunha">Estilo cunha</option>
                        </select>
                    </div>
                    <div class="ck-ad365-dd8f0c">
                        <input type="hidden" id="gen-full" value="1">
                        Geração <strong>sempre completa</strong>: novo título, nova passagem e textos (a IA evita repetir versículos já usados no mês).
                    </div>
                    <button type="button" class="btn" id="btn-gen-one-day"><i class="fas fa-magic"></i> Gerar este dia</button>
                </div>
                <div class="row">
                    <div>
                        <label for="gen-month">Mês civil</label>
                        <select id="gen-month">
                            <option value="1">Janeiro</option><option value="2">Fevereiro</option><option value="3">Março</option><option value="4">Abril</option>
                            <option value="5">Maio</option><option value="6">Junho</option><option value="7">Julho</option><option value="8">Agosto</option>
                            <option value="9">Setembro</option><option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option>
                        </select>
                    </div>
                    <div>
                        <label for="gen-year-month">Ano</label>
                        <input class="ck-w-100" type="number" id="gen-year-month" min="2000" max="2100">
                    </div>
                    <div>
                        <label for="gen-delay">Intervalo entre dias (ms)</label>
                        <input class="ck-ad365-581be4" type="number" id="gen-delay" min="0" value="400">
                    </div>
                    <button type="button" class="btn" id="btn-gen-whole-month"><i class="fas fa-calendar-check"></i> Gerar todo o mês</button>
                </div>
                <p class="msg-warn ck-mt-12-mb-0"><i class="fas fa-info-circle"></i> Gerar um mês inteiro pode levar vários minutos e consumir muitos tokens. Não feche o separador até o servidor responder.</p>
            </div>

            <div class="card">
                <h2><i class="fas fa-list"></i> Todos os dias registados</h2>
                <div class="row">
                    <div>
                        <label for="filtro-dia">Filtrar por número do dia</label>
                        <input class="ck-ad365-830eb9" type="text" id="filtro-dia" placeholder="ex.: 94 ou 9">
                    </div>
                    <div>
                        <label for="filtro-mes">Filtrar por mês civil</label>
                        <select id="filtro-mes">
                            <option value="">Todos</option>
                            <option value="1">Janeiro</option><option value="2">Fevereiro</option><option value="3">Março</option><option value="4">Abril</option>
                            <option value="5">Maio</option><option value="6">Junho</option><option value="7">Julho</option><option value="8">Agosto</option>
                            <option value="9">Setembro</option><option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option>
                        </select>
                    </div>
                    <div>
                        <label for="filtro-ano-tabela">Ano (para mês civil)</label>
                        <input class="ck-w-100" type="number" id="filtro-ano-tabela" min="2000" max="2100">
                    </div>
                    <button type="button" class="btn btn-secondary" id="btn-reload-table"><i class="fas fa-sync"></i> Atualizar lista</button>
                </div>
                <div class="month-grid" id="month-quick-btns"></div>
                <div class="ck-ad365-a19103">
                    <table>
                        <thead>
                            <tr>
                                <th>Dia</th>
                                <th>Título</th>
                                <th>Passagem</th>
                                <th>Prévia</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="tbody-dev365"><tr><td colspan="5">Carregue a lista.</td></tr></tbody>
                    </table>
                </div>
            </div>
        </section>

        <section id="panel-prosperidade" class="panel">
            <div class="card">
                <h2><i class="fas fa-moon"></i> Prosperidade antes de dormir — Do Fracasso ao Legado</h2>
                <p>31 Ativações (Provérbios 1—31) para a aba pública na Bíblia. Colar texto, gerar com IA, revisar e <strong>publicar</strong> — só publicadas aparecem no cartão.</p>
                <div class="row">
                    <button type="button" class="btn btn-secondary" id="btn-pros-reload-grid"><i class="fas fa-sync"></i> Recarregar grid</button>
                    <button type="button" class="btn btn-secondary" id="btn-pros-export"><i class="fas fa-download"></i> Exportar JSON</button>
                    <label class="btn btn-secondary ck-ad365-9a9e5f"><i class="fas fa-upload"></i> Importar JSON<input class="ck-hidden" type="file" id="pros-import-file" accept=".json"></label>
                </div>
                <div class="row ck-mt-12">
                    <div><label for="pros-batch-start">Lote IA — início</label><input class="ck-ad365-ec6626" type="number" id="pros-batch-start" min="1" max="31" value="1"></div>
                    <div><label for="pros-batch-end">fim</label><input class="ck-ad365-ec6626" type="number" id="pros-batch-end" min="1" max="31" value="7"></div>
                    <div><label for="pros-batch-delay">delay ms</label><input class="ck-ad365-8573ba" type="number" id="pros-batch-delay" value="800"></div>
                    <button type="button" class="btn" id="btn-pros-batch-async"><i class="fas fa-robot"></i> Gerar lote (async)</button>
                </div>
                <p class="job-status" id="pros-batch-status"></p>
                <div class="progress-wrap ck-hidden" id="pros-batch-progress-wrap"><div class="progress-bar" id="pros-batch-progress-bar"></div></div>
                <div class="grid-31 ck-mt-16" id="pros-grid-31"><p class="ck-ad365-8b490e">Carregue o grid (token + URL da API acima).</p></div>
            </div>
            <div class="card ck-hidden" id="pros-editor-panel">
                <h2>Ativação <span id="pros-ed-num">1</span> — <span id="pros-ed-status"></span></h2>
                <div class="cheatsheet" id="pros-cheatsheet"></div>
                <div class="tabs-ed" role="tablist">
                    <button type="button" class="active" data-ed="colar">Colar por escrito</button>
                    <button type="button" data-ed="ia">Gerar com IA</button>
                    <button type="button" data-ed="campos">Campos</button>
                    <button type="button" data-ed="preview">Preview</button>
                </div>
                <div id="pros-panel-colar" class="panel-ed active">
                    <div class="field-pros"><label>Ativação completa (use títulos: DECRETO DE ENTRADA, FUNDAMENTO SAGRADO—)</label><textarea id="pros-paste-full" rows="10"></textarea></div>
                    <button type="button" class="btn btn-secondary" id="btn-pros-parse"><i class="fas fa-cut"></i> Dividir seções</button>
                </div>
                <div id="pros-panel-ia" class="panel-ed">
                    <button type="button" class="btn" id="btn-pros-gen-one"><i class="fas fa-magic"></i> Gerar esta Ativação</button>
                    <p id="pros-gen-status" class="job-status ck-mt-10"></p>
                </div>
                <div id="pros-panel-campos" class="panel-ed">
                    <div class="field-pros"><label>Título</label><input id="pros-f-titulo"></div>
                    <div class="field-pros"><label>Decreto de entrada</label><textarea id="pros-f-decreto" rows="2"></textarea></div>
                    <div class="field-pros"><label>1. Fundamento sagrado</label><textarea id="pros-f-fundamento" rows="5"></textarea></div>
                    <div class="field-pros"><label>2. Extração de prosperidade</label><textarea id="pros-f-diagnostico"></textarea></div>
                    <p class="ck-ad365-d15df0"><strong>Frases de impacto do KING (4)</strong></p>
                    <div class="field-pros"><label>Frase 1</label><textarea id="pros-f-frase-1" rows="2"></textarea></div>
                    <div class="field-pros"><label>Frase 2</label><textarea id="pros-f-frase-2" rows="2"></textarea></div>
                    <div class="field-pros"><label>Frase 3</label><textarea id="pros-f-frase-3" rows="2"></textarea></div>
                    <div class="field-pros"><label>Frase 4</label><textarea id="pros-f-frase-4" rows="2"></textarea></div>
                    <textarea class="ck-hidden" id="pros-f-ie" aria-hidden="true"></textarea>
                    <div class="field-pros"><label>3. Na estrada + Código da Virada</label><textarea id="pros-f-estrada" rows="5"></textarea></div>
                    <div class="field-pros"><label>Diretriz de ilustração</label><textarea id="pros-f-ilustracao"></textarea></div>
                    <div class="field-pros"><label>Drive escassez</label><textarea id="pros-f-travada" rows="2"></textarea></div>
                    <div class="field-pros"><label>Drive governo</label><textarea id="pros-f-nova" rows="2"></textarea></div>
                    <div class="field-pros"><label>Protocolo neuro-celular</label><textarea id="pros-f-exercicio" rows="6"></textarea></div>
                    <div class="field-pros"><label>Treino campo (01—04)</label><textarea id="pros-f-negocios"></textarea></div>
                    <div class="field-pros"><label>Treino altar (05—07 + leitura)</label><textarea id="pros-f-altar"></textarea></div>
                    <div class="field-pros"><label>Sentença diária</label><textarea id="pros-f-sentenca"></textarea></div>
                    <div class="field-pros"><label>Próximo episódio</label><textarea id="pros-f-proximo"></textarea></div>
                </div>
                <div id="pros-panel-preview" class="panel-ed"><div class="ck-ad365-6f78a0" id="pros-preview-host"></div></div>
                <div class="row ck-ad365-f6037c">
                    <button type="button" class="btn" id="btn-pros-save-activation"><i class="fas fa-save"></i> Salvar ativação</button>
                    <button type="button" class="btn btn-secondary" id="btn-pros-save"><i class="fas fa-file-alt"></i> Salvar rascunho</button>
                    <button type="button" class="btn ck-ad365-2df897" id="btn-pros-publish"><i class="fas fa-check"></i> Publicar</button>
                    <button type="button" class="btn btn-secondary" id="btn-pros-unpublish"><i class="fas fa-eye-slash"></i> Despublicar</button>
                </div>
                <p class="ck-ad365-003536" id="pros-save-hint"></p>
            </div>
        </section>

        <section id="panel-plano" class="panel">
            <div class="card">
                <h2>Plano de leitura — um capítulo por dia</h2>
                <p>Isto é diferente do <strong>Devocional 365</strong> (texto diário com reflexão, aplicação e oração — gerado ou editado na aba <strong>Devocionais 365</strong>). O plano de leitura segue a sequência de capítulos da Bíblia ao longo do ano; o visitante vê os capítulos do dia na experiência pública.</p>
                <ul>
                    <li>O texto do <strong>Devocional 365</strong> edita-se e gera-se com IA na aba <strong>Devocionais 365</strong> (acima).</li>
                    <li>O leitor acompanha o capítulo sugerido na página pública do cartão.</li>
                </ul>
                <div class="row ck-mt-16">
                    <a class="btn" href="/bibliaking" target="_blank" rel="noopener"><i class="fas fa-external-link-alt"></i> Bíblia</a>
                    <a class="btn btn-secondary" href="#" id="link-biblia-api"><i class="fas fa-link"></i> Bíblia (URL da API)</a>
                    <a class="btn btn-secondary" href="/dashboard"><i class="fas fa-th-large"></i> Ir ao painel</a>
                </div>
                <p class="ck-ad365-f552d0">Se um dos links falhar, experimente o outro (ficheiro estático vs. servidor da API).</p>
            </div>
            <div class="card ck-ad365-a2d500">
                <h2><i class="fas fa-magic"></i> IA para o Devocional 365 neste plano</h2>
                <p>O conteúdo que o visitante lê em <strong>Devocional diário</strong> na Bíblia pública vem do mesmo registo que você gera aqui. Use <strong>Gerar este dia</strong> ou <strong>Gerar todo o mês</strong> na aba Devocionais 365, ou os atalhos rápidos:</p>
                <div class="row">
                    <button type="button" class="btn btn-secondary" id="btn-goto-gen"><i class="fas fa-arrow-up"></i> Abrir geração IA (aba Devocionais 365)</button>
                </div>
            </div>
        </section>

        <section id="panel-estudo" class="panel">
            <div class="card">
                <h2><i class="fas fa-book-reader"></i> Estudo por livro</h2>
                <p>Envie Word/PDF <strong>ou</strong> use <strong>Gerar por IA</strong> (entre Enviar e Remover) para criar um estudo longo e completo (como o de Gênesis no site). Requer a URL da API e token acima. Máx. 15 MB por ficheiro.</p>
                <div class="row ck-mt-10">
                    <div class="ck-ad365-7b1dd1">
                        <label for="study-book-search">Pesquisar livro (nome ou código, ex.: jo, Salmos)</label>
                        <input class="ck-ad365-573d81" type="text" id="study-book-search" placeholder="Filtrar lista—">
                    </div>
                    <button type="button" class="btn btn-secondary" id="btn-study-reload"><i class="fas fa-sync"></i> Atualizar lista de livros</button>
                    <button type="button" class="btn btn-secondary ck-ad365-e563ca" id="btn-study-bulk-remove"><i class="fas fa-trash-alt"></i> Remover estudos seleccionados</button>
                </div>
                <div class="ck-ad365-a19103">
                    <table>
                        <thead>
                            <tr>
                                <th class="ck-ad365-9d9216" title="Seleccionar para remover em massa"><input type="checkbox" id="study-select-all" aria-label="Seleccionar todos os livros visíveis"></th>
                                <th>Livro</th>
                                <th>Estado</th>
                                <th>Importar</th>
                                <th class="ck-ad365-47b618">Enviar · Gerar por IA · Remover</th>
                            </tr>
                        </thead>
                        <tbody id="tbody-study-books"><tr><td colspan="5">Carregue a lista.</td></tr></tbody>
                    </table>
                </div>
            </div>
        </section>

        <section id="panel-ajuda" class="panel">
            <div class="card">
                <h2>Ajuda</h2>
                <ul>
                    <li><strong>Devocionais 365:</strong> gera/edita o texto do ?oDevocional diário— na Bíblia pública.</li>
                    <li><strong>Prosperidade antes de dormir:</strong> cadastra as 31 Ativações (Do Fracasso ao Legado) — colar, IA, publicar. Só publicadas aparecem na aba da Bíblia.</li>
                    <li><strong>Gerar este dia:</strong> cria/atualiza o devocional do dia 1—365 na base (título, versículo, reflexão, aplicação, oração).</li>
                    <li><strong>Gerar todo o mês:</strong> percorre todos os dias do mês civil no ano escolhido (ex.: todos os dias de abril de 2026).</li>
                    <li>? necessário <code>OPENAI_API_KEY</code> (ou <code>BIBLE_OPENAI_API_KEY</code>) no servidor.</li>
                </ul>
            </div>
        </section>
    </div>

    <div id="modal-ver" class="modal-bg" role="dialog">
        <div class="modal">
            <h2 class="ck-ad365-ca7a31" id="modal-ver-title">Devocional</h2>
            <pre id="modal-ver-body"></pre>
            <button type="button" class="btn btn-secondary ck-mt-16" id="modal-ver-close"><i class="fas fa-times"></i> Fechar</button>
        </div>
    </div>

    
    <script src="/config.js?v=2026-09-09-vite1"></script>
    @vite(['resources/css/fontawesome.css', 'resources/js/pages/admin-devocionais-365.js'])
</body>
</html>
