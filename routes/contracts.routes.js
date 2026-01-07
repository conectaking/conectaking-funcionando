const express = require('express');
const router = express.Router();
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * GET /api/contracts - Listar contratos do usuário
 */
router.get('/', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        
        const result = await client.query(`
            SELECT 
                pi.*,
                ci.*,
                COUNT(cs.id) as signatures_count
            FROM profile_items pi
            INNER JOIN contract_items ci ON ci.profile_item_id = pi.id
            LEFT JOIN contract_signatures cs ON cs.contract_item_id = ci.id
            WHERE pi.user_id = $1 AND pi.item_type = 'contract' AND pi.is_active = true
            GROUP BY pi.id, ci.id
            ORDER BY pi.display_order ASC, pi.created_at DESC
        `, [userId]);
        
        res.json(result.rows);
    } catch (error) {
        logger.error('Erro ao listar contratos:', error);
        res.status(500).json({ message: 'Erro ao listar contratos', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * POST /api/contracts - Criar novo contrato
 */
router.post('/', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const {
            title,
            contract_type,
            contract_template,
            require_signature,
            require_stamp,
            allow_digital_signature,
            allow_photo_signature,
            stamp_image_url,
            stamp_text
        } = req.body;
        
        // Criar profile_item
        const itemResult = await client.query(`
            INSERT INTO profile_items (user_id, item_type, title, is_active, display_order)
            VALUES ($1, 'contract', $2, true, 
                (SELECT COALESCE(MAX(display_order), 0) + 1 FROM profile_items WHERE user_id = $1))
            RETURNING id
        `, [userId, title || 'Novo Contrato']);
        
        const profileItemId = itemResult.rows[0].id;
        
        // Criar contract_item
        const contractResult = await client.query(`
            INSERT INTO contract_items (
                profile_item_id, contract_title, contract_type, contract_template,
                require_signature, require_stamp, allow_digital_signature, 
                allow_photo_signature, stamp_image_url, stamp_text
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            profileItemId,
            title || 'Novo Contrato',
            contract_type || 'general',
            contract_template || '',
            require_signature !== undefined ? require_signature : true,
            require_stamp !== undefined ? require_stamp : true,
            allow_digital_signature !== undefined ? allow_digital_signature : true,
            allow_photo_signature !== undefined ? allow_photo_signature : true,
            stamp_image_url || null,
            stamp_text || null
        ]);
        
        res.json({
            ...itemResult.rows[0],
            contract_data: contractResult.rows[0]
        });
    } catch (error) {
        logger.error('Erro ao criar contrato:', error);
        res.status(500).json({ message: 'Erro ao criar contrato', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * PUT /api/contracts/:id - Atualizar contrato
 */
router.put('/:id', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const contractId = parseInt(req.params.id, 10);
        const {
            title,
            contract_type,
            contract_template,
            require_signature,
            require_stamp,
            allow_digital_signature,
            allow_photo_signature,
            stamp_image_url,
            stamp_text,
            is_active,
            display_order
        } = req.body;
        
        // Verificar se o contrato pertence ao usuário
        const checkResult = await client.query(`
            SELECT pi.id, ci.id as contract_item_id
            FROM profile_items pi
            INNER JOIN contract_items ci ON ci.profile_item_id = pi.id
            WHERE pi.id = $1 AND pi.user_id = $2 AND pi.item_type = 'contract'
        `, [contractId, userId]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Contrato não encontrado' });
        }
        
        const contractItemId = checkResult.rows[0].contract_item_id;
        
        // Atualizar profile_item
        if (title !== undefined || is_active !== undefined || display_order !== undefined) {
            const updateFields = [];
            const updateValues = [];
            let paramIndex = 1;
            
            if (title !== undefined) {
                updateFields.push(`title = $${paramIndex++}`);
                updateValues.push(title);
            }
            if (is_active !== undefined) {
                updateFields.push(`is_active = $${paramIndex++}`);
                updateValues.push(is_active);
            }
            if (display_order !== undefined) {
                updateFields.push(`display_order = $${paramIndex++}`);
                updateValues.push(display_order);
            }
            
            if (updateFields.length > 0) {
                updateValues.push(contractId, userId);
                await client.query(`
                    UPDATE profile_items 
                    SET ${updateFields.join(', ')}
                    WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
                `, updateValues);
            }
        }
        
        // Atualizar contract_item
        const contractUpdateFields = [];
        const contractUpdateValues = [];
        let contractParamIndex = 1;
        
        if (contract_type !== undefined) {
            contractUpdateFields.push(`contract_type = $${contractParamIndex++}`);
            contractUpdateValues.push(contract_type);
        }
        if (contract_template !== undefined) {
            contractUpdateFields.push(`contract_template = $${contractParamIndex++}`);
            contractUpdateValues.push(contract_template);
        }
        if (require_signature !== undefined) {
            contractUpdateFields.push(`require_signature = $${contractParamIndex++}`);
            contractUpdateValues.push(require_signature);
        }
        if (require_stamp !== undefined) {
            contractUpdateFields.push(`require_stamp = $${contractParamIndex++}`);
            contractUpdateValues.push(require_stamp);
        }
        if (allow_digital_signature !== undefined) {
            contractUpdateFields.push(`allow_digital_signature = $${contractParamIndex++}`);
            contractUpdateValues.push(allow_digital_signature);
        }
        if (allow_photo_signature !== undefined) {
            contractUpdateFields.push(`allow_photo_signature = $${contractParamIndex++}`);
            contractUpdateValues.push(allow_photo_signature);
        }
        if (stamp_image_url !== undefined) {
            contractUpdateFields.push(`stamp_image_url = $${contractParamIndex++}`);
            contractUpdateValues.push(stamp_image_url);
        }
        if (stamp_text !== undefined) {
            contractUpdateFields.push(`stamp_text = $${contractParamIndex++}`);
            contractUpdateValues.push(stamp_text);
        }
        
        if (contractUpdateFields.length > 0) {
            contractUpdateValues.push(contractItemId);
            await client.query(`
                UPDATE contract_items 
                SET ${contractUpdateFields.join(', ')}
                WHERE id = $${contractParamIndex++}
            `, contractUpdateValues);
        }
        
        // Buscar dados atualizados
        const result = await client.query(`
            SELECT pi.*, ci.*
            FROM profile_items pi
            INNER JOIN contract_items ci ON ci.profile_item_id = pi.id
            WHERE pi.id = $1
        `, [contractId]);
        
        res.json({
            ...result.rows[0],
            contract_data: result.rows[0]
        });
    } catch (error) {
        logger.error('Erro ao atualizar contrato:', error);
        res.status(500).json({ message: 'Erro ao atualizar contrato', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * GET /api/contracts/:id/signatures - Listar assinaturas de um contrato
 */
router.get('/:id/signatures', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const contractId = parseInt(req.params.id, 10);
        
        // Verificar se o contrato pertence ao usuário
        const checkResult = await client.query(`
            SELECT ci.id
            FROM profile_items pi
            INNER JOIN contract_items ci ON ci.profile_item_id = pi.id
            WHERE pi.id = $1 AND pi.user_id = $2 AND pi.item_type = 'contract'
        `, [contractId, userId]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Contrato não encontrado' });
        }
        
        const contractItemId = checkResult.rows[0].id;
        
        const result = await client.query(`
            SELECT * FROM contract_signatures
            WHERE contract_item_id = $1
            ORDER BY created_at DESC
        `, [contractItemId]);
        
        res.json(result.rows);
    } catch (error) {
        logger.error('Erro ao listar assinaturas:', error);
        res.status(500).json({ message: 'Erro ao listar assinaturas', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * POST /api/contracts/:id/sign - Assinar contrato (público)
 */
router.post('/:id/sign', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const contractId = parseInt(req.params.id, 10);
        const {
            signer_name,
            signer_email,
            signer_phone,
            signer_document,
            signature_type,
            signature_data,
            stamp_applied
        } = req.body;
        
        // Buscar contract_item
        const contractResult = await client.query(`
            SELECT ci.*
            FROM profile_items pi
            INNER JOIN contract_items ci ON ci.profile_item_id = pi.id
            WHERE pi.id = $1 AND pi.item_type = 'contract' AND pi.is_active = true
        `, [contractId]);
        
        if (contractResult.rows.length === 0) {
            return res.status(404).json({ message: 'Contrato não encontrado' });
        }
        
        const contractItem = contractResult.rows[0];
        
        // Validar tipo de assinatura permitido
        if (signature_type === 'digital' && !contractItem.allow_digital_signature) {
            return res.status(400).json({ message: 'Assinatura digital não permitida para este contrato' });
        }
        if (signature_type === 'photo' && !contractItem.allow_photo_signature) {
            return res.status(400).json({ message: 'Assinatura por foto não permitida para este contrato' });
        }
        
        // Criar assinatura
        const signatureResult = await client.query(`
            INSERT INTO contract_signatures (
                contract_item_id, signer_name, signer_email, signer_phone, signer_document,
                signature_type, signature_data, stamp_applied, stamp_data,
                ip_address, user_agent, status, signed_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'signed', NOW())
            RETURNING *
        `, [
            contractItem.id,
            signer_name,
            signer_email || null,
            signer_phone || null,
            signer_document || null,
            signature_type || 'digital',
            signature_data,
            stamp_applied || false,
            stamp_applied ? JSON.stringify({ stamp_image_url: contractItem.stamp_image_url, stamp_text: contractItem.stamp_text }) : null,
            req.ip || req.connection.remoteAddress,
            req.headers['user-agent'] || null
        ]);
        
        res.json({
            success: true,
            signature: signatureResult.rows[0]
        });
    } catch (error) {
        logger.error('Erro ao assinar contrato:', error);
        res.status(500).json({ message: 'Erro ao assinar contrato', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * GET /api/contracts/public/:id - Obter contrato público para assinatura
 */
router.get('/public/:id', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const contractId = parseInt(req.params.id, 10);
        
        const result = await client.query(`
            SELECT 
                pi.*,
                ci.*,
                u.profile_slug
            FROM profile_items pi
            INNER JOIN contract_items ci ON ci.profile_item_id = pi.id
            INNER JOIN users u ON u.id = pi.user_id
            WHERE pi.id = $1 AND pi.item_type = 'contract' AND pi.is_active = true
        `, [contractId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Contrato não encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Erro ao buscar contrato público:', error);
        res.status(500).json({ message: 'Erro ao buscar contrato', error: error.message });
    } finally {
        client.release();
    }
}));

module.exports = router;

