require('dotenv').config();
const { Pool } = require('pg');

console.log('--- Iniciando teste de conexão com o banco de dados ---');
console.log('Host:', process.env.DB_HOST);
console.log('Porta:', process.env.DB_PORT);
console.log('Usuário:', process.env.DB_USER);
console.log('Banco de Dados:', process.env.DB_DATABASE);
console.log('----------------------------------------------------');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 15000 
});

async function testConnection() {
  let client;
  try {
    console.log('Tentando obter uma conexão do pool...');
    client = await pool.connect();
    console.log('✅ SUCESSO! Conexão com o banco de dados estabelecida.');
    
    console.log('Testando uma query simples...');
    const result = await client.query('SELECT NOW()'); 
    console.log('✅ SUCESSO! Query executada. Resposta do banco:', result.rows[0]);

  } catch (err) {
    console.error('❌ FALHA AO CONECTAR OU FAZER A QUERY:');
    console.error(err);
  } finally {
    if (client) {
      client.release();
      console.log('Conexão liberada.');
    }
    await pool.end();
    console.log('Pool de conexões encerrado.');
  }
}

testConnection();