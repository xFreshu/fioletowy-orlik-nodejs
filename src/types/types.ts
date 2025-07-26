/**
 * Typy dla Twitch API i aplikacji
 */

// ========== TWITCH API TYPES ==========

export interface TwitchTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: 'bearer';
}

export interface TwitchUser {
    id: string;
    login: string;
    display_name: string;
    type: '' | 'admin' | 'global_mod' | 'staff';
    broadcaster_type: '' | 'affiliate' | 'partner';
    description: string;
    profile_image_url: string;
    offline_image_url: string;
    view_count: number;
    created_at: string;
}

export interface TwitchUsersResponse {
    data: TwitchUser[];
}

export interface TwitchStream {
    id: string;
    user_id: string;
    user_login: string;
    user_name: string;
    game_id: string;
    game_name: string;
    type: 'live' | '';
    title: string;
    viewer_count: number;
    started_at: string;
    language: string;
    thumbnail_url: string;
    tag_ids: string[];
    is_mature: boolean;
}

export interface TwitchStreamsResponse {
    data: TwitchStream[];
    pagination: {
        cursor?: string;
    };
}

// ========== APPLICATION TYPES ==========

export interface StreamerInfo {
    // Basic user info
    id: string;
    login: string;
    displayName: string;
    description: string;
    profileImageUrl: string;
    viewCount: number;
    broadcasterType: string;
    createdAt: Date;

    // Stream status
    isLive: boolean;
    streamData?: {
        title: string;
        gameName: string;
        viewerCount: number;
        startedAt: Date;
        thumbnailUrl: string;
        language: string;
    };

    // Calculated fields
    accountAgeDays: number;
    streamDurationMinutes?: number;
}

export interface AppConfig {
    twitch: {
        clientId: string;
        clientSecret: string;
    };
    streamersToCheck: string[];
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface AppStatistics {
    totalStreamers: number;
    liveStreamers: number;
    partners: number;
    affiliates: number;
    totalViews: number;
    averageViews: number;
    topStreamers: StreamerInfo[];
    liveStreamersData: StreamerInfo[]; // Dodane pole
    popularGames: { game: string; count: number }[];
    totalLiveViewers: number;
}

// ========== ERROR TYPES ==========

export class TwitchApiError extends Error {
    constructor(
        message: string,
        public status?: number,
        public code?: string
    ) {
        super(message);
        this.name = 'TwitchApiError';
    }
}

export class ConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConfigurationError';
    }
}