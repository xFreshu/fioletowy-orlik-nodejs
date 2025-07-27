/**
 * Main application file for the Twitch Streamer Info App.
 * This class initializes the Twitch service and fetches streamer data.
 */
class TwitchStreamerApp {
    private twitchService: TwitchService;
    private streamers: string[];

    /**
     * Creates an instance of TwitchStreamerApp.
     * @param config The application configuration including Twitch API credentials and streamers to check.
     */
    constructor(config: Awaited<ReturnType<typeof getConfig>>) {
        this.twitchService = new TwitchService(
            config.twitch.clientId,
            config.twitch.clientSecret
        );
        this.streamers = config.streamersToCheck;
    }

    /**
     * Displays detailed information about a single streamer to the console.
     * @param streamer The StreamerInfo object containing streamer data.
     */
    private displayStreamerInfo(streamer: StreamerInfo): void {
        const status = streamer.isLive ? `🔴 LIVE` : '⚫ OFFLINE';
        console.log(`
👤 ${streamer.displayName} (@${streamer.login}) - ${status}`);

        if (streamer.isLive) {
            console.log(`   Title: ${streamer.title}`);
            console.log(`   Game: ${streamer.gameName}`);
            console.log(`   Viewers: ${streamer.viewers}`);
        }
    }

    /**
     * Runs the main application logic.
     * Fetches streamer data and displays it.
     */
    async run(): Promise<void> {
        logger.info('Starting the Twitch Streamer App...');

        if (this.streamers.length === 0) {
            logger.warn('No streamers to check. Please add streamers to your database.');
            return;
        }

        const streamerInfo = await this.twitchService.getStreamersInfo(this.streamers);

        if (streamerInfo.length === 0) {
            logger.warn('Could not retrieve information for any of the streamers.');
            return;
        }

        streamerInfo.forEach(streamer => this.displayStreamerInfo(streamer));

        logger.info('Applicationfinished.');
    }
}

/**
 * Main entry point for the application.
 * Initializes configuration and runs the TwitchStreamerApp.
 */
async function main() {
    try {
        const config = await getConfig();
        const app = new TwitchStreamerApp(config);
        await app.run();
    } catch (error) {
        logger.error('Application failed to start.', error);
        process.exit(1);
    }
}

main();
