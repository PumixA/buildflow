export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function paginate<T>(
  items: T[],
  page?: string,
  limit?: string,
  maxLimit = 100,
  defaultLimit = 20
): PaginatedResult<T> {
  const p = Math.max(1, parseInt(page || '1', 10) || 1);
  const l = Math.min(maxLimit, Math.max(1, parseInt(limit || String(defaultLimit), 10) || defaultLimit));
  const start = (p - 1) * l;
  return {
    items: items.slice(start, start + l),
    total: items.length,
    page: p,
    limit: l,
    totalPages: Math.ceil(items.length / l)
  };
}
