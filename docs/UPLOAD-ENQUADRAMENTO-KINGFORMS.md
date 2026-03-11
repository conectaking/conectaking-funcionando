# Enquadramento (crop) em uploads – KingForms e outras telas

## O que foi implementado

1. **API de crop**  
   `POST /api/upload/crop` (autenticado)  
   - Body (multipart): campo `image` ou `file` = ficheiro da imagem.  
   - Campos de recorte (em **pixels**): `cropX`, `cropY`, `cropWidth`, `cropHeight`.  
   - O servidor recorta a imagem com Sharp, faz upload para R2 e devolve `{ success: true, url, imageUrl }`.

2. **Componente reutilizável**  
   - `public/js/image-crop-modal.js`: modal que usa Cropper.js para o utilizador enquadrar a imagem.  
   - Requer Cropper.js (CSS + JS) em CDN.  
   - Uso: `ImageCropModal.open(ficheiro, { aspectRatio: 16/9 }, callback(url, errMsg))`.

3. **Exemplo de integração**  
   - Em **Personalizar Portaria** (`views/guestListCustomizePortaria.ejs`): ao adicionar **Banner da portaria** ou **Logo**, abre-se o modal de enquadramento antes do upload (banner 16:9, logo 1:1).

## Medidas recomendadas

| Uso              | Proporção | Exemplo (px) | Observação                          |
|------------------|-----------|--------------|-------------------------------------|
| **Imagem do Banner** (KingForms / cartão) | 16:9      | 1200 × 400   | Bom para destaque no cartão e no formulário. |
| **Logo do Formulário** (KingForms)        | 1:1       | 400 × 400    | Quadrado; evita deformação no cabeçalho.     |
| **Banner da portaria** (lista de convidados) | 16:9   | 1200 × 400   | Mesmo que Imagem do Banner.                  |

O crop é feito pelo utilizador no modal; as proporções acima são apenas sugeridas para um bom resultado visual.

## Como usar na configuração do KingForms

Na página de **Configurar formulário** do KingForms (onde estão “Formato de Exibição”, “Imagem do Banner”, “Título do Formulário”, “Logo do Formulário”):

1. Incluir Cropper.js e o modal de crop:
   ```html
   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.css">
   <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js"></script>
   <script src="/js/image-crop-modal.js"></script>
   ```

2. Ao selecionar ficheiro para **Imagem do Banner**: em vez de enviar direto para `/api/upload/image`, abrir o modal com proporção 16:9 e, no callback, usar a URL devolvida:
   ```javascript
   input.addEventListener('change', function() {
     var file = this.files[0];
     if (!file) return;
     ImageCropModal.open(file, { aspectRatio: 16/9 }, function(url, err) {
       if (url) { /* definir banner_image_url = url; atualizar preview */ }
       if (err) alert(err);
     });
     this.value = '';
   });
   ```

3. Ao selecionar ficheiro para **Logo do Formulário**: mesmo fluxo, com proporção 1:1:
   ```javascript
   ImageCropModal.open(file, { aspectRatio: 1 }, function(url, err) { ... });
   ```

Assim, na configuração do KingForms passa a existir o mesmo “enquadramentozinho” que na troca de foto de perfil e no banner da portaria.
