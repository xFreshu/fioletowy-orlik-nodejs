import { Request, Response } from 'express';
import logger from '../config/logger.js';
import { TwitchApiError } from '../types/types.js';

export const errorHandler = (err: Error, req: Request, res: Response) => {
    logger.error(err.stack);

    if (err instanceof TwitchApiError) {
        return res.status(err.status || 500).json({ message: err.message });
    }

    return res.status(500).json({ message: 'Something went wrong on the server' });
};
