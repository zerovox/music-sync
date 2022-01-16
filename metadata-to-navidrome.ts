import { randomUUID } from 'crypto';
import path from 'path';
import { setupDb, stmtGet, stmtRun } from './src/db';
import { getTrackMetadata } from './src/itunes';

const USER_ID = 'f24c28c8-e1b7-4efe-9150-6632c1cb3aa5';
const ITUNES_DB_PATH = 'C:\\Users\\tim\\Music\\iTunes\\iTunes Music Library.xml';
const NAVIDROME_DB_PATH = './navidrome-new.db';
const REMOTE_S3_MOUNT_PATH = '/media/music/';
const FOLDER = 'music';
const MUSIC_DIR = 'Z:\\Music\\Music\\';
const ALT_MUSIC_DIR = 'C:\\Users\\tim\\Music\\iTunes\\iTunes Media\\Music\\';

syncMetadataToSubsonic();

async function syncMetadataToSubsonic() {
    const metadata = await getTrackMetadata(ITUNES_DB_PATH, FOLDER, [MUSIC_DIR, ALT_MUSIC_DIR]);

    const db = await setupDb(NAVIDROME_DB_PATH);

    const getId = db.prepare('select id, artist_id, artist_id from media_file where path = ?');
    const getAnno = db.prepare('select ann_id, play_date from annotation where user_id = ? and item_id = ?');
    const insertAnno = db.prepare('insert into annotation (ann_id, user_id, item_id, item_type) values (?, ?, ?, ?)');
    const updatePlays = db.prepare('update annotation set play_count = play_count + ?, play_date = ? where ann_id = ?');
    const updatePlayAndRating = db.prepare('update annotation set play_count = play_count + ?, play_date = ?, rating = ? where ann_id = ?');

    for (const track of metadata.slice(0, 1000)) {
        const remotePath = REMOTE_S3_MOUNT_PATH + track.s3Path.split(path.sep).join(path.posix.sep);
        const subsonicId = await stmtGet(getId, remotePath);
        if (subsonicId) {
            console.log(remotePath, subsonicId.id, track.rating / 20, subsonicId.artist_id, subsonicId.artist_id);

            let trackRecord = await stmtGet(getAnno, USER_ID, subsonicId.id);
            if (trackRecord === undefined) {
                trackRecord = { ann_id: randomUUID(), play_date: null };
                await stmtRun(insertAnno, trackRecord.ann_id, USER_ID, subsonicId.id, 'media_file');
            }
            const metadataDate = new Date(track.playDate);
            const trackDate = new Date(trackRecord.play_date ?? 0);
            const playDate = metadataDate > trackDate ? metadataDate : trackDate;
            await stmtRun(updatePlayAndRating, isNaN(track.playCount) ? 0 : track.playCount, playDate.toISOString(), (track.rating ?? 0) / 20, trackRecord.ann_id);
        } else {
            console.log('Could not find subsonic ID for ' + remotePath);
        }
    }
}
