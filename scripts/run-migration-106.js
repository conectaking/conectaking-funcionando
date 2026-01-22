/**
 * Script para executar a migration 106 - Melhorias Premium da Agenda Inteligente
 * Adiciona campos para tipos de evento, localização e ativação no cartão virtual
 */

const fs = require('fs');
const path = require('path');
const db = require('../db');

async function runMigration() {
    const client = await db.pool.connect();
    
    try {
        console.log('🔄 Iniciando migration 106 - Melhorias Premium da Agenda Inteligente...');
        
        // Ler arquivo SQL
        const migrationPath = path.join(__dirname, '..', 'migrations', '106_improve_agenda_premium_features.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        // Executar migration
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        
        console.log('✅ Migration 106 executada com sucesso!');
        console.log('\n📋 Campos adicionados:');
        console.log('  - agenda_settings: is_active_in_card, card_button_text, card_button_icon, default_location_address, default_location_maps_url');
        console.log('  - agenda_appointments: event_type, location_address, location_maps_url, auto_confirm');
        console.log('  - agenda_slots: default_event_type');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao executar migration:', error);
        throw error;
    } finally {
        client.release();
        process.exit(0);
    }
}

runMigration().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
});
