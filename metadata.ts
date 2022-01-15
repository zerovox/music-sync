import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { setupDb, dbRun } from './src/db';

const FOLDER = 'music';
const DB_PATH = './metadata.db';
const MUSIC_DIR = 'Z:\\Music\\Music';
const ALT_MUSIC_DIR = 'C:\\Users\\tim\\Music\\iTunes\\iTunes Media\\Music';

const parser = new XMLParser({ preserveOrder: true  });

fs.readFile( 'C:\\Users\\tim\\Music\\iTunes\\iTunes Music Library.xml', async function(err, data) {
    if (err) {
        throw err;
    }

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

    const obj = parser.parse(data);
    const detailsArray = obj[1]['plist'][0]['dict'][15]['dict'];

    for (let i = 1; i < detailsArray.length; i += 2) {
        const row = (detailsArray[i] as any)['dict'];
        const track = parseRow(row);

        if (track['Location'] == null) {
            continue;
        }

        let filePath = path.resolve(decodeURI(track['Location']).replace('file://localhost/', ''));

        // Copies of
        if (filePath.startsWith(ALT_MUSIC_DIR)) {
            filePath = filePath.replace(ALT_MUSIC_DIR, MUSIC_DIR);
        }

        const s3Path = FOLDER + filePath.replace(MUSIC_DIR, '');

        await dbRun(db, 'INSERT OR REPLACE INTO ratings (path, localPath, rating, playCount, dateModified, dateAdded, datePlayed) VALUES (?, ?, ?, ?, ?, ?, ?)', [
            s3Path, filePath, track['Rating'], track['Play Count'], track['Date Modified'], track['Date Added'], track['Play Date UTC'],
        ]);
    }
});

function parseRow(row: any[]) {
    const parsedRow: {[key: string]: string} = {};

    for (let i = 0; i < row.length; i += 2) {
        const valueKey = Object.keys(row[i + 1])[0];
        const value = row[i + 1][valueKey][0];
        if (value !== undefined) {
            parsedRow[row[i]['key'][0]['#text']] = value['#text'];
        }
    }

    return parsedRow;
}

const _keys = ['Track ID',
    'Size',
    'Total Time',
    'Disc Number',
    'Disc Count',
    'Track Number',
    'Track Count',
    'Year',
    'Date Modified',
    'Date Added',
    'Bit Rate',
    'Sample Rate',
    'Play Count',
    'Play Date',
    'Play Date UTC',
    'Release Date',
    'Rating',
    'Artwork Count',
    'Persistent ID',
    'Track Type',
    'File Folder Count',
    'Library Folder Count',
    'Name',
    'Artist',
    'Album Artist',
    'Album',
    'Genre',
    'Kind',
    'Sort Artist',
    'Sort Album Artist',
    'Location']; //'file://localhost/Z:/Music/Music/Kanye%20West/Late%20Registration/04%20Gold%20Digger.m4a'