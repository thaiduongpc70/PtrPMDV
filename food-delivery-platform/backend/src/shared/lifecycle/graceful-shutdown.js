export function createGracefulShutdown({
  server,
  closeResources,
  timeoutMs,
  logger = console,
  exit = code => process.exit(code)
}) {
  let shutdownPromise = null;

  return function shutdown(reason, requestedExitCode = 0) {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    shutdownPromise = runShutdown({
      server,
      closeResources,
      timeoutMs,
      logger,
      exit,
      reason,
      requestedExitCode
    });
    return shutdownPromise;
  };
}

async function runShutdown({
  server,
  closeResources,
  timeoutMs,
  logger,
  exit,
  reason,
  requestedExitCode
}) {
  logger.info(`Shutting down Food Delivery API (${reason})`);

  const forceTimer = setTimeout(() => {
    logger.error(`Graceful shutdown exceeded ${timeoutMs}ms`);
    exit(1);
  }, timeoutMs);
  forceTimer.unref?.();

  try {
    await closeHttpServer(server);
    await closeResources();
    clearTimeout(forceTimer);
    logger.info('Food Delivery API stopped');
    exit(requestedExitCode);
  } catch (error) {
    clearTimeout(forceTimer);
    logger.error('Could not shut down cleanly', error);
    exit(1);
  }
}

function closeHttpServer(server) {
  return new Promise((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
    server.closeIdleConnections?.();
  });
}
