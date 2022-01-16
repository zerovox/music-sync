import { createHash, randomUUID } from 'crypto';
import { promises } from 'fs';
import subsonic from 'subsonicjs';
import toml from 'toml';

const salt = randomUUID();

export async function setupSubsonic(host: string, protocol = 'https', port = 80) {
    const subsonicCreds = await promises.readFile('.subsonic-credentials', { encoding: 'utf8' });
    const { subsonic_username, subsonic_password } = toml.parse(subsonicCreds)['default'];
    const saltedPassHash = createHash('md5').update(subsonic_password + salt).digest('hex');
    const sub = subsonic(subsonic_username, saltedPassHash, salt,
        {
            protocol,
            host,
            port,
            timeout: 30,
            client: 'subsync',
            version: '1.16.1',
        });
    return sub;
}
