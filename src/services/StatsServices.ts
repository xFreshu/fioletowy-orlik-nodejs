/**
 * Service for calculating streamer statistics.
 */

import { StreamerInfo, AppStatistics } from '../types/types';
import logger from '../config/logger';

export class StatsService {
    /**
     * Calculates comprehensive statistics for a list of streamers.
     * @param streamers An array of StreamerInfo objects.
     * @returns An AppStatistics object containing various calculated metrics.
     */
    calculateStatistics(streamers: StreamerInfo[]): AppStatistics {
        logger.info('📊 Calculating statistics...');

        const totalStreamers = streamers.length;
        const liveStreamers = streamers.filter(s => s.isLive);
        const partners = streamers.filter(s => s.broadcasterType === 'partner');
        const affiliates = streamers.filter(s => s.broadcasterType === 'affiliate');

        const totalViews = streamers.reduce((sum, s) => sum + (s.viewCount || 0), 0);
        const averageViews = totalStreamers > 0 ? totalViews / totalStreamers : 0;

        // Top streamers by view count
        const topStreamers = [...streamers]
            .filter(s => s.viewCount !== undefined && s.viewCount !== null)
            .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
            .slice(0, 5);

        // Live streamers sorted by viewer count
        const sortedLiveStreamers = liveStreamers
            .filter(s => s.viewers !== null)
            .sort((a, b) => (b.viewers || 0) - (a.viewers || 0));

        // Popular games among live streams
        const gameFrequency = liveStreamers.reduce((acc, streamer) => {
            const game = streamer.gameName;
            if (game) {
                acc[game] = (acc[game] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const popularGames = Object.entries(gameFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([game, count]) => ({ game, count }));

        // Total live viewers
        const totalLiveViewers = liveStreamers.reduce(
            (sum, s) => sum + (s.viewers || 0),
            0
        );

        const stats: AppStatistics = {
            totalStreamers,
            liveStreamers: liveStreamers.length,
            partners: partners.length,
            affiliates: affiliates.length,
            totalViews,
            averageViews,
            topStreamers,
            liveStreamersData: sortedLiveStreamers,
            popularGames,
            totalLiveViewers,
        };

        logger.info(`Statistics calculated for ${totalStreamers} streamers`);
        logger.debug('Stats summary:', {
            total: totalStreamers,
            live: liveStreamers.length,
            partners: partners.length,
            affiliates: affiliates.length,
            totalViews,
            totalLiveViewers,
        });

        return stats;
    }

    /**
     * Formats statistics as text for console output.
     * @param stats The AppStatistics object to format.
     * @returns A string representation of the statistics.
     */
    formatStatisticsAsText(stats: AppStatistics): string {
        const lines = [
            '📊 STREAMER STATISTICS',
            '='.repeat(30),
            `👥 Total Streamers: ${stats.totalStreamers}`,
            `🔴 Live: ${stats.liveStreamers} (${Math.round(stats.liveStreamers / stats.totalStreamers * 100)}%)`,
            `⭐ Partners: ${stats.partners}`,
            `🤝 Affiliates: ${stats.affiliates}`,
            `📈 Total Views: ${stats.totalViews.toLocaleString('en-US')}`,
            `📊 Average Views: ${Math.round(stats.averageViews).toLocaleString('en-US')}`,
            `📺 Total Live Viewers: ${stats.totalLiveViewers.toLocaleString('en-US')}`,
        ];

        if (stats.topStreamers.length > 0) {
            lines.push('', '🏆 TOP STREAMERS (by views):');
            stats.topStreamers.forEach((streamer, i) => {
                const status = streamer.isLive ? '🔴' : '⚫';
                lines.push(`${i + 1}. ${status} ${streamer.displayName}: ${(streamer.viewCount || 0).toLocaleString('en-US')}`);
            });
        }

        if (stats.popularGames.length > 0) {
            lines.push('', '🎮 MOST POPULAR GAMES (live):');
            stats.popularGames.forEach(({ game, count }) => {
                lines.push(`• ${game}: ${count} ${count === 1 ? 'streamer' : 'streamers'}`);
            });
        }

        return lines.join('\n');
    }

    /**
     * Finds the longest streaming channels.
     * @param streamers An array of StreamerInfo objects.
     * @param limit The maximum number of streamers to return.
     * @returns An array of StreamerInfo objects, sorted by stream duration.
     */
    getLongestStreamers(streamers: StreamerInfo[], limit: number = 5): StreamerInfo[] {
        return streamers
            .filter(s => s.isLive && s.streamDurationMinutes !== undefined && s.streamDurationMinutes !== null)
            .sort((a, b) => (b.streamDurationMinutes || 0) - (a.streamDurationMinutes || 0))
            .slice(0, limit);
    }

    /**
     * Finds the oldest accounts.
     * @param streamers An array of StreamerInfo objects.
     * @param limit The maximum number of accounts to return.
     * @returns An array of StreamerInfo objects, sorted by account age.
     */
    getOldestAccounts(streamers: StreamerInfo[], limit: number = 5): StreamerInfo[] {
        return [...streamers]
            .filter(s => s.accountAgeDays !== undefined && s.accountAgeDays !== null)
            .sort((a, b) => (b.accountAgeDays || 0) - (a.accountAgeDays || 0))
            .slice(0, limit);
    }

    /**
     * Groups streamers by their broadcaster type.
     * @param streamers An array of StreamerInfo objects.
     * @returns An object where keys are broadcaster types and values are arrays of StreamerInfo.
     */
    groupByBroadcasterType(streamers: StreamerInfo[]): Record<string, StreamerInfo[]> {
        return streamers.reduce((groups, streamer) => {
            const type = streamer.broadcasterType || 'regular';
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(streamer);
            return groups;
        }, {} as Record<string, StreamerInfo[]>);
    }
}