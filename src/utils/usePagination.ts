import { useEffect, useMemo, useState } from "react";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Client-side paging for the app's data tables — the last step after
// useSearch -> useSortable: pass it the sorted rows, render `pageRows`,
// and drop a <Pagination {...pagination} /> under the table. Jumps back
// to page 1 whenever the row count changes (new search/filter), so a
// narrowed result is never hidden on a page past the end.
export function usePagination<T>(data: T[], initialPageSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const pageCount = Math.max(1, Math.ceil(data.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [data.length]);

  const safePage = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => data.slice((safePage - 1) * pageSize, safePage * pageSize),
    [data, safePage, pageSize]
  );

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  return {
    pageRows,
    page: safePage,
    pageCount,
    pageSize,
    total: data.length,
    setPage,
    setPageSize,
  };
}

export type PaginationState = Omit<ReturnType<typeof usePagination<any>>, "pageRows">;
