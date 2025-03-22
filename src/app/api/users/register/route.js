/**
 * ユーザー新規登録API
 */
import { NextResponse } from 'next/server';
import HttpStatusCodes from '../../../lib/httpStatusCodes';
import { appLogger } from '../../../lib/logger';
import { extractMeta } from '../../../lib/comSUtil';
import RegisterModule from './module';
import db from '../../../lib/transactionManager';
import { getUserFromCookies } from '../../../lib/cookieManager';
import { sessionMiddleware } from '../../../lib/session';

// bcryptjsを使用
const bcrypt = require('bcryptjs');

const handler = async (req) => {
    const logMeta = extractMeta(req, __filename);
    appLogger.debug('↓↓↓ ユーザー情報登録 Start ↓↓↓', logMeta);

    try {
        // リクエストパラメータの取得
        const { email, password, name, factoryId } = await req.json();

        const userInfo = getUserFromCookies(req);
        const updUserId = userInfo[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ID];

        // パスワードのハッシュ化
        const hashedPassword = await bcrypt.hash(password, 10);

        // 最大ユーザーIDの取得
        const maxUserId = await new Promise((resolve, reject) => {
          db.getNextSequenceValue(req, 'user_id', (err, rows) => {
            if (err) {
              appLogger.error(`DBエラーが発生しました.>>${err}`, logMeta);
              return reject(new Error('DBエラーが発生しました.'));
            }
            if (rows.length < 1) {
              appLogger.error('ユーザーID発番に失敗しました.', logMeta);
              return resolve(null);
            }
            resolve(rows);
          });
        });

        if (!maxUserId) {
          return new NextResponse(JSON.stringify({
            message: 'シーケンス発番処理に失敗しました.',
            data: maxUserId,
          }), { status: HttpStatusCodes.INTERNAL_SERVER_ERROR });
        }

        // モジュールのインスタンス生成と初期設定
        const registerModule = new RegisterModule(req);
        registerModule.setNewUserId(maxUserId);
        registerModule.setUserData({
            userName: name,
            email: email,
            password: hashedPassword,
            factoryId: factoryId,
            updUserId: updUserId,
        });

        // トランザクション実行
        const result = await new Promise((resolve, reject) => {
            registerModule.runTransaction((err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        // 成功レスポンスの返却
        const response = NextResponse.json({
            message: "ユーザー登録に成功しました",
            data: result
        }, {
            status: HttpStatusCodes.OK
        });

        appLogger.debug('ユーザー登録が完了しました', logMeta);
        return response;

    } catch (error) {
        appLogger.error('ユーザー登録でエラーが発生しました', {
            ...logMeta,
            error: error.message
        });

        const status = error.message === '既に登録されているメールアドレスです'
            ? HttpStatusCodes.CONFLICT
            : HttpStatusCodes.INTERNAL_SERVER_ERROR;

        return NextResponse.json({
            message: error.message || 'ユーザー登録中にエラーが発生しました'
        }, {
            status: status
        });
    }
}
// HTTPメソッドごとに名前付きエクスポートを使用
export const POST = sessionMiddleware(handler);