/**
 * King Bolão — controller
 */
const fs = require('fs');
const path = require('path');
const repo = require('./kingBolao.repository');
const service = require('./kingBolao.service');
const { userHasKingBolaoModule } = require('./kingBolao.middleware');
const { storeProofImage, storeCoverImage } = require('./kingBolao.proof');
const { renderKingBolaoOgImage } = require('./kingBolaoOg');

async function accessCheck(req, res) {
  const ok = await userHasKingBolaoModule(req.user?.userId);
  res.json({ success: true, allowed: ok });
}

async function listEvents(req, res) {
  const uid = parseInt(req.user.userId, 10);
  const events = await repo.listEventsByOrganizer(uid);
  res.json({ success: true, events });
}

async function createEvent(req, res) {
  const body = req.body || {};
  const title = String(body.title || '').trim();
  if (!title) return res.status(400).json({ success: false, message: 'Informe o nome do bolão.' });
  let slug = String(body.slug || '').trim() || service.slugify(title);
  slug = service.slugify(slug);
  const existing = await repo.getEventBySlug(slug);
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const event = await repo.insertEvent({
    organizerUserId: req.user.userId,
    slug,
    title,
    teamHomeName: body.team_home_name,
    teamAwayName: body.team_away_name,
    teamHomeLogoUrl: body.team_home_logo_url,
    teamAwayLogoUrl: body.team_away_logo_url,
    kickoffAt: body.kickoff_at || null,
    status: body.status || 'open',
    pixKey: body.pix_key,
    pixHolderName: body.pix_holder_name,
    pixInstructions: body.pix_instructions
  });

  const groups = Array.isArray(body.groups) ? body.groups : [];
  if (!groups.length) {
    await repo.insertGroup({ eventId: event.id, name: 'Grupo R$ 10', entryCents: 1000, sortOrder: 0 });
  } else {
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const cents = Math.max(100, parseInt(g.entry_cents, 10) || 1000);
      await repo.insertGroup({
        eventId: event.id,
        name: String(g.name || `Grupo ${service.formatCents(cents)}`).trim(),
        entryCents: cents,
        sortOrder: i
      });
    }
  }

  const detail = await service.buildAdminEventDetail(event.id);
  res.status(201).json({ success: true, ...detail });
}

async function getEventAdmin(req, res) {
  const detail = await service.buildAdminEventDetail(parseInt(req.params.id, 10));
  if (!detail) return res.status(404).json({ success: false, message: 'Bolão não encontrado.' });
  res.json({ success: true, ...detail });
}

async function updateEvent(req, res) {
  const id = parseInt(req.params.id, 10);
  const body = req.body || {};
  const fields = {};
  const map = {
    title: 'title', slug: 'slug', team_home_name: 'team_home_name', team_away_name: 'team_away_name',
    team_home_logo_url: 'team_home_logo_url', team_away_logo_url: 'team_away_logo_url',
    kickoff_at: 'kickoff_at', status: 'status', pix_key: 'pix_key', pix_holder_name: 'pix_holder_name',
    pix_instructions: 'pix_instructions', live_home: 'live_home', live_away: 'live_away'
  };
  for (const [k, col] of Object.entries(map)) {
    if (body[k] !== undefined) fields[col] = body[k];
  }
  const event = await repo.updateEvent(id, fields);
  if (!event) return res.status(404).json({ success: false, message: 'Bolão não encontrado.' });
  const detail = await service.buildAdminEventDetail(id);
  res.json({ success: true, ...detail });
}

async function addGroup(req, res) {
  const eventId = parseInt(req.params.id, 10);
  const body = req.body || {};
  const cents = Math.max(100, parseInt(body.entry_cents, 10) || 1000);
  const group = await repo.insertGroup({
    eventId,
    name: String(body.name || `Grupo ${service.formatCents(cents)}`).trim(),
    entryCents: cents,
    sortOrder: parseInt(body.sort_order, 10) || 0
  });
  res.status(201).json({ success: true, group });
}

async function approveParticipant(req, res) {
  const id = parseInt(req.params.participantId, 10);
  const p = await repo.updateParticipant(id, {
    status: 'approved',
    approvedAt: new Date()
  });
  if (!p) return res.status(404).json({ success: false, message: 'Participante não encontrado.' });
  res.json({ success: true, participant: p, message: 'Participante aprovado.' });
}

async function rejectParticipant(req, res) {
  const id = parseInt(req.params.participantId, 10);
  const p = await repo.updateParticipant(id, { status: 'rejected' });
  if (!p) return res.status(404).json({ success: false, message: 'Participante não encontrado.' });
  res.json({ success: true, participant: p, message: 'Comprovante recusado.' });
}

async function publishResult(req, res) {
  const eventId = parseInt(req.params.id, 10);
  const rh = parseInt(req.body?.result_home, 10);
  const ra = parseInt(req.body?.result_away, 10);
  if (!Number.isFinite(rh) || !Number.isFinite(ra) || rh < 0 || ra < 0) {
    return res.status(400).json({ success: false, message: 'Placar inválido.' });
  }
  const detail = await service.publishResult(eventId, rh, ra);
  res.json({ success: true, ...detail, message: 'Resultado publicado.' });
}

async function getProof(req, res) {
  const participantId = parseInt(req.params.participantId, 10);
  const { rows } = await require('../../db').query(
    'SELECT proof_file_path FROM king_bolao_participants WHERE id = $1 LIMIT 1',
    [participantId]
  );
  const fp = rows[0]?.proof_file_path;
  if (!fp || !fs.existsSync(fp)) {
    return res.status(404).json({ success: false, message: 'Comprovante não encontrado.' });
  }
  res.type('image/jpeg').sendFile(path.resolve(fp));
}

async function uploadCover(req, res) {
  const eventId = parseInt(req.params.id, 10);
  if (!req.file) return res.status(400).json({ success: false, message: 'Envie a imagem de capa.' });
  const coverPath = await storeCoverImage(req.file, eventId);
  await repo.updateEvent(eventId, { cover_image_path: coverPath });
  res.json({ success: true, cover_image_path: coverPath });
}

async function publicGetEvent(req, res) {
  const payload = await service.buildPublicEventPayload(req.params.slug);
  if (!payload) return res.status(404).json({ success: false, message: 'Bolão não encontrado.' });
  res.setHeader('Cache-Control', 'public, max-age=10');
  res.json({ success: true, event: payload });
}

async function publicRegister(req, res) {
  const slug = String(req.params.slug || '').trim();
  const event = await repo.getEventBySlug(slug);
  if (!event || event.status === 'draft' || event.status === 'cancelled') {
    return res.status(404).json({ success: false, message: 'Bolão indisponível.' });
  }
  if (event.status === 'closed' || event.status === 'finished') {
    return res.status(400).json({ success: false, message: 'Palpites encerrados.' });
  }

  const body = req.body || {};
  const name = String(body.name || '').trim().slice(0, 255);
  const whatsapp = service.normalizeWhatsapp(body.whatsapp);
  const groupId = parseInt(body.group_id, 10);
  const ph = parseInt(body.prediction_home, 10);
  const pa = parseInt(body.prediction_away, 10);

  if (!name) return res.status(400).json({ success: false, message: 'Informe seu nome.' });
  if (whatsapp.length < 10) return res.status(400).json({ success: false, message: 'WhatsApp inválido.' });
  if (!groupId) return res.status(400).json({ success: false, message: 'Escolha um grupo.' });
  if (!Number.isFinite(ph) || !Number.isFinite(pa) || ph < 0 || pa < 0 || ph > 20 || pa > 20) {
    return res.status(400).json({ success: false, message: 'Placar inválido.' });
  }

  const groups = await repo.listGroups(event.id);
  const group = groups.find((g) => g.id === groupId && g.active !== false);
  if (!group) return res.status(400).json({ success: false, message: 'Grupo inválido.' });
  if (!event.pix_key) {
    return res.status(400).json({ success: false, message: 'Pix do organizador não configurado.' });
  }

  const token = service.newAccessToken();
  let participant;
  try {
    participant = await repo.insertParticipant({
      eventId: event.id,
      groupId,
      name,
      whatsapp,
      predictionHome: ph,
      predictionAway: pa,
      accessToken: token,
      status: 'pending_payment'
    });
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ success: false, message: 'Este WhatsApp já tem palpite neste grupo.' });
    }
    throw e;
  }

  const origin = `${req.protocol}://${req.get('host')}`;
  const meUrl = `${origin}/bolao/${encodeURIComponent(event.slug)}/m/${token}`;
  const pix = service.pixInfoForParticipant(event, group.entry_cents);

  res.status(201).json({
    success: true,
    participant: {
      id: participant.id,
      access_token: token,
      me_url: meUrl,
      status: participant.status,
      prediction: `${ph}×${pa}`,
      group_name: group.name
    },
    pix
  });
}

async function publicUploadProof(req, res) {
  const token = String(req.body?.access_token || req.query?.access_token || '').trim();
  if (!token) return res.status(400).json({ success: false, message: 'Token inválido.' });
  if (!req.file) return res.status(400).json({ success: false, message: 'Envie o comprovante.' });

  const row = await repo.getParticipantByToken(token);
  if (!row) return res.status(404).json({ success: false, message: 'Participante não encontrado.' });
  if (['winner', 'loser'].includes(row.status)) {
    return res.status(400).json({ success: false, message: 'Bolão já encerrado para este palpite.' });
  }

  const { filePath, hash } = await storeProofImage(req.file, row.event_id, row.id);
  const dup = await repo.findDuplicateProofHash(hash, row.id);
  if (dup) {
    return res.status(400).json({ success: false, message: 'Este comprovante já foi usado.' });
  }

  const participant = await repo.updateParticipant(row.id, {
    status: 'pending_approval',
    proofFilePath: filePath,
    proofHash: hash
  });

  res.json({
    success: true,
    message: 'Comprovante enviado. Aguarde aprovação do organizador.',
    participant: { id: participant.id, status: participant.status }
  });
}

async function publicGetMe(req, res) {
  const row = await repo.getParticipantByToken(req.params.token);
  if (!row) return res.status(404).json({ success: false, message: 'Link inválido.' });

  const groupRow = { entry_cents: row.entry_cents, rollover_cents: 0, id: row.group_id };
  const groups = await repo.listGroups(row.event_id);
  const gFull = groups.find((g) => g.id === row.group_id) || groupRow;
  const eventFull = await repo.getEventById(row.event_id);
  const approvedSum = await repo.sumApprovedEntryByGroup(row.group_id);
  const { winnerPool } = service.computeGroupPools(gFull, eventFull, approvedSum);

  let prizeEach = 0;
  let isWinner = row.status === 'winner';
  let isLoser = row.status === 'loser';
  if (row.result_published_at != null && row.result_home != null) {
    isWinner = row.prediction_home === row.result_home && row.prediction_away === row.result_away;
    isLoser = !isWinner && ['approved', 'winner', 'loser'].includes(row.status);
    if (isWinner) {
      const approved = await repo.listApprovedByGroup(row.group_id);
      const winCount = approved.filter(
        (p) => p.prediction_home === row.result_home && p.prediction_away === row.result_away
      ).length;
      if (winCount > 0) prizeEach = Math.floor(winnerPool / winCount);
    }
  }

  const origin = `${req.protocol}://${req.get('host')}`;
  res.json({
    success: true,
    me: {
      name: row.name,
      status: row.status,
      status_label: statusLabel(row.status, isWinner, isLoser),
      group_name: row.group_name,
      entry_label: service.formatCents(row.entry_cents),
      prediction: `${row.prediction_home}×${row.prediction_away}`,
      winner_pool_label: approvedSum > 0 ? service.formatCents(winnerPool) : service.formatCents(0),
      prize_each_label: isWinner && prizeEach > 0 ? service.formatCents(prizeEach) : null,
      is_winner: isWinner,
      is_loser: isLoser,
      event_title: row.event_title,
      event_slug: row.event_slug,
      result: row.result_published_at != null ? `${row.result_home}×${row.result_away}` : null,
      live: row.live_home != null ? `${row.live_home}×${row.live_away}` : null,
      event_url: `${origin}/bolao/${encodeURIComponent(row.event_slug)}`,
      can_upload_proof: ['pending_payment', 'rejected'].includes(row.status),
      pix: ['pending_payment', 'rejected'].includes(row.status)
        ? service.pixInfoForParticipant(row, row.entry_cents)
        : null
    }
  });
}

function statusLabel(status, isWinner, isLoser) {
  if (isWinner) return 'Você ganhou!';
  if (isLoser) return 'Não acertou o placar';
  const map = {
    pending_payment: 'Aguardando pagamento',
    pending_approval: 'Comprovante enviado — aguardando aprovação',
    approved: 'Aprovado — palpite confirmado',
    rejected: 'Comprovante recusado — reenvie',
    winner: 'Você ganhou!',
    loser: 'Não acertou'
  };
  return map[status] || status;
}

async function publicCover(req, res) {
  const slug = String(req.query.slug || '').trim();
  const event = await repo.getEventBySlug(slug);
  const fp = event?.cover_image_path;
  if (!fp || !fs.existsSync(fp)) return res.status(404).end();
  res.type('image/jpeg').sendFile(path.resolve(fp));
}

async function publicOgImage(req, res) {
  const slug = String(req.query.slug || '').trim();
  const buf = await renderKingBolaoOgImage(slug);
  if (!buf) return res.status(404).end();
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(buf);
}

module.exports = {
  accessCheck,
  listEvents,
  createEvent,
  getEventAdmin,
  updateEvent,
  addGroup,
  approveParticipant,
  rejectParticipant,
  publishResult,
  getProof,
  uploadCover,
  publicGetEvent,
  publicRegister,
  publicUploadProof,
  publicGetMe,
  publicCover,
  publicOgImage
};
