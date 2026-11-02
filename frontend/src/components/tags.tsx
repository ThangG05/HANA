import { NHAN_CO_HOI, NHAN_CONG_VIEC, NHAN_LICH_HEN, NHAN_UU_TIEN, nhan } from "@/src/lib/labels";
import { Nhan } from "./ui";

type Tone = "xam" | "xanh" | "nau" | "do" | "vang" | "tim";
const CO_HOI: Record<string, Tone> = { moi: "tim", dang_tu_van: "tim", da_hen: "nau", da_kham: "nau", da_chot: "xanh", dang_hau_phau: "xanh", hoan_tat: "xanh", can_nuoi_duong: "vang", ngung_cham_soc: "xam" };
const LICH: Record<string, Tone> = { cho_xac_nhan: "vang", da_xac_nhan: "tim", da_den: "nau", hoan_thanh: "xanh", huy: "xam", khong_den: "do", da_doi_lich: "xam" };
const VIEC: Record<string, Tone> = { cho_lam: "xam", dang_lam: "tim", hoan_thanh: "xanh", huy: "xam" };
const UU_TIEN: Record<string, Tone> = { thap: "xam", binh_thuong: "xam", cao: "vang", khan_cap: "do" };

export const TrangThaiCoHoi = ({ v }: { v: string }) => <Nhan ten={nhan(NHAN_CO_HOI, v)} tone={CO_HOI[v] ?? "xam"} />;
export const TrangThaiLich = ({ v }: { v: string }) => <Nhan ten={nhan(NHAN_LICH_HEN, v)} tone={LICH[v] ?? "xam"} />;
export const TrangThaiViec = ({ v }: { v: string }) => <Nhan ten={nhan(NHAN_CONG_VIEC, v)} tone={VIEC[v] ?? "xam"} />;
export const UuTien = ({ v }: { v: string }) => (v === "binh_thuong" ? null : <Nhan ten={nhan(NHAN_UU_TIEN, v)} tone={UU_TIEN[v] ?? "xam"} />);
