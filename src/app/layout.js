import { ToastProvider } from './contexts/toastProvider';
import { ApiProvider } from './contexts/apiWrapProvider';
import ApiServiceInitializer from './utilities/apiServiceInitializer';
import { ThemeProvider } from './contexts/themeProvider';
import './styles/globals.css';

export const metadata = {
  title: "株式会社久留米サンモード | ドキュメント・販売管理",
  description: "ドキュメント・販売管理を行うアプリケーションです。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        <link rel="icon" href="/common/img/favicon.webp" sizes="any" />
        <link rel="icon" type="image/png" sizes="16x16" href="/common/img/favicon16x16" />
        <link rel="icon" type="image/png" sizes="32x32" href="/common/img/favicon32x32.webp" />
        <link rel="apple-touch-icon" sizes="180x180" href="/common/img/apple-touch-icon.webp" />
      </head>
      <body cz-shortcut-listen="true">
        <ThemeProvider>
          <ApiProvider>
            {/* APIサービスをシングルトンパターンで初期化 */}
            <ApiServiceInitializer />
            <ToastProvider>
              {children}
            </ToastProvider>
          </ApiProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
