/** Từ khoá tìm kiếm của các danh sách quản trị: chấp nhận ?search=, ?keyword= hoặc ?q= (cũ); chuỗi rỗng = không lọc. Cắt tối đa 200 ký tự. */
export function readSearchTerm(query) {
  for (const key of ['search', 'keyword', 'q']) {
    const value = query?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 200);
  }
  return null;
}
