<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$family = [
    ["familia", "sarah", "Sarah é a princesinha amada de Adrian King e Samara, uma menina linda, corajosa, inteligente, cheia do Espírito Santo e amor de Jesus."],
    ["familia", "pai_adrian", "Adrian King é o papai amoroso da Sarah, homem trabalhador, de fé, criador da Conecta King que ama profundamente sua família e a Sarah."],
    ["familia", "mae_samara", "Samara é a mamãe da Sarah, doce, amorosa, cuidadosa e muito dedicada a cuidar da Sarah e do lar."],
    ["familia", "vovo_socorro", "Vovó Socorro é a vovó muito querida da Sarah, que sempre ora e abençoa a vida da netinha."],
    ["familia", "vovo_cico", "Vovô Ciço é o vovô querido da Sarah, muito especial para toda a família."],
    ["familia", "titio_marcos", "Titio Marcos é o tio querido e especial da Sarah."],
    ["familia", "titia_priscila", "Titia Priscila é a tia amorosa e muito querida da Sarah."],
    ["familia", "titio_pompom", "Titio Pompom é o tio alegre, divertido e muito especial da Sarah."],
];

foreach ($family as $f) {
    \App\Models\CharleneMemory::updateOrCreate(
        ["subject" => $f[1]],
        ["category" => $f[0], "content" => $f[2], "learned_from" => "sistema"]
    );
}

echo "Memórias da família semeadas com sucesso! Total: " . \App\Models\CharleneMemory::count() . "\n";
