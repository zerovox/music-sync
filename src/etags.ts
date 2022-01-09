import { ListObjectsV2Command, ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
import { s3 } from './s3';

export async function getExistingFileEtags(Bucket: string, Prefix: string): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    let ContinuationToken: string | undefined;
    do {
        const page = await s3.send( new ListObjectsV2Command({
            Bucket,
            Prefix,
            ContinuationToken,
        }));
        collectExistingFileEtags(page, result);
        ContinuationToken = page.NextContinuationToken;
    } while (ContinuationToken !== undefined);
    return result;
}

function collectExistingFileEtags(page: ListObjectsV2CommandOutput, result: Map<string, string>) {
    for (const entry of page.Contents ?? []) {
        if (entry.Key && entry.ETag) {
            result.set(entry.Key, cleanETag(entry.ETag));
        }
    }
}

export function cleanETag(tag: string) {
    return tag.replace(/"/g, '');
}
