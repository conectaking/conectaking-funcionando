<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Link Expirado — King Câmera</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Outfit:wght@700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body {
            background: #090d16;
            color: #f8fafc;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 1rem;
        }
        .card {
            background: #0f172a;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 20px;
            padding: 2.5rem 2rem;
            max-width: 440px;
            width: 100%;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .icon {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background: rgba(244, 63, 94, 0.12);
            color: #f43f5e;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            margin: 0 auto 1.5rem;
        }
        h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 1.5rem;
            margin-bottom: 0.75rem;
        }
        p {
            color: #94a3b8;
            font-size: 0.9rem;
            line-height: 1.5;
            margin-bottom: 1.75rem;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: #f59e0b;
            color: #000;
            font-weight: 700;
            font-size: 0.9rem;
            padding: 0.75rem 1.5rem;
            border-radius: 10px;
            text-decoration: none;
            transition: all 0.2s ease;
        }
        .btn:hover {
            background: #d97706;
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon"><i class="fas fa-hourglass-end"></i></div>
        <h1>Link de Acesso Expirado</h1>
        <p>{{ $reason ?? 'O período de compartilhamento temporário definido pelo proprietário desta câmera foi finalizado.' }}</p>
        <a href="https://conectaking.com.br" class="btn">Conhecer o Conecta King</a>
    </div>
</body>
</html>
