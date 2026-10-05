(function() {
            function removeImagePngText() {
                // Função para remover nós de texto que contenham "image.png"
                function removeTextNodes(node) {
                    if (!node) return;
                    
                    // Verificar todos os nós filhos
                    const children = Array.from(node.childNodes || []);
                    children.forEach(child => {
                        if (child.nodeType === Node.TEXT_NODE) {
                            const text = child.textContent || child.nodeValue || '';
                            if (text.includes('image.png') || text.trim().includes('image.png')) {
                                try {
                                    child.parentNode && child.parentNode.removeChild(child);
                                } catch(e) {
                                    child.textContent = '';
                                    child.nodeValue = '';
                                }
                            }
                        } else if (child.nodeType === Node.ELEMENT_NODE) {
                            // Verificar atributos que possam conter o texto
                            Array.from(child.attributes || []).forEach(attr => {
                                if (attr.value && attr.value.includes('image.png')) {
                                    child.removeAttribute(attr.name);
                                }
                            });
                            
                            // Continuar recursivamente
                            removeTextNodes(child);
                        }
                    });
                }
                
                // Remover de todo o documento
                removeTextNodes(document.body);
                removeTextNodes(document.documentElement);
                removeTextNodes(document.head);
                
                // Verificar especificamente a área ao redor do botão mobile e filhos diretos do body
                const bodyChildren = Array.from((document.body && document.body.childNodes) || []);
                bodyChildren.forEach(child => {
                    if (child.nodeType === Node.TEXT_NODE) {
                        const text = child.nodeValue || '';
                        if (text.includes('image.png')) {
                            try { child.parentNode && child.parentNode.removeChild(child); } catch(e) { child.nodeValue = ''; }
                        }
                    } else if (child.nodeType === Node.ELEMENT_NODE && child.children.length === 0) {
                        const text = (child.textContent || '').trim();
                        if (text === 'image.png') {
                            try { child.remove(); } catch(e) { child.textContent = ''; }
                        }
                    }
                });
                
                // Verificar especificamente a área ao redor do botão mobile
                const mobileToggle = document.querySelector('.mobile-menu-toggle');
                if (mobileToggle && mobileToggle.parentNode) {
                    const parent = mobileToggle.parentNode;
                    const siblings = Array.from(parent.childNodes || []);
                    siblings.forEach(sibling => {
                        if (sibling !== mobileToggle && sibling.nodeType === Node.TEXT_NODE) {
                            const text = sibling.textContent || sibling.nodeValue || '';
                            if (text.includes('image.png') || text.trim().includes('image.png')) {
                                try {
                                    sibling.parentNode && sibling.parentNode.removeChild(sibling);
                                } catch(e) {
                                    sibling.textContent = '';
                                    sibling.nodeValue = '';
                                }
                            }
                        }
                    });
                }
            }
            
            // Executar imediatamente
            removeImagePngText();
            
            // Executar quando DOM estiver pronto
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', removeImagePngText);
            } else {
                removeImagePngText();
            }
            
            // Executar múltiplas vezes para garantir
            setTimeout(removeImagePngText, 50);
            setTimeout(removeImagePngText, 100);
            setTimeout(removeImagePngText, 200);
            setTimeout(removeImagePngText, 500);
            setTimeout(removeImagePngText, 1000);
            
            // Observar mudanças no DOM (debounced e filtrado para não interferir na digitação)
            if (window.MutationObserver) {
                var _mutTimer = null;
                const observer = new MutationObserver(function(mutations) {
                    var shouldCheck = false;
                    for (var i = 0; i < mutations.length; i++) {
                        var m = mutations[i];
                        if (m.type === 'childList' && m.addedNodes.length > 0) {
                            for (var j = 0; j < m.addedNodes.length; j++) {
                                var n = m.addedNodes[j];
                                if ((n.textContent || '').includes('image.png')) {
                                    shouldCheck = true;
                                    break;
                                }
                            }
                        } else if (m.type === 'characterData') {
                            if ((m.target.textContent || '').includes('image.png')) {
                                shouldCheck = true;
                            }
                        }
                        if (shouldCheck) break;
                    }
                    if (shouldCheck) {
                        if (_mutTimer) clearTimeout(_mutTimer);
                        _mutTimer = setTimeout(removeImagePngText, 200);
                    }
                });
                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
            }
        })();
