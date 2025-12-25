# Como Usar Banner com Mensagem Personalizada

## Funcionalidade

Agora é possível adicionar uma mensagem personalizada ao clicar no banner, especialmente útil para links do WhatsApp e Instagram.

## Como Funciona

### Para WhatsApp

1. **No campo `destination_url`**, coloque o link do WhatsApp:
   - Formato: `https://wa.me/5511999999999` (com DDD e número)
   - Ou: `https://api.whatsapp.com/send?phone=5511999999999`

2. **No campo `title`**, coloque a mensagem personalizada que será enviada:
   - Exemplo: `Olá! Gostaria de saber mais sobre seus produtos.`
   - A mensagem será automaticamente adicionada ao link do WhatsApp

3. **Resultado**: Ao clicar no banner, o WhatsApp abrirá com a mensagem já preenchida!

### Para Instagram

1. **No campo `destination_url`**, coloque o link do Instagram:
   - Formato: `https://www.instagram.com/seu_perfil/`
   - Ou: `https://instagram.com/seu_perfil/`

2. **No campo `title`**, coloque uma descrição (será usado como alt text da imagem)

3. **Resultado**: Ao clicar no banner, abrirá o perfil do Instagram

### Para Outros Links

1. **No campo `destination_url`**, coloque qualquer link:
   - Exemplo: `https://seusite.com.br`
   - Exemplo: `https://loja.com.br/produto`

2. **No campo `title`**, coloque uma descrição (será usado como alt text)

3. **Resultado**: Ao clicar no banner, abrirá o link normalmente

## Exemplos Práticos

### Exemplo 1: WhatsApp com Mensagem
- **destination_url**: `https://wa.me/5511999999999`
- **title**: `Olá! Vim através do seu perfil e gostaria de conhecer seus serviços.`
- **Resultado**: WhatsApp abre com a mensagem já preenchida

### Exemplo 2: Instagram
- **destination_url**: `https://www.instagram.com/conectaking/`
- **title**: `Siga-nos no Instagram`
- **Resultado**: Abre o perfil do Instagram

### Exemplo 3: Link Personalizado
- **destination_url**: `https://meusite.com.br/promocao`
- **title**: `Confira nossa promoção especial`
- **Resultado**: Abre o link normalmente

## Observações

- A mensagem personalizada funciona **apenas para WhatsApp**
- Para outros links, o `title` é usado apenas como descrição (alt text)
- O link do WhatsApp deve estar no formato correto (`wa.me` ou `api.whatsapp.com`)
- A mensagem será codificada automaticamente para URL (caracteres especiais serão tratados)

## Dica

Para testar se o link do WhatsApp está correto, você pode:
1. Copiar o link do `destination_url`
2. Adicionar manualmente `?text=sua mensagem` no final
3. Abrir no navegador para verificar se funciona
