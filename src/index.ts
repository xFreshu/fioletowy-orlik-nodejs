import express, { Application } from 'express';
import dotenv from 'dotenv';
import logger from './config/logger.js';
import { getConfig } from './config/index.js';
import twitchRoutes from './routes/twitchRoutes.js';
import kickRoutes from './routes/kickRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

function bootstrap() {
    const app: Application = express();
    const config = getConfig(); // Get the config on startup

    logger.level = config.logLevel;

    app.use(express.json());

    // Swagger UI - only in development
    if (process.env.NODE_ENV !== 'production') {
        const swaggerFilePath = path.resolve(__dirname, '../swagger-output.json');
        if (fs.existsSync(swaggerFilePath)) {
            const swaggerFile = JSON.parse(fs.readFileSync(swaggerFilePath, 'utf-8'));
            app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));
            logger.info(`Swagger UI is available at http://localhost:${PORT}/api-docs`);
        } else {
            logger.warn('swagger-output.json not found. Run "npm run swagger-gen" to generate it.');
        }
    }

    app.use('/api/twitch', twitchRoutes);
    app.use('/api/kick', kickRoutes);

    app.use(errorHandler);

    app.listen(PORT, () => {
        console.log('!!! TEST: Serwer nasłuchuje. Kod dotarł do tego miejsca. !!!');
        logger.info(`Server is running on port ${PORT}`);
        logger.info(`Access all Twitch streamer data at http://localhost:${PORT}/api/twitch/streamers`);
        logger.info(`Access live Twitch streamer data at http://localhost:${PORT}/api/twitch/live-streamers`);
        logger.info(`Access all Kick streamer data at http://localhost:${PORT}/api/kick/streamers`);
        logger.info(`Access live Kick streamer data at http://localhost:${PORT}/api/kick/live-streamers`);
    });
}

bootstrap();