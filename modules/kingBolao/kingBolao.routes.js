/**
 * King Bolão — rotas isoladas /api/king-bolao
 */
const express = require('express');
const { protectUser } = require('../../middleware/protectUser');
const { asyncHandler } = require('../../middleware/errorHandler');
const { requireKingBolaoAccess, requireEventOrganizer } = require('./kingBolao.middleware');
const { uploadMem } = require('./kingBolao.proof');
const controller = require('./kingBolao.controller');

const router = express.Router();

router.get('/access-check', protectUser, asyncHandler(controller.accessCheck));

router.get('/public/event/:slug', asyncHandler(controller.publicGetEvent));
router.post('/public/event/:slug/register', asyncHandler(controller.publicRegister));
router.post('/public/payment-proof', uploadMem.single('proof'), asyncHandler(controller.publicUploadProof));
router.get('/public/me/:token', asyncHandler(controller.publicGetMe));
router.get('/public/cover', asyncHandler(controller.publicCover));
router.get('/public/og-image', asyncHandler(controller.publicOgImage));

router.get('/events', protectUser, requireKingBolaoAccess, asyncHandler(controller.listEvents));
router.post('/events', protectUser, requireKingBolaoAccess, asyncHandler(controller.createEvent));
router.get('/events/:id', protectUser, requireKingBolaoAccess, requireEventOrganizer, asyncHandler(controller.getEventAdmin));
router.put('/events/:id', protectUser, requireKingBolaoAccess, requireEventOrganizer, asyncHandler(controller.updateEvent));
router.post('/events/:id/groups', protectUser, requireKingBolaoAccess, requireEventOrganizer, asyncHandler(controller.addGroup));
router.post('/events/:id/cover', protectUser, requireKingBolaoAccess, requireEventOrganizer, uploadMem.single('cover'), asyncHandler(controller.uploadCover));
router.post('/events/:id/publish-result', protectUser, requireKingBolaoAccess, requireEventOrganizer, asyncHandler(controller.publishResult));
router.post('/participants/:participantId/approve', protectUser, requireKingBolaoAccess, asyncHandler(controller.approveParticipant));
router.post('/participants/:participantId/reject', protectUser, requireKingBolaoAccess, asyncHandler(controller.rejectParticipant));
router.get('/participants/:participantId/proof', (req, res, next) => {
  if (req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  protectUser(req, res, (err) => {
    if (err) return next(err);
    requireKingBolaoAccess(req, res, next);
  });
}, asyncHandler(controller.getProof));

module.exports = router;
