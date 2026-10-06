import { useState, useMemo } from 'react';

export function usePagination(data = [], initialPageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  const currentData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);

  const goToPage = (page) => {
    const target = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(target);
  };

  return {
    currentPage,
    pageSize,
    totalPages,
    totalItems: data.length,
    currentData,
    goToPage,
    nextPage: () => goToPage(currentPage + 1),
    prevPage: () => goToPage(currentPage - 1),
    setPageSize: (size) => {
      setPageSize(size);
      setCurrentPage(1);
    },
  };
}

export default usePagination;
