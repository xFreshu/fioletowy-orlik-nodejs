/**
 * Service for interacting with the Twitch API.
 */

import axios, { AxiosResponse } from 'axios';
import logger from '../config/logger.js';
import {
    TwitchTokenResponse,
    TwitchUsersResponse,
    TwitchStreamsResponse,
    StreamerInfo,
    TwitchApiError,
} from '../types/types.js';

export class TwitchService {
    private readonly clientId: string;
    private readonly clientSecret: string;
    private accessToken: string | null = null;
    private tokenExpiresAt: number | null = null;

    private readonly TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
    private readonly HELIX_BASE_URL = 'https://api.twitch.tv/helix';

    /**
     * Creates an instance of TwitchService.
     * @param clientId The Twitch application client ID.
     * @param clientSecret The Twitch application client secret.
     */
    constructor(clientId: string, clientSecret: string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    /**
     * Retrieves or refreshes the Twitch API access token.
     * The token is cached and refreshed only when it's about to expire.
     * @returns A promise that resolves to the valid access token string.
     * @throws {TwitchApiError} If authentication with Twitch API fails.
     */
    private async getAccessToken(): Promise<string> {
        if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
            return this.accessToken;
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

            this.accessToken = response.data.access_token;
            this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000) - 300000; // 5-minute buffer

            logger.info('Successfully obtained new access token.');
            return this.accessToken;
        } catch (error) {
            logger.error('Failed to get access token from Twitch.', error);
            throw new TwitchApiError('Authentication with Twitch API failed.');
        }
    }

    /**
     * Prepares the authorization headers required for Twitch API requests.
     * @returns A promise that resolves to an object containing the Authorization and Client-Id headers.
     */
    private async getAuthHeaders(): Promise<Record<string, string>> {
        const accessToken = await this.getAccessToken();
        return {
            'Authorization': `Bearer ${accessToken}`,
            'Client-Id': this.clientId,
        };
    }

    /**
     * Fetches information about multiple streamers by their Twitch login names.
     * This method makes two parallel API calls: one for user data and one for live stream data,
     * then combines the results.
     * @param logins An array of Twitch login names for the streamers to fetch.
     * @returns A promise that resolves to an array of StreamerInfo objects.
     *          Returns an empty array if no logins are provided or if an error occurs.
     */
    async getStreamersInfo(logins: string[]): Promise<StreamerInfo[]> {
        if (logins.length === 0) {
            logger.info('No streamers to fetch data for.');
            return [];
        }

        logger.info(`Fetching data for ${logins.length} streamers...`);

        const BATCH_SIZE = 100; // Twitch API limit for users and streams endpoints
        const allStreamerInfo: StreamerInfo[] = [];

        try {
            const headers = await this.getAuthHeaders();

            for (let i = 0; i < logins.length; i += BATCH_SIZE) {
                const batch = logins.slice(i, i + BATCH_SIZE);
                logger.info(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(logins.length / BATCH_SIZE)} (${batch.length} streamers)...`);

                // Make parallel requests for users and streams in the current batch
                const [usersResponse, streamsResponse] = await Promise.all([
                    axios.get<TwitchUsersResponse>(
                        `${this.HELIX_BASE_URL}/users`,
                        { headers, params: { login: batch } }
                    ),
                    axios.get<TwitchStreamsResponse>(
                        `${this.HELIX_BASE_URL}/streams`,
                        { headers, params: { user_login: batch } }
                    ),
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
                    } as StreamerInfo;
                });

                allStreamerInfo.push(...batchStreamerInfo);

                // Add a small delay between batches to avoid hitting rate limits too aggressively
                if (i + BATCH_SIZE < logins.length) {
                    logger.info('Waiting for 1 second before next batch...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            logger.info(`Successfully fetched data for ${allStreamerInfo.length} streamers.`);
            return allStreamerInfo;

        } catch (error) {
            logger.error('An error occurred while fetching data from Twitch.', error);
            return [];
        }
    }
}
