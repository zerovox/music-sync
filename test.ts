import { setupDb } from './src/db';
import { getExistingFileEtags } from './src/etags';
import { sync, syncFile } from './src/sync';

const BUCKET = 'music-v0-studio';
const TEST_FOLDER = '_sync-test';
const TEST_DB_PATH = './test-sync.db';
const MUSIC_DIR = 'Z:\\Music\\Music';

test();

async function test() {
    const db = await setupDb(TEST_DB_PATH);

    const testFile1 = '16bit\\Cobra\\01 Cobra.mp3';
    const testFile2 = '3 Doors Down\\The Better Life\\2-13 Loser (live).m4a';
    const testFile3 = 'Action Bronson & Alchemist\\Rare Chandeliers\\08 Modern Day Revelations feat Roc M.mp3';

    const testFolder = '16bit';

    const etags = await getExistingFileEtags(BUCKET, TEST_FOLDER);

    await Promise.all([
        syncFile(BUCKET, TEST_FOLDER, MUSIC_DIR, testFile1, etags, db),
        syncFile(BUCKET, TEST_FOLDER, MUSIC_DIR, testFile2, etags, db),
        syncFile(BUCKET, TEST_FOLDER, MUSIC_DIR, testFile3, etags, db),
    ]);

    await sync(BUCKET, TEST_FOLDER, MUSIC_DIR, testFolder, etags, db);

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