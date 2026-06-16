import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MatDB Builder — 재료 물성 데이터베이스 빌더",
  description: "NotebookLM 딥리서치 기반 재료 물성 데이터베이스 구축 통합 도구",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
