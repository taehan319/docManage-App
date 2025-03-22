/**
 * ユーザーマスタデータ取得API
*/
import db from '../../../lib/transactionManager';
import HttpStatusCodes from '../../../lib/httpStatusCodes';
import { appLogger } from '../../../lib/logger';
import { extractMeta, StringBuilder } from '../../../lib/comSUtil';
import { NextResponse } from 'next/server';
import { sessionMiddleware } from '../../../lib/session';

const handler = async (req) => {
    const logMeta = extractMeta(req, __filename);
    appLogger.debug('↓↓↓ ユーザーマスタ取得 Start ↓↓↓', logMeta);

    try {
        const sql = new StringBuilder();
        sql.append('SELECT a.*, b.factory_id as partof, b.factory_name as part_name ');
        sql.append('FROM user_mst as a ');
        sql.append('LEFT OUTER JOIN factory_mst as b ');
        sql.append('ON a.factory_id = b.factory_id ');
        sql.append('AND b.del_flg <> "1"');

        // 非同期DBアクセスをPromiseで実装
        const result = await new Promise((resolve, reject) => {
            db.query(req, sql.toString(), [], (err, rows) => {
                if (err) {
                    appLogger.error(`DBエラーが発生しました.>> ${err}`, logMeta);
                    return reject(new Error('DBエラーが発生しました.'));
                }
                if (rows.length < 1) {
                    appLogger.debug('ユーザーマスタ取得に失敗しました.', logMeta);
                    return resolve(null);
                }
                resolve(rows);
            });
        });

        if (!result) {
            return new NextResponse(
            JSON.stringify({ message: 'ユーザーマスタ取得に失敗しました.'}, { status: HttpStatusCodes.UNAUTHORIZED }));
        }

        const response = new NextResponse(
            JSON.stringify({
                message: "ユーザーマスタ取得に成功しました.",
                data: result,
            }),
            { status: HttpStatusCodes.OK }
        );

        appLogger.debug('ユーザーマスタ取得に成功しました.', logMeta);
        return response;
    } catch (error) {
        appLogger.error(`エラーが発生しました.>> ${error}`, logMeta);
        return new NextResponse(JSON.stringify({ message: 'エラーが発生しました.'}, { status: HttpStatusCodes.INTERNAL_SERVER_ERROR }));
    } finally {
        appLogger.debug('↑↑↑ ユーザーマスタ取得 End ↑↑↑', logMeta);
    }
};

// HTTPメソッドごとに名前付きエクスポートを使用
export const POST = sessionMiddleware(handler);
