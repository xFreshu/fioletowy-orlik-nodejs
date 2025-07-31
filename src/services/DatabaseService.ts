import { Pool, QueryResult } from 'pg';
import logger from '../config/logger.js';
import { getConfig } from '../config/index.js';

export class DatabaseService {
    private pool: Pool;
    private dbConfig: ReturnType<typeof getConfig>['db'];

    constructor() {
        const config = getConfig();
        this.dbConfig = config.db;
        this.pool = new Pool(this.dbConfig);

        this.pool.on('error', (err) => {
            logger.error('Unexpected error on idle client', err);
            process.exit(-1);
        });
    }

    public async connect(): Promise<void> {
        try {
            await this.pool.connect();
            logger.info(`Successfully connected to database: "${this.dbConfig.database}"`);
        } catch (error) {
            logger.error('Failed to connect to the database.', error);
            throw error;
        }
    }

    public async getStreamerLogins(): Promise<string[]> {
        const tableName = 'streamers'; // The table we are querying
        logger.info(`Querying table: "${tableName}" in database: "${this.dbConfig.database}"`);
        try {
            // The column name is case-sensitive, so we wrap it in double quotes.
            const result: QueryResult<{ TwitchNickname: string }> = await this.pool.query(
                `SELECT "TwitchNickname" FROM ${tableName}`
            );
            const logins = result.rows.map(row => row.TwitchNickname);
            logger.info(`Fetched ${logins.length} streamer logins from the database.`);
            return logins;
        } catch (error) {
            logger.error(`Error querying table "${tableName}".`, error);
            return [];
        }
    }

    public async disconnect(): Promise<void> {
        await this.pool.end();
        logger.info('Database pool has been closed.');
    }
}