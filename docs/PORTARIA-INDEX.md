# Portaria — índice de ficheiros

| Área | Caminho |
|---|---|
| Página | `laravel/resources/views/cartao/guest-portaria.blade.php` |
| JS | `laravel/resources/js/pages/cartao-guest-portaria.js` |
| CSS | `laravel/resources/css/pub/pages/cartao-guest-portaria.css` (se existir) |
| Controller | `laravel/app/Http/Controllers/CartaoVirtual/GuestListPublicController.php` |
| Service | `laravel/app/Services/CartaoVirtual/GuestListPublicService.php` |
| Admin | `GuestListAdminService.php` / `GuestListAdminController.php` |
| Rotas | `laravel/routes/web.php` (`/portaria/*`, `/guest-list/confirm/*`) |
| Migrations | `migrations/115_*`, `116_*`, `238_form_entry_mode.sql` |

Throttle: portaria/check-in/CPF (ver rotas). CPF completo obrigatório para auto check-in.
