const express = require('express');
const adminBrandingRoutes = require('../modules/admin/branding/branding.routes');
const adminOverviewRoutes = require('../modules/admin/overview/overview.routes');
const adminUsersRoutes = require('../modules/admin/users/users.routes');
const adminCodesRoutes = require('../modules/admin/codes/codes.routes');

const router = express.Router();

router.use(adminBrandingRoutes);
router.use(adminOverviewRoutes);
router.use(adminUsersRoutes);
router.use(adminCodesRoutes);

module.exports = router;
