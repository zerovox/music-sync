import { promises } from 'fs';
import path from 'path';
import { rewritePlaylist } from './src/playlist';

const MUSIC_DIR = 'Z:\\Music\\Music';
const REMOTE_MUSIC_DIR = '/media/music/music';

rewritePlaylists('Z:\\Music\\Music\\Playlists');

async function rewritePlaylists(folder: string) {
    const folderFiles = await promises.readdir(folder);
    for (const file of folderFiles) {
        const filePath = path.resolve(folder, file);
        rewritePlaylist(filePath, MUSIC_DIR, REMOTE_MUSIC_DIR);
    }
}

