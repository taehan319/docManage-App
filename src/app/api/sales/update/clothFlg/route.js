/**
 * 販売情報 生地到着フラグ更新API
 */
import { NextResponse } from 'next/server';
import HttpStatusCodes from '../../../../lib/httpStatusCodes';
import { appLogger } from '../../../../lib/logger';
import { extractMeta } from '../../../../lib/comSUtil';
import UpdateStatusModule from './module';
import { getUserFromCookies } from '../../../../lib/cookieManager';
// Session管理ミドルウェア
import { sessionMiddleware } from '../../../../lib/session';

const handler = async (req) => {
    const logMeta = extractMeta(req, __filename);
    appLogger.debug(`↓↓↓ 販売情報 生地到着フラグ更新 Start ↓↓↓`, logMeta);

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

        // 必須パラメータのチェック
        if (!reqData.saleId) {
            throw new Error('販売IDは必須です');
        }

        // 必須パラメータチェック
        if (reqData.clothFlg === undefined) {
            throw new Error('衣類フラグは必須です');
        }

        // 更新データの準備
        const updateData = {
            ...reqData,
            updateUserId: updUserId,
            factoryId: factoryId,
        };

        // モジュールのインスタンス生成と初期設定
        const updateModule = new UpdateStatusModule(req);
        updateModule.setUpdateData(updateData);

        // トランザクション実行
        const result = await new Promise((resolve, reject) => {
            updateModule.runTransaction((err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        // 成功レスポンスの返却
        const response = NextResponse.json({
            message: " 生地到着フラグ更新に成功しました",
            data: result
        }, {
            status: HttpStatusCodes.OK
        });

        appLogger.debug(`販売情報 生地到着フラグ更新が完了しました`, logMeta);
        return response;
    } catch (error) {
        appLogger.error(`販売情報 生地到着フラグ更新でエラーが発生しました`, {
            ...logMeta,
            error: error.message
        });

        return NextResponse.json({
            message: error.message || '販売情報 生地到着フラグ更新中にエラーが発生しました'
        }, {
            status: HttpStatusCodes.INTERNAL_SERVER_ERROR
        });
    }
}

// HTTPメソッドごとに名前付きエクスポートを使用
export const POST = sessionMiddleware(handler);