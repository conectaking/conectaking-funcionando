/**
 * King Bolão — upload comprovante (pasta isolada)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const multer = require('multer');

const PROOF_DIR = path.resolve(process.cwd(), 'uploads', 'king-bolao-proofs');
const COVER_DIR = path.resolve(process.cwd(), 'uploads', 'king-bolao-covers');

const uploadMem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mt = String(file?.mimetype || '').toLowerCase();
    if (mt.startsWith('image/')) return cb(null, true);
    return cb(new Error('Apenas imagens são permitidas.'), false);
  }
});

async function storeProofImage(file, eventId, participantId) {
  if (!file?.buffer) throw new Error('Arquivo de comprovante não enviado.');
  await fs.promises.mkdir(PROOF_DIR, { recursive: true });
  const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
  const outName = `e${parseInt(eventId, 10) || 0}_p${parseInt(participantId, 10) || 0}_${Date.now()}.jpg`;
  const outPath = path.join(PROOF_DIR, outName);
  const outBuf = await sharp(file.buffer).rotate().jpeg({ quality: 88, progressive: true }).toBuffer();
  await fs.promises.writeFile(outPath, outBuf);
  return { filePath: outPath, hash };
}

async function storeCoverImage(file, eventId) {
  if (!file?.buffer) throw new Error('Arquivo de capa não enviado.');
  await fs.promises.mkdir(COVER_DIR, { recursive: true });
  const outName = `event_${parseInt(eventId, 10) || 0}_${Date.now()}.jpg`;
  const outPath = path.join(COVER_DIR, outName);
  const outBuf = await sharp(file.buffer).rotate().jpeg({ quality: 90, progressive: true }).toBuffer();
  await fs.promises.writeFile(outPath, outBuf);
  return outPath;
}

module.exports = {
  uploadMem,
  PROOF_DIR,
  COVER_DIR,
  storeProofImage,
  storeCoverImage
};
