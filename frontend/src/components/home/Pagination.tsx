/**
 * 首页文章列表分页器
 */

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  return (
    <>
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-1.5 animate-fade-in">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 bg-card border border-border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-all text-sm font-medium"
          >
            上一页
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-3 py-1.5 rounded-lg transition-all text-sm font-medium ${
                    page === pageNum
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                      : 'bg-card border border-border hover:bg-muted'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 bg-card border border-border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-all text-sm font-medium"
          >
            下一页
          </button>
        </div>
      )}

      <div className="mt-3 text-center text-xs text-muted-foreground">
        第 {page} 页，共 {totalPages} 页
      </div>
    </>
  );
}