<?php

namespace App\Http\Controllers\Booking;

use App\Http\Controllers\Controller;
use App\Services\Booking\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class BookingPublicController extends Controller
{
    public function __construct(private readonly BookingService $bookingService)
    {
    }

    /**
     * Resolve o usuário pelo slug do cartão/perfil.
     */
    private function resolveUserBySlug(string $slug): ?object
    {
        $identifier = trim($slug);
        if ($identifier === '') {
            return null;
        }

        $user = DB::selectOne("
            SELECT u.id, u.name, u.email, u.profile_slug,
                   p.display_name, p.profile_image_url, p.bio, p.background_color, p.button_color, p.card_background_color,
                   p.company_logo_url
            FROM users u
            LEFT JOIN profiles p ON p.user_id = u.id
            WHERE LOWER(u.profile_slug) = LOWER(?) OR u.id::text = ?
            LIMIT 1
        ", [$identifier, $identifier]);

        if ($user) {
            return $user;
        }

        // Busca por registration_codes se for código de ativação
        return DB::selectOne("
            SELECT u.id, u.name, u.email, u.profile_slug,
                   p.display_name, p.profile_image_url, p.bio, p.background_color, p.button_color, p.card_background_color,
                   p.company_logo_url
            FROM registration_codes c
            INNER JOIN users u ON u.id = c.claimed_by_user_id
            LEFT JOIN profiles p ON p.user_id = u.id
            WHERE LOWER(c.code) = LOWER(?)
              AND c.is_claimed = TRUE
              AND c.claimed_by_user_id IS NOT NULL
            LIMIT 1
        ", [$identifier]);
    }

    /**
     * GET /{slug}/agendar
     * Renderiza a página pública de agendamento online.
     */
    public function publicPage(Request $request, string $slug): View|\Illuminate\Http\RedirectResponse
    {
        $user = $this->resolveUserBySlug($slug);
        if (!$user) {
            abort(404, 'Perfil não encontrado.');
        }

        $userId = (int) $user->id;
        $settings = $this->bookingService->getSettings($userId);
        $services = $this->bookingService->getServices($userId, true);
        $professionals = $this->bookingService->getProfessionals($userId, true);

        return view('cartao.booking-public', [
            'user' => $user,
            'slug' => $user->profile_slug ?: $slug,
            'settings' => $settings,
            'services' => $services,
            'professionals' => $professionals,
        ]);
    }

    /**
     * GET /api/booking/public/{slug}/info
     * Retorna dados públicos para inicialização do frontend.
     */
    public function getPublicInfo(Request $request, string $slug): JsonResponse
    {
        $user = $this->resolveUserBySlug($slug);
        if (!$user) {
            return response()->json(['error' => 'Perfil não encontrado'], 404);
        }

        $userId = (int) $user->id;
        $settings = $this->bookingService->getSettings($userId);
        $services = $this->bookingService->getServices($userId, true);
        $professionals = $this->bookingService->getProfessionals($userId, true);

        return response()->json([
            'business' => [
                'name' => $settings->business_name ?: $user->display_name ?: $user->name,
                'phone' => $settings->business_phone,
                'address' => $settings->business_address,
                'avatar_url' => $user->profile_image_url ?: 'https://i.ibb.co/60sW9k75/logo.png',
                'working_hours' => $settings->working_hours,
                'max_days_advance' => $settings->max_days_advance,
            ],
            'services' => $services,
            'professionals' => $professionals,
        ]);
    }

    /**
     * GET /api/booking/public/{slug}/slots
     * Retorna os horários disponíveis para a data e serviço selecionados.
     */
    public function getSlots(Request $request, string $slug): JsonResponse
    {
        $user = $this->resolveUserBySlug($slug);
        if (!$user) {
            return response()->json(['error' => 'Perfil não encontrado'], 404);
        }

        $date = (string) $request->query('date', '');
        $duration = max(5, (int) $request->query('duration', 30));
        $profId = $request->query('professional_id') ? (int) $request->query('professional_id') : null;

        if (empty($date) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return response()->json(['error' => 'Data inválida (formato esperado YYYY-MM-DD)'], 422);
        }

        $slots = $this->bookingService->getAvailableSlots((int) $user->id, $date, $duration, $profId);

        return response()->json([
            'date' => $date,
            'duration' => $duration,
            'slots' => $slots,
        ]);
    }

    /**
     * POST /api/booking/public/{slug}/book
     * Efetua o agendamento público do cliente.
     */
    public function book(Request $request, string $slug): JsonResponse
    {
        $user = $this->resolveUserBySlug($slug);
        if (!$user) {
            return response()->json(['error' => 'Perfil não encontrado'], 404);
        }

        $validated = $request->validate([
            'service_id' => 'required|integer',
            'professional_id' => 'nullable|integer',
            'client_name' => 'required|string|max:150',
            'client_phone' => 'required|string|max:30',
            'client_email' => 'nullable|email|max:255',
            'appointment_date' => 'required|date_format:Y-m-d',
            'start_time' => 'required|string|max:10',
            'notes' => 'nullable|string|max:500',
        ]);

        try {
            $appointment = $this->bookingService->createAppointment((int) $user->id, $validated);

            // Monta link do WhatsApp para o cliente salvar ou mandar mensagem de confirmação
            $phoneClean = preg_replace('/\D/', '', (string) ($appointment->business_phone ?? $user->notification_phone ?? ''));
            $whatsappUrl = null;
            if ($phoneClean) {
                if (strlen($phoneClean) <= 11 && !str_starts_with($phoneClean, '55')) {
                    $phoneClean = '55' . $phoneClean;
                }
                $msg = "Olá! Acabei de agendar pelo Conecta King:\n"
                    . "✂️ *{$appointment->service_name}*\n"
                    . "📅 *" . date('d/m/Y', strtotime($appointment->appointment_date)) . " às " . substr($appointment->start_time, 0, 5) . "*\n"
                    . "👤 *{$appointment->client_name}*";
                $whatsappUrl = "https://wa.me/{$phoneClean}?text=" . rawurlencode($msg);
            }

            return response()->json([
                'success' => true,
                'message' => 'Agendamento realizado com sucesso!',
                'appointment' => $appointment,
                'whatsapp_url' => $whatsappUrl,
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 409);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Ocorreu um erro ao processar o agendamento.'], 500);
        }
    }
}
