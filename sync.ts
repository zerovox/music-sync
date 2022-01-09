import { setupDb } from "./src/db";
import { getExistingFileEtags } from "./src/etags";
import { logger } from "./src/logger";
import { Queue } from "./src/queue";
import { sync, syncFile } from "./src/sync";
import { promises, Stats } from "fs";
import path from "path";

const BUCKET = "music-v0-studio";
const FOLDER = "music";
const DB_PATH = "./sync.db";
const MUSIC_DIR = "Z:\\Music\\Music";

scanAndSync();

// scanForFileTypes(MUSIC_DIR, ".");

async function scanForFileTypes(localDir: string, localFolder: string) {
    const scanQueue = new Queue(5);

    const fileTypes: {[ext: string]: number} = {};

    async function folderScan(folder: string) {
        const folderFiles = await promises.readdir(folder);
        const filePaths = folderFiles.map((p) => [p, path.resolve(folder, p)]);
        const fileStats = await Promise.all(filePaths.map<Promise<[string, string, Stats]>>(async ([p, filePath]) => [p, filePath, await promises.lstat(filePath)]));
        for (const [fileName, filePath, stat] of fileStats) {
            if (stat.isDirectory()) {
                scanQueue.queue(() => folderScan(filePath));
            } else {
                const extension = fileName.slice(fileName.lastIndexOf(".") + 1);
                fileTypes[extension] = (fileTypes[extension] ?? 0) + 1;
            }
        }
    }

    scanQueue.queue(() => folderScan(`${localDir}\\${localFolder}`));
    await scanQueue.drain();
    logger.info("file type histogram", fileTypes);
}

async function scanAndSync() {
    const db = await setupDb(DB_PATH);

    const etags = await getExistingFileEtags(BUCKET, FOLDER);

    await sync(BUCKET, FOLDER, MUSIC_DIR, ".", etags, db);

    return new Promise((res, rej) => {
        db.close(err => {
            if (err) {
                rej(err);
            } else {
                res(err);
            }
        });
    });
}