/**
 * ログイン認証API
*/
import db from '../../lib/transactionManager';
import HttpStatusCodes from '../../lib/httpStatusCodes';
import { appLogger } from '../../lib/logger';
import { extractMeta } from '../../lib/comSUtil';
import { NextResponse } from 'next/server';
import { sessionMiddleware } from '../../lib/session';
import { serialize } from 'cookie';
import { encrypt } from '../../utilities/encrypt';
const crypto = require("crypto");
// bcryptjsを使用
const bcrypt = require('bcryptjs');

// 環境変数からmaxAgeを取得
const sessionMaxAge = process.env.SESSION_MAX_AGE || 3600; // デフォルトは1時間
// 環境変数からCookie名称を取得
const cookiename = process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME;
const useinfokey = process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO;
const useinfokey_id = process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ID;
const useinfokey_name = process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_NAME;
const useinfokey_adminflg = process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ADMINFLG;
const useinfokey_factoryid = process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_FACTORYID;

const sessioninfo = process.env.NEXT_PUBLIC_SESSION_COOKIE_SESSION;

const handler = async (req) => {
    const logMeta = extractMeta(req, __filename);
    appLogger.debug('↓↓↓ ログイン認証 Start ↓↓↓', logMeta);

    try {
        // リクエストのJSONデータを取得
        const { email, password } = await req.json();
        const sql = 'SELECT * FROM user_mst WHERE user_email = ?'; // パスワード比較を削除
        const bindParams = [email]; // バインドパラメータからパスワードを削除

        // 非同期DBアクセスをPromiseで実装
        const result = await new Promise((resolve, reject) => {
            db.query(req, sql, bindParams, (err, rows) => {
                if (err) {
                    appLogger.error(`DBエラーが発生しました.>> ${err}`, logMeta);
                    return reject(new Error('DBエラーが発生しました.'));
                }
                if (rows.length < 1) {
                    appLogger.debug('ログイン認証に失敗しました.', logMeta);
                    return resolve(null);
                }
                resolve(rows);
            });
        });

        if (!result) {
            return new NextResponse(
                JSON.stringify({
                    message: "ログイン認証に失敗しました.",
                    data: result,
                }), { status: HttpStatusCodes.UNAUTHORIZED });
        }

        const user = result[0];

        // ハッシュ化されたパスワードと入力されたパスワードを比較
        const passwordMatch = await bcrypt.compare(password, user.user_pass);
        if (!passwordMatch) {
            appLogger.debug('パスワードが一致しません.', logMeta);
            return new NextResponse(
                JSON.stringify({
                    message: "ログイン認証に失敗しました.",
                    data: result,
                }), { status: HttpStatusCodes.UNAUTHORIZED });
        }
        if (!req.session[useinfokey]) {
            req.session[useinfokey] = {};
        }              
        req.session[useinfokey][useinfokey_name] = encrypt(user.user_name);
        req.session[useinfokey][useinfokey_id] = encrypt(user.user_id);
        req.session[useinfokey][useinfokey_adminflg] = encrypt(user.admin_flg);
        req.session[useinfokey][useinfokey_factoryid] = encrypt(user.factory_id);
        /*
        req.session[useinfokey] = {
            name: user.user_name,
            id: user.user_id,
            adminflg: user.admin_flg,
            factoryId: user.factory_id
        };
        */
        const response = new NextResponse(
            JSON.stringify({
                message: "ログインに成功しました.",
                data: result,
            }),
            { status: HttpStatusCodes.OK }
        );
        // ユーザ情報をCookieへ格納
        response.headers.append('Set-Cookie', serialize(cookiename, req.session[useinfokey], {
            maxAge: parseInt(sessionMaxAge),
            path: '/',
            httpOnly: false,
        }));
        // SessionIDをCookieへ格納
        const sessionId = crypto.randomBytes(16).toString("hex");
        response.headers.append('Set-Cookie', serialize(sessioninfo, sessionId, {
            maxAge: parseInt(sessionMaxAge),
            path: '/',
            httpOnly: false,
        }));
        

        appLogger.debug('ログイン認証に成功しました.', logMeta);
        return response;
    } catch (error) {
        appLogger.error(`エラーが発生しました.>> ${error}`, logMeta);
        return new NextResponse(
            JSON.stringify({
                message: "エラーが発生しました.",
                data: result,
            }), { status: HttpStatusCodes.INTERNAL_SERVER_ERROR });
    } finally {
        appLogger.debug('↑↑↑ ログイン認証 End ↑↑↑', logMeta);
    }
};

// HTTPメソッドごとに名前付きエクスポートを使用
export const POST = sessionMiddleware(handler);
