// EM: backend/routes/payment.js

const express = require('express');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');

const router = express.Router();

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN 
});

router.post('/create-preference', protectUser, async (req, res) => {
    const userId = req.user.userId;

    try {
        const userResult = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        const userEmail = userResult.rows[0].email;
        
        const preference = new Preference(client);

        const preferenceData = {
            body: {
                purpose: 'subscription',
                items: [
                    {
                        id: process.env.MERCADOPAGO_INDIVIDUAL_PLAN_ID,
                        title: 'Conecta King - Plano Individual (Mensal)',
                        quantity: 1,
                        unit_price: 1.00, 
                        currency_id: 'BRL',
                    }
                ],
                payer: {
                    email: userEmail,
                },
                back_urls: {
                    success: 'http://127.0.0.1:5500/frontend/dashboard.html?payment=success',
                    failure: 'http://127.0.0.1:5500/frontend/index.html?payment=failure',
                    pending: 'http://127.0.0.1:5500/frontend/index.html?payment=pending'
                },
                 external_reference: userId,
            }
        };

        const result = await preference.create(preferenceData);
        
        res.json({ preferenceId: result.id });

    } catch (error) {
        console.error("Erro ao criar preferência no Mercado Pago:", error.cause || error);
        res.status(500).json({ message: 'Não foi possível iniciar o processo de pagamento.' });
    }
});

router.post('/webhook-notification', async (req, res) => {
    const notification = req.body;
    console.log('[WEBHOOK]: Notificação recebida:', notification);

    try {
        if (notification.type === 'payment') {
            const paymentId = notification.data.id;
            
            const payment = new Payment(client);
            const paymentInfo = await payment.get({ id: paymentId });

            console.log('[WEBHOOK]: Dados do Pagamento Obtidos:', {
                id: paymentInfo.id,
                status: paymentInfo.status,
                payment_method: paymentInfo.payment_method_id,
                external_reference: paymentInfo.external_reference,
                preapproval_id: paymentInfo.preapproval_id
            });

            if (paymentInfo.status === 'approved') {
                const userId = paymentInfo.external_reference;

                if (!userId) {
                    console.error('[WEBHOOK]: ERRO CRÍTICO - Pagamento aprovado sem external_reference (UserID).');
                    return res.sendStatus(200);
                }

                const subscriptionId = paymentInfo.preapproval_id;
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 30);

                const clientDB = await db.pool.connect();
                try {
                    await clientDB.query('BEGIN');
                    
                    if (subscriptionId) {
                        console.log(`[WEBHOOK]: Pagamento com Cartão. Ativando assinatura recorrente ${subscriptionId} para o usuário ${userId}.`);
                        await clientDB.query(
                            `UPDATE users 
                             SET account_type = 'individual', 
                                 subscription_id = $1, 
                                 subscription_status = 'active', 
                                 subscription_expires_at = $2 
                             WHERE id = $3`,
                            [subscriptionId, expiresAt, userId]
                        );
                    } else {
                        console.log(`[WEBHOOK]: Pagamento com PIX/Boleto. Ativando acesso único de 30 dias para o usuário ${userId}.`);
                        await clientDB.query(
                            `UPDATE users 
                             SET account_type = 'individual', 
                                 subscription_id = $1, 
                                 subscription_status = 'active_onetime', -- Status para indicar que não é recorrente
                                 subscription_expires_at = $2 
                             WHERE id = $3`,
                            [`pix_${paymentId}`, expiresAt, userId] // Usamos o ID do pagamento como referência
                        );
                    }
                    
                    await clientDB.query('COMMIT');
                    console.log(`✅ [WEBHOOK]: SUCESSO! Plano de 30 dias ativado para o usuário ${userId}.`);

                } catch (dbError) {
                    await clientDB.query('ROLLBACK');
                    console.error('[WEBHOOK]: ERRO no banco de dados ao ativar plano:', dbError);
                } finally {
                    clientDB.release();
                }
            }
        }
    } catch (error) {
        console.error('❌ [WEBHOOK]: ERRO GERAL ao processar notificação:', error.cause || error);
    }
    
    res.sendStatus(200);
});

module.exports = router;