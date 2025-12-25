# Documentação da API - Conecta King

## Base URL
```
https://conectaking-api.onrender.com
```

## Autenticação

A maioria dos endpoints requer autenticação via JWT token no header:
```
Authorization: Bearer <token>
```

---

## Endpoints

### Health Check

#### GET /api/health
Verifica o status do servidor e serviços.

**Resposta:**
```json
{
  "status": "OK",
  "timestamp": "2025-01-28T12:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "services": {
    "database": {
      "status": "OK",
      "responseTime": "15ms"
    }
  }
}
```

---

### Autenticação

#### POST /api/auth/register
Registra um novo usuário.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "senha123",
  "registrationCode": "ABC123"
}
```

#### POST /api/auth/login
Realiza login.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "senha123"
}
```

**Resposta:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "accountType": "individual"
  }
}
```

---

### Perfil

#### GET /api/profile
Obtém dados completos do perfil do usuário autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "details": {
    "id": "user_id",
    "display_name": "Nome do Usuário",
    "bio": "Biografia",
    "profile_image_url": "https://...",
    "profile_slug": "slug-do-perfil"
  },
  "items": [...]
}
```

#### PUT /api/profile/details
Atualiza detalhes do perfil.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "displayName": "Novo Nome",
  "bio": "Nova biografia",
  "profileImageUrl": "https://..."
}
```

#### POST /api/profile/save-all
Salva todas as alterações do perfil (detalhes + itens).

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "details": {...},
  "items": [...]
}
```

---

### Conta

#### GET /api/account/status
Obtém status da conta do usuário autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "accountType": "individual",
  "subscriptionStatus": "active",
  "subscriptionExpiresAt": "2025-02-28T00:00:00.000Z"
}
```

#### PUT /api/account/password
Altera a senha do usuário.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "currentPassword": "senha_atual",
  "newPassword": "nova_senha"
}
```

---

### Upload

#### POST /api/upload/auth
Obtém URL autorizada para upload no Cloudflare Images.

**Headers:**
```
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "uploadURL": "https://...",
  "imageId": "image_id"
}
```

#### POST /api/upload/pdf
Faz upload de um arquivo PDF.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body:**
```
pdfFile: <arquivo PDF>
```

---

### Analytics

#### GET /api/analytics/stats
Obtém estatísticas de analytics do perfil.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `days` (opcional): Número de dias (padrão: 30)

---

### Perfil Público

#### GET /:identifier
Renderiza o perfil público de um usuário.

**Parâmetros:**
- `identifier`: slug do perfil ou ID do usuário

---

## Códigos de Status HTTP

- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Requisição inválida
- `401` - Não autorizado
- `403` - Proibido
- `404` - Não encontrado
- `429` - Muitas requisições (rate limit)
- `500` - Erro interno do servidor
- `503` - Serviço indisponível

---

## Rate Limiting

- **Autenticação**: 20 requisições por 15 minutos
- **Upload**: 50 requisições por hora
- **API Geral**: 100 requisições por 15 minutos

---

## Tratamento de Erros

Todos os erros retornam no formato:
```json
{
  "success": false,
  "message": "Mensagem de erro",
  "code": "ERROR_CODE" // Opcional
}
```

