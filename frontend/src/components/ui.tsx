"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Hộp thoại dùng <dialog> gốc: có sẵn bẫy focus, đóng bằng Esc. */
export function Dialog({ mo, dong, tieuDe, children, rong }: { mo: boolean; dong: () => void; tieuDe: string; children: ReactNode; rong?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (mo && !d.open) d.showModal();
    if (!mo && d.open) d.close();
  }, [mo]);
  return (
    <dialog ref={ref} className={`dialog${rong ? " dialog-wide" : ""}`} onClose={dong} onClick={(e) => e.target === ref.current && dong()}>
      {mo && (
        <div className="dialog-body">
          <div className="dialog-head">
            <h2>{tieuDe}</h2>
            <button type="button" className="icon-btn" onClick={dong} aria-label="Đóng">×</button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function Truong({ nhan, children, ghiChu, rong }: { nhan: string; children: ReactNode; ghiChu?: string; rong?: boolean }) {
  return (
    <label className={`field${rong ? " field-full" : ""}`}>
      <span>{nhan}</span>
      {children}
      {ghiChu && <small>{ghiChu}</small>}
    </label>
  );
}

export function Loi({ children, thuLai }: { children?: ReactNode; thuLai?: () => void }) {
  if (!children) return null;
  return <div className="alert alert-error" role="alert"><span>{children}</span>{thuLai && <button type="button" className="btn btn-ghost btn-sm" onClick={thuLai}>Thử lại</button>}</div>;
}

export function DangTai({ soDong = 3 }: { soDong?: number }) {
  return <div className="loading-lines" role="status" aria-label="Đang tải dữ liệu">{Array.from({ length: soDong }, (_, i) => <span key={i} />)}<span className="sr-only">Đang tải dữ liệu…</span></div>;
}

export function Trong({ children, hanhDong }: { children: ReactNode; hanhDong?: ReactNode }) {
  return (
    <div className="empty">
      <p>{children}</p>
      {hanhDong}
    </div>
  );
}

export function Nhan({ ten, tone = "xam" }: { ten: string; tone?: "xam" | "xanh" | "nau" | "do" | "vang" | "tim" }) {
  return <span className={`tag tag-${tone}`}>{ten}</span>;
}

export function PhanTrang({ trang, tong, coTrang, doi }: { trang: number; tong: number; coTrang: number; doi: (p: number) => void }) {
  const soTrang = Math.max(1, Math.ceil(tong / coTrang));
  if (soTrang <= 1) return <p className="muted small">{tong} kết quả</p>;
  return (
    <div className="pager">
      <span className="muted small">{tong} kết quả · trang {trang}/{soTrang}</span>
      <div>
        <button className="btn btn-ghost" disabled={trang <= 1} onClick={() => doi(trang - 1)}>Trước</button>
        <button className="btn btn-ghost" disabled={trang >= soTrang} onClick={() => doi(trang + 1)}>Sau</button>
      </div>
    </div>
  );
}

export function TieuDeTrang({ tieuDe, phu, children }: { tieuDe: string; phu?: string; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{tieuDe}</h1>
        {phu && <p className="muted">{phu}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}
