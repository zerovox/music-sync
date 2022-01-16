import { randomUUID } from 'crypto';
import path from 'path';
import { setupDb, stmtGet, stmtRun } from './src/db';
import { getTrackMetadata } from './src/itunes';
import { logger } from './src/logger';

const USER_ID = '2bc95105-3b10-4b96-bd34-afc7c2ab3876';
const ITUNES_DB_PATH = 'C:\\Users\\tim\\Music\\iTunes\\iTunes Music Library.xml';
const NAVIDROME_DB_PATH = './dbs/navidrome-prod.db';
const REMOTE_S3_MOUNT_PATH = '/media/music/';
const FOLDER = 'music';
const MUSIC_DIR = 'Z:\\Music\\Music\\';
const ALT_MUSIC_DIR = 'C:\\Users\\tim\\Music\\iTunes\\iTunes Media\\Music\\';

syncMetadataToSubsonic();

async function syncMetadataToSubsonic() {
    const metadata = await getTrackMetadata(ITUNES_DB_PATH, FOLDER, [MUSIC_DIR, ALT_MUSIC_DIR]);

    const db = await setupDb(NAVIDROME_DB_PATH);

    // N.B, big perf hit to uppercase here, but case insensitive file systems mean that itunes db has paths where the casing may not match whats on disk
    const getId = db.prepare('select id, artist_id, album_id from media_file where UPPER(path) = UPPER(?)');
    const getAnno = db.prepare('select ann_id, play_date from annotation where user_id = ? and item_id = ?');
    const insertAnno = db.prepare('insert into annotation (ann_id, user_id, item_id, item_type) values (?, ?, ?, ?)');
    const updatePlays = db.prepare('update annotation set play_count = play_count + ?, play_date = ? where ann_id = ?');
    const updatePlayAndRating = db.prepare('update annotation set play_count = play_count + ?, play_date = ?, rating = ? where ann_id = ?');

    for (const track of metadata) {
        const remotePath = REMOTE_S3_MOUNT_PATH + track.s3Path.split(path.sep).join(path.posix.sep);
        const mediaFile = await stmtGet(getId, remotePath);
        if (mediaFile) {
            logger.debug('Found media file trecord', { 'path': remotePath });
            const metadataDate = new Date(track.playDate);

            let trackRecord = await stmtGet(getAnno, USER_ID, mediaFile.id);
            if (trackRecord === undefined) {
                trackRecord = { ann_id: randomUUID(), play_date: null };
                await stmtRun(insertAnno, trackRecord.ann_id, USER_ID, mediaFile.id, 'media_file');
            }

            const trackDate = new Date(trackRecord.play_date ?? 0);
            const playDate = metadataDate > trackDate ? metadataDate : trackDate;
            await stmtRun(updatePlayAndRating, isNaN(track.playCount) ? 0 : track.playCount, playDate.toISOString(), (track.rating ?? 0) / 20, trackRecord.ann_id);

            let albumRecord = await stmtGet(getAnno, USER_ID, mediaFile.album_id);
            if (albumRecord === undefined) {
                albumRecord = { ann_id: randomUUID(), play_date: null };
                logger.debug('Inserting album annotation', { 'path': remotePath, albumId: mediaFile.album_id });
                await stmtRun(insertAnno, albumRecord.ann_id, USER_ID, mediaFile.album_id, 'album');
            }

            const albumDate = new Date(albumRecord.play_date ?? 0);
            const albumPlayDate = metadataDate > albumDate ? metadataDate : albumDate;
            await stmtRun(updatePlays, isNaN(track.playCount) ? 0 : track.playCount, albumPlayDate.toISOString(), albumRecord.ann_id);

            let artistRecord = await stmtGet(getAnno, USER_ID, mediaFile.artist_id);
            if (artistRecord === undefined) {
                artistRecord = { ann_id: randomUUID(), play_date: null };
                logger.debug('Inserting artist annotation', { 'path': remotePath, artistId: mediaFile.artist_id });
                await stmtRun(insertAnno, artistRecord.ann_id, USER_ID, mediaFile.artist_id, 'artist');
            }

            const artistDate = new Date(artistRecord.play_date ?? 0);
            const artistPlayDate = metadataDate > artistDate ? metadataDate : artistDate;
            await stmtRun(updatePlays, isNaN(track.playCount) ? 0 : track.playCount, artistPlayDate.toISOString(), artistRecord.ann_id);
        } else {
            logger.warn('Could not find subsonic ID for track', { 'path': remotePath });
        }
    }
}
