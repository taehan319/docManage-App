////////////////////////////////////
// アップロードファイル削除ルーター ///
////////////////////////////////////
import { NextResponse } from 'next/server';
import { resolve } from 'path';
// HTTPステータスコード定義をインポート
import HttpStatusCodes from '../../../../lib/httpStatusCodes';
// ロガー
import { appLogger } from '../../../../lib/logger';
// 共通
import { extractMeta } from '../../../../lib/comSUtil';
import { deleteFile } from '../../../../utilities/fileUtils';
import { sessionMiddleware } from '../../../../lib/session';


/**
 * POSTメソッドハンドラー
 * 
 * id指定された販売IDからstorageに格納されているロックファイルを削除する.
 * 
 * @param {Request} request   - Requestオブジェクト
 */
const handler = async (request) => {
    const logMeta = extractMeta(request, __filename);
    appLogger.info('↓↓↓ ロックファイル削除 Start ↓↓↓', logMeta);
    try {
        const urlSegments = request.nextUrl.pathname.split('/').filter(Boolean);
        // 販売ID取得
        const id = urlSegments[urlSegments.length - 1];
        // ロックファイルパス
        const lockFilePath = resolve(process.cwd()
            , process.env.NEXT_PUBLIC_DIRCTORY_PUBLIC
            , process.env.NEXT_PUBLIC_FOLDER_STORAGE
            , id
            , process.env.SALEMNG_LOCK_FILE_NAME);
        appLogger.info(`削除対象パス:${lockFilePath}`, logMeta);

        deleteFile(request, lockFilePath);
        return NextResponse.json({ message: 'ロックファイル削除成功' }, { status: HttpStatusCodes.OK });
    } catch (error) {
        appLogger.error(`ロックファイル削除中にエラーが発生しました:${error}`, logMeta);
        // ここでのエラーは無視する
        return NextResponse.json({ message: 'ロックファイル削除失敗' }, { status: HttpStatusCodes.OK });
    } finally {
        appLogger.info('↑↑↑ ロックファイル削除 End ↑↑↑', logMeta);
    }
};
// sessionMiddlewareを介し、Session延長
export const GET = sessionMiddleware(handler);