import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type {
  ImageOut,
  Page,
  PostCreateBody,
  PostDetail,
  PostSummary,
  PostUpdateBody,
} from "../api/types";

export const postKeys = {
  list: (page: number, q: string) => ["posts", { page, q }] as const,
  detail: (id: number) => ["post", id] as const,
};

export function usePostList(page: number, q: string) {
  return useQuery({
    queryKey: postKeys.list(page, q),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), size: "10" });
      if (q) params.set("q", q);
      return api.get<Page<PostSummary>>(`/posts?${params}`);
    },
    // 페이지를 넘길 때 목록이 빈 화면으로 깜빡이지 않게 이전 데이터를 유지한다.
    placeholderData: (prev) => prev,
  });
}

export function usePost(id: number) {
  return useQuery({
    queryKey: postKeys.detail(id),
    queryFn: () => api.get<PostDetail>(`/posts/${id}`),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PostCreateBody) => api.post<PostDetail>("/posts", body),
    onSuccess: (post) => {
      qc.setQueryData(postKeys.detail(post.id), post);
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useUpdatePost(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PostUpdateBody) => api.put<PostDetail>(`/posts/${id}`, body),
    onSuccess: (post) => {
      qc.setQueryData(postKeys.detail(id), post);
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del(`/posts/${id}`),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: postKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useUploadImage() {
  return useMutation({
    mutationFn: (file: File) => api.upload<ImageOut>("/uploads", file),
  });
}
