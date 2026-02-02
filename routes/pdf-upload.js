
const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const { protectUser } = require('../middleware/protectUser');
require('dotenv').config();

const router = express.Router();

// PDFs usam bucket/URL próprios (para não conflitar com KingSelection).
// Aceita variáveis novas (PDF_*) e também as antigas (R2_BUCKET_NAME/R2_PUBLIC_URL).
const pdfAccountId = (process.env.PDF_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '').toString().trim();
const pdfAccessKeyId = (process.env.PDF_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || '').toString().trim();
const pdfSecretAccessKey = (process.env.PDF_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || '').toString().trim();
const pdfBucket =
  (process.env.PDF_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || '').toString().trim();
const pdfPublicUrlBase =
  (process.env.PDF_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || '').toString().trim().replace(/\/$/, '');

const r2 = new S3Client({
  region: 'auto',
  endpoint: pdfAccountId ? `https://${pdfAccountId}.r2.cloudflarestorage.com` : undefined,
  credentials: {
    accessKeyId: pdfAccessKeyId,
    secretAccessKey: pdfSecretAccessKey,
  },
  forcePathStyle: true
});

const upload = multer({
  storage: multerS3({
    s3: r2,
    bucket: pdfBucket,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, `pdf-${req.user.userId}-${Date.now()}.pdf`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Formato de arquivo inválido. Apenas PDFs são permitidos.'), false);
    }
  }
});

router.post('/', protectUser, upload.single('pdfFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
  }
  const finalPublicUrl = pdfPublicUrlBase ? `${pdfPublicUrlBase}/${req.file.key}` : (req.file.location || null);
  res.status(200).json({
    message: 'Upload de PDF realizado com sucesso!',
    pdf_url: finalPublicUrl
  });
});

module.exports = router;