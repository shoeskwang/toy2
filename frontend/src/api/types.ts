export interface ImageOut {
  id: number;
  url: string;
  original_name: string;
  size: number;
}

export interface CommentOut {
  id: number;
  post_id: number;
  author: string;
  content: string;
  created_at: string;
}

export interface PostSummary {
  id: number;
  title: string;
  author: string;
  created_at: string;
  updated_at: string;
  comment_count: number;
  thumbnail: string | null;
}

export interface PostDetail {
  id: number;
  title: string;
  content: string;
  author: string;
  created_at: string;
  updated_at: string;
  comments: CommentOut[];
  images: ImageOut[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface PostCreateBody {
  title: string;
  content: string;
  author: string;
  image_ids: number[];
}

export interface PostUpdateBody {
  title: string;
  content: string;
  image_ids: number[];
}

export interface CommentCreateBody {
  author: string;
  content: string;
}
