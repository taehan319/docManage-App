/**
 * 販売IDに紐づくドキュメント取得
 */
import db from '../../../lib/transactionManager';
import HttpStatusCodes from '../../../lib/httpStatusCodes';
import { appLogger } from '../../../lib/logger';
import { extractMeta, StringBuilder } from '../../../lib/comSUtil';
import { NextResponse } from 'next/server';
import { sessionMiddleware } from '../../../lib/session';
import { getUserFromCookies } from '../../../lib/cookieManager';
import * as CONST from '../../../utilities/contains';

const handler = async (req) => {
  const logMeta = extractMeta(req, __filename);
  appLogger.debug('↓↓↓ 販売IDに紐づくドキュメント取得 Start ↓↓↓', logMeta);

  const params = [];

  try {
    // ユーザー情報取得
    const userInfo = getUserFromCookies(req);
    if (!userInfo) {
      return NextResponse.json({
        message: "ログインされていません。"
      }, {
        status: HttpStatusCodes.UNAUTHORIZED
      });
    }
    const isAdmin = (userInfo[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ADMINFLG] === String(CONST.USER_ADMIN));
    // リクエストパラメータの取得
    const { saleId } = await req.json();
    
    if (!saleId) {
      return NextResponse.json({
        message: "販売IDが指定されていません。"
      }, {
        status: HttpStatusCodes.BAD_REQUEST
      });
    }

    const sql = new StringBuilder();
    // 販売IDに紐づくすべてを取得
    sql.append('SELECT * ');
    sql.append('FROM document_mng ');
    sql.append('WHERE document_id = ? ');
    params.push(saleId);

    // 更新日の新しい順、ID、枝番の小さい順でソート
    sql.append(' ORDER BY update_date DESC, document_id, branch_no');

    // 非同期DBアクセスをPromiseで実装
    const result = await new Promise((resolve, reject) => {
      db.query(req, sql.toString(), params, (err, results) => {
        if (err) {
          appLogger.error(`DBエラーが発生しました。>> ${err}`, logMeta);
          return reject(new Error('ファイル一覧の取得に失敗しました.'));
        }
        resolve(results);
      });
    });

    // 成功レスポンス
    return NextResponse.json({
      message: "販売IDに紐づくドキュメント取得に成功しました。",
      data: result,
    }, {
      status: HttpStatusCodes.OK
    });
    
  } catch (error) {
    appLogger.error(`エラーが発生しました。>> ${error}`, logMeta);
    return NextResponse.json({
      message: error.message || "エラーが発生しました。"
    }, { 
      status: HttpStatusCodes.INTERNAL_SERVER_ERROR 
    });
  } finally {
    appLogger.debug('↑↑↑ 販売IDに紐づくドキュメント取得 End ↑↑↑', logMeta);
  }
};

// HTTPメソッドごとに名前付きエクスポートを使用
export const POST = sessionMiddleware(handler);