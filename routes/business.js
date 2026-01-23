
const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const multer = require('multer');
const FormData = require('form-data');
const fetch = require('node-fetch');
const config = require('../config'); 

const router = express.Router();

// Configurar multer para upload de logo
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos de imagem são permitidos.'), false);
        }
    }
});

// Middleware para verificar modo empresa (só King Corporate)
const protectBusinessOwner = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Não autenticado.' });
    }

    try {
        const accountType = req.user.accountType;
        
        // Só King Corporate tem modo empresa
        if (accountType === 'king_corporate' || accountType === 'business_owner') {
            return next();
        }

        res.status(403).json({ 
            message: 'Acesso negado. Modo Empresa disponível apenas para planos King Corporate.' 
        });
    } catch (error) {
        console.error('Erro ao verificar modo empresa:', error);
        res.status(500).json({ message: 'Erro ao verificar permissões.' });
    }
};

// Middleware para permitir planos que podem alterar logo
// Planos permitidos: king_finance, king_finance_plus, king_premium_plus, king_corporate
const protectBusinessOwnerOrLogo = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Não autenticado.' });
    }

    try {
        const accountType = req.user.accountType;
        
        // Planos que podem alterar logo
        const plansWithLogo = [
            'king_finance',
            'king_finance_plus',
            'king_premium_plus',
            'king_corporate',
            // Planos antigos (compatibilidade)
            'business_owner',
            'individual_com_logo'
        ];

        // Verificar se accountType está na lista
        if (plansWithLogo.includes(accountType)) {
            return next();
        }

        res.status(403).json({ 
            message: 'Acesso negado. Apenas planos King Finance, King Finance Plus, King Premium Plus ou King Corporate podem alterar a logo.' 
        });
    } catch (error) {
        console.error('Erro ao verificar permissão de logo:', error);
        res.status(500).json({ message: 'Erro ao verificar permissões.' });
    }
};

router.get('/team', protectUser, protectBusinessOwner, async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT u.id, p.display_name, u.email, u.created_at 
             FROM users u
             LEFT JOIN user_profiles p ON u.id = p.user_id
             WHERE u.parent_user_id = $1`,
            [req.user.userId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar dados da equipe.' });
    }
});

router.post('/generate-code', protectUser, protectBusinessOwner, async (req, res) => {
    const ownerId = req.user.userId;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const limitResult = await client.query('SELECT max_team_invites FROM users WHERE id = $1', [ownerId]);
        if (limitResult.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        const maxInvites = limitResult.rows[0].max_team_invites;

        const countResult = await client.query('SELECT COUNT(*) FROM registration_codes WHERE generated_by_user_id = $1', [ownerId]);
        const codeCount = parseInt(countResult.rows[0].count, 10);

        if (codeCount >= maxInvites) {
            return res.status(403).json({ message: `Limite de ${maxInvites} códigos de equipe atingido.` });
        }

        const newCode = nanoid(10).toUpperCase();
        
        await client.query(
            'INSERT INTO registration_codes (code, generated_by_user_id) VALUES ($1, $2)',
            [newCode, ownerId]
        );

        await client.query('COMMIT');
        res.status(201).json({ message: 'Novo código de equipe gerado!', code: newCode });

    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: 'Erro ao gerar código.' });
    } finally {
        client.release();
    }
});

// POST /api/business/logo - Upload de logo da empresa
router.post('/logo', protectUser, protectBusinessOwnerOrLogo, upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
        }

        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = process.env.CLOUDFLARE_API_TOKEN || config.cloudflare?.apiToken;

        if (!accountId || !apiToken) {
            return res.status(500).json({ message: 'Erro de configuração do servidor.' });
        }

        // Obter URL de upload do Cloudflare
        const authResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v2/direct_upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`
            }
        });

        const authData = await authResponse.json();

        if (!authData.success || !authData.result) {
            return res.status(500).json({ message: 'Falha ao obter URL de upload.' });
        }

        const { uploadURL, id: imageId } = authData.result;

        // Fazer upload da imagem
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname || 'logo.jpg',
            contentType: req.file.mimetype
        });

        const uploadResponse = await fetch(uploadURL, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });

        if (!uploadResponse.ok) {
            return res.status(500).json({ message: 'Falha ao fazer upload da imagem.' });
        }

        // Construir URL final
        const accountHash = config.cloudflare?.accountHash || accountId;
        const logoUrl = `https://imagedelivery.net/${accountHash}/${imageId}/public`;

        // Salvar no banco
        await db.query(
            'UPDATE users SET company_logo_url = $1 WHERE id = $2',
            [logoUrl, req.user.userId]
        );

        res.json({
            success: true,
            message: 'Logo atualizada com sucesso!',
            logoUrl: logoUrl
        });
    } catch (error) {
        console.error('Erro ao fazer upload de logo:', error);
        res.status(500).json({ message: 'Erro ao fazer upload da logo.' });
    }
});

// PUT /api/business/branding - Atualizar configurações de branding (logo, tamanho, link)
router.put('/branding', protectUser, protectBusinessOwnerOrLogo, async (req, res) => {
    const { logoUrl, logoSize, logoLink } = req.body;
    const ownerId = req.user.userId;

    if (!logoUrl) {
        return res.status(400).json({ message: 'URL do logo é obrigatória.' });
    }
    const size = parseInt(logoSize, 10) || 60;

    try {
        await db.query(
            'UPDATE users SET company_logo_url = $1, company_logo_size = $2, company_logo_link = $3 WHERE id = $4',
            [logoUrl, size, logoLink, ownerId]
        );
        res.status(200).json({ message: 'Personalização da marca salva com sucesso!' });
    } catch (error) {
        console.error("Erro ao salvar personalização da marca:", error);
        res.status(500).json({ message: 'Erro no servidor ao salvar as alterações.' });
    }
});

router.post('/codes/generate-manual', protectUser, protectBusinessOwner, async (req, res) => {
    const { customCode } = req.body;
    const ownerId = req.user.userId;
    const client = await db.pool.connect();

    // Validação do código recebido
    if (!customCode || customCode.length > 12 || customCode.includes(' ')) {
        return res.status(400).json({ message: 'Código personalizado inválido. Deve ter no máximo 12 caracteres e não conter espaços.' });
    }

    try {
        await client.query('BEGIN');

        const limitResult = await client.query('SELECT max_team_invites FROM users WHERE id = $1', [ownerId]);
        const maxInvites = limitResult.rows[0].max_team_invites;

        const countResult = await client.query('SELECT COUNT(*) FROM registration_codes WHERE generated_by_user_id = $1', [ownerId]);
        const codeCount = parseInt(countResult.rows[0].count, 10);

        if (codeCount >= maxInvites) {
            return res.status(403).json({ message: `Limite de ${maxInvites} códigos de equipe atingido. Não é possível criar um novo.` });
        }

        // 4. Tenta inserir o novo código
        await client.query(
            'INSERT INTO registration_codes (code, generated_by_user_id) VALUES ($1, $2)',
            [customCode, ownerId]
        );

        await client.query('COMMIT');
        res.status(201).json({ message: `Código '${customCode}' criado com sucesso!`, code: customCode });

    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') { 
            return res.status(409).json({ message: 'Este código personalizado já existe. Tente outro.' });
        }
        console.error("Erro ao criar código manual de equipe:", error);
        res.status(500).json({ message: 'Erro no servidor ao criar código.' });
    } finally {
        client.release();
    }
});

router.get('/codes', protectUser, protectBusinessOwner, async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT code, is_claimed, claimed_at, 
            (SELECT email FROM users WHERE id = claimed_by_user_id) as claimed_by_email
            FROM registration_codes WHERE generated_by_user_id = $1`,
            [req.user.userId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar códigos.' });
    }
});


module.exports = router;