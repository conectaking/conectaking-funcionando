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

    public const UF_MAP = [
        'AC' => 'Acre',
        'AL' => 'Alagoas',
        'AP' => 'Amapá',
        'AM' => 'Amazonas',
        'BA' => 'Bahia',
        'CE' => 'Ceará',
        'DF' => 'Distrito Federal',
        'ES' => 'Espírito Santo',
        'GO' => 'Goiás',
        'MA' => 'Maranhão',
        'MT' => 'Mato Grosso',
        'MS' => 'Mato Grosso do Sul',
        'MG' => 'Minas Gerais',
        'PA' => 'Pará',
        'PB' => 'Paraíba',
        'PR' => 'Paraná',
        'PE' => 'Pernambuco',
        'PI' => 'Piauí',
        'RJ' => 'Rio de Janeiro',
        'RN' => 'Rio Grande do Norte',
        'RS' => 'Rio Grande do Sul',
        'RO' => 'Rondônia',
        'RR' => 'Roraima',
        'SC' => 'Santa Catarina',
        'SP' => 'São Paulo',
        'SE' => 'Sergipe',
        'TO' => 'Tocantins',
    ];

    public function geocode(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $uf = strtoupper(trim((string) ($request->query('uf') ?? $request->query('state') ?? '')));
        $city = trim((string) $request->query('city', ''));
        $limit = min(15, max(1, (int) $request->query('limit', 10)));

        if ($q === '' && $city === '' && $uf === '') {
            return response()->json([], 200)->header('X-Conecta-Engine', 'laravel');
        }

        $stateName = self::UF_MAP[$uf] ?? ($uf !== '' ? $uf : null);

        // Build composed query
        $composedQuery = $q;
        if ($city !== '' && stripos($composedQuery, $city) === false) {
            $composedQuery .= ($composedQuery !== '' ? ', ' : '') . $city;
        }
        if ($stateName && stripos($composedQuery, $stateName) === false && stripos($composedQuery, $uf) === false) {
            $composedQuery .= ($composedQuery !== '' ? ', ' : '') . $stateName;
        }
        $composedQuery = trim($composedQuery, ', ');

        $cacheKey = 'geocode_search_v3_'.md5(mb_strtolower("{$composedQuery}_{$uf}_{$city}_{$limit}"));
        $results = \Illuminate\Support\Facades\Cache::remember($cacheKey, 86400, function () use ($composedQuery, $q, $stateName, $uf, $city, $limit) {
            $parsedResults = [];

            // 1. Try Nominatim with composedQuery (and countrycodes=br)
            try {
                $params = [
                    'q' => $composedQuery,
                    'format' => 'json',
                    'limit' => $limit,
                    'addressdetails' => 1,
                    'countrycodes' => 'br',
                ];

                $resp = \Illuminate\Support\Facades\Http::timeout(6)
                    ->withHeaders([
                        'User-Agent' => 'ConectaKing/1.0 (https://conectaking.com.br; contato@conectaking.com.br)',
                        'Accept' => 'application/json',
                    ])
                    ->get('https://nominatim.openstreetmap.org/search', $params);

                if ($resp->successful()) {
                    $data = $resp->json();
                    if (is_array($data) && count($data) > 0) {
                        $parsedResults = $this->formatNominatimResults($data, $uf, $stateName);
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('Geocode nominatim primary failed: '.$e->getMessage());
            }

            // 2. If nothing found and city/state was appended, try free-form with stateName fallback
            if (empty($parsedResults) && ($composedQuery !== $q && $q !== '')) {
                try {
                    $resp = \Illuminate\Support\Facades\Http::timeout(5)
                        ->withHeaders([
                            'User-Agent' => 'ConectaKing/1.0 (https://conectaking.com.br; contato@conectaking.com.br)',
                            'Accept' => 'application/json',
                        ])
                        ->get('https://nominatim.openstreetmap.org/search', [
                            'q' => $q . ($stateName ? ", {$stateName}" : ''),
                            'format' => 'json',
                            'limit' => $limit,
                            'addressdetails' => 1,
                            'countrycodes' => 'br',
                        ]);

                    if ($resp->successful()) {
                        $data = $resp->json();
                        if (is_array($data) && count($data) > 0) {
                            $parsedResults = $this->formatNominatimResults($data, $uf, $stateName);
                        }
                    }
                } catch (\Throwable $e) {
                    Log::warning('Geocode nominatim secondary failed: '.$e->getMessage());
                }
            }

            // 3. Fallback: Photon API
            if (empty($parsedResults)) {
                try {
                    $photonQ = ($composedQuery !== '' ? $composedQuery : $q) . ', Brasil';
                    $resp = \Illuminate\Support\Facades\Http::timeout(5)
                        ->withHeaders([
                            'User-Agent' => 'ConectaKing/1.0',
                            'Accept' => 'application/json',
                        ])
                        ->get('https://photon.komoot.io/api/', [
                            'q' => $photonQ,
                            'limit' => $limit,
                        ]);

                    if ($resp->successful()) {
                        $json = $resp->json();
                        $features = $json['features'] ?? [];
                        foreach ($features as $f) {
                            $coords = $f['geometry']['coordinates'] ?? [0, 0];
                            $props = $f['properties'] ?? [];
                            $nameParts = array_filter([
                                $props['name'] ?? null,
                                $props['street'] ?? null,
                                $props['housenumber'] ?? null,
                                $props['district'] ?? null,
                                $props['city'] ?? $props['town'] ?? $props['village'] ?? null,
                                $props['state'] ?? null,
                                $props['country'] ?? null,
                            ]);
                            $cCity = (string) ($props['city'] ?? $props['town'] ?? $props['village'] ?? '');
                            $cState = (string) ($props['state'] ?? '');
                            $badge = trim(($cCity !== '' ? $cCity : '') . ($cState !== '' ? ' - ' . $cState : ''), ' - ');
                            $parsedResults[] = [
                                'lat' => (string) ($coords[1] ?? 0),
                                'lon' => (string) ($coords[0] ?? 0),
                                'display_name' => implode(', ', $nameParts),
                                'street' => (string) ($props['street'] ?? $props['name'] ?? ''),
                                'house_number' => (string) ($props['housenumber'] ?? ''),
                                'suburb' => (string) ($props['district'] ?? ''),
                                'city' => $cCity,
                                'state' => $cState,
                                'uf' => '',
                                'postcode' => (string) ($props['postcode'] ?? ''),
                                'badge' => $badge,
                            ];
                        }
                    }
                } catch (\Throwable $e) {
                    Log::warning('Geocode photon fallback failed: '.$e->getMessage());
                }
            }

            return $parsedResults;
        });

        return response()->json($results, 200)->header('X-Conecta-Engine', 'laravel');
    }

    private function formatNominatimResults(array $items, string $filterUf = '', ?string $filterStateName = null): array
    {
        $out = [];
        $ufMapFlipped = array_flip(self::UF_MAP);

        foreach ($items as $item) {
            $addr = $item['address'] ?? [];
            $lat = (string) ($item['lat'] ?? 0);
            $lon = (string) ($item['lon'] ?? 0);
            $displayName = (string) ($item['display_name'] ?? '');

            $street = (string) ($addr['road'] ?? $addr['street'] ?? $addr['pedestrian'] ?? $item['name'] ?? '');
            $houseNumber = (string) ($addr['house_number'] ?? '');
            $suburb = (string) ($addr['suburb'] ?? $addr['neighbourhood'] ?? $addr['quarter'] ?? $addr['city_district'] ?? '');
            $city = (string) ($addr['city'] ?? $addr['town'] ?? $addr['village'] ?? $addr['municipality'] ?? '');
            $state = (string) ($addr['state'] ?? $addr['state_district'] ?? '');
            $postcode = (string) ($addr['postcode'] ?? '');

            $ufCode = $ufMapFlipped[$state] ?? '';
            if ($ufCode === '' && strlen($state) === 2) {
                $ufCode = strtoupper($state);
            }

            $badgeParts = array_filter([$suburb, $city, $ufCode ?: $state]);
            $badge = implode(', ', $badgeParts);

            $out[] = [
                'lat' => $lat,
                'lon' => $lon,
                'display_name' => $displayName,
                'street' => $street,
                'house_number' => $houseNumber,
                'suburb' => $suburb,
                'city' => $city,
                'state' => $state,
                'uf' => $ufCode,
                'postcode' => $postcode,
                'badge' => $badge ?: $city,
            ];
        }

        if ($filterUf !== '' || $filterStateName !== null) {
            usort($out, function ($a, $b) use ($filterUf, $filterStateName) {
                $aMatch = ($filterUf !== '' && strcasecmp($a['uf'] ?? '', $filterUf) === 0) ||
                          ($filterStateName !== null && stripos($a['state'] ?? '', $filterStateName) !== false);
                $bMatch = ($filterUf !== '' && strcasecmp($b['uf'] ?? '', $filterUf) === 0) ||
                          ($filterStateName !== null && stripos($b['state'] ?? '', $filterStateName) !== false);
                if ($aMatch === $bMatch) return 0;
                return $aMatch ? -1 : 1;
            });
        }

        return $out;
    }

    public function reverseGeocode(Request $request)
    {
        $lat = trim((string) ($request->query('lat') ?? ''));
        $lon = trim((string) ($request->query('lon') ?? $request->query('lng') ?? ''));

        if ($lat === '' || $lon === '') {
            return response()->json(['display_name' => ''], 200)->header('X-Conecta-Engine', 'laravel');
        }

        $cacheKey = 'geocode_rev_v3_'.md5("{$lat}_{$lon}");
        $result = \Illuminate\Support\Facades\Cache::remember($cacheKey, 86400, function () use ($lat, $lon) {
            $ufMapFlipped = array_flip(self::UF_MAP);
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
                        $addr = $data['address'] ?? [];
                        $state = (string) ($addr['state'] ?? '');
                        $ufCode = $ufMapFlipped[$state] ?? (strlen($state) === 2 ? strtoupper($state) : '');
                        $city = (string) ($addr['city'] ?? $addr['town'] ?? $addr['village'] ?? $addr['municipality'] ?? '');
                        $street = (string) ($addr['road'] ?? $addr['street'] ?? '');
                        $suburb = (string) ($addr['suburb'] ?? $addr['neighbourhood'] ?? '');
                        $postcode = (string) ($addr['postcode'] ?? '');

                        return [
                            'display_name' => (string) ($data['display_name'] ?? ''),
                            'lat' => (string) ($data['lat'] ?? $lat),
                            'lon' => (string) ($data['lon'] ?? $lon),
                            'street' => $street,
                            'suburb' => $suburb,
                            'city' => $city,
                            'state' => $state,
                            'uf' => $ufCode,
                            'postcode' => $postcode,
                        ];
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('Reverse geocode nominatim failed: '.$e->getMessage());
            }

            return ['display_name' => '', 'lat' => $lat, 'lon' => $lon, 'uf' => '', 'city' => ''];
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
