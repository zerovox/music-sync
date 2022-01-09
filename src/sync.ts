import { Stats, promises } from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { Queue } from './queue';
import { logger } from './logger';
import { uploadTrackedIfDifferent } from './upload';

const EXTENSION_WHITELIST = ['m4a', 'mp3', 'aif', 'aac', 'flac'];

export async function sync(Bucket: string, prefix: string, localDir: string, localFolder: string, remoteEtags: Map<string, string>, db: sqlite3.Database) {
    const uploadQueue = new Queue(5);
    const scanQueue = new Queue(5);

    async function folderScan(folder: string) {
        const folderFiles = await promises.readdir(folder);
        const filePaths = folderFiles.map((fileName) => [fileName, path.resolve(folder, fileName)]);
        const fileStats = await Promise.all(filePaths.map<Promise<[string, string, Stats]>>(async ([fileName, filePath]) => [fileName, filePath, await promises.lstat(filePath)]));
        for (const [fileName, filePath, stat] of fileStats) {
            if (stat.isDirectory()) {
                scanQueue.queue(() => folderScan(filePath));
            } else {
                const pathWithinLocalDir = path.relative(localDir, filePath);
                const extension = fileName.slice(fileName.lastIndexOf('.') + 1);
                if (EXTENSION_WHITELIST.indexOf(extension.toLowerCase()) !== -1) {
                    logger.info('Queuing file', { filePath, extension });
                    uploadQueue.queue(async () => {
                        await syncFile(Bucket, prefix, localDir, pathWithinLocalDir, remoteEtags, db);
                    });
                } else {
                    logger.info('Skipping file with non-whitelisted extension', { filePath, extension });
                }
            }
        }
    }

    logger.debug('starting scan and upload queues');

    scanQueue.queue(() => folderScan(`${localDir}\\${localFolder}`));

    logger.debug('draining scan queue');
    await scanQueue.drain();
    logger.debug('scan queue drained');
    await uploadQueue.drain();
    logger.debug('upload queue drained');
}

export function syncFile(Bucket: string, prefix: string, localDir: string, localFile: string, remoteEtags: Map<string, string>, db: sqlite3.Database) {
    return uploadTrackedIfDifferent(Bucket, `${prefix}/${localFile.replace(/\\/g, '/')}`, `${localDir}\\${localFile}`, remoteEtags, db);
}
