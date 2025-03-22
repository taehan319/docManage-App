/**
 * 外部発注処理API
 */
import { NextResponse } from 'next/server';
import HttpStatusCodes from '../../../lib/httpStatusCodes';
import { appLogger } from '../../../lib/logger';
import { extractMeta } from '../../../lib/comSUtil';
import OrderModule from './module';
import { getUserFromCookies } from '../../../lib/cookieManager';
// Session管理ミドルウェア
import { sessionMiddleware } from '../../../lib/session';

const handler = async (req) => {
    const logMeta = extractMeta(req, __filename);
    appLogger.debug(`↓↓↓ 外部発注処理 Start ↓↓↓`, logMeta);

    try {
        // ユーザー情報の取得
        const userInfo = getUserFromCookies(req);
        if (!userInfo) {
            return NextResponse.json({
                message: "ログインされていません."
            }, {
                status: HttpStatusCodes.UNAUTHORIZED
            });
        }
        const updUserId = userInfo?.[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ID] === undefined 
            ? null 
            : parseInt(userInfo[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ID]);
        const factoryId = userInfo?.[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_FACTORYID] === undefined 
            ? null 
            : parseInt(userInfo[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_FACTORYID]);

        // リクエストパラメータの取得とバリデーション
        const reqData = await req.json();

        // モジュールのインスタンス生成と初期設定
        const orderModule = new OrderModule(req);
        orderModule.setData(reqData, updUserId, factoryId);
        // トランザクション実行
        const result = await new Promise((resolve, reject) => {
            orderModule.runTransaction((err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        // 成功レスポンスの返却
        const response = NextResponse.json({
            message: "外部発注処理に成功しました",
            data: result
        }, {
            status: HttpStatusCodes.OK
        });

        appLogger.debug(`外部発注処理が完了しました`, logMeta);
        return response;
    } catch (error) {
        appLogger.error(`外部発注処理でエラーが発生しました`, {
            ...logMeta,
            error: error.message
        });

        // エラーメッセージに応じたステータスコードを設定
        let statusCode = HttpStatusCodes.INTERNAL_SERVER_ERROR;
        if (error.message === '対象の販売データが見つかりません') {
            statusCode = HttpStatusCodes.NOT_FOUND;
        }
        return NextResponse.json({
            message: error.message || '外部発注処理中にエラーが発生しました'
        }, {
            status: statusCode
        });
    }
}

// HTTPメソッドごとに名前付きエクスポートを使用
export const POST = sessionMiddleware(handler);