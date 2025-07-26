/**
 * Główna aplikacja - Twitch Streamer Info App
 *
 * Uruchomienie:
 * - npm run dev              - pełna aplikacja
 * - npm run dev overpow      - test pojedynczego streamera
 * - npm run dev help         - pomoc
 */

import { promises as fs } from 'fs';
import { getConfig } from './config/index.js';
import { logger } from './utils/logger.js';
import { TwitchService } from './services/TwitchServices';
import { StatsService } from './services/StatsServices';
import { DummyDataService } from './services/DummyDataService.js';
import type { StreamerInfo, AppStatistics, ConfigurationError } from './types/types';

/**
 * Główna klasa aplikacji
 */
class TwitchStreamerApp {
    private twitchService: TwitchService;
    private statsService: StatsService;
    private config: Awaited<ReturnType<typeof getConfig>>;

    constructor(config: Awaited<ReturnType<typeof getConfig>>) {
        try {
            this.config = config;
            this.twitchService = new TwitchService(
                this.config.twitch.clientId,
                this.config.twitch.clientSecret
            );
            this.statsService = new StatsService();

            logger.success('🚀 Application initialized successfully with nodemon');
            logger.info(`📡 Twitch API Client ID: ${this.config.twitch.clientId.substring(0, 8)}...`);
            logger.info(`👥 Configured for ${this.config.streamersToCheck.length} streamers`);
        } catch (error) {
            if (error instanceof Error && error.name === 'ConfigurationError') {
                logger.failure('Configuration error:', error.message);
                logger.info('💡 Make sure you have a .env file with valid Twitch credentials');
                logger.info('📖 Check README.md for setup instructions');
            } else {
                logger.failure('Failed to initialize application:', error);
            }
            process.exit(1);
        }
    }

    /**
     * Wyświetla szczegółowe informacje o streamerze
     */
    private displayStreamerInfo(streamer: StreamerInfo): void {
        const { displayName, login, id, viewCount, broadcasterType, createdAt, isLive, streamData, accountAgeDays, streamDurationMinutes } = streamer;

        console.log(`\n👤 ${displayName} (@${login})`);
        console.log(`   🆔 ID: ${id}`);
        console.log(`   📊 Wyświetlenia: ${viewCount.toLocaleString('pl-PL')}`);
        console.log(`   🎭 Status: ${broadcasterType || 'zwykły użytkownik'}`);
        console.log(`   📅 Założone: ${createdAt.toLocaleDateString('pl-PL')} (${accountAgeDays} dni temu)`);

        if (streamer.description) {
            console.log(`   📝 Opis: ${streamer.description.substring(0, 100)}${streamer.description.length > 100 ? '...' : ''}`);
        }

        if (isLive && streamData) {
            console.log(`   🔴 LIVE: ${streamData.title}`);
            console.log(`   🎮 Gra: ${streamData.gameName}`);
            console.log(`   👀 Widzowie: ${streamData.viewerCount.toLocaleString('pl-PL')}`);
            console.log(`   🕐 Start: ${streamData.startedAt.toLocaleString('pl-PL')}`);
            console.log(`   ⏱️ Trwa: ${streamDurationMinutes || 0} minut`);
            console.log(`   🌍 Język: ${streamData.language}`);
        } else {
            console.log(`   ⚫ Offline`);
        }
    }

    /**
     * Wyświetla kompletne statystyki
     */
    private displayStatistics(stats: AppStatistics): void {
        console.log('\n📊 STATYSTYKI OGÓLNE');
        console.log('='.repeat(50));

        console.log(`👥 Łącznie streamerów: ${stats.totalStreamers}`);
        console.log(`🔴 Aktualnie live: ${stats.liveStreamers} (${Math.round(stats.liveStreamers / stats.totalStreamers * 100)}%)`);
        console.log(`⭐ Partnerzy: ${stats.partners}`);
        console.log(`🤝 Afiliowani: ${stats.affiliates}`);
        console.log(`📈 Łączne wyświetlenia: ${stats.totalViews.toLocaleString('pl-PL')}`);
        console.log(`📊 Średnie wyświetlenia: ${Math.round(stats.averageViews).toLocaleString('pl-PL')}`);

        // Top 5 streamerów
        console.log('\n🏆 TOP 5 STREAMERÓW (wyświetlenia):');
        stats.topStreamers.forEach((streamer, index) => {
            const status = streamer.isLive ? '🔴' : '⚫';
            console.log(`${index + 1}. ${status} ${streamer.displayName}: ${streamer.viewCount.toLocaleString('pl-PL')}`);
        });

        // Live streamers
        if (stats.liveStreamers > 0) {
            console.log('\n🔴 AKTUALNIE LIVE:');
            stats.liveStreamersData.forEach(streamer => {
                const viewers = streamer.streamData?.viewerCount || 0;
                const game = streamer.streamData?.gameName || 'Unknown';
                console.log(`• ${streamer.displayName}: ${game} (${viewers.toLocaleString('pl-PL')} widzów)`);
            });

            console.log(`📺 Łącznie widzów live: ${stats.totalLiveViewers.toLocaleString('pl-PL')}`);
        }

        // Popularne gry
        if (stats.popularGames.length > 0) {
            console.log('\n🎮 NAJPOPULARNIEJSZE GRY (live):');
            stats.popularGames.forEach(({ game, count }) => {
                console.log(`• ${game}: ${count} ${count === 1 ? 'streamer' : 'streamerów'}`);
            });
        }
    }

    /**
     * Zapisuje wyniki do plików
     */
    private async saveResults(streamers: StreamerInfo[], stats: AppStatistics): Promise<void> {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

            // JSON file
            const jsonFilename = `twitch-streamers-${timestamp}.json`;
            const jsonData = {
                generated_at: new Date().toISOString(),
                statistics: stats,
                streamers: streamers.map(s => ({
                    ...s,
                    createdAt: s.createdAt.toISOString(),
                    streamData: s.streamData ? {
                        ...s.streamData,
                        startedAt: s.streamData.startedAt.toISOString(),
                    } : null,
                })),
            };

            await fs.writeFile(jsonFilename, JSON.stringify(jsonData, null, 2), 'utf-8');
            logger.success(`JSON data saved to: ${jsonFilename}`);

            // CSV file
            const csvFilename = `twitch-streamers-${timestamp}.csv`;
            const csvHeader = 'Login,Display Name,View Count,Broadcaster Type,Is Live,Game,Current Viewers,Account Age Days,Stream Duration Minutes,Created At,Profile URL\n';
            const csvRows = streamers.map(s => [
                s.login,
                `"${s.displayName}"`,
                s.viewCount,
                s.broadcasterType || '',
                s.isLive ? 'Yes' : 'No',
                s.streamData?.gameName || '',
                s.streamData?.viewerCount || '',
                s.accountAgeDays,
                s.streamDurationMinutes || '',
                s.createdAt.toISOString(),
                `https://twitch.tv/${s.login}`,
            ].join(',')).join('\n');

            await fs.writeFile(csvFilename, csvHeader + csvRows, 'utf-8');
            logger.success(`CSV data saved to: ${csvFilename}`);

        } catch (error) {
            logger.failure('Failed to save results to files:', error);
        }
    }

    /**
     * Testuje pojedynczego streamera
     */
    async testSingleStreamer(login: string): Promise<void> {
        console.log(`🧪 TESTOWANIE POJEDYNCZEGO STREAMERA: ${login}`);
        console.log('='.repeat(60));

        // Test połączenia
        const connectionOk = await this.twitchService.testConnection();
        if (!connectionOk) {
            logger.failure('Cannot connect to Twitch API');
            return;
        }

        // Pobierz dane streamera
        const streamer = await this.twitchService.getStreamerInfo(login);

        if (streamer) {
            this.displayStreamerInfo(streamer);
            console.log('\n✅ Test completed successfully');
        } else {
            logger.warning(`Streamer '${login}' not found`);
            console.log('\n💡 Try with: ninja, shroud, pokimane, xqc, overpow');
        }
    }

    /**
     * Wyświetla pomoc
     */
    private showHelp(): void {
        console.log('🚀 TWITCH STREAMER INFO APP - Pomoc');
        console.log('='.repeat(50));
        console.log('');
        console.log('📋 Dostępne komendy:');
        console.log('  npm run dev                    - Uruchom pełną aplikację');
        console.log('  npm run dev dummy              - Uruchom z przykładowymi danymi');
        console.log('  npm run dev <streamer_login>   - Testuj pojedynczego streamera');
        console.log('  npm run dev help               - Wyświetl tę pomoc');
        console.log('  npm run test                   - Uruchom testy API');
        console.log('');
        console.log('💡 Przykłady:');
        console.log('  npm run dev overpow');
        console.log('  npm run dev ninja');
        console.log('  npm run dev shroud');
        console.log('');
        console.log('⚙️ Wymagane pliki:');
        console.log('  .env - z TWITCH_CLIENT_ID i TWITCH_CLIENT_SECRET');
        console.log('  streamers.json - lista streamerów do sprawdzenia');
        console.log('');
        console.log('📝 Format streamers.json:');
        console.log('  [{"name": "OverPow", "twitchNick": "overpow", "kickNick": "overpow"}]');
        console.log('');
        console.log('🔗 Pobierz credentials z: https://dev.twitch.tv/console/apps');
    }

    /**
     * Uruchamia aplikację z dummy data
     */
    async runWithDummyData(): Promise<void> {
        console.log('🚀 TWITCH STREAMER INFO APP (DUMMY DATA MODE)');
        console.log('='.repeat(50));
        console.log(`📅 Data: ${new Date().toLocaleString('pl-PL')}`);

        try {
            // Załaduj dummy data
            let streamers: StreamerInfo[];
            try {
                streamers = await DummyDataService.loadDummyData();
            } catch (error) {
                logger.warning('Failed to load JSON dummy data, using hardcoded fallback');
                streamers = DummyDataService.getHardcodedDummyData();
            }

            // Oblicz statystyki
            const stats = this.statsService.calculateStatistics(streamers);

            // Wyświetl szczegółowe informacje
            console.log('\n📋 SZCZEGÓŁOWE INFORMACJE O STREAMERACH (DUMMY DATA)');
            console.log('='.repeat(60));

            streamers.forEach(streamer => {
                this.displayStreamerInfo(streamer);
            });

            // Wyświetl statystyki
            this.displayStatistics(stats);

            // Zapisz wyniki
            await this.saveResults(streamers, stats);

            logger.success('Application completed successfully with dummy data! 🎉');

        } catch (error) {
            logger.failure('Application failed:', error);
            process.exit(1);
        }
    }

    /**
     * Główna funkcja aplikacji
     */
    async run(): Promise<void> {
        console.log('🚀 TWITCH STREAMER INFO APP');
        console.log('='.repeat(50));
        console.log(`📅 Data: ${new Date().toLocaleString('pl-PL')}`);
        console.log(`👥 Streamerów do sprawdzenia: ${this.config.streamersToCheck.length}`);
        console.log(`📋 Lista: ${this.config.streamersToCheck.join(', ')}`);

        try {
            // Test połączenia z API
            logger.info('🧪 Testing API connection...');
            const connectionOk = await this.twitchService.testConnection();

            if (!connectionOk) {
                logger.warning('Cannot establish connection to Twitch API');
                logger.info('🔄 Switching to dummy data mode...');
                await this.runWithDummyData();
                return;
            }

            // Pobierz dane wszystkich streamerów
            logger.info('📥 Fetching streamers data...');
            const streamers = await this.twitchService.getMultipleStreamersInfo(this.config.streamersToCheck);

            if (streamers.length === 0) {
                logger.warning('No streamer data was fetched, switching to dummy data');
                await this.runWithDummyData();
                return;
            }

            // Oblicz statystyki
            const stats = this.statsService.calculateStatistics(streamers);

            // Wyświetl szczegółowe informacje
            console.log('\n📋 SZCZEGÓŁOWE INFORMACJE O STREAMERACH');
            console.log('='.repeat(60));

            streamers.forEach(streamer => {
                this.displayStreamerInfo(streamer);
            });

            // Wyświetl statystyki
            this.displayStatistics(stats);

            // Zapisz wyniki
            await this.saveResults(streamers, stats);

            logger.success('Application completed successfully! 🎉');

        } catch (error) {
            logger.failure('Application failed:', error);
            logger.info('🔄 Trying dummy data mode...');
            await this.runWithDummyData();
        }
    }
}

/**
 * Główna funkcja - entry point
 */
async function main(): Promise<void> {
    try {
        const config = await getConfig();
        const app = new TwitchStreamerApp(config);
        const args = process.argv.slice(2);

        if (args.length === 0) {
            // Uruchom pełną aplikację
            await app.run();
        } else {
            const command = args[0];

            if (command === 'help' || command === '--help' || command === '-h') {
                app['showHelp'](); // Private method access for help
            } else if (command === 'dummy' || command === '--dummy') {
                // Uruchom z dummy data
                await app.runWithDummyData();
            } else {
                // Test pojedynczego streamera
                await app.testSingleStreamer(command);
            }
        }
    } catch (error) {
        logger.failure('Fatal error:', error);
        process.exit(1);
    }
}

/**
 * Obsługa błędów globalnych
 */
process.on('unhandledRejection', (reason, promise) => {
    logger.failure('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    logger.failure('Uncaught Exception:', error);
    process.exit(1);
});

process.on('SIGINT', () => {
    logger.info('\n👋 Application interrupted by user');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('\n👋 Application terminated');
    process.exit(0);
});

// Uruchom aplikację
main().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
});