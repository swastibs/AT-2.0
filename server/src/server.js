const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { connectMongo } = require('./db/mongoose');

let server;

async function startServer() {
  try {
    await connectMongo();
    server = http.createServer(app);
    server.listen(config.PORT, () => {
      logger.info(`AtomicTask auth server listening on port ${config.PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

const gracefulShutdown = async (signal) => {
  logger.warn(`Received ${signal}, shutting down gracefully`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      await mongoose.disconnect();
      process.exit(0);
    });
  } else {
    await mongoose.disconnect();
    process.exit(0);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();

module.exports = { startServer, gracefulShutdown };
