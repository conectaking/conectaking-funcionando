# Plano Completo: Módulo Contratos Digital - Com Melhorias

## Especificação Completa

### IMPORTANTE: Não é um Módulo do Cartão Virtual
- **NÃO** vai em "Novos Módulos"
- **NÃO** cria item em `profile_items`
- **NÃO** aparece no cartão virtual
- É apenas uma **aba interna do dashboard** (sidebar)

### Princípio de Isolamento
- Rota base exclusiva: `/api/contracts/*` (APIs)
- Componentes exclusivos: `/modules/contracts/*`
- Service exclusivo: `contracts.service.*`
- Tabelas com prefixo `ck_contracts_*`
- Não alterar middlewares/componentes globais existentes
- Apenas substituir botão "Ajuda e Configurações" na sidebar por "Contratos"

## 1. Estrutura de Arquivos

```
modules/contracts/
  ├── contract.controller.js       # Lógica de negócio
  ├── contract.service.js          # Serviços (PDF, hash, templates)
  ├── contract.repository.js       # Acesso ao banco
  ├── contract.routes.js           # Rotas /api/contracts/*
  └── contract.validators.js       # Validações

routes/
  └── publicContract.routes.js     # Rotas públicas /contract/sign/:token

views/
  └── contractSign.ejs             # Página pública de assinatura

public_html/
  └── dashboard.html               # Adicionar painel contratos-pane (internamente)

migrations/
  └── 088_create_ck_contracts_module.sql  # Tabelas com prefixo ck_contracts_*
```

## 2. Banco de Dados (Mesma estrutura anterior)

### 2.1 Tabelas

- `ck_contracts_templates` - Templates de contratos
- `ck_contracts` - Contratos criados
- `ck_contracts_signers` - Signatários
- `ck_contracts_signatures` - Assinaturas
- `ck_contracts_audit_logs` - Auditoria

### 2.2 Seed de Templates (12 templates)

1. Prestação de Serviços (Genérico)
2. Prestação de Serviços de Fotografia
3. Prestação de Serviços de Filmmaker
4. Marketing / Social Media
5. Designer (Identidade Visual)
6. Tráfego Pago
7. Consultoria
8. NDA (Acordo de Confidencialidade)
9. Parceria Comercial
10. Locação de Equipamento
11. Contrato de Evento
12. Termo de Autorização de Uso de Imagem

## 3. MELHORIAS COMPLETAS - Lista Consolidada

### 3.1 MELHORIAS ESSENCIAIS (V1 - Implementar)

#### 🔒 Segurança (Baseado em KingForms)

1. **Rate Limiting**
   - Limite de 10 contratos criados por usuário/dia
   - Limite de 5 tentativas de assinatura por token/hora
   - Limite de 20 uploads de PDF por dia
   - Implementar com `express-rate-limit` (já existe no sistema)

2. **Validação Robusta no Backend**
   - Validar formato de PDF (não aceitar corrompidos)
   - Validar tamanho máximo (10MB para PDF)
   - Validar email de signatários (regex robusta)
   - Validar telefone brasileiro (10 ou 11 dígitos)
   - Validar CPF/CNPJ (quando aplicável)
   - Sanitização de variáveis (prevenir XSS)

3. **Validação de Token de Assinatura**
   - Token único e não reutilizável
   - Verificar expiração (7 dias padrão)
   - Verificar se já foi usado
   - Rate limiting por token

4. **Validação de Assinatura**
   - Canvas: verificar se não está vazio
   - Canvas: validar tamanho mínimo (ex: 50x20 pixels)
   - Upload: validar formato (PNG/JPG)
   - Upload: validar tamanho (máx. 2MB)
   - Upload: validar dimensões (máx. 2000x1000px)

5. **Criptografia de Dados Sensíveis**
   - Criptografar assinaturas no banco (opcional)
   - Criptografar PDFs no storage (opcional)
   - Hash SHA-256 obrigatório (já previsto)

#### 📋 Validações e Qualidade

6. **Validação de PDF Importado**
   - Verificar se PDF não está corrompido
   - Verificar se PDF não está protegido por senha
   - Extrair metadados do PDF (autor, título, data)
   - Validar tamanho máximo (10MB)

7. **Extração Inteligente de Variáveis**
   - Identificar variáveis entre `[ ]` ou `{{ }}`
   - Detectar tipos automáticos (data, número, texto)
   - Sugerir valores comuns (nome, CPF, data, valor)
   - Validar tipos de variáveis (data deve ser válida, número deve ser numérico)

8. **Preview em Tempo Real**
   - Mostrar PDF renderizado com variáveis substituídas
   - Preview responsivo (mobile/desktop)
   - Zoom e scroll no preview
   - Indicador de carregamento

#### 🔔 Notificações (Economia de Emails)

9. **Sistema de Notificações**
   - Email quando enviado para assinatura (para owner e signatários) - **UMA VEZ APENAS**
   - Email quando assinado (para owner e outros signatários)
   - Email quando contrato completo (todos assinaram)
   - **NÃO enviar lembretes automáticos** (economizar emails)
   - **NÃO enviar email de confirmação ao criar** (não necessário)
   - **NÃO enviar email de expiração** (economizar)

#### 📊 Histórico e Rastreabilidade

11. **Histórico de Alterações**
    - Registrar quem editou, quando, o que mudou
    - Versões do contrato (rastrear mudanças)
    - Comparar versões (diff visual)
    - Timestamp de cada mudança

12. **Auditoria Completa**
    - Todas as ações registradas (created, edited, sent, viewed, signed, finalized, downloaded, deleted)
    - IP, User-Agent, timestamp de cada ação
    - Hash de integridade do documento
    - Trilha de auditoria imutável

#### 🎨 UX/UI

13. **Feedback Visual**
    - Loading states durante upload de PDF
    - Loading states durante geração de PDF final
    - Progress indicators (upload, processamento)
    - Mensagens de sucesso/erro claras
    - Toast notifications (semelhante ao KingForms)
    - Animações suaves (fade-in, slide)

14. **Mobile-First para Assinatura**
    - Assinatura otimizada para celular (canvas responsivo)
    - Upload de foto fácil (câmera ou galeria)
    - Preview responsivo do contrato
    - Botões grandes e acessíveis
    - Texto legível em telas pequenas

15. **Wizard de Criação**
    - Passo 1: Escolher template ou importar PDF
    - Passo 2: Preencher variáveis
    - Passo 3: Configurar signatários
    - Passo 4: Preview e revisar
    - Passo 5: Enviar para assinatura
    - Indicador de progresso (1/5, 2/5, etc.)
    - Botão "Voltar" entre passos

16. **Tutorial Interativo**
    - Primeira vez: tutorial passo a passo
    - Tooltips contextuais
    - Dicas e sugestões
    - Vídeo explicativo (opcional)

### 3.2 MELHORIAS AVANÇADAS (V2 - Futuras)

#### 🔐 Segurança Avançada

17. **Assinatura Digital Certificada (ICP-Brasil)**
    - Integração com certificado digital A1 ou A3
    - Validação jurídica completa
    - Carimbo de tempo (timestamp)
    - Certificado de autenticidade

18. **Validação de Email**
    - Verificar se email existe (opcional, API de validação)
    - Enviar OTP por email para assinar (opcional)
    - Verificação de domínio (corporate emails)

19. **Criptografia Avançada**
    - Criptografar PDFs no storage (AES-256)
    - Criptografar assinaturas no banco
    - Criptografia end-to-end (E2E)

#### 📈 Analytics e Relatórios

20. **Dashboard de Analytics**
    - Taxa de conversão (enviados vs assinados)
    - Tempo médio para assinatura
    - Contratos mais usados (por template)
    - Clientes mais frequentes
    - Gráficos de evolução temporal
    - Métricas de desempenho

21. **Relatórios Avançados**
    - Relatório mensal de contratos
    - Relatório por cliente
    - Relatório por template
    - Exportação em Excel/CSV
    - Relatórios agendados por email

#### 🔄 Automação e Workflow

22. **Assinatura Sequencial**
    - Ordem de assinatura (sign_order > 0)
    - Assinar em sequência (um após o outro)
    - **Sem notificações automáticas** (economizar emails - usuário notifica manualmente se necessário)
    - Rastreamento de ordem

23. **Fluxo de Aprovação**
    - Workflow customizável (aprovar antes de enviar)
    - Múltiplos aprovadores
    - Rota sequencial ou paralela
    - Escalonamento em caso de atraso (opcional)

24. **Renovação Automática** (Futuro)
    - Detectar contratos com cláusula de renovação
    - Gerar novo contrato automaticamente
    - Histórico de renovações
    - **Sem lembretes automáticos** (economizar emails)

#### 🎯 Funcionalidades Premium

25. **Templates Customizados**
    - Usuário criar e salvar seus próprios templates
    - Compartilhar templates entre usuários
    - Marketplace de templates (futuro)
    - Duplicar e modificar templates existentes

26. **Variáveis Condicionais**
    - Mostrar/ocultar cláusulas baseado em variáveis
    - Lógica condicional (se valor > X, mostrar cláusula Y)
    - Campos calculados (ex: valor_total = valor_base * quantidade)

27. **Contratos Relacionados**
    - Vincular contratos (contrato principal + anexos)
    - Histórico de emendas (amendments)
    - Versões de contratos
    - Contratos complementares

28. **Multi-idioma**
    - Templates traduzidos (inglês, espanhol)
    - Interface multi-idioma
    - Cláusulas adaptadas por país

#### 🔗 Integrações

29. **Integração com CRM**
    - Sincronizar dados de clientes
    - Trazer automaticamente nome, email, telefone
    - Vincular contrato a cliente no CRM

30. **Integração com Assinadores Externos**
    - DocuSign, Adobe Sign (via API)
    - ZapSign (se houver API)
    - Enviar contrato para assinar em plataforma externa

31. **Webhooks**
    - Notificar quando contrato criado
    - Notificar quando enviado para assinatura
    - Notificar quando assinado
    - Notificar quando completo

32. **API Pública**
    - Endpoints REST para integração
    - Documentação Swagger/OpenAPI
    - Autenticação por API Key
    - Webhooks configuráveis

#### 🎨 Personalização Avançada

33. **Branding White-Label**
    - Logotipo do usuário no PDF
    - Cores personalizadas
    - Cabeçalho/rodapé customizados
    - Domínio customizado (futuro)

34. **Estilos de PDF**
    - Templates visuais (minimalista, corporativo, moderno)
    - Fontes customizadas
    - Layout personalizado
    - Cores e gradientes

### 3.3 MELHORIAS DE PERFORMANCE

35. **Cache de Templates**
    - Carregar templates uma vez
    - Cache no frontend (localStorage)
    - Atualização automática quando necessário

36. **Geração Assíncrona de PDF**
    - Processar PDF em background (queue)
    - Notificar quando pronto (email ou notificação in-app)
    - Status de processamento visível

37. **Otimização de Imagens**
    - Comprimir assinaturas automaticamente
    - Redimensionar imagens grandes
    - Formatos modernos (WebP quando possível)

38. **Lazy Loading**
    - Carregar contratos sob demanda (paginação)
    - Lazy load de previews de PDF
    - Carregar templates apenas quando necessário

### 3.4 MELHORIAS DE ACESSIBILIDADE

39. **Suporte a Leitores de Tela**
    - Tags ARIA adequadas
    - Descrições alternativas
    - Navegação por teclado

40. **Contraste e Legibilidade**
    - Contraste adequado (WCAG AA)
    - Tamanho de fonte configurável
    - Modo alto contraste

41. **Navegação por Teclado**
    - Todos os botões acessíveis via teclado
    - Atalhos de teclado (ex: Ctrl+S para salvar)
    - Foco visível

### 3.5 MELHORIAS DE COMPLIANCE (LGPD/GDPR)

42. **LGPD Compliance**
    - Consentimento explícito para dados pessoais
    - Política de privacidade dinâmica
    - Direito ao esquecimento (deletar dados)
    - Portabilidade de dados (exportar tudo)

43. **Política de Retenção**
    - Configurar tempo de retenção de contratos
    - Arquivamento automático (após X anos)
    - Exclusão automática (após X anos, se configurado)

44. **Logs de Auditoria Imutáveis**
    - Logs não podem ser alterados
    - Backup de logs
    - Retenção de logs por período legal

### 3.6 MELHORIAS ESPECÍFICAS DE CONTRATOS

45. **Validação de Cláusulas**
    - Alertar sobre cláusulas incompletas
    - Verificar se campos obrigatórios foram preenchidos
    - Sugerir melhorias (ex: falta prazo, falta valor)

46. **Assinatura Múltipla Simultânea**
    - Todos assinam ao mesmo tempo (sign_order = 0)
    - Rastreamento independente
    - Notificar quando todos assinaram

47. **Revogação de Assinatura**
    - Permitir revogar assinatura (apenas antes de todos assinarem)
    - Log de revogação
    - Reenviar para nova assinatura

48. **Comentários e Anotações**
    - Comentários internos no contrato (apenas owner)
    - Anotações para revisão
    - Histórico de comentários

49. **Assinatura com Testemunha**
    - Adicionar testemunha como signatário
    - Role: "testemunha"
    - Assinatura testemunha obrigatória (opcional)

50. **Exportação em Lote**
    - Baixar múltiplos contratos de uma vez (ZIP)
    - Exportar lista de contratos (Excel/CSV)
    - Exportar todos os contratos de um cliente

### 3.7 MELHORIAS DE INFRAESTRUTURA

51. **Backup Automático**
    - Backup de contratos importantes
    - Backup incremental
    - Recuperação em caso de falha

52. **CDN para PDFs**
    - Armazenar PDFs em CDN
    - Cache de PDFs gerados
    - Entrega rápida globalmente

53. **Processamento em Queue**
    - Fila de processamento (Bull/BullMQ)
    - Retry automático em caso de falha
    - Priorização de contratos urgentes

## 4. PRIORIZAÇÃO DAS MELHORIAS

### 🔴 Prioridade ALTA (Implementar na V1)

1. ✅ Rate Limiting (segurança)
2. ✅ Validação Robusta no Backend (segurança)
3. ✅ Validação de PDF Importado (qualidade)
4. ✅ Preview em Tempo Real (UX)
5. ✅ Sistema de Notificações (funcionalidade essencial)
6. ✅ Feedback Visual (UX)
7. ✅ Mobile-First para Assinatura (UX)
8. ✅ Histórico de Alterações (rastreabilidade)

### 🟡 Prioridade MÉDIA (Implementar na V1.5)

9. ✅ Wizard de Criação (UX)
10. ✅ Validação de Assinatura (qualidade)
11. ✅ Extração Inteligente de Variáveis (automação)
12. ✅ Criptografia de Dados Sensíveis (segurança)
13. ✅ Tutorial Interativo (UX)

### 🟢 Prioridade BAIXA (V2 ou Futuro)

15. Assinatura Digital Certificada (ICP-Brasil)
16. Dashboard de Analytics
17. Templates Customizados
18. Integrações (CRM, assinadores externos)
19. Multi-idioma
20. Outras melhorias avançadas...

## 5. Estrutura de Gerenciamento de Contratos

### 5.1 Aba "Meus Contratos"

**Funcionalidades:**
- Lista de TODOS os contratos criados pelo usuário
- Filtros: Todos, Rascunho, Enviados, Assinados, Completos, Cancelados
- Busca: por título, cliente, email do signatário
- Ordenação: Data de criação (mais recente primeiro), Título (A-Z), Status
- Cards com informações:
  - Título do contrato
  - Status (badge colorido)
  - Data de criação
  - Data de envio/assinatura
  - Número de signatários
  - Progresso (2 de 2 assinado = 100%)
  - Ações: Visualizar, Editar (se draft), Excluir, Duplicar, Baixar PDF

**Estatísticas:**
- Total de contratos
- Rascunhos
- Enviados (pendentes)
- Assinados (completos)
- Cancelados

### 5.2 Exclusão de Contratos

**Funcionalidade:**
- Botão "Excluir" em cada card de contrato
- Modal de confirmação:
  - "Tem certeza que deseja excluir este contrato?"
  - Mostrar informações: título, status, data criação
  - Opção: "Também excluir PDFs associados"
  - Botões: Cancelar, Excluir

**Processo de Exclusão:**
- Verificar se usuário tem permissão (apenas owner)
- Exclusão definitiva (DELETE com CASCADE):
  - Remove contrato de `ck_contracts`
  - Remove signatários de `ck_contracts_signers` (CASCADE)
  - Remove assinaturas de `ck_contracts_signatures` (CASCADE)
  - Remove logs de auditoria de `ck_contracts_audit_logs` (CASCADE)
- Remover PDFs do storage (opcional, configurável)
- Registrar log de exclusão (antes de remover)

**Restrições:**
- Contratos já assinados: avisar que está assinado (recomendar arquivar ao invés de excluir)
- Opção futura: "Arquivar" (soft delete) ao invés de excluir

### 5.3 Duplicação de Contratos

**Funcionalidade:**
- Botão "Duplicar" em cada card
- Criar cópia do contrato:
  - Novo ID (UUID)
  - Título: "[Título Original] (Cópia)"
  - Status: `draft`
  - Mesmas variáveis preenchidas
  - Mesmos signatários (mas sem tokens)
  - Mesmo template ou PDF original
  - Nova data de criação

## 6. Integração no Dashboard

### 6.1 Substituir Botão "Ajuda e Configurações"

**Arquivo:** `public_html/dashboard.html` (linha 110)

**REMOVER:**
```html
<a href="#" class="nav-link" id="ajuda-link"><i class="fas fa-question-circle"></i> <span>Ajuda e Configurações</span></a>
```

**ADICIONAR:**
```html
<a href="#" class="nav-link" data-target="contratos-pane" id="contratos-link" title="Contratos">
    <i class="fas fa-file-contract"></i> <span>Contratos</span>
</a>
```

### 6.2 Criar Painel de Contratos

**Arquivo:** `public_html/dashboard.html`

Adicionar `<main id="contratos-pane">` após outros painéis (após `personalizar-link-pane`):

```html
<!-- Página de Contratos -->
<main id="contratos-pane" class="main-content" data-pane style="display: none;">
    <header class="content-header">
        <h1><i class="fas fa-file-contract"></i> Contratos</h1>
        <p style="color: var(--text-secondary, #888888); margin-top: 10px;">
            Crie, gerencie e envie contratos digitais para assinatura eletrônica
        </p>
    </header>
    
    <div class="contracts-container">
        <!-- Tabs: Templates | Meus Contratos | Importar -->
        <!-- Conteúdo será carregado via JavaScript -->
    </div>
</main>
```

### 6.3 JavaScript do Painel

**Arquivo:** `public_html/dashboard.js`

Adicionar lógica para:
- Carregar contratos do usuário via `/api/contracts`
- Gerenciar tabs (Templates | Meus Contratos | Importar)
- Criar novo contrato (via template ou import)
- Listar contratos na aba "Meus Contratos"
- Visualizar, Editar, Excluir, Duplicar contratos
- Enviar para assinatura

**IMPORTANTE:** NÃO criar item em `profile_items`. Contratos são independentes do cartão virtual.

## 7. Rotas e Endpoints

### 7.1 Backend API (`/api/contracts/*`)

**Templates:**
- `GET /api/contracts/templates` → Lista templates por categoria
- `GET /api/contracts/templates/:id` → Detalhes do template
- `POST /api/contracts/templates/seed` → Popular templates (admin)

**Contratos:**
- `GET /api/contracts` → Lista contratos do usuário (com filtros e busca)
- `POST /api/contracts` → Criar novo contrato (draft)
- `POST /api/contracts/import` → Importar PDF e criar contrato
- `GET /api/contracts/:id` → Detalhes do contrato
- `PATCH /api/contracts/:id` → Editar contrato (apenas se draft)
- `POST /api/contracts/:id/send` → Enviar para assinatura
- `POST /api/contracts/:id/cancel` → Cancelar contrato
- `DELETE /api/contracts/:id` → Excluir contrato (com confirmação)
- `POST /api/contracts/:id/duplicate` → Duplicar contrato
- `GET /api/contracts/:id/audit` → Histórico de auditoria
- `GET /api/contracts/:id/download` → Download PDF final
- `GET /api/contracts/stats` → Estatísticas (total, rascunhos, enviados, assinados)

**Assinatura (público):**
- `POST /api/contracts/sign/:token/start` → Registrar acesso
- `POST /api/contracts/sign/:token/submit` → Submeter assinatura
- `GET /api/contracts/sign/:token/status` → Status da assinatura

### 7.2 Frontend (Páginas)

**IMPORTANTE:** Tudo fica DENTRO do dashboard (`dashboard.html`), não são rotas separadas.

- Painel `contratos-pane` dentro do `dashboard.html` (tabs: Templates | Meus Contratos | Importar)
- Modal/painel interno para criar/editar contrato (dentro do dashboard)
- `GET /contract/sign/:signToken` → Página pública de assinatura (SEM login) - view `contractSign.ejs`

## 8. Funcionalidades Principais

### 8.1 Criar Contrato via Template

1. Usuário clica "Contratos" na sidebar
2. Abre painel `contratos-pane`
3. Vai em tab "Templates"
4. Escolhe template (ex: "Prestação de Serviços de Fotografia")
5. Clica "Usar Template"
6. Abre wizard/modal com formulário de variáveis
7. Preenche variáveis (nome cliente, data evento, valor, etc.)
8. Preview do contrato gerado
9. Configura signatários (owner já preenchido, client via form)
10. Salva como draft OU Envia para assinatura
11. Contrato é salvo em `ck_contracts` (NÃO em `profile_items`)

### 8.2 Gerenciamento de Múltiplos Contratos

**Cada usuário pode criar vários contratos independentes:**

1. **Criar:** Novo contrato via template ou import → salvo como draft
2. **Editar:** Ajustar variáveis/signatários (apenas se draft)
3. **Enviar:** Gera tokens, envia emails → status muda para `sent`
4. **Armazenar:** Todos os contratos ficam salvos em `ck_contracts`
5. **Listar:** Aba "Meus Contratos" mostra todos
6. **Excluir:** Opção para excluir (com confirmação)
7. **Duplicar:** Criar cópia do contrato

### 8.3 Exclusão de Contratos

**Processo:**
- Usuário clica "Excluir" no card do contrato
- Modal de confirmação aparece
- Se confirmar: remove do banco (CASCADE remove tudo relacionado)
- Se contratos assinados: avisar e sugerir arquivar

## 9. Resumo das Melhorias por Categoria

### Segurança (5 melhorias)
- Rate Limiting
- Validação Robusta
- Validação de Token
- Validação de Assinatura
- Criptografia

### UX/UI (6 melhorias)
- Feedback Visual
- Mobile-First
- Wizard de Criação
- Preview em Tempo Real
- Tutorial Interativo
- Acessibilidade

### Funcionalidades (7 melhorias)
- Notificações (email UMA VEZ ao enviar para assinatura)
- Histórico de Alterações
- Auditoria Completa
- Exclusão de Contratos
- Duplicação
- Busca e Filtros
- Estatísticas

### Automação (4 melhorias)
- Extração de Variáveis
- Assinatura Sequencial
- Renovação Automática
- Fluxo de Aprovação

### Integrações (4 melhorias)
- CRM
- Assinadores Externos
- Webhooks
- API Pública

### Analytics (2 melhorias)
- Dashboard de Analytics
- Relatórios Avançados

### Compliance (2 melhorias)
- LGPD Compliance
- Política de Retenção

### Performance (4 melhorias)
- Cache
- PDF Assíncrono
- Otimização de Imagens
- Lazy Loading

**TOTAL: 52 MELHORIAS IDENTIFICADAS** (removido: Lembretes Automáticos - economia de emails)

## 10. Bibliotecas e Ferramentas Disponíveis no Sistema

**Já existentes e podem ser reutilizadas:**
- `pdf-parse` - Para extrair texto e metadados de PDFs
- `multer` + `multer-s3` - Para upload de PDFs (Cloudflare R2)
- `express-validator` - Para validações robustas no backend
- `express-rate-limit` - Para rate limiting de APIs
- `nodemailer` - Para envio de emails
- `utils/uploadValidator.js` - Validação de PDFs (já implementado)
- `utils/formValidators.js` - Padrões de validação e sanitização
- `utils/email.js` - Utilitário de email (já implementado)

**Será necessário adicionar:**
- `pdf-lib` ou `pdfmake` - Para gerar/editar PDFs (inserir assinaturas, páginas)
- `signature_pad` - Para assinatura em canvas (frontend)

## 11. Próximos Passos

1. ✅ Priorizar melhorias essenciais (V1)
2. ✅ Implementar melhorias de segurança primeiro
3. ✅ Implementar melhorias de UX/UI
4. ✅ Testar e validar
5. ✅ Planejar melhorias avançadas (V2)

## 12. Resumo Final das Melhorias

### ✅ Notificações Otimizadas (Economia de Emails)
- **Email UMA VEZ** quando enviar para assinatura (owner + signatários)
- **Email** quando alguém assinar (owner + outros signatários)
- **Email** quando contrato completo (todos assinaram)
- ❌ **NÃO** enviar lembretes automáticos
- ❌ **NÃO** enviar confirmação ao criar
- ❌ **NÃO** enviar email de expiração

**Total: 52 melhorias identificadas e priorizadas**
