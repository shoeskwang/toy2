import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { ImageOut } from "../api/types";
import { ImageUploader } from "../components/ImageUploader";
import { ErrorBox, Spinner } from "../components/Layout";
import { useCreatePost, usePost, useUpdatePost } from "../hooks/usePosts";

export function PostFormPage() {
  const { id } = useParams();
  const isEdit = id !== undefined;
  const postId = Number(id ?? 0);
  const navigate = useNavigate();

  const existing = usePost(isEdit ? postId : 0);
  const create = useCreatePost();
  const update = useUpdatePost(postId);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<ImageOut[]>([]);

  // 수정 모드에서 원본을 받아오면 폼을 채운다.
  useEffect(() => {
    if (isEdit && existing.data) {
      setTitle(existing.data.title);
      setAuthor(existing.data.author);
      setContent(existing.data.content);
      setImages(existing.data.images);
    }
  }, [isEdit, existing.data]);

  const pending = create.isPending || update.isPending;
  const failure = create.error ?? update.error;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const image_ids = images.map((i) => i.id);

    if (isEdit) {
      update.mutate(
        { title: title.trim(), content: content.trim(), image_ids },
        { onSuccess: () => navigate(`/posts/${postId}`) },
      );
    } else {
      create.mutate(
        {
          title: title.trim(),
          content: content.trim(),
          author: author.trim(),
          image_ids,
        },
        { onSuccess: (post) => navigate(`/posts/${post.id}`) },
      );
    }
  }

  if (isEdit && existing.isPending) return <Spinner />;
  if (isEdit && existing.isError) {
    return <ErrorBox message="수정할 글을 불러오지 못했습니다." />;
  }

  const field =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900";

  return (
    <form onSubmit={submit}>
      <h1 className="mb-6 text-xl font-semibold tracking-tight">
        {isEdit ? "글 수정" : "새 글 쓰기"}
      </h1>

      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            작성자
          </span>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            // 익명 게시판이라 작성자 검증이 없다. 수정 때 바꾸면 글쓴이가 뒤바뀌므로 잠근다.
            readOnly={isEdit}
            required
            maxLength={50}
            placeholder="닉네임"
            className={isEdit ? `${field} bg-slate-100 text-slate-500` : field}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            제목
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            placeholder="제목을 입력하세요"
            className={field}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            내용
          </span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={12}
            placeholder="내용을 입력하세요"
            className={`${field} resize-y`}
          />
        </label>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            이미지
          </span>
          <ImageUploader images={images} onChange={setImages} />
        </div>
      </div>

      {failure && (
        <div className="mt-4">
          <ErrorBox
            message={failure instanceof Error ? failure.message : "저장에 실패했습니다."}
          />
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Link
          to={isEdit ? `/posts/${postId}` : "/"}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
        >
          취소
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "저장 중…" : isEdit ? "수정 완료" : "등록"}
        </button>
      </div>
    </form>
  );
}
