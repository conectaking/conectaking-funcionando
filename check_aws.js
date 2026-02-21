const { RekognitionClient, ListCollectionsCommand } = require('@aws-sdk/client-rekognition');
require('dotenv').config();

async function run() {
    const client = new RekognitionClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    });
    try {
        const res = await client.send(new ListCollectionsCommand({}));
        console.log('Collections:', res.CollectionIds);
    } catch (e) {
        console.error('Error listing collections:', e.message);
    } finally {
        process.exit();
    }
}
run();
