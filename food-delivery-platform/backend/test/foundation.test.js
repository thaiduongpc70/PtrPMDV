import assert from 'node:assert/strict';
import test from 'node:test';
import { createHealthStatus } from '../src/modules/health/health-status.js';
import { errorHandler } from '../src/shared/http/error-handler.js';
import { HttpError } from '../src/shared/http/http-error.js';
import { createGracefulShutdown } from '../src/shared/lifecycle/graceful-shutdown.js';

test('liveness payload reports service identity and uptime', () => {
  const health = createHealthStatus({
    checkDatabase: async () => ({ latencyMs: 1 }),
    now: () => new Date('2026-09-09T14:00:00.000Z'),
    uptime: () => 12.9
  });

  assert.deepEqual(health.liveness(), {
    status: 'ok',
    service: 'food-delivery-api',
    timestamp: '2026-09-09T14:00:00.000Z',
    uptimeSeconds: 12
  });
});

test('readiness payload includes rounded database latency', async () => {
  const health = createHealthStatus({
    checkDatabase: async () => ({ latencyMs: 3.456 }),
    now: () => new Date('2026-09-09T14:00:00.000Z'),
    uptime: () => 20
  });

  const result = await health.readiness();
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.checks.database, { status: 'up', latencyMs: 3.46 });
});

test('not-ready payload does not expose database error details', () => {
  const health = createHealthStatus({
    checkDatabase: async () => ({ latencyMs: 1 }),
    now: () => new Date('2026-09-09T14:00:00.000Z'),
    uptime: () => 30
  });

  assert.deepEqual(health.notReady().checks.database, { status: 'down' });
});

test('graceful shutdown closes HTTP server and resources once', async () => {
  const events = [];
  const server = createServer(events);
  const exitCodes = [];
  const shutdown = createGracefulShutdown({
    server,
    closeResources: async () => events.push('resources:close'),
    timeoutMs: 1000,
    logger: createLogger(events),
    exit: code => exitCodes.push(code)
  });

  await shutdown('SIGTERM');

  assert.deepEqual(events, [
    'info:Shutting down Food Delivery API (SIGTERM)',
    'server:close',
    'server:close-idle',
    'resources:close',
    'info:Food Delivery API stopped'
  ]);
  assert.deepEqual(exitCodes, [0]);
});

test('graceful shutdown is idempotent while shutdown is running', async () => {
  let finishServerClose;
  let resourceCloseCount = 0;
  const server = {
    close(callback) {
      finishServerClose = callback;
    },
    closeIdleConnections() {}
  };
  const shutdown = createGracefulShutdown({
    server,
    closeResources: async () => {
      resourceCloseCount += 1;
    },
    timeoutMs: 1000,
    logger: { info() {}, error() {} },
    exit() {}
  });

  const first = shutdown('SIGINT');
  const second = shutdown('SIGTERM');
  assert.equal(first, second);

  finishServerClose();
  await first;
  assert.equal(resourceCloseCount, 1);
});

test('graceful shutdown exits with failure when server close fails', async () => {
  let resourceClosed = false;
  const exitCodes = [];
  const server = {
    close(callback) {
      callback(new Error('close failed'));
    }
  };
  const shutdown = createGracefulShutdown({
    server,
    closeResources: async () => {
      resourceClosed = true;
    },
    timeoutMs: 1000,
    logger: { info() {}, error() {} },
    exit: code => exitCodes.push(code)
  });

  await shutdown('SIGTERM');

  assert.equal(resourceClosed, false);
  assert.deepEqual(exitCodes, [1]);
});

test('HTTP error handler maps invalid JSON to 400', () => {
  const result = handleError({ type: 'entity.parse.failed' });
  assert.deepEqual(result, {
    statusCode: 400,
    body: { message: 'Request body contains invalid JSON' }
  });
});

test('HTTP error handler maps oversized body to 413', () => {
  const result = handleError({ type: 'entity.too.large' });
  assert.deepEqual(result, {
    statusCode: 413,
    body: { message: 'Request body is too large' }
  });
});

test('HTTP error handler preserves expected application errors', () => {
  const result = handleError(new HttpError(403, 'Permission denied'));
  assert.deepEqual(result, {
    statusCode: 403,
    body: { message: 'Permission denied' }
  });
});

test('HTTP error handler hides unexpected error details', () => {
  const result = handleError(new Error('database password leaked here'));
  assert.deepEqual(result, {
    statusCode: 500,
    body: { message: 'Internal server error' }
  });
});

function createServer(events) {
  return {
    close(callback) {
      events.push('server:close');
      callback();
    },
    closeIdleConnections() {
      events.push('server:close-idle');
    }
  };
}

function createLogger(events) {
  return {
    info(message) {
      events.push(`info:${message}`);
    },
    error(message) {
      events.push(`error:${message}`);
    }
  };
}

function handleError(error) {
  const result = { statusCode: null, body: null };
  const response = {
    headersSent: false,
    status(statusCode) {
      result.statusCode = statusCode;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    }
  };

  errorHandler(error, {}, response, () => {});
  return result;
}
