"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api-client";
import { supabase } from "./supabase";

export type PhamVi = "duoc_giao" | "co_so" | "toan_bo";
export interface Quyen {
  doi_tuong: string;
  hanh_dong: string;
  pham_vi: PhamVi;
}
export interface NguoiDung {
  id: string;
  hoTen: string;
  coSoId: string;
  vaiTro: string[];
  quyen: Quyen[];
}

interface AuthCtx {
  user: NguoiDung | null;
  /** Chỉ để ẩn/hiện nút. Quyền thật luôn do backend kiểm tra. */
  can: (doiTuong: string, hanhDong: string) => boolean;
  /** Phạm vi dữ liệu của một quyền (null nếu không có quyền). */
  phamVi: (doiTuong: string, hanhDong: string) => PhamVi | null;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<NguoiDung | null>(null);
  const [loi, setLoi] = useState("");

  useEffect(() => {
    let huy = false;
    (async () => {
      try {
        const { data } = await supabase().auth.getSession();
        if (!data.session) return void router.replace("/login");
        const me = await api<NguoiDung>("/auth/me");
        if (!huy) setUser(me);
      } catch (e) {
        if (!huy) setLoi(e instanceof Error ? e.message : "Không tải được thông tin tài khoản");
      }
    })();
    const { data: sub } = supabase().auth.onAuthStateChange((ev) => {
      if (ev === "SIGNED_OUT") router.replace("/login");
    });
    return () => {
      huy = true;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  const can = useCallback((dt: string, hd: string) => !!user?.quyen.some((q) => q.doi_tuong === dt && q.hanh_dong === hd), [user]);
  const phamVi = useCallback((dt: string, hd: string) => user?.quyen.find((q) => q.doi_tuong === dt && q.hanh_dong === hd)?.pham_vi ?? null, [user]);
  const logout = useCallback(async () => {
    await supabase().auth.signOut();
    router.replace("/login");
  }, [router]);
  const value = useMemo(() => ({ user, can, phamVi, logout }), [user, can, phamVi, logout]);

  if (loi)
    return (
      <div className="boot">
        <div className="boot-box">
          <h1>Không vào được hệ thống</h1>
          <p>{loi}</p>
          <button className="btn" onClick={() => void logout()}>Đăng nhập lại</button>
        </div>
      </div>
    );
  if (!user) return <div className="boot"><p className="muted">Đang tải…</p></div>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth phải nằm trong AuthProvider");
  return c;
}
