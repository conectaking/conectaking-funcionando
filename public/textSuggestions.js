/**
 * Sistema de Sugestes de Texto
 * Gera sugestes inteligentes baseadas em templates e palavras-chave
 */

(function() {
    'use strict';

    window.TextSuggestions = {
        /**
         * Gerar sugesto de descrição da loja
         */
        generateStoreDescription(prompt) {
            if (!prompt || prompt.trim().length < 3) {
                return 'Por favor, digite pelo menos 3 caracteres para gerar uma sugest';
            }

            const keywords = prompt.toLowerCase().trim();
            const templates = [
                `Bem-vindo  ${prompt}! Somos especialistas em oferecer produtos de alta qualidade com os melhores preos do mercado. Nossa missão  proporcionar uma experincia nica de compra, com atendimento personalizado e entrega rpida. Confira nossos produtos exclusivos e descubra o que temos de melhor para você!`,
                
                `${prompt} - Sua loja de confiana! Trabalhamos com produtos selecionados, sempre pensando no seu bem-estar e satisfaOferecemos variedade, qualidade e preos que cabem no seu bolso. Venha conhecer nossas ofertas especiais e transforme sua experincia de compra!`,
                
                `Na ${prompt}, acreditamos que cada cliente merece o melhor. Por isso, selecionamos cuidadosamente nossos produtos para garantir qualidade, durabilidade e excelente custo-benefcio. Faa parte da nossa famlia de clientes satisfeitos e aproveite as melhores ofertas!`,
                
                `Descubra ${prompt} - onde qualidade encontra preo justo! Nossa equipe est sempre pronta para atendlo com dedicao e carinho. Oferecemos produtos cuidadosamente escolhidos para atender suas necessidades. Venha nos visitar e aproveite nossas promoes exclusivas!`,
                
                `${prompt}  sinnimo de confiana e qualidade. Trabalhamos h anos no mercado, sempre priorizando a satisfao dos nossos clientes. Nossos produtos são selecionados com rigor para garantir que você tenha acesso ao melhor. Explore nosso catlogo e encontre exatamente o que procura!`
            ];

            // Escolher template baseado em palavras-chave
            let selectedTemplate = templates[0];
            if (keywords.includes('qualidade') || keywords.includes('melhor')) {
                selectedTemplate = templates[0];
            } else if (keywords.includes('confiana') || keywords.includes('confiavel')) {
                selectedTemplate = templates[1];
            } else if (keywords.includes('cliente') || keywords.includes('atendimento')) {
                selectedTemplate = templates[2];
            } else if (keywords.includes('preo') || keywords.includes('barato') || keywords.includes('oferta')) {
                selectedTemplate = templates[3];
            } else {
                selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
            }

            return selectedTemplate;
        },

        /**
         * Gerar sugesto de meta título
         */
        generateMetaTitle(prompt, storeTitle = '') {
            if (!prompt || prompt.trim().length < 3) {
                return storeTitle || 'Minha Loja - Produtos de Qualidade';
            }

            const keywords = prompt.toLowerCase().trim();
            const baseTitle = storeTitle || prompt;
            
            const templates = [
                `${baseTitle} | Produtos de Qualidade e Preos Incrveis`,
                `${baseTitle} - Sua Loja de Confiana | Melhores Ofertas`,
                `${baseTitle} | Encontre Tudo que Você Precisa Aqui`,
                `Compre em ${baseTitle} | Qualidade Garantida e Entrega Rpida`,
                `${baseTitle} | Os Melhores Produtos com os Melhores Preos`
            ];

            // Escolher baseado em palavras-chave
            if (keywords.includes('oferta') || keywords.includes('promoo')) {
                return templates[1];
            } else if (keywords.includes('qualidade')) {
                return templates[0];
            } else if (keywords.includes('entrega') || keywords.includes('rpido')) {
                return templates[3];
            } else {
                return templates[Math.floor(Math.random() * templates.length)];
            }
        },

        /**
         * Gerar sugesto de meta descrição
         */
        generateMetaDescription(prompt, storeTitle = '') {
            if (!prompt || prompt.trim().length < 3) {
                return `Confira os melhores produtos em ${storeTitle || 'nossa loja'}. Qualidade garantida, preos incrveis e entrega rpida. Aproveite nossas ofertas especiais!`;
            }

            const keywords = prompt.toLowerCase().trim();
            const baseTitle = storeTitle || prompt;
            
            const templates = [
                `Descubra ${baseTitle} - sua loja de confiana com produtos de alta qualidade e os melhores preos. Atendimento personalizado, entrega rpida e garantia de satisfaAproveite nossas ofertas exclusivas!`,
                
                `Na ${baseTitle}, você encontra produtos selecionados com cuidado para garantir qualidade e durabilidade. Oferecemos variedade, preos justos e um atendimento que faz a diferena. Venha conhecer!`,
                
                `${baseTitle} - onde qualidade encontra preo justo! Trabalhamos com produtos cuidadosamente escolhidos para atender suas necessidades. Confira nossas promoes e transforme sua experincia de compra.`,
                
                `Explore ${baseTitle} e descubra uma seleção especial de produtos. Oferecemos qualidade, variedade e os melhores preos do mercado. Faa parte da nossa famlia de clientes satisfeitos!`
            ];

            return templates[Math.floor(Math.random() * templates.length)];
        },

        /**
         * Gerar sugesto de descrição de produto
         */
        generateProductDescription(productName, prompt = '') {
            if (!productName || productName.trim().length < 2) {
                return 'Por favor, digite o nome do produto primeiro.';
            }

            const name = productName.trim();
            const keywords = (prompt || name).toLowerCase();
            
            const templates = [
                `Descubra o ${name} - um produto de alta qualidade que combina funcionalidade e estilo. Perfeito para quem busca excelncia e durabilidade. Não perca a oportunidade de adquirir este produto incrvel!`,
                
                `O ${name}  a escolha ideal para você que valoriza qualidade e bom gosto. Com design moderno e materiais selecionados, este produto foi pensado para atender suas necessidades com excelncia. Garanta j o seu!`,
                
                `Experimente o ${name} e descubra a diferena que um produto de qualidade faz. Desenvolvido com atenção aos detalhes, oferece performance superior e durabilidade comprovada. Aproveite esta oportunidade nica!`,
                
                `${name} - qualidade que você pode confiar! Este produto foi cuidadosamente selecionado para oferecer o melhor custo-benefcio. Ideal para quem busca praticidade sem abrir mo da excelncia. Não deixe passar!`,
                
                `Conhea o ${name}, um produto que une inovao e tradiCom caracterticas nicas e design diferenciado,  perfeito para quem busca algo especial. Adquira agora e transforme sua experincia!`
            ];

            // Escolher baseado em palavras-chave
            if (keywords.includes('qualidade') || keywords.includes('premium')) {
                return templates[0];
            } else if (keywords.includes('design') || keywords.includes('moderno')) {
                return templates[1];
            } else if (keywords.includes('performance') || keywords.includes('durabilidade')) {
                return templates[2];
            } else if (keywords.includes('preo') || keywords.includes('barato')) {
                return templates[3];
            } else {
                return templates[Math.floor(Math.random() * templates.length)];
            }
        },

        /**
         * Gerar sugesto de nome de produto
         */
        generateProductName(prompt) {
            if (!prompt || prompt.trim().length < 2) {
                return 'Por favor, digite pelo menos 2 caracteres para gerar uma sugest';
            }

            const keywords = prompt.toLowerCase().trim();
            
            // Adicionar palavras que chamam atenção
            const attentionWords = ['Premium', 'Pro', 'Elite', 'Plus', 'Max', 'Ultra', 'Super'];
            const qualityWords = ['Qualidade', 'Selecionado', 'Especial', 'Exclusivo', 'nico'];
            
            // Gerar variaes
            const variations = [
                `${prompt.charAt(0).toUpperCase() + prompt.slice(1)} ${attentionWords[Math.floor(Math.random() * attentionWords.length)]}`,
                `${qualityWords[Math.floor(Math.random() * qualityWords.length)]} ${prompt.charAt(0).toUpperCase() + prompt.slice(1)}`,
                `${prompt.charAt(0).toUpperCase() + prompt.slice(1)} - ${qualityWords[Math.floor(Math.random() * qualityWords.length)]}`,
                `Novo ${prompt.charAt(0).toUpperCase() + prompt.slice(1)}`,
                `${prompt.charAt(0).toUpperCase() + prompt.slice(1)} ${attentionWords[Math.floor(Math.random() * attentionWords.length)]} Edition`
            ];

            return variations[Math.floor(Math.random() * variations.length)];
        },

        /**
         * Mostrar sugestes em um modal/popup
         */
        showSuggestions(containerId, suggestions, onSelect) {
            const container = document.getElementById(containerId);
            if (!container) return;

            // Criar ou atualizar container de sugestes
            let suggestionsBox = container.querySelector('.suggestions-box');
            if (!suggestionsBox) {
                suggestionsBox = document.createElement('div');
                suggestionsBox.className = 'suggestions-box';
                container.appendChild(suggestionsBox);
            }

            // Converter sugestes em array se for string nica
            const suggestionsArray = Array.isArray(suggestions) ? suggestions : [suggestions];

            suggestionsBox.innerHTML = `
                <div class="suggestions-header">
                    <i class="fas fa-lightbulb"></i> Sugestes
                    <button type="button" class="btn-close-suggestions" onclick="this.closest('.suggestions-box').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="suggestions-list">
                    ${suggestionsArray.map((suggestion, index) => `
                        <div class="suggestion-item" data-index="${index}">
                            <p>${suggestion}</p>
                            <button type="button" class="btn-use-suggestion" data-index="${index}">
                                <i class="fas fa-check"></i> Usar
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;

            // Adicionar listeners
            suggestionsBox.querySelectorAll('.btn-use-suggestion').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.index);
                    const selectedSuggestion = suggestionsArray[index];
                    if (onSelect && typeof onSelect === 'function') {
                        onSelect(selectedSuggestion);
                    }
                    suggestionsBox.remove();
                });
            });

            // Mostrar sugestes
            suggestionsBox.style.display = 'block';
        }
    };

})();

