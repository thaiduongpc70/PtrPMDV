import { readPagination, toPagedResponse } from '../../shared/http/pagination.js';
import { auditLogRepository } from './audit.repository.js';

export const auditLogService = {
  async write(input) {
    await auditLogRepository.add({
      userId: normalizePositiveInteger(input.userId),
      action: trimRequired(input.action, 100),
      entityType: trimRequired(input.entityType, 100),
      entityId: normalizePositiveInteger(input.entityId),
      oldValuesJson: normalizeJson(input.oldValuesJson),
      newValuesJson: normalizeJson(input.newValuesJson),
      ipAddress: trimOptional(input.ipAddress, 45),
      userAgent: trimOptional(input.userAgent, 1000)
    });
  },

  async search(query) {
    const pagination = readPagination(query, 100);

    const filters = {
      userId: normalizePositiveInteger(query.userId),
      action: trimOptional(query.action, 100),
      entityType: trimOptional(query.entityType, 100),
      from: trimOptional(query.from, 30),
      to: trimOptional(query.to, 30),
      pageNumber: pagination.pageNumber,
      pageSize: pagination.pageSize,
      offset: pagination.offset
    };

    const result = await auditLogRepository.search(filters);
    return toPagedResponse(
      result.items,
      pagination.pageNumber,
      pagination.pageSize,
      result.totalItems
    );
  }
};

function normalizePositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function trimRequired(value, maxLength) {
  const trimmed = trimOptional(value, maxLength);

  if (!trimmed) {
    throw new Error('Audit log value is required.');
  }

  return trimmed;
}

function trimOptional(value, maxLength) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function normalizeJson(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return JSON.stringify(value);
  }

  try {
    JSON.parse(value);
    return value;
  } catch {
    return JSON.stringify(value);
  }
}
