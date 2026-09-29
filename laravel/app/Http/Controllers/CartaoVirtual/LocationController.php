<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\LocationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LocationController extends Controller
{
    public function __construct(private readonly LocationService $location)
    {
    }

    public function show(Request $request, string $itemId)
    {
        $id = (int) $itemId;
        if ($id <= 0) {
            return $this->error('itemId inválido', 400);
        }

        return $this->run(
            fn (): array => $this->location->getConfig($id, (string) $request->attributes->get('auth_user_id')),
            'Erro ao buscar localização'
        );
    }

    public function update(Request $request, string $itemId)
    {
        $id = (int) $itemId;
        if ($id <= 0) {
            return $this->error('itemId inválido', 400);
        }

        return $this->run(fn (): array => $this->location->saveConfig(
            $id,
            (string) $request->attributes->get('auth_user_id'),
            is_array($request->all()) ? $request->all() : []
        ), 'Erro ao salvar localização');
    }

    public function geocode(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        if ($q === '') {
            return response()->json([], 200)->header('X-Conecta-Engine', 'laravel');
        }

        $cacheKey = 'geocode_search_'.md5(mb_strtolower($q));
        $results = \Illuminate\Support\Facades\Cache::remember($cacheKey, 86400, function () use ($q) {
            try {
                $resp = \Illuminate\Support\Facades\Http::timeout(6)
                    ->withHeaders([
                        'User-Agent' => 'ConectaKing/1.0 (https://conectaking.com.br; contato@conectaking.com.br)',
                        'Accept' => 'application/json',
                    ])
                    ->get('https://nominatim.openstreetmap.org/search', [
                        'q' => $q,
                        'format' => 'json',
                        'limit' => 5,
                        'addressdetails' => 1,
                    ]);

                if ($resp->successful()) {
                    $data = $resp->json();
                    if (is_array($data) && count($data) > 0) {
                        return $data;
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('Geocode nominatim failed: '.$e->getMessage());
            }

            // Fallback: Photon API (OpenStreetMap-based search engine)
            try {
                $resp = \Illuminate\Support\Facades\Http::timeout(6)
                    ->withHeaders([
                        'User-Agent' => 'ConectaKing/1.0',
                        'Accept' => 'application/json',
                    ])
                    ->get('https://photon.komoot.io/api/', [
                        'q' => $q,
                        'limit' => 5,
                    ]);

                if ($resp->successful()) {
                    $json = $resp->json();
                    $features = $json['features'] ?? [];
                    $out = [];
                    foreach ($features as $f) {
                        $coords = $f['geometry']['coordinates'] ?? [0, 0];
                        $props = $f['properties'] ?? [];
                        $nameParts = array_filter([
                            $props['name'] ?? null,
                            $props['street'] ?? null,
                            $props['housenumber'] ?? null,
                            $props['city'] ?? $props['town'] ?? $props['village'] ?? null,
                            $props['state'] ?? null,
                            $props['country'] ?? null,
                        ]);
                        $out[] = [
                            'lat' => (string) ($coords[1] ?? 0),
                            'lon' => (string) ($coords[0] ?? 0),
                            'display_name' => implode(', ', $nameParts),
                        ];
                    }
                    if (count($out) > 0) {
                        return $out;
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('Geocode photon fallback failed: '.$e->getMessage());
            }

            return [];
        });

        return response()->json($results, 200)->header('X-Conecta-Engine', 'laravel');
    }

    public function reverseGeocode(Request $request)
    {
        $lat = trim((string) ($request->query('lat') ?? ''));
        $lon = trim((string) ($request->query('lon') ?? $request->query('lng') ?? ''));

        if ($lat === '' || $lon === '') {
            return response()->json(['display_name' => ''], 200)->header('X-Conecta-Engine', 'laravel');
        }

        $cacheKey = 'geocode_rev_'.md5("{$lat}_{$lon}");
        $result = \Illuminate\Support\Facades\Cache::remember($cacheKey, 86400, function () use ($lat, $lon) {
            try {
                $resp = \Illuminate\Support\Facades\Http::timeout(6)
                    ->withHeaders([
                        'User-Agent' => 'ConectaKing/1.0 (https://conectaking.com.br; contato@conectaking.com.br)',
                        'Accept' => 'application/json',
                    ])
                    ->get('https://nominatim.openstreetmap.org/reverse', [
                        'lat' => $lat,
                        'lon' => $lon,
                        'format' => 'json',
                        'addressdetails' => 1,
                    ]);

                if ($resp->successful()) {
                    $data = $resp->json();
                    if (is_array($data)) {
                        return [
                            'display_name' => (string) ($data['display_name'] ?? ''),
                            'lat' => (string) ($data['lat'] ?? $lat),
                            'lon' => (string) ($data['lon'] ?? $lon),
                        ];
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('Reverse geocode nominatim failed: '.$e->getMessage());
            }

            return ['display_name' => '', 'lat' => $lat, 'lon' => $lon];
        });

        return response()->json($result, 200)->header('X-Conecta-Engine', 'laravel');
    }

    /**
     * @param  callable():array{status:int, body:array<string,mixed>}  $handler
     */
    private function run(callable $handler, string $fallbackMessage)
    {
        try {
            $r = $handler();

            return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            Log::error('location: '.$e->getMessage());

            return $this->error($fallbackMessage, 500);
        }
    }

    private function error(string $message, int $status)
    {
        return response()->json([
            'success' => false,
            'data' => null,
            'message' => $message,
            'error' => ['code' => 'ERROR', 'message' => $message],
        ], $status)->header('X-Conecta-Engine', 'laravel');
    }
}
