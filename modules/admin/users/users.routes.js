/**
 * Rotas admin: usuários (listagem, dashboard, gestão, auto-delete). Só delega ao controller.
 */
const express = require('express');
const { protectAdmin } = require('../../../middleware/protectAdmin');
const controller = require('./users.controller');

const router = express.Router();

router.get('/users', protectAdmin, controller.getUsers);
router.get('/users/auto-delete-config', protectAdmin, controller.getAutoDeleteConfig);
router.post('/users/auto-delete-config', protectAdmin, controller.postAutoDeleteConfig);
router.post('/users/execute-auto-delete', protectAdmin, controller.postExecuteAutoDelete);
router.get('/users/:id/dashboard', protectAdmin, controller.getUserDashboard);
router.put('/users/:id/manage', protectAdmin, controller.putUserManage);
router.put('/users/:id/update-role', protectAdmin, controller.putUserUpdateRole);
router.put('/users/:id', protectAdmin, controller.putUser);
router.delete('/users/:id', protectAdmin, controller.deleteUser);

module.exports = router;
