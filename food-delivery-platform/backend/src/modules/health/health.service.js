import { checkDatabaseConnection } from '../../shared/database/mysql.js';
import { createHealthStatus } from './health-status.js';

export const healthService = createHealthStatus({
  checkDatabase: checkDatabaseConnection
});
