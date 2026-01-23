/**
 * Controller para o módulo de Subscription
 */

const service = require('./subscription.service');
const logger = require('../../utils/logger');

class SubscriptionController {
    /**
     * GET /api/subscription/info
     * Buscar informações da assinatura do usuário
     */
    async getSubscriptionInfo(req, res) {
        try {
            const userId = req.user.userId;
            const billingType = req.query.billingType || 'monthly'; // 'monthly' ou 'annual'
            
            const subscriptionInfo = await service.getUserSubscription(userId);
            
            if (!subscriptionInfo) {
                return res.status(404).json({ message: 'Usuário não encontrado.' });
            }
            
            // Enriquecer planos com informações de pagamento
            const enrichedPlans = service.enrichPlansWithPaymentInfo(
                subscriptionInfo.availablePlans,
                billingType
            );
            
            const enrichedCurrentPlan = subscriptionInfo.currentPlan
                ? service.enrichPlansWithPaymentInfo([subscriptionInfo.currentPlan], billingType)[0]
                : null;
            
            res.json({
                user: subscriptionInfo.user,
                currentPlan: enrichedCurrentPlan,
                availablePlans: enrichedPlans,
                billingType: billingType
            });
        } catch (error) {
            logger.error('Erro ao buscar informações de assinatura:', error);
            res.status(500).json({ message: 'Erro ao buscar informações de assinatura.' });
        }
    }

    /**
     * GET /api/subscription/plans-public
     * Buscar planos disponíveis (público)
     */
    async getPublicPlans(req, res) {
        try {
            const billingType = req.query.billingType || 'monthly'; // 'monthly' ou 'annual'
            
            const plans = await service.getAvailablePlans(false);
            const enrichedPlans = service.enrichPlansWithPaymentInfo(plans, billingType);
            
            res.json({
                success: true,
                plans: enrichedPlans,
                billingType: billingType
            });
        } catch (error) {
            logger.error('Erro ao buscar planos públicos:', error);
            res.status(500).json({ message: 'Erro ao buscar planos.' });
        }
    }

    /**
     * GET /api/subscription/plans
     * Buscar todos os planos (apenas admin)
     */
    async getPlans(req, res) {
        try {
            const userId = req.user.userId;
            
            // Verificar se é admin
            const db = require('../../db');
            const client = await db.pool.connect();
            try {
                const adminCheck = await client.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
                if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
                    return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar.' });
                }
            } finally {
                client.release();
            }
            
            const plans = await service.getAvailablePlans(true);
            const billingType = req.query.billingType || 'monthly';
            const enrichedPlans = service.enrichPlansWithPaymentInfo(plans, billingType);
            
            res.json({
                plans: enrichedPlans,
                billingType: billingType
            });
        } catch (error) {
            logger.error('Erro ao buscar planos:', error);
            res.status(500).json({ message: 'Erro ao buscar planos.' });
        }
    }
}

module.exports = new SubscriptionController();
