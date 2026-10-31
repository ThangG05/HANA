import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hana Premium CRM",
  description: "Hệ thống quản lý hành trình khách hàng Hana Premium",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
