/**
 * Konfiguracja aplikacji
 */

import { config as loadEnv } from 'dotenv';
import { promises as fs } from 'fs';
import { join } from 'path';
import { AppConfig, ConfigurationError } from '../types/types';

// Załaduj zmienne środowiskowe
loadEnv();

/**
 * Ładuje listę streamerów z pliku JSON
 */
async function loadStreamers(): Promise<string[]> {
    try {
        const streamersPath = join(process.cwd(), 'streamers.json');
        const fileContent = await fs.readFile(streamersPath, 'utf-8');
        const streamers = JSON.parse(fileContent);
        return streamers.map((s: any) => s.twitchNick);
    } catch (error) {
        console.warn('⚠️  Could not load streamers.json, using default list');
        return ['overpow', 'ninja', 'shroud'];
    }
}

/**
 * Waliduje i zwraca konfigurację aplikacji
 */
export async function getConfig(): Promise<AppConfig> {
    const twitchClientId = process.env.TWITCH_CLIENT_ID;
    const twitchClientSecret = process.env.TWITCH_CLIENT_SECRET;
    const logLevel = process.env.LOG_LEVEL as AppConfig['logLevel'] || 'info';

    // Walidacja wymaganych zmiennych
    if (!twitchClientId) {
        throw new ConfigurationError(
            'TWITCH_CLIENT_ID is required. Get it from https://dev.twitch.tv/console/apps'
        );
    }

    if (!twitchClientSecret) {
        throw new ConfigurationError(
            'TWITCH_CLIENT_SECRET is required. Get it from https://dev.twitch.tv/console/apps'
        );
    }

    if (twitchClientId.length < 10) {
        throw new ConfigurationError('TWITCH_CLIENT_ID seems invalid (too short)');
    }

    if (twitchClientSecret.length < 10) {
        throw new ConfigurationError('TWITCH_CLIENT_SECRET seems invalid (too short)');
    }

    const streamersToCheck = await loadStreamers();

    return {
        twitch: {
            clientId: twitchClientId,
            clientSecret: twitchClientSecret,
        },
        streamersToCheck,
        logLevel,
    };
}

/**
 * Sprawdza czy jesteśmy w trybie development
 */
export function isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
}

/**
 * Sprawdza czy jesteśmy w trybie production
 */
export function isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
}