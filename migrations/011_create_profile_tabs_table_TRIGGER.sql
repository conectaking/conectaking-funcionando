-- ===========================================
-- Execute este script DEPOIS que a tabela foi criada
-- ===========================================

-- Criar função
CREATE OR REPLACE FUNCTION update_profile_tabs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_update_profile_tabs_updated_at ON profile_tabs;
CREATE TRIGGER trigger_update_profile_tabs_updated_at
    BEFORE UPDATE ON profile_tabs
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_tabs_updated_at();

-- Verificar se foi criado
SELECT 'Trigger criado com sucesso!' as resultado;

