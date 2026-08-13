import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { CommentCreateBody, CommentOut, PostDetail } from "../api/types";
import { postKeys } from "./usePosts";

// 낙관적 업데이트로 임시로 끼워넣는 댓글의 id. 서버 id 와 겹치지 않게 음수를 쓴다.
const TEMP_ID = -1;

export function useCreateComment(postId: number) {
  const qc = useQueryClient();
  const key = postKeys.detail(postId);

  return useMutation({
    mutationFn: (body: CommentCreateBody) =>
      api.post<CommentOut>(`/posts/${postId}/comments`, body),

    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<PostDetail>(key);
      if (previous) {
        qc.setQueryData<PostDetail>(key, {
          ...previous,
          comments: [
            ...previous.comments,
            {
              id: TEMP_ID,
              post_id: postId,
              author: body.author,
              content: body.content,
              created_at: new Date().toISOString(),
            },
          ],
        });
      }
      return { previous };
    },

    onError: (_err, _body, context) => {
      // 실패하면 낙관적으로 끼워넣은 댓글을 되돌린다.
      if (context?.previous) qc.setQueryData(key, context.previous);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useDeleteComment(postId: number) {
  const qc = useQueryClient();
  const key = postKeys.detail(postId);

  return useMutation({
    mutationFn: (commentId: number) => api.del(`/comments/${commentId}`),

    onMutate: async (commentId) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<PostDetail>(key);
      if (previous) {
        qc.setQueryData<PostDetail>(key, {
          ...previous,
          comments: previous.comments.filter((c) => c.id !== commentId),
        });
      }
      return { previous };
    },

    onError: (_err, _id, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export { TEMP_ID };
