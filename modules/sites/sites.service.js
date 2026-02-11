const repository = require('./sites.repository');
const logger = require('../../utils/logger');

function parseJsonFields(item) {
    if (!item) return item;
    const jsonKeys = ['servicos', 'portfolio', 'depoimentos', 'faq', 'arquetipo_por_que_fazer', 'arquetipo_campos_form', 'arquetipo_scores'];
    for (const key of jsonKeys) {
        if (item[key] != null && typeof item[key] === 'string') {
            try {
                item[key] = JSON.parse(item[key]);
            } catch (_) {
                if (key === 'arquetipo_campos_form') item[key] = ['nome', 'email', 'whatsapp', 'instagram'];
                else if (key === 'arquetipo_por_que_fazer') item[key] = [];
                else item[key] = [];
            }
        }
    }
    return item;
}

async function getConfig(profileItemId, userId) {
    const owned = await repository.ensureOwnership(profileItemId, userId);
    if (!owned) throw new Error('Sem permissão para este site.');
    let item = await repository.findByProfileItemId(profileItemId);
    if (!item) item = await repository.create(profileItemId);
    const slugs = await repository.getSlugForProfileItem(profileItemId);
    const out = parseJsonFields({ ...item });
    if (slugs) {
        out.slug = slugs.slug;
        out.profile_slug = slugs.profile_slug;
    }
    return out;
}

async function saveConfig(profileItemId, userId, data) {
    const owned = await repository.ensureOwnership(profileItemId, userId);
    if (!owned) throw new Error('Sem permissão para este site.');
    let item = await repository.findByProfileItemId(profileItemId);
    if (!item) item = await repository.create(profileItemId);
    const updated = await repository.update(profileItemId, data);
    const result = parseJsonFields(updated || item);
    const slugs = await repository.getSlugForProfileItem(profileItemId);
    if (slugs) { result.slug = slugs.slug; result.profile_slug = slugs.profile_slug; }
    return result;
}

async function getPublicBySlug(slug) {
    const item = await repository.findBySlug(slug);
    if (!item) return null;
    if (item.site_em_manutencao) return { ...parseJsonFields(item), em_manutencao: true };
    return parseJsonFields(item);
}

async function getPublicByCustomDomain(host) {
    const item = await repository.findByCustomDomain(host);
    if (!item) return null;
    if (item.site_em_manutencao) return { ...parseJsonFields(item), em_manutencao: true };
    return parseJsonFields(item);
}

async function submitArquetipoLead(slug, data) {
    const site = await repository.findBySlug(slug);
    if (!site) throw new Error('Site não encontrado.');
    if (site.site_em_manutencao) throw new Error('Site em manutenção.');
    return repository.insertArquetipoLead(site.id, data);
}

async function submitArquetipoLeadByHost(host, data) {
    const site = await repository.findByCustomDomain(host);
    if (!site) throw new Error('Site não encontrado.');
    if (site.site_em_manutencao) throw new Error('Site em manutenção.');
    return repository.insertArquetipoLead(site.id, data);
}

async function getArquetipoLeads(profileItemId, userId) {
    const owned = await repository.ensureOwnership(profileItemId, userId);
    if (!owned) throw new Error('Sem permissão.');
    const site = await repository.findByProfileItemId(profileItemId);
    if (!site) return [];
    return repository.getArquetipoLeads(site.id);
}

module.exports = {
    getConfig,
    saveConfig,
    getPublicBySlug,
    getPublicByCustomDomain,
    submitArquetipoLead,
    submitArquetipoLeadByHost,
    getArquetipoLeads
};
