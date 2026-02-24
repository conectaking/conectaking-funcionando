/**
 * Lista migrações "órfãs": registradas como executadas no banco (schema_migrations)
 * mas cujo arquivo .sql não existe mais na pasta migrations/.
 *
 * Por que 189 executadas e 176 disponíveis?
 * - "Disponíveis" = quantidade de arquivos .sql na pasta migrations/
 * - "Executadas" = quantidade de registros em schema_migrations (success = true)
 * - A diferença (13 ou mais) são migrações que foram rodadas no passado e depois
 *   os arquivos foram removidos ou renomeados (ex.: duplicatas de número 074, 106, 109
 *   que podem ter sido consolidadas ou apagadas).
 *
 * Uso: node scripts/list-orphaned-migrations.js
 * Opção --sql : imprime apenas os DELETE para limpar órfãs (para copiar e rodar no banco).
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../db');

const migrationsDir = path.join(__dirname, '../migrations');

async function main() {
    const onlySql = process.argv.includes('--sql');

    const available = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    let executed = [];
    try {
        const result = await db.query(`
            SELECT migration_name FROM schema_migrations WHERE success = TRUE ORDER BY executed_at ASC
        `);
        executed = result.rows.map(r => r.migration_name);
    } catch (e) {
        console.error('Erro ao ler schema_migrations:', e.message);
        process.exit(1);
    }

    const availableSet = new Set(available);
    const orphaned = executed.filter(name => !availableSet.has(name));

    if (!onlySql) {
        console.log('--- Migrações disponíveis (arquivos .sql):', available.length);
        console.log('--- Migrações executadas (schema_migrations):', executed.length);
        console.log('--- Órfãs (executadas mas sem arquivo):', orphaned.length);
        console.log('');
        if (orphaned.length > 0) {
            console.log('Nomes órfãos:');
            orphaned.forEach(name => console.log('  ', name));
            console.log('');
            console.log('Para alinhar os números, remova esses registros do banco.');
            console.log('Rode este script com --sql para gerar os DELETE.');
        }
    }

    if (orphaned.length > 0 && onlySql) {
        console.log('-- Remover migrações órfãs (sem arquivo correspondente)');
        orphaned.forEach(name => {
            console.log(`DELETE FROM schema_migrations WHERE migration_name = '${name.replace(/'/g, "''")}';`);
        });
    }

    await db.pool.end();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
