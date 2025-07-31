import { Request, Response } from 'express';
import { TwitchService } from '../services/TwitchServices.js';

export class TwitchController {
    private readonly twitchService: TwitchService;
    private readonly streamersToCheck: string[];

    constructor(twitchService: TwitchService, streamersToCheck: string[]) {
        this.twitchService = twitchService;
        this.streamersToCheck = streamersToCheck;
    }

    public getAllStreamers = async (req: Request, res: Response): Promise<void> => {
        const streamers = await this.twitchService.getStreamersInfo(this.streamersToCheck);
        res.status(200).json(streamers);
    };

    public getLiveStreamers = async (req: Request, res: Response): Promise<void> => {
        const allStreamers = await this.twitchService.getStreamersInfo(this.streamersToCheck);
        const liveStreamers = allStreamers.filter(streamer => streamer.isLive);
        liveStreamers.sort((a, b) => (b.viewers || 0) - (a.viewers || 0));
        res.status(200).json(liveStreamers);
    };

    public getStreamersFromConfig = (req: Request, res: Response): void => {
        res.status(200).json({ streamers_from_config: this.streamersToCheck });
    };
}
