<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\KingSelectionFaceService;
use Illuminate\Http\Request;

class KingSelectionFacialController extends Controller
{
    public function __construct(private readonly KingSelectionFaceService $face)
    {
    }

    public function status(Request $request)
    {
        $r = $this->face->facialStatus(
            (string) $request->attributes->get('auth_user_id'),
            (int) ($request->query('galleryId') ?? 0)
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function clients(Request $request)
    {
        $r = $this->face->facialClients(
            (string) $request->attributes->get('auth_user_id'),
            (int) ($request->query('galleryId') ?? 0)
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function jobs(Request $request)
    {
        $r = $this->face->facialJobs(
            (string) $request->attributes->get('auth_user_id'),
            (int) ($request->query('galleryId') ?? 0),
            (int) ($request->query('limit') ?? 50)
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function matches(Request $request)
    {
        $r = $this->face->facialMatches(
            (string) $request->attributes->get('auth_user_id'),
            (int) ($request->query('galleryId') ?? 0),
            (int) ($request->query('clientId') ?? 0)
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function process(Request $request)
    {
        $galleryId = (int) ($request->query('galleryId') ?? $request->input('galleryId') ?? 0);
        $r = $this->face->facialProcess(
            (string) $request->attributes->get('auth_user_id'),
            $galleryId,
            $request->all()
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function progress(Request $request)
    {
        $r = $this->face->facialProgress(
            (string) $request->attributes->get('auth_user_id'),
            (int) ($request->query('galleryId') ?? 0)
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function deleteClientFaces(Request $request, string $clientId)
    {
        $r = $this->face->facialDeleteClientFaces(
            (string) $request->attributes->get('auth_user_id'),
            (int) ($request->query('galleryId') ?? 0),
            (int) $clientId
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function diagnose(Request $request)
    {
        $gid = (int) ($request->query('galleryId') ?? 0);
        $r = $this->face->facialDiagnose(
            (string) $request->attributes->get('auth_user_id'),
            $gid > 0 ? $gid : null
        );

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function awsCheck()
    {
        $r = $this->face->awsCheck();

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function awsPing()
    {
        $r = $this->face->awsPing();

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }
}
