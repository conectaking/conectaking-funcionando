const fs = require('fs');
let h = fs.readFileSync('public/admin/index.html', 'utf8');
h = h.replace(/href="admin\.css[^"]*"/, 'href="/admin/admin.css?v=2026-09-09-blade1"');
h = h.replace(/src="admin\.js[^"]*"/, 'src="/admin/admin.js?v=2026-09-09-blade1"');
h = '{{-- Painel ADM (Blade; assets em /admin/*.js|css) --}}\n' + h;
fs.writeFileSync('laravel/resources/views/pages/admin.blade.php', h);
console.log('wrote admin.blade.php', h.length);
