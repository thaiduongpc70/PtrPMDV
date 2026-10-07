import { Router } from 'express';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { query } from '../../shared/database/mysql.js';
import { requireAuth, requireRole } from '../../shared/middlewares/require-auth.middleware.js';
import { requirePermission } from '../../shared/middlewares/require-permission.middleware.js';

export const settingsRoutes = Router();
settingsRoutes.use(requireAuth, requireRole('ADMIN'), requirePermission('system.manage'));

settingsRoutes.get('/', asyncHandler(async (_req, res) => {
  const rows = await query('SELECT setting_key, setting_value, description, updated_at FROM system_settings ORDER BY setting_key');
  res.json({ items: rows.map(row => ({ key: row.setting_key, value: row.setting_value, description: row.description, updatedAt: row.updated_at })) });
}));

settingsRoutes.put('/:key', asyncHandler(async (req, res) => {
  const key = String(req.params.key ?? '').trim();
  const value = String(req.body?.value ?? '').trim();
  if (!/^[a-z0-9_.-]{2,100}$/i.test(key) || value.length > 500) {
    res.status(400).json({ message: 'Invalid setting key or value' });
    return;
  }
  await query(
    `INSERT INTO system_settings (setting_key, setting_value, description)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), description = VALUES(description)`,
    [key, value, req.body?.description ?? null]
  );
  req.auditAction = 'SYSTEM_SETTING_UPDATE';
  req.auditEntityType = 'SYSTEM_SETTING';
  req.auditEntityId = key;
  res.json({ key, value });
}));
