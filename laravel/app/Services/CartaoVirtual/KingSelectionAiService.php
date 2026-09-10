<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

/**
 * Textos IA do painel KS — paridade com /galleries/:id/ai/* no Node.
 */
class KingSelectionAiService
{
    private const CHAT_URL = 'https://api.openai.com/v1/chat/completions';

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function shareText(string $userId, int $galleryId, array $body): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido']];
        }
        $kind = (string) ($body['kind'] ?? '');
        if ($kind !== 'custom_append' && $kind !== 'full_message') {
            return ['status' => 400, 'body' => ['message' => 'kind deve ser custom_append ou full_message']];
        }
        $g = $this->ownedGallery($userId, $galleryId);
        if (! $g) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }

        $nome = trim((string) ($body['projectName'] ?? $g->nome_projeto ?? 'ensaio')) ?: 'ensaio';
        $link = trim((string) ($body['shareLink'] ?? '')) ?: '(o link público da galeria será colocado no texto)';
        $hint = isset($body['hint']) ? (string) $body['hint'] : '';
        $currentCustom = isset($body['currentCustom']) ? (string) $body['currentCustom'] : '';
        $currentFull = isset($body['currentFull']) ? (string) $body['currentFull'] : '';

        if ($kind === 'custom_append') {
            $system = 'És um assistente para um fotógrafo profissional no Brasil. Escreve apenas em português do Brasil, tom cordial e profissional. Uma mensagem curta (2 a 4 frases) que o fotógrafo pode acrescentar ao partilhar o link da galeria com o cliente. Não inventes preços ou datas. Não uses hashtags. Devolve só o texto, sem aspas nem markdown.';
            $userMsg = "Nome do projeto/evento: {$nome}.\nReferência do link: {$link}.\n";
            if ($currentCustom !== '') {
                $userMsg .= 'Texto opcional atual (podes melhorar): '.mb_substr($currentCustom, 0, 2000)."\n";
            }
            if ($hint !== '') {
                $userMsg .= 'Instruções do fotógrafo: '.mb_substr($hint, 0, 600);
            }
            $maxTokens = 450;
        } else {
            $system = 'És um assistente para um fotógrafo profissional no Brasil. Escreve uma mensagem completa para WhatsApp ou e-mail, em português do Brasil, cordial e clara, para o cliente aceder à galeria de fotos online para seleção. Inclui saudação (por exemplo Olá!), indica que as fotos estão disponíveis para seleção, inclui o link completo numa linha própria ou após "Link:", e uma despedida curta. Usa o nome do projeto. Não inventes preços. Devolve só o texto da mensagem, sem aspas nem título.';
            $userMsg = "Nome do projeto/evento: {$nome}.\nO link público a incluir no texto é: {$link}\n";
            if ($currentCustom !== '') {
                $userMsg .= 'Mensagem opcional / nota do fotógrafo para inspirar o tom: '.mb_substr($currentCustom, 0, 2000)."\n";
            }
            if ($currentFull !== '') {
                $userMsg .= 'Rascunho atual (podes reescrever por completo): '.mb_substr($currentFull, 0, 4000)."\n";
            }
            if ($hint !== '') {
                $userMsg .= 'Instruções do fotógrafo: '.mb_substr($hint, 0, 600);
            }
            $maxTokens = 950;
        }

        return $this->chatResult($system, $userMsg, $maxTokens);
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function salesWhatsappTemplate(string $userId, int $galleryId, array $body): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido']];
        }
        $kind = (string) ($body['kind'] ?? '');
        $kinds = ['pending', 'rejected', 'awaiting', 'approved'];
        if (! in_array($kind, $kinds, true)) {
            return ['status' => 400, 'body' => ['message' => 'kind deve ser pending, rejected, awaiting ou approved']];
        }
        $g = $this->ownedGallery($userId, $galleryId);
        if (! $g) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }

        $nomeProjeto = trim((string) ($g->nome_projeto ?? 'ensaio')) ?: 'ensaio';
        $basePlaceholders = 'O texto DEVE incluir literalmente as sequências exatas {{nome}}, {{link}} e {{galeria}} (com chaves duplas), para o sistema substituir depois. Cada uma pelo menos uma vez. Podes usar *asteriscos* para negrito no WhatsApp.';
        $scenarios = [
            'pending' => 'Cenário: mensagem automática quando o cliente já escolheu fotos mas o pagamento (PIX ou saldo) ainda está pendente ou em aberto. Tom claro, profissional, em português do Brasil.',
            'rejected' => 'Cenário: o comprovante de pagamento foi recusado; pedir que o cliente envie um comprovante válido ou refaça o PIX, sem ser agressivo.',
            'awaiting' => 'Cenário: o pagamento foi reconhecido, mas as fotos ainda aguardam a tua revisão/aprovação antes de liberar o download.',
            'approved' => 'Cenário: tudo certo — fotos aprovadas pelo fotógrafo; o cliente pode abrir o link e baixar. Tom positivo e objetivo.',
        ];
        $system = "És um assistente para fotógrafos profissionais no Brasil. Escreve UMA mensagem de WhatsApp, em português do Brasil, cordial e profissional.\n{$scenarios[$kind]}\n{$basePlaceholders}\nNão inventes valores em reais nem datas concretas. Não uses hashtags. Devolve só o corpo da mensagem, sem título, sem aspas envolvendo o texto.";

        $userMsg = "Nome do projeto/evento (referência para o tom): {$nomeProjeto}.\n";
        $currentText = isset($body['currentText']) ? (string) $body['currentText'] : '';
        $hint = isset($body['hint']) ? (string) $body['hint'] : '';
        if (trim($currentText) !== '') {
            $userMsg .= 'Texto atual ou rascunho (podes reescrever por completo, mantendo os placeholders): '.mb_substr($currentText, 0, 4000)."\n";
        }
        if (trim($hint) !== '') {
            $userMsg .= 'Instruções adicionais do fotógrafo: '.mb_substr($hint, 0, 600);
        }

        return $this->chatResult($system, $userMsg, 950);
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function supportDefaultMessage(string $userId, int $galleryId, array $body): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido']];
        }
        $g = $this->ownedGallery($userId, $galleryId);
        if (! $g) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }

        $nomeProjeto = trim((string) ($g->nome_projeto ?? 'ensaio')) ?: 'ensaio';
        $label = mb_substr(trim((string) ($body['buttonLabel'] ?? '')), 0, 120);
        $currentText = isset($body['currentText']) ? (string) $body['currentText'] : '';
        $hint = isset($body['hint']) ? (string) $body['hint'] : '';

        $system = 'És um assistente para fotógrafos profissionais no Brasil.
Escreve UMA mensagem curta em português do Brasil (pt-BR), na primeira pessoa, como se fosses o cliente da galeria de fotos a contactar o fotógrafo pelo WhatsApp (botão de suporte).
Tom cordial e claro: pedir ajuda com seleção de fotos, pagamento, liberação para download ou dúvidas sobre a galeria — conforme fizer sentido.
2 a 4 frases no máximo. Sem hashtags. Sem markdown. Sem título. Podes usar uma saudação simples (ex.: Olá! ou Olá, bom dia!).
Não inventes nomes de pessoas. Podes mencionar de forma genérica "as fotos" ou "a galeria" ou referir o nome do projeto se fornecido.';

        $userMsg = "Nome do projeto ou evento (referência de contexto): {$nomeProjeto}.\n";
        if ($label !== '') {
            $userMsg .= "Texto do botão de suporte na galeria (referência): {$label}\n";
        }
        if (trim($currentText) !== '') {
            $userMsg .= 'Rascunho atual ou texto a melhorar (podes reescrever por completo): '.mb_substr($currentText, 0, 2000)."\n";
        }
        if (trim($hint) !== '') {
            $userMsg .= 'Instruções do fotógrafo: '.mb_substr($hint, 0, 600);
        }

        return $this->chatResult($system, $userMsg, 400);
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    private function chatResult(string $system, string $user, int $maxTokens): array
    {
        $cacheKey = 'ks:ai:v1:'.hash('sha256', $system."\0".$user."\0".$maxTokens);
        $cached = Cache::get($cacheKey);
        if (is_string($cached) && $cached !== '') {
            return ['status' => 200, 'body' => ['text' => $cached, 'cacheHit' => true]];
        }

        try {
            $text = $this->chat($system, $user, $maxTokens);
            Cache::put($cacheKey, $text, 3600);

            return ['status' => 200, 'body' => ['text' => $text]];
        } catch (\RuntimeException $e) {
            if ($e->getCode() === 503) {
                return ['status' => 503, 'body' => ['message' => $e->getMessage()]];
            }
            if ($e->getCode() === 429) {
                return ['status' => 503, 'body' => ['message' => 'Limite de uso da API OpenAI. Tente mais tarde.']];
            }
            throw $e;
        }
    }

    private function chat(string $system, string $user, int $maxTokens): string
    {
        $key = trim((string) (env('OPENAI_API_KEY') ?: ''));
        if ($key === '') {
            throw new \RuntimeException('OPENAI_API_KEY não configurada no servidor.', 503);
        }
        $res = Http::timeout(60)
            ->withToken($key)
            ->post(self::CHAT_URL, [
                'model' => 'gpt-4o-mini',
                'messages' => [
                    ['role' => 'system', 'content' => $system],
                    ['role' => 'user', 'content' => $user],
                ],
                'temperature' => 0.45,
                'max_tokens' => $maxTokens,
            ]);
        if ($res->status() === 429) {
            throw new \RuntimeException('Limite de uso da API OpenAI. Tente mais tarde.', 429);
        }
        if (! $res->successful()) {
            throw new \RuntimeException(mb_substr($res->body() ?: 'Falha na API OpenAI.', 0, 500), 502);
        }
        $content = data_get($res->json(), 'choices.0.message.content');
        if (! is_string($content) || trim($content) === '') {
            throw new \RuntimeException('Resposta vazia da IA.', 502);
        }

        return trim($content);
    }

    private function ownedGallery(string $userId, int $galleryId): ?object
    {
        if (! Schema::hasTable('king_galleries')) {
            return null;
        }

        return DB::selectOne(
            'SELECT g.id, g.nome_projeto
             FROM king_galleries g
             JOIN profile_items pi ON pi.id = g.profile_item_id
             WHERE g.id = ? AND pi.user_id = ?
             LIMIT 1',
            [$galleryId, $userId]
        );
    }
}
