const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../utils/logger');

const connectMongo = async () => {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });
    logger.info('MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    logger.error('MongoDB connection failed', { error: error.message });
    throw error;
  }
};

module.exports = { connectMongo };
