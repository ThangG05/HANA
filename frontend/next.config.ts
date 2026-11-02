import type { NextConfig } from "next";

// Đọc SUPABASE_URL / SUPABASE_ANON_KEY từ .env gốc rồi đưa vào bundle trình duyệt.
// Chỉ dùng khóa ANON (công khai theo thiết kế của Supabase). TUYỆT ĐỐI không đưa service_role vào đây.
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "",
  },
};

export default nextConfig;
