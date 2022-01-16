import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';

export interface TrackMetadata {
    filePath: string;
    s3Path: string;
    rating: number;
    playCount: number;
    dateModified: string;
    dateAdded: string;
    playDate: string;
}

export function getTrackMetadata(itunesDbPath: string, s3Folder: string, s3SyncdFolders: string[]): Promise<TrackMetadata[]> {
    return new Promise((resolve, reject) => {
        fs.readFile(itunesDbPath, async function (err, data) {
            if (err) {
                reject(err);
            }

            const parser = new XMLParser({ preserveOrder: true });
            const obj = parser.parse(data);
            const detailsArray = obj[1]['plist'][0]['dict'][15]['dict'];

            const results: TrackMetadata[] = [];

            for (let i = 1; i < detailsArray.length; i += 2) {
                const row = (detailsArray[i] as any)['dict'];
                const track = parseRow(row);

                if (track['Location'] == null) {
                    continue;
                }

                let filePath = path.resolve(decodeURI(track['Location']).replace('file://localhost/', ''));

                for (const syncdFolder of s3SyncdFolders) {
                    if (filePath.startsWith(syncdFolder)) {
                        filePath = filePath.replace(syncdFolder, '');
                        break;
                    }
                }

                const s3Path = s3Folder + '\\' + filePath;

                results.push({
                    filePath,
                    s3Path,
                    rating: track['Rating'],
                    playCount: track['Play Count'],
                    dateModified: track['Date Modified'],
                    dateAdded: track['Date Added'],
                    playDate: track['Play Date UTC'],
                });
            }

            resolve(results);
        });
    });
}

function parseRow(row: any[]) {
    const parsedRow: { [key: string]: any } = {};

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