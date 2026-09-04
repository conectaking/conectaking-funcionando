/**
 * Copia o Postgres de produção (Render / DB_* do .env) para o Postgres do Docker local.
 * Uso (PowerShell, na pasta do projeto, Docker Desktop ligado):
 *   node scripts/sync-render-db-to-docker.js
 *
 * NÃO imprime senhas. Gera backups/render-to-docker.dump e restaura em conectaking-db.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const backupsDir = path.join(root, 'backups');
const dumpFile = path.join(backupsDir, 'render-to-docker.dump');

function loadEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function resolveEnv() {
  let envPath = path.join(root, '.env');
  const pathFile = path.join(root, '.env.path');
  if (fs.existsSync(pathFile)) {
    const pointed = fs.readFileSync(pathFile, 'utf8').trim();
    if (pointed && fs.existsSync(pointed)) envPath = pointed;
  }
  return loadEnvFile(envPath);
}

function getSourceConn(env) {
  if (env.DATABASE_URL && env.DATABASE_URL.trim()) {
    let url = env.DATABASE_URL.trim();
    if (!/[?&]sslmode=/.test(url)) {
      url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
    }
    return { mode: 'url', url };
  }
  const user = env.DB_USER;
  const pass = env.DB_PASSWORD;
  const host = env.DB_HOST;
  const port = env.DB_PORT || '5432';
  const db = env.DB_DATABASE;
  if (!user || !pass || !host || !db) {
    throw new Error('Defina DATABASE_URL ou DB_USER/DB_PASSWORD/DB_HOST/DB_DATABASE no .env');
  }
  return { mode: 'params', user, pass, host, port, db };
}

function buildSourceUrl(env) {
  const c = getSourceConn(env);
  if (c.mode === 'url') return c.url;
  const enc = encodeURIComponent(c.pass);
  return `postgresql://${c.user}:${enc}@${c.host}:${c.port}/${c.db}?sslmode=require`;
}

function run(cmd, args, opts = {}) {
  console.log('>', cmd, args.filter((a) => !String(a).includes('postgresql://')).join(' '));
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: false, ...opts });
  if (r.status !== 0) {
    throw new Error(`Comando falhou (${cmd}): exit ${r.status}`);
  }
}

function main() {
  const env = resolveEnv();
  const conn = getSourceConn(env);
  const sourceUrl = buildSourceUrl(env);
  let hostLabel = conn.mode === 'params' ? conn.host : '(source)';
  try {
    if (conn.mode === 'url') hostLabel = new URL(sourceUrl.replace(/^postgresql:/, 'http:')).hostname;
  } catch (_) {}

  fs.mkdirSync(backupsDir, { recursive: true });
  console.log('Origem:', hostLabel);
  console.log('Dump para:', dumpFile);

  // 1) Dump via container postgres (SSL require; params evitam problemas de encoding na URL)
  const dumpArgs = [
    'run', '--rm',
    '-e', 'PGSSLMODE=require',
    '-v', `${backupsDir}:/backups`,
  ];
  if (conn.mode === 'params') {
    dumpArgs.push('-e', `PGPASSWORD=${conn.pass}`);
  }
  dumpArgs.push('postgres:16-alpine');
  if (conn.mode === 'params') {
    dumpArgs.push(
      'pg_dump',
      '-h', conn.host,
      '-p', String(conn.port),
      '-U', conn.user,
      '-d', conn.db,
      '--format=custom',
      '--no-owner',
      '--no-acl',
      '-f', '/backups/render-to-docker.dump'
    );
  } else {
    dumpArgs.push(
      'pg_dump', sourceUrl,
      '--format=custom',
      '--no-owner',
      '--no-acl',
      '-f', '/backups/render-to-docker.dump'
    );
  }
  console.log('> docker run ... pg_dump (origem Render, sem imprimir senha)');
  const dump = spawnSync('docker', dumpArgs, { stdio: 'inherit', shell: false });
  if (dump.status !== 0) {
    throw new Error(`pg_dump falhou (exit ${dump.status}). Confira se o Postgres do Render aceita conexão externa (External Database).`);
  }

  if (!fs.existsSync(dumpFile) || fs.statSync(dumpFile).size < 1000) {
    throw new Error('Dump não foi gerado ou está vazio.');
  }
  console.log('Dump OK:', (fs.statSync(dumpFile).size / (1024 * 1024)).toFixed(2), 'MB');

  // 2) Restore no Postgres do compose (rede Docker)
  console.log('Restaurando no Docker local (serviço db)...');
  // Descobrir nome da rede do compose
  const netProbe = spawnSync('docker', ['inspect', '-f', '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}', 'conectaking-db'], {
    encoding: 'utf8',
    shell: false
  });
  const network = (netProbe.stdout || '').trim();
  if (!network) {
    throw new Error('Container conectaking-db não encontrado. Rode: docker compose --env-file .env.docker up -d');
  }

  // --clean pode avisar erros em objetos inexistentes; ignoramos exit code parcial se dados entraram
  const restore = spawnSync('docker', [
    'run', '--rm',
    '--network', network,
    '-v', `${backupsDir}:/backups`,
    'postgres:16-alpine',
    'pg_restore',
    '-h', 'conectaking-db',
    '-U', 'conectaking',
    '-d', 'conectaking',
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-acl',
    '/backups/render-to-docker.dump'
  ], {
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, PGPASSWORD: 'conectaking' }
  });

  if (restore.status !== 0) {
    console.warn('pg_restore terminou com avisos/código', restore.status, '(comum com --clean). Verifique o login.');
  }

  console.log('\nPronto. Usuários e senhas (hash) do Render estão no Docker.');
  console.log('Abra http://localhost:5000/login.html e entre com o mesmo e-mail/senha de produção.');
}

try {
  main();
} catch (e) {
  console.error('\nFalhou:', e.message);
  process.exit(1);
}
