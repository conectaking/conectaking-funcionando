// REMOVER IMEDIATAMENTE qualquer texto "image.png" que seja filho direto do body
(function() {
    function removeBodyTextNodes() {
        if (!document.body) return;
        
        // Remover todos os nós de texto filhos diretos do body que contenham "image.png"
        const bodyChildren = Array.from(document.body.childNodes);
        bodyChildren.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent || node.nodeValue || '';
                if (text.includes('image.png') || text.trim().includes('image.png')) {
                    try {
                        document.body.removeChild(node);
                    } catch(e) {
                        node.textContent = '';
                        node.nodeValue = '';
                    }
                }
            }
        });
    }
    
    // Executar imediatamente
    removeBodyTextNodes();
    
    // Executar quando body estiver disponível
    if (document.body) {
        removeBodyTextNodes();
    } else {
        document.addEventListener('DOMContentLoaded', removeBodyTextNodes);
    }
    
    // Executar múltiplas vezes
    setTimeout(removeBodyTextNodes, 0);
    setTimeout(removeBodyTextNodes, 10);
    setTimeout(removeBodyTextNodes, 50);
})();
