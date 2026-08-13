// Vite 프록시가 /api 와 /uploads 를 :8000 으로 넘긴다. 절대 URL 을 쓰지 않는다.
const BASE = "/api";

export class ApiError extends Error {
  // 파라미터 프로퍼티는 erasableSyntaxOnly 에서 막히므로 필드로 선언한다.
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function toError(res: Response): Promise<ApiError> {
  let detail = `요청에 실패했습니다 (${res.status})`;
  try {
    const body = await res.json();
    // FastAPI 는 문자열 detail 과 검증 오류 배열을 모두 detail 로 내려준다.
    if (typeof body.detail === "string") {
      detail = body.detail;
    } else if (Array.isArray(body.detail) && body.detail.length > 0) {
      detail = body.detail.map((d: { msg?: string }) => d.msg ?? "").join(", ");
    }
  } catch {
    // 본문이 JSON 이 아니면 기본 메시지를 쓴다.
  }
  return new ApiError(res.status, detail);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: init?.body instanceof FormData
      ? init?.headers
      : { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  del: (path: string) => request<void>(path, { method: "DELETE" }),
  upload: <T>(path: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    // FormData 를 보낼 때 Content-Type 을 직접 지정하면 boundary 가 빠져 깨진다.
    return request<T>(path, { method: "POST", body: form });
  },
};
