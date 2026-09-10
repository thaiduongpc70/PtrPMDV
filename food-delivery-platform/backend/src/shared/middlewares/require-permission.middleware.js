import { query } from '../database/mysql.js';
import { HttpError } from '../http/http-error.js';

export function requirePermission(...permissionCodes) {
  const requiredCodes = [...new Set(permissionCodes)];

  return async (req, res, next) => {
    if (!req.user?.id) {
      next(new HttpError(401, 'Authentication required'));
      return;
    }

    if (requiredCodes.length === 0) {
      next();
      return;
    }

    try {
      const placeholders = requiredCodes.map(() => '?').join(', ');
      const rows = await query(
        `
          SELECT COUNT(DISTINCT p.code) AS granted_count
          FROM users u
          INNER JOIN role_permissions rp
            ON rp.role_id = u.role_id
          INNER JOIN permissions p
            ON p.id = rp.permission_id
          WHERE u.id = ?
            AND u.status = 'ACTIVE'
            AND u.deleted_at IS NULL
            AND p.code IN (${placeholders})
        `,
        [req.user.id, ...requiredCodes]
      );

      if (Number(rows[0]?.granted_count ?? 0) !== requiredCodes.length) {
        next(new HttpError(403, 'Permission denied'));
        return;
      }

      req.user.permissions = [
        ...new Set([...(req.user.permissions ?? []), ...requiredCodes])
      ];
      next();
    } catch (error) {
      next(error);
    }
  };
}
