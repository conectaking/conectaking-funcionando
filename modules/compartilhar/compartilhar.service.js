/**
 * Service: geração de vCard a partir do perfil e itens.
 */
const repository = require('./compartilhar.repository');

const capitalize = (s) => (s && s.charAt(0).toUpperCase() + s.slice(1)) || '';

function buildVcard(identifier, profile, items) {
    const fullName = profile.display_name || 'Contato Conecta King';
    let vCard = 'BEGIN:VCARD\n';
    vCard += 'VERSION:3.0\n';
    vCard += `FN:${fullName}\n`;
    vCard += `URL;TYPE=WORK:https://tag.conectaking.com.br/${identifier}\n`;

    const notes = ['Contato salvo via Conecta King.'];
    let emailAdded = false;
    let phoneAdded = false;

    if (profile.whatsapp && !phoneAdded) {
        const whatsappNumber = profile.whatsapp.replace(/\D/g, '');
        if (whatsappNumber) {
            vCard += `TEL;TYPE=CELL,VOICE:${whatsappNumber}\n`;
            vCard += `URL;TYPE=WhatsApp:https://wa.me/${whatsappNumber}\n`;
            phoneAdded = true;
        }
    }

    (items || []).forEach((item) => {
        if (!item.destination_url || !item.destination_url.trim()) return;
        const url = item.destination_url.trim();
        const itemTitle = item.title || item.item_type;

        switch (item.item_type) {
            case 'whatsapp':
                if (!phoneAdded) {
                    const phoneNumber = url.replace(/\D/g, '');
                    if (phoneNumber) {
                        vCard += `TEL;TYPE=CELL,VOICE:${phoneNumber}\n`;
                        phoneAdded = true;
                    }
                }
                vCard += url.startsWith('http')
                    ? `URL;TYPE=WhatsApp:${url}\n`
                    : `URL;TYPE=WhatsApp:https://wa.me/${url.replace(/\D/g, '')}\n`;
                break;
            case 'email': {
                let emailAddress = url.replace(/^mailto:/i, '').trim();
                if (!emailAddress.includes('@')) emailAddress = url;
                if (!emailAdded && emailAddress.includes('@')) {
                    vCard += `EMAIL;TYPE=INTERNET:${emailAddress}\n`;
                    emailAdded = true;
                } else if (emailAddress.includes('@')) {
                    vCard += `URL;TYPE=Email:mailto:${emailAddress}\n`;
                }
                break;
            }
            case 'telegram':
                if (!phoneAdded) {
                    const phoneNumber = url.replace(/\D/g, '');
                    if (phoneNumber && phoneNumber.length >= 10) {
                        vCard += `TEL;TYPE=CELL,VOICE:${phoneNumber}\n`;
                        phoneAdded = true;
                    }
                }
                vCard += url.startsWith('http')
                    ? `URL;TYPE=Telegram:${url}\n`
                    : `URL;TYPE=Telegram:https://t.me/${url.replace(/^@/, '')}\n`;
                break;
            case 'instagram':
                vCard += url.startsWith('http')
                    ? `URL;TYPE=Instagram:${url}\n`
                    : `URL;TYPE=Instagram:https://instagram.com/${url.replace(/^@/, '')}\n`;
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
            case 'link': {
                let normalizedUrl = url;
                if (!normalizedUrl.startsWith('http')) normalizedUrl = `https://${normalizedUrl}`;
                vCard += `URL;TYPE=${capitalize(itemTitle) || 'Link'}:${normalizedUrl}\n`;
                break;
            }
            case 'pix':
            case 'pix_qrcode':
                if (item.pix_key) notes.push(`Chave PIX: ${item.pix_key}`);
                if (url.startsWith('http')) vCard += `URL;TYPE=PIX:${url}\n`;
                break;
            case 'wifi': {
                let wifiSsid = '';
                try {
                    if (item.destination_url && String(item.destination_url).trim().startsWith('{')) {
                        const w = JSON.parse(item.destination_url);
                        wifiSsid = (w && w.ssid) ? String(w.ssid).trim() : '';
                    }
                } catch (e) {
                    wifiSsid = '';
                }
                if (wifiSsid) notes.push(`Wi-Fi SSID: ${wifiSsid}`);
                break;
            }
            default: {
                let defaultUrl = url;
                if (!defaultUrl.startsWith('http')) defaultUrl = `https://${defaultUrl}`;
                vCard += `URL;TYPE=${capitalize(itemTitle) || capitalize(item.item_type) || 'Link'}:${defaultUrl}\n`;
                break;
            }
        }
    });

    if (notes.length > 0) vCard += `NOTE:${notes.join('\\n')}\n`;
    vCard += 'END:VCARD\n';
    return { vCard, fullName };
}

async function getVcard(identifier) {
    const userId = await repository.getUserIdByIdentifier(identifier);
    if (!userId) return null;
    const profile = await repository.getProfile(userId);
    if (!profile) return null;
    const items = await repository.getActiveItems(userId);
    return buildVcard(identifier, profile, items);
}

module.exports = {
    getVcard,
    buildVcard,
};
