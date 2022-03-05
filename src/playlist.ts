import fs from 'fs';

export function rewritePlaylist(path: string, localMusicPath: string, remoteMusicPath: string) {
    fs.readFile(path, 'utf-8', function (err, data) {
        if (err) throw err;

        const edited = data.split(localMusicPath).join(remoteMusicPath).replace(/\\/g, '/');

        if (edited !== data) {
            fs.writeFile(path, edited, 'utf-8', function (err) {
                if (err) throw err;
            });
        }
    });
}