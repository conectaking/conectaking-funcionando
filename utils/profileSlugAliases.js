/**
 * Typos conhecidos de profile_slug → slug canónico no banco.
 */
const PROFILE_SLUG_ALIASES = Object.freeze({
  adrianokigg: 'adrianokingg'
});

function canonicalizeProfileSlug(slug) {
  const s = String(slug || '').trim();
  if (!s) return s;
  const mapped = PROFILE_SLUG_ALIASES[s.toLowerCase()];
  return mapped || s;
}

module.exports = {
  PROFILE_SLUG_ALIASES,
  canonicalizeProfileSlug
};
