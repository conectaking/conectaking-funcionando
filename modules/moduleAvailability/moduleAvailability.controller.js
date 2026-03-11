const db = require('../../db');
const service = require('./moduleAvailability.service');

async function getPlanAvailabilityPublic(req, res) {
    const client = await db.pool.connect();
    try {
        const data = await service.getPlanAvailabilityPublic(client);
        return res.json(data);
    } finally {
        client.release();
    }
}

async function getPlanAvailability(req, res) {
    const client = await db.pool.connect();
    try {
        const data = await service.getPlanAvailability(client, req.user.userId);
        if (data.forbidden) {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar.' });
        }
        return res.json(data);
    } finally {
        client.release();
    }
}

async function updatePlanAvailability(req, res) {
    const client = await db.pool.connect();
    try {
        const { updates } = req.body;
        await client.query('BEGIN');
        try {
            const result = await service.updatePlanAvailability(client, req.user.userId, updates);
            if (result.forbidden) {
                await client.query('ROLLBACK');
                return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem editar.' });
            }
            if (result.badRequest) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: result.message });
            }
            await client.query('COMMIT');
            return res.json(result);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
    } finally {
        client.release();
    }
}

async function getAvailable(req, res) {
    const client = await db.pool.connect();
    try {
        const data = await service.getAvailableModules(client, req.user.userId, req.query.plan_code);
        if (data.notFound) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        return res.json(data);
    } finally {
        client.release();
    }
}

async function getIndividualPlans(req, res) {
    const client = await db.pool.connect();
    try {
        const data = await service.getIndividualPlans(client, req.user.userId);
        if (data.forbidden) {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar.' });
        }
        return res.json(data);
    } finally {
        client.release();
    }
}

async function getUsersList(req, res) {
    const client = await db.pool.connect();
    try {
        const data = await service.getUsersList(client, req.user.userId);
        if (data.forbidden) {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar.' });
        }
        return res.json(data);
    } finally {
        client.release();
    }
}

async function getIndividualPlansForUser(req, res) {
    const client = await db.pool.connect();
    try {
        const data = await service.getIndividualPlansForUser(
            client,
            req.user.userId,
            req.params.userId
        );
        if (data.forbidden) {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar.' });
        }
        if (data.notFound) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        return res.json(data);
    } finally {
        client.release();
    }
}

async function putIndividualPlansForUser(req, res) {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        try {
            const result = await service.updateIndividualPlansForUser(
                client,
                req.user.userId,
                req.params.userId,
                req.body
            );
            if (result.forbidden) {
                await client.query('ROLLBACK');
                return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar.' });
            }
            if (result.notFound) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: 'Usuário não encontrado.' });
            }
            if (result.badRequest) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: result.message });
            }
            await client.query('COMMIT');
            return res.json(result);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
    } finally {
        client.release();
    }
}

async function getConfigureModulesPage(req, res) {
    const client = await db.pool.connect();
    try {
        const isAdmin = await service.requireAdmin(client, req.user.userId);
        if (!isAdmin) {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
        }
        const viewData = service.getConfigureModulesPage(req.user.userId, req.params.userId);
        return res.render('configureModules', viewData);
    } finally {
        client.release();
    }
}

module.exports = {
    getPlanAvailabilityPublic,
    getPlanAvailability,
    updatePlanAvailability,
    getAvailable,
    getIndividualPlans,
    getUsersList,
    getIndividualPlansForUser,
    putIndividualPlansForUser,
    getConfigureModulesPage
};