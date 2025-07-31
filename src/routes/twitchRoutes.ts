import { Router } from 'express';
import { TwitchController } from '../controllers/TwitchController.js';
import { TwitchService } from '../services/TwitchServices.js';
import { DatabaseService } from '../services/DatabaseService.js';
import { getConfig } from '../config/index.js';
import logger from '../config/logger.js';

const router = Router();

async function initializeRoutes() {
    try {
        const config = getConfig();

        // Initialize services
        const databaseService = new DatabaseService();
        await databaseService.connect();

        const twitchService = new TwitchService(config.twitch.clientId, config.twitch.clientSecret);

        // Fetch streamers from the database
        const streamersFromDb = await databaseService.getStreamerLogins();

        // Inject dependencies into the controller
        const twitchController = new TwitchController(twitchService, streamersFromDb);

        // Set up routes
        router.get('/twitchStreamers', twitchController.getAllStreamers);
        router.get('/liveStreamers', twitchController.getLiveStreamers);
        router.get('/config/streamers', twitchController.getStreamersFromConfig);

        logger.info('Twitch routes initialized successfully.');

    } catch (error) {
        logger.error('Failed to initialize Twitch routes:', error);
        // If initialization fails, you might want to prevent the app from starting
        // or handle it gracefully.
    }
}

initializeRoutes();

export default router;
