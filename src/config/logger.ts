import winston, { Logform } from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf((info: Logform.TransformableInfo) => {
    const { level, message, timestamp: ts, stack } = info;
    return `${ts} ${level}: ${stack || message}`;
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }), // Log the stack trace
        logFormat
    ),
    transports: [
        // Console transport
        new winston.transports.Console(),

        // File transport for all logs
        new winston.transports.File({
            filename: 'logs/app.log',
            format: combine(timestamp(), errors({ stack: true }), winston.format.json()),
        }),

        // File transport for error logs
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: combine(timestamp(), errors({ stack: true }), winston.format.json()),
        }),
    ],
    exitOnError: false, // Do not exit on handled exceptions
});

export default logger;
