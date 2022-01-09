import sqlite3 from 'sqlite3';
import { logger } from './logger';

export function setupDb(dbPath: string): Promise<sqlite3.Database> {
    return new Promise((resolve, reject) => {
        const sql = sqlite3.verbose();
        const db = new sql.Database(dbPath, (err) => {
            if (err) {
                logger.error(err);
                reject(err);
                process.exit(1);
            }
        });

        db.run(`
            CREATE TABLE IF NOT EXISTS sync_status (
                path STRING PRIMARY KEY,
                localPath STRING,
                eTag STRING,
                md5 STRING
            )
        `, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(db);
            }
        });
    });
}
