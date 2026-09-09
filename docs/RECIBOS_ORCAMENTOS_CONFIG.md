# Recibos e orçamentos — configuração (Laravel)

OCR e PDF no stack **PHP**: `tesseract-ocr` + `poppler-utils` no container FrankenPHP (ver `laravel/Dockerfile`). Nada de npm/Node.

## Banco

Migrations históricas em `migrations/` (já aplicadas na VPS). Em ambiente novo, aplicar o schema Postgres habitual do projeto.

## Variáveis (opcional)

Se o OCR precisar de caminhos customizados no `.env` do Laravel:

```env
# opcional — defaults do sistema no container
TESSERACT_CMD=/usr/bin/tesseract
PDFTOPPM_CMD=/usr/bin/pdftoppm
```

## Comportamento

- OCR de comprovantes/documentos usa Tesseract no servidor (idioma `por` instalado na imagem).
- A primeira chamada pode ser mais lenta; as seguintes costumam ser rápidas.
- Sem Render / sem `tesseract.js`.

## Checklist

| Item | Estado |
|---|---|
| Pacotes no container | `tesseract-ocr`, `tesseract-ocr-por`, `poppler-utils` |
| Runtime | Laravel / FrankenPHP |
| Checkout/pagamento | Fora de escopo |
