<?php
$html = file_get_contents("http://127.0.0.1:8080/charlene/musicas");
$doc = new DOMDocument();
libxml_use_internal_errors(true);
$doc->loadHTML($html);
foreach (['section-musicas', 'section-memorias', 'section-historias', 'section-comandos'] as $id) {
    $el = $doc->getElementById($id);
    if ($el) {
        $p = $el->parentNode;
        $pId = $p ? $p->getAttribute('id') : 'none';
        $pClass = $p ? $p->getAttribute('class') : 'none';
        echo "Element: #$id | Parent: <{$p->nodeName}> id='$pId' class='$pClass'\n";
    } else {
        echo "Element: #$id NOT FOUND\n";
    }
}
