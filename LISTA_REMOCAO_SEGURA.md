# 🗑️ Lista de Remoção Segura - Arquivos Não Utilizados

## ⚠️ IMPORTANTE: Fazer Backup Antes de Remover!

```bash
# Criar backup antes de remover
git add .
git commit -m "Backup antes de limpeza"
```

---

## 📄 1. Documentação de Correções Antigas (PODE REMOVER - 40+ arquivos)

Estes são arquivos .md de correções já implementadas. Não são mais necessários:

### Integração (8 arquivos):
- `CHECKLIST_INTEGRACAO.md`
- `COMO_USAR_INTEGRACAO.md`
- `PROXIMOS_PASSOS_INTEGRACAO.md`
- `INTEGRACAO_COMPLETA.md`
- `INTEGRACAO_DIRETA_INSTRUCOES.md`
- `INTEGRACAO_FINAL_COMPLETA.md`
- `RESUMO_INTEGRACAO_DIRETA.md`
- `RESUMO_FINAL_INTEGRACAO.md`

### Modo Empresa (3 arquivos):
- `CORRECAO_MODO_EMPRESA.md`
- `CORRECAO_BOTAO_MODO_EMPRESA_VISIVEL.md`
- `RESUMO_CORRECAO_MODO_EMPRESA.md`

### Planos (4 arquivos):
- `CORRECAO_COMPLETA_PLANOS_EDICAO.md`
- `CORRECAO_PLAN_CODE_BASIC.md`
- `RESUMO_CORRECOES_PLANOS_INDIVIDUAIS.md`
- `ATUALIZACAO_PLANOS_SEPARACAO_PACOTES.md`

### Módulos (4 arquivos):
- `CORRECAO_MODULOS_SOMEM.md`
- `RESUMO_CORRECOES_MODULOS_SOMEM.md`
- `CORRECAO_ERRO_HTTP_500_MODULOS.md`
- `CORRECAO_ERRO_FETCH_PLANRENDERER.md`

### Agenda (7 arquivos):
- `CORRECAO_AGENDA_GOOGLE_CALENDAR.md`
- `CORRECOES_COMPLETAS_AGENDA.md`
- `RESUMO_CORRECOES_AGENDA.md`
- `AGENDA_PREMIUM_MELHORIAS.md`
- `FRONTEND_AGENDA_INTEGRATION.md`
- `GUIA_RAPIDO_AGENDA_PREMIUM.md`
- `COMO_ATIVAR_AGENDA_NO_CARTAO.md`

### Google OAuth (7 arquivos):
- `CONFIGURAR_GOOGLE_OAUTH.md`
- `SOLUCAO_RAPIDA_GOOGLE_OAUTH.md`
- `SOLUCAO_ERROS_GOOGLE_VERIFICACAO.md`
- `CORRIGIR_ERROS_VERIFICACAO_GOOGLE.md`
- `CORRIGIR_ERRO_403_ACCESS_DENIED.md`
- `CORRIGIR_REDIRECT_URI_MISMATCH.md`
- `PUBLICAR_APP_GOOGLE_OAUTH.md`

### Outros (7 arquivos):
- `ANALISE_FLUXO_ASSINATURA_CONTRATOS.md`
- `BACKEND_MULTIPLOS_LINKS.md`
- `INSTRUCOES_FRONTEND_LINKS.md`
- `MIGRACAO_LINKS_UNICOS.md`
- `DIAGNOSTICO_TABELA_UNIQUE_LINKS.md`
- `EXECUTAR_MIGRATION_109.md`
- `URLS_POLITICA_TERMOS.md`

**Total: ~40 arquivos .md de correções antigas**

---

## 📝 2. Arquivos .txt de Instruções Antigas (PODE REMOVER - 9 arquivos)

- `ADICIONAR_NO_RENDER.txt`
- `COMANDOS-DEPLOY.txt`
- `COMANDOS-PUSH-BITBUCKET.txt`
- `COMO_FAZER_AGORA.txt`
- `FAZER-PUSH-AGORA.txt`
- `INSTRUCOES_SIMPLES.txt`
- `CONFIGURAR_SQLTOOLS_COM_SEUS_DADOS.txt`
- `VARIAVEIS-RENDER.txt` (verificar se ainda é útil)
- `SUAS_CREDENCIAIS_GOOGLE.txt` ⚠️ **CUIDADO: Pode conter credenciais - verificar antes**

---

## 🔧 3. Rotas Não Utilizadas (VERIFICAR ANTES DE REMOVER)

### Rotas que NÃO estão no server.js:
- `routes/cloudinary.js` - ❌ Não encontrado no server.js
- `routes/embeddings.js` - ❌ Não encontrado no server.js
- `routes/products.js` - ❌ Não encontrado no server.js (mas pode ser usado em módulos)
- `routes/iaKingAdvancedUnderstanding.js` - ❌ Não encontrado no server.js
- `routes/contracts.routes.js` - ⚠️ Verificar: pode ser duplicado de `modules/contracts/contract.routes.js`

**Ação:** Verificar se estas rotas são usadas em outros lugares antes de remover.

---

## 📄 4. Arquivos de Backup (PODE REMOVER)

- `routes/password.js.backup` - Arquivo de backup

---

## 📄 5. Arquivos SQL Soltos (VERIFICAR ANTES DE REMOVER)

Estes podem ter sido executados manualmente. Verificar se já foram aplicados:

- `adicionar_categoria_trabalho.sql` - ⚠️ Verificar se já foi executado
- `atualizar_planos_usuarios.sql` - ⚠️ Verificar se já foi executado
- `configurar_planos.sql` - ⚠️ Verificar se já foi executado
- `verificar_account_types.sql` - Script de verificação (pode remover)
- `QUERY_VERIFICACAO_RAPIDA.sql` - Script de verificação (pode remover)

---

## 🔧 6. Scripts de Migrations Antigas (VERIFICAR ANTES DE REMOVER)

Estes scripts são para migrations específicas que podem já ter sido executadas:

- `scripts/check-migrations-089-090.js`
- `scripts/run-migrations-089-090.js`
- `scripts/run-migrations-093-094-095.js`
- `scripts/run-migration-065.js`
- `scripts/run-migration-095.js`
- `scripts/run-migration-106.js`
- `scripts/run-migration-109.js`
- `scripts/run-migration-110.js`

**Ação:** Verificar se estas migrations já foram executadas. Se sim, podem ser removidas.

---

## 🧪 7. Scripts de Teste (PODE REMOVER)

- `scripts/testar-api-analytics.js`
- `scripts/testar-registro-cliques.js`
- `scripts/verificar-analytics.js`

---

## 📋 8. Arquivos .md de Melhorias Antigas (VERIFICAR)

Estes podem ser úteis para referência futura:

- `MELHORIAS_UX_IMPLEMENTADAS.md` - ⚠️ Verificar se ainda é útil
- `MELHORIAS_IMPLEMENTADAS.md` - ⚠️ Verificar se ainda é útil
- `MELHORIAS_IDENTIFICADAS.md` - ⚠️ Verificar se ainda é útil
- `MELHORIAS_IMPLEMENTADAS_FINAL.md` - ⚠️ Verificar se ainda é útil
- `KING_FORMS_MELHORIAS_COMPLETAS.md` - ⚠️ Verificar se ainda é útil
- `TODO.md` - ⚠️ Verificar se ainda é útil
- `INSTRUCTIONS.md` - ⚠️ Verificar se ainda é útil

---

## 📋 9. Arquivos .md de Configuração (MANTER - Podem ser úteis)

- `COMO_CONFIGURAR_PASSO_A_PASSO.md` - ✅ Manter (pode ser útil)
- `GUIA_CONFIGURACAO.md` - ✅ Manter (pode ser útil)
- `GUIA_CONFIGURACAO_API_IA.md` - ✅ Manter (pode ser útil)
- `GUIA_TREINAMENTO_IA.md` - ✅ Manter (pode ser útil)
- `API_DOCUMENTATION.md` - ✅ Manter (documentação importante)
- `MIGRATIONS_AUTO.md` - ✅ Manter (documentação do sistema)
- `OTIMIZACAO_DEPLOY_RENDER.md` - ✅ Manter (útil para referência)

---

## 🖼️ 10. Outros Arquivos (VERIFICAR)

- `logo.png` - ⚠️ Verificar se está sendo usado
- `CODIGO-TEMPLATE-EJS-SEGURO.ejs` - ⚠️ Verificar se está sendo usado
- `iniciar-servidor.bat` - ⚠️ Verificar se ainda é usado
- `EXECUTAR-VIA-LINHA-COMANDO.bat` - ⚠️ Verificar se ainda é usado
- `forcar-deploy-render.ps1` - ⚠️ Verificar se ainda é usado
- `push-auto.ps1` - ⚠️ Verificar se ainda é usado
- `EXECUTAR-NO-RENDER-SHELL.sh` - ⚠️ Verificar se ainda é usado

---

## ✅ Resumo

### Pode Remover Imediatamente (~50 arquivos):
- ~40 arquivos .md de correções antigas
- 9 arquivos .txt de instruções antigas
- 1 arquivo .backup

### Verificar Antes de Remover (~20 arquivos):
- 5 rotas não utilizadas
- 5 arquivos SQL soltos
- 8 scripts de migrations antigas
- 3 scripts de teste
- Alguns arquivos .md de melhorias

### Manter:
- Toda a documentação de configuração
- API_DOCUMENTATION.md
- MIGRATIONS_AUTO.md
- OTIMIZACAO_DEPLOY_RENDER.md

---

## 🚀 Próximo Passo

Criar script de remoção ou fazer remoção manual verificando cada categoria.
