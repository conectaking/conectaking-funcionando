# Recibos e orçamentos — configuração (Laravel)

OCR de comprovantes no stack **PHP**: **OpenAI Vision** (`RECIBO_OCR_AI`). PDF: `poppler-utils` no container FrankenPHP. Tesseract **não** está na imagem de produção. Nada de npm/Node para OCR.

## Banco

Migrations históricas em `migrations/` (já aplicadas na VPS). Em ambiente novo, aplicar o schema Postgres habitual do projeto.

## Variáveis

No `.env` / `.env.prod` do Laravel:

```env
OPENAI_API_KEY=sk-...
RECIBO_OCR_AI=always
RECIBO_OCR_AI_MODEL=gpt-4o-mini
# opcional — PDF
# PDFTOPPM_CMD=/usr/bin/pdftoppm
```

## Comportamento

- OCR de comprovantes usa Vision (IA); sem chave/API o fluxo não extrai itens.
- Import Serasa por imagem: use **PDF** (OCR local de print foi removido).
- Sem Render / sem `tesseract.js`.

## Checklist

| Item | Estado |
|---|---|
| Pacotes no container | `poppler-utils` (sem tesseract) |
| OCR recibos | OpenAI Vision (`RECIBO_OCR_AI=always`) |
| Runtime | Laravel / FrankenPHP |
| Checkout/pagamento | Fora de escopo |
