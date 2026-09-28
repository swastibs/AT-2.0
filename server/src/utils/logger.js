const winston = require('winston');
const fs = require('fs');
const path = require('path');

const logDir = path.resolve(process.cwd(), 'logs');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, stack }) => {
          const base = `${timestamp} [${level}] ${message}`;
          return stack ? `${base}\n${stack}` : base;
        })
      ),
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
    }),
  ],
});

module.exports = logger;
