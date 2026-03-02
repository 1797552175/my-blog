import './globals.css';
import Layout from '../components/Layout';
import ProgressBarProvider from '../components/ProgressBarProvider';

export const metadata = {
  title: 'AiNovel',
  description: 'AI-powered novel writing platform',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen">
        <ProgressBarProvider>
          <Layout>{children}</Layout>
        </ProgressBarProvider>
      </body>
    </html>
  );
}
