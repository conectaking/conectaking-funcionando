-- Migration: Criar módulo de Contratos Digitais
-- Data: 2025-01-31
-- Descrição: Cria tabelas para gestão de contratos digitais com assinatura eletrônica
-- Prefixo: ck_contracts_* (isolado do sistema principal)

-- ============================================
-- 1. TABELA: Templates de Contratos
-- ============================================
CREATE TABLE IF NOT EXISTS ck_contracts_templates (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para templates
CREATE INDEX IF NOT EXISTS idx_contracts_templates_category ON ck_contracts_templates(category);
CREATE INDEX IF NOT EXISTS idx_contracts_templates_title ON ck_contracts_templates(title);

-- Comentários
COMMENT ON TABLE ck_contracts_templates IS 'Templates de contratos disponíveis para uso';
COMMENT ON COLUMN ck_contracts_templates.category IS 'Categoria do template (Marketing, Fotografia, Eventos, etc.)';
COMMENT ON COLUMN ck_contracts_templates.content IS 'Conteúdo do template com variáveis {{VARIAVEL}}';
COMMENT ON COLUMN ck_contracts_templates.variables IS 'Array JSON com variáveis esperadas: [{"name": "NOME_CLIENTE", "label": "Nome do Cliente", "type": "text", "required": true}]';

-- ============================================
-- 2. TABELA: Contratos
-- ============================================
CREATE TABLE IF NOT EXISTS ck_contracts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES ck_contracts_templates(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- draft, sent, signed, completed, cancelled
    contract_type VARCHAR(50) NOT NULL DEFAULT 'template',
    -- template, imported
    pdf_url TEXT,
    -- URL do PDF original (se importado)
    pdf_content TEXT,
    -- Conteúdo do contrato com variáveis substituídas
    variables JSONB DEFAULT '{}'::jsonb,
    -- Variáveis preenchidas: {"NOME_CLIENTE": "João Silva", "VALOR": "1000.00"}
    original_pdf_hash VARCHAR(64),
    -- SHA-256 do PDF original (se importado)
    final_pdf_url TEXT,
    -- URL do PDF final com assinaturas
    final_pdf_hash VARCHAR(64),
    -- SHA-256 do PDF final assinado
    expires_at TIMESTAMP,
    -- Data de expiração do link de assinatura
    completed_at TIMESTAMP,
    -- Data quando todos assinaram
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para contratos
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON ck_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON ck_contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_template_id ON ck_contracts(template_id);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON ck_contracts(created_at DESC);

-- Comentários
COMMENT ON TABLE ck_contracts IS 'Contratos criados pelos usuários';
COMMENT ON COLUMN ck_contracts.status IS 'Status: draft, sent, signed, completed, cancelled';
COMMENT ON COLUMN ck_contracts.contract_type IS 'Tipo: template (gerado de template) ou imported (PDF importado)';
COMMENT ON COLUMN ck_contracts.pdf_content IS 'Conteúdo do contrato com variáveis já substituídas';
COMMENT ON COLUMN ck_contracts.variables IS 'Objeto JSON com variáveis preenchidas: {"NOME_CLIENTE": "João", "VALOR": "1000"}';
COMMENT ON COLUMN ck_contracts.original_pdf_hash IS 'Hash SHA-256 do PDF original para integridade';
COMMENT ON COLUMN ck_contracts.final_pdf_hash IS 'Hash SHA-256 do PDF final assinado para integridade';

-- ============================================
-- 3. TABELA: Signatários
-- ============================================
CREATE TABLE IF NOT EXISTS ck_contracts_signers (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES ck_contracts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL DEFAULT 'signer',
    -- signer, witness, owner
    sign_order INTEGER NOT NULL DEFAULT 0,
    -- Ordem de assinatura (0 = simultânea, >0 = sequencial)
    sign_token VARCHAR(255) NOT NULL UNIQUE,
    -- Token único para link de assinatura (UUID + HMAC)
    token_expires_at TIMESTAMP NOT NULL,
    -- Data de expiração do token (7 dias padrão)
    signed_at TIMESTAMP,
    -- Data quando assinou
    ip_address VARCHAR(45),
    -- IP quando acessou o link
    user_agent TEXT,
    -- User-Agent do navegador
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para signatários
CREATE INDEX IF NOT EXISTS idx_contracts_signers_contract_id ON ck_contracts_signers(contract_id);
CREATE INDEX IF NOT EXISTS idx_contracts_signers_email ON ck_contracts_signers(email);
CREATE INDEX IF NOT EXISTS idx_contracts_signers_sign_token ON ck_contracts_signers(sign_token);
CREATE INDEX IF NOT EXISTS idx_contracts_signers_signed_at ON ck_contracts_signers(signed_at);

-- Comentários
COMMENT ON TABLE ck_contracts_signers IS 'Signatários do contrato';
COMMENT ON COLUMN ck_contracts_signers.role IS 'Papel: signer (signatário), witness (testemunha), owner (proprietário)';
COMMENT ON COLUMN ck_contracts_signers.sign_order IS 'Ordem: 0 = todos assinam ao mesmo tempo, >0 = sequencial (1 primeiro, 2 segundo, etc.)';
COMMENT ON COLUMN ck_contracts_signers.sign_token IS 'Token único, não reutilizável, para link de assinatura';

-- ============================================
-- 4. TABELA: Assinaturas
-- ============================================
CREATE TABLE IF NOT EXISTS ck_contracts_signatures (
    id SERIAL PRIMARY KEY,
    signer_id INTEGER NOT NULL REFERENCES ck_contracts_signers(id) ON DELETE CASCADE,
    contract_id INTEGER NOT NULL REFERENCES ck_contracts(id) ON DELETE CASCADE,
    signature_type VARCHAR(50) NOT NULL,
    -- canvas, upload, typed
    signature_data TEXT NOT NULL,
    -- Base64 do canvas, URL da imagem, ou texto digitado
    signature_image_url TEXT,
    -- URL da imagem de assinatura (se canvas ou upload)
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    signed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para assinaturas
CREATE INDEX IF NOT EXISTS idx_contracts_signatures_signer_id ON ck_contracts_signatures(signer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_signatures_contract_id ON ck_contracts_signatures(contract_id);
CREATE INDEX IF NOT EXISTS idx_contracts_signatures_signed_at ON ck_contracts_signatures(signed_at);

-- Comentários
COMMENT ON TABLE ck_contracts_signatures IS 'Assinaturas eletrônicas dos signatários';
COMMENT ON COLUMN ck_contracts_signatures.signature_type IS 'Tipo: canvas (desenho), upload (imagem), typed (texto)';
COMMENT ON COLUMN ck_contracts_signatures.signature_data IS 'Dados da assinatura (base64, URL, ou texto)';
COMMENT ON COLUMN ck_contracts_signatures.signature_image_url IS 'URL da imagem final da assinatura';

-- ============================================
-- 5. TABELA: Logs de Auditoria
-- ============================================
CREATE TABLE IF NOT EXISTS ck_contracts_audit_logs (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES ck_contracts(id) ON DELETE CASCADE,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    -- created, edited, sent, viewed, signed, finalized, downloaded, deleted
    details JSONB DEFAULT '{}'::jsonb,
    -- Detalhes da ação: {"field": "title", "old_value": "A", "new_value": "B"}
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para auditoria
CREATE INDEX IF NOT EXISTS idx_contracts_audit_contract_id ON ck_contracts_audit_logs(contract_id);
CREATE INDEX IF NOT EXISTS idx_contracts_audit_user_id ON ck_contracts_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_audit_action ON ck_contracts_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_contracts_audit_created_at ON ck_contracts_audit_logs(created_at DESC);

-- Comentários
COMMENT ON TABLE ck_contracts_audit_logs IS 'Logs de auditoria de todas as ações nos contratos';
COMMENT ON COLUMN ck_contracts_audit_logs.action IS 'Ação: created, edited, sent, viewed, signed, finalized, downloaded, deleted';
COMMENT ON COLUMN ck_contracts_audit_logs.details IS 'JSON com detalhes da ação (campos alterados, valores antigos/novos, etc.)';

-- ============================================
-- 6. SEED: Templates Iniciais (12 templates)
-- ============================================
-- Inserir templates apenas se a tabela estiver vazia
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Prestação de Serviços (Genérico)',
    'Prestação de Serviços',
    'Contrato genérico para prestação de serviços diversos',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: {{NOME_CLIENTE}}
CPF/CNPJ: {{CPF_CNPJ}}
Endereço: {{ENDERECO}}

CONTRATADO: {{NOME_CONTRATADO}}
CPF/CNPJ: {{CPF_CNPJ_CONTRATADO}}

OBJETO
O presente contrato tem por objeto a prestação dos seguintes serviços: {{DESCRICAO_SERVICOS}}.

VALOR
O valor total dos serviços é de R$ {{VALOR_TOTAL}}, a ser pago conforme: {{FORMA_PAGAMENTO}}.

PRAZO
O prazo para execução dos serviços é de {{PRAZO_EXECUCAO}}.

FORO
Fica eleito o foro da comarca de {{CIDADE_CONTRATANTE}} para dirimir qualquer controvérsia oriunda do presente contrato.

{{CIDADE_CONTRATANTE}}, {{DATA_CONTRATO}}.

_________________________          _________________________
{{NOME_CLIENTE}}                     {{NOME_CONTRATADO}}',
    '[
        {"name": "NOME_CLIENTE", "label": "Nome do Cliente", "type": "text", "required": true},
        {"name": "CPF_CNPJ", "label": "CPF/CNPJ do Cliente", "type": "text", "required": true},
        {"name": "ENDERECO", "label": "Endereço do Cliente", "type": "text", "required": false},
        {"name": "NOME_CONTRATADO", "label": "Nome do Prestador", "type": "text", "required": true},
        {"name": "CPF_CNPJ_CONTRATADO", "label": "CPF/CNPJ do Prestador", "type": "text", "required": true},
        {"name": "DESCRICAO_SERVICOS", "label": "Descrição dos Serviços", "type": "textarea", "required": true},
        {"name": "VALOR_TOTAL", "label": "Valor Total (R$)", "type": "text", "required": true},
        {"name": "FORMA_PAGAMENTO", "label": "Forma de Pagamento", "type": "text", "required": true},
        {"name": "PRAZO_EXECUCAO", "label": "Prazo para Execução", "type": "text", "required": true},
        {"name": "CIDADE_CONTRATANTE", "label": "Cidade", "type": "text", "required": true},
        {"name": "DATA_CONTRATO", "label": "Data do Contrato", "type": "date", "required": true}
    ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Prestação de Serviços (Genérico)');

-- Template 2: Fotografia de Eventos/Casamentos
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Fotografia de Eventos/Casamentos',
    'Fotografia',
    'Contrato para serviços fotográficos em eventos e casamentos',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS

CONTRATANTE: {{NOME_CLIENTE}}
CPF/CNPJ: {{CPF_CNPJ_CLIENTE}}
Endereço: {{ENDERECO_CLIENTE}}
Email: {{EMAIL_CLIENTE}}
Telefone: {{TELEFONE_CLIENTE}}

CONTRATADO: {{NOME_FOTOGRAFO}}
CPF/CNPJ: {{CPF_CNPJ_FOTOGRAFO}}
Registro Profissional: {{REGISTRO_PROFISSIONAL}}

OBJETO
O presente contrato tem por objeto a prestação de serviços fotográficos para o evento: {{TIPO_EVENTO}}, a ser realizado em {{DATA_EVENTO}}, às {{HORA_EVENTO}}, no endereço {{LOCAL_EVENTO}}.

SERVIÇOS INCLUSOS
{{DESCRICAO_SERVICOS_FOTO}}

QUANTIDADE E FORMATO
O contratado se compromete a entregar:
- Quantidade mínima de fotos: {{QUANTIDADE_FOTOS}}
- Formato digital: {{FORMATO_ENTREGA}}
- Prazo de entrega: {{PRAZO_ENTREGA}}

VALOR E FORMA DE PAGAMENTO
O valor total dos serviços fotográficos é de R$ {{VALOR_TOTAL}}, sendo:
- Sinal de R$ {{VALOR_SINAL}} no ato da assinatura
- Saldo de R$ {{VALOR_SALDO}} {{CONDICAO_PAGAMENTO}}

DIREITOS AUTORAIS
As fotos produzidas são de propriedade do contratante, sendo vedada a reprodução comercial sem autorização prévia do contratado.

{{CIDADE}}, {{DATA_CONTRATO}}.

_________________________          _________________________
{{NOME_CLIENTE}}                     {{NOME_FOTOGRAFO}}',
    '[{"name": "NOME_CLIENTE", "label": "Nome do Cliente", "type": "text", "required": true}, {"name": "CPF_CNPJ_CLIENTE", "label": "CPF/CNPJ do Cliente", "type": "text", "required": true}, {"name": "EMAIL_CLIENTE", "label": "Email do Cliente", "type": "email", "required": true}, {"name": "TELEFONE_CLIENTE", "label": "Telefone do Cliente", "type": "text", "required": true}, {"name": "NOME_FOTOGRAFO", "label": "Nome do Fotógrafo", "type": "text", "required": true}, {"name": "TIPO_EVENTO", "label": "Tipo de Evento (Ex: Casamento, Aniversário)", "type": "text", "required": true}, {"name": "DATA_EVENTO", "label": "Data do Evento", "type": "date", "required": true}, {"name": "HORA_EVENTO", "label": "Horário do Evento", "type": "text", "required": true}, {"name": "LOCAL_EVENTO", "label": "Local do Evento", "type": "text", "required": true}, {"name": "DESCRICAO_SERVICOS_FOTO", "label": "Descrição dos Serviços Inclusos", "type": "textarea", "required": true}, {"name": "QUANTIDADE_FOTOS", "label": "Quantidade Mínima de Fotos", "type": "text", "required": true}, {"name": "FORMATO_ENTREGA", "label": "Formato de Entrega (Ex: JPG, RAW)", "type": "text", "required": true}, {"name": "PRAZO_ENTREGA", "label": "Prazo para Entrega das Fotos", "type": "text", "required": true}, {"name": "VALOR_TOTAL", "label": "Valor Total (R$)", "type": "text", "required": true}, {"name": "VALOR_SINAL", "label": "Valor do Sinal (R$)", "type": "text", "required": true}, {"name": "VALOR_SALDO", "label": "Valor do Saldo (R$)", "type": "text", "required": true}, {"name": "CONDICAO_PAGAMENTO", "label": "Condição de Pagamento do Saldo", "type": "text", "required": true}, {"name": "CIDADE", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Fotografia de Eventos/Casamentos');

-- Template 3: Produção Audiovisual / Videomaker
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Produção Audiovisual / Videomaker',
    'Videomaking',
    'Contrato para produção de vídeos, filmagens e edição',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS AUDIOVISUAIS

CONTRATANTE: {{NOME_CLIENTE}}
CPF/CNPJ: {{CPF_CNPJ_CLIENTE}}
Email: {{EMAIL_CLIENTE}}
Telefone: {{TELEFONE_CLIENTE}}

CONTRATADO: {{NOME_VIDEOMAKER}}
CPF/CNPJ: {{CPF_CNPJ_VIDEOMAKER}}
Portfólio: {{PORTFOLIO_VIDEOMAKER}}

OBJETO
Contratação de serviços audiovisuais para produção de: {{TIPO_PRODUTO}}.

PRODUTO FINAL
O contratado se compromete a entregar:
- Formato: {{FORMATO_VIDEO}}
- Duração estimada: {{DURACAO_VIDEO}}
- Formato de entrega: {{FORMATO_ENTREGA_VIDEO}}
- Prazo de entrega: {{PRAZO_ENTREGA_VIDEO}}

EQUIPAMENTOS E EQUIPE
{{EQUIPAMENTOS_EQUIPE}}

CRONOGRAMA
{{CRONOGRAMA_PRODUCAO}}

VALOR E FORMA DE PAGAMENTO
Valor total: R$ {{VALOR_TOTAL_VIDEO}}
- Entrada de R$ {{VALOR_ENTRADA_VIDEO}} ({{DATA_ENTRADA}})
- Saldo de R$ {{VALOR_SALDO_VIDEO}} ({{CONDICAO_SALDO}})

REVISÕES E ALTERAÇÕES
O contratante terá direito a {{NUMERO_REVISOES}} revisões gratuitas. Alterações adicionais serão cobradas conforme tabela de alterações.

{{CIDADE_VIDEO}}, {{DATA_CONTRATO_VIDEO}}.

_________________________          _________________________
{{NOME_CLIENTE}}                     {{NOME_VIDEOMAKER}}',
    '[{"name": "NOME_CLIENTE", "label": "Nome do Cliente", "type": "text", "required": true}, {"name": "TIPO_PRODUTO", "label": "Tipo de Produto (Ex: Vídeo Institucional, Evento, Casamento)", "type": "text", "required": true}, {"name": "FORMATO_VIDEO", "label": "Formato do Vídeo (Ex: 4K, Full HD)", "type": "text", "required": true}, {"name": "DURACAO_VIDEO", "label": "Duração Estimada", "type": "text", "required": true}, {"name": "PRAZO_ENTREGA_VIDEO", "label": "Prazo para Entrega", "type": "text", "required": true}, {"name": "VALOR_TOTAL_VIDEO", "label": "Valor Total (R$)", "type": "text", "required": true}, {"name": "NUMERO_REVISOES", "label": "Número de Revisões Inclusas", "type": "text", "required": true}, {"name": "CIDADE_VIDEO", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_VIDEO", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Produção Audiovisual / Videomaker');

-- Template 4: Eventos Corporativos
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Eventos Corporativos',
    'Eventos',
    'Contrato para organização e gestão de eventos corporativos',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - EVENTOS CORPORATIVOS

CONTRATANTE: {{NOME_EMPRESA}}
CNPJ: {{CNPJ_EMPRESA}}
Responsável: {{NOME_RESPONSAVEL}}
Cargo: {{CARGO_RESPONSAVEL}}

CONTRATADO: {{NOME_ORGANIZADOR}}
CPF/CNPJ: {{CPF_CNPJ_ORGANIZADOR}}

OBJETO
Organização e execução do evento: {{NOME_EVENTO}}, a ser realizado em {{DATA_EVENTO}} das {{HORA_INICIO}} às {{HORA_TERMINO}}, no local {{LOCAL_EVENTO}}.

SERVIÇOS INCLUSOS
{{SERVICOS_EVENTO}}

VALOR TOTAL
R$ {{VALOR_TOTAL_EVENTO}}

FORMA DE PAGAMENTO
{{CONDICOES_PAGAMENTO}}

{{CIDADE_EVENTO}}, {{DATA_CONTRATO_EVENTO}}.

_________________________          _________________________
{{NOME_RESPONSAVEL}}                {{NOME_ORGANIZADOR}}',
    '[{"name": "NOME_EMPRESA", "label": "Nome da Empresa", "type": "text", "required": true}, {"name": "NOME_EVENTO", "label": "Nome do Evento", "type": "text", "required": true}, {"name": "DATA_EVENTO", "label": "Data do Evento", "type": "date", "required": true}, {"name": "LOCAL_EVENTO", "label": "Local do Evento", "type": "text", "required": true}, {"name": "VALOR_TOTAL_EVENTO", "label": "Valor Total (R$)", "type": "text", "required": true}, {"name": "CIDADE_EVENTO", "label": "Cidade", "type": "text", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Eventos Corporativos');

-- Template 5: Design Gráfico
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Design Gráfico',
    'Design',
    'Contrato para serviços de design gráfico e criação visual',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE DESIGN GRÁFICO

CONTRATANTE: {{NOME_CLIENTE_DESIGN}}
CPF/CNPJ: {{CPF_CNPJ_CLIENTE_DESIGN}}

CONTRATADO: {{NOME_DESIGNER}}
CPF/CNPJ: {{CPF_CNPJ_DESIGNER}}

PROJETO
Criação de: {{TIPO_PROJETO_DESIGN}}

ENTREGÁVEIS
{{ENTREGAVEIS_DESIGN}}

REVISÕES
{{NUMERO_REVISOES_DESIGN}} revisões inclusas.

VALOR
R$ {{VALOR_DESIGN}}

{{CIDADE_DESIGN}}, {{DATA_CONTRATO_DESIGN}}.

_________________________          _________________________
{{NOME_CLIENTE_DESIGN}}             {{NOME_DESIGNER}}',
    '[{"name": "TIPO_PROJETO_DESIGN", "label": "Tipo de Projeto (Ex: Logo, Identidade Visual)", "type": "text", "required": true}, {"name": "NUMERO_REVISOES_DESIGN", "label": "Número de Revisões", "type": "text", "required": true}, {"name": "VALOR_DESIGN", "label": "Valor Total (R$)", "type": "text", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Design Gráfico');

-- Template 6: Marketing Digital
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Marketing Digital',
    'Marketing',
    'Contrato para serviços de marketing digital e gestão de redes sociais',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - MARKETING DIGITAL

CONTRATANTE: {{NOME_CLIENTE_MARKETING}}
CNPJ: {{CNPJ_MARKETING}}

CONTRATADO: {{NOME_AGENCIA}}
CNPJ: {{CNPJ_AGENCIA}}

SERVIÇOS
{{SERVICOS_MARKETING}}

PRAZO E VALOR
Período: {{PERIODO_MARKETING}}
Valor mensal: R$ {{VALOR_MENSAL_MARKETING}}
Valor total: R$ {{VALOR_TOTAL_MARKETING}}

{{CIDADE_MARKETING}}, {{DATA_CONTRATO_MARKETING}}.

_________________________          _________________________
{{NOME_CLIENTE_MARKETING}}          {{NOME_AGENCIA}}',
    '[{"name": "SERVICOS_MARKETING", "label": "Serviços Inclusos", "type": "textarea", "required": true}, {"name": "PERIODO_MARKETING", "label": "Período de Contrato", "type": "text", "required": true}, {"name": "VALOR_MENSAL_MARKETING", "label": "Valor Mensal (R$)", "type": "text", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Marketing Digital');

-- Template 7: Consultoria
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Consultoria',
    'Consultoria',
    'Contrato para prestação de serviços de consultoria',
    'CONTRATO DE CONSULTORIA

CONTRATANTE: {{NOME_CLIENTE_CONSULT}}
CNPJ: {{CNPJ_CONSULT}}

CONSULTOR: {{NOME_CONSULTOR}}
CPF/CNPJ: {{CPF_CNPJ_CONSULTOR}}

OBJETO
Prestação de serviços de consultoria na área de {{AREA_CONSULTORIA}}.

ESCOPO
{{ESCOPO_CONSULTORIA}}

HONORÁRIOS
R$ {{VALOR_CONSULTORIA}}

{{CIDADE_CONSULT}}, {{DATA_CONTRATO_CONSULT}}.

_________________________          _________________________
{{NOME_CLIENTE_CONSULT}}            {{NOME_CONSULTOR}}',
    '[{"name": "AREA_CONSULTORIA", "label": "Área de Consultoria", "type": "text", "required": true}, {"name": "ESCOPO_CONSULTORIA", "label": "Escopo dos Serviços", "type": "textarea", "required": true}, {"name": "VALOR_CONSULTORIA", "label": "Valor Total (R$)", "type": "text", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Consultoria');

-- Template 8: Locação de Equipamentos
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Locação de Equipamentos',
    'Locação',
    'Contrato para locação de equipamentos e materiais',
    'CONTRATO DE LOCAÇÃO DE EQUIPAMENTOS

LOCADOR: {{NOME_LOCADOR}}
CPF/CNPJ: {{CPF_CNPJ_LOCADOR}}

LOCATÁRIO: {{NOME_LOCATARIO}}
CPF/CNPJ: {{CPF_CNPJ_LOCATARIO}}

EQUIPAMENTOS
{{LISTA_EQUIPAMENTOS}}

PERÍODO DE LOCAÇÃO
De {{DATA_INICIO_LOC}} até {{DATA_FIM_LOC}}

VALOR
R$ {{VALOR_LOCACAO}} por {{PERIODO_LOCACAO}}

Caução: R$ {{VALOR_CAUCAO}}

{{CIDADE_LOC}}, {{DATA_CONTRATO_LOC}}.

_________________________          _________________________
{{NOME_LOCADOR}}                    {{NOME_LOCATARIO}}',
    '[{"name": "LISTA_EQUIPAMENTOS", "label": "Lista de Equipamentos", "type": "textarea", "required": true}, {"name": "DATA_INICIO_LOC", "label": "Data Início", "type": "date", "required": true}, {"name": "DATA_FIM_LOC", "label": "Data Fim", "type": "date", "required": true}, {"name": "VALOR_LOCACAO", "label": "Valor da Locação (R$)", "type": "text", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Locação de Equipamentos');

-- Template 9: Parceria Comercial
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Parceria Comercial',
    'Parcerias',
    'Contrato para estabelecimento de parcerias comerciais',
    'CONTRATO DE PARCERIA COMERCIAL

PARTE 1: {{NOME_PARCEIRO_1}}
CNPJ: {{CNPJ_PARCEIRO_1}}

PARTE 2: {{NOME_PARCEIRO_2}}
CNPJ: {{CNPJ_PARCEIRO_2}}

OBJETO
Estabelecimento de parceria para: {{OBJETO_PARCERIA}}

CONTRIBUIÇÕES
{{CONTRIBUICOES_PARCEIROS}}

DIVISÃO DE RESULTADOS
{{DIVISAO_RESULTADOS}}

VIGÊNCIA
{{VIGENCIA_PARCERIA}}

{{CIDADE_PAR}}, {{DATA_CONTRATO_PAR}}.

_________________________          _________________________
{{NOME_PARCEIRO_1}}                 {{NOME_PARCEIRO_2}}',
    '[{"name": "OBJETO_PARCERIA", "label": "Objeto da Parceria", "type": "textarea", "required": true}, {"name": "VIGENCIA_PARCERIA", "label": "Vigência do Contrato", "type": "text", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Parceria Comercial');

-- Template 10: Ensaios Fotográficos
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Ensaios Fotográficos',
    'Fotografia',
    'Contrato para sessões de fotos e ensaios fotográficos',
    'CONTRATO DE ENSAIO FOTOGRÁFICO

CONTRATANTE: {{NOME_CLIENTE_ENSAIO}}
CPF: {{CPF_CLIENTE_ENSAIO}}

FOTÓGRAFO: {{NOME_FOTOGRAFO_ENSAIO}}
CPF/CNPJ: {{CPF_CNPJ_FOTOGRAFO_ENSAIO}}

TIPO DE ENSAIO
{{TIPO_ENSAIO}}

DATA E LOCAL
Data: {{DATA_ENSAIO}}
Horário: {{HORARIO_ENSAIO}}
Local: {{LOCAL_ENSAIO}}

ENTREGÁVEIS
{{ENTREGAVEIS_ENSAIO}}
Prazo: {{PRAZO_ENTREGA_ENSAIO}}

VALOR
R$ {{VALOR_ENSAIO}}

{{CIDADE_ENSAIO}}, {{DATA_CONTRATO_ENSAIO}}.

_________________________          _________________________
{{NOME_CLIENTE_ENSAIO}}             {{NOME_FOTOGRAFO_ENSAIO}}',
    '[{"name": "TIPO_ENSAIO", "label": "Tipo de Ensaio (Ex: Casal, Individual, Gestante)", "type": "text", "required": true}, {"name": "DATA_ENSAIO", "label": "Data do Ensaio", "type": "date", "required": true}, {"name": "VALOR_ENSAIO", "label": "Valor Total (R$)", "type": "text", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Ensaios Fotográficos');

-- Template 11: DJ para Eventos
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'DJ para Eventos',
    'Eventos',
    'Contrato para contratação de DJ e sonorização de eventos',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - DJ E SONORIZAÇÃO

CONTRATANTE: {{NOME_CLIENTE_DJ}}
CPF/CNPJ: {{CPF_CNPJ_DJ}}

DJ: {{NOME_DJ}}
CPF/CNPJ: {{CPF_CNPJ_DJ_NOME}}

EVENTO
{{TIPO_EVENTO_DJ}}
Data: {{DATA_EVENTO_DJ}}
Horário: {{HORARIO_DJ}}
Local: {{LOCAL_EVENTO_DJ}}

EQUIPAMENTOS
{{EQUIPAMENTOS_DJ}}

VALOR
R$ {{VALOR_DJ}}

{{CIDADE_DJ}}, {{DATA_CONTRATO_DJ}}.

_________________________          _________________________
{{NOME_CLIENTE_DJ}}                 {{NOME_DJ}}',
    '[{"name": "TIPO_EVENTO_DJ", "label": "Tipo de Evento", "type": "text", "required": true}, {"name": "DATA_EVENTO_DJ", "label": "Data do Evento", "type": "date", "required": true}, {"name": "VALOR_DJ", "label": "Valor Total (R$)", "type": "text", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'DJ para Eventos');

-- Template 12: Buffet e Alimentação
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Buffet e Alimentação',
    'Eventos',
    'Contrato para serviços de buffet e alimentação em eventos',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - BUFFET

CONTRATANTE: {{NOME_CLIENTE_BUFFET}}
CNPJ: {{CNPJ_BUFFET_CLIENTE}}

BUFFET: {{NOME_BUFFET}}
CNPJ: {{CNPJ_BUFFET}}

EVENTO
{{TIPO_EVENTO_BUFFET}}
Data: {{DATA_EVENTO_BUFFET}}
Número de convidados: {{NUMERO_CONVIDADOS}}
Local: {{LOCAL_EVENTO_BUFFET}}

CARDÁPIO
{{CARDAPIO_SERVICOS}}

VALOR
R$ {{VALOR_BUFFET}} por pessoa
Total: R$ {{VALOR_TOTAL_BUFFET}}

{{CIDADE_BUFFET}}, {{DATA_CONTRATO_BUFFET}}.

_________________________          _________________________
{{NOME_CLIENTE_BUFFET}}             {{NOME_BUFFET}}',
    '[{"name": "TIPO_EVENTO_BUFFET", "label": "Tipo de Evento", "type": "text", "required": true}, {"name": "NUMERO_CONVIDADOS", "label": "Número de Convidados", "type": "text", "required": true}, {"name": "CARDAPIO_SERVICOS", "label": "Cardápio e Serviços Inclusos", "type": "textarea", "required": true}, {"name": "VALOR_BUFFET", "label": "Valor por Pessoa (R$)", "type": "text", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Buffet e Alimentação');

-- Template 13: Coaching e Mentoria
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Coaching e Mentoria',
    'Coaching',
    'Contrato para serviços de coaching pessoal ou profissional e mentoria',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - COACHING E MENTORIA

CONTRATANTE: {{NOME_CLIENTE_COACH}}
CPF/CNPJ: {{CPF_CNPJ_COACH}}
Email: {{EMAIL_COACH_CLIENTE}}
Telefone: {{TELEFONE_COACH_CLIENTE}}

COACH/MENTOR: {{NOME_COACH}}
Certificação: {{CERTIFICACAO_COACH}}

OBJETO
O presente contrato tem por objeto a prestação de serviços de {{TIPO_COACHING}} para o desenvolvimento de {{AREA_DESENVOLVIMENTO}}.

SERVIÇOS INCLUSOS
{{DESCRICAO_SERVICOS_COACH}}
- Quantidade de sessões: {{NUMERO_SESSOES}}
- Duração de cada sessão: {{DURACAO_SESSAO}}
- Modalidade: {{MODALIDADE_COACHING}} (presencial/online)
- Prazo de vigência: {{PRAZO_VIGENCIA}}

VALOR E FORMA DE PAGAMENTO
O valor total dos serviços é de R$ {{VALOR_TOTAL_COACH}}, sendo:
- Forma de pagamento: {{FORMA_PAGAMENTO_COACH}}
- {{CONDICAO_PAGAMENTO_COACH}}

CONFIDENCIALIDADE
Todas as informações compartilhadas durante as sessões são confidenciais e serão mantidas em sigilo.

{{CIDADE_COACH}}, {{DATA_CONTRATO_COACH}}.

_________________________          _________________________
{{NOME_CLIENTE_COACH}}                     {{NOME_COACH}}',
    '[{"name": "NOME_CLIENTE_COACH", "label": "Nome do Cliente", "type": "text", "required": true}, {"name": "NOME_COACH", "label": "Nome do Coach/Mentor", "type": "text", "required": true}, {"name": "TIPO_COACHING", "label": "Tipo de Coaching (Pessoal, Profissional, Executivo)", "type": "text", "required": true}, {"name": "AREA_DESENVOLVIMENTO", "label": "Área de Desenvolvimento", "type": "text", "required": true}, {"name": "NUMERO_SESSOES", "label": "Número de Sessões", "type": "text", "required": true}, {"name": "DURACAO_SESSAO", "label": "Duração de Cada Sessão", "type": "text", "required": true}, {"name": "MODALIDADE_COACHING", "label": "Modalidade (Presencial/Online)", "type": "text", "required": true}, {"name": "VALOR_TOTAL_COACH", "label": "Valor Total (R$)", "type": "text", "required": true}, {"name": "FORMA_PAGAMENTO_COACH", "label": "Forma de Pagamento", "type": "text", "required": true}, {"name": "CIDADE_COACH", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_COACH", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Coaching e Mentoria');

-- Template 14: Aulas Particulares
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Aulas Particulares',
    'Educação',
    'Contrato para prestação de serviços de aulas particulares e reforço escolar',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - AULAS PARTICULARES

ALUNO/RESPONSÁVEL: {{NOME_ALUNO}}
CPF/CNPJ: {{CPF_ALUNO}}
Email: {{EMAIL_ALUNO}}
Telefone: {{TELEFONE_ALUNO}}

PROFESSOR: {{NOME_PROFESSOR}}
Formação: {{FORMACAO_PROFESSOR}}
Registro: {{REGISTRO_PROFESSOR}}

OBJETO
O presente contrato tem por objeto a prestação de serviços de aulas particulares na disciplina/matéria de {{DISCIPLINA}}.

CONTEÚDO E METODOLOGIA
{{CONTEUDO_AULAS}}
- Nível: {{NIVEL_AULA}}
- Frequência: {{FREQUENCIA_AULAS}}
- Duração de cada aula: {{DURACAO_AULA}}
- Modalidade: {{MODALIDADE_AULA}} (presencial/online)

VALOR E FORMA DE PAGAMENTO
O valor é de R$ {{VALOR_HORA}} por hora/aula, totalizando R$ {{VALOR_TOTAL_AULA}} por {{PERIODO_PAGAMENTO}}.
- Forma de pagamento: {{FORMA_PAGAMENTO_AULA}}

PRAZO
O contrato terá vigência de {{DATA_INICIO}} até {{DATA_TERMINO}}.

{{CIDADE_AULA}}, {{DATA_CONTRATO_AULA}}.

_________________________          _________________________
{{NOME_ALUNO}}                     {{NOME_PROFESSOR}}',
    '[{"name": "NOME_ALUNO", "label": "Nome do Aluno/Responsável", "type": "text", "required": true}, {"name": "NOME_PROFESSOR", "label": "Nome do Professor", "type": "text", "required": true}, {"name": "DISCIPLINA", "label": "Disciplina/Matéria", "type": "text", "required": true}, {"name": "NIVEL_AULA", "label": "Nível (Fundamental, Médio, Superior)", "type": "text", "required": true}, {"name": "FREQUENCIA_AULAS", "label": "Frequência das Aulas", "type": "text", "required": true}, {"name": "DURACAO_AULA", "label": "Duração de Cada Aula", "type": "text", "required": true}, {"name": "VALOR_HORA", "label": "Valor por Hora/Aula (R$)", "type": "text", "required": true}, {"name": "VALOR_TOTAL_AULA", "label": "Valor Total (R$)", "type": "text", "required": true}, {"name": "PERIODO_PAGAMENTO", "label": "Período de Pagamento (Ex: mês)", "type": "text", "required": true}, {"name": "DATA_INICIO", "label": "Data Início", "type": "date", "required": true}, {"name": "DATA_TERMINO", "label": "Data Término", "type": "date", "required": true}, {"name": "CIDADE_AULA", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_AULA", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Aulas Particulares');

-- Template 15: Serviços de Beleza (Salão/Estética)
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Serviços de Beleza e Estética',
    'Beleza',
    'Contrato para serviços de salão de beleza, estética e cuidados pessoais',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - BELEZA E ESTÉTICA

CLIENTE: {{NOME_CLIENTE_BELEZA}}
CPF: {{CPF_CLIENTE_BELEZA}}
Telefone: {{TELEFONE_CLIENTE_BELEZA}}

PROFISSIONAL/ESTABELECIMENTO: {{NOME_ESTABELECIMENTO}}
CNPJ: {{CNPJ_ESTABELECIMENTO}}
Endereço: {{ENDERECO_ESTABELECIMENTO}}

SERVIÇOS CONTRATADOS
{{LISTA_SERVICOS_BELEZA}}
- Data/hora agendada: {{DATA_HORA_AGENDAMENTO}}
- Profissional responsável: {{NOME_PROFISSIONAL}}

VALOR
O valor total dos serviços é de R$ {{VALOR_TOTAL_BELEZA}}.
- Forma de pagamento: {{FORMA_PAGAMENTO_BELEZA}}
- {{CONDICAO_PAGAMENTO_BELEZA}}

POLÍTICA DE CANCELAMENTO
{{POLITICA_CANCELAMENTO}}

{{CIDADE_BELEZA}}, {{DATA_CONTRATO_BELEZA}}.

_________________________          _________________________
{{NOME_CLIENTE_BELEZA}}                     {{NOME_ESTABELECIMENTO}}',
    '[{"name": "NOME_CLIENTE_BELEZA", "label": "Nome do Cliente", "type": "text", "required": true}, {"name": "NOME_ESTABELECIMENTO", "label": "Nome do Estabelecimento/Profissional", "type": "text", "required": true}, {"name": "LISTA_SERVICOS_BELEZA", "label": "Lista de Serviços Contratados", "type": "textarea", "required": true}, {"name": "DATA_HORA_AGENDAMENTO", "label": "Data e Hora Agendada", "type": "text", "required": true}, {"name": "VALOR_TOTAL_BELEZA", "label": "Valor Total (R$)", "type": "text", "required": true}, {"name": "FORMA_PAGAMENTO_BELEZA", "label": "Forma de Pagamento", "type": "text", "required": true}, {"name": "POLITICA_CANCELAMENTO", "label": "Política de Cancelamento", "type": "textarea", "required": false}, {"name": "CIDADE_BELEZA", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_BELEZA", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Serviços de Beleza e Estética');

-- Template 16: Personal Trainer
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Personal Trainer',
    'Fitness',
    'Contrato para serviços de personal trainer e treinamento físico personalizado',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - PERSONAL TRAINER

CLIENTE: {{NOME_CLIENTE_TRAINER}}
CPF: {{CPF_CLIENTE_TRAINER}}
Email: {{EMAIL_CLIENTE_TRAINER}}
Telefone: {{TELEFONE_CLIENTE_TRAINER}}

PERSONAL TRAINER: {{NOME_TRAINER}}
CREF: {{CREF_TRAINER}}
Especialização: {{ESPECIALIZACAO_TRAINER}}

OBJETIVO DO TREINAMENTO
{{OBJETIVO_TREINAMENTO}}

PLANO DE TREINO
{{DESCRICAO_PLANO_TREINO}}
- Frequência semanal: {{FREQUENCIA_TREINOS}}
- Duração de cada sessão: {{DURACAO_SESSAO_TREINO}}
- Local: {{LOCAL_TREINO}}
- Período: {{DATA_INICIO_TREINO}} até {{DATA_TERMINO_TREINO}}

VALOR E FORMA DE PAGAMENTO
O valor é de R$ {{VALOR_SESSAO}} por sessão, totalizando R$ {{VALOR_TOTAL_TREINO}} por {{PERIODO_PAGAMENTO_TREINO}}.
- Forma de pagamento: {{FORMA_PAGAMENTO_TREINO}}

RESPONSABILIDADES
O cliente declara estar apto para a prática de exercícios físicos e assumirá as responsabilidades pelos riscos inerentes à atividade.

{{CIDADE_TRAINER}}, {{DATA_CONTRATO_TRAINER}}.

_________________________          _________________________
{{NOME_CLIENTE_TRAINER}}                     {{NOME_TRAINER}}',
    '[{"name": "NOME_CLIENTE_TRAINER", "label": "Nome do Cliente", "type": "text", "required": true}, {"name": "NOME_TRAINER", "label": "Nome do Personal Trainer", "type": "text", "required": true}, {"name": "OBJETIVO_TREINAMENTO", "label": "Objetivo do Treinamento", "type": "textarea", "required": true}, {"name": "FREQUENCIA_TREINOS", "label": "Frequência Semanal", "type": "text", "required": true}, {"name": "DURACAO_SESSAO_TREINO", "label": "Duração de Cada Sessão", "type": "text", "required": true}, {"name": "LOCAL_TREINO", "label": "Local do Treino", "type": "text", "required": true}, {"name": "VALOR_SESSAO", "label": "Valor por Sessão (R$)", "type": "text", "required": true}, {"name": "VALOR_TOTAL_TREINO", "label": "Valor Total (R$)", "type": "text", "required": true}, {"name": "PERIODO_PAGAMENTO_TREINO", "label": "Período de Pagamento", "type": "text", "required": true}, {"name": "DATA_INICIO_TREINO", "label": "Data Início", "type": "date", "required": true}, {"name": "DATA_TERMINO_TREINO", "label": "Data Término", "type": "date", "required": true}, {"name": "CIDADE_TRAINER", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_TRAINER", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Personal Trainer');

-- Template 17: Desenvolvimento de Software
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Desenvolvimento de Software',
    'Tecnologia',
    'Contrato para desenvolvimento de software, aplicativos e sistemas',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - DESENVOLVIMENTO DE SOFTWARE

CONTRATANTE: {{NOME_CLIENTE_SOFT}}
CNPJ: {{CNPJ_CLIENTE_SOFT}}
Email: {{EMAIL_CLIENTE_SOFT}}

DESENVOLVEDOR/EMPRESA: {{NOME_DEV}}
CNPJ: {{CNPJ_DEV}}

OBJETO
O presente contrato tem por objeto o desenvolvimento de {{TIPO_SOFTWARE}} conforme especificações descritas abaixo.

ESPECIFICAÇÕES DO PROJETO
{{ESPECIFICACOES_PROJETO}}
- Tecnologias: {{TECNOLOGIAS}}
- Prazo de desenvolvimento: {{PRAZO_DESENVOLVIMENTO}}
- Fases de entrega: {{FASES_ENTREGA}}

ENTREGÁVEIS
{{ENTREGAVEIS}}
- Suporte pós-lançamento: {{PERIODO_SUPORTE}}

VALOR E FORMA DE PAGAMENTO
O valor total do projeto é de R$ {{VALOR_TOTAL_SOFT}}, sendo:
- Entrada: R$ {{VALOR_ENTRADA_SOFT}}
- Parcelas: {{CONDICAO_PAGAMENTO_SOFT}}

PROPRIEDADE INTELECTUAL
{{DIREITOS_PROPRIEDADE}}

{{CIDADE_SOFT}}, {{DATA_CONTRATO_SOFT}}.

_________________________          _________________________
{{NOME_CLIENTE_SOFT}}                     {{NOME_DEV}}',
    '[{"name": "NOME_CLIENTE_SOFT", "label": "Nome do Cliente/Empresa", "type": "text", "required": true}, {"name": "NOME_DEV", "label": "Nome do Desenvolvedor/Empresa", "type": "text", "required": true}, {"name": "TIPO_SOFTWARE", "label": "Tipo de Software (Aplicativo, Sistema Web, etc.)", "type": "text", "required": true}, {"name": "ESPECIFICACOES_PROJETO", "label": "Especificações do Projeto", "type": "textarea", "required": true}, {"name": "TECNOLOGIAS", "label": "Tecnologias Utilizadas", "type": "text", "required": true}, {"name": "PRAZO_DESENVOLVIMENTO", "label": "Prazo de Desenvolvimento", "type": "text", "required": true}, {"name": "ENTREGAVEIS", "label": "Entregáveis", "type": "textarea", "required": true}, {"name": "VALOR_TOTAL_SOFT", "label": "Valor Total (R$)", "type": "text", "required": true}, {"name": "VALOR_ENTRADA_SOFT", "label": "Valor da Entrada (R$)", "type": "text", "required": true}, {"name": "CONDICAO_PAGAMENTO_SOFT", "label": "Condição de Pagamento", "type": "text", "required": true}, {"name": "CIDADE_SOFT", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_SOFT", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Desenvolvimento de Software');

-- Template 18: Arquitetura e Projetos
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Arquitetura e Projetos',
    'Arquitetura',
    'Contrato para serviços de arquitetura, projetos arquitetônicos e execução',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - ARQUITETURA

CONTRATANTE: {{NOME_CLIENTE_ARQ}}
CPF/CNPJ: {{CPF_CNPJ_CLIENTE_ARQ}}
Endereço: {{ENDERECO_CLIENTE_ARQ}}

ARQUITETO: {{NOME_ARQUITETO}}
CAU: {{CAU_ARQUITETO}}

OBJETO
O presente contrato tem por objeto a prestação de serviços de arquitetura para {{TIPO_PROJETO_ARQ}} no endereço {{ENDERECO_OBRA}}.

SERVIÇOS INCLUSOS
{{DESCRICAO_SERVICOS_ARQ}}
- Área total: {{AREA_TOTAL}}
- Número de pavimentos: {{NUMERO_PAVIMENTOS}}
- Prazo de entrega do projeto: {{PRAZO_ENTREGA_PROJETO}}

ETAPAS DO PROJETO
{{ETAPAS_PROJETO}}

VALOR E FORMA DE PAGAMENTO
O valor total dos serviços é de R$ {{VALOR_TOTAL_ARQ}}, sendo:
- Projeto arquitetônico: R$ {{VALOR_PROJETO}}
- Acompanhamento de obra: R$ {{VALOR_ACOMPANHAMENTO}}
- Forma de pagamento: {{FORMA_PAGAMENTO_ARQ}}

{{CIDADE_ARQ}}, {{DATA_CONTRATO_ARQ}}.

_________________________          _________________________
{{NOME_CLIENTE_ARQ}}                     {{NOME_ARQUITETO}}',
    '[{"name": "NOME_CLIENTE_ARQ", "label": "Nome do Cliente", "type": "text", "required": true}, {"name": "NOME_ARQUITETO", "label": "Nome do Arquiteto", "type": "text", "required": true}, {"name": "TIPO_PROJETO_ARQ", "label": "Tipo de Projeto (Residencial, Comercial, etc.)", "type": "text", "required": true}, {"name": "ENDERECO_OBRA", "label": "Endereço da Obra", "type": "text", "required": true}, {"name": "DESCRICAO_SERVICOS_ARQ", "label": "Descrição dos Serviços", "type": "textarea", "required": true}, {"name": "ETAPAS_PROJETO", "label": "Etapas do Projeto", "type": "textarea", "required": true}, {"name": "VALOR_TOTAL_ARQ", "label": "Valor Total (R$)", "type": "text", "required": true}, {"name": "VALOR_PROJETO", "label": "Valor do Projeto (R$)", "type": "text", "required": true}, {"name": "VALOR_ACOMPANHAMENTO", "label": "Valor do Acompanhamento (R$)", "type": "text", "required": false}, {"name": "FORMA_PAGAMENTO_ARQ", "label": "Forma de Pagamento", "type": "text", "required": true}, {"name": "CIDADE_ARQ", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_ARQ", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Arquitetura e Projetos');

-- Template 19: Tradução e Interpretação
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Tradução e Interpretação',
    'Tradução',
    'Contrato para serviços de tradução de documentos e interpretação',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - TRADUÇÃO

CONTRATANTE: {{NOME_CLIENTE_TRAD}}
CPF/CNPJ: {{CPF_CNPJ_CLIENTE_TRAD}}
Email: {{EMAIL_CLIENTE_TRAD}}

TRADUTOR: {{NOME_TRADUTOR}}
Registro Profissional: {{REGISTRO_TRADUTOR}}
Idiomas: {{IDIOMAS_TRADUTOR}}

OBJETO
O presente contrato tem por objeto a prestação de serviços de {{TIPO_SERVICO_TRAD}} do(s) documento(s) conforme especificado abaixo.

DOCUMENTO(S) A TRADUZIR
{{DESCRICAO_DOCUMENTOS}}
- Idioma origem: {{IDIOMA_ORIGEM}}
- Idioma destino: {{IDIOMA_DESTINO}}
- Prazo de entrega: {{PRAZO_ENTREGA_TRAD}}
- Formato: {{FORMATO_ENTREGA_TRAD}}

VALOR E FORMA DE PAGAMENTO
O valor total dos serviços é de R$ {{VALOR_TOTAL_TRAD}}, baseado em {{UNIDADE_CALCULO}} (páginas/palavras/caracteres).
- Forma de pagamento: {{FORMA_PAGAMENTO_TRAD}}

CONFIDENCIALIDADE
O tradutor compromete-se a manter sigilo sobre o conteúdo dos documentos traduzidos.

{{CIDADE_TRAD}}, {{DATA_CONTRATO_TRAD}}.

_________________________          _________________________
{{NOME_CLIENTE_TRAD}}                     {{NOME_TRADUTOR}}',
    '[{"name": "NOME_CLIENTE_TRAD", "label": "Nome do Cliente", "type": "text", "required": true}, {"name": "NOME_TRADUTOR", "label": "Nome do Tradutor", "type": "text", "required": true}, {"name": "TIPO_SERVICO_TRAD", "label": "Tipo de Serviço (Tradução/Interpretação)", "type": "text", "required": true}, {"name": "DESCRICAO_DOCUMENTOS", "label": "Descrição dos Documentos", "type": "textarea", "required": true}, {"name": "IDIOMA_ORIGEM", "label": "Idioma Origem", "type": "text", "required": true}, {"name": "IDIOMA_DESTINO", "label": "Idioma Destino", "type": "text", "required": true}, {"name": "PRAZO_ENTREGA_TRAD", "label": "Prazo de Entrega", "type": "text", "required": true}, {"name": "VALOR_TOTAL_TRAD", "label": "Valor Total (R$)", "type": "text", "required": true}, {"name": "UNIDADE_CALCULO", "label": "Unidade de Cálculo (páginas/palavras)", "type": "text", "required": true}, {"name": "CIDADE_TRAD", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_TRAD", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Tradução e Interpretação');

-- Template 20: Serviços Jurídicos
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Serviços Jurídicos',
    'Direito',
    'Contrato para prestação de serviços advocatícios e consultoria jurídica',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - ASSESSORIA JURÍDICA

CONTRATANTE: {{NOME_CLIENTE_JUR}}
CPF/CNPJ: {{CPF_CNPJ_CLIENTE_JUR}}
Endereço: {{ENDERECO_CLIENTE_JUR}}

ADVOGADO/ESCRITÓRIO: {{NOME_ADVOGADO}}
OAB: {{OAB_ADVOGADO}}
Escritório: {{NOME_ESCRITORIO}}

OBJETO
O presente contrato tem por objeto a prestação de serviços advocatícios na área de {{AREA_ATUACAO_JUR}}.

SERVIÇOS CONTRATADOS
{{DESCRICAO_SERVICOS_JUR}}
- Assunto: {{ASSUNTO_JURIDICO}}
- Prazo estimado: {{PRAZO_SERVICOS_JUR}}

HONORÁRIOS
O valor dos honorários advocatícios é de R$ {{VALOR_HONORARIOS_JUR}}.
- Forma de pagamento: {{FORMA_PAGAMENTO_JUR}}
- Percentual de êxito (se aplicável): {{PERCENTUAL_EXITO}}

REEMBOLSOS E DESPESAS
As despesas processuais e outras despesas necessárias serão custeadas pelo contratante, além dos honorários.

{{CIDADE_JUR}}, {{DATA_CONTRATO_JUR}}.

_________________________          _________________________
{{NOME_CLIENTE_JUR}}                     {{NOME_ADVOGADO}}',
    '[{"name": "NOME_CLIENTE_JUR", "label": "Nome do Cliente", "type": "text", "required": true}, {"name": "NOME_ADVOGADO", "label": "Nome do Advogado", "type": "text", "required": true}, {"name": "AREA_ATUACAO_JUR", "label": "Área de Atuação (Civil, Trabalhista, etc.)", "type": "text", "required": true}, {"name": "DESCRICAO_SERVICOS_JUR", "label": "Descrição dos Serviços", "type": "textarea", "required": true}, {"name": "ASSUNTO_JURIDICO", "label": "Assunto Jurídico", "type": "text", "required": true}, {"name": "VALOR_HONORARIOS_JUR", "label": "Valor dos Honorários (R$)", "type": "text", "required": true}, {"name": "FORMA_PAGAMENTO_JUR", "label": "Forma de Pagamento", "type": "text", "required": true}, {"name": "CIDADE_JUR", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_JUR", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Serviços Jurídicos');

-- Template 21: Limpeza e Conservação
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Limpeza e Conservação',
    'Serviços',
    'Contrato para serviços de limpeza, conservação e manutenção de imóveis',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - LIMPEZA E CONSERVAÇÃO

CONTRATANTE: {{NOME_CLIENTE_LIM}}
CPF/CNPJ: {{CPF_CNPJ_CLIENTE_LIM}}
Endereço: {{ENDERECO_CLIENTE_LIM}}

PRESTADOR DE SERVIÇOS: {{NOME_EMPRESA_LIM}}
CNPJ: {{CNPJ_EMPRESA_LIM}}

OBJETO
O presente contrato tem por objeto a prestação de serviços de {{TIPO_LIMPEZA}} no imóvel localizado em {{ENDERECO_IMOVEL}}.

SERVIÇOS INCLUSOS
{{DESCRICAO_SERVICOS_LIMPEZA}}
- Frequência: {{FREQUENCIA_LIMPEZA}}
- Horário de execução: {{HORARIO_LIMPEZA}}
- Período: {{DATA_INICIO_LIM}} até {{DATA_TERMINO_LIM}}

VALOR E FORMA DE PAGAMENTO
O valor mensal dos serviços é de R$ {{VALOR_MENSAL_LIM}}.
- Forma de pagamento: {{FORMA_PAGAMENTO_LIM}}
- Reajuste: {{REAJUSTE_ANUAL}}

MATERIAIS E EQUIPAMENTOS
{{PROVISAO_MATERIAIS}}

{{CIDADE_LIM}}, {{DATA_CONTRATO_LIM}}.

_________________________          _________________________
{{NOME_CLIENTE_LIM}}                     {{NOME_EMPRESA_LIM}}',
    '[{"name": "NOME_CLIENTE_LIM", "label": "Nome do Cliente", "type": "text", "required": true}, {"name": "NOME_EMPRESA_LIM", "label": "Nome da Empresa", "type": "text", "required": true}, {"name": "TIPO_LIMPEZA", "label": "Tipo de Limpeza (Residencial, Comercial, Industrial)", "type": "text", "required": true}, {"name": "ENDERECO_IMOVEL", "label": "Endereço do Imóvel", "type": "text", "required": true}, {"name": "DESCRICAO_SERVICOS_LIMPEZA", "label": "Descrição dos Serviços", "type": "textarea", "required": true}, {"name": "FREQUENCIA_LIMPEZA", "label": "Frequência (Diária, Semanal, Quinzenal)", "type": "text", "required": true}, {"name": "VALOR_MENSAL_LIM", "label": "Valor Mensal (R$)", "type": "text", "required": true}, {"name": "DATA_INICIO_LIM", "label": "Data Início", "type": "date", "required": true}, {"name": "DATA_TERMINO_LIM", "label": "Data Término", "type": "date", "required": true}, {"name": "CIDADE_LIM", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_LIM", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Limpeza e Conservação');

-- Template 22: Manutenção e Reparos
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Manutenção e Reparos',
    'Manutenção',
    'Contrato para serviços de manutenção, reparos e assistência técnica',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - MANUTENÇÃO E REPAROS

CONTRATANTE: {{NOME_CLIENTE_MAN}}
CPF/CNPJ: {{CPF_CNPJ_CLIENTE_MAN}}
Endereço: {{ENDERECO_CLIENTE_MAN}}

PRESTADOR: {{NOME_TECNICO_MAN}}
CNPJ/CPF: {{CNPJ_CPF_TECNICO}}
Área de Atuação: {{AREA_ATUACAO_MAN}}

OBJETO
O presente contrato tem por objeto a prestação de serviços de {{TIPO_MANUTENCAO}} no(s) item(s) especificado(s) abaixo.

SERVIÇOS SOLICITADOS
{{DESCRICAO_REPAROS}}
- Local: {{LOCAL_SERVICO_MAN}}
- Data/hora agendada: {{DATA_HORA_MAN}}
- Prazo de execução: {{PRAZO_EXECUCAO_MAN}}

GARANTIA
O prestador oferece garantia de {{TEMPO_GARANTIA}} sobre os serviços executados e peças substituídas.

VALOR E FORMA DE PAGAMENTO
O valor total dos serviços é de R$ {{VALOR_TOTAL_MAN}}.
- Mão de obra: R$ {{VALOR_MAO_OBRA}}
- Materiais/Peças: R$ {{VALOR_MATERIAIS}}
- Forma de pagamento: {{FORMA_PAGAMENTO_MAN}}

{{CIDADE_MAN}}, {{DATA_CONTRATO_MAN}}.

_________________________          _________________________
{{NOME_CLIENTE_MAN}}                     {{NOME_TECNICO_MAN}}',
    '[{"name": "NOME_CLIENTE_MAN", "label": "Nome do Cliente", "type": "text", "required": true}, {"name": "NOME_TECNICO_MAN", "label": "Nome do Técnico/Empresa", "type": "text", "required": true}, {"name": "TIPO_MANUTENCAO", "label": "Tipo de Manutenção (Elétrica, Hidráulica, Eletrônica, etc.)", "type": "text", "required": true}, {"name": "DESCRICAO_REPAROS", "label": "Descrição dos Reparos/Serviços", "type": "textarea", "required": true}, {"name": "LOCAL_SERVICO_MAN", "label": "Local do Serviço", "type": "text", "required": true}, {"name": "DATA_HORA_MAN", "label": "Data e Hora Agendada", "type": "text", "required": true}, {"name": "VALOR_TOTAL_MAN", "label": "Valor Total (R$)", "type": "text", "required": true}, {"name": "VALOR_MAO_OBRA", "label": "Valor Mão de Obra (R$)", "type": "text", "required": true}, {"name": "VALOR_MATERIAIS", "label": "Valor Materiais (R$)", "type": "text", "required": true}, {"name": "TEMPO_GARANTIA", "label": "Tempo de Garantia", "type": "text", "required": true}, {"name": "CIDADE_MAN", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_MAN", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Manutenção e Reparos');

-- Template 23: Publicidade e Propaganda
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Publicidade e Propaganda',
    'Marketing',
    'Contrato para serviços de publicidade, criação de campanhas e materiais promocionais',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - PUBLICIDADE E PROPAGANDA

CONTRATANTE: {{NOME_CLIENTE_PUB}}
CNPJ: {{CNPJ_CLIENTE_PUB}}
Ramo de Atividade: {{RAMO_ATIVIDADE_PUB}}

AGÊNCIA/PUBLICITÁRIO: {{NOME_AGENCIA_PUB}}
CNPJ: {{CNPJ_AGENCIA_PUB}}

OBJETO
O presente contrato tem por objeto a prestação de serviços de publicidade e propaganda para {{CAMPANHA_PUB}}.

SERVIÇOS CONTRATADOS
{{DESCRICAO_SERVICOS_PUB}}
- Mídia: {{TIPO_MIDIA}}
- Período de veiculação: {{PERIODO_VEICULACAO}}
- Prazo de entrega: {{PRAZO_ENTREGA_PUB}}

CRIAÇÃO E DESENVOLVIMENTO
{{ETAPAS_CRIACAO}}

VALOR E FORMA DE PAGAMENTO
O valor total da campanha é de R$ {{VALOR_TOTAL_PUB}}, sendo:
- Criação: R$ {{VALOR_CRIACAO}}
- Mídia/Veiculação: R$ {{VALOR_MIDIA}}
- Forma de pagamento: {{FORMA_PAGAMENTO_PUB}}

PROPRIEDADE INTELECTUAL
Os materiais criados serão de propriedade do contratante após o pagamento integral.

{{CIDADE_PUB}}, {{DATA_CONTRATO_PUB}}.

_________________________          _________________________
{{NOME_CLIENTE_PUB}}                     {{NOME_AGENCIA_PUB}}',
    '[{"name": "NOME_CLIENTE_PUB", "label": "Nome do Cliente/Empresa", "type": "text", "required": true}, {"name": "NOME_AGENCIA_PUB", "label": "Nome da Agência/Publicitário", "type": "text", "required": true}, {"name": "CAMPANHA_PUB", "label": "Nome da Campanha/Projeto", "type": "text", "required": true}, {"name": "DESCRICAO_SERVICOS_PUB", "label": "Descrição dos Serviços", "type": "textarea", "required": true}, {"name": "TIPO_MIDIA", "label": "Tipo de Mídia (TV, Rádio, Digital, etc.)", "type": "text", "required": true}, {"name": "PERIODO_VEICULACAO", "label": "Período de Veiculação", "type": "text", "required": true}, {"name": "VALOR_TOTAL_PUB", "label": "Valor Total (R$)", "type": "text", "required": true}, {"name": "VALOR_CRIACAO", "label": "Valor Criação (R$)", "type": "text", "required": true}, {"name": "VALOR_MIDIA", "label": "Valor Mídia/Veiculação (R$)", "type": "text", "required": true}, {"name": "CIDADE_PUB", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_PUB", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Publicidade e Propaganda');

-- Template 24: Serviços Contábeis
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Serviços Contábeis',
    'Contabilidade',
    'Contrato para prestação de serviços contábeis, tributários e assessoria fiscal',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - SERVIÇOS CONTÁBEIS

CONTRATANTE: {{NOME_CLIENTE_CONT}}
CNPJ: {{CNPJ_CLIENTE_CONT}}
Endereço: {{ENDERECO_CLIENTE_CONT}}

CONTADOR/ESCRITÓRIO: {{NOME_CONTADOR}}
CRC: {{CRC_CONTADOR}}
Escritório: {{NOME_ESCRITORIO_CONT}}

OBJETO
O presente contrato tem por objeto a prestação de serviços contábeis e fiscais conforme especificado abaixo.

SERVIÇOS INCLUSOS
{{DESCRICAO_SERVICOS_CONT}}
- Regime tributário: {{REGIME_TRIBUTARIO}}
- Período de vigência: {{PERIODO_VIGENCIA_CONT}}

OBRIGAÇÕES
{{OBRIGACOES_ENTREGAS}}

HONORÁRIOS
O valor mensal dos honorários é de R$ {{VALOR_MENSAL_CONT}}.
- Forma de pagamento: {{FORMA_PAGAMENTO_CONT}}
- Reajuste: {{REAJUSTE_CONT}}

RESPONSABILIDADE
O contador responsabiliza-se pela correta execução dos serviços e cumprimento das obrigações fiscais.

{{CIDADE_CONT}}, {{DATA_CONTRATO_CONT}}.

_________________________          _________________________
{{NOME_CLIENTE_CONT}}                     {{NOME_CONTADOR}}',
    '[{"name": "NOME_CLIENTE_CONT", "label": "Nome do Cliente/Empresa", "type": "text", "required": true}, {"name": "NOME_CONTADOR", "label": "Nome do Contador", "type": "text", "required": true}, {"name": "DESCRICAO_SERVICOS_CONT", "label": "Descrição dos Serviços Contábeis", "type": "textarea", "required": true}, {"name": "REGIME_TRIBUTARIO", "label": "Regime Tributário (Simples, Lucro Presumido, etc.)", "type": "text", "required": true}, {"name": "PERIODO_VIGENCIA_CONT", "label": "Período de Vigência", "type": "text", "required": true}, {"name": "VALOR_MENSAL_CONT", "label": "Valor Mensal dos Honorários (R$)", "type": "text", "required": true}, {"name": "FORMA_PAGAMENTO_CONT", "label": "Forma de Pagamento", "type": "text", "required": true}, {"name": "CIDADE_CONT", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_CONT", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Serviços Contábeis');

-- Template 25: Psicologia e Psicoterapia
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Psicologia e Psicoterapia',
    'Saúde Mental',
    'Contrato para serviços de psicoterapia, terapia e acompanhamento psicológico',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - PSICOTERAPIA

PACIENTE: {{NOME_PACIENTE}}
CPF: {{CPF_PACIENTE}}
Data de Nascimento: {{DATA_NASCIMENTO_PAC}}
Email: {{EMAIL_PACIENTE}}
Telefone: {{TELEFONE_PACIENTE}}

PSICÓLOGO: {{NOME_PSICOLOGO}}
CRP: {{CRP_PSICOLOGO}}
Especialização: {{ESPECIALIZACAO_PSI}}

OBJETO
O presente contrato tem por objeto a prestação de serviços de {{TIPO_TERAPIA}} para acompanhamento psicológico.

FREQUÊNCIA E DURAÇÃO
- Frequência das sessões: {{FREQUENCIA_SESSOES_PSI}}
- Duração de cada sessão: {{DURACAO_SESSAO_PSI}}
- Modalidade: {{MODALIDADE_TERAPIA}} (presencial/online)
- Período estimado: {{PERIODO_TRATAMENTO}}

VALOR E FORMA DE PAGAMENTO
O valor por sessão é de R$ {{VALOR_SESSAO_PSI}}.
- Forma de pagamento: {{FORMA_PAGAMENTO_PSI}}
- Política de cancelamento: {{POLITICA_CANCELAMENTO_PSI}}

CONFIDENCIALIDADE E SIGILO
Todas as informações compartilhadas durante as sessões são protegidas por sigilo profissional.

{{CIDADE_PSI}}, {{DATA_CONTRATO_PSI}}.

_________________________          _________________________
{{NOME_PACIENTE}}                     {{NOME_PSICOLOGO}}',
    '[{"name": "NOME_PACIENTE", "label": "Nome do Paciente", "type": "text", "required": true}, {"name": "NOME_PSICOLOGO", "label": "Nome do Psicólogo", "type": "text", "required": true}, {"name": "TIPO_TERAPIA", "label": "Tipo de Terapia", "type": "text", "required": true}, {"name": "FREQUENCIA_SESSOES_PSI", "label": "Frequência das Sessões", "type": "text", "required": true}, {"name": "DURACAO_SESSAO_PSI", "label": "Duração de Cada Sessão", "type": "text", "required": true}, {"name": "MODALIDADE_TERAPIA", "label": "Modalidade (Presencial/Online)", "type": "text", "required": true}, {"name": "VALOR_SESSAO_PSI", "label": "Valor por Sessão (R$)", "type": "text", "required": true}, {"name": "CIDADE_PSI", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_PSI", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Psicologia e Psicoterapia');

-- Template 26: Nutrição
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Nutrição e Consultoria Nutricional',
    'Nutrição',
    'Contrato para serviços de consultoria nutricional, planos alimentares e acompanhamento',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - NUTRIÇÃO

CLIENTE: {{NOME_CLIENTE_NUT}}
CPF: {{CPF_CLIENTE_NUT}}
Email: {{EMAIL_CLIENTE_NUT}}
Telefone: {{TELEFONE_CLIENTE_NUT}}

NUTRICIONISTA: {{NOME_NUTRICIONISTA}}
CRN: {{CRN_NUTRICIONISTA}}
Especialização: {{ESPECIALIZACAO_NUT}}

OBJETO
O presente contrato tem por objeto a prestação de serviços de consultoria nutricional e elaboração de {{TIPO_PLANO_NUT}}.

SERVIÇOS INCLUSOS
{{DESCRICAO_SERVICOS_NUT}}
- Objetivo: {{OBJETIVO_NUTRICIONAL}}
- Frequência de acompanhamento: {{FREQUENCIA_ACOMPANHAMENTO_NUT}}
- Duração do tratamento: {{DURACAO_TRATAMENTO_NUT}}

ENTREGÁVEIS
{{ENTREGAVEIS_NUT}}

VALOR E FORMA DE PAGAMENTO
O valor total do tratamento é de R$ {{VALOR_TOTAL_NUT}}.
- Forma de pagamento: {{FORMA_PAGAMENTO_NUT}}
- Consultas de retorno: {{VALOR_RETORNO_NUT}}

{{CIDADE_NUT}}, {{DATA_CONTRATO_NUT}}.

_________________________          _________________________
{{NOME_CLIENTE_NUT}}                     {{NOME_NUTRICIONISTA}}',
    '[{"name": "NOME_CLIENTE_NUT", "label": "Nome do Cliente", "type": "text", "required": true}, {"name": "NOME_NUTRICIONISTA", "label": "Nome do Nutricionista", "type": "text", "required": true}, {"name": "TIPO_PLANO_NUT", "label": "Tipo de Plano (Alimentar, Reeducação, etc.)", "type": "text", "required": true}, {"name": "OBJETIVO_NUTRICIONAL", "label": "Objetivo Nutricional", "type": "text", "required": true}, {"name": "DESCRICAO_SERVICOS_NUT", "label": "Descrição dos Serviços", "type": "textarea", "required": true}, {"name": "VALOR_TOTAL_NUT", "label": "Valor Total (R$)", "type": "text", "required": true}, {"name": "CIDADE_NUT", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_NUT", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Nutrição e Consultoria Nutricional');

-- Template 27: Veterinária
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Veterinária e Clínica Pet',
    'Veterinária',
    'Contrato para serviços veterinários, consultas, cirurgias e cuidados com animais',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - VETERINÁRIA

TUTOR: {{NOME_TUTOR}}
CPF: {{CPF_TUTOR}}
Telefone: {{TELEFONE_TUTOR}}

VETERINÁRIO/CLÍNICA: {{NOME_VETERINARIO}}
CRMV: {{CRMV_VETERINARIO}}
Clínica: {{NOME_CLINICA_VET}}

ANIMAL
Nome: {{NOME_ANIMAL}}
Espécie: {{ESPECIE_ANIMAL}}
Raça: {{RACA_ANIMAL}}
Idade: {{IDADE_ANIMAL}}

SERVIÇOS SOLICITADOS
{{DESCRICAO_SERVICOS_VET}}
- Data/hora da consulta: {{DATA_HORA_CONSULTA_VET}}
- Tipo de atendimento: {{TIPO_ATENDIMENTO_VET}}

VALOR E FORMA DE PAGAMENTO
O valor total dos serviços é de R$ {{VALOR_TOTAL_VET}}.
- Consulta: R$ {{VALOR_CONSULTA_VET}}
- Procedimentos/Medicamentos: R$ {{VALOR_PROCEDIMENTOS}}
- Forma de pagamento: {{FORMA_PAGAMENTO_VET}}

GARANTIA E RESPONSABILIDADE
{{TERMOS_RESPONSABILIDADE_VET}}

{{CIDADE_VET}}, {{DATA_CONTRATO_VET}}.

_________________________          _________________________
{{NOME_TUTOR}}                     {{NOME_VETERINARIO}}',
    '[{"name": "NOME_TUTOR", "label": "Nome do Tutor", "type": "text", "required": true}, {"name": "NOME_VETERINARIO", "label": "Nome do Veterinário", "type": "text", "required": true}, {"name": "NOME_ANIMAL", "label": "Nome do Animal", "type": "text", "required": true}, {"name": "ESPECIE_ANIMAL", "label": "Espécie (Cão, Gato, etc.)", "type": "text", "required": true}, {"name": "DESCRICAO_SERVICOS_VET", "label": "Descrição dos Serviços", "type": "textarea", "required": true}, {"name": "VALOR_TOTAL_VET", "label": "Valor Total (R$)", "type": "text", "required": true}, {"name": "CIDADE_VET", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_VET", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Veterinária e Clínica Pet');

-- Template 28: Jardinagem e Paisagismo
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Jardinagem e Paisagismo',
    'Paisagismo',
    'Contrato para serviços de jardinagem, paisagismo e manutenção de áreas verdes',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - JARDINAGEM E PAISAGISMO

CONTRATANTE: {{NOME_CLIENTE_JARD}}
CPF/CNPJ: {{CPF_CNPJ_CLIENTE_JARD}}
Endereço do Imóvel: {{ENDERECO_IMOVEL_JARD}}

JARDINEIRO/EMPRESA: {{NOME_JARDINEIRO}}
CNPJ/CPF: {{CNPJ_CPF_JARDINEIRO}}

OBJETO
O presente contrato tem por objeto a prestação de serviços de {{TIPO_SERVICO_JARD}} na área localizada em {{ENDERECO_SERVICO_JARD}}.

SERVIÇOS INCLUSOS
{{DESCRICAO_SERVICOS_JARD}}
- Área total: {{AREA_TOTAL_JARD}} m²
- Frequência: {{FREQUENCIA_SERVICOS_JARD}}
- Período: {{DATA_INICIO_JARD}} até {{DATA_TERMINO_JARD}}

PROJETO PAISAGÍSTICO
{{DESCRICAO_PROJETO_JARD}}

VALOR E FORMA DE PAGAMENTO
O valor mensal dos serviços é de R$ {{VALOR_MENSAL_JARD}}.
- Forma de pagamento: {{FORMA_PAGAMENTO_JARD}}
- Materiais: {{INCLUSAO_MATERIAIS}}

{{CIDADE_JARD}}, {{DATA_CONTRATO_JARD}}.

_________________________          _________________________
{{NOME_CLIENTE_JARD}}                     {{NOME_JARDINEIRO}}',
    '[{"name": "NOME_CLIENTE_JARD", "label": "Nome do Cliente", "type": "text", "required": true}, {"name": "NOME_JARDINEIRO", "label": "Nome do Jardineiro/Empresa", "type": "text", "required": true}, {"name": "TIPO_SERVICO_JARD", "label": "Tipo de Serviço (Manutenção, Projeto, etc.)", "type": "text", "required": true}, {"name": "ENDERECO_SERVICO_JARD", "label": "Endereço do Serviço", "type": "text", "required": true}, {"name": "DESCRICAO_SERVICOS_JARD", "label": "Descrição dos Serviços", "type": "textarea", "required": true}, {"name": "FREQUENCIA_SERVICOS_JARD", "label": "Frequência dos Serviços", "type": "text", "required": true}, {"name": "VALOR_MENSAL_JARD", "label": "Valor Mensal (R$)", "type": "text", "required": true}, {"name": "DATA_INICIO_JARD", "label": "Data Início", "type": "date", "required": true}, {"name": "DATA_TERMINO_JARD", "label": "Data Término", "type": "date", "required": true}, {"name": "CIDADE_JARD", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_JARD", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Jardinagem e Paisagismo');

-- Template 29: Transporte e Frete
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Transporte e Frete',
    'Transporte',
    'Contrato para serviços de transporte de cargas, mudanças e frete',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - TRANSPORTE E FRETE

CONTRATANTE: {{NOME_CLIENTE_TRANS}}
CPF/CNPJ: {{CPF_CNPJ_CLIENTE_TRANS}}
Endereço: {{ENDERECO_CLIENTE_TRANS}}

TRANSPORTADORA/MOTORISTA: {{NOME_TRANSPORTADORA}}
CNPJ: {{CNPJ_TRANSPORTADORA}}
Veículo: {{TIPO_VEICULO}}

OBJETO
O presente contrato tem por objeto a prestação de serviços de transporte de {{TIPO_CARGA}} do local de origem até o destino especificado abaixo.

ORIGEM E DESTINO
- Origem: {{ENDERECO_ORIGEM}}
- Destino: {{ENDERECO_DESTINO}}
- Data/hora da coleta: {{DATA_HORA_COLETA}}
- Data/hora da entrega estimada: {{DATA_HORA_ENTREGA}}

CARGA
{{DESCRICAO_CARGA}}
- Peso aproximado: {{PESO_CARGA}} kg
- Volume: {{VOLUME_CARGA}}

VALOR E FORMA DE PAGAMENTO
O valor do frete é de R$ {{VALOR_FRETE}}.
- Forma de pagamento: {{FORMA_PAGAMENTO_TRANS}}
- Seguro: {{VALOR_SEGURO}}

RESPONSABILIDADE
{{TERMOS_RESPONSABILIDADE_TRANS}}

{{CIDADE_TRANS}}, {{DATA_CONTRATO_TRANS}}.

_________________________          _________________________
{{NOME_CLIENTE_TRANS}}                     {{NOME_TRANSPORTADORA}}',
    '[{"name": "NOME_CLIENTE_TRANS", "label": "Nome do Cliente", "type": "text", "required": true}, {"name": "NOME_TRANSPORTADORA", "label": "Nome da Transportadora/Motorista", "type": "text", "required": true}, {"name": "TIPO_CARGA", "label": "Tipo de Carga (Mudança, Mercadoria, etc.)", "type": "text", "required": true}, {"name": "ENDERECO_ORIGEM", "label": "Endereço de Origem", "type": "text", "required": true}, {"name": "ENDERECO_DESTINO", "label": "Endereço de Destino", "type": "text", "required": true}, {"name": "DESCRICAO_CARGA", "label": "Descrição da Carga", "type": "textarea", "required": true}, {"name": "VALOR_FRETE", "label": "Valor do Frete (R$)", "type": "text", "required": true}, {"name": "CIDADE_TRANS", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_TRANS", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Transporte e Frete');

-- Template 30: Fisioterapia
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Fisioterapia',
    'Fisioterapia',
    'Contrato para serviços de fisioterapia, reabilitação e tratamento fisioterapêutico',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - FISIOTERAPIA

PACIENTE: {{NOME_PACIENTE_FISI}}
CPF: {{CPF_PACIENTE_FISI}}
Data de Nascimento: {{DATA_NASC_PAC}}
Telefone: {{TELEFONE_PAC_FISI}}

FISIOTERAPEUTA: {{NOME_FISIOTERAPEUTA}}
CREFITO: {{CREFITO_FISIOTERAPEUTA}}
Especialização: {{ESPECIALIZACAO_FISI}}

OBJETO
O presente contrato tem por objeto a prestação de serviços de fisioterapia para tratamento de {{DIAGNOSTICO_FISI}}.

TRATAMENTO
{{DESCRICAO_TRATAMENTO_FISI}}
- Objetivo do tratamento: {{OBJETIVO_TRATAMENTO_FISI}}
- Frequência semanal: {{FREQUENCIA_SESSOES_FISI}}
- Duração de cada sessão: {{DURACAO_SESSAO_FISI}}
- Período estimado: {{PERIODO_TRATAMENTO_FISI}}

VALOR E FORMA DE PAGAMENTO
O valor por sessão é de R$ {{VALOR_SESSAO_FISI}}.
- Pacote de {{NUMERO_SESSOES_PACOTE}} sessões: R$ {{VALOR_PACOTE_FISI}}
- Forma de pagamento: {{FORMA_PAGAMENTO_FISI}}

{{CIDADE_FISI}}, {{DATA_CONTRATO_FISI}}.

_________________________          _________________________
{{NOME_PACIENTE_FISI}}                     {{NOME_FISIOTERAPEUTA}}',
    '[{"name": "NOME_PACIENTE_FISI", "label": "Nome do Paciente", "type": "text", "required": true}, {"name": "NOME_FISIOTERAPEUTA", "label": "Nome do Fisioterapeuta", "type": "text", "required": true}, {"name": "DIAGNOSTICO_FISI", "label": "Diagnóstico/Queixa", "type": "text", "required": true}, {"name": "OBJETIVO_TRATAMENTO_FISI", "label": "Objetivo do Tratamento", "type": "text", "required": true}, {"name": "DESCRICAO_TRATAMENTO_FISI", "label": "Descrição do Tratamento", "type": "textarea", "required": true}, {"name": "FREQUENCIA_SESSOES_FISI", "label": "Frequência Semanal", "type": "text", "required": true}, {"name": "VALOR_SESSAO_FISI", "label": "Valor por Sessão (R$)", "type": "text", "required": true}, {"name": "VALOR_PACOTE_FISI", "label": "Valor do Pacote (R$)", "type": "text", "required": false}, {"name": "CIDADE_FISI", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_FISI", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Fisioterapia');

-- Template 31: Música e Aulas de Instrumento
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Aulas de Música e Instrumento',
    'Música',
    'Contrato para serviços de aulas de música, instrumento musical e ensino musical',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - AULAS DE MÚSICA

ALUNO/RESPONSÁVEL: {{NOME_ALUNO_MUS}}
CPF: {{CPF_ALUNO_MUS}}
Email: {{EMAIL_ALUNO_MUS}}
Telefone: {{TELEFONE_ALUNO_MUS}}

PROFESSOR: {{NOME_PROFESSOR_MUS}}
Instrumento/Área: {{INSTRUMENTO_ENSINADO}}
Formação: {{FORMACAO_PROFESSOR_MUS}}

OBJETO
O presente contrato tem por objeto a prestação de serviços de ensino de {{INSTRUMENTO_ENSINADO}} para o(a) aluno(a) {{NOME_ALUNO_AULA_MUS}}.

METODOLOGIA E CONTEÚDO
{{METODOLOGIA_AULA_MUS}}
- Nível: {{NIVEL_ALUNO_MUS}}
- Frequência: {{FREQUENCIA_AULAS_MUS}}
- Duração de cada aula: {{DURACAO_AULA_MUS}}
- Modalidade: {{MODALIDADE_AULA_MUS}} (presencial/online)

VALOR E FORMA DE PAGAMENTO
O valor mensal das aulas é de R$ {{VALOR_MENSAL_MUS}}.
- Valor por aula avulsa: R$ {{VALOR_AVULSA_MUS}}
- Forma de pagamento: {{FORMA_PAGAMENTO_MUS}}

MATERIAIS E EQUIPAMENTOS
{{PROVISAO_INSTRUMENTOS}}

{{CIDADE_MUS}}, {{DATA_CONTRATO_MUS}}.

_________________________          _________________________
{{NOME_ALUNO_MUS}}                     {{NOME_PROFESSOR_MUS}}',
    '[{"name": "NOME_ALUNO_MUS", "label": "Nome do Aluno/Responsável", "type": "text", "required": true}, {"name": "NOME_PROFESSOR_MUS", "label": "Nome do Professor", "type": "text", "required": true}, {"name": "INSTRUMENTO_ENSINADO", "label": "Instrumento/Área Ensinada", "type": "text", "required": true}, {"name": "NIVEL_ALUNO_MUS", "label": "Nível do Aluno (Iniciante, Intermediário, Avançado)", "type": "text", "required": true}, {"name": "FREQUENCIA_AULAS_MUS", "label": "Frequência das Aulas", "type": "text", "required": true}, {"name": "VALOR_MENSAL_MUS", "label": "Valor Mensal (R$)", "type": "text", "required": true}, {"name": "CIDADE_MUS", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_MUS", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Aulas de Música e Instrumento');

-- Template 32: Locação de Imóveis
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Locação de Imóveis',
    'Imobiliária',
    'Contrato para locação de imóveis residenciais ou comerciais',
    'CONTRATO DE LOCAÇÃO DE IMÓVEL

LOCADOR: {{NOME_LOCADOR_IMOV}}
CPF/CNPJ: {{CPF_CNPJ_LOCADOR}}
RG: {{RG_LOCADOR}}

LOCATÁRIO: {{NOME_LOCATARIO_IMOV}}
CPF: {{CPF_LOCATARIO}}
RG: {{RG_LOCATARIO}}
Estado Civil: {{ESTADO_CIVIL_LOCATARIO}}

IMÓVEL
Endereço: {{ENDERECO_IMOVEL}}
Categoria: {{CATEGORIA_IMOVEL}} (Residencial/Comercial)
Área: {{AREA_IMOVEL}} m²

VALOR E FORMA DE PAGAMENTO
O valor do aluguel é de R$ {{VALOR_ALUGUEL}} mensais.
- Vencimento: Todo dia {{DIA_VENCIMENTO}} de cada mês
- Caução: R$ {{VALOR_CAUCAO}}
- IPTU: {{RESPONSAVEL_IPTU}}

PRAZO
O contrato terá vigência de {{DATA_INICIO_LOC}} até {{DATA_TERMINO_LOC}}.

CONDIÇÕES
{{CONDICOES_LOCACAO}}

{{CIDADE_IMOV}}, {{DATA_CONTRATO_IMOV}}.

_________________________          _________________________
{{NOME_LOCADOR_IMOV}}                     {{NOME_LOCATARIO_IMOV}}',
    '[{"name": "NOME_LOCADOR_IMOV", "label": "Nome do Locador", "type": "text", "required": true}, {"name": "NOME_LOCATARIO_IMOV", "label": "Nome do Locatário", "type": "text", "required": true}, {"name": "ENDERECO_IMOVEL", "label": "Endereço do Imóvel", "type": "text", "required": true}, {"name": "CATEGORIA_IMOVEL", "label": "Categoria (Residencial/Comercial)", "type": "text", "required": true}, {"name": "VALOR_ALUGUEL", "label": "Valor do Aluguel Mensal (R$)", "type": "text", "required": true}, {"name": "VALOR_CAUCAO", "label": "Valor da Caução (R$)", "type": "text", "required": true}, {"name": "DATA_INICIO_LOC", "label": "Data Início", "type": "date", "required": true}, {"name": "DATA_TERMINO_LOC", "label": "Data Término", "type": "date", "required": true}, {"name": "CIDADE_IMOV", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_IMOV", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Locação de Imóveis');

-- Template 33: Segurança e Vigilância
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Segurança e Vigilância',
    'Segurança',
    'Contrato para serviços de segurança, vigilância patrimonial e monitoramento',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - SEGURANÇA E VIGILÂNCIA

CONTRATANTE: {{NOME_CLIENTE_SEG}}
CNPJ: {{CNPJ_CLIENTE_SEG}}
Endereço do Local: {{ENDERECO_LOCAL_SEG}}

EMPRESA DE SEGURANÇA: {{NOME_EMPRESA_SEG}}
CNPJ: {{CNPJ_EMPRESA_SEG}}
Credenciamento: {{CREDENCIAMENTO_SEG}}

OBJETO
O presente contrato tem por objeto a prestação de serviços de {{TIPO_SERVICO_SEG}} no local especificado abaixo.

SERVIÇOS INCLUSOS
{{DESCRICAO_SERVICOS_SEG}}
- Tipo de vigilância: {{TIPO_VIGILANCIA}}
- Horário de atuação: {{HORARIO_VIGILANCIA}}
- Número de vigilantes: {{NUMERO_VIGILANTES}}
- Período: {{DATA_INICIO_SEG}} até {{DATA_TERMINO_SEG}}

EQUIPAMENTOS
{{EQUIPAMENTOS_SEG}}

VALOR E FORMA DE PAGAMENTO
O valor mensal dos serviços é de R$ {{VALOR_MENSAL_SEG}}.
- Forma de pagamento: {{FORMA_PAGAMENTO_SEG}}
- Reajuste anual: {{REAJUSTE_ANUAL_SEG}}

RESPONSABILIDADE
{{TERMOS_RESPONSABILIDADE_SEG}}

{{CIDADE_SEG}}, {{DATA_CONTRATO_SEG}}.

_________________________          _________________________
{{NOME_CLIENTE_SEG}}                     {{NOME_EMPRESA_SEG}}',
    '[{"name": "NOME_CLIENTE_SEG", "label": "Nome do Cliente/Empresa", "type": "text", "required": true}, {"name": "NOME_EMPRESA_SEG", "label": "Nome da Empresa de Segurança", "type": "text", "required": true}, {"name": "TIPO_SERVICO_SEG", "label": "Tipo de Serviço (Vigilância, Monitoramento, etc.)", "type": "text", "required": true}, {"name": "DESCRICAO_SERVICOS_SEG", "label": "Descrição dos Serviços", "type": "textarea", "required": true}, {"name": "VALOR_MENSAL_SEG", "label": "Valor Mensal (R$)", "type": "text", "required": true}, {"name": "DATA_INICIO_SEG", "label": "Data Início", "type": "date", "required": true}, {"name": "DATA_TERMINO_SEG", "label": "Data Término", "type": "date", "required": true}, {"name": "CIDADE_SEG", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_SEG", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Segurança e Vigilância');

-- Template 34: Redação e Revisão de Textos
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Redação e Revisão de Textos',
    'Escrita',
    'Contrato para serviços de redação, revisão de textos e produção de conteúdo',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - REDAÇÃO E REVISÃO

CONTRATANTE: {{NOME_CLIENTE_RED}}
CPF/CNPJ: {{CPF_CNPJ_CLIENTE_RED}}
Email: {{EMAIL_CLIENTE_RED}}

REDATOR/REVISOR: {{NOME_REDATOR}}
Formação: {{FORMACAO_REDATOR}}

OBJETO
O presente contrato tem por objeto a prestação de serviços de {{TIPO_SERVICO_RED}} conforme especificado abaixo.

SERVIÇOS SOLICITADOS
{{DESCRICAO_SERVICOS_RED}}
- Tipo de texto: {{TIPO_TEXTO}}
- Quantidade de palavras/páginas: {{QUANTIDADE_TEXTO}}
- Prazo de entrega: {{PRAZO_ENTREGA_RED}}
- Número de revisões: {{NUMERO_REVISOES}}

ESTILO E PADRÕES
{{ESPECIFICACOES_ESTILO}}

VALOR E FORMA DE PAGAMENTO
O valor total dos serviços é de R$ {{VALOR_TOTAL_RED}}.
- Forma de pagamento: {{FORMA_PAGAMENTO_RED}}
- Valor por palavra/página: R$ {{VALOR_UNITARIO_RED}}

DIREITOS AUTORAIS
{{TERMOS_AUTORIA}}

{{CIDADE_RED}}, {{DATA_CONTRATO_RED}}.

_________________________          _________________________
{{NOME_CLIENTE_RED}}                     {{NOME_REDATOR}}',
    '[{"name": "NOME_CLIENTE_RED", "label": "Nome do Cliente", "type": "text", "required": true}, {"name": "NOME_REDATOR", "label": "Nome do Redator/Revisor", "type": "text", "required": true}, {"name": "TIPO_SERVICO_RED", "label": "Tipo de Serviço (Redação, Revisão, Tradução)", "type": "text", "required": true}, {"name": "TIPO_TEXTO", "label": "Tipo de Texto (Acadêmico, Comercial, etc.)", "type": "text", "required": true}, {"name": "DESCRICAO_SERVICOS_RED", "label": "Descrição dos Serviços", "type": "textarea", "required": true}, {"name": "VALOR_TOTAL_RED", "label": "Valor Total (R$)", "type": "text", "required": true}, {"name": "CIDADE_RED", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_RED", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Redação e Revisão de Textos');

-- Template 35: Organização de Eventos
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Organização de Eventos',
    'Eventos',
    'Contrato para serviços de organização, planejamento e coordenação de eventos',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - ORGANIZAÇÃO DE EVENTOS

CONTRATANTE: {{NOME_CLIENTE_ORG}}
CPF/CNPJ: {{CPF_CNPJ_CLIENTE_ORG}}
Email: {{EMAIL_CLIENTE_ORG}}

ORGANIZADOR DE EVENTOS: {{NOME_ORGANIZADOR}}
CNPJ/CPF: {{CNPJ_CPF_ORGANIZADOR}}

OBJETO
O presente contrato tem por objeto a prestação de serviços de organização e coordenação do evento: {{NOME_EVENTO_ORG}}.

EVENTO
{{DESCRICAO_EVENTO_ORG}}
- Tipo de evento: {{TIPO_EVENTO_ORG}}
- Data e horário: {{DATA_HORA_EVENTO_ORG}}
- Local: {{LOCAL_EVENTO_ORG}}
- Número estimado de participantes: {{NUMERO_PARTICIPANTES}}

SERVIÇOS INCLUSOS
{{DESCRICAO_SERVICOS_ORG}}
- Planejamento: {{SERVICOS_PLANEJAMENTO}}
- Execução: {{SERVICOS_EXECUCAO}}
- Pós-evento: {{SERVICOS_POS_EVENTO}}

VALOR E FORMA DE PAGAMENTO
O valor total dos serviços é de R$ {{VALOR_TOTAL_ORG}}, sendo:
- Entrada: R$ {{VALOR_ENTRADA_ORG}}
- Saldo: R$ {{VALOR_SALDO_ORG}} até {{DATA_PAGAMENTO_SALDO}}
- Forma de pagamento: {{FORMA_PAGAMENTO_ORG}}

{{CIDADE_ORG}}, {{DATA_CONTRATO_ORG}}.

_________________________          _________________________
{{NOME_CLIENTE_ORG}}                     {{NOME_ORGANIZADOR}}',
    '[{"name": "NOME_CLIENTE_ORG", "label": "Nome do Cliente", "type": "text", "required": true}, {"name": "NOME_ORGANIZADOR", "label": "Nome do Organizador de Eventos", "type": "text", "required": true}, {"name": "NOME_EVENTO_ORG", "label": "Nome do Evento", "type": "text", "required": true}, {"name": "TIPO_EVENTO_ORG", "label": "Tipo de Evento", "type": "text", "required": true}, {"name": "DATA_HORA_EVENTO_ORG", "label": "Data e Horário do Evento", "type": "text", "required": true}, {"name": "LOCAL_EVENTO_ORG", "label": "Local do Evento", "type": "text", "required": true}, {"name": "DESCRICAO_SERVICOS_ORG", "label": "Descrição dos Serviços", "type": "textarea", "required": true}, {"name": "VALOR_TOTAL_ORG", "label": "Valor Total (R$)", "type": "text", "required": true}, {"name": "VALOR_ENTRADA_ORG", "label": "Valor da Entrada (R$)", "type": "text", "required": true}, {"name": "CIDADE_ORG", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_ORG", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Organização de Eventos');

-- Template 36: Serviços de TI e Suporte Técnico
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Serviços de TI e Suporte Técnico',
    'Tecnologia',
    'Contrato para serviços de suporte técnico, manutenção de TI e administração de sistemas',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - TI E SUPORTE TÉCNICO

CONTRATANTE: {{NOME_CLIENTE_TI}}
CNPJ: {{CNPJ_CLIENTE_TI}}
Endereço: {{ENDERECO_CLIENTE_TI}}

PRESTADOR DE SERVIÇOS TI: {{NOME_EMPRESA_TI}}
CNPJ: {{CNPJ_EMPRESA_TI}}

OBJETO
O presente contrato tem por objeto a prestação de serviços de {{TIPO_SERVICO_TI}} conforme especificado abaixo.

SERVIÇOS INCLUSOS
{{DESCRICAO_SERVICOS_TI}}
- Equipamentos/sistemas: {{EQUIPAMENTOS_SISTEMAS}}
- Tipo de atendimento: {{TIPO_ATENDIMENTO_TI}}
- Horário de atendimento: {{HORARIO_ATENDIMENTO_TI}}
- Tempo de resposta: {{TEMPO_RESPOSTA_TI}}

PERÍODO DE VIGÊNCIA
De {{DATA_INICIO_TI}} até {{DATA_TERMINO_TI}}.

VALOR E FORMA DE PAGAMENTO
O valor mensal dos serviços é de R$ {{VALOR_MENSAL_TI}}.
- Forma de pagamento: {{FORMA_PAGAMENTO_TI}}
- Serviços adicionais: {{VALOR_SERVICOS_ADICIONAIS}}

GARANTIA E SLA
{{SLA_GARANTIAS}}

{{CIDADE_TI}}, {{DATA_CONTRATO_TI}}.

_________________________          _________________________
{{NOME_CLIENTE_TI}}                     {{NOME_EMPRESA_TI}}',
    '[{"name": "NOME_CLIENTE_TI", "label": "Nome do Cliente/Empresa", "type": "text", "required": true}, {"name": "NOME_EMPRESA_TI", "label": "Nome da Empresa de TI", "type": "text", "required": true}, {"name": "TIPO_SERVICO_TI", "label": "Tipo de Serviço (Suporte, Manutenção, etc.)", "type": "text", "required": true}, {"name": "DESCRICAO_SERVICOS_TI", "label": "Descrição dos Serviços", "type": "textarea", "required": true}, {"name": "VALOR_MENSAL_TI", "label": "Valor Mensal (R$)", "type": "text", "required": true}, {"name": "DATA_INICIO_TI", "label": "Data Início", "type": "date", "required": true}, {"name": "DATA_TERMINO_TI", "label": "Data Término", "type": "date", "required": true}, {"name": "CIDADE_TI", "label": "Cidade", "type": "text", "required": true}, {"name": "DATA_CONTRATO_TI", "label": "Data do Contrato", "type": "date", "required": true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Serviços de TI e Suporte Técnico');

-- ============================================
-- 7. TRIGGERS: Atualizar updated_at automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_contracts_updated_at
    BEFORE UPDATE ON ck_contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_contracts_updated_at();

CREATE TRIGGER trigger_contracts_templates_updated_at
    BEFORE UPDATE ON ck_contracts_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_contracts_updated_at();

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Verificar se as tabelas foram criadas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ck_contracts_templates') THEN
        RAISE EXCEPTION 'Tabela ck_contracts_templates não foi criada';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ck_contracts') THEN
        RAISE EXCEPTION 'Tabela ck_contracts não foi criada';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ck_contracts_signers') THEN
        RAISE EXCEPTION 'Tabela ck_contracts_signers não foi criada';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ck_contracts_signatures') THEN
        RAISE EXCEPTION 'Tabela ck_contracts_signatures não foi criada';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ck_contracts_audit_logs') THEN
        RAISE EXCEPTION 'Tabela ck_contracts_audit_logs não foi criada';
    END IF;
END $$;
