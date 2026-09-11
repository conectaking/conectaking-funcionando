import '../vendor-globals.js';
/** Admin panel — Vite entry */
import '@css/admin/admin.css';

import '@mod/js/ck-auth-gate.js';
import '@mod/js/ck-csrf.js';
import { bindAdminTotpToggle } from '@mod/js/admin-totp-toggle.js';
import '@mod/admin/admin.js';
window.__ckBindAdminTotpToggle = bindAdminTotpToggle;
