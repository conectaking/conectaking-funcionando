# Próximos passos – Reconhecimento facial KingSelection

Você já salvou as variáveis no Render. Segue a ordem do que fazer agora.

---

## 1. Na AWS (você faz)

### 1.1 Bucket S3 staging
- Crie o bucket **`kingselection-rekog-staging`** na região **us-east-1**.
- Em **Lifecycle rules**: crie uma regra para expirar objetos com prefixo **`staging/`** após **1 dia**.
- Deixe o bucket **privado** (sem acesso público).
- O usuário IAM **king-rekognition** já tem (ou deve ter) permissão nesse bucket:  
  `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`.

### 1.2 Collection Rekognition
- Confirme que a collection **`kingselection`** existe no Rekognition (us-east-1).  
  Se não existir: no console AWS → Rekognition → **Create collection** → nome `kingselection`.

### 1.3 Permissões IAM do usuário king-rekognition
O usuário precisa de:
- **Rekognition:** `rekognition:IndexFaces`, `rekognition:DetectFaces`, `rekognition:SearchFacesByImage`, `rekognition:CreateCollection` (se a collection for criada pelo código).
- **S3:** permissões no bucket `kingselection-rekog-staging` (GetObject, PutObject, DeleteObject).

---

## 2. No código (implementação)

Quando o bucket e a collection estiverem prontos, a implementação segue esta ordem:

| Ordem | O quê | Descrição rápida |
|-------|--------|-------------------|
| **2.1** | Migration | Criar tabelas: `rekognition_client_faces`, `rekognition_photo_jobs`, `rekognition_photo_faces`, `rekognition_face_matches`, `rekognition_processing_cache`. |
| **2.2** | Serviços | R2 (head + list), S3 staging, Rekognition (SDK v3), crop de rosto com sharp. |
| **2.3** | Enroll | Endpoint para cadastrar rosto do cliente (foto referência no R2 → Rekognition IndexFaces). |
| **2.4** | Match | Processar uma foto da galeria: detectar rostos → buscar na collection → salvar matches. |
| **2.5** | Fila (SQS) + worker | Processar galeria inteira em background (opcional; pode vir depois). |
| **2.6** | Frontend | Telas: cadastrar rosto, processar galeria, ver resultados. |

---

## 3. O que você pode fazer agora

1. **Criar o bucket S3** `kingselection-rekog-staging` em us-east-1 e a **lifecycle** de 1 dia em `staging/`.
2. **Confirmar** que a collection **kingselection** existe no Rekognition.
3. **Dizer se quer** que eu comece a implementação (Fase 1: migration + Fase 2: serviços + um endpoint de teste de enroll ou match).  
   Assim você testa com uma foto antes de ter fila e frontend.

Quando o bucket e a collection estiverem prontos e você quiser que eu implemente, é só avisar.
