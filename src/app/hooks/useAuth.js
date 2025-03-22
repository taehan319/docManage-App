/////////////////////////
// ログイン済確認用Hook //
/////////////////////////
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import cookie from 'js-cookie';
import HttpStatusCodes from '../lib/httpStatusCodes';

const useAuth = () => {
  const [userInfo, setUserInfo] = useState(null);
  const router = useRouter();
  const sessionCookieName = process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME || 'userSession';
  const sessionCookieUserInfo = process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO || 'user';
  const sessionCookieUserInfoId = process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ID || 'id';
  const redirectTo = process.env.NEXT_PUBLIC_REDIRECT_ROOT_TO || '/login'
  useEffect(() => {
    const userSession = cookie.get(sessionCookieName);
    let userJson = {};
    if (userSession) {
      userJson = JSON.parse(userSession);
    }
    if (!userSession
      || !userJson[sessionCookieUserInfo] 
      || !userJson[sessionCookieUserInfo][sessionCookieUserInfoId]) {
        const errorMessage = encodeURIComponent(`${HttpStatusCodes.UNAUTHORIZED} | 一定時間操作が行われなかったか、ログインされていません`);
        router.push(`/error?error=${errorMessage}`);    
    } else {
      setUserInfo(userJson[sessionCookieUserInfo]);
    }
  }, [router]);
  return userInfo;
};

export default useAuth;
