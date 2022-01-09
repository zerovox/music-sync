import { S3Client } from '@aws-sdk/client-s3';
import { fromIni } from '@aws-sdk/credential-providers';

export const s3 = new S3Client({
    endpoint: 'https://us-east-1.linodeobjects.com',
    credentials: fromIni({ filepath: './.aws-credentials' }),
    region: 'us-east-1',
});