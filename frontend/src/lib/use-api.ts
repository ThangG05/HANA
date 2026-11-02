"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loiToiThongBao } from "./api-client";

/** Tải dữ liệu khi `khoa` đổi; `tai()` để tải lại sau khi ghi. Bỏ qua kết quả của lần gọi đã cũ. */
export function useApi<T>(goi: () => Promise<T>, khoa: ReadonlyArray<unknown>) {
  const [data, setData] = useState<T | null>(null);
  const [loi, setLoi] = useState("");
  const [dangTai, setDangTai] = useState(true);
  const dem = useRef(0);
  const goiRef = useRef(goi);
  goiRef.current = goi;

  const tai = useCallback(async () => {
    const lan = ++dem.current;
    setDangTai(true);
    try {
      const kq = await goiRef.current();
      if (lan === dem.current) {
        setData(kq);
        setLoi("");
      }
    } catch (e) {
      if (lan === dem.current) setLoi(loiToiThongBao(e));
    } finally {
      if (lan === dem.current) setDangTai(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void tai(), khoa);
  return { data, loi, dangTai, tai };
}
