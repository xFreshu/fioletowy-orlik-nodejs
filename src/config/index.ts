/**
 * Application configuration module.
 * Handles loading of environment variables and application settings.
 */

import { config as loadEnv } from 'dotenv';
import { AppConfig, DatabaseConfig, ConfigurationError } from '../types/types';
import { Pool } from 'pg';
import logger from './logger';

// Load environment variables from .env file
loadEnv();

/**
 * Loads the list of streamers to check from the database.
 * This function connects to the PostgreSQL database and queries the 'streamers' table.
 * If the database connection fails or no streamers are found, it logs a warning and returns an empty array.
 * @param dbConfig The database configuration object.
 * @returns A promise that resolves to an array of streamer Twitch nicknames (strings).
 */
async function loadStreamers(dbConfig: DatabaseConfig): Promise<string[]> {
    const pool = new Pool(dbConfig);
    try {
        logger.info('Connecting to the database to fetch streamers...');
        const result = await pool.query('SELECT "TwitchNickname" FROM streamers');
        logger.info(`Found ${result.rows.length} streamers in the database.`);
        return result.rows.map((row: any) => row.TwitchNickname);
    } catch (error) {
        logger.error('Error loading streamers from database:', error);
        logger.warn('Falling back to an empty list of streamers.');
        return [];
    } finally {
        await pool.end();
        logger.info('Database connection closed.');
    }
}

/**
 * Validates and returns the application configuration.
 * This function reads environment variables for Twitch API credentials and database settings.
 * It throws a ConfigurationError if essential environment variables are missing or invalid.
 * It also loads the list of streamers from the database.
 * @returns A promise that resolves to the application configuration object (AppConfig).
 * @throws {ConfigurationError} If required environment variables are not set or are invalid.
 */
export async function getConfig(): Promise<AppConfig> {
    const twitchClientId = process.env.TWITCH_CLIENT_ID;
    const twitchClientSecret = process.env.TWITCH_CLIENT_SECRET;
    const logLevel = (process.env.LOG_LEVEL as AppConfig['logLevel']) || 'info';

    // Validate required Twitch API credentials
    if (!twitchClientId || twitchClientId === '<your_twitch_client_id>') {
        throw new ConfigurationError(
            'TWITCH_CLIENT_ID is not configured. Please set it in your .env file.'
        );
    }

    if (!twitchClientSecret || twitchClientSecret === '<your_twitch_client_secret>') {
        throw new ConfigurationError(
            'TWITCH_CLIENT_SECRET is not configured. Please set it in your .env file.'
        );
    }

    // Database configuration
    const dbConfig: DatabaseConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    };

    const streamersToCheck = await loadStreamers(dbConfig);

    return {
        twitch: {
            clientId: twitchClientId,
            clientSecret: twitchClientSecret,
        },
        db: dbConfig,
        streamersToCheck,
        logLevel,
    };
}

/**
 * Checks if the application is running in development mode.
 * This is determined by the NODE_ENV environment variable.
 * @returns {boolean} True if NODE_ENV is 'development', false otherwise.
 */
export function isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
}

/**
 * Checks if the application is running in production mode.
 * This is determined by the NODE_ENV environment variable.
 * @returns {boolean} True if NODE_ENV is 'production', false otherwise.
 */
export function isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
}
