<?php
$path = dirname(__DIR__) . '/laravel/resources/views/pages/kingSelectionProject.blade.php';
$t = file_get_contents($path);
if ($t === false) {
    fwrite(STDERR, "cannot read $path\n");
    exit(1);
}

$map = [
    'Ã§Ã£o' => 'ção',
    'Ã§Ãµes' => 'ções',
    'permissÃ£o' => 'permissão',
    'temporÃ¡rio' => 'temporário',
    'seleÃ§Ã£o' => 'seleção',
    'VocÃª' => 'Você',
    'vocÃª' => 'você',
    'nÃ£o' => 'não',
    'NÃ£o' => 'Não',
    'tambÃ©m' => 'também',
    'jÃ¡' => 'já',
    'sÃ³' => 'só',
    'SÃ³' => 'Só',
    'Ã£o' => 'ão',
    'Ã¡' => 'á',
    'Ã ' => 'à',
    'Ã¢' => 'â',
    'Ã£' => 'ã',
    'Ã©' => 'é',
    'Ãª' => 'ê',
    'Ã¨' => 'è',
    'Ã­' => 'í',
    'Ã³' => 'ó',
    'Ã´' => 'ô',
    'Ãµ' => 'õ',
    'Ãº' => 'ú',
    'Ã§' => 'ç',
    'Ã' => 'Á',
    'Ã‰' => 'É',
    'Ã' => 'Í',
    'Ã“' => 'Ó',
    'Ãš' => 'Ú',
    'Ã‡' => 'Ç',
    "\xC3\xA2\xE2\x82\xAC\xE2\x80\x9D" => '"',
];

$before = substr_count($t, 'Ã');
foreach ($map as $from => $to) {
    $t = str_replace($from, $to, $t);
}
$after = substr_count($t, 'Ã');
file_put_contents($path, $t);
echo "mojibake_marker Ã before=$before after=$after\n";
echo 'Você count=' . substr_count($t, 'Você') . "\n";
echo 'permissão count=' . substr_count($t, 'permissão') . "\n";
