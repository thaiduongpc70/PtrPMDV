import { HttpError } from './http-error.js';

const present = value => value !== undefined && value !== null && value !== '';

/** Đọc một số nguyên dương từ tham số; có mặt mà không phải số nguyên >= min thì 400 tiếng Việt. */
function readIntParam(value, name, { fallback, min = 1, max = null }) {
  if (!present(value)) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) throw new HttpError(400, `Tham số ${name} không hợp lệ: phải là số nguyên từ ${min} trở lên`);
  if (max !== null && parsed > max) throw new HttpError(400, `Tham số ${name} vượt giá trị tối đa ${max}`);
  return parsed;
}

/** Phân trang theo trang: nhận page|pageNumber (hoặc offset) và pageSize|limit; sai/0/âm/chữ/vượt tối đa -> 400. Mặc định trang 1, 20 dòng. */
export function readPagination(query, maxPageSize = 50, defaultPageSize = 20) {
  const pageSize = readIntParam(query.pageSize ?? query.limit, 'pageSize', { fallback: Math.min(defaultPageSize, maxPageSize), max: maxPageSize });
  const explicitPage = present(query.pageNumber) || present(query.page);
  // offset (kiểu limit/offset) được chấp nhận khi KHÔNG có page: trang suy ra = floor(offset / pageSize) + 1
  if (!explicitPage && present(query.offset)) {
    const offset = readIntParam(query.offset, 'offset', { fallback: 0, min: 0 });
    return { pageNumber: Math.floor(offset / pageSize) + 1, pageSize, offset };
  }
  const pageNumber = readIntParam(query.pageNumber ?? query.page, 'page', { fallback: 1 });
  return { pageNumber, pageSize, offset: (pageNumber - 1) * pageSize };
}

export function toPagedResponse(items, pageNumber, pageSize, totalItems) {
  return {
    items,
    pageNumber,
    pageSize,
    totalItems,
    totalPages: pageSize <= 0 ? 0 : Math.ceil(totalItems / pageSize)
  };
}

/** Trường phân trang chuẩn cho danh sách: { totalItems, page, pageSize, totalPages, pagination: {page,pageSize,totalItems,totalPages} } (giữ tương thích totalItems/page/pageSize ở cấp trên). */
export function pagedMeta(page, pageSize, totalItems) {
  const totalPages = pageSize > 0 ? Math.ceil(totalItems / pageSize) : 0;
  return { totalItems, page, pageSize, totalPages, pagination: { page, pageSize, totalItems, totalPages } };
}

/** Phân trang kiểu limit/offset: limit mặc định 20, tối đa maxLimit (vượt -> 400); offset mặc định 0, >= 0. */
export function readLimitOffset(query, maxLimit = 100) {
  const limit = readIntParam(query.limit, 'limit', { fallback: 20, max: maxLimit });
  const offset = readIntParam(query.offset, 'offset', { fallback: 0, min: 0 });
  return { limit, offset };
}
