require('dotenv').config();

const vars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'S3_STAGING_BUCKET',
    'REKOG_COLLECTION_ID'
];

console.log('--- Verificando Variáveis AWS ---');
vars.forEach(v => {
    console.log(`${v}: ${process.env[v] ? '✅ DEFINIDA' : '❌ NÃO DEFINIDA'}`);
});
