import dotenv from 'dotenv';

// This will automatically look for the .env file in the project root directory
dotenv.config();

interface Config {
    twitch: {
        clientId: string;
        clientSecret: string;
    };
    streamersToCheck: string[];
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}

const config: Config = {
    twitch: {
        clientId: process.env.TWITCH_CLIENT_ID || '',
        clientSecret: process.env.TWITCH_CLIENT_SECRET || '',
    },
    streamersToCheck: process.env.STREAMERS_TO_CHECK?.split(',') || [],
    logLevel: (process.env.LOG_LEVEL as Config['logLevel']) || 'info',
};

if (!config.twitch.clientId || !config.twitch.clientSecret) {
    console.error('ERROR: Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET in your .env file.');
    console.error('Please ensure the .env file exists in the project root and contains the required variables.');
    throw new Error('Twitch client ID and secret must be provided.');
}

export const getConfig = (): Config => config;
