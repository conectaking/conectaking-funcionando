# Backend: Suporte para Múltiplos Links Personalizados

## 📋 Resumo

O frontend está pronto para criar múltiplos links personalizados, mas é necessário criar as rotas e tabelas no backend para suportar essa funcionalidade.

## 🗄️ Nova Tabela Necessária

Criar uma nova tabela `cadastro_links` para armazenar múltiplos links personalizados:

```sql
CREATE TABLE IF NOT EXISTS cadastro_links (
    id SERIAL PRIMARY KEY,
    guest_list_item_id INTEGER NOT NULL REFERENCES guest_list_items(id) ON DELETE CASCADE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    expires_at TIMESTAMP NULL,
    max_uses INTEGER DEFAULT 999999,
    current_uses INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER REFERENCES users(id),
    FOREIGN KEY (guest_list_item_id) REFERENCES guest_list_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cadastro_links_guest_list_item_id ON cadastro_links(guest_list_item_id);
CREATE INDEX IF NOT EXISTS idx_cadastro_links_slug ON cadastro_links(slug);
CREATE INDEX IF NOT EXISTS idx_cadastro_links_expires_at ON cadastro_links(expires_at);
```

## 🔌 Rotas API Necessárias

### 1. GET `/api/guest-lists/:id/cadastro-links`
Listar todos os links personalizados de um item.

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "slug": "evento-2026-1",
      "description": "Link para evento (1)",
      "expires_at": "2026-12-31T23:59:59Z",
      "max_uses": 100,
      "current_uses": 5,
      "isExpired": false,
      "isUsed": false
    }
  ]
}
```

### 2. POST `/api/guest-lists/:id/cadastro-links`
Criar um novo link personalizado.

**Body:**
```json
{
  "slug": "evento-2026-1",
  "description": "Link para evento (1)",
  "expiresInHours": 24,
  "expiresInMinutes": null,
  "maxUses": 100
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "evento-2026-1",
    "description": "Link para evento (1)",
    "expires_at": "2026-01-17T12:00:00Z",
    "max_uses": 100,
    "current_uses": 0
  }
}
```

### 3. DELETE `/api/guest-lists/cadastro-links/:linkId`
Deletar um link personalizado.

**Resposta:**
```json
{
  "success": true,
  "message": "Link deletado com sucesso"
}
```

## 🔄 Atualização em `publicDigitalForm.routes.js`

Atualizar a rota `/:slug/form/share/:token` para também buscar por `cadastro_links.slug`:

```javascript
// Após buscar por cadastro_slug, também buscar em cadastro_links
const cadastroLinkRes = await client.query(`
    SELECT 
        pi.*, 
        u.profile_slug,
        cl.id as cadastro_link_id,
        cl.expires_at as link_expires_at,
        cl.max_uses as link_max_uses,
        cl.current_uses as link_current_uses
    FROM profile_items pi
    INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
    INNER JOIN users u ON pi.user_id = u.id
    LEFT JOIN cadastro_links cl ON cl.guest_list_item_id = gli.id AND cl.slug = $1
    WHERE (cl.slug = $1 OR gli.cadastro_slug = $1)
    AND u.profile_slug = $2
    AND (pi.item_type = 'digital_form' OR pi.item_type = 'guest_list') 
    AND pi.is_active = true
`, [token, slug]);
```

E validar/atualizar o contador de usos se for um link de `cadastro_links`:

```javascript
// Se for um link de cadastro_links, validar e incrementar
if (cadastroLinkRes.rows[0]?.cadastro_link_id) {
    const link = cadastroLinkRes.rows[0];
    
    // Validar expiração
    if (link.link_expires_at && new Date(link.link_expires_at) < new Date()) {
        return res.status(410).render('error', {
            message: 'Este link expirou',
            title: 'Link Expirado'
        });
    }
    
    // Validar limite de usos
    if (link.link_max_uses !== 999999 && link.link_current_uses >= link.link_max_uses) {
        return res.status(410).render('error', {
            message: 'Este link atingiu o limite de usos',
            title: 'Link Esgotado'
        });
    }
    
    // Incrementar contador após submissão bem-sucedida
    // (fazer isso no POST do formulário)
}
```

## 📝 Arquivo de Rota Sugerido

Criar `routes/cadastroLinks.routes.js`:

```javascript
const express = require('express');
const router = express.Router();
const db = require('../db');
const { protectUser } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const logger = require('../utils/logger');

// GET /api/guest-lists/:id/cadastro-links
router.get('/:id/cadastro-links', protectUser, asyncHandler(async (req, res) => {
    // Implementar listagem
}));

// POST /api/guest-lists/:id/cadastro-links
router.post('/:id/cadastro-links', protectUser, asyncHandler(async (req, res) => {
    // Implementar criação
}));

// DELETE /api/guest-lists/cadastro-links/:linkId
router.delete('/cadastro-links/:linkId', protectUser, asyncHandler(async (req, res) => {
    // Implementar deleção
}));

module.exports = router;
```

## ✅ Checklist de Implementação

- [ ] Criar migration para tabela `cadastro_links`
- [ ] Criar arquivo `routes/cadastroLinks.routes.js`
- [ ] Implementar GET `/api/guest-lists/:id/cadastro-links`
- [ ] Implementar POST `/api/guest-lists/:id/cadastro-links`
- [ ] Implementar DELETE `/api/guest-lists/cadastro-links/:linkId`
- [ ] Atualizar `server.js` para incluir as novas rotas
- [ ] Atualizar `publicDigitalForm.routes.js` para buscar em `cadastro_links`
- [ ] Atualizar validação e incremento de contador em `publicDigitalForm.routes.js`
- [ ] Testar criação de múltiplos links
- [ ] Testar validação de expiração
- [ ] Testar validação de limite de usos
- [ ] Testar incremento de contador

## 🚀 Status Atual

- ✅ Frontend completo e funcional
- ⏳ Backend precisa ser implementado

O frontend já está preparado e funcionará assim que as rotas do backend forem criadas.
