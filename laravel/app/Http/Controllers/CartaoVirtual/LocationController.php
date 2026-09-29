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

    public function cep(Request $request, string $cep)
    {
        $cleanCep = preg_replace('/\D/', '', $cep);
        if (strlen($cleanCep) !== 8) {
            return response()->json(['erro' => 'CEP inválido'], 400)->header('X-Conecta-Engine', 'laravel');
        }

        $cacheKey = 'viacep_' . $cleanCep;
        $data = \Illuminate\Support\Facades\Cache::remember($cacheKey, 604800, function () use ($cleanCep) {
            try {
                $resp = \Illuminate\Support\Facades\Http::timeout(5)
                    ->withHeaders(['User-Agent' => 'ConectaKing/1.0'])
                    ->get("https://viacep.com.br/ws/{$cleanCep}/json/");

                if ($resp->successful()) {
                    $json = $resp->json();
                    if (!isset($json['erro'])) {
                        return $json;
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('ViaCEP failed: ' . $e->getMessage());
            }

            // Fallback BrasilAPI
            try {
                $resp = \Illuminate\Support\Facades\Http::timeout(5)
                    ->withHeaders(['User-Agent' => 'ConectaKing/1.0'])
                    ->get("https://brasilapi.com.br/api/cep/v1/{$cleanCep}");

                if ($resp->successful()) {
                    $bJson = $resp->json();
                    return [
                        'cep' => $cleanCep,
                        'logradouro' => $bJson['street'] ?? '',
                        'bairro' => $bJson['neighborhood'] ?? '',
                        'localidade' => $bJson['city'] ?? '',
                        'uf' => $bJson['state'] ?? '',
                    ];
                }
            } catch (\Throwable $e) {
                Log::warning('BrasilAPI CEP fallback failed: ' . $e->getMessage());
            }

            return ['erro' => true];
        });

        return response()->json($data, 200)->header('X-Conecta-Engine', 'laravel');
    }

    public function geocode(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $number = trim((string) $request->query('number', ''));
        $bairro = trim((string) $request->query('bairro', ''));
        $city = trim((string) $request->query('city', ''));
        $uf = strtoupper(trim((string) ($request->query('uf') ?? $request->query('state') ?? '')));
        $cep = preg_replace('/\D/', '', (string) $request->query('cep', ''));
        $limit = min(20, max(1, (int) $request->query('limit', 12)));

        if ($q === '' && $city === '' && $uf === '' && $cep === '') {
            return response()->json([], 200)->header('X-Conecta-Engine', 'laravel');
        }

        // Se número não foi passado explicitamente, extrai número de $q se existir
        $cleanStreet = $q;
        if ($number === '' && preg_match('/\b(?:n[ºo°]?\s*)?(\d{1,5})\b/i', $q, $m)) {
            $number = $m[1];
            $cleanStreet = trim(preg_replace('/\b(?:n[ºo°]?\s*)?' . preg_quote($number, '/') . '\b/i', '', $q));
            $cleanStreet = trim($cleanStreet, " ,\t\n\r\0\x0B");
        }

        // Se CEP de 8 dígitos foi enviado, resolve dados via ViaCEP se rua/cidade estiverem vazias
        if (strlen($cep) === 8 && ($cleanStreet === '' || $city === '')) {
            try {
                $viaData = \Illuminate\Support\Facades\Cache::remember('viacep_' . $cep, 604800, function () use ($cep) {
                    $r = \Illuminate\Support\Facades\Http::timeout(3)->get("https://viacep.com.br/ws/{$cep}/json/");
                    return $r->successful() ? $r->json() : null;
                });
                if ($viaData && !isset($viaData['erro'])) {
                    if ($cleanStreet === '' && !empty($viaData['logradouro'])) {
                        $cleanStreet = $viaData['logradouro'];
                    }
                    if ($bairro === '' && !empty($viaData['bairro'])) {
                        $bairro = $viaData['bairro'];
                    }
                    if ($city === '' && !empty($viaData['localidade'])) {
                        $city = $viaData['localidade'];
                    }
                    if ($uf === '' && !empty($viaData['uf'])) {
                        $uf = strtoupper($viaData['uf']);
                    }
                }
            } catch (\Throwable $e) {}
        }

        $stateName = self::UF_MAP[$uf] ?? ($uf !== '' ? $uf : null);

        $cacheKey = 'geocode_search_v4_' . md5(mb_strtolower("{$cleanStreet}_{$number}_{$bairro}_{$city}_{$uf}_{$limit}"));
        $results = \Illuminate\Support\Facades\Cache::remember($cacheKey, 86400, function () use ($cleanStreet, $number, $bairro, $city, $uf, $stateName, $limit) {
            $parsedResults = [];

            // 1. Prioridade: Busca estruturada no Nominatim se rua e cidade/estado estiverem presentes
            if ($cleanStreet !== '' && ($city !== '' || $stateName !== null)) {
                try {
                    $structuredParams = [
                        'street' => $cleanStreet,
                        'format' => 'json',
                        'limit' => $limit,
                        'addressdetails' => 1,
                        'countrycodes' => 'br',
                    ];
                    if ($city !== '') $structuredParams['city'] = $city;
                    if ($stateName !== null) $structuredParams['state'] = $stateName;
                    $structuredParams['country'] = 'Brasil';

                    $resp = \Illuminate\Support\Facades\Http::timeout(6)
                        ->withHeaders([
                            'User-Agent' => 'ConectaKing/1.0 (https://conectaking.com.br; contato@conectaking.com.br)',
                            'Accept' => 'application/json',
                        ])
                        ->get('https://nominatim.openstreetmap.org/search', $structuredParams);

                    if ($resp->successful()) {
                        $data = $resp->json();
                        if (is_array($data) && count($data) > 0) {
                            $parsedResults = $this->formatNominatimResults($data, $uf, $stateName, $number, $city);
                        }
                    }
                } catch (\Throwable $e) {
                    Log::warning('Geocode nominatim structured failed: ' . $e->getMessage());
                }
            }

            // 2. Se a busca estruturada não retornou nada, tenta busca composta
            if (empty($parsedResults)) {
                $composedQuery = $cleanStreet !== '' ? $cleanStreet : '';
                if ($bairro !== '' && stripos($composedQuery, $bairro) === false) {
                    $composedQuery .= ($composedQuery !== '' ? ', ' : '') . $bairro;
                }
                if ($city !== '' && stripos($composedQuery, $city) === false) {
                    $composedQuery .= ($composedQuery !== '' ? ', ' : '') . $city;
                }
                if ($stateName && stripos($composedQuery, $stateName) === false && stripos($composedQuery, $uf) === false) {
                    $composedQuery .= ($composedQuery !== '' ? ', ' : '') . $stateName;
                }
                $composedQuery .= ', Brasil';
                $composedQuery = trim($composedQuery, ', ');

                try {
                    $resp = \Illuminate\Support\Facades\Http::timeout(6)
                        ->withHeaders([
                            'User-Agent' => 'ConectaKing/1.0 (https://conectaking.com.br; contato@conectaking.com.br)',
                            'Accept' => 'application/json',
                        ])
                        ->get('https://nominatim.openstreetmap.org/search', [
                            'q' => $composedQuery,
                            'format' => 'json',
                            'limit' => $limit,
                            'addressdetails' => 1,
                            'countrycodes' => 'br',
                        ]);

                    if ($resp->successful()) {
                        $data = $resp->json();
                        if (is_array($data) && count($data) > 0) {
                            $parsedResults = $this->formatNominatimResults($data, $uf, $stateName, $number, $city);
                        }
                    }
                } catch (\Throwable $e) {
                    Log::warning('Geocode nominatim composed failed: ' . $e->getMessage());
                }
            }

            // 3. Fallback: Photon API
            if (empty($parsedResults)) {
                try {
                    $photonQ = trim(($cleanStreet ?: '') . ($city ? ", {$city}" : '') . ($stateName ? ", {$stateName}" : '') . ', Brasil', ', ');
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
                            $cStreet = (string) ($props['street'] ?? $props['name'] ?? '');
                            $cCity = (string) ($props['city'] ?? $props['town'] ?? $props['village'] ?? '');
                            $cState = (string) ($props['state'] ?? '');
                            $cSuburb = (string) ($props['district'] ?? '');
                            $cPostcode = (string) ($props['postcode'] ?? '');

                            $stWithNum = $cStreet;
                            if ($number !== '' && !preg_match('/\b' . preg_quote($number, '/') . '\b/', $stWithNum)) {
                                $stWithNum .= ', ' . $number;
                            }

                            $fullParts = array_filter([$stWithNum, $cSuburb, $cCity, $cState, $cPostcode, 'Brasil']);
                            $displayName = implode(', ', $fullParts);
                            $badge = trim(($cSuburb !== '' ? $cSuburb . ', ' : '') . ($cCity !== '' ? $cCity : '') . ($cState !== '' ? ' - ' . $cState : ''), ' - ,');

                            $parsedResults[] = [
                                'lat' => (string) ($coords[1] ?? 0),
                                'lon' => (string) ($coords[0] ?? 0),
                                'display_name' => $displayName,
                                'street' => $stWithNum,
                                'house_number' => $number ?: (string) ($props['housenumber'] ?? ''),
                                'suburb' => $cSuburb,
                                'city' => $cCity,
                                'state' => $cState,
                                'uf' => '',
                                'postcode' => $cPostcode,
                                'badge' => $badge,
                            ];
                        }
                    }
                } catch (\Throwable $e) {
                    Log::warning('Geocode photon fallback failed: ' . $e->getMessage());
                }
            }

            return $parsedResults;
        });

        return response()->json($results, 200)->header('X-Conecta-Engine', 'laravel');
    }

    private function formatNominatimResults(array $items, string $filterUf = '', ?string $filterStateName = null, string $customNumber = '', string $filterCity = ''): array
    {
        $out = [];
        $ufMapFlipped = array_flip(self::UF_MAP);

        foreach ($items as $item) {
            $addr = $item['address'] ?? [];
            $lat = (string) ($item['lat'] ?? 0);
            $lon = (string) ($item['lon'] ?? 0);
            $displayName = (string) ($item['display_name'] ?? '');

            $street = (string) ($addr['road'] ?? $addr['street'] ?? $addr['pedestrian'] ?? $item['name'] ?? '');
            $houseNumber = $customNumber !== '' ? $customNumber : (string) ($addr['house_number'] ?? '');
            $suburb = (string) ($addr['suburb'] ?? $addr['neighbourhood'] ?? $addr['quarter'] ?? $addr['city_district'] ?? '');
            $city = (string) ($addr['city'] ?? $addr['town'] ?? $addr['village'] ?? $addr['municipality'] ?? '');
            $state = (string) ($addr['state'] ?? $addr['state_district'] ?? '');
            $postcode = (string) ($addr['postcode'] ?? '');

            $ufCode = $ufMapFlipped[$state] ?? '';
            if ($ufCode === '' && strlen($state) === 2) {
                $ufCode = strtoupper($state);
            }

            // Injetar número da casa se disponível
            $streetWithNum = $street;
            if ($houseNumber !== '' && $street !== '') {
                if (!preg_match('/\b' . preg_quote($houseNumber, '/') . '\b/', $street)) {
                    $streetWithNum = $street . ', ' . $houseNumber;
                }
            }

            // Formatar display_name com número
            if ($houseNumber !== '' && $street !== '') {
                $parts = array_filter([$streetWithNum, $suburb, $city, $ufCode ?: $state, $postcode, 'Brasil']);
                $formattedDisplayName = implode(', ', $parts);
            } else {
                $formattedDisplayName = $displayName;
            }

            $badgeParts = array_filter([$suburb, $city, $ufCode ?: $state]);
            $badge = implode(', ', $badgeParts);

            $out[] = [
                'lat' => $lat,
                'lon' => $lon,
                'display_name' => $formattedDisplayName,
                'street' => $streetWithNum,
                'house_number' => $houseNumber,
                'suburb' => $suburb,
                'city' => $city,
                'state' => $state,
                'uf' => $ufCode,
                'postcode' => $postcode,
                'badge' => $badge ?: $city,
            ];
        }

        // Ordenação inteligente: cidade solicitada primeiro, estado solicitado primeiro
        usort($out, function ($a, $b) use ($filterCity, $filterUf, $filterStateName) {
            $aCityMatch = ($filterCity !== '' && stripos($a['city'] ?? '', $filterCity) !== false);
            $bCityMatch = ($filterCity !== '' && stripos($b['city'] ?? '', $filterCity) !== false);
            if ($aCityMatch !== $bCityMatch) {
                return $aCityMatch ? -1 : 1;
            }

            $aStateMatch = ($filterUf !== '' && strcasecmp($a['uf'] ?? '', $filterUf) === 0) ||
                           ($filterStateName !== null && stripos($a['state'] ?? '', $filterStateName) !== false);
            $bStateMatch = ($filterUf !== '' && strcasecmp($b['uf'] ?? '', $filterUf) === 0) ||
                           ($filterStateName !== null && stripos($b['state'] ?? '', $filterStateName) !== false);
            if ($aStateMatch !== $bStateMatch) {
                return $aStateMatch ? -1 : 1;
            }

            return 0;
        });

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
