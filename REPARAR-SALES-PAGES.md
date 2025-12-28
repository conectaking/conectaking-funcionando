# Como Executar o Reparo de Sales Pages

Esta rota cria automaticamente `sales_pages` para todos os itens `sales_page` que não têm uma `sales_page` associada.

## Método 1: Via Console do Navegador (Mais Fácil)

1. Abra o **dashboard** (`dashboard.html`) e faça login
2. Abra o **Console do Navegador** (F12 → Console)
3. Cole e execute o seguinte código:

```javascript
// Executar reparo de sales_pages
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
```

## Método 2: Via Postman ou Insomnia

**URL:** `POST https://conectaking-api.onrender.com/api/profile/items/repair-sales-pages`

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
Content-Type: application/json
```

**Body:** (vazio ou `{}`)

## Método 3: Via cURL (Linha de Comando)

```bash
curl -X POST https://conectaking-api.onrender.com/api/profile/items/repair-sales-pages \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json"
```

## Resposta Esperada

**Sucesso:**
```json
{
  "success": true,
  "message": "Reparo concluído. 1 sales_page(s) criada(s)",
  "created": 1,
  "total": 1
}
```

**Se não houver itens para reparar:**
```json
{
  "success": true,
  "message": "Todos os itens sales_page já têm sales_page associada",
  "created": 0
}
```

**Se houver erros:**
```json
{
  "success": true,
  "message": "Reparo concluído. 1 sales_page(s) criada(s)",
  "created": 1,
  "total": 2,
  "errors": [
    {
      "itemId": 123,
      "error": "Mensagem de erro"
    }
  ]
}
```

## O que esta rota faz?

1. Busca todos os itens `sales_page` do usuário logado
2. Verifica quais não têm uma `sales_page` associada na tabela `sales_pages`
3. Cria automaticamente uma `sales_page` para cada item faltante com valores padrão:
   - `store_title`: Título do item ou "Minha Loja"
   - `button_text`: Título do item ou "Minha Loja"
   - `button_logo_url`: URL da imagem do item (se houver)
   - `whatsapp_number`: String vazia
   - `theme`: "dark"
   - `status`: "DRAFT"
   - `preview_token`: Gerado automaticamente

## Após o Reparo

Depois de executar o reparo, você pode:
1. Recarregar a página de edição (`salesPageEdit.html?itemId=2060`)
2. A `sales_page` deve ser encontrada e carregada corretamente
3. Você poderá editar a página normalmente

