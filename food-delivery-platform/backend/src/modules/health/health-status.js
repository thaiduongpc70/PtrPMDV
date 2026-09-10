const serviceName = 'food-delivery-api';

export function createHealthStatus({
  checkDatabase,
  now = () => new Date(),
  uptime = () => process.uptime()
}) {
  return {
    liveness() {
      return basePayload('ok', now, uptime);
    },

    async readiness() {
      const database = await checkDatabase();

      return {
        ...basePayload('ready', now, uptime),
        checks: {
          database: {
            status: 'up',
            latencyMs: Math.round(database.latencyMs * 100) / 100
          }
        }
      };
    },

    notReady() {
      return {
        ...basePayload('not_ready', now, uptime),
        checks: {
          database: { status: 'down' }
        }
      };
    }
  };
}

function basePayload(status, now, uptime) {
  return {
    status,
    service: serviceName,
    timestamp: now().toISOString(),
    uptimeSeconds: Math.floor(uptime())
  };
}
