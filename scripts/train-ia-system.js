/**
 * Script para treinar a IA com informações do sistema
 * Execute: node scripts/train-ia-system.js
 */

require('dotenv').config();
const db = require('../db');
const { trainIAWithSystemInfo, addParcelamentoKnowledge } = require('../utils/iaSystemTrainer');

async function main() {
    const client = await db.pool.connect();
    try {
        console.log('🧠 [IA Trainer] Iniciando treinamento do sistema...\n');
        
        // 1. Adicionar conhecimento sobre parcelamento primeiro
        console.log('📚 [IA Trainer] Adicionando conhecimento sobre parcelamento...');
        await addParcelamentoKnowledge(client);
        console.log('✅ [IA Trainer] Conhecimento sobre parcelamento adicionado\n');
        
        // 2. Treinar com informações do sistema
        console.log('📚 [IA Trainer] Treinando com informações do sistema...');
        const result = await trainIAWithSystemInfo(client);
        
        console.log('\n✅ [IA Trainer] Treinamento concluído!');
        console.log(`   • ${result.trained} tópicos treinados`);
        if (result.errors.length > 0) {
            console.log(`   • ${result.errors.length} erros encontrados:`);
            result.errors.forEach(err => {
                console.log(`     - ${err.topic}: ${err.error}`);
            });
        }
        
    } catch (error) {
        console.error('❌ [IA Trainer] Erro no treinamento:', error);
        process.exit(1);
    } finally {
        client.release();
        await db.pool.end();
        process.exit(0);
    }
}

main();
