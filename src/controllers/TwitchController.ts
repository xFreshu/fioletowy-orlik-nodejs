import { Request, Response, NextFunction } from 'express';
import { TwitchService } from '../services/TwitchServices.js';
import { DatabaseService } from '../services/DatabaseService.js';

export class TwitchController {
    private readonly twitchService: TwitchService;
    private readonly databaseService: DatabaseService;
    private readonly streamersToCheck: string[];

    constructor(twitchService: TwitchService, databaseService: DatabaseService, streamersToCheck: string[]) {
        this.twitchService = twitchService;
        this.databaseService = databaseService;
        this.streamersToCheck = streamersToCheck;
    }

    public getAllStreamers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const streamers = await this.twitchService.getStreamersInfo(this.streamersToCheck);
            for (const streamer of streamers) {
                if (streamer.avatar) {
                    await this.databaseService.updateStreamerAvatar(streamer.login, streamer.avatar);
                }
            }
            res.status(200).json(streamers);
        } catch (error) {
            next(error);
        }
    };

    public getLiveStreamers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const allStreamers = await this.twitchService.getStreamersInfo(this.streamersToCheck);
            const liveStreamers = allStreamers.filter(streamer => streamer.isLive);
            liveStreamers.sort((a, b) => (b.viewers || 0) - (a.viewers || 0));
            res.status(200).json(liveStreamers);
        } catch (error) {
            next(error);
        }
    };

    public getStreamersFromConfig = (req: Request, res: Response): void => {
        res.status(200).json({ streamers_from_config: this.streamersToCheck });
    };

    public getStreamer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { login } = req.params;
            if (!login) {
                res.status(400).json({ error: 'Streamer login is required' });
                return;
            }

            const streamerInfo = await this.twitchService.getStreamersInfo([login]);
            const streamer = streamerInfo[0];

            if (streamer) {
                if (streamer.avatar) {
                    await this.databaseService.updateStreamerAvatar(streamer.login, streamer.avatar);
                }
                res.status(200).json(streamer);
            } else {
                res.status(404).json({ error: 'Streamer not found' });
            }
        } catch (error) {
            next(error);
        }
    };
}
