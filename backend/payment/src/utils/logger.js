const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');

const logsDir = path.join(__dirname, '..', 'logs');
try {
    fs.mkdirSync(logsDir, { recursive: true });
} catch {
    // If we can't create logs dir, transports may still log to console.
}

function normalizeError(error) {
    if (!error) return undefined;
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
        };
    }
    if (typeof error === 'object') {
        return {
            message: error.message,
            stack: error.stack,
            ...error,
        };
    }
    return { message: String(error) };
}

const baseFormat = format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format((info) => {
        if (info.error) info.error = normalizeError(info.error);
        if (info.err) info.err = normalizeError(info.err);
        return info;
    })()
);

const consoleFormat = format.combine(
    baseFormat,
    format.colorize(),
    format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}: ${message}${metaStr}`;
    })
);

const fileFormat = format.combine(baseFormat, format.json());

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: {
        service: 'payment-service',
        env: process.env.NODE_ENV || 'development',
    },
    transports: [
        new transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error', format: fileFormat }),
        new transports.File({ filename: path.join(logsDir, 'combined.log'), format: fileFormat }),
    ],
    exceptionHandlers: [
        new transports.File({ filename: path.join(logsDir, 'exceptions.log'), format: fileFormat }),
    ],
    rejectionHandlers: [
        new transports.File({ filename: path.join(logsDir, 'rejections.log'), format: fileFormat }),
    ],
});

// Log to console in non-production by default
if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({ format: consoleFormat }));
}

module.exports = logger;

