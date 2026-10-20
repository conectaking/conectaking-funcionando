<?php
require '/app/vendor/autoload.php';
$app = require_once '/app/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$cFace = DB::selectOne('SELECT embedding FROM rekognition_client_faces WHERE client_id = 10 LIMIT 1');
$cEmb = json_decode($cFace->embedding, true);

$res = Http::post('http://conectaking-face-ai:5005/match', [
    'query_embedding' => $cEmb,
    'targets' => array_map(function($r) {
        return ['id' => (int)$r->id, 'photo_id' => (int)$r->photo_id, 'embedding' => json_decode($r->embedding, true)];
    }, DB::select('SELECT rpf.id, rpf.photo_id, rpf.embedding FROM rekognition_photo_faces rpf JOIN king_photos kp ON kp.id = rpf.photo_id WHERE kp.gallery_id = 9 AND rpf.embedding IS NOT NULL')),
    'threshold' => 0.30
]);

$matches = $res->json('matches') ?? [];

// Faixas de raw_score:
$scoreBuckets = [
    '0.60+' => [],
    '0.55-0.60' => [],
    '0.50-0.55' => [],
    '0.45-0.50' => [],
    '0.42-0.45' => [],
    '0.39-0.42' => [],
    '0.36-0.39' => [],
    '<0.36' => []
];

foreach ($matches as $m) {
    $sc = (float)$m['raw_score'];
    if ($sc >= 0.60) $scoreBuckets['0.60+'][] = $m['photo_id'];
    elseif ($sc >= 0.55) $scoreBuckets['0.55-0.60'][] = $m['photo_id'];
    elseif ($sc >= 0.50) $scoreBuckets['0.50-0.55'][] = $m['photo_id'];
    elseif ($sc >= 0.45) $scoreBuckets['0.45-0.50'][] = $m['photo_id'];
    elseif ($sc >= 0.42) $scoreBuckets['0.42-0.45'][] = $m['photo_id'];
    elseif ($sc >= 0.39) $scoreBuckets['0.39-0.42'][] = $m['photo_id'];
    elseif ($sc >= 0.36) $scoreBuckets['0.36-0.39'][] = $m['photo_id'];
    else $scoreBuckets['<0.36'][] = $m['photo_id'];
}

foreach ($scoreBuckets as $b => $arr) {
    $u = array_unique($arr);
    echo "Faixa $b: " . count($u) . " fotos distintas. Amostra: [" . implode(',', array_slice($u, 0, 5)) . "]\n";
}
