const path = require('path');
const express = require('express');
const multer = require('multer');
const router = express.Router();
const controller = require('./falaDeusComigo.controller');
const { protectUser } = require('../../middleware/protectUser');
const { asyncHandler } = require('../../middleware/errorHandler');

const ALLOWED_MIMES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const ALLOWED_EXT = ['.pdf', '.doc', '.docx'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const uploadAttachment = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        const mime = (file.mimetype || '').toLowerCase();
        const ext = path.extname((file.originalname || '').toLowerCase());
        const ok = ALLOWED_MIMES.some(m => mime === m) || ALLOWED_EXT.some(e => ext === e);
        if (ok) return cb(null, true);
        cb(new Error('Apenas PDF ou Word (.doc, .docx) são permitidos.'), false);
    }
});

// Rotas protegidas (dashboard): config, upload de anexo e CRUD de mensagens
router.get('/config/:itemId', protectUser, asyncHandler(controller.getConfig));
router.get('/:itemId/mensagens', protectUser, asyncHandler(controller.listMensagens));
function handleUpload(req, res, next) {
    uploadAttachment.single('file')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ success: false, message: 'Arquivo muito grande. Máximo 15 MB.' });
            }
            return res.status(400).json({ success: false, message: err.message || 'Erro no upload.' });
        }
        next();
    });
}
router.post('/:itemId/upload', protectUser, handleUpload, asyncHandler(controller.uploadAttachment));
router.post('/:itemId/upload-extract', protectUser, handleUpload, asyncHandler(controller.uploadAndExtractText));
router.post('/:itemId/mensagens', protectUser, asyncHandler(controller.createMensagem));
router.put('/:itemId/mensagens/:mensagemId', protectUser, asyncHandler(controller.updateMensagem));
router.delete('/:itemId/mensagens/:mensagemId', protectUser, asyncHandler(controller.deleteMensagem));

module.exports = router;
