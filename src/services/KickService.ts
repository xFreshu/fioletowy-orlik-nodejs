import axios from 'axios';
import { getConfig } from '../config/index.js';
import { KickUser, KickLivestream, StreamerInfo } from '../types/types.js';
import logger from '../config/logger.js';
import NodeCache from 'node-cache';

const config = getConfig();
const KICK_API_URL = 'https://kick.com/api/v2';

class KickService {
    private apiKey: string;
    private readonly cache: NodeCache;

    constructor() {
        this.apiKey = config.kick.apiKey;
        this.cache = new NodeCache({ stdTTL: 60, checkperiod: 120 }); // Cache for 60 seconds
        if (!this.apiKey) {
            throw new Error('Kick API key is not configured.');
        }
    }

    async getStreamerInfo(streamerName: string): Promise<KickUser | null> {
        try {
            const response = await axios.get<KickUser>(`${KICK_API_URL}/channels/${streamerName}`, {
                headers: {
                    'X-Kick-ApiKey': this.apiKey,
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
                },
            });
            return response.data;
        } catch (error) {
            logger.error(`Error fetching Kick streamer data for ${streamerName}:`, error);
            return null;
        }
    }

    async getLivestreamInfo(streamerName: string): Promise<KickLivestream | null> {
        try {
            const response = await axios.get<KickLivestream>(`${KICK_API_URL}/channels/${streamerName}/livestream`, {
                headers: {
                    'X-Kick-ApiKey': this.apiKey,
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
                },
            });
            return response.data;
        } catch (error) {
            logger.error(`Error fetching Kick livestream data for ${streamerName}:`, error);
            return null;
        }
    }

    async getStreamersInfo(streamerNames: string[]): Promise<StreamerInfo[]> {
        const cacheKey = `kick_streamers_${streamerNames.join('_')}`;
        const cachedData = this.cache.get<StreamerInfo[]>(cacheKey);
        if (cachedData) {
            logger.info('Returning Kick streamer info from cache.');
            return cachedData;
        }

        if (streamerNames.length === 0) return [];

        logger.info(`Fetching fresh data for ${streamerNames.length} Kick streamers...`);

        const streamerInfoPromises = streamerNames.map(async (streamerName) => {
            const [kickUser, kickLivestream] = await Promise.all([
                this.getStreamerInfo(streamerName),
                this.getLivestreamInfo(streamerName),
            ]);

            if (!kickUser) {
                return null;
            }

            return {
                displayName: kickUser.slug,
                login: kickUser.slug,
                avatar: kickUser.profile_pic,
                isLive: kickLivestream?.is_live ?? false,
                viewers: kickLivestream?.viewer_count ?? 0,
                title: kickLivestream?.session_title ?? null,
                gameName: null, // KickLivestream does not have a categories property
                platform: 'kick' as const,
                platformUrl: `https://kick.com/${kickUser.slug}`,
            };
        });

        const allStreamerInfo = (await Promise.all(streamerInfoPromises)).filter(Boolean) as StreamerInfo[];

        this.cache.set(cacheKey, allStreamerInfo);
        logger.info('Successfully fetched and cached Kick streamer info.');
        return allStreamerInfo;
    }
}

export default new KickService();
