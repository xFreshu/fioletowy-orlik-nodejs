import dotenv from 'dotenv';

// This ensures that whenever this module is imported, dotenv is configured.
// It's safe to call this multiple times.
dotenv.config();

interface Config {
    twitch: {
        clientId: string;
        clientSecret: string;
    };
    db: {
        host: string;
        port: number;
        user?: string;
        password?: string;
        database?: string;
    };
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// This function BUILDS and returns the config object on demand.
// This ensures it reads `process.env` AFTER dotenv has run.
export const getConfig = (): Config => {
    const config: Config = {
        twitch: {
            clientId: process.env.TWITCH_CLIENT_ID || '',
            clientSecret: process.env.TWITCH_CLIENT_SECRET || '',
        },
        db: {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
        },
        logLevel: (process.env.LOG_LEVEL as Config['logLevel']) || 'info',
    };

    if (!config.twitch.clientId || !config.twitch.clientSecret) {
        console.error('ERROR: Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET in your .env file.');
        throw new Error('Twitch client ID and secret must be provided.');
    }

    if (!config.db.database) {
        console.error('ERROR: Missing DB_DATABASE in your .env file.');
        throw new Error('Database name must be provided.');
    }

    return config;
};