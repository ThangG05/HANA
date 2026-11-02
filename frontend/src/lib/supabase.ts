import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Tạo muộn (không tạo lúc import) để build/prerender không lỗi khi chưa có biến môi trường. */
export function supabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY trong file .env ở thư mục gốc.");
  client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}
