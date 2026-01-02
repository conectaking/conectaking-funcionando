/**
 * MÓDULO DE DIAGNÓSTICO
 * 
 * Responsável por:
 * - Identificar erros no sistema
 * - Detectar padrões de falha
 * - Sugerir melhorias
 * - Gerar alertas para admin quando necessário
 */

const db = require('../../db');
const { getSystemPrompt } = require('../systemPrompt');

/**
 * Processa uma solicitação de diagnóstico
 * 
 * @param {string} message - Mensagem do usuário
 * @param {object} context - Contexto (userId, histórico, etc)
 * @returns {Promise<object>} - { response: string, diagnostics: array, alerts: array }
 */
async function processDiagnostico(message, context = {}) {
    const { userId, userRole } = context;
    
    // Verificar se é admin (diagnóstico completo requer admin)
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    
    // Executar diagnóstico
    const diagnostics = await executarDiagnostico(message, context, isAdmin);
    
    // Verificar se há alertas críticos
    const alerts = await verificarAlertas(diagnostics, isAdmin);
    
    // Construir resposta
    const response = construirRespostaDiagnostico(diagnostics, alerts, isAdmin);
    
    return {
        response,
        diagnostics,
        alerts,
        module: 'diagnostico'
    };
}

/**
 * Executa diagnóstico do sistema
 */
async function executarDiagnostico(message, context, isAdmin) {
    const diagnostics = [];
    
    // Diagnóstico básico (disponível para todos)
    const basicDiagnostics = await diagnosticoBasico(message, context);
    diagnostics.push(...basicDiagnostics);
    
    // Diagnóstico avançado (apenas admin)
    if (isAdmin) {
        const advancedDiagnostics = await diagnosticoAvancado(context);
        diagnostics.push(...advancedDiagnostics);
    }
    
    return diagnostics;
}

/**
 * Diagnóstico básico
 */
async function diagnosticoBasico(message, context) {
    const diagnostics = [];
    const lowerMessage = message.toLowerCase();
    
    // Verificar se menciona problema específico
    if (lowerMessage.includes('erro') || lowerMessage.includes('problema') || 
        lowerMessage.includes('não funciona') || lowerMessage.includes('bug')) {
        
        // Buscar erros conhecidos na memória
        const knownErrors = await buscarErrosConhecidos(message);
        
        if (knownErrors && knownErrors.length > 0) {
            diagnostics.push({
                type: 'known_error',
                severity: 'medium',
                title: 'Erro Conhecido Identificado',
                description: knownErrors[0].content,
                solution: knownErrors[0].solution || 'Solução disponível na base de conhecimento'
            });
        } else {
            diagnostics.push({
                type: 'unknown_error',
                severity: 'low',
                title: 'Problema Reportado',
                description: 'Você reportou um problema. Vamos investigar.',
                solution: 'Por favor, forneça mais detalhes sobre o problema para que eu possa ajudar melhor.'
            });
        }
    }
    
    // Verificar padrões de uso
    const usagePatterns = await verificarPadroesUso(context);
    if (usagePatterns && usagePatterns.length > 0) {
        diagnostics.push(...usagePatterns);
    }
    
    return diagnostics;
}

/**
 * Diagnóstico avançado (apenas admin)
 */
async function diagnosticoAvancado(context) {
    const diagnostics = [];
    
    // Verificar banco de dados
    const dbDiagnostics = await verificarBancoDados();
    diagnostics.push(...dbDiagnostics);
    
    // Verificar performance
    const performanceDiagnostics = await verificarPerformance();
    diagnostics.push(...performanceDiagnostics);
    
    // Verificar erros do sistema
    const systemErrors = await verificarErrosSistema();
    diagnostics.push(...systemErrors);
    
    return diagnostics;
}

/**
 * Busca erros conhecidos na memória
 */
async function buscarErrosConhecidos(message) {
    try {
        const query = `
            SELECT id, title, content, keywords
            FROM ia_knowledge_base
            WHERE is_active = true
            AND (
                source_type = 'system_error'
                OR keywords && ARRAY['erro', 'problema', 'bug', 'falha']
            )
            ORDER BY priority DESC
            LIMIT 3
        `;
        
        const result = await db.query(query);
        return result.rows;
    } catch (error) {
        console.error('Erro ao buscar erros conhecidos:', error);
        return [];
    }
}

/**
 * Verifica padrões de uso
 */
async function verificarPadroesUso(context) {
    const diagnostics = [];
    
    // Aqui podemos verificar padrões como:
    // - Uso frequente de certas funcionalidades
    // - Problemas recorrentes
    // - Oportunidades de melhoria
    
    return diagnostics;
}

/**
 * Verifica banco de dados
 */
async function verificarBancoDados() {
    const diagnostics = [];
    
    try {
        // Verificar conexão
        const connectionTest = await db.query('SELECT 1');
        if (connectionTest) {
            diagnostics.push({
                type: 'database',
                severity: 'info',
                title: 'Conexão com Banco de Dados',
                description: 'Conexão estabelecida com sucesso',
                status: 'healthy'
            });
        }
        
        // Verificar tabelas críticas
        const criticalTables = ['users', 'ia_knowledge_base', 'ia_conversations'];
        for (const table of criticalTables) {
            try {
                const result = await db.query(`SELECT COUNT(*) FROM ${table}`);
                diagnostics.push({
                    type: 'database',
                    severity: 'info',
                    title: `Tabela ${table}`,
                    description: `Tabela existe e contém ${result.rows[0].count} registros`,
                    status: 'healthy'
                });
            } catch (error) {
                diagnostics.push({
                    type: 'database',
                    severity: 'error',
                    title: `Tabela ${table}`,
                    description: `Erro ao acessar tabela: ${error.message}`,
                    status: 'error'
                });
            }
        }
    } catch (error) {
        diagnostics.push({
            type: 'database',
            severity: 'error',
            title: 'Erro no Banco de Dados',
            description: `Erro ao verificar banco: ${error.message}`,
            status: 'error'
        });
    }
    
    return diagnostics;
}

/**
 * Verifica performance
 */
async function verificarPerformance() {
    const diagnostics = [];
    
    // Verificar métricas de performance recentes
    try {
        const query = `
            SELECT metric_type, AVG(metric_value) as avg_value, MAX(metric_value) as max_value
            FROM ia_system_metrics
            WHERE recorded_at > NOW() - INTERVAL '1 hour'
            GROUP BY metric_type
        `;
        
        const result = await db.query(query);
        
        for (const row of result.rows) {
            const severity = row.max_value > 1000 ? 'warning' : 'info';
            diagnostics.push({
                type: 'performance',
                severity,
                title: `Performance: ${row.metric_type}`,
                description: `Média: ${row.avg_value}, Máximo: ${row.max_value}`,
                status: severity === 'warning' ? 'needs_attention' : 'healthy'
            });
        }
    } catch (error) {
        // Tabela pode não existir ainda
        console.log('Tabela de métricas não disponível');
    }
    
    return diagnostics;
}

/**
 * Verifica erros do sistema
 */
async function verificarErrosSistema() {
    const diagnostics = [];
    
    try {
        const query = `
            SELECT error_type, COUNT(*) as count, MAX(severity) as max_severity
            FROM ia_system_errors
            WHERE resolved = false
            GROUP BY error_type
            ORDER BY count DESC
            LIMIT 5
        `;
        
        const result = await db.query(query);
        
        for (const row of result.rows) {
            const severity = row.max_severity === 'critical' ? 'error' : 
                           row.max_severity === 'high' ? 'warning' : 'info';
            
            diagnostics.push({
                type: 'system_error',
                severity,
                title: `Erros do Tipo: ${row.error_type}`,
                description: `${row.count} erros não resolvidos encontrados`,
                status: 'needs_attention'
            });
        }
    } catch (error) {
        // Tabela pode não existir ainda
        console.log('Tabela de erros não disponível');
    }
    
    return diagnostics;
}

/**
 * Verifica se há alertas críticos
 */
async function verificarAlertas(diagnostics, isAdmin) {
    const alerts = [];
    
    // Alertas críticos
    const criticalDiagnostics = diagnostics.filter(d => 
        d.severity === 'error' || d.severity === 'critical'
    );
    
    if (criticalDiagnostics.length > 0) {
        alerts.push({
            type: 'critical',
            message: `${criticalDiagnostics.length} problema(s) crítico(s) detectado(s)`,
            diagnostics: criticalDiagnostics
        });
    }
    
    // Alertas de warning
    const warningDiagnostics = diagnostics.filter(d => d.severity === 'warning');
    
    if (warningDiagnostics.length > 0 && isAdmin) {
        alerts.push({
            type: 'warning',
            message: `${warningDiagnostics.length} aviso(s) encontrado(s)`,
            diagnostics: warningDiagnostics
        });
    }
    
    return alerts;
}

/**
 * Constrói resposta de diagnóstico
 */
function construirRespostaDiagnostico(diagnostics, alerts, isAdmin) {
    let response = `## Diagnóstico do Sistema\n\n`;
    
    if (alerts && alerts.length > 0) {
        response += `### ⚠️ Alertas\n\n`;
        for (const alert of alerts) {
            response += `**${alert.type.toUpperCase()}**: ${alert.message}\n\n`;
        }
    }
    
    if (diagnostics && diagnostics.length > 0) {
        response += `### Resultados do Diagnóstico\n\n`;
        
        for (const diagnostic of diagnostics) {
            const icon = getIconForSeverity(diagnostic.severity);
            response += `${icon} **${diagnostic.title}**\n`;
            response += `${diagnostic.description}\n`;
            
            if (diagnostic.solution) {
                response += `\n💡 **Solução**: ${diagnostic.solution}\n`;
            }
            
            response += `\n`;
        }
    } else {
        response += `✅ Nenhum problema detectado no momento.\n\n`;
    }
    
    if (isAdmin) {
        response += `\n*Diagnóstico completo executado (modo admin)*`;
    }
    
    return response;
}

/**
 * Retorna ícone baseado na severidade
 */
function getIconForSeverity(severity) {
    const icons = {
        'error': '🔴',
        'critical': '🔴',
        'warning': '🟡',
        'info': '🔵',
        'success': '✅'
    };
    
    return icons[severity] || 'ℹ️';
}

module.exports = {
    processDiagnostico
};

