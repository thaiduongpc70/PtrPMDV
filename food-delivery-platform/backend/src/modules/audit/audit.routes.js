import { Router } from 'express';
import { searchAuditLogs } from './audit.controller.js';

export const auditLogRoutes = Router();

auditLogRoutes.get('/', searchAuditLogs);
