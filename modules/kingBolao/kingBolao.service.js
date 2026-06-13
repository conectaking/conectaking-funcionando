/**
 * King Bolão — regras de negócio
 */
const crypto = require('crypto');
const repo = require('./kingBolao.repository');
const { buildPixPayload } = require('./kingBolao.pix');

function slugify(raw) {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'bolao';
}

function normalizeWhatsapp(raw) {
  return String(raw || '').replace(/\D/g, '').slice(0, 15);
}

function formatCents(cents) {
  return (Math.max(0, parseInt(cents, 10) || 0) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function computeGroupPools(group, event, approvedEntrySum) {
  const ownerPct = Math.min(100, Math.max(0, parseInt(event.owner_share_pct, 10) || 30));
  const winnerPct = Math.min(100, Math.max(0, parseInt(event.winner_share_pct, 10) || 70));
  const gross = Math.max(0, parseInt(approvedEntrySum, 10) || 0) + Math.max(0, parseInt(group.rollover_cents, 10) || 0);
  const ownerCut = Math.floor((gross * ownerPct) / 100);
  const winnerPool = Math.floor((gross * winnerPct) / 100);
  return { gross, ownerCut, winnerPool, ownerPct, winnerPct };
}

async function buildPublicEventPayload(slug) {
  const event = await repo.getEventBySlug(slug);
  if (!event) return null;
  if (event.status === 'draft') return null;

  const groups = await repo.listGroups(event.id);
  const activeGroups = groups.filter((g) => g.active !== false);

  const groupPayloads = [];
  for (const g of activeGroups) {
    const approvedSum = await repo.sumApprovedEntryByGroup(g.id);
    const { winnerPool } = computeGroupPools(g, event, approvedSum);
    const approved = await repo.listApprovedByGroup(g.id);

    let winnerCount = 0;
    let prizeEach = 0;
    if (event.result_published_at != null && event.result_home != null && event.result_away != null) {
      const winners = approved.filter(
        (p) => p.status === 'winner'
          || (p.prediction_home === event.result_home && p.prediction_away === event.result_away)
      );
      winnerCount = winners.length;
      if (winnerCount > 0) prizeEach = Math.floor(winnerPool / winnerCount);
    }

    groupPayloads.push({
      id: g.id,
      name: g.name,
      entry_cents: g.entry_cents,
      entry_label: formatCents(g.entry_cents),
      winner_pool_cents: approvedSum > 0 ? winnerPool : 0,
      winner_pool_label: approvedSum > 0 ? formatCents(winnerPool) : formatCents(0),
      predictions: approved.map((p) => ({
        name: p.name,
        prediction: `${p.prediction_home}×${p.prediction_away}`,
        prediction_home: p.prediction_home,
        prediction_away: p.prediction_away,
        status: p.status
      })),
      winner_count: winnerCount,
      prize_each_cents: prizeEach,
      prize_each_label: winnerCount > 0 ? formatCents(prizeEach) : null
    });
  }

  return {
    slug: event.slug,
    title: event.title,
    status: event.status,
    team_home_name: event.team_home_name,
    team_home_logo_url: event.team_home_logo_url,
    team_away_name: event.team_away_name,
    team_away_logo_url: event.team_away_logo_url,
    kickoff_at: event.kickoff_at,
    cover_image_path: event.cover_image_path,
    result_home: event.result_home,
    result_away: event.result_away,
    result_published_at: event.result_published_at,
    live_home: event.live_home,
    live_away: event.live_away,
    groups: groupPayloads,
    pix_holder_name: event.pix_holder_name,
    pix_instructions: event.pix_instructions
  };
}

async function buildAdminEventDetail(eventId) {
  const event = await repo.getEventById(eventId);
  if (!event) return null;
  const groups = await repo.listGroups(eventId);
  const participants = await repo.listParticipantsByEvent(eventId);

  const groupsDetail = [];
  for (const g of groups) {
    const approvedSum = await repo.sumApprovedEntryByGroup(g.id);
    const approvedCount = await repo.countApprovedByGroup(g.id);
    const pools = computeGroupPools(g, event, approvedSum);
    groupsDetail.push({
      ...g,
      approved_count: approvedCount,
      ...pools,
      gross_label: formatCents(pools.gross),
      winner_pool_label: formatCents(pools.winnerPool),
      owner_cut_label: formatCents(pools.ownerCut)
    });
  }

  return { event, groups: groupsDetail, participants };
}

function newAccessToken() {
  return crypto.randomBytes(24).toString('hex');
}

function pixInfoForParticipant(event, entryCents) {
  const brcode = buildPixPayload({
    pixKey: event.pix_key,
    holderName: event.pix_holder_name,
    amountCents: entryCents,
    title: event.title
  });
  return {
    pix_key: event.pix_key,
    pix_holder_name: event.pix_holder_name,
    pix_instructions: event.pix_instructions,
    amount_cents: entryCents,
    amount_label: formatCents(entryCents),
    brcode
  };
}

async function publishResult(eventId, resultHome, resultAway) {
  const event = await repo.getEventById(eventId);
  if (!event) throw new Error('Bolão não encontrado.');

  await repo.updateEvent(eventId, {
    result_home: resultHome,
    result_away: resultAway,
    result_published_at: new Date(),
    live_home: resultHome,
    live_away: resultAway,
    status: 'finished'
  });

  const groups = await repo.listGroups(eventId);
  for (const g of groups) {
    const approved = await repo.listApprovedByGroup(g.id);
    const winners = approved.filter(
      (p) => p.prediction_home === resultHome && p.prediction_away === resultAway
    );
    for (const p of approved) {
      const isWinner = winners.some((w) => w.id === p.id);
      await repo.updateParticipant(p.id, { status: isWinner ? 'winner' : 'loser' });
    }
    if (!winners.length && event.no_winner_policy === 'rollover') {
      const approvedSum = await repo.sumApprovedEntryByGroup(g.id);
      const { winnerPool } = computeGroupPools(g, event, approvedSum);
      await repo.updateGroup(g.id, { rolloverCents: (parseInt(g.rollover_cents, 10) || 0) + winnerPool });
    }
  }

  return buildAdminEventDetail(eventId);
}

module.exports = {
  slugify,
  normalizeWhatsapp,
  formatCents,
  computeGroupPools,
  buildPublicEventPayload,
  buildAdminEventDetail,
  newAccessToken,
  pixInfoForParticipant,
  publishResult
};
