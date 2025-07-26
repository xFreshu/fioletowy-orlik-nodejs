/**
 * Simple logger utility
 */

import { getConfig } from '../config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const LOG_COLORS = {
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m',  // Green
    warn: '\x1b[33m',  // Yellow
    error: '\x1b[31m', // Red
    reset: '\x1b[0m',  // Reset
};

class Logger {
    private minLevel: number;

    constructor() {
        try {
            const config = getConfig();
            this.minLevel = LOG_LEVELS[config.logLevel];
        } catch {
            this.minLevel = LOG_LEVELS.info;
        }
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] >= this.minLevel;
    }

    private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
        const timestamp = new Date().toISOString();
        const color = LOG_COLORS[level];
        const reset = LOG_COLORS.reset;

        const formattedArgs = args.length > 0 ? ' ' + args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ') : '';

        return `${color}[${timestamp}] ${level.toUpperCase()}: ${message}${formattedArgs}${reset}`;
    }

    debug(message: string, ...args: any[]): void {
        if (this.shouldLog('debug')) {
            console.log(this.formatMessage('debug', message, ...args));
        }
    }

    info(message: string, ...args: any[]): void {
        if (this.shouldLog('info')) {
            console.log(this.formatMessage('info', message, ...args));
        }
    }

    warn(message: string, ...args: any[]): void {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, ...args));
        }
    }

    error(message: string, ...args: any[]): void {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message, ...args));
        }
    }

    // Convenience methods z emojis
    success(message: string, ...args: any[]): void {
        this.info(`✅ ${message}`, ...args);
    }

    loading(message: string, ...args: any[]): void {
        this.info(`🔄 ${message}`, ...args);
    }

    failure(message: string, ...args: any[]): void {
        this.error(`❌ ${message}`, ...args);
    }

    warning(message: string, ...args: any[]): void {
        this.warn(`⚠️ ${message}`, ...args);
    }
}

export const logger = new Logger();