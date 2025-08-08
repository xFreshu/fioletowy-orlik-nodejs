/**
 * Type definitions for the Twitch API and the application.
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
    avatar: string;
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

// ========== KICK API TYPES ==========

export interface KickUser {
    id: number;
    user_id: number;
    slug: string;
    is_banned: boolean;
    playback_url: string;
    name_updated_at: null | string;
    vod_enabled: boolean;
    subscription_enabled: boolean;
    followers_count: number;
    profile_pic: string;
}

export interface KickStream {
    id: number;
    slug: string;
    channel_id: number;
    created_at: string;
    session_title: string;
    is_live: boolean;
    risk_level_id: null | number;
    start_time: string;
    source: null | string;
    twitch_channel: null | string;
    duration: number;
    language: string;
    is_mature: boolean;
    viewer_count: number;
    thumbnail: {
        src: string;
    };
    categories: {
        id: number;
        category_id: number;
        name: string;
        slug: string;
        tags: string[];
        description: null | string;
        deleted_at: null | string;
        viewers: number;
        banner: {
            responsive: string;
            url: string;
        };
    }[];
    video: {
        id: number;
        channel_id: number;
        livestream_id: number;
        slug: null | string;
        thumb: null | string;
        s3: null | string;
        duration: number;
        views: number;
        video_url: string;
        created_at: string;
        updated_at: string;
    };
}

export interface KickLivestream {
    id: number;
    slug: string;
    channel_id: number;
    created_at: string;
    session_title: string;
    is_live: boolean;
    risk_level_id: null | number;
    start_time: string;
    source: null | string;
    twitch_channel: null | string;
    duration: number;
    language: string;
    is_mature: boolean;
    viewer_count: number;
    thumbnail: {
        src: string;
    };
}

// ========== APPLICATION TYPES ==========

export interface StreamerInfo {
    id?: string; // Optional, as it might not always be needed for display
    displayName: string;
    login: string;
    avatar: string;
    isLive: boolean;
    viewers: number | null;
    title: string | null;
    gameName: string | null;
    platform: 'twitch' | 'kick';
    platformUrl: string;
    viewCount?: number; // Total views for the channel
    broadcasterType?: string; // e.g., 'partner', 'affiliate'
    createdAt?: Date; // Account creation date
    accountAgeDays?: number; // Calculated field
    streamDurationMinutes?: number; // Calculated field for live streams
}

export interface DatabaseConfig {
    host: string;
    port: number;
    user?: string;
    password?: string;
    database?: string;
}

export interface AppConfig {
    twitch: {
        clientId: string;
        clientSecret: string;
    };
    db: DatabaseConfig;
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
    liveStreamersData: StreamerInfo[];
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
