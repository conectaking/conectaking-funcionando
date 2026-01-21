require('dotenv').config();
const db = require('../db');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
    const client = await db.pool.connect();
    const results = {
        executed: [],
        skipped: [],
        errors: []
    };

    try {
        await client.query('BEGIN');
        console.log('🔵 Iniciando execução das migrations financeiras...\n');

        // Migration 095: Campos de recorrência
        console.log('📋 Verificando migration 095: Campos de recorrência...');
        const check095 = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'finance_transactions' 
            AND column_name IN ('is_recurring', 'recurring_times')
        `);
        
        const hasRecurringFields = check095.rows.length === 2;
        
        if (!hasRecurringFields) {
            console.log('   ⚠️  Campos de recorrência não encontrados. Executando migration 095...');
            const migration095Path = path.join(__dirname, '../migrations/095_add_recurring_fields_to_finance_transactions.sql');
            const migration095Sql = fs.readFileSync(migration095Path, 'utf8');
            await client.query(migration095Sql);
            results.executed.push('095_add_recurring_fields_to_finance_transactions.sql');
            console.log('   ✅ Migration 095 executada com sucesso!');
        } else {
            console.log('   ✅ Campos de recorrência já existem. Pulando migration 095.');
            results.skipped.push('095_add_recurring_fields_to_finance_transactions.sql');
        }

        // Migration 096: Categorias padrão
        console.log('\n📋 Verificando migration 096: Categorias padrão...');
        const check096 = await client.query(`
            SELECT COUNT(*) as count 
            FROM finance_categories 
            WHERE name IN ('Aluguel', 'Luz', 'Água', 'Internet', 'Cartão de Crédito', 'Supermercado', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Trabalho', 'Salário', 'Freelance', 'Vendas', 'Investimentos')
            AND type = 'EXPENSE'
            LIMIT 1
        `);
        
        const hasDefaultCategories = parseInt(check096.rows[0]?.count || 0) >= 11;
        
        if (!hasDefaultCategories) {
            console.log('   ⚠️  Categorias padrão não encontradas. Executando migration 096...');
            const migration096Path = path.join(__dirname, '../migrations/096_add_default_finance_categories.sql');
            const migration096Sql = fs.readFileSync(migration096Path, 'utf8');
            await client.query(migration096Sql);
            results.executed.push('096_add_default_finance_categories.sql');
            console.log('   ✅ Migration 096 executada com sucesso!');
        } else {
            console.log('   ✅ Categorias padrão já existem. Pulando migration 096.');
            results.skipped.push('096_add_default_finance_categories.sql');
        }

        await client.query('COMMIT');
        
        // Verificações finais
        console.log('\n🔍 Verificando resultados...\n');
        
        // Verificar campos de recorrência
        const finalCheck095 = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'finance_transactions' 
            AND column_name IN ('is_recurring', 'recurring_times')
            ORDER BY column_name
        `);
        
        console.log('📊 Campos de recorrência na tabela finance_transactions:');
        if (finalCheck095.rows.length === 2) {
            finalCheck095.rows.forEach(row => {
                console.log(`   ✅ ${row.column_name} (${row.data_type})`);
            });
        } else {
            console.log('   ❌ Campos não encontrados!');
        }
        
        // Verificar categorias padrão
        const finalCheck096 = await client.query(`
            SELECT name, type, icon, color 
            FROM finance_categories 
            WHERE name IN ('Aluguel', 'Luz', 'Água', 'Internet', 'Cartão de Crédito', 'Supermercado', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Trabalho', 'Salário', 'Freelance', 'Vendas', 'Investimentos')
            ORDER BY type, name
        `);
        
        console.log('\n📊 Categorias padrão criadas:');
        const categoriesByType = {};
        finalCheck096.rows.forEach(cat => {
            if (!categoriesByType[cat.type]) {
                categoriesByType[cat.type] = [];
            }
            categoriesByType[cat.type].push(cat);
        });
        
        Object.keys(categoriesByType).forEach(type => {
            console.log(`\n   ${type === 'EXPENSE' ? '💰 Despesas:' : '💵 Receitas:'}`);
            categoriesByType[type].forEach(cat => {
                console.log(`      ✅ ${cat.name} (${cat.icon || 'sem ícone'}, ${cat.color || 'sem cor'})`);
            });
        });
        
        // Contar total de categorias por usuário
        const userCategories = await client.query(`
            SELECT user_id, COUNT(*) as total
            FROM finance_categories
            GROUP BY user_id
            ORDER BY total DESC
            LIMIT 5
        `);
        
        console.log('\n📊 Total de categorias por usuário (top 5):');
        userCategories.rows.forEach(row => {
            console.log(`   👤 Usuário ${row.user_id}: ${row.total} categorias`);
        });
        
        // Resumo final
        console.log('\n' + '='.repeat(60));
        console.log('📋 RESUMO DA EXECUÇÃO:');
        console.log('='.repeat(60));
        console.log(`✅ Executadas: ${results.executed.length}`);
        results.executed.forEach(m => console.log(`   - ${m}`));
        console.log(`⏭️  Puladas (já existiam): ${results.skipped.length}`);
        results.skipped.forEach(m => console.log(`   - ${m}`));
        console.log(`❌ Erros: ${results.errors.length}`);
        if (results.errors.length > 0) {
            results.errors.forEach(e => console.log(`   - ${e}`));
        }
        console.log('='.repeat(60));
        console.log('\n✅ Todas as migrations foram verificadas e executadas com sucesso!\n');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Erro ao executar migrations:', error);
        results.errors.push(error.message);
        throw error;
    } finally {
        client.release();
    }
}

runMigrations()
    .then(() => {
        console.log('🎉 Processo concluído!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Falha no processo:', error);
        process.exit(1);
    });
