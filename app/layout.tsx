import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SA 내전 팀짜기",
  description: "서든어택 내전 팀 편성 도구",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
