const service = require('./finance.service');
const responseFormatter = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

class FinanceController {
    /**
     * Obter dashboard financeiro
     */
    async getDashboard(req, res) {
        try {
            const userId = req.user.userId;
            const { dateFrom, dateTo, profile_id } = req.query;

            // Padrão: mês atual
            const now = new Date();
            const defaultDateFrom = dateFrom || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            const defaultDateTo = dateTo || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

            const stats = await service.getDashboardStats(userId, defaultDateFrom, defaultDateTo, profile_id ? parseInt(profile_id) : null);
            return responseFormatter.success(res, stats);
        } catch (error) {
            logger.error('Erro ao obter dashboard financeiro:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Listar transações
     */
    async getTransactions(req, res) {
        try {
            const userId = req.user.userId;
            const filters = {
                type: req.query.type || null,
                status: req.query.status || null,
                category_id: req.query.category_id ? parseInt(req.query.category_id) : null,
                account_id: req.query.account_id ? parseInt(req.query.account_id) : null,
                card_id: req.query.card_id ? parseInt(req.query.card_id) : null,
                dateFrom: req.query.dateFrom || null,
                dateTo: req.query.dateTo || null,
                search: req.query.search || null,
                profile_id: req.query.profile_id ? parseInt(req.query.profile_id) : null,
                orderBy: req.query.orderBy || 'transaction_date',
                orderDir: req.query.orderDir || 'DESC',
                limit: req.query.limit ? parseInt(req.query.limit) : 20,
                offset: req.query.offset ? parseInt(req.query.offset) : 0
            };

            const result = await service.findTransactionsByUserId(userId, filters);
            return responseFormatter.success(res, result);
        } catch (error) {
            logger.error('Erro ao listar transações:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Obter transação por ID
     */
    async getTransaction(req, res) {
        try {
            const userId = req.user.userId;
            const { id } = req.params;
            const transaction = await service.findTransactionById(id, userId);
            return responseFormatter.success(res, transaction);
        } catch (error) {
            logger.error('Erro ao obter transação:', error);
            const statusCode = error.message.includes('não encontrada') ? 404 : 400;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Criar transação
     */
    async createTransaction(req, res) {
        try {
            const userId = req.user.userId;
            const transaction = await service.createTransaction(userId, req.body);
            return responseFormatter.success(res, transaction, 'Transação criada com sucesso', 201);
        } catch (error) {
            logger.error('Erro ao criar transação:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Atualizar transação
     */
    async updateTransaction(req, res) {
        try {
            const userId = req.user.userId;
            const { id } = req.params;
            const transaction = await service.updateTransaction(id, userId, req.body);
            return responseFormatter.success(res, transaction, 'Transação atualizada com sucesso');
        } catch (error) {
            logger.error('Erro ao atualizar transação:', error);
            const statusCode = error.message.includes('não encontrada') ? 404 : 400;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Deletar transação
     */
    async deleteTransaction(req, res) {
        try {
            const userId = req.user.userId;
            const { id } = req.params;
            await service.deleteTransaction(id, userId);
            return responseFormatter.success(res, null, 'Transação deletada com sucesso');
        } catch (error) {
            logger.error('Erro ao deletar transação:', error);
            const statusCode = error.message.includes('não encontrada') ? 404 : 400;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Listar categorias
     */
    async getCategories(req, res) {
        try {
            const userId = req.user.userId;
            const type = req.query.type || null;
            const categories = await service.findCategoriesByUserId(userId, type);
            return responseFormatter.success(res, categories);
        } catch (error) {
            logger.error('Erro ao listar categorias:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Criar categoria
     */
    async createCategory(req, res) {
        try {
            const userId = req.user.userId;
            const category = await service.createCategory(userId, req.body);
            return responseFormatter.success(res, category, 'Categoria criada com sucesso', 201);
        } catch (error) {
            logger.error('Erro ao criar categoria:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Listar contas
     */
    async getAccounts(req, res) {
        try {
            const userId = req.user.userId;
            const accounts = await service.findAccountsByUserId(userId);
            return responseFormatter.success(res, accounts);
        } catch (error) {
            logger.error('Erro ao listar contas:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Criar conta
     */
    async createAccount(req, res) {
        try {
            const userId = req.user.userId;
            const account = await service.createAccount(userId, req.body);
            return responseFormatter.success(res, account, 'Conta criada com sucesso', 201);
        } catch (error) {
            logger.error('Erro ao criar conta:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Listar cartões
     */
    async getCards(req, res) {
        try {
            const userId = req.user.userId;
            const cards = await service.findCardsByUserId(userId);
            return responseFormatter.success(res, cards);
        } catch (error) {
            logger.error('Erro ao listar cartões:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Criar cartão
     */
    async createCard(req, res) {
        try {
            const userId = req.user.userId;
            const card = await service.createCard(userId, req.body);
            return responseFormatter.success(res, card, 'Cartão criado com sucesso', 201);
        } catch (error) {
            logger.error('Erro ao criar cartão:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Listar orçamentos
     */
    async getBudgets(req, res) {
        try {
            const userId = req.user.userId;
            const month = req.query.month ? parseInt(req.query.month) : null;
            const year = req.query.year ? parseInt(req.query.year) : null;
            const budgets = await service.findBudgetsByUserId(userId, month, year);
            return responseFormatter.success(res, budgets);
        } catch (error) {
            logger.error('Erro ao listar orçamentos:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Criar orçamento
     */
    async createBudget(req, res) {
        try {
            const userId = req.user.userId;
            const budget = await service.createBudget(userId, req.body);
            return responseFormatter.success(res, budget, 'Orçamento criado com sucesso', 201);
        } catch (error) {
            logger.error('Erro ao criar orçamento:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Relatório resumido
     */
    async getSummaryReport(req, res) {
        try {
            const userId = req.user.userId;
            const { dateFrom, dateTo } = req.query;

            const now = new Date();
            const defaultDateFrom = dateFrom || `${now.getFullYear()}-01-01`;
            const defaultDateTo = dateTo || `${now.getFullYear()}-12-31`;

            const stats = await service.getDashboardStats(userId, defaultDateFrom, defaultDateTo);
            return responseFormatter.success(res, stats);
        } catch (error) {
            logger.error('Erro ao obter relatório resumido:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Relatório por categorias
     */
    async getCategoriesReport(req, res) {
        try {
            const userId = req.user.userId;
            const { dateFrom, dateTo, type } = req.query;

            const now = new Date();
            const defaultDateFrom = dateFrom || `${now.getFullYear()}-01-01`;
            const defaultDateTo = dateTo || `${now.getFullYear()}-12-31`;

            const transactions = await service.findTransactionsByUserId(userId, {
                type: type || null,
                dateFrom: defaultDateFrom,
                dateTo: defaultDateTo,
                status: 'PAID',
                limit: 10000
            });

            // Agrupar por categoria
            const categoryMap = {};
            transactions.data.forEach(t => {
                const catId = t.category_id || 'sem_categoria';
                if (!categoryMap[catId]) {
                    categoryMap[catId] = {
                        category_id: t.category_id,
                        category_name: t.category_id ? 'Categoria' : 'Sem categoria',
                        total: 0,
                        count: 0
                    };
                }
                categoryMap[catId].total += parseFloat(t.amount);
                categoryMap[catId].count += 1;
            });

            const report = Object.values(categoryMap);
            return responseFormatter.success(res, report);
        } catch (error) {
            logger.error('Erro ao obter relatório por categorias:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Transferir entre contas
     */
    async transferBetweenAccounts(req, res) {
        try {
            const userId = req.user.userId;
            const result = await service.transferBetweenAccounts(userId, req.body);
            return responseFormatter.success(res, result, 'Transferência realizada com sucesso', 201);
        } catch (error) {
            logger.error('Erro ao transferir entre contas:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Upload de anexo
     */
    async uploadAttachment(req, res) {
        try {
            // Implementar upload de arquivo
            // Por enquanto retornar URL mockada
            const fileUrl = req.file ? `/uploads/finance/${req.file.filename}` : null;
            return responseFormatter.success(res, { url: fileUrl }, 'Anexo enviado com sucesso', 201);
        } catch (error) {
            logger.error('Erro ao fazer upload de anexo:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Listar perfis financeiros
     */
    async getProfiles(req, res) {
        try {
            const userId = req.user.userId;
            const profiles = await service.findProfilesByUserId(userId);
            return responseFormatter.success(res, profiles);
        } catch (error) {
            logger.error('Erro ao listar perfis:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Buscar perfil por ID
     */
    async getProfile(req, res) {
        try {
            const userId = req.user.userId;
            const { id } = req.params;
            const profile = await service.findProfileById(id, userId);
            return responseFormatter.success(res, profile);
        } catch (error) {
            logger.error('Erro ao buscar perfil:', error);
            return responseFormatter.error(res, error.message, 404);
        }
    }

    /**
     * Buscar perfil principal
     */
    async getPrimaryProfile(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await service.findPrimaryProfile(userId);
            return responseFormatter.success(res, profile);
        } catch (error) {
            logger.error('Erro ao buscar perfil principal:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Criar perfil financeiro
     */
    async createProfile(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await service.createProfile(userId, req.body);
            return responseFormatter.success(res, profile, 'Perfil criado com sucesso', 201);
        } catch (error) {
            logger.error('Erro ao criar perfil:', error);
            
            // Se for erro de limite, retornar informações de upgrade
            if (error.code === 'FINANCE_PROFILE_LIMIT_REACHED') {
                return res.status(403).json({
                    success: false,
                    data: null,
                    error: {
                        code: error.code,
                        message: error.message,
                        currentCount: error.currentCount,
                        limit: error.limit,
                        upgradeRequired: true
                    }
                });
            }
            
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Atualizar perfil financeiro
     */
    async updateProfile(req, res) {
        try {
            const userId = req.user.userId;
            const { id } = req.params;
            const profile = await service.updateProfile(id, userId, req.body);
            return responseFormatter.success(res, profile, 'Perfil atualizado com sucesso');
        } catch (error) {
            logger.error('Erro ao atualizar perfil:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Deletar perfil financeiro
     */
    async deleteProfile(req, res) {
        try {
            const userId = req.user.userId;
            const { id } = req.params;
            await service.deleteProfile(id, userId);
            return responseFormatter.success(res, null, 'Perfil deletado com sucesso');
        } catch (error) {
            logger.error('Erro ao deletar perfil:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Obter limite de perfis financeiros do usuário
     */
    async getProfilesLimit(req, res) {
        try {
            const userId = req.user.userId;
            const planHelpers = require('../../utils/plan-helpers');
            const canCreate = await planHelpers.canCreateFinanceProfile(userId);
            const limit = await planHelpers.getUserFinanceProfilesLimit(userId);
            const plan = await planHelpers.getUserPlan(userId);
            
            return responseFormatter.success(res, {
                limit,
                currentCount: canCreate.currentCount,
                remaining: canCreate.remaining,
                canCreate: canCreate.canCreate,
                plan: plan ? {
                    code: plan.plan_code,
                    name: plan.plan_name,
                    price: plan.price
                } : null
            });
        } catch (error) {
            logger.error('Erro ao obter limite de perfis:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Obter planos de upgrade disponíveis
     */
    async getUpgradePlans(req, res) {
        try {
            const planHelpers = require('../../utils/plan-helpers');
            const plans = await planHelpers.getFinanceUpgradePlans();
            return responseFormatter.success(res, plans);
        } catch (error) {
            logger.error('Erro ao buscar planos de upgrade:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Obter configurações de WhatsApp (apenas ADM)
     */
    async getWhatsAppConfig(req, res) {
        try {
            const userId = req.user.userId;
            const db = require('../../db');
            
            // Verificar se é admin
            const userResult = await db.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
            if (!userResult.rows[0]?.is_admin) {
                return responseFormatter.error(res, 'Acesso negado. Apenas administradores podem acessar.', 403);
            }
            
            const result = await db.query(`
                SELECT 
                    fwc.id,
                    fwc.plan_code,
                    sp.plan_name,
                    fwc.whatsapp_number,
                    fwc.whatsapp_message,
                    fwc.created_at,
                    fwc.updated_at
                FROM finance_whatsapp_config fwc
                JOIN subscription_plans sp ON fwc.plan_code = sp.plan_code
                WHERE sp.plan_code IN ('king_finance', 'king_finance_plus')
                ORDER BY sp.plan_code
            `);
            
            return responseFormatter.success(res, result.rows);
        } catch (error) {
            logger.error('Erro ao buscar configurações de WhatsApp:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Atualizar configuração de WhatsApp (apenas ADM)
     */
    async updateWhatsAppConfig(req, res) {
        try {
            const userId = req.user.userId;
            const { plan_code, whatsapp_number, whatsapp_message } = req.body;
            const db = require('../../db');
            
            // Verificar se é admin
            const userResult = await db.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
            if (!userResult.rows[0]?.is_admin) {
                return responseFormatter.error(res, 'Acesso negado. Apenas administradores podem acessar.', 403);
            }
            
            if (!plan_code || !whatsapp_number || !whatsapp_message) {
                return responseFormatter.error(res, 'plan_code, whatsapp_number e whatsapp_message são obrigatórios.', 400);
            }
            
            // Verificar se o plano existe
            const planResult = await db.query('SELECT id FROM subscription_plans WHERE plan_code = $1', [plan_code]);
            if (planResult.rows.length === 0) {
                return responseFormatter.error(res, 'Plano não encontrado.', 404);
            }
            
            // Atualizar ou inserir configuração
            const result = await db.query(`
                INSERT INTO finance_whatsapp_config (plan_code, whatsapp_number, whatsapp_message, updated_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (plan_code) DO UPDATE SET
                    whatsapp_number = EXCLUDED.whatsapp_number,
                    whatsapp_message = EXCLUDED.whatsapp_message,
                    updated_at = NOW()
                RETURNING *
            `, [plan_code, whatsapp_number, whatsapp_message]);
            
            // Atualizar também na tabela subscription_plans
            await db.query(`
                UPDATE subscription_plans 
                SET whatsapp_number = $1, whatsapp_message = $2, updated_at = NOW()
                WHERE plan_code = $3
            `, [whatsapp_number, whatsapp_message, plan_code]);
            
            return responseFormatter.success(res, result.rows[0]);
        } catch (error) {
            logger.error('Erro ao atualizar configuração de WhatsApp:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Status da senha de zerar (se tem senha customizada; não retorna a senha)
     */
    async getZerarSenhaStatus(req, res) {
        try {
            const userId = req.user.userId;
            const senha = await service.getZerarSenhaEffective(userId);
            const hasCustom = senha !== '1212';
            return responseFormatter.success(res, { hasCustomPassword: hasCustom });
        } catch (error) {
            logger.error('Erro ao obter status da senha de zerar:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Apenas verificar senha de zerar (para liberar acesso à página Gestão do mês)
     */
    async postZerarSenhaVerify(req, res) {
        try {
            const userId = req.user.userId;
            const { password } = req.body;
            if (!password) {
                return responseFormatter.error(res, 'Informe a senha.', 400);
            }
            const ok = await service.verifyZerarSenha(userId, password);
            if (!ok) {
                return responseFormatter.error(res, 'Senha incorreta.', 403);
            }
            return responseFormatter.success(res, { verified: true });
        } catch (error) {
            logger.error('Erro ao verificar senha de zerar:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Alterar senha de zerar mês
     */
    async putZerarSenha(req, res) {
        try {
            const userId = req.user.userId;
            const { currentPassword, newPassword } = req.body;
            if (!currentPassword || !newPassword) {
                return responseFormatter.error(res, 'Informe a senha atual e a nova senha.', 400);
            }
            const ok = await service.verifyZerarSenha(userId, currentPassword);
            if (!ok) {
                return responseFormatter.error(res, 'Senha atual incorreta.', 403);
            }
            await service.setZerarSenha(userId, newPassword);
            return responseFormatter.success(res, null, 'Senha de zerar mês alterada com sucesso.');
        } catch (error) {
            logger.error('Erro ao alterar senha de zerar:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Zerar todas as transações do mês (exige senha)
     */
    async postZerarMes(req, res) {
        try {
            const userId = req.user.userId;
            const { password, month, year, profile_id } = req.body;
            if (!password) {
                return responseFormatter.error(res, 'Informe a senha para confirmar.', 400);
            }
            const monthNum = month ? parseInt(month, 10) : new Date().getMonth() + 1;
            const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
            if (monthNum < 1 || monthNum > 12) {
                return responseFormatter.error(res, 'Mês inválido.', 400);
            }
            const result = await service.zerarMes(userId, yearNum, monthNum, profile_id || null, password);
            return responseFormatter.success(res, result, `Mês zerado. ${result.deleted} transação(ões) removida(s).`);
        } catch (error) {
            logger.error('Erro ao zerar mês:', error);
            const statusCode = error.message.includes('Senha incorreta') ? 403 : 400;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Admin: listar todos os clientes da Gestão Financeira com suas senhas de zerar
     */
    async getAdminClientesSenhas(req, res) {
        try {
            const userId = req.user.userId;
            const db = require('../../db');
            const userResult = await db.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
            if (!userResult.rows[0]?.is_admin) {
                return responseFormatter.error(res, 'Acesso negado. Apenas administradores.', 403);
            }
            const list = await service.listClientesZerarSenhas();
            return responseFormatter.success(res, list);
        } catch (error) {
            logger.error('Erro ao listar senhas dos clientes:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Importação Serasa: extrai texto do PDF e retorna prévia das ofertas (sem salvar).
     * Upload feito pelo usuário; não acessa Serasa nem serviços externos.
     */
    async importSerasaPreview(req, res) {
        try {
            if (!req.file || !req.file.buffer) {
                return responseFormatter.error(res, 'Envie um arquivo PDF.', 400);
            }
            const pdfParse = require('pdf-parse');
            const data = await pdfParse(req.file.buffer);
            const text = (data && data.text) ? data.text : '';
            const { parseSerasaOfertas } = require('../../utils/serasa-pdf-parser');
            const offers = parseSerasaOfertas(text);
            return responseFormatter.success(res, { offers });
        } catch (error) {
            logger.error('Erro ao processar PDF Serasa:', error);
            return responseFormatter.error(res, error.message || 'Não foi possível ler o PDF. Verifique se o arquivo é um relatório do Serasa.', 500);
        }
    }

    /**
     * Importação Serasa via imagens (prints da tela "Detalhes da dívida"): OCR + extração de campos.
     * Aceita um ou mais JPEG/PNG; retorna prévia com nome, contrato, produto, data, valores.
     */
    async importSerasaImagePreview(req, res) {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        let tempFiles = [];
        try {
            const files = req.files || (req.file ? [req.file] : []);
            if (!files.length || !files[0].buffer) {
                return responseFormatter.error(res, 'Envie uma ou mais imagens (JPEG/PNG) da tela Detalhes da dívida.', 400);
            }
            const { createWorker } = require('tesseract.js');
            const { parseDetalhesDividaFromMultipleTexts } = require('../../utils/serasa-image-parser');
            const ocrTexts = [];
            for (const file of files) {
                if (!file.buffer) continue;
                const ext = (file.mimetype === 'image/png') ? '.png' : '.jpg';
                const tmpPath = path.join(os.tmpdir(), `serasa-ocr-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
                fs.writeFileSync(tmpPath, file.buffer);
                tempFiles.push(tmpPath);
            }
            const worker = await createWorker('por', 1, { logger: () => {} });
            try {
                for (const tmpPath of tempFiles) {
                    try {
                        const { data: { text } } = await worker.recognize(tmpPath);
                        if (text && text.trim()) ocrTexts.push(text);
                    } catch (e) {
                        logger.error('OCR falhou para um arquivo:', e.message);
                    }
                }
            } finally {
                await worker.terminate();
            }
            for (const p of tempFiles) {
                try { fs.unlinkSync(p); } catch (_) {}
            }
            const offers = parseDetalhesDividaFromMultipleTexts(ocrTexts);
            return responseFormatter.success(res, { offers, source: 'image' });
        } catch (error) {
            for (const p of tempFiles || []) {
                try { require('fs').unlinkSync(p); } catch (_) {}
            }
            logger.error('Erro ao processar imagens Serasa (OCR):', error);
            return responseFormatter.error(res, error.message || 'Não foi possível ler as imagens. Envie prints da tela "Detalhes da dívida".', 500);
        }
    }

    /**
     * GET /api/finance/king-data — Carregar dados Serasa (dividas) + Quem eu devo (terceiros) para sync localhost/site/mobile
     */
    async getKingData(req, res) {
        try {
            const userId = req.user.userId;
            const profileId = req.query.profile_id == null ? null : String(req.query.profile_id).trim() || null;
            const data = await service.getKingData(userId, profileId);
            return responseFormatter.success(res, data || { dividas: [], terceiros: [] });
        } catch (error) {
            logger.error('Erro ao obter king-data:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * PUT /api/finance/king-data — Salvar dados Serasa + Quem eu devo (sincronização)
     */
    async saveKingData(req, res) {
        try {
            const userId = req.user.userId;
            const profileId = req.body.profile_id == null ? null : String(req.body.profile_id).trim() || null;
            const data = req.body.data;
            const saved = await service.saveKingData(userId, profileId, data);
            return responseFormatter.success(res, saved, 'Dados sincronizados.');
        } catch (error) {
            logger.error('Erro ao salvar king-data:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }
}

module.exports = new FinanceController();
