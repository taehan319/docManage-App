////////////////
// Cookie管理 //
////////////////
import { parse } from 'cookie';
// ロガー
import { appLogger } from './logger';

import { decryptByKey } from '../utilities/encrypt';

// Cookieよりユーザ情報取得
export const getUserFromCookies = (req) => {
    const sessionCookieName = process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME || 'userSession';
    const useinfokey = process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO || 'user';

    const cookies = req.headers.get('cookie');
    if (!cookies) return null; // クッキーがない場合はnullを返す

    const parsedCookies = parse(cookies);
    const userSession = parsedCookies[sessionCookieName];
    
    if (!userSession) return null; // クッキーが存在していない場合はnullを返す

    try {
        const sessionJson = JSON.parse(userSession); // クッキーをJSONとしてパース
        // 正しくパースできればユーザー情報を返す
        if ((sessionJson[useinfokey])) {
            sessionJson[useinfokey][process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_NAME] = decryptByKey(process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_NAME, sessionJson[useinfokey]);
            sessionJson[useinfokey][process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ID] = decryptByKey(process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ID, sessionJson[useinfokey]);
            sessionJson[useinfokey][process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ADMINFLG] = decryptByKey(process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ADMINFLG, sessionJson[useinfokey]);
            sessionJson[useinfokey][process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_FACTORYID] = decryptByKey(process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_FACTORYID, sessionJson[useinfokey]);
            return sessionJson[useinfokey];
        } else {
            return null;
        }
    } catch (error) {
        appLogger.error(`Failed to parse user session from cookies:${error}`, {});
        return null; // パースエラーの場合はnullを返す
    }
};

