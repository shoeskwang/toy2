import { Link, useNavigate, useParams } from "react-router";
import { CommentSection } from "../components/CommentSection";
import { ErrorBox, formatDate, Spinner } from "../components/Layout";
import { useDeletePost, usePost } from "../hooks/usePosts";

export function PostDetailPage() {
  const { id } = useParams();
  const postId = Number(id);
  const navigate = useNavigate();
  const { data: post, isPending, isError, error } = usePost(postId);
  const remove = useDeletePost();

  function handleDelete() {
    if (!confirm("이 글을 삭제할까요? 댓글과 이미지도 함께 사라집니다.")) return;
    remove.mutate(postId, { onSuccess: () => navigate("/") });
  }

  if (isPending) return <Spinner />;
  if (isError) {
    return (
      <ErrorBox message={error instanceof Error ? error.message : "글을 불러오지 못했습니다."} />
    );
  }

  return (
    <article>
      <Link to="/" className="text-sm text-slate-400 hover:text-slate-700">
        ← 목록
      </Link>

      <header className="mt-4 border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">{post.title}</h1>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-400">
            {post.author} · {formatDate(post.created_at)}
          </p>
          <div className="flex gap-2">
            <Link
              to={`/posts/${post.id}/edit`}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              수정
            </Link>
            <button
              onClick={handleDelete}
              disabled={remove.isPending}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              삭제
            </button>
          </div>
        </div>
      </header>

      <p className="mt-6 whitespace-pre-wrap leading-relaxed">{post.content}</p>

      {post.images.length > 0 && (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {post.images.map((img) => (
            <li key={img.id}>
              <a href={img.url} target="_blank" rel="noreferrer">
                <img
                  src={img.url}
                  alt={img.original_name}
                  className="h-40 w-full rounded-lg border border-slate-200 object-cover transition hover:opacity-90"
                />
              </a>
            </li>
          ))}
        </ul>
      )}

      {remove.isError && (
        <div className="mt-4">
          <ErrorBox
            message={remove.error instanceof Error ? remove.error.message : "삭제 실패"}
          />
        </div>
      )}

      <CommentSection postId={post.id} comments={post.comments} />
    </article>
  );
}
