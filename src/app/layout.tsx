import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ладно — семейный архив",
  description: "Тёплое место для семейных фото, видео и историй",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
