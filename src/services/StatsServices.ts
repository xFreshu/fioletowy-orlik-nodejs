/**
 * Serwis do obliczania statystyk streamerów
 */

import { StreamerInfo, AppStatistics } from '../types/types';
import { logger } from '../utils/logger.js';

export class StatsService {
    /**
     * Oblicza kompletne statystyki dla listy streamerów
     */
    calculateStatistics(streamers: StreamerInfo[]): AppStatistics {
        logger.info('📊 Calculating statistics...');

        const totalStreamers = streamers.length;
        const liveStreamers = streamers.filter(s => s.isLive);
        const partners = streamers.filter(s => s.broadcasterType === 'partner');
        const affiliates = streamers.filter(s => s.broadcasterType === 'affiliate');

        const totalViews = streamers.reduce((sum, s) => sum + s.viewCount, 0);
        const averageViews = totalViews / totalStreamers;

        // Top streamers po view count
        const topStreamers = [...streamers]
            .sort((a, b) => b.viewCount - a.viewCount)
            .slice(0, 5);

        // Live streamers posortowani po viewer count
        const sortedLiveStreamers = liveStreamers
            .sort((a, b) => (b.streamData?.viewerCount || 0) - (a.streamData?.viewerCount || 0));

        // Popularne gry wśród live streamów
        const gameFrequency = liveStreamers.reduce((acc, streamer) => {
            const game = streamer.streamData?.gameName;
            if (game) {
                acc[game] = (acc[game] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const popularGames = Object.entries(gameFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([game, count]) => ({game, count}));

        // Łączni widzowie live streamów
        const totalLiveViewers = liveStreamers.reduce(
            (sum, s) => sum + (s.streamData?.viewerCount || 0),
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

        logger.success(`Statistics calculated for ${totalStreamers} streamers`);
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
     * Formatuje statystyki jako tekst
     */
    formatStatisticsAsText(stats: AppStatistics): string {
        const lines = [
            '📊 STATYSTYKI STREAMERÓW',
            '='.repeat(30),
            `👥 Łącznie: ${stats.totalStreamers}`,
            `🔴 Live: ${stats.liveStreamers} (${Math.round(stats.liveStreamers / stats.totalStreamers * 100)}%)`,
            `⭐ Partnerzy: ${stats.partners}`,
            `🤝 Afiliowani: ${stats.affiliates}`,
            `📈 Łączne wyświetlenia: ${stats.totalViews.toLocaleString('pl-PL')}`,
            `📊 Średnie wyświetlenia: ${Math.round(stats.averageViews).toLocaleString('pl-PL')}`,
            `📺 Łączni widzowie live: ${stats.totalLiveViewers.toLocaleString('pl-PL')}`,
        ];

        if (stats.topStreamers.length > 0) {
            lines.push('', '🏆 TOP STREAMERS:');
            stats.topStreamers.forEach((streamer, i) => {
                const status = streamer.isLive ? '🔴' : '⚫';
                lines.push(`${i + 1}. ${status} ${streamer.displayName}: ${streamer.viewCount.toLocaleString('pl-PL')}`);
            });
        }

        if (stats.popularGames.length > 0) {
            lines.push('', '🎮 POPULARNE GRY:');
            stats.popularGames.forEach(({game, count}) => {
                lines.push(`• ${game}: ${count} ${count === 1 ? 'streamer' : 'streamerów'}`);
            });
        }

        return lines.join('\n');
    }

    /**
     * Znajduje najdłużej streamujących
     */
    getLongestStreamers(streamers: StreamerInfo[], limit: number = 5): StreamerInfo[] {
        return streamers
            .filter(s => s.isLive && s.streamDurationMinutes)
            .sort((a, b) => (b.streamDurationMinutes || 0) - (a.streamDurationMinutes || 0))
            .slice(0, limit);
    }

    /**
     * Znajduje najstarsze konta
     */
    getOldestAccounts(streamers: StreamerInfo[], limit: number = 5): StreamerInfo[] {
        return [...streamers]
            .sort((a, b) => b.accountAgeDays - a.accountAgeDays)
            .slice(0, limit);
    }

    /**
     * Grupuje streamerów po typie konta
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