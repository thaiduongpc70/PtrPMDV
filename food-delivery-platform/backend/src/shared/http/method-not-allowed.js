import { HttpError } from './http-error.js';

/** Middleware cho đường dẫn CÓ nhưng gọi sai phương thức: trả 405 tiếng Việt + header Allow. Đặt SAU các route hợp lệ: router.all('/', methodNotAllowed(['GET', 'PATCH'])). */
export function methodNotAllowed(allowed) {
  const list = [...new Set(allowed.map(method => method.toUpperCase()))];
  return (req, res, next) => {
    if (list.includes(req.method.toUpperCase())) { next(); return; }
    res.setHeader('Allow', list.join(', '));
    next(new HttpError(405, `Phương thức ${req.method} không được hỗ trợ cho đường dẫn này; dùng: ${list.join(', ')}`));
  };
}
