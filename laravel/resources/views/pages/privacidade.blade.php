<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Política de Privacidade - Conecta King</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    @vite(['resources/css/fontawesome.css', 'resources/css/pub/pages/privacidade.css'])
</head>
<body>
    <div class="container">
        <a href="/" class="back-link"><i class="fas fa-arrow-left"></i> Voltar</a>
        <h1>Política de Privacidade</h1>
        <p><strong>Conecta King</strong> — plataforma de cartão digital, King Selection, King Forms, King Docs, Bíblia e Gestão Financeira.</p>
        <p class="last-updated">Última atualização: 11 de setembro de 2026</p>

        <h2>1. Controlador e contacto</h2>
        <p>O responsável pelo tratamento é a operação Conecta King. Pedidos LGPD: <a href="mailto:security@conectaking.com.br">security@conectaking.com.br</a> ou área <a href="/conta">Conta</a> (exportação / exclusão).</p>
        <p>Ver também: <a href="/termos">Termos de Uso</a> · <a href="/.well-known/security.txt">security.txt</a></p>

        <h2>2. Dados que tratamos</h2>
        <ul>
            <li><strong>Conta:</strong> e-mail, senha (hash), tipo de plano, preferências de perfil.</li>
            <li><strong>Cartão digital:</strong> nome, bio, links, imagens, módulos (PIX, Wi‑Fi, formulários, etc.).</li>
            <li><strong>King Selection:</strong> fotos de galeria (armazenamento R2/Cloudflare), metadados de face (AWS Rekognition quando ativo), dados de clientes/seleção.</li>
            <li><strong>King Forms / Portaria:</strong> respostas de formulários, listas de convidados (nome, documento, contacto).</li>
            <li><strong>King Docs / Recibos:</strong> documentos e dados fiscais que o utilizador carregar.</li>
            <li><strong>Finance:</strong> lançamentos, anexos (PDF/imagem) em armazenamento privado autenticado.</li>
            <li><strong>Técnicos:</strong> cookies HttpOnly de sessão, CSRF, logs de acesso, IP (auditoria/segurança).</li>
        </ul>

        <h2>3. Finalidades e bases legais (LGPD)</h2>
        <ul>
            <li>Execução de contrato — prestar os módulos contratados.</li>
            <li>Legítimo interesse — segurança, prevenção de abuso, melhoria do produto.</li>
            <li>Consentimento — quando aplicável (ex.: envio de e-mails opcionais).</li>
            <li>Obrigação legal — quando a lei exigir retenção.</li>
        </ul>

        <h2>4. Subprocessadores</h2>
        <ul>
            <li>Hetzner (hospedagem VPS / UE)</li>
            <li>Cloudflare (CDN, DNS, Worker R2)</li>
            <li>AWS (Rekognition, quando King Selection face estiver ativo)</li>
            <li>Provedor SMTP configurado pelo operador (envio de e-mails transacionais)</li>
        </ul>

        <h2>5. Partilha</h2>
        <p>Não vendemos dados pessoais. Partilha ocorre só com subprocessadores necessários ao serviço, obrigações legais ou proteção de direitos.</p>

        <h2>6. Segurança</h2>
        <ul>
            <li>HTTPS, HSTS, cookies HttpOnly, CSP com nonce</li>
            <li>Anexos financeiros fora de pastas públicas</li>
            <li>Rate-limit e controlos de acesso admin (incl. 2FA opcional)</li>
        </ul>

        <h2>7. Os seus direitos</h2>
        <ul>
            <li>Acesso e exportação (`GET /api/account/export` autenticado)</li>
            <li>Correção de dados na área Conta</li>
            <li>Eliminação (`POST /api/account/delete-request` com senha; prazo até 30 dias)</li>
            <li>Oposição / limitação — contactar o e-mail acima</li>
        </ul>

        <h2>8. Retenção</h2>
        <p>Dados de conta ativos enquanto a assinatura/conta existir. Backups podem reter cópias por período limitado. Pedidos de exclusão removem a conta e dados associados na medida técnica possível.</p>

        <h2>9. Cookies</h2>
        <p>Usamos cookies essenciais de autenticação (`token`, `refresh_token`, `ck_csrf`) — não para publicidade de terceiros.</p>

        <h2>10. Alterações</h2>
        <p>Alterações relevantes serão publicadas nesta página com nova data de atualização.</p>
    </div>
</body>
</html>
