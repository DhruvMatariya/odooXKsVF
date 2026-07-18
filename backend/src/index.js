import app from './app.js';
import env from './config/env.js';
import { connectDatabase } from './config/db.js';
import { logger } from './utils/logger.js';

const PORT = env.PORT || 5001;

const startServer = async () => {
    try {
        await connectDatabase();
        app.listen(PORT, () => {
            logger.info(`Auth service is running on port ${PORT}`);
            logger.info(`http://localhost:${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to start server', { error: err.message });
        process.exit(1);
    }
};

startServer();