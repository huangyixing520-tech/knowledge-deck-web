import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Knowledge Deck",
  description: "把一小时播客压缩成可复述、可收藏、可分享的知识卡片。"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
