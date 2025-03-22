/**
 * ユーザー情報更新API
 */
import { NextResponse } from 'next/server';
import HttpStatusCodes from '../../../lib/httpStatusCodes';
import { appLogger } from '../../../lib/logger';
import { extractMeta } from '../../../lib/comSUtil';
import UpdateModule from './module';
import { getUserFromCookies } from '../../../lib/cookieManager';
import { sessionMiddleware } from '../../../lib/session';

// bcryptjsを使用
const bcrypt = require('bcryptjs');

const handler = async (req) => {
    const logMeta = extractMeta(req, __filename);
    appLogger.debug('↓↓↓ ユーザー情報登録 Start ↓↓↓', logMeta);

    try {
        // リクエストパラメータの取得
        const { id, email, password, name, factoryId } = await req.json();
        
        const userInfo = getUserFromCookies(req);
        const updUserId = userInfo[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ID];

        // パスワードのハッシュ化
        let hashedPassword = '';
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        // モジュールのインスタンス生成と初期設定
        const updateModule = new UpdateModule(req);
        updateModule.setUserData({
            userId: id,
            userName: name,
            email: email,
            password: hashedPassword,
            factoryId: factoryId,
            updUserId: updUserId,
        });

        // トランザクション実行
        const result = await new Promise((resolve, reject) => {
            updateModule.runTransaction((err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        // 成功レスポンスの返却
        const response = NextResponse.json({
            message: "ユーザー更新に成功しました",
            data: result
        }, {
            status: HttpStatusCodes.OK
        });

        appLogger.debug('ユーザー更新が完了しました', logMeta);
        return response;

    } catch (error) {
        appLogger.error('ユーザー更新でエラーが発生しました', {
            ...logMeta,
            error: error.message
        });

        const status = error.message === '既に登録されているメールアドレスです'
            ? HttpStatusCodes.CONFLICT
            : HttpStatusCodes.INTERNAL_SERVER_ERROR;

        return NextResponse.json({
            message: error.message || 'ユーザー更新中にエラーが発生しました'
        }, {
            status: status
        });
    }
}
// HTTPメソッドごとに名前付きエクスポートを使用
export const POST = sessionMiddleware(handler);