<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$family = [
    ["familia", "sarah", "Sarah é a princesinha amada de Adrian King e Samara, uma menina linda, corajosa, inteligente, cheia do Espírito Santo e amor de Jesus."],
    ["familia", "sarah_idade_nascimento", "A princesinha Sarah tem 10 meses de vida e nasceu no dia 12 de dezembro! Ela é a maior bênção do papai Adrian King e da mamãe Samara."],
    ["familia", "pai_adrian", "Adrian King é o papai amoroso da Sarah, homem trabalhador, de fé, criador da Conecta King que ama profundamente sua família e a Sarah."],
    ["familia", "mae_samara", "Samara é a mamãe amorosa e dedicada da Sarah, filha da Vovó Socorro."],
    ["familia", "vovo_socorro", "Vovó Socorro é a vovó muito querida da Sarah e mãe da mamãe Samara! Ela sempre ora, dá muito colinho e abençoa a vida da princesinha Sarah."],
    ["familia", "vovo_cico", "Vovô Ciço (Cícero) é o vovô querido da Sarah e pai do papai Adrian King! Ele é muito especial e cuida com carinho da Chácara Maranata."],
    ["familia", "titio_marcos", "Titio Marcos é o tio querido e especial da Sarah, irmão do papai Adrian King."],
    ["familia", "titia_priscila", "Titia Priscila é a tia amorosa e muito querida da Sarah."],
    ["familia", "titio_pompom", "Titio Pompom é o tio alegre, divertido, brincalhão e muito especial da Sarah."],
    ["pessoa", "bispo_fernando", "Bispo Fernando é um homem de Deus abençoado, muito querido e respeitado pela família do Adrian King e da Sarah, que sempre traz orações e bênçãos do céu."],
];

foreach ($family as $f) {
    \App\Models\CharleneMemory::updateOrCreate(
        ["subject" => $f[1]],
        ["category" => $f[0], "content" => $f[2], "learned_from" => "sistema"]
    );
}

echo "Memórias da família semeadas com sucesso! Total: " . \App\Models\CharleneMemory::count() . "\n";
