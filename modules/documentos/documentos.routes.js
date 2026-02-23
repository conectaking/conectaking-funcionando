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

router.use(protectUser);

router.post('/', asyncHandler(controller.create));
router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getOne));
router.put('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));
router.post('/:id/anexos', uploadImage.single('image'), asyncHandler(controller.uploadAnexo));
router.post('/:id/processar-comprovante', uploadImage.single('image'), asyncHandler(controller.processarComprovante));

module.exports = router;
