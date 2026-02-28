# Instalar PostgreSQL no Windows

## 1. Descarregar o instalador

1. Abre o browser e vai a: **https://www.postgresql.org/download/windows/**
2. Clica em **"Download the installer"** (vai para a página da EDB).
3. Escolhe a versão mais recente (ex.: **PostgreSQL 17** ou **16**) e a opção **Windows x86-64**.
4. Descarrega o ficheiro `.exe` (ex.: `postgresql-17-x64-windows.exe`).

---

## 2. Executar o instalador

1. Faz duplo clique no `.exe` descarregado.
2. Se aparecer aviso do Windows, clica em **"Executar"** ou **"More info"** → **"Run anyway"**.

---

## 3. Assistente de instalação (passo a passo)

- **Select directory**: Podes deixar a pasta sugerida (ex.: `C:\Program Files\PostgreSQL\17`). Clica **Next**.

- **Select components**: Deixa tudo assinalado (PostgreSQL Server, pgAdmin, Stack Builder, Command Line Tools). **Next**.

- **Data directory**: Deixa a pasta sugerida. **Next**.

- **Password (superuser `postgres`)**  
  - **Guarda esta password** – vais precisar para criar bases e utilizadores.  
  - Exemplo: `postgres123` (ou outra à tua escolha).  
  - **Next**.

- **Port**: Deixa **5432**. **Next**.

- **Locale**: Deixa o padrão. **Next**.

- **Summary**: Clica **Next** e depois **Next** para instalar.

- Quando terminar, desmarca **"Launch Stack Builder"** (não é necessário) e clica **Finish**.

---

## 4. Verificar se está a correr

1. Abre **Serviços** do Windows (Win + R → escreve `services.msc` → Enter).
2. Procura **"postgresql"** na lista.
3. O estado deve estar **"Em execução"** e **Tipo de arranque: Automático**.

Se não estiver a correr: botão direito no serviço → **Iniciar**.

---

## 5. Criar a base e o utilizador para o Conecta King

Tens duas opções:

### Opção A – No DBeaver (se já o tens)

1. Nova conexão → **PostgreSQL**.
2. Host: **localhost**, Port: **5432**, Database: **postgres**, User: **postgres**, Password: *(a que definiste no instalador)*.
3. Test connection → **Finish**.
4. Abre o ficheiro **`scripts/setup-postgres-local.sql`** do projeto e executa o SQL (como utilizador `postgres`).

### Opção B – Linha de comandos (psql)

1. Abre **PowerShell** ou **CMD**.
2. Entra na pasta do PostgreSQL (ajusta a versão se for diferente):

   ```text
   cd "C:\Program Files\PostgreSQL\17\bin"
   ```

3. Abre o psql:

   ```text
   .\psql -U postgres
   ```

4. Quando pedir a password, escreve a do utilizador `postgres`.
5. Cola e executa (uma linha de cada vez ou o bloco todo):

   ```sql
   CREATE ROLE conecta_king_db_user WITH LOGIN PASSWORD 'conecta_local_2026';
   CREATE DATABASE conecta_king_db OWNER conecta_king_db_user;
   ```

6. Sai: `\q` + Enter.

---

## 6. Ligar o backend ao Postgres local

O teu `.env` já deve ter algo como:

```env
DATABASE_URL=postgresql://conecta_king_db_user:conecta_local_2026@localhost:5432/conecta_king_db
```

Se a password que usaste no passo 5 for outra, altera no `.env` nessa URL.

Reinicia o servidor Node (ex.: `node server.js`). As migrations vão criar as tabelas na base `conecta_king_db` e o backend fica a usar o Postgres local.

---

## Resumo

| O quê            | Valor                    |
|------------------|--------------------------|
| Porta            | 5432                     |
| Utilizador admin | postgres (password tua)  |
| Base do projeto  | conecta_king_db         |
| Utilizador app   | conecta_king_db_user     |
| Password app     | conecta_local_2026 (ou a que meteres no `.env`) |

Depois de instalado e com a base criada, o DBeaver é opcional: serve só para ver/editar dados; o que importa é o serviço PostgreSQL estar a correr e o `.env` com a `DATABASE_URL` certa.
