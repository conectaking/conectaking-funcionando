# 🔧 CORREÇÕES NECESSÁRIAS NO SERVIDOR API

## 📋 Problema Identificado

O servidor `conectaking-api.onrender.com` está retornando erro 500 para os endpoints:
- `/api/health` (404 Not Found)
- `/api/upload/pdf` (500 Internal Server Error)

## 🛠️ Soluções para Implementar no Servidor

### 1. Endpoint `/api/health` (Health Check)

```javascript
// Adicione esta rota no servidor
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: 'API funcionando normalmente'
    });
});
```

### 2. Endpoint `/api/upload/pdf` (Upload de PDF)

```javascript
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/pdfs/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'pdf-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos PDF são permitidos'), false);
        }
    }
});

// Rota para upload de PDF
app.post('/api/upload/pdf', authenticateToken, upload.single('pdfFile'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum arquivo PDF foi enviado'
            });
        }

        // Aqui você pode salvar a URL do arquivo no banco de dados
        const pdfUrl = `${req.protocol}://${req.get('host')}/uploads/pdfs/${req.file.filename}`;
        
        res.status(200).json({
            success: true,
            message: 'PDF enviado com sucesso',
            pdf_url: pdfUrl,
            filename: req.file.filename,
            size: req.file.size
        });

    } catch (error) {
        console.error('Erro no upload de PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao processar PDF'
        });
    }
});
```

### 3. Middleware de Autenticação

```javascript
// Middleware para verificar token JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token de acesso necessário'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Token inválido ou expirado'
            });
        }
        req.user = user;
        next();
    });
}
```

### 4. Configuração CORS

```javascript
const cors = require('cors');

app.use(cors({
    origin: [
        'https://conectaking.com.br',
        'https://www.conectaking.com.br',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 5. Tratamento de Erros Global

```javascript
// Middleware de tratamento de erros
app.use((error, req, res, next) => {
    console.error('Erro no servidor:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'Arquivo muito grande. Máximo 10MB permitido.'
            });
        }
    }
    
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});
```

## 📦 Dependências Necessárias

```json
{
    "dependencies": {
        "multer": "^1.4.5-lts.1",
        "cors": "^2.8.5",
        "jsonwebtoken": "^9.0.2"
    }
}
```

## 🔍 Como Testar

1. **Teste do Health Check:**
```bash
curl https://conectaking-api.onrender.com/api/health
```

2. **Teste do Upload:**
```bash
curl -X POST https://conectaking-api.onrender.com/api/upload/pdf \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "pdfFile=@arquivo.pdf"
```

## ⚠️ Importante

- Certifique-se de que a pasta `uploads/pdfs/` existe no servidor
- Configure as variáveis de ambiente necessárias (JWT_SECRET, etc.)
- Teste todos os endpoints antes de fazer deploy
- Configure logs para monitorar erros

## 📞 Próximos Passos

1. Implemente essas correções no servidor
2. Teste os endpoints
3. Faça deploy das correções
4. Teste novamente no frontend

---
**Data**: 28/10/2025
**Versão**: v1.0
