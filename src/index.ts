import express, { Application } from 'express';
import logger from './config/logger.js';
import twitchRoutes from './routes/twitchRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { getConfig } from './config/index.js';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

function bootstrap() {
    const app: Application = express();
    const config = getConfig();

    logger.level = config.logLevel;

    app.use(express.json());

    // Swagger UI - only in development
    if (process.env.NODE_ENV !== 'production') {
                const swaggerFile = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../swagger-output.json'), 'utf-8'));
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));
        logger.info('Swagger UI is available at http://localhost:3000/api-docs');
    }

    app.use('/api', twitchRoutes);

    app.use(errorHandler);

    app.listen(PORT, () => {
        logger.info(`Server is running on port ${PORT}`);
        logger.info(`Access all streamer data at http://localhost:${PORT}/api/twitchStreamers`);
        logger.info(`Access live streamer data at http://localhost:${PORT}/api/liveStreamers`);
    });
}

bootstrap();
