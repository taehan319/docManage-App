/**
 * 販売情報 キャンセル処理API
 */
import { NextResponse } from 'next/server';
import HttpStatusCodes from '../../../../lib/httpStatusCodes';
import { appLogger } from '../../../../lib/logger';
import { extractMeta, getTypeFromURL } from '../../../../lib/comSUtil';
import CancelModule from './module';
import { getUserFromCookies } from '../../../../lib/cookieManager';
// Session管理ミドルウェア
import { sessionMiddleware } from '../../../../lib/session';
import * as CONST from '../../../../utilities/contains';

const handler = async (req) => {
    // URLからtypeパラメータを取得
    const cancelType = getTypeFromURL(req, 'cancel');
    const logMeta = extractMeta(req, __filename);

    // キャンセルタイプをバリデーション
    if (cancelType !== 'mng' && cancelType !== 'detail') {
        return NextResponse.json({
            message: '無効な操作です'
        }, {
            status: HttpStatusCodes.BAD_REQUEST
        });
    }

    appLogger.debug(`↓↓↓ 販売情報 キャンセル処理 Start ↓↓↓`, logMeta);

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

        // リクエストパラメータの取得とバリデーション
        const { saleId } = await req.json();

        // 必須パラメータのチェック
        if (!saleId) {
            return NextResponse.json({
                message: '販売IDが指定されていません'
            }, {
                status: HttpStatusCodes.BAD_REQUEST
            });
        }

        // 自社ユーザーかどうかの判定
        const isCompanyUser = userInfo[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_FACTORYID] === String(CONST.USER_OWNERCOMPANY);
        // 権限チェック：自社ユーザーでなければmngキャンセルは許可しない
        if (!isCompanyUser && cancelType === 'mng') {
            return NextResponse.json({
                message: '販売データのキャンセル権限がありません'
            }, {
                status: HttpStatusCodes.FORBIDDEN
            });
        }

        // モジュールのインスタンス生成と初期設定
        const cancelModule = new CancelModule(req);
        cancelModule.setData(saleId, userInfo, isCompanyUser, cancelType);

        // トランザクション実行
        const result = await new Promise((resolve, reject) => {
            cancelModule.runTransaction((err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        // 成功レスポンスの返却
        const response = NextResponse.json({
            message: " 状態更新に成功しました",
            data: result
        }, {
            status: HttpStatusCodes.OK
        });

        appLogger.debug(`販売情報 キャンセル処理が完了しました`, logMeta);
        return response;
    } catch (error) {
        appLogger.error(`販売情報 キャンセル処理でエラーが発生しました`, {
            ...logMeta,
            error: error.message
        });

        // エラーメッセージに応じたステータスコードを設定
        let statusCode = HttpStatusCodes.INTERNAL_SERVER_ERROR;
        if (error.message === '対象の販売データが見つかりません') {
            statusCode = HttpStatusCodes.NOT_FOUND;
        } else if (error.message === '既にキャンセル済みです') {
            statusCode = HttpStatusCodes.CONFLICT;
        }

        return NextResponse.json({
            message: error.message || 'キャンセル処理中にエラーが発生しました'
        }, {
            status: statusCode
        });
    }
}

// HTTPメソッドごとに名前付きエクスポートを使用
export const POST = sessionMiddleware(handler);