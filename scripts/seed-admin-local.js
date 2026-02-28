/**
 * Cria ou redefine a senha do usuário conectaking@gmail.com na base LOCAL.
 * Use quando a base está vazia ou quando não consegue fazer login (credenciais inválidas).
 *
 * Uso: node scripts/seed-admin-local.js
 * Senha padrão: ConectaKing2026!
 * Ou defina SEED_ADMIN_PASSWORD no .env para usar outra senha.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');

const ADMIN_EMAIL = 'conectaking@gmail.com';
const DEFAULT_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ConectaKing2026!';

async function main() {
    console.log('Conectando ao banco...');
    const client = await db.pool.connect();
    try {
        const existing = await client.query('SELECT id, email FROM users WHERE LOWER(TRIM(email)) = $1', [ADMIN_EMAIL.toLowerCase()]);
        const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

        if (existing.rows.length > 0) {
            const id = existing.rows[0].id;
            await client.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, id]);
            console.log('Senha do usuário conectaking@gmail.com foi REDEFINIDA.');
        } else {
            const id = 'seed-admin-' + nanoid(12);
            await client.query(
                `INSERT INTO users (id, email, password_hash, profile_slug, account_type, subscription_status, is_admin, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())`,
                [id, ADMIN_EMAIL, passwordHash, 'conectaking', 'king_corporate', 'active']
            );
            const upExists = await client.query('SELECT 1 FROM user_profiles WHERE user_id = $1', [id]);
            if (upExists.rows.length === 0) {
                await client.query(
                    `INSERT INTO user_profiles (user_id, display_name, logo_spacing) VALUES ($1, $2, 'center')`,
                    [id, 'Conecta King Admin']
                );
            }
            console.log('Usuário conectaking@gmail.com CRIADO (admin).');
        }

        console.log('');
        console.log('E-mail:', ADMIN_EMAIL);
        console.log('Senha:', DEFAULT_PASSWORD);
        console.log('');
        console.log('Faça login em tag.conectaking.com.br ou localhost:5000 e altere a senha se desejar.');
    } finally {
        client.release();
        await db.pool.end();
    }
}

main().catch((err) => {
    console.error('Erro:', err.message);
    process.exit(1);
});
