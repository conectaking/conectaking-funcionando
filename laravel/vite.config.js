import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const legacyPublic = process.env.VITE_LEGACY_PUBLIC
    ? path.resolve(process.env.VITE_LEGACY_PUBLIC)
    : path.resolve(__dirname, '../public');

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.js',
                'resources/js/pages/login.js',
                'resources/js/pages/registro.js',
                'resources/js/pages/recuperar-senha.js',
                'resources/js/pages/resetar-senha.js',
                'resources/js/pages/dashboard.js',
                'resources/js/pages/kingForms.js',
                'resources/js/pages/formPageEdit.js',
                'resources/js/pages/kingSelectionReview.js',
                'resources/js/pages/kingSelectionGallery.js',
                'resources/js/pages/kingSelectionCliente.js',
                'resources/js/pages/kingSelectionProject.js',
                'resources/js/pages/kingSelectionEdit.js',
                'resources/js/pages/admin-devocionais-365.js',
                'resources/js/pages/admin-planos.js',
                'resources/js/pages/admin.js',
                'resources/js/pages/conta.js',
                'resources/js/pages/salesPageEdit.js',
                'resources/js/pages/guestListEdit.js',
            ],
            refresh: true,
        }),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@legacy': legacyPublic,
        },
    },
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
        fs: {
            allow: [legacyPublic, path.resolve(__dirname)],
        },
    },
    build: {
        // Painel legado é grande; evita aviso/ruído no CI
        chunkSizeWarningLimit: 2500,
    },
});
