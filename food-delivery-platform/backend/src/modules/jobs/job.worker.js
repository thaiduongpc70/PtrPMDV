import { logger } from '../../shared/observability/logger.js';
import { runBackgroundJobs } from './job.service.js';

export function startJobWorker({ intervalMs = 30_000 } = {}) {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const completed = await runBackgroundJobs();
      if (completed.length) logger.info('background.jobs.completed', { jobIds: completed });
    } catch (error) {
      logger.error('background.jobs.failed', { error: error.message });
    } finally {
      running = false;
    }
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
