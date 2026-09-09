<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>Minha Conta - Conecta King</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    
    <link rel="stylesheet" href="style.css?v=2025-12-23-02">
</head>
<body>
    <header class="main-header">
        <div class="container navbar">
            <a href="index.html" class="logo">Conecta King <i class="fa-solid fa-crown logo-crown"></i></a>
            <nav class="main-nav">
                <a href="#solucao" class="nav-link-desktop">A Soluo</a>
                <a href="#features" class="nav-link-desktop">Recursos</a>
                <a href="#planos" class="nav-link-desktop">Planos</a>
                <button class="theme-toggle-btn" id="theme-toggle" title="Alterar tema"><i class="fas fa-sun"></i></button>
                
                <div id="nav-auth-section">
                    <div class="logged-out-state">
                        <a href="login.html" class="btn btn-secondary">Login</a>
                        <a href="registro.html" class="btn btn-primary">Criar Carto</a>
                    </div>
                    <div class="logged-in-state" style="display: none;">
                        <a href="dashboard.html" class="btn btn-secondary">Meu Painel</a>
                        <div class="profile-button" id="user-profile-btn">
                            <img id="navbar-user-avatar" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNzUiIGN5PSI3NSIgcj0iNzAiIGZpbGw9IiMzMzMzMzMiLz48dGV4dCB4PSI3NSIgeT0iODUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI0MCI+8J+RiDwvdGV4dD48L3N2Zz4=" alt="Avatar">
                            <ul class="profile-dropdown">
                                <li><a href="conta.html"><i class="fas fa-cog"></i>Configurações</a></li>
                                <li id="logout-btn-global"><a href="#"><i class="fas fa-sign-out-alt"></i>Sair</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </nav>
        </div>
    </header>

    <main class="account-page">
        <div class="container">
            <div class="account-wrapper">
                <aside class="account-sidebar">
                    <nav>
                        <a href="#perfil" class="sidebar-link active" data-target="perfil-section"><i class="fas fa-user-circle"></i> Perfil Pblico</a>
                        <a href="#seguranca" class="sidebar-link" data-target="seguranca-section"><i class="fas fa-shield-alt"></i> Segurana</a>
                        <a href="#assinatura" class="sidebar-link" data-target="assinatura-section"><i class="fas fa-crown"></i> Minha Assinatura</a>
                    </nav>
                </aside>
                
                <section class="account-content">
                    <div id="perfil-section" class="content-pane active">
                        <h2>Perfil Pblico</h2>
                        <p>Gerencie sua foto e nome de exibição que aparecem na sua Tag.</p>
                         <form id="profile-form" class="account-form">
                            <div class="input-group readonly">
                                <label for="user-id">Seu ID Conecta King (Link Permanente)</label>
                                <div class="input-wrapper">
                                    <input type="text" id="user-id" readonly>
                                    <i class="fas fa-lock"></i>
                                </div>
                            </div>

                       
                            <div class="input-group">
                                <label>Foto de Perfil</label>
                                <div id="photo-upload-area" class="photo-upload-area" title="Clique para alterar a foto">
                                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNzUiIGN5PSI3NSIgcj0iNzAiIGZpbGw9IiMzMzMzMzMiLz48dGV4dCB4PSI3NSIgeT0iODUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI0MCI+8J+RiDwvdGV4dD48L3N2Zz4=" alt="Avatar do Usuário" id="profile-photo-preview">
                                    <div class="upload-overlay"><i class="fas fa-camera"></i></div>
                                    <div class="upload-loader"></div>
                                    <input type="file" id="photo-file-input" accept="image/*" style="display: none;">
                                </div>
                            </div>

                            <div class="input-group">
                                <label for="displayName">Nome de Exibio (pblico)</label>
                                <input type="text" id="displayName" placeholder="Como seu nome aparecer na sua Tag">
                            </div>

                            <button type="submit" class="btn btn-primary">Salvar Alteraes do Perfil</button>
                            <div id="profile-message" class="message"></div>
                        </form>
                    </div>

                    <div id="seguranca-section" class="content-pane">
                        <h2>Segurana</h2>
                        <p>Altere sua senha de acesso  plataforma.</p>
                        <form id="password-form" class="account-form">
                            <div class="input-group">
                                <label for="currentPassword">Senha Atual</label>
                                <input type="password" id="currentPassword" required>
                            </div>
                            <div class="input-group">
                                <label for="newPassword">Nova Senha</label>
                                <input type="password" id="newPassword" required>
                            </div>
                            <button type="submit" class="btn btn-primary">Alterar Senha</button>
                            <div id="password-message" class="message"></div>
                        </form>
                    </div>

                <div id="assinatura-section" class="content-pane">
                    <h2>Minha Assinatura</h2>
                    <p>Aqui você pode gerenciar sua assinatura Conecta King.</p>
                    <div class="subscription-card">
                        <h4>Seu Plano Atual: <span id="plan-name">...</span></h4>
                        <p>Status: <span id="plan-status" class="status-badge">...</span></p>
                        <p id="plan-details">...</p>
                        
                        <a href="https://api.whatsapp.com/send?phone=+5511988161364&text=Ol%C3%A1%21%20Gostaria%20de%20renovar%20minha%20assinatura%20do%20Conecta%20King." target="_blank" class="btn btn-primary" id="renew-button" style="display: none; margin-top: 1rem;">
                            Renovar Assinatura
                        </a>
                    </div>
                </div>
                </section>
            </div>
        </div>
    </main>
    
    <script src="global.js?v=2025-12-23-02"></script>
    <script src="conta.js?v=2025-12-23-02"></script> </body>
</html>