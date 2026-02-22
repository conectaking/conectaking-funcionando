require('dotenv').config();
const { RekognitionClient, ListCollectionsCommand, CreateCollectionCommand } = require('@aws-sdk/client-rekognition');
const { S3Client, HeadBucketCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');

async function checkAWS() {
    const region = process.env.AWS_REGION || 'us-east-1';
    const credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    };

    if (!credentials.accessKeyId || !credentials.secretAccessKey) {
        console.error('❌ Credenciais AWS não configuradas!');
        return;
    }

    const rekog = new RekognitionClient({ region, credentials });
    const s3 = new S3Client({ region, credentials });

    console.log('--- Verificando Rekognition ---');
    try {
        const collections = await rekog.send(new ListCollectionsCommand({}));
        const collectionId = process.env.REKOG_COLLECTION_ID || 'kingselection';
        const exists = collections.CollectionIds.includes(collectionId);
        console.log(`Coleção "${collectionId}": ${exists ? '✅ EXISTE' : '❌ NÃO EXISTE'}`);

        if (!exists) {
            console.log(`Tentando criar coleção "${collectionId}"...`);
            await rekog.send(new CreateCollectionCommand({ CollectionId: collectionId }));
            console.log(`✅ Coleção "${collectionId}" criada com sucesso!`);
        }
    } catch (e) {
        console.error(`❌ Erro no Rekognition: ${e.message}`);
    }

    console.log('\n--- Verificando S3 Staging ---');
    const bucket = process.env.S3_STAGING_BUCKET;
    if (!bucket) {
        console.error('❌ S3_STAGING_BUCKET não configurado!');
    } else {
        try {
            await s3.send(new HeadBucketCommand({ Bucket: bucket }));
            console.log(`Bucket "${bucket}": ✅ EXISTE`);
        } catch (e) {
            console.error(`❌ Bucket "${bucket}": NÃO EXISTE ou SEM ACESSO - ${e.message}`);
            if (e.name === 'NotFound') {
                console.log(`Tentando criar bucket "${bucket}"...`);
                try {
                    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
                    console.log(`✅ Bucket "${bucket}" criado com sucesso!`);
                } catch (ce) {
                    console.error(`❌ Falha ao criar bucket: ${ce.message}`);
                }
            }
        }
    }
}

checkAWS();
