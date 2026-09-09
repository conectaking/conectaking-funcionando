<?php

namespace App\Services\Suggestions;

/**
 * Sugestões de texto (lógica local, sem IA) — porte de routes/suggestions.js.
 */
class SuggestionsService
{
    /**
     * @param  array<string,mixed>  $context
     * @return array<int,string>
     */
    public function generate(string $type, string $prompt, array $context = []): array
    {
        $suggestions = match ($type) {
            'store_description' => $this->storeDescriptions($prompt, $context),
            'meta_title' => $this->metaTitles($prompt, $context),
            'meta_description' => $this->metaDescriptions($prompt, $context),
            'product_name' => $this->productNames($prompt),
            'product_description' => $this->productDescriptions($prompt),
            default => ['Tipo de sugestão não reconhecido.'],
        };

        return array_map(fn (string $s): string => $this->formatText($s), $suggestions);
    }

    public function isSalesType(string $type, string $prompt): bool
    {
        $lowerPrompt = mb_strtolower($prompt);

        return str_contains($type, 'sales')
            || str_contains($type, 'venda')
            || str_contains($type, 'store')
            || str_contains($type, 'product')
            || str_contains($lowerPrompt, 'venda')
            || str_contains($lowerPrompt, 'comercial');
    }

    /**
     * Análise profunda de vendas (heurística local) — devolve markdown.
     */
    public function analisarVendasProfundo(string $conteudo, string $tipo): string
    {
        $pontosFortes = [];
        $pontosFracos = [];
        $oportunidades = [];

        $palavrasChave = array_filter(
            preg_split('/\s+/u', mb_strtolower($conteudo)) ?: [],
            fn (string $w): bool => mb_strlen($w) > 2
        );
        $palavrasVendas = ['compre', 'agora', 'oferta', 'desconto', 'garantia', 'limitado', 'exclusivo', 'urgente'];
        $temPalavrasVendas = count(array_intersect($palavrasVendas, $palavrasChave)) > 0;

        $primeiraLinha = explode("\n", $conteudo)[0] ?? '';
        $temTitulo = mb_strlen($conteudo) > 0 && mb_strlen($primeiraLinha) < 100;
        $temDescricao = mb_strlen($conteudo) > 50;
        $temCallToAction = (bool) preg_match('/(compre|adquira|garanta|clique|saiba mais)/iu', $conteudo);

        $temBeneficios = (bool) preg_match('/(benefício|vantagem|resultado|transforma)/iu', $conteudo);
        $temUrgencia = (bool) preg_match('/(limitado|últimas|hoje|agora|urgente)/iu', $conteudo);
        $temProvaSocial = (bool) preg_match('/(testemunho|depoimento|cliente|resultado)/iu', $conteudo);

        if ($temTitulo) {
            $pontosFortes[] = '✅ Tem título claro e objetivo';
        }
        if ($temDescricao) {
            $pontosFortes[] = '✅ Descrição presente e informativa';
        }
        if ($temCallToAction) {
            $pontosFortes[] = '✅ Call-to-action identificado';
        }
        if ($temBeneficios) {
            $pontosFortes[] = '✅ Menciona benefícios ao cliente';
        }
        if (! $temPalavrasVendas) {
            $pontosFracos[] = '⚠️ Falta palavras-chave de vendas (compre, agora, oferta)';
        }
        if (! $temUrgencia) {
            $oportunidades[] = '💡 Adicionar urgência (limitado, últimas unidades)';
        }
        if (! $temProvaSocial) {
            $oportunidades[] = '💡 Incluir prova social (depoimentos, resultados)';
        }

        $score = 50;
        if ($temTitulo) {
            $score += 10;
        }
        if ($temDescricao) {
            $score += 10;
        }
        if ($temCallToAction) {
            $score += 15;
        }
        if ($temBeneficios) {
            $score += 10;
        }
        if ($temPalavrasVendas) {
            $score += 5;
        }
        $score = min($score, 100);

        $resposta = "## 📊 **Análise Profunda de {$tipo}**\n\n";
        $resposta .= "**Score Geral: {$score}/100**\n\n";

        $resposta .= "### ✅ **Pontos Fortes:**\n";
        foreach ($pontosFortes as $p) {
            $resposta .= $p."\n";
        }
        if ($pontosFortes === []) {
            $resposta .= "Nenhum ponto forte identificado.\n";
        }

        $resposta .= "\n### ⚠️ **Pontos de Melhoria:**\n";
        foreach ($pontosFracos as $p) {
            $resposta .= $p."\n";
        }
        if ($pontosFracos === []) {
            $resposta .= "Nenhum ponto fraco crítico identificado.\n";
        }

        $resposta .= "\n### 💡 **Oportunidades:**\n";
        foreach ($oportunidades as $p) {
            $resposta .= $p."\n";
        }
        if ($oportunidades === []) {
            $resposta .= "Oportunidades já exploradas.\n";
        }

        $resposta .= "\n### 💼 **Minha Opinião Profissional:**\n\n";
        if ($score >= 80) {
            $resposta .= 'Este conteúdo está muito bem estruturado! Tem boa base para conversão. ';
        } elseif ($score >= 60) {
            $resposta .= 'Bom conteúdo, mas há espaço para melhorias significativas. ';
        } else {
            $resposta .= 'Este conteúdo precisa de melhorias importantes para converter melhor. ';
        }
        $resposta .= 'Recomendo focar nas oportunidades identificadas acima para aumentar a taxa de conversão.';

        return $resposta;
    }

    /**
     * @param  array<string,mixed>  $context
     * @return array<int,string>
     */
    private function storeDescriptions(string $prompt, array $context): array
    {
        $storeTitle = (string) ($context['storeTitle'] ?? $prompt);
        $k = mb_strtolower($prompt);

        $isPhotography = $this->hasAny($k, ['fotografo', 'fotografia', 'retratista', 'foto', 'ensaios', 'sessão']);
        $isService = $this->hasAny($k, ['serviço', 'consultoria', 'atendimento', 'trabalho']);

        if ($isPhotography) {
            return [
                "{$storeTitle} - Especializado em fotografia e retratos profissionais. Capturo momentos únicos e transformo em memórias eternas. Com anos de experiência, ofereço serviços personalizados de alta qualidade para casamentos, eventos, ensaios e retratos familiares. Cada clique é uma obra de arte!",
                "Bem-vindo à {$storeTitle}! Sou fotógrafo profissional especializado em retratos e ensaios fotográficos. Minha paixão é capturar a essência de cada pessoa, criando imagens autênticas e emocionantes. Trabalho com equipamentos de última geração e técnicas modernas para garantir resultados excepcionais.",
                "{$storeTitle} - Fotografia profissional com olhar artístico. Especializado em retratos que revelam a personalidade única de cada cliente. Ofereço sessões personalizadas, desde ensaios individuais até eventos corporativos. Cada projeto é tratado com dedicação e criatividade para superar expectativas.",
                "Na {$storeTitle}, transformo momentos especiais em memórias duradouras através da fotografia profissional. Com experiência em diversos estilos e técnicas, ofereço serviços completos de retrato, eventos e ensaios. Comprometido em entregar imagens que emocionam e contam histórias únicas.",
                "{$storeTitle} - Sua referência em fotografia e retratos. Trabalho com paixão e profissionalismo para criar imagens que realmente importam. Especializado em capturar a beleza natural e autenticidade de cada pessoa. Agende sua sessão e descubra como a fotografia pode transformar momentos em arte!",
                "Conheça {$storeTitle}, onde a fotografia encontra a arte. Especializado em retratos profissionais que valorizam a essência de cada cliente. Ofereço serviços personalizados com atenção aos detalhes, desde o planejamento até a entrega final. Cada imagem é cuidadosamente trabalhada para garantir excelência.",
                "{$storeTitle} - Fotografia profissional com toque artístico. Capturo momentos únicos através de uma visão criativa e técnica apurada. Especializado em retratos, ensaios e eventos, ofereço uma experiência completa e personalizada. Suas memórias merecem ser eternizadas com qualidade e dedicação.",
            ];
        }

        if ($isService) {
            return [
                "{$storeTitle} - Serviços profissionais de excelência. Oferecemos soluções personalizadas para atender suas necessidades com qualidade e comprometimento. Nossa equipe está preparada para entregar resultados que superam expectativas. Entre em contato e descubra como podemos ajudar!",
                "Bem-vindo à {$storeTitle}! Somos especialistas em oferecer serviços de alta qualidade com atendimento diferenciado. Trabalhamos com dedicação e profissionalismo para garantir sua satisfação. Cada projeto é tratado com atenção especial e compromisso com a excelência.",
                "{$storeTitle} - Sua parceira em soluções profissionais. Oferecemos serviços personalizados com foco em resultados e qualidade. Nossa experiência e comprometimento fazem a diferença em cada atendimento. Conte conosco para transformar suas necessidades em soluções eficientes.",
            ];
        }

        return [
            "Bem-vindo à {$storeTitle}! Somos especialistas em oferecer produtos de alta qualidade com os melhores preços do mercado. Nossa missão é proporcionar uma experiência única de compra, com atendimento personalizado e entrega rápida. Confira nossos produtos exclusivos e descubra o que temos de melhor para você!",
            "{$storeTitle} - Sua loja de confiança! Trabalhamos com produtos selecionados, sempre pensando no seu bem-estar e satisfação. Oferecemos variedade, qualidade e preços que cabem no seu bolso. Venha conhecer nossas ofertas especiais e transforme sua experiência de compra!",
            "Na {$storeTitle}, acreditamos que cada cliente merece o melhor. Por isso, selecionamos cuidadosamente nossos produtos para garantir qualidade, durabilidade e excelente custo-benefício. Faça parte da nossa família de clientes satisfeitos e aproveite as melhores ofertas!",
            "Descubra {$storeTitle} - onde qualidade encontra preço justo! Nossa equipe está sempre pronta para atendê-lo com dedicação e carinho. Oferecemos produtos cuidadosamente escolhidos para atender suas necessidades. Venha nos visitar e aproveite nossas promoções exclusivas!",
            "{$storeTitle} é sinônimo de confiança e qualidade. Trabalhamos há anos no mercado, sempre priorizando a satisfação dos nossos clientes. Nossos produtos são selecionados com rigor para garantir que você tenha acesso ao melhor. Explore nosso catálogo e encontre exatamente o que procura!",
        ];
    }

    /**
     * @param  array<string,mixed>  $context
     * @return array<int,string>
     */
    private function metaTitles(string $prompt, array $context): array
    {
        $storeTitle = (string) ($context['storeTitle'] ?? $prompt);

        return [
            "{$storeTitle} | Produtos de Qualidade e Preços Incríveis",
            "{$storeTitle} - Sua Loja de Confiança | Melhores Ofertas",
            "{$storeTitle} | Encontre Tudo que Você Precisa Aqui",
            "Compre em {$storeTitle} | Qualidade Garantida e Entrega Rápida",
            "{$storeTitle} | Os Melhores Produtos com os Melhores Preços",
            "{$storeTitle} - Onde Qualidade Encontra Preço Justo",
            "Produtos Selecionados em {$storeTitle} | Confira Nossas Ofertas",
        ];
    }

    /**
     * @param  array<string,mixed>  $context
     * @return array<int,string>
     */
    private function metaDescriptions(string $prompt, array $context): array
    {
        $storeTitle = (string) ($context['storeTitle'] ?? $prompt);
        $k = mb_strtolower($prompt);

        $isPhotography = $this->hasAny($k, ['fotografo', 'fotografia', 'retratista', 'foto', 'ensaios', 'sessão']);
        $isService = $this->hasAny($k, ['serviço', 'consultoria', 'atendimento', 'trabalho']);

        if ($isPhotography) {
            return [
                "{$storeTitle} - Fotografia profissional especializada em retratos e ensaios. Capturo momentos únicos e transformo em memórias eternas. Serviços personalizados com qualidade excepcional. Agende sua sessão!",
                "Fotografia profissional com {$storeTitle}. Especializado em retratos que revelam a personalidade única. Ensaios personalizados, eventos e sessões corporativas. Qualidade e dedicação em cada projeto.",
                "{$storeTitle} oferece serviços de fotografia profissional com olhar artístico. Retratos autênticos, ensaios personalizados e cobertura de eventos. Transforme momentos especiais em obras de arte.",
                "Fotógrafo profissional {$storeTitle} - Especializado em criar imagens que emocionam. Retratos, ensaios e eventos com técnica apurada e criatividade. Suas memórias merecem ser eternizadas com qualidade.",
            ];
        }

        if ($isService) {
            return [
                "{$storeTitle} - Serviços profissionais de excelência. Soluções personalizadas com qualidade e comprometimento. Entre em contato e descubra como podemos ajudar!",
                "Serviços profissionais com {$storeTitle}. Atendimento diferenciado e resultados que superam expectativas. Qualidade e dedicação em cada projeto.",
            ];
        }

        return [
            "Descubra {$storeTitle} - sua loja de confiança com produtos de alta qualidade e os melhores preços. Atendimento personalizado, entrega rápida e garantia de satisfação. Aproveite nossas ofertas exclusivas!",
            "Na {$storeTitle}, você encontra produtos selecionados com cuidado para garantir qualidade e durabilidade. Oferecemos variedade, preços justos e um atendimento que faz a diferença. Venha conhecer!",
            "{$storeTitle} - onde qualidade encontra preço justo! Trabalhamos com produtos cuidadosamente escolhidos para atender suas necessidades. Confira nossas promoções e transforme sua experiência de compra.",
        ];
    }

    /**
     * @return array<int,string>
     */
    private function productNames(string $prompt): array
    {
        $baseName = mb_strtoupper(mb_substr($prompt, 0, 1)).mb_substr($prompt, 1);

        $prefixes = ['Premium', 'Pro', 'Elite', 'Plus', 'Max', 'Ultra', 'Super', 'Master', 'Expert'];
        $suffixes = ['Edition', 'Collection', 'Series', 'Line', 'Model'];
        $quality = ['Qualidade', 'Selecionado', 'Especial', 'Exclusivo', 'Único', 'Profissional'];

        $pre = fn (): string => $prefixes[array_rand($prefixes)];
        $suf = fn (): string => $suffixes[array_rand($suffixes)];
        $qua = fn (): string => $quality[array_rand($quality)];

        return [
            "{$baseName} {$pre()}",
            "{$qua()} {$baseName}",
            "{$baseName} - {$qua()}",
            "Novo {$baseName}",
            "{$baseName} {$pre()} {$suf()}",
            "{$baseName} {$suf()}",
            "{$qua()} {$baseName} {$pre()}",
        ];
    }

    /**
     * @return array<int,string>
     */
    private function productDescriptions(string $productName): array
    {
        $name = trim($productName);

        return [
            "Descubra o {$name} - um produto de alta qualidade que combina funcionalidade e estilo. Perfeito para quem busca excelência e durabilidade. Não perca a oportunidade de adquirir este produto incrível!",
            "O {$name} é a escolha ideal para você que valoriza qualidade e bom gosto. Com design moderno e materiais selecionados, este produto foi pensado para atender suas necessidades com excelência. Garanta já o seu!",
            "Experimente o {$name} e descubra a diferença que um produto de qualidade faz. Desenvolvido com atenção aos detalhes, oferece performance superior e durabilidade comprovada. Aproveite esta oportunidade única!",
            "{$name} - qualidade que você pode confiar! Este produto foi cuidadosamente selecionado para oferecer o melhor custo-benefício. Ideal para quem busca praticidade sem abrir mão da excelência. Não deixe passar!",
            "Conheça o {$name}, um produto que une inovação e tradição. Com características únicas e design diferenciado, é perfeito para quem busca algo especial. Adquira agora e transforme sua experiência!",
            "O {$name} foi desenvolvido para atender às mais altas expectativas. Com tecnologia de ponta e materiais premium, oferece resultados excepcionais. Invista em qualidade e tenha a melhor experiência possível!",
            "Descubra todas as vantagens do {$name}. Produto cuidadosamente elaborado para proporcionar máxima satisfação. Design elegante, funcionalidade superior e garantia de qualidade. Não perca esta oportunidade!",
        ];
    }

    /**
     * @param  array<int,string>  $needles
     */
    private function hasAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (str_contains($haystack, $needle)) {
                return true;
            }
        }

        return false;
    }

    private function formatText(string $text): string
    {
        if ($text === '') {
            return '';
        }

        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
        $text = preg_replace('/([.!?])([A-Za-z])/u', '$1 $2', $text) ?? $text;
        $text = preg_replace('/([a-z])([!?])/u', '$1 $2', $text) ?? $text;
        $text = preg_replace('/\s+([,.])/u', '$1', $text) ?? $text;
        $text = preg_replace('/,([A-Za-z])/u', ', $1', $text) ?? $text;
        $text = trim($text);

        if ($text === '') {
            return '';
        }

        $text = mb_strtoupper(mb_substr($text, 0, 1)).mb_substr($text, 1);

        if (! preg_match('/[.!?]$/u', $text)) {
            $text .= '.';
        }

        return $text;
    }
}
