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

    public async getStreamerNames(platform: 'twitch' | 'kick'): Promise<string[]> {
        const tableName = 'streamers'; // The table we are querying
        const columnName = platform === 'twitch' ? 'TwitchNickname' : 'KickNickname';
        logger.info(`Querying table: "${tableName}" for platform: ${platform} in database: "${this.dbConfig.database}"`);
        try {
            // The column name is case-sensitive, so we wrap it in double quotes.
            const result: QueryResult<{ Nickname: string }> = await this.pool.query(
                `SELECT "${columnName}" as "Nickname" FROM ${tableName} WHERE "${columnName}" IS NOT NULL`
            );
            const names = result.rows.map(row => row.Nickname);
            logger.info(`Fetched ${names.length} streamer names for ${platform} from the database.`);
            return names;
        } catch (error) {
            logger.error(`Error querying table "${tableName}".`, error);
            return [];
        }
    }

    public async updateStreamerAvatar(login: string, avatarUrl: string, platform: 'twitch' | 'kick'): Promise<void> {
        const tableName = 'streamers';
        const columnName = platform === 'twitch' ? 'TwitchNickname' : 'KickNickname';
        const query = `UPDATE ${tableName} SET "Avatar" = $1 WHERE LOWER("${columnName}") = LOWER($2)`;
        try {
            await this.pool.query(query, [avatarUrl, login]);
            logger.info(`Successfully updated avatar for streamer: ${login}`);
        } catch (error) {
            logger.error(`Error updating avatar for streamer: ${login}`, error);
        }
    }

    public async disconnect(): Promise<void> {
        await this.pool.end();
        logger.info('Database pool has been closed.');
    }
}

export default new DatabaseService();