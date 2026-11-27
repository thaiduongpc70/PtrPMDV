import { logger } from '../../shared/observability/logger.js';
import { runBackgroundJobs } from './job.service.js';
import { cancelExpiredPendingOrders } from '../orders/order-cancellation.js';
import { sweepStaleOrders } from './order-sweeper.js';
import { alertStaleRefunds, approveStaleRefunds } from './refund-sweeper.js';

export function startJobWorker({ intervalMs = 30_000 } = {}) {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const completed = await runBackgroundJobs();
      if (completed.length) logger.info('background.jobs.completed', { jobIds: completed });
      await cancelExpiredPendingOrders();
      await sweepStaleOrders();
      await alertStaleRefunds();
      await approveStaleRefunds();
    } catch (error) {
      logger.error('background.jobs.failed', { error: error.message });
    } finally {
      running = false;
    }
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
