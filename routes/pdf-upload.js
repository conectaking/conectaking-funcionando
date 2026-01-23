
const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const { protectUser } = require('../middleware/protectUser');
require('dotenv').config();

const router = express.Router();

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const upload = multer({
  storage: multerS3({
    s3: r2,
    bucket: process.env.R2_BUCKET_NAME,
    acl: 'public-read',
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

  const publicUrlBase = process.env.R2_PUBLIC_URL;
  
  const finalPublicUrl = `${publicUrlBase}/${req.file.key}`;

  res.status(200).json({
    message: 'Upload de PDF realizado com sucesso!',
    pdf_url: finalPublicUrl 
  });


  res.status(200).json({
    message: 'Upload de PDF realizado com sucesso!',
    pdf_url: req.file.location 
  });
});

module.exports = router;