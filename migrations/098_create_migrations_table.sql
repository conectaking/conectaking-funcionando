-- Migration: Criar tabela de controle de migrations executadas
-- Data: 2026-01-19
-- Descrição: Tabela para rastrear quais migrations já foram executadas automaticamente

DO $$
BEGIN
    -- Criar tabela de controle de migrations se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations') THEN
        CREATE TABLE schema_migrations (
            id SERIAL PRIMARY KEY,
            migration_name VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP DEFAULT NOW(),
            execution_time_ms INTEGER,
            success BOOLEAN DEFAULT TRUE,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX idx_schema_migrations_name ON schema_migrations(migration_name);
        CREATE INDEX idx_schema_migrations_executed_at ON schema_migrations(executed_at);
        
        RAISE NOTICE 'Tabela schema_migrations criada com sucesso.';
    ELSE
        RAISE NOTICE 'Tabela schema_migrations já existe.';
    END IF;
END $$;
