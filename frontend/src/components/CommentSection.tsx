import { useState } from "react";
import type { CommentOut } from "../api/types";
import { TEMP_ID, useCreateComment, useDeleteComment } from "../hooks/useComments";
import { formatDate } from "./Layout";

interface Props {
  postId: number;
  comments: CommentOut[];
}

export function CommentSection({ postId, comments }: Props) {
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const create = useCreateComment(postId);
  const remove = useDeleteComment(postId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!author.trim() || !content.trim()) return;
    create.mutate(
      { author: author.trim(), content: content.trim() },
      { onSuccess: () => setContent("") },
    );
  }

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-sm font-semibold text-slate-700">
        댓글 {comments.length}
      </h2>

      <ul className="space-y-3">
        {comments.map((c) => {
          const pending = c.id === TEMP_ID;
          return (
            <li
              key={c.id}
              className={`rounded-lg border border-slate-200 bg-white px-4 py-3 ${
                pending ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{c.author}</span>
                <div className="flex items-center gap-3">
                  <time className="text-xs text-slate-400">
                    {formatDate(c.created_at)}
                  </time>
                  {!pending && (
                    <button
                      onClick={() => remove.mutate(c.id)}
                      className="text-xs text-slate-400 hover:text-red-600"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700">
                {c.content}
              </p>
            </li>
          );
        })}
        {comments.length === 0 && (
          <li className="py-6 text-center text-sm text-slate-400">
            첫 댓글을 남겨보세요.
          </li>
        )}
      </ul>

      <form
        onSubmit={submit}
        className="mt-5 rounded-lg border border-slate-200 bg-white p-4"
      >
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="닉네임"
          maxLength={50}
          required
          className="mb-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="댓글을 입력하세요"
          rows={3}
          required
          className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
        {create.isError && (
          <p className="mt-2 text-sm text-red-600">
            {create.error instanceof Error ? create.error.message : "등록 실패"}
          </p>
        )}
        <div className="mt-3 text-right">
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            댓글 등록
          </button>
        </div>
      </form>
    </section>
  );
}
