const express = require('express');
const multer = require('multer');
const router = express.Router();
const controller = require('./documentos.controller');
const { protectUser } = require('../../middleware/protectUser');
const { asyncHandler } = require('../../middleware/errorHandler');

const uploadImage = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Apenas imagens são permitidas'), false);
    }
});

// Rotas públicas (por token): cliente pode revisar e alterar sem login
router.get('/ver/:token/pdf', asyncHandler(controller.getPdfByToken));
router.get('/ver/:token', asyncHandler(controller.getByToken));
router.put('/ver/:token', asyncHandler(controller.updateByToken));

router.use(protectUser);

router.get('/settings', asyncHandler(controller.getSettings));
router.put('/settings', asyncHandler(controller.putSettings));
router.post('/upload-logo', uploadImage.single('image'), asyncHandler(controller.uploadLogo));
router.post('/', asyncHandler(controller.create));
router.get('/', asyncHandler(controller.list));
router.post('/:id/duplicate', asyncHandler(controller.duplicate));
router.get('/:id/pdf', asyncHandler(controller.getPdf));
router.get('/:id', asyncHandler(controller.getOne));
router.put('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));
router.post('/:id/anexos', uploadImage.single('image'), asyncHandler(controller.uploadAnexo));
router.post('/:id/processar-comprovante', uploadImage.single('image'), asyncHandler(controller.processarComprovante));

module.exports = router;
