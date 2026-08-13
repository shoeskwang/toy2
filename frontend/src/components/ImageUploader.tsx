import { useRef, useState } from "react";
import type { ImageOut } from "../api/types";
import { useUploadImage } from "../hooks/usePosts";

interface Props {
  images: ImageOut[];
  onChange: (images: ImageOut[]) => void;
}

export function ImageUploader({ images, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadImage();
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);

    // 여러 장을 고르면 하나씩 올리고, 실패한 것만 따로 모아 알린다.
    const uploaded: ImageOut[] = [];
    const failed: string[] = [];
    for (const file of Array.from(files)) {
      try {
        uploaded.push(await upload.mutateAsync(file));
      } catch (e) {
        failed.push(`${file.name}: ${e instanceof Error ? e.message : "업로드 실패"}`);
      }
    }

    if (uploaded.length) onChange([...images, ...uploaded]);
    if (failed.length) setError(failed.join("\n"));
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {upload.isPending ? "업로드 중…" : "이미지 추가"}
        </button>
        <span className="text-xs text-slate-400">
          jpeg / png / gif / webp · 최대 5MB
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && (
        <p className="mt-2 whitespace-pre-line text-sm text-red-600">{error}</p>
      )}

      {images.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img) => (
            <li key={img.id} className="group relative">
              <img
                src={img.url}
                alt={img.original_name}
                className="h-24 w-full rounded-md border border-slate-200 object-cover"
              />
              <button
                type="button"
                aria-label={`${img.original_name} 제거`}
                onClick={() => onChange(images.filter((i) => i.id !== img.id))}
                className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-slate-900 text-sm leading-none text-white opacity-90 hover:bg-red-600"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
