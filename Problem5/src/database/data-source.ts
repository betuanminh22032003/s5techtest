import 'reflect-metadata';
import { DataSource } from 'typeorm';
import path from 'path';
import fs from 'fs';
import config from '../config';
import { Resource } from '../entities/resource.entity';

// Ensure data directory exists
const dataDir = path.dirname(config.databasePath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: config.databasePath,
  synchronize: true, // Auto-sync schema in development
  logging: config.isDevelopment,
  entities: [Resource],
  migrations: [],
  subscribers: [],
});

/**
 * Initialize the database connection
 */
export async function initializeDatabase(): Promise<DataSource> {
  try {
    await AppDataSource.initialize();
    console.log('📦 Database connected successfully');
    return AppDataSource;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}
