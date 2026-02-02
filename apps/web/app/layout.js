import './globals.css';
import Layout from '../components/Layout';

export const metadata = {
  title: 'My Blog',
  description: 'A personal blog built with Next.js + Spring Boot',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen">
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
