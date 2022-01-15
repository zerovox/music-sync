import sqlite3 from 'sqlite3';
import { logger } from './logger';

export async function setupDb(dbPath: string): Promise<sqlite3.Database> {
    const sql = sqlite3.verbose();
    const db = new sql.Database(dbPath, (err) => {
        if (err) {
            logger.error(err);
            process.exit(1);
        }
    });

    return db;
}

export function dbRun(db: sqlite3.Database, sql: string, args: any[] = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, args, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(db);
            }
        });
    });
}