<?php

namespace App\Http\Controllers\Booking;

use App\Http\Controllers\Controller;
use App\Services\Booking\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class BookingAdminController extends Controller
{
    public function __construct(private readonly BookingService $bookingService)
    {
    }

    private function getUserId(Request $request): int
    {
        $userId = (int) ($request->attributes->get('auth_user_id') ?: $request->user()?->id);
        if (!$userId) {
            abort(401, 'Não autenticado');
        }
        return $userId;
    }

    /**
     * GET /agenda
     * Página do painel administrativo de agendamentos.
     */
    public function dashboardPage(Request $request): View
    {
        return view('pages.dashboard-agenda');
    }

    /**
     * GET /api/booking/settings
     */
    public function getSettings(Request $request): JsonResponse
    {
        $userId = $this->getUserId($request);
        $settings = $this->bookingService->getSettings($userId);
        return response()->json($settings);
    }

    /**
     * PUT /api/booking/settings
     */
    public function saveSettings(Request $request): JsonResponse
    {
        $userId = $this->getUserId($request);
        $settings = $this->bookingService->saveSettings($userId, $request->all());
        return response()->json($settings);
    }

    /**
     * GET /api/booking/services
     */
    public function getServices(Request $request): JsonResponse
    {
        $userId = $this->getUserId($request);
        $services = $this->bookingService->getServices($userId);
        return response()->json($services);
    }

    /**
     * POST /api/booking/services
     */
    public function createService(Request $request): JsonResponse
    {
        $userId = $this->getUserId($request);
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string|max:1000',
            'duration_minutes' => 'required|integer|min:5|max:480',
            'price' => 'required|numeric|min:0',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $service = $this->bookingService->saveService($userId, $validated);
        return response()->json($service, 201);
    }

    /**
     * PUT /api/booking/services/{id}
     */
    public function updateService(Request $request, int $id): JsonResponse
    {
        $userId = $this->getUserId($request);
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string|max:1000',
            'duration_minutes' => 'required|integer|min:5|max:480',
            'price' => 'required|numeric|min:0',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $service = $this->bookingService->saveService($userId, $validated, $id);
        return response()->json($service);
    }

    /**
     * DELETE /api/booking/services/{id}
     */
    public function deleteService(Request $request, int $id): JsonResponse
    {
        $userId = $this->getUserId($request);
        $success = $this->bookingService->deleteService($userId, $id);
        return response()->json(['success' => $success]);
    }

    /**
     * GET /api/booking/professionals
     */
    public function getProfessionals(Request $request): JsonResponse
    {
        $userId = $this->getUserId($request);
        $profs = $this->bookingService->getProfessionals($userId);
        return response()->json($profs);
    }

    /**
     * POST /api/booking/professionals
     */
    public function createProfessional(Request $request): JsonResponse
    {
        $userId = $this->getUserId($request);
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'avatar_url' => 'nullable|string|max:500',
            'phone' => 'nullable|string|max:30',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $prof = $this->bookingService->saveProfessional($userId, $validated);
        return response()->json($prof, 201);
    }

    /**
     * PUT /api/booking/professionals/{id}
     */
    public function updateProfessional(Request $request, int $id): JsonResponse
    {
        $userId = $this->getUserId($request);
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'avatar_url' => 'nullable|string|max:500',
            'phone' => 'nullable|string|max:30',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $prof = $this->bookingService->saveProfessional($userId, $validated, $id);
        return response()->json($prof);
    }

    /**
     * DELETE /api/booking/professionals/{id}
     */
    public function deleteProfessional(Request $request, int $id): JsonResponse
    {
        $userId = $this->getUserId($request);
        $success = $this->bookingService->deleteProfessional($userId, $id);
        return response()->json(['success' => $success]);
    }

    /**
     * GET /api/booking/appointments
     */
    public function getAppointments(Request $request): JsonResponse
    {
        $userId = $this->getUserId($request);
        $filters = [
            'date' => $request->query('date'),
            'status' => $request->query('status'),
            'start_date' => $request->query('start_date'),
            'end_date' => $request->query('end_date'),
        ];

        $appointments = $this->bookingService->getAppointments($userId, array_filter($filters));
        return response()->json($appointments);
    }

    /**
     * PUT /api/booking/appointments/{id}/status
     */
    public function updateAppointmentStatus(Request $request, int $id): JsonResponse
    {
        $userId = $this->getUserId($request);
        $validated = $request->validate([
            'status' => 'required|string|in:pending,confirmed,completed,cancelled',
            'reason' => 'nullable|string|max:500',
        ]);

        try {
            $appointment = $this->bookingService->updateStatus($userId, $id, $validated['status'], $validated['reason'] ?? null);
            return response()->json($appointment);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
}
