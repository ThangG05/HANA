// Chạy SAU `prisma db pull`, TRƯỚC `prisma generate`:  node scripts/sua-schema-prisma.mjs
//
// Lý do: một số bảng có index duy nhất một phần (ví dụ "mỗi cơ hội chỉ một báo giá nháp") trên cột nằm trong khóa ngoại ghép.
// `db pull` hiểu nhầm đó là quan hệ một-một và sinh schema mà `prisma generate` từ chối (lỗi P1012
// "A one-to-one relation must use unique fields on the defining side"). Script đổi phía đối diện thành quan hệ một-nhiều.
// Chạy lại nhiều lần vẫn an toàn.
import fs from "node:fs";

const duongDan = process.argv[2] ?? "prisma/schema.prisma";
let s = fs.readFileSync(duongDan, "utf8");
const doi = [];

const tapHop = (ds) => [...ds].sort().join(",");
const tenCot = (chuoi) => chuoi.split(",").map((x) => x.trim()).filter(Boolean);

function cacModel(text) {
  return [...text.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)].map((m) => ({ ten: m[1], than: m[2], batDau: m.index, dai: m[0].length }));
}

function duyNhat(model) {
  const ds = new Set();
  for (const m of model.than.matchAll(/@@(?:unique|id)\(\s*\[([^\]]+)\]/g)) ds.add(tapHop(tenCot(m[1])));
  for (const dong of model.than.split("\n")) {
    const f = dong.trim().match(/^(\w+)\s+\S+/);
    if (f && /\s@(?:unique|id)\b/.test(dong)) ds.add(tapHop([f[1]]));
  }
  return ds;
}

let thayDoi = true;
while (thayDoi) {
  thayDoi = false;
  const models = cacModel(s);
  for (const m of models) {
    const duy = duyNhat(m);
    for (const dong of m.than.split("\n")) {
      const q = dong.match(/^\s*(\w+)\s+(\w+)(\?)?\s+.*@relation\((.*)\)/);
      if (!q) continue;
      const [, , kieu, , attr] = q;
      const f = attr.match(/fields:\s*\[([^\]]+)\]/);
      if (!f) continue;
      if (duy.has(tapHop(tenCot(f[1])))) continue; // đúng là một-một, giữ nguyên
      const ten = attr.match(/^\s*"([^"]+)"/)?.[1];
      const dich = models.find((x) => x.ten === kieu);
      if (!dich) continue;
      for (const dd of dich.than.split("\n")) {
        const b = dd.match(new RegExp(`^(\\s*\\w+\\s+)${m.ten}\\?(.*)$`));
        if (!b) continue;
        if (/@relation\([^)]*fields:/.test(dd)) continue; // dòng này là phía định nghĩa khóa ngoại (ví dụ quan hệ tự tham chiếu), không phải phía đối diện
        const tenBen = dd.match(/@relation\(\s*"([^"]+)"/)?.[1];
        if ((ten ?? null) !== (tenBen ?? null)) continue;
        const moi = `${b[1]}${m.ten}[]${b[2]}`;
        const batDauDich = dich.batDau + s.slice(dich.batDau).indexOf(dd);
        s = s.slice(0, batDauDich) + moi + s.slice(batDauDich + dd.length);
        doi.push(`${kieu}: ${dd.trim().split(/\s+/)[0]} ${m.ten}? → ${m.ten}[]`);
        thayDoi = true;
        break;
      }
      if (thayDoi) break;
    }
    if (thayDoi) break;
  }
}

if (doi.length) {
  fs.writeFileSync(duongDan, s);
  console.log("Đã sửa " + doi.length + " quan hệ trong " + duongDan + ":\n  - " + doi.join("\n  - "));
} else {
  console.log("Không có gì cần sửa trong " + duongDan);
}
