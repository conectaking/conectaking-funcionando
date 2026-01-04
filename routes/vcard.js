const express = require('express');
const db = require('../db');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

router.get('/:identifier', asyncHandler(async (req, res) => {
    const { identifier } = req.params;
    const client = await db.pool.connect();

    try {
        const userRes = await client.query('SELECT id FROM users WHERE profile_slug = $1 OR id = $1', [identifier]);
        if (userRes.rows.length === 0) {
            return res.status(404).send('Perfil não encontrado.');
        }
        const userId = userRes.rows[0].id;

        const profileRes = await client.query('SELECT display_name, whatsapp FROM user_profiles WHERE user_id = $1', [userId]);
        if (profileRes.rows.length === 0) {
            return res.status(404).send('Detalhes do perfil não encontrados.');
        }
        const profile = profileRes.rows[0];
        
        const itemsRes = await client.query('SELECT item_type, title, destination_url, pix_key FROM profile_items WHERE user_id = $1 AND is_active = TRUE ORDER BY display_order ASC', [userId]);

        const fullName = profile.display_name || 'Contato Conecta King';
        let vCard = 'BEGIN:VCARD\n';
        vCard += 'VERSION:3.0\n';
        vCard += `FN:${fullName}\n`; 

        vCard += `URL;TYPE=WORK:https://tag.conectaking.com.br/${identifier}\n`;

        let notes = ['Contato salvo via Conecta King.'];
        
        // Buscar email e telefone dos itens do perfil (primeiros encontrados)
        let emailAdded = false;
        let phoneAdded = false;
        
        // Se houver WhatsApp no perfil e ainda não foi adicionado telefone, adicionar primeiro
        // (antes de processar os módulos, para garantir que o WhatsApp do perfil seja usado se não houver módulo)
        if (profile.whatsapp && !phoneAdded) {
            const whatsappNumber = profile.whatsapp.replace(/\D/g, '');
            if (whatsappNumber) {
                vCard += `TEL;TYPE=CELL,VOICE:${whatsappNumber}\n`;
                vCard += `URL;TYPE=WhatsApp:https://wa.me/${whatsappNumber}\n`;
                phoneAdded = true;
            }
        }

        itemsRes.rows.forEach(item => {
            // Ignorar itens sem destination_url ou com destination_url vazio
            if (!item.destination_url || !item.destination_url.trim()) {
                return;
            }
            
            const url = item.destination_url.trim();
            const itemTitle = item.title || item.item_type;
            
            switch (item.item_type) {
                case 'whatsapp':
                    // Adicionar como telefone principal se ainda não foi adicionado
                    if (!phoneAdded) {
                        const phoneNumber = url.replace(/\D/g, '');
                        if (phoneNumber) {
                            vCard += `TEL;TYPE=CELL,VOICE:${phoneNumber}\n`;
                            phoneAdded = true;
                        }
                    }
                    // Sempre adicionar também como URL do WhatsApp
                    if (url.startsWith('http')) {
                        vCard += `URL;TYPE=WhatsApp:${url}\n`;
                    } else {
                        vCard += `URL;TYPE=WhatsApp:https://wa.me/${url.replace(/\D/g, '')}\n`;
                    }
                    break;
                    
                case 'email':
                    // Extrair email do URL (pode ser mailto: ou email direto)
                    let emailAddress = url.replace(/^mailto:/i, '').trim();
                    if (!emailAddress.includes('@')) {
                        emailAddress = url;
                    }
                    
                    // Adicionar como email principal se ainda não foi adicionado
                    if (!emailAdded && emailAddress.includes('@')) {
                        vCard += `EMAIL;TYPE=INTERNET:${emailAddress}\n`;
                        emailAdded = true;
                    } else if (emailAddress.includes('@')) {
                        // Se já tiver email principal, adicionar como URL de email
                        vCard += `URL;TYPE=Email:mailto:${emailAddress}\n`;
                    }
                    break;
                    
                case 'telegram':
                    // Adicionar como telefone secundário se telefone principal não existe
                    if (!phoneAdded) {
                        const phoneNumber = url.replace(/\D/g, '');
                        if (phoneNumber && phoneNumber.length >= 10) {
                            vCard += `TEL;TYPE=CELL,VOICE:${phoneNumber}\n`;
                            phoneAdded = true;
                        }
                    }
                    // Sempre adicionar também como URL do Telegram
                    if (url.startsWith('http')) {
                        vCard += `URL;TYPE=Telegram:${url}\n`;
                    } else {
                        vCard += `URL;TYPE=Telegram:https://t.me/${url.replace(/^@/, '')}\n`;
                    }
                    break;
                    
                case 'instagram':
                    if (url.startsWith('http')) {
                        vCard += `URL;TYPE=Instagram:${url}\n`;
                    } else {
                        vCard += `URL;TYPE=Instagram:https://instagram.com/${url.replace(/^@/, '')}\n`;
                    }
                    break;
                    
                case 'facebook':
                    vCard += `URL;TYPE=Facebook:${url.startsWith('http') ? url : `https://facebook.com/${url}`}\n`;
                    break;
                    
                case 'twitter':
                    vCard += `URL;TYPE=Twitter:${url.startsWith('http') ? url : `https://twitter.com/${url.replace(/^@/, '')}`}\n`;
                    break;
                    
                case 'linkedin':
                    vCard += `URL;TYPE=LinkedIn:${url.startsWith('http') ? url : `https://linkedin.com/in/${url}`}\n`;
                    break;
                    
                case 'youtube':
                    vCard += `URL;TYPE=YouTube:${url.startsWith('http') ? url : `https://youtube.com/${url}`}\n`;
                    break;
                    
                case 'spotify':
                    vCard += `URL;TYPE=Spotify:${url.startsWith('http') ? url : `https://open.spotify.com/${url}`}\n`;
                    break;
                    
                case 'pinterest':
                    vCard += `URL;TYPE=Pinterest:${url.startsWith('http') ? url : `https://pinterest.com/${url}`}\n`;
                    break;
                    
                case 'tiktok':
                    vCard += `URL;TYPE=TikTok:${url.startsWith('http') ? url : `https://tiktok.com/@${url.replace(/^@/, '')}`}\n`;
                    break;
                    
                case 'portfolio':
                case 'link':
                    // Normalizar URL
                    let normalizedUrl = url;
                    if (!normalizedUrl.startsWith('http')) {
                        normalizedUrl = `https://${normalizedUrl}`;
                    }
                    const label = itemTitle || 'Link';
                    vCard += `URL;TYPE=${capitalize(label)}:${normalizedUrl}\n`;
                    break;
                    
                case 'pix':
                case 'pix_qrcode':
                    if (item.pix_key) {
                        notes.push(`Chave PIX: ${item.pix_key}`);
                    }
                    // Adicionar URL se houver
                    if (url.startsWith('http')) {
                        vCard += `URL;TYPE=PIX:${url}\n`;
                    }
                    break;
                    
                default:
                    // Para qualquer outro tipo de item, adicionar como URL genérico
                    let defaultUrl = url;
                    if (!defaultUrl.startsWith('http')) {
                        defaultUrl = `https://${defaultUrl}`;
                    }
                    const defaultLabel = itemTitle || capitalize(item.item_type) || 'Link';
                    vCard += `URL;TYPE=${capitalize(defaultLabel)}:${defaultUrl}\n`;
                    break;
            }
        });
        
        if (notes.length > 0) {
            vCard += `NOTE:${notes.join('\\n')}\n`;
        }
        
        vCard += 'END:VCARD\n';

        const fileName = `${fullName.replace(/ /g, '_').toLowerCase()}.vcf`;
        res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        
        res.status(200).send(vCard);

    } catch (error) {
        logger.error("Erro ao gerar vCard completo", error, { identifier });
        res.status(500).send('Erro ao gerar cartão de contato.');
    } finally {
        client.release();
    }
}));

module.exports = router;