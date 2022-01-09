import fs from 'fs';
import crypto from 'crypto';
import sqlite3 from 'sqlite3';
import { Upload } from '@aws-sdk/lib-storage';
import { UploadPartCommandOutput } from '@aws-sdk/client-s3';
import { logger } from './logger';
import { s3 } from './s3';
import { cleanETag } from './etags';

export async function uploadTrackedIfDifferent(Bucket: string, path: string, localPath: string, remoteEtags: Map<string, string>, db: sqlite3.Database) {
    const md5 = await computeMd5Sum(localPath);
    const eTag = remoteEtags.get(path);

    if (eTag === undefined) {
        logger.debug('Uploading file with no remote etag found', { path, md5 });
        return uploadTracked(Bucket, path, localPath, md5, db);
    }
    return new Promise((resolve, reject) => {
        db.get('SELECT eTag, md5 FROM sync_status WHERE path = ?', [path], (err, result) => {
            if (err) {
                logger.error(err);
                return reject(err);
            }

            if (result === undefined) {
                logger.debug('Uploading file with no previous sync', { path });
            } else if (eTag !== result.eTag) {
                logger.info('Replacing file with previous sync etag mismatch', { path, eTag, previousETag: result.eTag });
            } else if (md5 !== result.md5) {
                logger.info('Replacing file with previous sync md5 mismatch', { path, md5, previousMd5: result.md5 });
            } else {
                logger.debug('Skipping file with previous sync etag and md5 match', { path });
                return resolve(undefined);
            }

            return resolve(uploadTracked(Bucket, path, localPath, md5, db));
        });
    });
}

/** Uploads the given file, and stores the returned etag along with the local md5 in the sync_status db */
async function uploadTracked(Bucket: string, path: string, localPath: string, md5: string, db: sqlite3.Database) {
    logger.info('Upload start', { path, localPath, md5 });
    const uploadResult = await upload(Bucket, path, localPath);
    const eTag = uploadResult.ETag !== undefined ? cleanETag(uploadResult.ETag) : undefined;
    logger.info('Upload complete', {
        path, localPath, md5, eTag,
    });

    if (eTag === undefined) {
        logger.warn('No eTag returned from upload', { path, localPath, md5 });
        return;
    }

    return new Promise((resolve, reject) => {
        db.run('INSERT OR REPLACE INTO sync_status (path, localPath, eTag, md5) VALUES (?, ?, ?, ?)', [
            path, localPath, eTag, md5,
        ], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(uploadResult);
            }
        });
    });
}

function computeMd5Sum(localPath: string): Promise<string> {
    return new Promise((res) => {
        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(localPath);

        stream.on('data', (data) => {
            hash.update(data);
        });

        stream.on('end', () => {
            const md5 = hash.digest('hex');
            res(md5);
        });
    });
}

async function upload(Bucket: string, path: string, localPath: string) {
    const parallelUploads3 = new Upload({
        client: s3,
        queueSize: 4, // optional concurrency configuration
        leavePartsOnError: false, // optional manually handle dropped parts
        params: {
            Bucket,
            Key: path,
            Body: fs.createReadStream(localPath),
        },
    });

    parallelUploads3.on('httpUploadProgress', (progress) => {
        logger.silly('Upload progress', progress);
    });

    const result: UploadPartCommandOutput = await parallelUploads3.done();
    return result;
}
