///////////////////
// セッション管理 //
///////////////////
const { parse, serialize } = require('cookie');
const { NextResponse } = require('next/server');
// 環境変数からmaxAgeを取得
const sessionMaxAge = process.env.SESSION_MAX_AGE || 3600; // デフォルトは1時間
// 環境変数からCookie名称を取得
const cookiename = process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME;

export const sessionMiddleware = (handler) => async (req) => {
    const cookies = parse(req.headers.get('cookie') || '');
    if (cookies[cookiename]) {
        const sessionData = JSON.parse(cookies[cookiename]);
        req.session = sessionData;
    } else {
        req.session = {};
    }

    const res = await handler(req);

    if (res instanceof NextResponse) {
        res.headers.append('Set-Cookie', serialize(cookiename, JSON.stringify(req.session), {
            maxAge: parseInt(sessionMaxAge) ,
            path: '/',
            httpOnly: false,
        }));
    } else {
        console.log("res isnot NextResponse!");
    }

    return res;
};