/**
 * ダッシュボード用のレイアウトを定義
 */
'use client';
import React, { memo, createContext, useContext, useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import { Header } from '../components/navigation/header';
import { Sidebar } from '../components/navigation/sidebar';
import Cookies from 'js-cookie';
import CommonErrorPage from '../error/page';
import { DualRingLoader as Mask } from '../components/mask';
import { useRouter } from 'next/navigation';
import { decryptByKey } from '../utilities/encrypt';
import * as CONST from '../utilities/contains';

// ユーザー情報用のコンテキスト作成
export const UserContext = createContext({
  userData: null,
  isCompanyUser: false,
  logout: () => { },
});

// ユーザーコンテキストを使用するためのカスタムフック
export const useUserContext = () => useContext(UserContext);

// セッション有効性チェックの間隔（ミリ秒）
const SESSION_CHECK_INTERVAL = 60000; // 1分ごと

// ダッシュボード内容（メモ化してパフォーマンス最適化）
const DashboardContent = memo(({ children, userData, isCompanyUser, logout }) => {
  const contentHeight = 'calc(100vh - 115px)';
  return (
    <UserContext.Provider value={{ userData, isCompanyUser, logout }}>
      <Box sx={{ display: 'flex' }}>
        <Header />
        <Sidebar />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            px: 2,
            pt: 1,
            width: '100%',
            height: contentHeight
          }}
        >
          <Toolbar />
          {children}
        </Box>
      </Box>
    </UserContext.Provider>
  );
});

// プロパティ名を明示的に設定
DashboardContent.displayName = 'DashboardContent';

// メインのダッシュボードレイアウト
export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [isCompanyUser, setIsCompanyUser] = useState(false);
  const [sessionValid, setSessionValid] = useState(true);
  const [showError, setShowError] = useState(false);

  // ログアウト処理関数
  const logout = (redirectToLogin = true) => {
    Cookies.remove(process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME);
    Cookies.remove(process.env.NEXT_PUBLIC_SESSION_COOKIE_SESSION);
    if (redirectToLogin) {
      router.push('/login');
    }
  };

  // セッションの有効性を確認する関数
  const checkSession = () => {
    const user = Cookies.get(process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME);
    if (!user) {
      console.log('セッションが見つかりません。');
      setSessionValid(false);
      setShowError(true);
      return false;
    }

    try {
      const parsedUserData = JSON.parse(user);
      if (!parsedUserData?.[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO]?.[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ID]) {
        console.log('無効なセッションデータです。');
        setSessionValid(false);
        setShowError(true);
        return false;
      }

      // セッションの有効期限をチェック（もし期限が付与されている場合）
      if (parsedUserData.expiresAt && new Date(parsedUserData.expiresAt) < new Date()) {
        console.log('セッションの期限が切れました。');
        setSessionValid(false);
        setShowError(true);
        return false;
      }

      return true;
    } catch (error) {
      console.error('セッションデータの解析中にエラーが発生しました:', error);
      setSessionValid(false);
      setShowError(true);
      return false;
    }
  };

  // 初回ロード時のセッション確認
  useEffect(() => {
    const isValid = checkSession();
    if (isValid) {
      try {
        const user = Cookies.get(process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME);
        const parsedUserData = JSON.parse(user);
        parsedUserData[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO][process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_NAME] = decryptByKey(process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_NAME, parsedUserData[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO]);
        parsedUserData[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO][process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ID] = decryptByKey(process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ID, parsedUserData[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO]);
        parsedUserData[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO][process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ADMINFLG] = decryptByKey(process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ADMINFLG, parsedUserData[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO]);
        parsedUserData[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO][process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_FACTORYID] = decryptByKey(process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_FACTORYID, parsedUserData[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO]);
        setUserData(parsedUserData[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO]);
        setIsCompanyUser(parsedUserData?.[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO]?.[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_FACTORYID] === String(CONST.ADMIN_FACTORY_ID));
      } catch (error) {
        console.error('ユーザー情報の解析中にエラーが発生しました:', error);
        setSessionValid(false);
        setShowError(true);
      }
    }
  }, []);

  // 定期的なセッションチェック
  /*
  useEffect(() => {
    const sessionChecker = setInterval(() => {
      checkSession();
    }, SESSION_CHECK_INTERVAL);

    return () => clearInterval(sessionChecker);
  }, []);
  */
  // ブラウザを閉じる際の処理
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // ブラウザを閉じるときに実行される処理
      // セキュリティの観点からCookieはクライアントサイドでのみ削除可能
      // Cookieを削除（ログアウト）
      // 注意: このイベントでは非同期処理は機能しないため、
      // 直接Cookieの操作のみを行う
      // 再読み込みかブラウザを閉じるかを判定
      if (performance.navigation) {
        if (performance.navigation.type === performance.navigation.TYPE_NAVIGATE
          || performance.navigation.type === performance.navigation.TYPE_RELOAD) {
          console.log("リロード：Cookieを削除せず");
        } else {
          console.log("非リロード：Cookie削除");
          Cookies.remove(process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME);
          Cookies.remove(process.env.NEXT_PUBLIC_SESSION_COOKIE_SESSION);
        }
      }      
    };

    // イベントリスナーの登録
    window.addEventListener('beforeunload', handleBeforeUnload);

    // クリーンアップ関数
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // セッションが無効でエラーページを表示する場合
  if (!sessionValid && showError) {
    // Cookieをクリア
    Cookies.remove(process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME);
    Cookies.remove(process.env.NEXT_PUBLIC_SESSION_COOKIE_SESSION);

    // エラーページに飛ばす
    return <CommonErrorPage noLogin />;
  }

  // セッションは有効だがユーザーデータがまだロードされていない場合
  if (!userData && sessionValid) {
    return <Mask visible={true} />;
  }

  // セッションが有効な場合
  return (
    <DashboardContent
      userData={userData}
      isCompanyUser={false}
      logout={logout}
    >
      {children}
    </DashboardContent>
  );
}