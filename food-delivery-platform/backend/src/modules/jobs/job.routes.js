import { Router } from 'express';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { requireAuth, requireRole } from '../../shared/middlewares/require-auth.middleware.js';
import { requirePermission } from '../../shared/middlewares/require-permission.middleware.js';
import {
  createExport,
  enqueueJob,
  getExportJob,
  getImportJob,
  importData,
  listBackgroundJobs,
  listExportJobs,
  listImportJobs,
  runBackgroundJobs
} from './job.service.js';

export const jobRoutes = Router();
jobRoutes.use(requireAuth);

jobRoutes.post('/imports', requireRole('ADMIN', 'RESTAURANT'), requirePermission('menu.create'), asyncHandler(async (req, res) => {
  const result = await importData({
    userId: req.user.id,
    jobType: req.body?.jobType,
    fileName: req.body?.fileName,
    content: req.body?.content,
    format: req.body?.format
  });
  req.auditUserId = req.user.id;
  req.auditAction = 'IMPORT_JOB_CREATE';
  req.auditEntityType = 'IMPORT_JOB';
  req.auditEntityId = result.id;
  res.status(201).json(result);
}));

jobRoutes.get('/imports', requirePermission('report.view'), asyncHandler(async (req, res) => {
  const items = await listImportJobs(req.user.role === 'ADMIN' ? null : req.user.id);
  res.json({ items, totalItems: items.length });
}));

jobRoutes.get('/imports/:jobId', requirePermission('report.view'), asyncHandler(async (req, res) => {
  res.json(await getImportJob(Number(req.params.jobId), req.user.role === 'ADMIN' ? null : req.user.id));
}));

jobRoutes.post('/exports', requirePermission('report.export'), asyncHandler(async (req, res) => {
  const result = await createExport({
    userId: req.user.id,
    exportType: req.body?.exportType,
    format: req.body?.format,
    filters: req.body?.filters
  });
  req.auditAction = 'EXPORT_JOB_CREATE';
  req.auditEntityType = 'EXPORT_JOB';
  req.auditEntityId = result.id;
  res.status(201).json(result);
}));

jobRoutes.get('/exports', requirePermission('report.view'), asyncHandler(async (req, res) => {
  const items = await listExportJobs(req.user.role === 'ADMIN' ? null : req.user.id);
  res.json({ items, totalItems: items.length });
}));

jobRoutes.get('/exports/:jobId', requirePermission('report.view'), asyncHandler(async (req, res) => {
  res.json(await getExportJob(Number(req.params.jobId), req.user.role === 'ADMIN' ? null : req.user.id));
}));

jobRoutes.get('/background', requireRole('ADMIN'), requirePermission('report.view'), asyncHandler(async (_req, res) => {
  const items = await listBackgroundJobs();
  res.json({ items, totalItems: items.length });
}));

jobRoutes.post('/background', requireRole('ADMIN'), requirePermission('report.export'), asyncHandler(async (req, res) => {
  const result = await enqueueJob(req.body?.jobType, req.body?.payload, req.body?.scheduledAt);
  res.status(201).json(result);
}));

jobRoutes.post('/background/run', requireRole('ADMIN'), requirePermission('report.export'), asyncHandler(async (_req, res) => {
  res.json({ completedJobIds: await runBackgroundJobs() });
}));
