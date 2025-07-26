/**
 * Serwis do komunikacji z Twitch API
 */

import axios, { AxiosError, AxiosResponse } from 'axios';
import { logger } from '../utils/logger.js';
import {
    TwitchTokenResponse,
    TwitchUser,
    TwitchUsersResponse,
    TwitchStream,
    TwitchStreamsResponse,
    StreamerInfo,
    TwitchApiError,
} from '../types/types';

export class TwitchService {
    private readonly clientId: string;
    private readonly clientSecret: string;
    private accessToken: string | null = null;
    private tokenExpiresAt: number | null = null;

    // API URLs
    private readonly TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
    private readonly HELIX_BASE_URL = 'https://api.twitch.tv/helix';

    constructor(clientId: string, clientSecret: string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;

        logger.debug('TwitchService initialized', {
            clientId: `${clientId.substring(0, 8)}...`,
            clientSecret: '***hidden***',
        });
    }

    /**
     * Pobiera lub odświeża access token
     */
    private async getAccessToken(): Promise<string | null> {
        // Sprawdź czy token jest nadal ważny (z 5min buforem)
        if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt - 300000) {
            logger.debug('Using cached access token');
            return this.accessToken;
        }

        logger.loading('Getting new access token from Twitch');

        try {
            const params = new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                grant_type: 'client_credentials',
            });

            const response: AxiosResponse<TwitchTokenResponse> = await axios.post(
                this.TOKEN_URL,
                params.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    timeout: 10000,
                }
            );

            this.accessToken = response.data.access_token;
            this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000) - 300000;

            logger.success('Access token obtained successfully');
            logger.debug('Token expires at:', new Date(this.tokenExpiresAt + 300000).toISOString());

            return this.accessToken;
        } catch (error) {
            logger.failure('Failed to get access token');

            if (axios.isAxiosError(error) && error.response) {
                const status = error.response.status;
                const data = error.response.data;

                logger.error('Token request failed', { status, data });

                if (status === 400) {
                    throw new TwitchApiError('Invalid client credentials', status);
                } else if (status === 401) {
                    throw new TwitchApiError('Unauthorized - check your client ID and secret', status);
                }
            }

            throw new TwitchApiError('Failed to authenticate with Twitch API');
        }
    }

    /**
     * Przygotowuje headers dla requestów API
     */
    private async getAuthHeaders(): Promise<Record<string, string>> {
        const accessToken = await this.getAccessToken();

        return {
            'Authorization': `Bearer ${accessToken}`,
            'Client-Id': this.clientId,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Wykonuje request z retry logic
     */
    private async makeRequest<T>(
        url: string,
        params?: Record<string, any>,
        maxRetries: number = 3
    ): Promise<T> {
        const headers = await this.getAuthHeaders();

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.debug(`Making request to ${url}`, { params, attempt });

                const response: AxiosResponse<T> = await axios.get(url, {
                    headers,
                    params,
                    timeout: 15000,
                });

                // Log rate limiting info
                const rateLimitRemaining = response.headers['ratelimit-remaining'];
                const rateLimitReset = response.headers['ratelimit-reset'];

                if (rateLimitRemaining) {
                    logger.debug(`Rate limit: ${rateLimitRemaining} requests remaining`);
                }

                return response.data;
            } catch (error) {
                if (axios.isAxiosError(error) && error.response) {
                    const status = error.response.status;

                    // Rate limiting
                    if (status === 429 && attempt < maxRetries) {
                        const resetTime = error.response.headers['ratelimit-reset'];
                        const waitTime = resetTime ? parseInt(resetTime) * 1000 - Date.now() : 60000;

                        logger.warning(`Rate limit hit, waiting ${Math.ceil(waitTime / 1000)}s (attempt ${attempt}/${maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, Math.max(waitTime, 1000)));
                        continue;
                    }

                    // Token expired
                    if (status === 401 && attempt < maxRetries) {
                        logger.warning('Token expired, refreshing...');
                        this.accessToken = null;
                        this.tokenExpiresAt = null;
                        continue;
                    }

                    logger.error(`API request failed with status ${status}`, error.response.data);
                }

                if (attempt === maxRetries) {
                    throw error;
                }
            }
        }

        throw new TwitchApiError('Maximum retry attempts exceeded');
    }

    /**
     * Pobiera informacje o użytkowniku po login
     */
    async getUserByLogin(login: string): Promise<TwitchUser | null> {
        logger.debug(`Fetching user: ${login}`);

        try {
            const response = await this.makeRequest<TwitchUsersResponse>(
                `${this.HELIX_BASE_URL}/users`,
                { login: login.toLowerCase() }
            );

            if (response.data.length === 0) {
                logger.warning(`User '${login}' not found`);
                return null;
            }

            const user = response.data[0];
            // @ts-ignore
            logger.success(`Found user: ${user.display_name} (@${user.login})`);

            // @ts-ignore
            return user;
        } catch (error) {
            logger.failure(`Failed to fetch user '${login}'`, error);
            return null;
        }
    }

    /**
     * Pobiera informacje o streamie użytkownika
     */
    async getStreamByUserLogin(userLogin: string): Promise<TwitchStream | null> {
        logger.debug(`Fetching stream for: ${userLogin}`);

        try {
            const response = await this.makeRequest<TwitchStreamsResponse>(
                `${this.HELIX_BASE_URL}/streams`,
                { user_login: userLogin.toLowerCase() }
            );

            if (response.data.length === 0) {
                logger.debug(`User '${userLogin}' is offline`);
                return null;
            }

            const stream = response.data[0];
            // @ts-ignore
            logger.success(`Found live stream: ${stream.user_name} - ${stream.game_name} (${stream.viewer_count} viewers)`);

            // @ts-ignore
            return stream;
        } catch (error) {
            logger.failure(`Failed to fetch stream for '${userLogin}'`, error);
            return null;
        }
    }

    /**
     * Pobiera pełne informacje o streamerze
     */
    async getStreamerInfo(login: string): Promise<StreamerInfo | null> {
        logger.info(`📊 Getting full info for: ${login}`);

        const user = await this.getUserByLogin(login);
        if (!user) {
            return null;
        }

        // Sprawdź status streamu
        const stream = await this.getStreamByUserLogin(user.login);

        // Oblicz wiek konta
        const createdAt = new Date(user.created_at);
        const accountAgeDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

        // Oblicz czas streamowania jeśli live
        let streamDurationMinutes: number | undefined;
        if (stream) {
            const startedAt = new Date(stream.started_at);
            streamDurationMinutes = Math.floor((Date.now() - startedAt.getTime()) / (1000 * 60));
        }

        const streamerInfo: StreamerInfo = {
            id: user.id,
            login: user.login,
            displayName: user.display_name,
            description: user.description,
            profileImageUrl: user.profile_image_url,
            viewCount: user.view_count,
            broadcasterType: user.broadcaster_type,
            createdAt,
            isLive: !!stream,
            accountAgeDays,
            streamDurationMinutes,
        };

        if (stream) {
            streamerInfo.streamData = {
                title: stream.title,
                gameName: stream.game_name,
                viewerCount: stream.viewer_count,
                startedAt: new Date(stream.started_at),
                thumbnailUrl: stream.thumbnail_url.replace('{width}', '320').replace('{height}', '180'),
                language: stream.language,
            };
        }

        return streamerInfo;
    }

    /**
     * Pobiera informacje o wielu streamerach
     */
    async getMultipleStreamersInfo(logins: string[]): Promise<StreamerInfo[]> {
        logger.info(`📋 Fetching data for ${logins.length} streamers`);

        const results: StreamerInfo[] = [];
        const batchSize = 3; // Aby nie przeciążyć API

        for (let i = 0; i < logins.length; i += batchSize) {
            const batch = logins.slice(i, i + batchSize);
            const batchNumber = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(logins.length / batchSize);

            logger.loading(`Processing batch ${batchNumber}/${totalBatches}: ${batch.join(', ')}`);

            const batchPromises = batch.map(login => this.getStreamerInfo(login));
            const batchResults = await Promise.allSettled(batchPromises);

            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    results.push(result.value);
                } else {
                    logger.warning(`Failed to get data for: ${batch[index]}`);
                }
            });

            // Opóźnienie między batches
            if (i + batchSize < logins.length) {
                logger.debug('Waiting 2s before next batch...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        logger.success(`Successfully fetched data for ${results.length}/${logins.length} streamers`);
        return results;
    }

    /**
     * Testuje połączenie z API
     */
    async testConnection(): Promise<boolean> {
        logger.info('🧪 Testing API connection...');

        try {
            const testUser = await this.getUserByLogin('twitchdev');

            if (testUser) {
                logger.success('API connection test passed');
                return true;
            } else {
                logger.failure('API connection test failed - no test user found');
                return false;
            }
        } catch (error) {
            logger.failure('API connection test failed', error);
            return false;
        }
    }
}