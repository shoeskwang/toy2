interface Props {
  page: number;
  size: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, size, total, onChange }: Props) {
  const lastPage = Math.max(1, Math.ceil(total / size));
  if (lastPage <= 1) return null;

  // 현재 페이지 주변 5개만 보여준다. 끝에 붙어도 항상 5칸을 유지한다.
  const start = Math.max(1, Math.min(page - 2, lastPage - 4));
  const pages = Array.from({ length: Math.min(5, lastPage) }, (_, i) => start + i);

  const btn =
    "min-w-9 rounded-md border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5">
      <button
        className={`${btn} border-slate-200 bg-white hover:bg-slate-50`}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        이전
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          aria-current={p === page ? "page" : undefined}
          className={
            p === page
              ? `${btn} border-slate-900 bg-slate-900 font-medium text-white`
              : `${btn} border-slate-200 bg-white hover:bg-slate-50`
          }
        >
          {p}
        </button>
      ))}
      <button
        className={`${btn} border-slate-200 bg-white hover:bg-slate-50`}
        onClick={() => onChange(page + 1)}
        disabled={page >= lastPage}
      >
        다음
      </button>
    </nav>
  );
}
