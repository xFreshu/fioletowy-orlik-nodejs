import { DatabaseService } from '../services/DatabaseService.js';
import { TwitchService } from '../services/TwitchServices.js';
import { getConfig } from '../config/index.js';
import logger from '../config/logger.js';

const config = getConfig();

const updateAvatars = async () => {
    const databaseService = new DatabaseService();
    const twitchService = new TwitchService(config.twitch.clientId, config.twitch.clientSecret);

    try {
        await databaseService.connect();
        const streamerLogins = await databaseService.getStreamerNames('twitch');

        if (streamerLogins.length === 0) {
            logger.info('No streamer logins found in the database.');
            return;
        }

        logger.info(`Found ${streamerLogins.length} streamers to update.`);

        const streamersInfo = await twitchService.getStreamersInfo(streamerLogins);

        for (const streamer of streamersInfo) {
            if (streamer.avatar) {
                await databaseService.updateStreamerAvatar(streamer.login, streamer.avatar, 'twitch');
            }
        }

        logger.info('Successfully updated all streamer avatars.');
    } catch (error) {
        logger.error('An error occurred during the avatar update process.', error);
    } finally {
        await databaseService.disconnect();
    }
};

updateAvatars();
