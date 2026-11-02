import { supabase } from "./supabase";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public body?: Record<string, unknown>,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

export interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
}

function lamSachQuery(q?: Query) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q ?? {})) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Gọi backend kèm token Supabase. 401 → đăng xuất và về trang đăng nhập. */
export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    redirectLogin();
    throw new ApiError(401, "Phiên đăng nhập đã hết hạn");
  }

  let res: Response;
  try {
    res = await fetch(`${API}${path}${lamSachQuery(opts.query)}`, {
      method: opts.method ?? "GET",
      headers: { Authorization: `Bearer ${token}`, ...(opts.body !== undefined && { "Content-Type": "application/json" }) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Không kết nối được máy chủ. Kiểm tra backend đang chạy ở cổng 3001.");
  }

  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (res.status === 401) {
    await supabase().auth.signOut();
    redirectLogin();
    throw new ApiError(401, "Phiên đăng nhập đã hết hạn");
  }
  if (!res.ok) {
    const m = body?.message;
    const msg = Array.isArray(m) ? m.join("; ") : typeof m === "string" ? m : "Có lỗi xảy ra, thử lại sau";
    throw new ApiError(res.status, msg, typeof body?.code === "string" ? body.code : undefined, body ?? undefined);
  }
  return body as T;
}

function redirectLogin() {
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) window.location.assign("/login");
}

export const loiToiThongBao = (e: unknown) => (e instanceof Error ? e.message : "Có lỗi xảy ra");
