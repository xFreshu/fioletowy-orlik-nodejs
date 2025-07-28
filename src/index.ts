import express, { Application, Request, Response } from 'express';
import { getConfig } from './config/index.js';
import logger from './config/logger.js';
import { TwitchService } from './services/TwitchServices.js';
import { StreamerInfo } from './types/types.js';

const PORT = process.env.PORT || 3000;

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
     * Fetches streamer data.
     * @returns A promise that resolves to an array of StreamerInfo objects.
     */
    async getStreamerData(): Promise<StreamerInfo[]> {
        if (this.streamers.length === 0) {
            logger.warn('No streamers to check. Please add streamers to your database.');
            return [];
        }

        const streamerInfo = await this.twitchService.getStreamersInfo(this.streamers);

        if (streamerInfo.length === 0) {
            logger.warn('Could not retrieve information for any of the streamers.');
            return [];
        }

        const liveStreamers = streamerInfo.filter(streamer => streamer.isLive);

        liveStreamers.sort((a, b) => (b.viewers || 0) - (a.viewers || 0));

        return liveStreamers;
    }
}

/**
 * Main entry point for the application.
 * Initializes configuration, sets up the Express server, and defines API routes.
 */
async function main() {
    try {
        const config = await getConfig();
        const app = express();
        const twitchApp = new TwitchStreamerApp(config);

        // Middleware to parse JSON bodies
        app.use(express.json());

        // API endpoint to get Twitch streamer data
        app.get('/api/twitchStreamers', async (req: Request, res: Response) => {
            logger.info('Received request for /api/twitchStreamers');
            try {
                const data = await twitchApp.getStreamerData();
                res.json(data);
                logger.info('Successfully sent streamer data.');
            } catch (error) {
                logger.error('Error fetching streamer data:', error);
                res.status(500).json({ error: 'Failed to retrieve streamer data' });
            }
        });

        // Start the server
        app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
            logger.info(`Access streamer data at http://localhost:${PORT}/api/twitchStreamers`);
        });

    } catch (error) {
        logger.error('Application failed to start.', error);
        process.exit(1);
    }
}

main();
