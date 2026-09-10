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
                
                // Verificar e remover elementos específicos
                const allElements = document.querySelectorAll('*');
                allElements.forEach(el => {
                    const text = el.textContent || '';
                    const innerText = el.innerText || '';
                    
                    // Se o elemento contém apenas "image.png", remover
                    if ((text.trim() === 'image.png' || innerText.trim() === 'image.png') && 
                        el.children.length === 0) {
                        el.style.display = 'none';
                        el.style.visibility = 'hidden';
                        el.style.opacity = '0';
                        el.style.height = '0';
                        el.style.width = '0';
                        el.style.overflow = 'hidden';
                        el.style.fontSize = '0';
                        el.style.lineHeight = '0';
                        try {
                            el.remove();
                        } catch(e) {
                            el.textContent = '';
                            el.innerHTML = '';
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
            
            // Observar mudanças no DOM
            if (window.MutationObserver) {
                const observer = new MutationObserver(function(mutations) {
                    removeImagePngText();
                });
                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
            }
        })();
