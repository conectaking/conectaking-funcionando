<?php

namespace App\Services\Documentos;

use App\Support\SchemaMeta;

use App\Services\CartaoVirtual\R2StorageService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Documentos (recibos/orçamentos) — CRUD, settings, uploads; PDF mínimo smoke; OCR de comprovantes.
 */
class DocumentosService
{
    public function __construct(
        private readonly R2StorageService $r2,
        private readonly ReciboOcrService $ocr,
    ) {
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function list(string $userId, ?string $tipo = null, int $limit = 50, int $offset = 0): array
    {
        if (! SchemaMeta::hasTable('documentos')) {
            return $this->ok(['documentos' => [], 'total' => 0, 'limit' => $limit, 'offset' => $offset, 'hasMore' => false]);
        }
        $limit = max(1, min(100, $limit));
        $offset = max(0, $offset);

        $q = DB::table('documentos')->where('user_id', $userId);
        if ($tipo) {
            $q->where('tipo', $tipo);
        }
        $total = (clone $q)->count();
        $rows = $q->orderByDesc('created_at')->offset($offset)->limit($limit)->get();
        $docs = [];
        foreach ($rows as $row) {
            $docs[] = $this->normalizeDoc($row);
        }

        return $this->ok([
            'documentos' => $docs,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            'hasMore' => ($offset + count($docs)) < $total,
        ]);
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:mixed}
     */
    public function create(string $userId, array $body): array
    {
        if (! SchemaMeta::hasTable('documentos')) {
            return $this->fail('Tabela documentos indisponível.', 503);
        }
        $tipo = in_array(($body['tipo'] ?? 'recibo'), ['recibo', 'orcamento'], true)
            ? ($body['tipo'] ?? 'recibo')
            : 'recibo';
        $linkToken = ! empty($body['link_token'])
            ? (string) $body['link_token']
            : Str::random(21);
        $numero = isset($body['numero_sequencial'])
            ? (int) $body['numero_sequencial']
            : $this->nextNumeroSequencial($userId, $tipo);

        $row = DB::selectOne(
            'INSERT INTO documentos (
                user_id, tipo, titulo, emitente_json, cliente_json, itens_json, anexos_json,
                observacoes, condicoes_pagamento, data_documento, validade_ate, link_token, numero_sequencial
             ) VALUES (
                ?, ?, ?, ?::jsonb, ?::jsonb, ?::jsonb, ?::jsonb,
                ?, ?, ?, ?, ?, ?
             ) RETURNING *',
            [
                $userId,
                $tipo,
                $body['titulo'] ?? null,
                json_encode($body['emitente_json'] ?? [], JSON_UNESCAPED_UNICODE),
                json_encode($body['cliente_json'] ?? [], JSON_UNESCAPED_UNICODE),
                json_encode($body['itens_json'] ?? [], JSON_UNESCAPED_UNICODE),
                json_encode($body['anexos_json'] ?? [], JSON_UNESCAPED_UNICODE),
                $body['observacoes'] ?? null,
                $body['condicoes_pagamento'] ?? null,
                $body['data_documento'] ?? null,
                $body['validade_ate'] ?? null,
                $linkToken,
                $numero,
            ]
        );

        return $this->ok($this->normalizeDoc($row), 'Documento criado.', 201);
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function getOne(string $userId, int $id): array
    {
        if ($id < 1) {
            return $this->fail('ID inválido', 400);
        }
        $doc = $this->fetchById($id, $userId);
        if (! $doc) {
            return $this->fail('Documento não encontrado', 404);
        }

        return $this->ok($doc);
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:mixed}
     */
    public function update(string $userId, int $id, array $body): array
    {
        if ($id < 1) {
            return $this->fail('ID inválido', 400);
        }
        if (! SchemaMeta::hasTable('documentos')) {
            return $this->fail('Tabela documentos indisponível.', 503);
        }
        $doc = $this->applyUpdate($id, $userId, $body);
        if (! $doc) {
            return $this->fail('Documento não encontrado', 404);
        }

        return $this->ok($doc, 'Documento atualizado.');
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function remove(string $userId, int $id): array
    {
        if ($id < 1) {
            return $this->fail('ID inválido', 400);
        }
        if (! SchemaMeta::hasTable('documentos')) {
            return $this->fail('Tabela documentos indisponível.', 503);
        }
        $row = DB::selectOne(
            'DELETE FROM documentos WHERE id = ? AND user_id = ? RETURNING id',
            [$id, $userId]
        );
        if (! $row) {
            return $this->fail('Documento não encontrado', 404);
        }

        return $this->ok(['id' => (int) $row->id], 'Documento excluído.');
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function duplicate(string $userId, int $sourceId): array
    {
        if ($sourceId < 1) {
            return $this->fail('ID inválido', 400);
        }
        $src = $this->fetchById($sourceId, $userId);
        if (! $src) {
            return $this->fail('Documento não encontrado', 404);
        }
        $baseTitulo = isset($src['titulo']) && trim((string) $src['titulo']) !== ''
            ? trim((string) $src['titulo'])
            : null;
        $titulo = $baseTitulo ? $baseTitulo.' (cópia)' : null;

        $r = $this->create($userId, [
            'tipo' => $src['tipo'] ?? 'recibo',
            'titulo' => $titulo,
            'emitente_json' => $src['emitente_json'] ?? [],
            'cliente_json' => $src['cliente_json'] ?? [],
            'itens_json' => $src['itens_json'] ?? [],
            'anexos_json' => $src['anexos_json'] ?? [],
            'observacoes' => $src['observacoes'] ?? null,
            'condicoes_pagamento' => $src['condicoes_pagamento'] ?? null,
            'data_documento' => $src['data_documento'] ?? null,
            'validade_ate' => $src['validade_ate'] ?? null,
        ]);
        if (($r['status'] ?? 500) < 400 && is_array($r['body'] ?? null)) {
            $r['body']['message'] = 'Documento duplicado.';
        }

        return $r;
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function getByToken(string $token): array
    {
        $token = trim($token);
        if ($token === '') {
            return $this->fail('Token inválido', 400);
        }
        $doc = $this->fetchByToken($token);
        if (! $doc) {
            return $this->fail('Documento não encontrado', 404);
        }

        return $this->ok($doc);
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:mixed}
     */
    public function updateByToken(string $token, array $body): array
    {
        $token = trim($token);
        if ($token === '') {
            return $this->fail('Token inválido', 400);
        }
        if (! SchemaMeta::hasTable('documentos')) {
            return $this->fail('Tabela documentos indisponível.', 503);
        }
        // Token público: só dados do cliente (não reescrever itens/valores do documento)
        $allowed = [];
        if (array_key_exists('cliente_json', $body) && is_array($body['cliente_json'])) {
            $cliente = $body['cliente_json'];
            $allowed['cliente_json'] = [
                'nome' => isset($cliente['nome']) ? mb_substr(trim((string) $cliente['nome']), 0, 200) : null,
                'email' => isset($cliente['email']) ? mb_substr(trim((string) $cliente['email']), 0, 200) : null,
                'telefone' => isset($cliente['telefone']) ? mb_substr(trim((string) $cliente['telefone']), 0, 60) : null,
                'documento' => isset($cliente['documento']) ? mb_substr(trim((string) $cliente['documento']), 0, 40) : null,
                'endereco' => isset($cliente['endereco']) ? mb_substr(trim((string) $cliente['endereco']), 0, 400) : null,
            ];
        }
        if (array_key_exists('observacoes', $body) && is_string($body['observacoes'])) {
            $allowed['observacoes'] = mb_substr($body['observacoes'], 0, 2000);
        }
        if ($allowed === []) {
            return $this->fail('Nenhum campo permitido para atualização pública.', 400);
        }
        $doc = $this->applyUpdateByToken($token, $allowed);
        if (! $doc) {
            return $this->fail('Documento não encontrado', 404);
        }

        return $this->ok($doc, 'Alterações salvas.');
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function getSettings(string $userId): array
    {
        $settings = $this->fetchSettings($userId);
        $companyLogoUrl = $this->companyLogoUrl($userId);
        $extra = is_array($settings['extra_settings'] ?? null) ? $settings['extra_settings'] : [];
        $defaultLogoUrl = ! empty($settings['default_logo_url'])
            ? trim((string) $settings['default_logo_url'])
            : null;

        return $this->ok([
            'headerColor' => $settings['header_color'] ?? null,
            'accentColor' => $settings['accent_color'] ?? null,
            'bgColor' => $settings['bg_color'] ?? null,
            'lastDocumentId' => $settings['last_document_id'] ?? null,
            'defaultLogoUrl' => $defaultLogoUrl,
            'companyLogoUrl' => $companyLogoUrl,
            'condicoesPagamentoPadrao' => isset($extra['condicoesPagamentoPadrao'])
                ? (string) $extra['condicoesPagamentoPadrao'] : null,
            'pixChave' => isset($extra['pixChave']) ? (string) $extra['pixChave'] : null,
            'pixNome' => isset($extra['pixNome']) ? (string) $extra['pixNome'] : null,
            'pixCidade' => isset($extra['pixCidade']) ? (string) $extra['pixCidade'] : null,
            'catalogoServicos' => is_array($extra['catalogoServicos'] ?? null)
                ? $extra['catalogoServicos'] : null,
        ]);
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:mixed}
     */
    public function putSettings(string $userId, array $body): array
    {
        if (! SchemaMeta::hasTable('documentos_user_settings')) {
            return $this->fail('Configurações indisponíveis.', 503);
        }
        $data = [];
        if (array_key_exists('headerColor', $body)) {
            $data['header_color'] = $body['headerColor'];
        }
        if (array_key_exists('accentColor', $body)) {
            $data['accent_color'] = $body['accentColor'];
        }
        if (array_key_exists('bgColor', $body)) {
            $data['bg_color'] = $body['bgColor'];
        }
        if (array_key_exists('lastDocumentId', $body)) {
            $data['last_document_id'] = $body['lastDocumentId'];
        }
        if (array_key_exists('defaultLogoUrl', $body)) {
            $data['default_logo_url'] = $body['defaultLogoUrl'];
        }
        $extraKeys = ['condicoesPagamentoPadrao', 'pixChave', 'pixNome', 'pixCidade', 'catalogoServicos'];
        $extraSettings = [];
        foreach ($extraKeys as $k) {
            if (array_key_exists($k, $body)) {
                $extraSettings[$k] = $body[$k];
            }
        }
        if ($extraSettings !== []) {
            $data['extra_settings'] = $extraSettings;
        }

        $updated = $this->upsertSettings($userId, $data);
        $extra = is_array($updated['extra_settings'] ?? null) ? $updated['extra_settings'] : [];

        return $this->ok([
            'headerColor' => $updated['header_color'] ?? null,
            'accentColor' => $updated['accent_color'] ?? null,
            'bgColor' => $updated['bg_color'] ?? null,
            'lastDocumentId' => $updated['last_document_id'] ?? null,
            'defaultLogoUrl' => ! empty($updated['default_logo_url'])
                ? trim((string) $updated['default_logo_url']) : null,
            'condicoesPagamentoPadrao' => isset($extra['condicoesPagamentoPadrao'])
                ? (string) $extra['condicoesPagamentoPadrao'] : null,
            'pixChave' => isset($extra['pixChave']) ? (string) $extra['pixChave'] : null,
            'pixNome' => isset($extra['pixNome']) ? (string) $extra['pixNome'] : null,
            'pixCidade' => isset($extra['pixCidade']) ? (string) $extra['pixCidade'] : null,
            'catalogoServicos' => is_array($extra['catalogoServicos'] ?? null)
                ? $extra['catalogoServicos'] : null,
        ], 'Configurações salvas.');
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function uploadLogo(string $binary, string $mime, string $filename = 'logo.png'): array
    {
        if ($binary === '') {
            return $this->fail('Nenhuma imagem enviada. Envie um ficheiro (ex.: logo.png).', 400);
        }
        $url = $this->r2->uploadImage($binary, $mime, $filename);
        if (! $url) {
            return $this->fail('Armazenamento de imagens indisponível.', 503);
        }

        return $this->ok(
            ['url' => $url],
            'Logomarca enviada. Use o campo "url" em emitente_json.logo_url.',
            201
        );
    }

    /**
     * @param  array{url:string,titulo?:?string}  $nota
     * @return array{status:int, body:mixed}
     */
    public function setItemNotaFiscal(string $userId, int $id, string $itemUid, array $nota): array
    {
        if ($id < 1) {
            return $this->fail('ID inválido', 400);
        }
        $itemUid = trim($itemUid);
        if ($itemUid === '') {
            return $this->fail('item_uid é obrigatório.', 400);
        }
        $url = (string) ($nota['url'] ?? '');
        if ($url === '') {
            return $this->fail('URL da nota fiscal em falta.', 400);
        }
        $doc = $this->fetchById($id, $userId);
        if (! $doc) {
            return $this->fail('Documento ou item não encontrado', 404);
        }
        $itens = is_array($doc['itens_json'] ?? null) ? $doc['itens_json'] : [];
        $idx = $this->findItemIndexByUid($itens, $itemUid);
        if ($idx < 0) {
            return $this->fail('Documento ou item não encontrado', 404);
        }
        $tituloNota = trim((string) ($nota['titulo'] ?? $itens[$idx]['descricao'] ?? 'Nota fiscal'));
        $tituloNota = mb_substr($tituloNota, 0, 120);
        $itens[$idx] = array_merge($itens[$idx], [
            'nota_fiscal_url' => $url,
            'nota_fiscal_titulo' => $tituloNota,
        ]);
        $updated = $this->applyUpdate($id, $userId, ['itens_json' => $itens]);
        if (! $updated) {
            return $this->fail('Documento ou item não encontrado', 404);
        }

        return $this->ok([
            'url' => $url,
            'documento' => $updated,
            'item_uid' => $itemUid,
        ], 'Nota fiscal anexada ao item.', 201);
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function removeItemNotaFiscal(string $userId, int $id, string $itemUid): array
    {
        if ($id < 1) {
            return $this->fail('ID inválido', 400);
        }
        $itemUid = trim($itemUid);
        if ($itemUid === '') {
            return $this->fail('item_uid é obrigatório.', 400);
        }
        $doc = $this->fetchById($id, $userId);
        if (! $doc) {
            return $this->fail('Documento ou item não encontrado', 404);
        }
        $itens = is_array($doc['itens_json'] ?? null) ? $doc['itens_json'] : [];
        $idx = $this->findItemIndexByUid($itens, $itemUid);
        if ($idx < 0) {
            return $this->fail('Documento ou item não encontrado', 404);
        }
        $next = $itens[$idx];
        unset($next['nota_fiscal_url'], $next['nota_fiscal_titulo']);
        $itens[$idx] = $next;
        $updated = $this->applyUpdate($id, $userId, ['itens_json' => $itens]);
        if (! $updated) {
            return $this->fail('Documento ou item não encontrado', 404);
        }

        return $this->ok([
            'documento' => $updated,
            'item_uid' => $itemUid,
        ], 'Nota fiscal removida.');
    }

    /**
     * @param  array{url:string,tipo_categoria?:string,valor?:?float,descricao?:?string}  $anexo
     * @return array{status:int, body:mixed}
     */
    public function addAnexo(string $userId, int $id, array $anexo): array
    {
        if ($id < 1) {
            return $this->fail('ID inválido', 400);
        }
        $doc = $this->fetchById($id, $userId);
        if (! $doc) {
            return $this->fail('Documento não encontrado', 404);
        }
        $anexos = is_array($doc['anexos_json'] ?? null) ? $doc['anexos_json'] : [];
        $entry = [
            'url' => $anexo['url'],
            'tipo_categoria' => $anexo['tipo_categoria'] ?? 'Outros',
            'valor' => $anexo['valor'] ?? null,
            'descricao' => $anexo['descricao'] ?? null,
        ];
        $anexos[] = $entry;
        $updated = $this->applyUpdate($id, $userId, ['anexos_json' => $anexos]);
        if (! $updated) {
            return $this->fail('Documento não encontrado', 404);
        }

        return $this->ok([
            'url' => $entry['url'],
            'documento' => $updated,
            'anexo' => $entry,
        ], 'Anexo adicionado.', 201);
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function ocrInfo(): array
    {
        return $this->ok([
            'openAiAvailable' => $this->ocr->openAiAvailable(),
            'mode' => $this->ocr->mode(),
            'model' => $this->ocr->model(),
        ]);
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function warmOcr(): array
    {
        try {
            $ready = $this->ocr->warmUp();
        } catch (\Throwable) {
            $ready = false;
        }

        return $this->ok(['ready' => $ready], $ready ? 'OCR pronto.' : 'OCR em aquecimento.');
    }

    /**
     * Merge dos itens lidos no extrato — porta de processarComprovante em
     * modules/documentos/documentos.service.js (dedupe por descrição+data+valor).
     *
     * @param  array<int,array<string,mixed>>  $itensSugeridos
     * @return array{doc:array<string,mixed>, stats:array<string,int>}|null
     */
    public function processarComprovante(
        string $userId,
        int $id,
        array $itensSugeridos,
        bool $acumular,
        bool $substituir,
        ?string $url = null
    ): ?array {
        $doc = $this->fetchById($id, $userId);
        if (! $doc) {
            return null;
        }

        $sugeridos = array_values(array_filter($itensSugeridos, 'is_array'));
        $isExtratoLista = count($sugeridos) >= 3;
        $acumularExtrato = $substituir ? false : $acumular;

        $existingItens = is_array($doc['itens_json'] ?? null) ? $doc['itens_json'] : [];
        $hasItensReais = false;
        foreach ($existingItens as $row) {
            if (! $this->isItemPlaceholder($row)) {
                $hasItensReais = true;
                break;
            }
        }

        if ($substituir) {
            $itens = [];
        } elseif ($isExtratoLista && ! $acumularExtrato && ! $hasItensReais) {
            $itens = [];
        } else {
            $itens = array_values(array_filter(
                $existingItens,
                fn ($row) => ! $this->isItemPlaceholder($row)
            ));
        }

        $isRecibo = strtolower((string) ($doc['tipo'] ?? '')) === 'recibo';
        // Recibo: extrato do cartão só preenche a tabela — fotos do PDF ficam em item.nota_fiscal_url
        $anexos = $isRecibo ? [] : (is_array($doc['anexos_json'] ?? null) ? $doc['anexos_json'] : []);
        $primeiraCategoria = $sugeridos !== [] ? ($sugeridos[0]['categoria'] ?? 'Comprovante') : 'Comprovante';

        $existingKeyCounts = [];
        foreach ($itens as $row) {
            $k = $this->itemExtratoKey(
                (string) ($row['descricao'] ?? ''),
                (string) ($row['data'] ?? ''),
                $row['valor_unitario'] ?? $row['valor'] ?? 0
            );
            $existingKeyCounts[$k] = ($existingKeyCounts[$k] ?? 0) + 1;
        }

        $batchKeyCounts = [];
        foreach ($sugeridos as $s) {
            $descricao = $this->descricaoSugerida($s);
            if ($this->isItemRecusado($descricao, $s)) {
                continue;
            }
            $k = $this->itemExtratoKey($descricao, $this->dataSugerida($s), (float) ($s['valor'] ?? 0));
            $batchKeyCounts[$k] = ($batchKeyCounts[$k] ?? 0) + 1;
        }

        $addedInBatch = [];
        $lidosOcr = 0;
        $inseridos = 0;
        $ignoradosRecusados = 0;
        $ignoradosDuplicata = 0;
        $totalValor = 0.0;

        foreach ($sugeridos as $s) {
            $descricao = $this->descricaoSugerida($s);
            if ($this->isItemRecusado($descricao, $s)) {
                $ignoradosRecusados++;
                continue;
            }
            $lidosOcr++;
            $valor = (float) ($s['valor'] ?? 0);
            $data = $this->dataSugerida($s);
            $key = $this->itemExtratoKey($descricao, $data, $valor);
            $batchTotal = $batchKeyCounts[$key] ?? 1;
            $added = $addedInBatch[$key] ?? 0;
            $wasInDoc = $existingKeyCounts[$key] ?? 0;
            // Permite completar itens faltantes (1ª leitura pegou 4 de 6); bloqueia re-envio da mesma foto
            $slotsToFill = $batchTotal - min($wasInDoc, $batchTotal);
            if ($added >= $slotsToFill) {
                $ignoradosDuplicata++;
                continue;
            }
            $addedInBatch[$key] = $added + 1;

            $item = [
                'item_uid' => 'it-'.(int) (microtime(true) * 1000).'-'.Str::lower(Str::random(8)),
                'descricao' => $descricao,
                'quantidade' => 1,
                'valor_unitario' => $valor,
                'valor' => $valor,
            ];
            if ($data !== '') {
                $item['data'] = $data;
            }
            $etiqueta = trim((string) ($s['etiqueta_ocr'] ?? $s['observacao_item'] ?? ''));
            if ($etiqueta !== '') {
                $item['conteudo_pacote'] = mb_substr($etiqueta, 0, 120);
            }
            $itens[] = $item;
            $totalValor += $valor;
            $inseridos++;
        }

        // Orçamento (legado): comprovante avulso pode ir para anexos_json. Recibo nunca guarda foto do OCR aqui.
        if (! $isRecibo && $url !== null && $url !== '' && ! $isExtratoLista) {
            if ($sugeridos !== []) {
                $primeiroNome = $sugeridos[0]['nome_estabelecimento'] ?? $primeiraCategoria;
                $anexos[] = [
                    'url' => $url,
                    'tipo_categoria' => $primeiraCategoria,
                    'valor' => $totalValor,
                    'descricao' => $totalValor > 0
                        ? $primeiroNome.' — R$ '.str_replace('.', ',', number_format($totalValor, 2, '.', ''))
                        : 'Comprovante — '.$primeiroNome,
                ];
            } else {
                $anexos[] = [
                    'url' => $url,
                    'tipo_categoria' => 'Comprovante',
                    'valor' => null,
                    'descricao' => 'Comprovante',
                ];
            }
        }

        if ($sugeridos === []) {
            $itens[] = [
                'descricao' => 'Comprovante (preencha descrição e valor)',
                'quantidade' => 1,
                'valor_unitario' => 0,
                'valor' => 0,
            ];
        }

        $docAtualizado = $this->applyUpdate($id, $userId, [
            'itens_json' => array_values($itens),
            'anexos_json' => array_values($anexos),
        ]);
        if (! $docAtualizado) {
            return null;
        }

        return [
            'doc' => $docAtualizado,
            'stats' => [
                'lidosOcr' => $lidosOcr,
                'inseridos' => $inseridos,
                'ignoradosRecusados' => $ignoradosRecusados,
                'ignoradosDuplicata' => $ignoradosDuplicata,
            ],
        ];
    }

    /**
     * @param  array<string,mixed>  $s
     */
    private function descricaoSugerida(array $s): string
    {
        $nome = trim((string) ($s['nome_estabelecimento'] ?? ''));
        $base = $nome !== '' ? $nome : (string) ($s['textoTrecho'] ?? $s['categoria'] ?? '');

        return mb_substr($base, 0, 120);
    }

    /**
     * @param  array<string,mixed>  $s
     */
    private function dataSugerida(array $s): string
    {
        $d = $s['data'] ?? null;

        return $d !== null && $d !== '' ? mb_substr((string) $d, 0, 20) : '';
    }

    private function itemExtratoKey(string $descricao, string $data, mixed $valor): string
    {
        $d = mb_strtolower($descricao);
        if (class_exists(\Normalizer::class)) {
            $d = (string) \Normalizer::normalize($d, \Normalizer::FORM_D);
            $d = (string) preg_replace('/\p{M}/u', '', $d);
        } else {
            $d = Str::ascii($d);
        }
        $d = mb_substr((string) preg_replace('/[^a-z0-9]/', '', $d), 0, 48);
        $v = (int) round(((float) $valor) * 100);

        return $d.'|'.trim($data).'|'.$v;
    }

    /**
     * @param  mixed  $row
     */
    private function isItemPlaceholder($row): bool
    {
        if (! is_array($row)) {
            return true;
        }
        $d = trim((string) ($row['descricao'] ?? ''));
        $v = (float) ($row['valor'] ?? $row['valor_unitario'] ?? 0);
        if ($d === '' || $d === '-') {
            return $v <= 0;
        }
        if (preg_match('/^Comprovante \(preencha/i', $d)) {
            return $v <= 0;
        }

        return false;
    }

    /**
     * @param  array<string,mixed>  $sugerido
     */
    private function isItemRecusado(string $descricao, array $sugerido): bool
    {
        if ((($sugerido['status'] ?? '') === 'DECLINED')
            || ! empty($sugerido['recusada'])
            || ! empty($sugerido['recusado'])) {
            return true;
        }
        $txt = $descricao.' '.(string) ($sugerido['textoTrecho'] ?? '');

        return (bool) preg_match('/recusad|negad|cancelad/i', $txt);
    }

    /**
     * PDF mínimo válido (smoke) — uma página com título, tipo e número.
     *
     * @return array{status:int, pdf?:string, filename?:string, body?:mixed}
     */
    public function getPdf(string $userId, int $id): array
    {
        if ($id < 1) {
            return $this->fail('ID inválido', 400);
        }
        $doc = $this->fetchById($id, $userId);
        if (! $doc) {
            return $this->fail('Documento não encontrado', 404);
        }

        return $this->pdfResult($doc);
    }

    /**
     * @return array{status:int, pdf?:string, filename?:string, body?:mixed}
     */
    public function getPdfByToken(string $token): array
    {
        $token = trim($token);
        if ($token === '') {
            return $this->fail('Token inválido', 400);
        }
        $doc = $this->fetchByToken($token);
        if (! $doc) {
            return $this->fail('Documento não encontrado', 404);
        }

        return $this->pdfResult($doc);
    }

    /**
     * @param  array<string,mixed>  $doc
     * @return array{status:int, pdf:string, filename:string}
     */
    private function pdfResult(array $doc): array
    {
        $tipo = strtolower((string) ($doc['tipo'] ?? 'documento'));
        $num = $doc['numero_sequencial'] ?? $doc['id'] ?? '';
        $titulo = trim((string) ($doc['titulo'] ?? '')) ?: ucfirst($tipo);
        $filename = match ($tipo) {
            'recibo' => "recibo-{$num}.pdf",
            'orcamento' => "orcamento-{$num}.pdf",
            default => "documento-{$num}.pdf",
        };

        return [
            'status' => 200,
            'pdf' => $this->buildMinimalPdf($titulo, $tipo, (string) $num),
            'filename' => $filename,
        ];
    }

    private function buildMinimalPdf(string $titulo, string $tipo, string $numero): string
    {
        $lines = [
            $this->pdfEscape($titulo),
            $this->pdfEscape('Tipo: '.$tipo),
            $this->pdfEscape('Numero: '.$numero),
        ];
        $y = 720;
        $content = "BT\n/F1 16 Tf\n50 {$y} Td\n({$lines[0]}) Tj\n";
        $content .= "0 -28 Td\n/F1 12 Tf\n({$lines[1]}) Tj\n";
        $content .= "0 -20 Td\n({$lines[2]}) Tj\nET\n";
        $len = strlen($content);

        $objects = [];
        $objects[] = "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n";
        $objects[] = "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n";
        $objects[] = "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            ."/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n";
        $objects[] = "4 0 obj<< /Length {$len} >>stream\n{$content}endstream\nendobj\n";
        $objects[] = "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n";

        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objects as $obj) {
            $offsets[] = strlen($pdf);
            $pdf .= $obj;
        }
        $xrefPos = strlen($pdf);
        $count = count($objects) + 1;
        $pdf .= "xref\n0 {$count}\n";
        $pdf .= "0000000000 65535 f \n";
        for ($i = 1; $i < $count; $i++) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$i]);
        }
        $pdf .= "trailer<< /Size {$count} /Root 1 0 R >>\n";
        $pdf .= "startxref\n{$xrefPos}\n%%EOF\n";

        return $pdf;
    }

    private function pdfEscape(string $s): string
    {
        $s = preg_replace('/[^\x20-\x7E]/', '?', $s) ?? $s;

        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $s);
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    private function ok(mixed $data, ?string $message = null, int $status = 200): array
    {
        $body = [
            'success' => true,
            'data' => $data,
            'error' => null,
        ];
        if ($message !== null) {
            $body['message'] = $message;
        }

        return ['status' => $status, 'body' => $body];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    private function fail(string $message, int $status = 400): array
    {
        return [
            'status' => $status,
            'body' => [
                'success' => false,
                'data' => null,
                'message' => $message,
                'error' => [
                    'code' => 'ERROR',
                    'message' => $message,
                ],
            ],
        ];
    }

    private function nextNumeroSequencial(string $userId, string $tipo): int
    {
        $row = DB::selectOne(
            'SELECT COALESCE(MAX(numero_sequencial), 0) + 1 AS next_num FROM documentos WHERE user_id = ? AND tipo = ?',
            [$userId, $tipo]
        );

        return $row ? (int) $row->next_num : 1;
    }

    /**
     * @return array<string,mixed>|null
     */
    private function fetchById(int $id, string $userId): ?array
    {
        if (! SchemaMeta::hasTable('documentos')) {
            return null;
        }
        $row = DB::selectOne('SELECT * FROM documentos WHERE id = ? AND user_id = ?', [$id, $userId]);

        return $this->normalizeDoc($row);
    }

    /**
     * @return array<string,mixed>|null
     */
    private function fetchByToken(string $token): ?array
    {
        if (! SchemaMeta::hasTable('documentos')) {
            return null;
        }
        $row = DB::selectOne('SELECT * FROM documentos WHERE link_token = ?', [$token]);

        return $this->normalizeDoc($row);
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array<string,mixed>|null
     */
    private function applyUpdate(int $id, string $userId, array $data): ?array
    {
        $fields = [];
        $values = [];
        $allowed = [
            'titulo', 'emitente_json', 'cliente_json', 'itens_json', 'anexos_json',
            'observacoes', 'condicoes_pagamento', 'data_documento', 'validade_ate',
        ];
        foreach ($allowed as $key) {
            if (! array_key_exists($key, $data)) {
                continue;
            }
            if (str_ends_with($key, '_json')) {
                $fields[] = "{$key} = ?::jsonb";
                $values[] = json_encode($data[$key] ?? (str_contains($key, 'itens') || str_contains($key, 'anexos') ? [] : []), JSON_UNESCAPED_UNICODE);
            } else {
                $fields[] = "{$key} = ?";
                $values[] = $data[$key];
            }
        }
        if ($fields === []) {
            return $this->fetchById($id, $userId);
        }
        $values[] = $id;
        $values[] = $userId;
        $sql = 'UPDATE documentos SET '.implode(', ', $fields).', updated_at = NOW() WHERE id = ? AND user_id = ? RETURNING *';
        $row = DB::selectOne($sql, $values);

        return $this->normalizeDoc($row);
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array<string,mixed>|null
     */
    private function applyUpdateByToken(string $token, array $data): ?array
    {
        $fields = [];
        $values = [];
        $allowed = [
            'titulo', 'emitente_json', 'cliente_json', 'itens_json', 'anexos_json',
            'observacoes', 'condicoes_pagamento', 'data_documento', 'validade_ate',
        ];
        foreach ($allowed as $key) {
            if (! array_key_exists($key, $data)) {
                continue;
            }
            if (str_ends_with($key, '_json')) {
                $fields[] = "{$key} = ?::jsonb";
                $values[] = json_encode($data[$key] ?? [], JSON_UNESCAPED_UNICODE);
            } else {
                $fields[] = "{$key} = ?";
                $values[] = $data[$key];
            }
        }
        if ($fields === []) {
            return $this->fetchByToken($token);
        }
        $values[] = $token;
        $sql = 'UPDATE documentos SET '.implode(', ', $fields).', updated_at = NOW() WHERE link_token = ? RETURNING *';
        $row = DB::selectOne($sql, $values);

        return $this->normalizeDoc($row);
    }

    /**
     * @return array<string,mixed>
     */
    private function fetchSettings(string $userId): array
    {
        if (! SchemaMeta::hasTable('documentos_user_settings')) {
            return [];
        }
        $row = DB::selectOne(
            'SELECT header_color, accent_color, bg_color, last_document_id, default_logo_url, extra_settings, updated_at
             FROM documentos_user_settings WHERE user_id = ?',
            [$userId]
        );
        if (! $row) {
            return [];
        }
        $a = (array) $row;
        $a['extra_settings'] = $this->decodeJson($a['extra_settings'] ?? null, []);

        return $a;
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array<string,mixed>
     */
    private function upsertSettings(string $userId, array $data): array
    {
        $defaultLogo = array_key_exists('default_logo_url', $data)
            ? (($data['default_logo_url'] === null || $data['default_logo_url'] === '')
                ? null
                : trim((string) $data['default_logo_url']))
            : null;
        $updateLogo = array_key_exists('default_logo_url', $data);
        $updateExtra = array_key_exists('extra_settings', $data);
        $extraJson = $updateExtra
            ? json_encode($data['extra_settings'] ?? [], JSON_UNESCAPED_UNICODE)
            : '{}';

        $header = array_key_exists('header_color', $data)
            ? (trim(ltrim((string) $data['header_color'], '#')) ?: null)
            : null;
        $accent = array_key_exists('accent_color', $data)
            ? (trim(ltrim((string) $data['accent_color'], '#')) ?: null)
            : null;
        $bg = array_key_exists('bg_color', $data)
            ? (trim(ltrim((string) $data['bg_color'], '#')) ?: null)
            : null;
        $lastId = array_key_exists('last_document_id', $data)
            ? (($data['last_document_id'] !== null && $data['last_document_id'] !== '')
                ? (int) $data['last_document_id'] : null)
            : null;

        $row = DB::selectOne(
            'INSERT INTO documentos_user_settings
                (user_id, header_color, accent_color, bg_color, last_document_id, default_logo_url, extra_settings, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, NOW())
             ON CONFLICT (user_id) DO UPDATE SET
               header_color = COALESCE(EXCLUDED.header_color, documentos_user_settings.header_color),
               accent_color = COALESCE(EXCLUDED.accent_color, documentos_user_settings.accent_color),
               bg_color = COALESCE(EXCLUDED.bg_color, documentos_user_settings.bg_color),
               last_document_id = COALESCE(EXCLUDED.last_document_id, documentos_user_settings.last_document_id),
               default_logo_url = CASE WHEN ? THEN EXCLUDED.default_logo_url ELSE documentos_user_settings.default_logo_url END,
               extra_settings = CASE
                 WHEN ? THEN COALESCE(documentos_user_settings.extra_settings, \'{}\'::jsonb) || COALESCE(EXCLUDED.extra_settings, \'{}\'::jsonb)
                 ELSE COALESCE(documentos_user_settings.extra_settings, \'{}\'::jsonb)
               END,
               updated_at = NOW()
             RETURNING *',
            [
                $userId,
                $header,
                $accent,
                $bg,
                $lastId,
                $updateLogo ? $defaultLogo : null,
                $extraJson,
                $updateLogo,
                $updateExtra,
            ]
        );
        $a = $row ? (array) $row : [];
        $a['extra_settings'] = $this->decodeJson($a['extra_settings'] ?? null, []);

        return $a;
    }

    private function companyLogoUrl(string $userId): ?string
    {
        if (! SchemaMeta::hasTable('users')) {
            return null;
        }
        try {
            $row = DB::selectOne(
                'SELECT CASE WHEN u.parent_user_id IS NOT NULL THEN p.company_logo_url ELSE u.company_logo_url END AS company_logo_url
                 FROM users u
                 LEFT JOIN users p ON p.id = u.parent_user_id
                 WHERE u.id = ?',
                [$userId]
            );
            if ($row && ! empty($row->company_logo_url)) {
                return (string) $row->company_logo_url;
            }
        } catch (\Throwable) {
            // coluna pode não existir
        }

        return null;
    }

    /**
     * @param  array<int,mixed>  $itens
     */
    private function findItemIndexByUid(array $itens, string $itemUid): int
    {
        foreach ($itens as $i => $row) {
            if (is_array($row) && (string) ($row['item_uid'] ?? '') === $itemUid) {
                return (int) $i;
            }
        }

        return -1;
    }

    /**
     * @return array<string,mixed>|null
     */
    private function normalizeDoc(mixed $row): ?array
    {
        if (! $row) {
            return null;
        }
        $a = (array) $row;
        $a['emitente_json'] = $this->decodeJson($a['emitente_json'] ?? null, []);
        $a['cliente_json'] = $this->decodeJson($a['cliente_json'] ?? null, []);
        $a['itens_json'] = $this->decodeJson($a['itens_json'] ?? null, []);
        $a['anexos_json'] = $this->decodeJson($a['anexos_json'] ?? null, []);

        return $a;
    }

    private function decodeJson(mixed $v, mixed $default = []): mixed
    {
        if ($v === null) {
            return $default;
        }
        if (is_array($v)) {
            return $v;
        }
        if (is_object($v)) {
            return json_decode(json_encode($v), true) ?? $default;
        }
        if (is_string($v)) {
            $d = json_decode($v, true);

            return $d !== null ? $d : $default;
        }

        return $default;
    }
}
