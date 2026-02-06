# Sincronização Serasa + Quem eu devo (site / localhost / mobile)

## O que foi implementado

Os dados de **Serasa (acordos)** e **Quem eu devo (terceiros)** passam a ser salvos no **servidor** e carregados de lá. Assim, o que você configura em um lugar (site, localhost ou mobile) aparece nos outros.

- **Ao abrir** a Gestão Financeira: o frontend chama `GET /api/finance/king-data` e usa os dados do servidor (dividas + terceiros).
- **Ao salvar** (novo acordo, pagamento, nova conta, etc.): o frontend chama `PUT /api/finance/king-data` com os dados atuais.

## Por que no localhost/mobile aparece R$ 0,00?

Se no **site** os acordos aparecem, mas no **localhost** ou no **mobile** aparecem zerados, em geral é porque:

1. A **tabela** onde esses dados são guardados **não existe** no banco de produção, ou  
2. O **backend em produção** ainda **não tem** as rotas/endpoints novos.

Nesse caso, o **PUT** (salvar) falha e o **GET** (carregar) devolve vazio. O frontend já grava no `localStorage` do navegador; por isso no **mesmo** navegador do site você vê os dados, e em outro dispositivo ou no localhost não.

## O que você precisa fazer

### 1. Rodar a migration no banco de produção

No banco usado pela API (ex.: Render/PostgreSQL), execute o SQL da migration:

**Arquivo:** `migrations/162_finance_king_sync.sql`

Ele cria a tabela `finance_king_sync`, onde ficam dividas e terceiros por usuário/perfil.

- Se você usa **Render**: Dashboard do serviço → Shell ou conecte no PostgreSQL e rode o conteúdo desse arquivo.
- Se usa outro host: rode o mesmo SQL no banco que a API usa.

### 2. Garantir que o backend está atualizado

O backend precisa ter:

- Rotas: `GET /api/finance/king-data` e `PUT /api/finance/king-data`
- Em `modules/finance`: `finance.repository.js` (getKingSync, saveKingSync), `finance.service.js` (getKingData, saveKingData), `finance.controller.js` (getKingData, saveKingData), `finance.routes.js` (rotas king-data)

Faça **deploy** da API (ex.: push no repositório que o Render usa) para que essas alterações estejam no servidor.

### 3. Conferir no navegador (opcional)

- Abra o **site**, vá em Gestão Financeira, abra o **Console** (F12 → Console).
- Faça uma alteração (ex.: adicionar um acordo ou um pagamento).
- Se aparecer algo como: **"Sync Serasa/Quem eu devo falhou (HTTP 404)"** ou **"HTTP 500"**, isso indica que a rota não existe ou a tabela não foi criada. Siga os passos 1 e 2 acima.

## Resumo

| Onde você configurou | Onde aparece |
|----------------------|-------------|
| Site                 | Site ✅, localhost e mobile ✅ **só depois** de rodar a migration e fazer deploy do backend |
| Localhost            | Localhost ✅, site e mobile ✅ **idem** |
| Mobile               | Mobile ✅, site e localhost ✅ **idem** |

Quem sincroniza é o **servidor** (API + tabela `finance_king_sync`). Depois que a migration estiver rodada e o backend estiver em produção, o mesmo usuário verá os mesmos dados em qualquer lugar.
