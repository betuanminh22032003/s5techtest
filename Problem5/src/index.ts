import 'reflect-metadata';
import createApp from './app';
import config from './config';
import { initializeDatabase } from './database';

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    // Initialize database first
    await initializeDatabase();

    const app = createApp();

    app.listen(config.port, () => {
      console.log('🚀 Server Configuration:');
      console.log(`   Environment: ${config.nodeEnv}`);
      console.log(`   Port: ${config.port}`);
      console.log(`   API Prefix: ${config.apiPrefix}`);
      console.log(`   Database: ${config.databasePath}`);
      console.log('');
      console.log(`📡 Server running at http://localhost:${config.port}`);
      console.log(`📋 API available at http://localhost:${config.port}${config.apiPrefix}`);
      console.log(`🌐 UI available at http://localhost:${config.port}`);
      console.log(`❤️  Health check at http://localhost:${config.port}${config.apiPrefix}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();
