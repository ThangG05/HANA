"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { Loi } from "@/src/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);

  useEffect(() => {
    supabase().auth.getSession().then(({ data }) => data.session && router.replace("/dashboard")).catch(() => undefined);
  }, [router]);

  async function dangNhap(e: FormEvent) {
    e.preventDefault();
    setDang(true);
    setLoi("");
    try {
      const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password: matKhau });
      if (error) setLoi(error.message === "Invalid login credentials" ? "Email hoặc mật khẩu không đúng." : error.message);
      else router.replace("/dashboard");
    } catch (err) {
      setLoi(err instanceof Error ? err.message : "Không đăng nhập được");
    } finally {
      setDang(false);
    }
  }

  return (
    <main className="login">
      <div className="login-card">
        <div className="brand" style={{ padding: 0 }}>
          <div className="brand-mark">H</div>
          <div>
            <b>Hana Premium</b>
            <small>CRM nội bộ</small>
          </div>
        </div>
        <h1>Đăng nhập</h1>
        <form onSubmit={dangNhap}>
          <Loi>{loi}</Loi>
          <label className="field">
            <span>Email</span>
            <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span>Mật khẩu</span>
            <input type="password" autoComplete="current-password" required value={matKhau} onChange={(e) => setMatKhau(e.target.value)} />
          </label>
          <button className="btn" disabled={dang}>{dang ? "Đang đăng nhập…" : "Đăng nhập"}</button>
        </form>
      </div>
    </main>
  );
}
