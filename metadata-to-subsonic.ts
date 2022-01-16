import { createHash, randomUUID } from "crypto";
import { promises } from "fs";
import path from "path";
import subsonic from "subsonicjs";
import toml from "toml";
import { setupDb, stmtGet } from "./src/db";
import { getTrackMetadata } from "./src/itunes";

syncMetadataToSubsonic();

const salt = randomUUID();

async function syncMetadataToSubsonic() {
    const subsonicCreds = await promises.readFile(".subsonic-credentials", { encoding: "utf8" });
    const { subsonic_username, subsonic_password } = toml.parse(subsonicCreds)["default"];
    const saltedPassHash = createHash("md5").update(subsonic_password + salt).digest("hex");
    const sub = subsonic(subsonic_username, saltedPassHash, salt,
        {
            protocol: 'https',
            host: 'navidrome.v0.studio',
            port: 80,
            timeout: 30,
            client: 'subsync',
            version: '1.16.1'
        });

    const metadata = await getTrackMetadata('C:\\Users\\tim\\Music\\iTunes\\iTunes Music Library.xml');

    const db = await setupDb("./navidrome-new.db");

    const getId = db.prepare("select id from media_file where path = ?");

    for (const track of metadata.slice(0, 1000)) {
        const remotePath = "/media/music/" + track.s3Path.split(path.sep).join(path.posix.sep);
        const subsonicId = await stmtGet(getId, remotePath);
        if (subsonicId) {
            console.log(remotePath, subsonic.id, track.rating / 20);
        } else {
            console.log("Could not find subsonic ID for " + remotePath);
        }        
    }
}
