import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ErrorBox, formatDate, Spinner } from "../components/Layout";
import { Pagination } from "../components/Pagination";
import { usePostList } from "../hooks/usePosts";

export function PostListPage() {
  // 페이지·검색어를 URL 에 두면 새로고침이나 뒤로가기에도 목록 위치가 유지된다.
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? 1);
  const q = params.get("q") ?? "";
  const [draft, setDraft] = useState(q);

  const { data, isPending, isError, error } = usePostList(page, q);

  function search(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams();
    if (draft.trim()) next.set("q", draft.trim());
    setParams(next); // 검색하면 1페이지부터 다시 본다.
  }

  function goPage(p: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(p));
    setParams(next);
  }

  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <form onSubmit={search} className="flex flex-1 gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="제목 또는 내용 검색"
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
          <button
            type="submit"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
          >
            검색
          </button>
        </form>
        <Link
          to="/write"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          글쓰기
        </Link>
      </div>

      {q && (
        <p className="mb-4 text-sm text-slate-500">
          "{q}" 검색 결과 {data?.total ?? 0}건
        </p>
      )}

      {isPending && <Spinner />}
      {isError && (
        <ErrorBox message={error instanceof Error ? error.message : "목록을 불러오지 못했습니다."} />
      )}

      {data && data.items.length === 0 && (
        <p className="py-16 text-center text-sm text-slate-400">
          {q ? "검색 결과가 없습니다." : "아직 글이 없습니다. 첫 글을 써보세요."}
        </p>
      )}

      <ul className="space-y-3">
        {data?.items.map((post) => (
          <li key={post.id}>
            <Link
              to={`/posts/${post.id}`}
              className="flex gap-4 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-400"
            >
              {post.thumbnail && (
                <img
                  src={post.thumbnail}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-md object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="truncate font-medium">{post.title}</h2>
                  {post.comment_count > 0 && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      댓글 {post.comment_count}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  {post.author} · {formatDate(post.created_at)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {data && (
        <Pagination
          page={data.page}
          size={data.size}
          total={data.total}
          onChange={goPage}
        />
      )}
    </>
  );
}
