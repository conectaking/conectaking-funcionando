/**
 * Mostra estado das migrations (JSON).
 * Uso: node scripts/run-migrate-status.js
 */
require('dotenv').config();
const migrator = require('../utils/auto-migrate');

migrator
  .getStatus()
  .then((s) => {
    console.log(JSON.stringify(s, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
