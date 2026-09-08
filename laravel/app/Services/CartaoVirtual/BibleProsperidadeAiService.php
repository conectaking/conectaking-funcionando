<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BibleProsperidadeAiService
{
    private const CHAT_URL = 'https://api.openai.com/v1/chat/completions';

    private function apiKey(): string
    {
        return trim((string) (env('OPENAI_API_KEY') ?: env('BIBLE_OPENAI_API_KEY') ?: ''));
    }

    private function model(): string
    {
        return trim((string) (env('BIBLE_PROSPERIDADE_AI_MODEL') ?: env('BIBLE_DEV365_AI_MODEL') ?: 'gpt-4o-mini'))
            ?: 'gpt-4o-mini';
    }

    /**
     * @return array{phases:list<array<string,mixed>>}
     */
    public function loadStorytellingMap(): array
    {
        $path = resource_path('data/bible/prosperidade_storytelling_map.json');
        if (!is_file($path)) {
            return ['phases' => []];
        }
        $raw = json_decode((string) file_get_contents($path), true);

        return is_array($raw) ? $raw : ['phases' => []];
    }

    /**
     * @return array{fase:int,titulo:string,resumo:string}
     */
    public function getPhaseInfo(int $n): array
    {
        $map = $this->loadStorytellingMap();
        foreach ($map['phases'] ?? [] as $phase) {
            if (!is_array($phase)) {
                continue;
            }
            if ((int) ($phase['fase'] ?? 0) === $n) {
                return [
                    'fase' => $n,
                    'titulo' => (string) ($phase['titulo'] ?? ('Fase '.$n)),
                    'resumo' => (string) ($phase['resumo'] ?? ''),
                ];
            }
        }

        return ['fase' => $n, 'titulo' => 'Fase '.$n, 'resumo' => ''];
    }

    /**
     * @return array{error?:string,data?:array<string,mixed>,tokens?:array{total:int}}
     */
    public function generateActivation(int $n): array
    {
        if ($n < 1 || $n > 31) {
            return ['error' => 'Ativação deve ser entre 1 e 31.'];
        }
        $key = $this->apiKey();
        if ($key === '') {
            return ['error' => 'Chave OpenAI não configurada (OPENAI_API_KEY ou BIBLE_OPENAI_API_KEY).'];
        }

        $phase = $this->getPhaseInfo($n);
        $next = $n < 31 ? $n + 1 : 1;
        $userPrompt = 'Livro: "Do Fracasso ao Legado" — Ativação '.$n.' de 31 (Provérbios '.$n.").

Mapa storytelling Fase {$n}:
Título: {$phase['titulo']}
Resumo: {$phase['resumo']}

Gere a Ativação completa com as 8 ENGENHAGENS abaixo. Tom: premium, pastoral, storytelling com personagem \"King\", português do Brasil.

Responda APENAS JSON válido (sem markdown) neste formato:
{
  \"titulo\": \"título da ativação\",
  \"decreto_entrada\": \"frase decreto KING de abertura\",
  \"fundamento_sagrado\": \"texto corrido inspirado em Provérbios {$n} estilo NTLH, SEM numeração de versículos, 2-4 parágrafos\",
  \"diagnostico_escassez\": \"diagnóstico da escassez mental/financeira\",
  \"estrada_com_king\": \"storytelling Na Estrada com o KING — fase {$n}\",
  \"diretriz_ilustracao\": \"descrição visual para ilustração\",
  \"mentalidade_travada\": \"crença limitante\",
  \"nova_mentalidade\": \"governo da nova mentalidade\",
  \"exercicio_fixacao\": \"exercício prático de fixação\",
  \"ie_chave\": \"imagem e emoção chave (IE)\",
  \"treino_negocios\": \"tarefa prática de negócios\",
  \"treino_altar\": \"tarefa prática de altar/oração\",
  \"sentenca_ativacao\": \"decreto final poderoso para antes de dormir\",
  \"proximo_episodio\": \"gancho estilo Netflix para Ativação {$next}\"
}

Regras: não invente versículos numerados; fundamento corrido; sentença de ativação memorável; próximo episódio cria curiosidade.";

        try {
            $res = Http::timeout(120)
                ->withToken($key)
                ->post(self::CHAT_URL, [
                    'model' => $this->model(),
                    'temperature' => 0.75,
                    'max_tokens' => 4500,
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'Você escreve conteúdo cristão de prosperidade e legado em português do Brasil. Responde somente JSON válido.',
                        ],
                        ['role' => 'user', 'content' => $userPrompt],
                    ],
                ]);

            if (!$res->successful()) {
                $msg = (string) data_get($res->json(), 'error.message', $res->reason());

                return ['error' => $msg !== '' ? $msg : 'Erro ao chamar a IA.'];
            }

            $text = (string) data_get($res->json(), 'choices.0.message.content', '');
            $cleaned = trim(preg_replace('/^\s*```(?:json)?\s*/i', '', $text) ?? $text);
            $cleaned = trim(preg_replace('/\s*```\s*$/', '', $cleaned) ?? $cleaned);
            $parsed = json_decode($cleaned, true);
            if (!is_array($parsed)) {
                return ['error' => 'Resposta da IA em formato inválido.'];
            }

            $usage = (int) data_get($res->json(), 'usage.total_tokens', 0);

            return [
                'data' => $parsed,
                'tokens' => ['total' => $usage],
            ];
        } catch (\Throwable $e) {
            Log::error('prosperidade.ai', ['error' => $e->getMessage()]);

            return ['error' => $e->getMessage() ?: 'Falha ao gerar ativação.'];
        }
    }
}
