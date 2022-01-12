import fs from 'fs';
import path from 'path';

const BUCKET = 'music-v0-studio';
const FOLDER = 'music';
const DB_PATH = './sync.db';
const MUSIC_DIR = 'Z:\\Music\\Music';

import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ preserveOrder: true  });

fs.readFile( 'C:\\Users\\tim\\Music\\iTunes\\iTunes Music Library.xml', function(err, data) {
    const obj = parser.parse(data);
    const detailsArray = obj[1]['plist'][0]['dict'][15]['dict'];

    for (let i = 1; i < detailsArray.length; i += 2) {
        const row = (detailsArray[i] as any)['dict'];
        const track = parseRow(row);

        if (track["Location"] == null) {
            continue;
        }

        const filePath = path.resolve(decodeURI(track["Location"]).replace("file://localhost/", ""))
        const s3Path = FOLDER + filePath.replace(MUSIC_DIR, "");

        if (filePath.startsWith("C:\\Users\\tim\\code\\music-sync")) {
            console.log(filePath);
            console.log(track);
        }

        // console.log(`Track at ${s3Path} has ${track["Rating"]}`);
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

const keys = ['Track ID',
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