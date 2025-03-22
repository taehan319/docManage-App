/**
 * ヘッダー
 */
'use client';
import { useEffect, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import FolderIcon from '@mui/icons-material/Folder';
import LogoutIcon from '@mui/icons-material/Logout';
import Cookies from 'js-cookie';
import { useUserContext } from '../../(dashboard)/layout';

// リダイレクト先
const redirectTo = process.env.NEXT_PUBLIC_REDIRECT_ROOT_TO || '/login'

export function Header() {
  // レイアウトから提供されるユーザーコンテキストを使用
  const { userData: contextUserData, logout: contextLogout } = useUserContext();
  const [userData, setUserData] = useState(null);

  // コンポーネントマウント時にユーザーデータを設定
  useEffect(() => {
    // コンテキストからユーザーデータが提供されている場合はそれを使用
    if (contextUserData) {
      setUserData(contextUserData);
    } else {
      // 後方互換性のためCookieからも取得を試みる
      const user = Cookies.get(process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME);
      if (user) {
        try {
          const userInfo = JSON.parse(user);
          setUserData(userInfo?.[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO] || []);
        } catch (error) {
          console.error('ユーザーデータの解析エラー:', error);
        }
      }
    }
  }, [contextUserData]);

  // ログアウト処理
  const handleLogout = async () => {
    try {
      // コンテキストのログアウト関数があれば使用
      if (contextLogout) {
        contextLogout(true); // trueでログインページへリダイレクト
      } else {
        // 後方互換性のための処理
        // クライアント側のCookieを削除
        Cookies.remove(process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME);
      　Cookies.remove(process.env.NEXT_PUBLIC_SESSION_COOKIE_SESSION);

        // ページをリフレッシュしてからログインページへリダイレクト
        window.location.href = redirectTo;
      }
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <FolderIcon sx={{ mr: 2 }} />
        <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
          ドキュメント・販売管理
        </Typography>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2  // 要素間のスペース
        }}>
          <Box component={"p"}>
            {userData?.[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_NAME] || ""}
          </Box>
          <Button
            color="inherit"
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
          >
            ログアウト
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}