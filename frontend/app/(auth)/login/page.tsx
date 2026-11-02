"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { AppIcon } from "@/src/components/AppIcon";
import { Loi } from "@/src/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  const [hienMatKhau, setHienMatKhau] = useState(false);

  useEffect(() => {
    supabase().auth.getSession().then(({ data }) => data.session && router.replace("/dashboard")).catch(() => undefined);
  }, [router]);

  async function dangNhap(e: FormEvent) {
    e.preventDefault();
    setDang(true);
    setLoi("");
    try {
      const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password: matKhau });
      if (error) setLoi("Không đăng nhập được. Vui lòng kiểm tra email, mật khẩu và thử lại.");
      else router.replace("/dashboard");
    } catch (err) {
      setLoi("Không kết nối được dịch vụ đăng nhập. Vui lòng thử lại sau.");
    } finally {
      setDang(false);
    }
  }

  return (
    <main className="login">
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand login-brand">
          <div className="brand-mark">H</div>
          <div>
            <b>Hana Premium</b>
            <small>Không gian làm việc</small>
          </div>
        </div>
        <div className="login-heading"><span className="eyebrow">CRM NỘI BỘ</span><h1 id="login-title">Chào mừng trở lại</h1><p>Đăng nhập để tiếp tục chăm sóc hành trình của khách hàng.</p></div>
        <form onSubmit={dangNhap}>
          <Loi>{loi}</Loi>
          <label className="field">
            <span>Email công việc</span>
            <input type="email" autoComplete="username" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ten@phongkham.vn" />
          </label>
          <label className="field">
            <span>Mật khẩu</span>
            <span className="password-wrap"><input type={hienMatKhau ? "text" : "password"} autoComplete="current-password" required value={matKhau} onChange={(e) => setMatKhau(e.target.value)} /><button type="button" aria-label={hienMatKhau ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={hienMatKhau} onClick={() => setHienMatKhau((v) => !v)}><AppIcon name={hienMatKhau ? "eyeOff" : "eye"} /></button></span>
          </label>
          <button className="btn login-submit" disabled={dang}>{dang ? "Đang đăng nhập…" : <>Vào không gian làm việc <AppIcon name="arrow" size={17} /></>}</button>
        </form>
        <p className="login-footnote">Dành cho nhân sự được cấp quyền của Hana Premium.</p>
      </section>
      <aside className="login-visual" aria-hidden="true">
        <div className="login-visual-copy"><span className="eyebrow">HANA PREMIUM · CRM</span><h2>Chăm sóc trọn vẹn,<br />trên một hành trình.</h2><p>Mọi tương tác, lịch hẹn và công việc trong cùng một không gian rõ ràng.</p></div>
        <div className="ribbon-scene"><div className="ribbon ribbon-back" /><div className="ribbon ribbon-mid" /><div className="ribbon ribbon-front" /><div className="ribbon-glow" /></div>
        <div className="login-visual-label">Giao diện nhận diện đề xuất</div>
      </aside>
    </main>
  );
}
