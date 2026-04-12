const fs = require('fs');
const path = require('path');

/**
 * Resolve o ficheiro de variáveis de ambiente (ordem):
 * 1) DOTENV_CONFIG_PATH ou CONECTAKING_ENV_FILE (variável do sistema / antes de iniciar o Node)
 * 2) Ficheiro .env.path na raiz do projeto (primeira linha não vazia = caminho absoluto ou relativo ao projeto)
 * 3) .env na raiz do projeto (comportamento anterior)
 *
 * @param {string} projectRoot - pasta do package.json (ex.: __dirname do server.js)
 * @returns {string} caminho usado
 */
function resolveEnvFilePath(projectRoot) {
  const fromEnv = process.env.DOTENV_CONFIG_PATH || process.env.CONECTAKING_ENV_FILE;
  if (fromEnv && String(fromEnv).trim()) {
    return path.resolve(String(fromEnv).trim());
  }
  const pointer = path.join(projectRoot, '.env.path');
  if (fs.existsSync(pointer)) {
    try {
      const raw = fs.readFileSync(pointer, 'utf8');
      const line = raw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find((l) => l && !l.startsWith('#'));
      if (line) return path.resolve(projectRoot, line);
    } catch (_) {}
  }
  return path.join(projectRoot, '.env');
}

function loadDotenv(projectRoot) {
  const envPath = resolveEnvFilePath(projectRoot);
  require('dotenv').config({ path: envPath });
  return envPath;
}

module.exports = { loadDotenv, resolveEnvFilePath };
