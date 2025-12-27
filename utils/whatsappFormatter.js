/**
 * Formata mensagem WhatsApp para checkout
 */

/**
 * Formata valor em reais
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

/**
 * Formata mensagem WhatsApp completa
 */
function formatWhatsAppMessage(cart, storeInfo, customerName = null, observation = null) {
    let message = 'Olá! Gostaria de comprar os seguintes produtos:\n\n';

    // Listar produtos
    cart.items.forEach((item, index) => {
        const total = item.price * item.quantity;
        message += `📦 ${item.name}`;
        if (item.quantity > 1) {
            message += ` (Qtd: ${item.quantity})`;
        }
        message += ` - ${formatCurrency(item.price)}`;
        if (item.quantity > 1) {
            message += ` = ${formatCurrency(total)}`;
        }
        message += '\n';
    });

    // Total
    message += `\n💰 Total: ${formatCurrency(cart.total)}\n`;

    // Nome do cliente (se fornecido)
    if (customerName && customerName.trim()) {
        message += `\n👤 Nome: ${customerName.trim()}\n`;
    }

    // Observação (se fornecida)
    if (observation && observation.trim()) {
        message += `\n📝 Observação: ${observation.trim()}\n`;
    }

    return message;
}

/**
 * Formata número WhatsApp para URL
 */
function formatWhatsAppNumber(number) {
    // Remove caracteres não numéricos exceto +
    let cleaned = number.replace(/[^\d+]/g, '');
    
    // Se não começa com +, adiciona código do Brasil
    if (!cleaned.startsWith('+')) {
        // Remove zeros à esquerda
        cleaned = cleaned.replace(/^0+/, '');
        
        // Se não começa com 55, adiciona código do Brasil
        if (!cleaned.startsWith('55')) {
            cleaned = '55' + cleaned;
        }
        
        cleaned = '+' + cleaned;
    }
    
    return cleaned;
}

/**
 * Gera URL do WhatsApp
 */
function generateWhatsAppURL(phoneNumber, message) {
    const formattedNumber = formatWhatsAppNumber(phoneNumber);
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedNumber.replace('+', '')}?text=${encodedMessage}`;
}

module.exports = {
    formatCurrency,
    formatWhatsAppMessage,
    formatWhatsAppNumber,
    generateWhatsAppURL
};

