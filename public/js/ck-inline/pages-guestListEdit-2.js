(function() {
            const urlParams = new URLSearchParams(window.location.search);
            const itemId = urlParams.get('itemId') || urlParams.get('id');
            const mode = urlParams.get('mode');
            
            // Se h itemId e não estamos explicitamente em modo de gerenciamento, mostrar apenas o editor KingForms
            document.addEventListener('DOMContentLoaded', function() {
                if (itemId && mode !== 'manage') {
                    // Ocultar conteúdo de gerenciamento
                    const managementContainer = document.getElementById('guest-list-management-container');
                    if (managementContainer) {
                        managementContainer.style.display = 'none';
                    }
                    
                    // Mostrar editor KingForms
                    const editorContainer = document.getElementById('kingforms-editor-container');
                    if (editorContainer) {
                        editorContainer.style.display = 'block';
                    }
                    
                    // Configurar botão voltar do editor
                    const editorBackBtn = document.getElementById('editor-back-btn');
                    if (editorBackBtn) {
                        editorBackBtn.addEventListener('click', function(e) {
                            e.preventDefault();
                            const formItemId = urlParams.get('formItemId');
                            if (formItemId) {
                                window.location.href = `/formPageEdit?itemId=${formItemId}`;
                            } else {
                                window.location.href = `/guestListEdit?itemId=${itemId}&mode=manage`;
                            }
                        });
                    }
                } else {
                    // Mostrar gerenciamento e ocultar editor
                    const managementContainer = document.getElementById('guest-list-management-container');
                    if (managementContainer) {
                        managementContainer.style.display = 'block';
                    }
                    
                    const editorContainer = document.getElementById('kingforms-editor-container');
                    if (editorContainer) {
                        editorContainer.style.display = 'none';
                    }
                }
            });
        })();
