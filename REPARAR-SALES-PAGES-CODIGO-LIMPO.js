// COLE APENAS ESTE CÓDIGO NO CONSOLE:

(async function() {
    try {
        const token = localStorage.getItem('conectaKingToken') || localStorage.getItem('token');
        const API_URL = 'https://conectaking-api.onrender.com';
        
        console.log('🔧 Iniciando reparo de sales_pages...');
        
        const response = await fetch(`${API_URL}/api/profile/items/repair-sales-pages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Sucesso!', result);
            const total = result.total !== undefined ? result.total : 0;
            alert(`Reparo concluído!\n\n${result.message}\nTotal encontrado: ${total}\nCriados: ${result.created || 0}`);
        } else {
            console.error('❌ Erro:', result);
            alert('Erro ao executar reparo: ' + (result.error || result.message));
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        alert('Erro ao executar reparo: ' + error.message);
    }
})();

