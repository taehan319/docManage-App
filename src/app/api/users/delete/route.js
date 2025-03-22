/**
 * ユーザー新規登録API
 */
import { NextResponse } from 'next/server';
import HttpStatusCodes from '../../../lib/httpStatusCodes';
import { appLogger } from '../../../lib/logger';
import { extractMeta } from '../../../lib/comSUtil';
import DeleteModule from './module';
import { sessionMiddleware } from '../../../lib/session';

const handler = async (req) => {
    const logMeta = extractMeta(req, __filename);
    appLogger.debug('↓↓↓ ユーザー削除 Start ↓↓↓', logMeta);

    try {
        // リクエストパラメータの取得
        const { userIds } = await req.json();

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json(
                { error: '削除対象のユーザーIDが指定されていません' },
                { status: 400 }
            );
        }

        // モジュールのインスタンス生成と初期設定
        const deleteModule = new DeleteModule(req);
        deleteModule.setUserData({
            userIds: userIds
        });

        // トランザクション実行
        const result = await new Promise((resolve, reject) => {
            deleteModule.runTransaction((err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        // 成功レスポンスの返却
        const response = NextResponse.json({
            message: "ユーザー削除に成功しました",
            data: result
        }, {
            status: HttpStatusCodes.OK
        });

        appLogger.debug('ユーザー削除が完了しました', logMeta);
        return response;

    } catch (error) {
        appLogger.error('ユーザー削除でエラーが発生しました', {
            ...logMeta,
            error: error.message
        });

        return NextResponse.json({
            message: error.message || 'ユーザー削除中にエラーが発生しました'
        }, {
            status: HttpStatusCodes.INTERNAL_SERVER_ERROR
        });
    }
}
// HTTPメソッドごとに名前付きエクスポートを使用
export const POST = sessionMiddleware(handler);