import { createApp } from './app.js';
import { env } from './shared/config/env.js';
import { closePool } from './shared/database/mysql.js';
import { createGracefulShutdown } from './shared/lifecycle/graceful-shutdown.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`Food Delivery API is running on port ${env.port}`);
});

const shutdown = createGracefulShutdown({
  server,
  closeResources: closePool,
  timeoutMs: env.shutdownTimeoutMs
});

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});
process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.once('unhandledRejection', error => {
  console.error('Unhandled promise rejection', error);
  void shutdown('UNHANDLED_REJECTION', 1);
});
process.once('uncaughtException', error => {
  console.error('Uncaught exception', error);
  void shutdown('UNCAUGHT_EXCEPTION', 1);
});
