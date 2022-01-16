import { setupDb, dbRun, stmtRun } from './src/db';
import { getTrackMetadata } from './src/itunes';

const FOLDER = 'music';
const DB_PATH = './metadata.db';
const MUSIC_DIR = 'Z:\\Music\\Music';
const ALT_MUSIC_DIR = 'C:\\Users\\tim\\Music\\iTunes\\iTunes Media\\Music';

insertMetadataIntoDb();

async function insertMetadataIntoDb() {
    const db = await setupDb(DB_PATH);

    await dbRun(db, `
        CREATE TABLE IF NOT EXISTS ratings (
            path STRING PRIMARY KEY,
            localPath STRING,
            rating TINYINT,
            playCount SMALLINT,
            dateModified STRING,
            dateAdded STRING,
            datePlayed STRING
        )
    `);

    const insert = db.prepare('INSERT OR REPLACE INTO ratings (path, localPath, rating, playCount, dateModified, dateAdded, datePlayed) VALUES (?, ?, ?, ?, ?, ?, ?)');

    const metadata = await getTrackMetadata('C:\\Users\\tim\\Music\\iTunes\\iTunes Music Library.xml');

    for (const { s3Path, filePath, rating, playCount, dateModified, dateAdded, playDate } of metadata) {
        stmtRun(insert, s3Path, filePath, rating, playCount, dateModified, dateAdded, playDate);
    }
}