import { asyncHandler } from '../../shared/http/async-handler.js';
import { auditLogService } from './audit.service.js';

export const searchAuditLogs = asyncHandler(async (req, res) => {
  const logs = await auditLogService.search(req.query);
  res.json(logs);
});
