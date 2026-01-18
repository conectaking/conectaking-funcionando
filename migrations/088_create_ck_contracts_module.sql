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
