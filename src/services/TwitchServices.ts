import axios, { AxiosResponse } from 'axios';
import NodeCache from 'node-cache';
import logger from '../config/logger.js';
import { TwitchTokenResponse, TwitchUsersResponse, TwitchStreamsResponse, StreamerInfo, TwitchApiError } from '../types/types.js';

export class TwitchService {
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly cache: NodeCache;
    private readonly TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
    private readonly HELIX_BASE_URL = 'https://api.twitch.tv/helix';

    constructor(clientId: string, clientSecret: string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.cache = new NodeCache({ stdTTL: 60, checkperiod: 120 }); // Cache for 60 seconds
    }

    private async getAccessToken(): Promise<string> {
        const cachedToken = this.cache.get<string>('twitch_access_token');
        if (cachedToken) {
            return cachedToken;
        }

        logger.info('Requesting new access token from Twitch...');
        const params = new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            grant_type: 'client_credentials',
        });

        try {
            const response: AxiosResponse<TwitchTokenResponse> = await axios.post(
                this.TOKEN_URL,
                params.toString(),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );

            const { access_token, expires_in } = response.data;
            this.cache.set('twitch_access_token', access_token, expires_in - 300);
            logger.info('Successfully obtained and cached new access token.');
            return access_token;
        } catch (error) {
            logger.error('Failed to get access token from Twitch.', error);
            throw new TwitchApiError('Authentication with Twitch API failed.');
        }
    }

    private async getAuthHeaders(): Promise<Record<string, string>> {
        const accessToken = await this.getAccessToken();
        return {
            'Authorization': `Bearer ${accessToken}`,
            'Client-Id': this.clientId,
        };
    }

    async getStreamersInfo(logins: string[]): Promise<StreamerInfo[]> {
        const cacheKey = `streamers_${logins.join('_')}`;
        const cachedData = this.cache.get<StreamerInfo[]>(cacheKey);
        if (cachedData) {
            logger.info('Returning streamer info from cache.');
            return cachedData;
        }

        if (logins.length === 0) return [];

        logger.info(`Fetching fresh data for ${logins.length} streamers...`);
        const BATCH_SIZE = 100;
        const allStreamerInfo: StreamerInfo[] = [];

        try {
            const headers = await this.getAuthHeaders();
            for (let i = 0; i < logins.length; i += BATCH_SIZE) {
                const batch = logins.slice(i, i + BATCH_SIZE);
                const [usersResponse, streamsResponse] = await Promise.all([
                    axios.get<TwitchUsersResponse>(`${this.HELIX_BASE_URL}/users`, { headers, params: { login: batch } }),
                    axios.get<TwitchStreamsResponse>(`${this.HELIX_BASE_URL}/streams`, { headers, params: { user_login: batch } })
                ]);

                const users = usersResponse.data.data;
                const streamsMap = new Map(streamsResponse.data.data.map(s => [s.user_login.toLowerCase(), s]));

                const batchStreamerInfo = users.map(user => {
                    const stream = streamsMap.get(user.login.toLowerCase());
                    return {
                        displayName: user.display_name,
                        login: user.login,
                        isLive: !!stream,
                        viewers: stream ? stream.viewer_count : null,
                        title: stream ? stream.title : null,
                        gameName: stream ? stream.game_name : null,
                        viewCount: user.view_count,
                        broadcasterType: user.broadcaster_type,
                        createdAt: new Date(user.created_at),
                    };
                });
                allStreamerInfo.push(...batchStreamerInfo);
            }

            this.cache.set(cacheKey, allStreamerInfo);
            logger.info('Successfully fetched and cached streamer info.');
            return allStreamerInfo;
        } catch (error) {
            logger.error('An error occurred while fetching data from Twitch.', error);
            throw new TwitchApiError('Failed to fetch data from Twitch.');
        }
    }
}