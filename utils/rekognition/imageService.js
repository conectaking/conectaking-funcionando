/**
 * Recorte de rosto a partir do BoundingBox do Rekognition (normalizado 0–1).
 * Rekognition: Left, Top, Width, Height são razões da imagem total.
 */
const sharp = require('sharp');

/**
 * Recorta a região do rosto. BoundingBox do Rekognition: { Left, Top, Width, Height } (0–1).
 * Adiciona margem opcional e garante dimensões mínimas para o Rekognition aceitar.
 * @param {Buffer} imageBuffer
 * @param {{ Left: number, Top: number, Width: number, Height: number }} boundingBox - valores normalizados
 * @param {number} margin - margem extra em razão (ex: 0.1 = 10%)
 * @returns {Promise<Buffer>} JPEG do recorte
 */
async function cropFace(imageBuffer, boundingBox, margin = 0.05) {
  const meta = await sharp(imageBuffer).metadata();
  const imgW = meta.width || 1;
  const imgH = meta.height || 1;

  let left = (boundingBox.Left || 0) * imgW;
  let top = (boundingBox.Top || 0) * imgH;
  let width = (boundingBox.Width || 0.1) * imgW;
  let height = (boundingBox.Height || 0.1) * imgH;

  const m = Math.min(margin * Math.min(imgW, imgH), width * 0.2, height * 0.2);
  left = Math.max(0, left - m);
  top = Math.max(0, top - m);
  width = Math.min(imgW - left, width + 2 * m);
  height = Math.min(imgH - top, height + 2 * m);

  const leftPx = Math.floor(left);
  const topPx = Math.floor(top);
  const wPx = Math.max(40, Math.ceil(width));
  const hPx = Math.max(40, Math.ceil(height));

  const out = await sharp(imageBuffer)
    .extract({ left: leftPx, top: topPx, width: wPx, height: hPx })
    .jpeg({ quality: 90 })
    .toBuffer();
  return out;
}

/**
 * Redimensiona imagem para tamanho máximo (para não exceder limite do Rekognition).
 * Rekognition aceita até 15MB e 4096px. Opcional antes de subir para staging.
 * @param {Buffer} imageBuffer
 * @param {number} [maxDimension=2048]
 * @param {{ fast?: boolean, quality?: number }} [opts] — fast: JPEG mais leve + fastShrinkOnLoad (CompareFaces em massa).
 */
async function normalizeImageForRekognition(imageBuffer, maxDimension = 2048, opts = {}) {
  const fast = !!opts.fast;
  const quality = opts.quality != null ? opts.quality : fast ? 76 : 88;
  const meta = await sharp(imageBuffer, { failOn: 'none' }).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (w <= maxDimension && h <= maxDimension && !fast) return imageBuffer;
  if (w <= maxDimension && h <= maxDimension && fast) {
    return sharp(imageBuffer, { failOn: 'none' })
      .rotate()
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  }
  return sharp(imageBuffer, { failOn: 'none' })
    .rotate()
    .resize(maxDimension, maxDimension, {
      fit: 'inside',
      withoutEnlargement: true,
      fastShrinkOnLoad: fast
    })
    .jpeg({ quality, mozjpeg: fast })
    .toBuffer();
}

module.exports = {
  cropFace,
  normalizeImageForRekognition
};
