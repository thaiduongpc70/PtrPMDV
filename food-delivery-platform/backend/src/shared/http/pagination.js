export function readPagination(query, maxPageSize = 50) {
  const pageNumber = readPositiveInteger(query.pageNumber, 1);
  const requestedPageSize = readPositiveInteger(query.pageSize, 20);
  const pageSize = Math.min(requestedPageSize, maxPageSize);

  return {
    pageNumber,
    pageSize,
    offset: (pageNumber - 1) * pageSize
  };
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

function readPositiveInteger(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
