import { auditLogService } from '../../modules/audit/audit.service.js';

const sensitiveQueryKeys = new Set([
  'password',
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'api_key'
]);

export function requestAuditMiddleware(req, res, next) {
  if (req.path === '/health') {
    next();
    return;
  }

  const startedAt = Date.now();

  res.on('finish', () => {
    const elapsedMs = Date.now() - startedAt;
    const auditInfo = getAuditInfo(req);

    auditLogService.write({
      userId: getUserId(req),
      action: auditInfo.action,
      entityType: auditInfo.entityType,
      entityId: req.auditEntityId ?? auditInfo.entityId,
      oldValuesJson: req.auditOldValues ?? null,
      newValuesJson: {
        method: req.method,
        path: req.path,
        query: getSafeQuery(req.query),
        statusCode: res.statusCode,
        elapsedMs,
        ...(req.auditNewValues !== undefined
          ? { changes: req.auditNewValues }
          : {})
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    }).catch(error => {
      console.warn('Could not write audit log:', error.message);
    });
  });

  next();
}

function getAuditInfo(req) {
  const method = req.method.toUpperCase();

  const menuMatch = req.path.match(/^\/api\/catalog\/restaurants\/(\d+)\/menu\/?$/i);
  if (method === 'GET' && menuMatch) {
    return {
      action: 'CATALOG_MENU_VIEW',
      entityType: 'RESTAURANT',
      entityId: Number(menuMatch[1])
    };
  }

  const detailMatch = req.path.match(/^\/api\/catalog\/restaurants\/(\d+)\/?$/i);
  if (method === 'GET' && detailMatch) {
    return {
      action: 'RESTAURANT_DETAIL_VIEW',
      entityType: 'RESTAURANT',
      entityId: Number(detailMatch[1])
    };
  }

  if (method === 'GET' && req.path === '/api/catalog/restaurants') {
    return {
      action: 'RESTAURANT_SEARCH',
      entityType: 'RESTAURANT',
      entityId: null
    };
  }

  const addressDefaultMatch = req.path.match(
    /^\/api\/customer\/addresses\/(\d+)\/default\/?$/i
  );
  if (method === 'POST' && addressDefaultMatch) {
    return {
      action: 'CUSTOMER_ADDRESS_SET_DEFAULT',
      entityType: 'CUSTOMER_ADDRESS',
      entityId: Number(addressDefaultMatch[1])
    };
  }

  const addressMatch = req.path.match(/^\/api\/customer\/addresses\/(\d+)\/?$/i);
  if (method === 'GET' && addressMatch) {
    return {
      action: 'CUSTOMER_ADDRESS_VIEW',
      entityType: 'CUSTOMER_ADDRESS',
      entityId: Number(addressMatch[1])
    };
  }

  if (method === 'PATCH' && addressMatch) {
    return {
      action: 'CUSTOMER_ADDRESS_UPDATE',
      entityType: 'CUSTOMER_ADDRESS',
      entityId: Number(addressMatch[1])
    };
  }

  if (method === 'DELETE' && addressMatch) {
    return {
      action: 'CUSTOMER_ADDRESS_DELETE',
      entityType: 'CUSTOMER_ADDRESS',
      entityId: Number(addressMatch[1])
    };
  }

  if (req.path === '/api/customer/addresses') {
    if (method === 'GET') {
      return {
        action: 'CUSTOMER_ADDRESS_LIST',
        entityType: 'CUSTOMER_ADDRESS',
        entityId: null
      };
    }

    if (method === 'POST') {
      return {
        action: 'CUSTOMER_ADDRESS_CREATE',
        entityType: 'CUSTOMER_ADDRESS',
        entityId: req.auditEntityId ?? null
      };
    }
  }

  if (method === 'POST' && req.path === '/api/auth/register/customer') {
    return {
      action: 'CUSTOMER_REGISTER',
      entityType: 'USER',
      entityId: req.auditEntityId ?? null
    };
  }

  if (method === 'POST' && req.path === '/api/auth/login') {
    return {
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: req.auditEntityId ?? null
    };
  }

  if (method === 'POST' && req.path === '/api/auth/refresh') {
    return {
      action: 'TOKEN_REFRESH',
      entityType: 'USER',
      entityId: req.auditEntityId ?? null
    };
  }

  if (method === 'POST' && req.path === '/api/auth/logout') {
    return {
      action: 'USER_LOGOUT',
      entityType: 'USER',
      entityId: getUserId(req)
    };
  }

  if (method === 'GET' && req.path === '/api/auth/me') {
    return {
      action: 'CURRENT_USER_VIEW',
      entityType: 'USER',
      entityId: getUserId(req)
    };
  }

  return {
    action: `${method}_REQUEST`,
    entityType: 'HTTP_REQUEST',
    entityId: null
  };
}

function getUserId(req) {
  const rawValue = req.auditUserId ?? req.user?.id ?? req.user?.userId;
  const userId = Number(rawValue);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function getSafeQuery(query) {
  return Object.fromEntries(
    Object.entries(query).map(([key, value]) => [
      key,
      sensitiveQueryKeys.has(key.toLowerCase()) ? '***' : value
    ])
  );
}
