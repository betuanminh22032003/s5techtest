import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  databasePath: string;
  apiPrefix: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databasePath: process.env.DATABASE_PATH || './data/database.sqlite',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  get isDevelopment() {
    return this.nodeEnv === 'development';
  },
  get isProduction() {
    return this.nodeEnv === 'production';
  },
};

// Resolve database path to absolute
config.databasePath = path.resolve(config.databasePath);

export default config;
