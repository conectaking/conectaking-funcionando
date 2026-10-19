<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$r2 = app(App\Services\CartaoVirtual\R2StorageService::class);
$img = $r2->getObject('galleries/9/faces/client_7_ref.jpg');
if (!$img) {
    echo "NO_SELFIE\n";
    exit(1);
}
$res = Illuminate\Support\Facades\Http::withBody($img, 'image/jpeg')->post('http://conectaking-face-ai:5005/extract');
$faces = $res->json('faces') ?? [];
if (empty($faces)) {
    echo "NO_FACE_IN_SELFIE\n";
    exit(1);
}
$emb = json_encode($faces[0]['embedding']);
Illuminate\Support\Facades\DB::update('UPDATE rekognition_client_faces SET embedding = ? WHERE client_id = 7 AND gallery_id = 9', [$emb]);
echo "CLIENT_7_EMBEDDING_SAVED (confidence: " . $faces[0]['confidence'] . ")\n";
