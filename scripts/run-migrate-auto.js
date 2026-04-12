/**
 * Executa migrations pendentes (auto-migrate).
 * Uso: node scripts/run-migrate-auto.js
 * No Windows também: migrate-auto.cmd na raiz do projeto.
 */
const path = require('path');
const { loadDotenv } = require('../utils/loadDotenv');
loadDotenv(path.join(__dirname, '..'));
const migrator = require('../utils/auto-migrate');

migrator
  .runPendingMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
