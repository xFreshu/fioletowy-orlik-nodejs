import { Request, Response, NextFunction } from 'express';
import KickService from '../services/KickService.js';
import { StreamerInfo } from '../types/types.js';
import DatabaseService from '../services/DatabaseService.js';

class KickController {
    async getStreamer(req: Request, res: Response, next: NextFunction) {
        try {
            const streamerName = req.params.streamerName;

            if (!streamerName) {
                return res.status(400).json({ message: 'Streamer name is required.' });
            }

            const kickUser = await KickService.getStreamerInfo(streamerName);
            const kickLivestream = await KickService.getLivestreamInfo(streamerName);

            if (!kickUser) {
                return res.status(404).json({ message: 'Streamer not found on Kick.' });
            }

            const streamerInfo: StreamerInfo = {
                displayName: kickUser.slug,
                login: kickUser.slug,
                avatar: kickUser.profile_pic,
                isLive: kickLivestream?.is_live ?? false,
                viewers: kickLivestream?.viewer_count ?? 0,
                title: kickLivestream?.session_title ?? null,
                gameName: null, // KickLivestream does not have a categories property
                platform: 'kick',
                platformUrl: `https://kick.com/${kickUser.slug}`,
            };

            res.json(streamerInfo);
        } catch (error) {
            return next(error);
        }
    }

    async getStreamers(req: Request, res: Response, next: NextFunction) {
        try {
            const streamerNames = await DatabaseService.getStreamerNames('kick');
            const streamers = await KickService.getStreamersInfo(streamerNames);
            return res.json(streamers);
        } catch (error) {
            return next(error);
        }
    }

    async getLiveStreamers(req: Request, res: Response, next: NextFunction) {
        try {
            const streamerNames = await DatabaseService.getStreamerNames('kick');
            const streamers = await KickService.getStreamersInfo(streamerNames);
            const liveStreamers = streamers.filter(s => s.isLive);
            return res.json(liveStreamers);
        } catch (error) {
            return next(error);
        }
    }
}

export default new KickController();
