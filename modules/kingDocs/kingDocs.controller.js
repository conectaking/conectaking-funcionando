/**
 * King Docs — controller HTTP
 */
const service = require('./kingDocs.service');
const responseFormatter = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

async function getVault(req, res) {
  try {
    const data = await service.getVault(req.user.userId);
    return responseFormatter.success(res, data);
  } catch (e) {
    logger.error('kingDocs getVault', e);
    return responseFormatter.error(res, e.message || 'Erro', 500);
  }
}

async function putVault(req, res) {
  try {
    const fieldData = req.body && req.body.fieldData != null ? req.body.fieldData : {};
    const data = await service.saveVault(req.user.userId, fieldData);
    return responseFormatter.success(res, data, 'Guardado.');
  } catch (e) {
    logger.error('kingDocs putVault', e);
    return responseFormatter.error(res, e.message || 'Erro', 500);
  }
}

async function listFiles(req, res) {
  try {
    const files = await service.listFiles(req.user.userId);
    return responseFormatter.success(res, { files });
  } catch (e) {
    logger.error('kingDocs listFiles', e);
    return responseFormatter.error(res, e.message || 'Erro', 500);
  }
}

async function uploadFile(req, res) {
  try {
    if (!req.file || !req.file.buffer) {
      return responseFormatter.error(res, 'Ficheiro em falta.', 400);
    }
    const docType = (req.body && req.body.docType) || 'documento';
    const out = await service.saveUploadedFile(
      req.user.userId,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      docType
    );
    return responseFormatter.success(res, out, 'Upload OK.', 201);
  } catch (e) {
    logger.error('kingDocs uploadFile', e);
    if (String(e.message || '').includes('R2')) {
      return responseFormatter.error(res, e.message || 'Armazenamento indisponível.', 503);
    }
    return responseFormatter.error(res, e.message || 'Erro', 500);
  }
}

async function deleteFile(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return responseFormatter.error(res, 'ID inválido.', 400);
    await service.removeFile(req.user.userId, id);
    return responseFormatter.success(res, { ok: true });
  } catch (e) {
    logger.error('kingDocs deleteFile', e);
    return responseFormatter.error(res, e.message || 'Erro', 500);
  }
}

async function downloadFile(req, res) {
  try {
    const { buffer, mime, filename } = await service.downloadFileForOwner(req.user.userId, req.params.id);
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', 'inline; filename="' + encodeURIComponent(filename) + '"');
    return res.send(buffer);
  } catch (e) {
    logger.error('kingDocs downloadFile', e);
    const code = e.statusCode || 500;
    return responseFormatter.error(res, e.message || 'Erro', code);
  }
}

async function createShare(req, res) {
  try {
    const out = await service.createShare(req.user.userId, req.body || {});
    return responseFormatter.success(res, out, 'Link criado.', 201);
  } catch (e) {
    logger.error('kingDocs createShare', e);
    return responseFormatter.error(res, e.message || 'Erro', e.statusCode || 500);
  }
}

async function listShares(req, res) {
  try {
    const shares = await service.listShares(req.user.userId);
    return responseFormatter.success(res, { shares });
  } catch (e) {
    logger.error('kingDocs listShares', e);
    return responseFormatter.error(res, e.message || 'Erro', 500);
  }
}

async function revokeShare(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return responseFormatter.error(res, 'ID inválido.', 400);
    const r = await service.revokeShare(req.user.userId, id);
    if (!r) return responseFormatter.error(res, 'Partilha não encontrada.', 404);
    return responseFormatter.success(res, { ok: true });
  } catch (e) {
    logger.error('kingDocs revokeShare', e);
    return responseFormatter.error(res, e.message || 'Erro', 500);
  }
}

async function publicMeta(req, res) {
  try {
    const meta = await service.publicMeta(req.params.token);
    return res.json(meta);
  } catch (e) {
    const code = e.statusCode || 500;
    return res.status(code).json({ ok: false, message: e.message });
  }
}

async function publicUnlock(req, res) {
  try {
    const password = (req.body && req.body.password) || '';
    const out = await service.publicUnlock(req.params.token, password);
    return responseFormatter.success(res, out);
  } catch (e) {
    const code = e.statusCode || 500;
    return responseFormatter.error(res, e.message || 'Erro', code);
  }
}

async function publicData(req, res) {
  try {
    const viewer = req.headers['x-king-docs-viewer'];
    const out = await service.publicData(req.params.token, viewer);
    return responseFormatter.success(res, out);
  } catch (e) {
    const code = e.statusCode || 500;
    if (e.code === 'NEEDS_PASSWORD') {
      return res.status(401).json({ success: false, code: 'NEEDS_PASSWORD', message: e.message });
    }
    return responseFormatter.error(res, e.message || 'Erro', code);
  }
}

async function publicDownloadFile(req, res) {
  try {
    const viewer = req.headers['x-king-docs-viewer'];
    const { buffer, mime, filename } = await service.publicDownloadFile(
      req.params.token,
      req.params.fileId,
      viewer
    );
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    return res.send(buffer);
  } catch (e) {
    const code = e.statusCode || 500;
    if (e.code === 'NEEDS_PASSWORD') {
      return res.status(401).json({ success: false, code: 'NEEDS_PASSWORD', message: e.message });
    }
    return res.status(code).json({ success: false, message: e.message || 'Erro' });
  }
}

async function importProfile(req, res) {
  try {
    const data = await service.importFromProfile(req.user.userId);
    return responseFormatter.success(res, data, 'Dados do perfil importados para o cofre.');
  } catch (e) {
    logger.error('kingDocs importProfile', e);
    return responseFormatter.error(res, e.message || 'Erro', e.statusCode || 500);
  }
}

async function exportPdf(req, res) {
  try {
    const buf = await service.exportVaultPdf(req.user.userId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="king-docs-cofre.pdf"');
    return res.send(buf);
  } catch (e) {
    logger.error('kingDocs exportPdf', e);
    return responseFormatter.error(res, e.message || 'Erro', 500);
  }
}

module.exports = {
  getVault,
  putVault,
  listFiles,
  uploadFile,
  deleteFile,
  downloadFile,
  createShare,
  listShares,
  revokeShare,
  publicMeta,
  publicUnlock,
  publicData,
  publicDownloadFile,
  importProfile,
  exportPdf
};
