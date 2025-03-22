/**
 * 販売情報 コピー登録処理API
 */
import { NextResponse } from 'next/server';
import HttpStatusCodes from '../../../lib/httpStatusCodes';
import { appLogger } from '../../../lib/logger';
import db from '../../../lib/transactionManager';
import { extractMeta } from '../../../lib/comSUtil';
import AddModule from './module';
import { getUserFromCookies } from '../../../lib/cookieManager';
// Session管理ミドルウェア
import { sessionMiddleware } from '../../../lib/session';
// ファイル操作
import { copyFileToFolder, deleteFile } from '../../../utilities/fileUtils';
import fs from 'fs';
import { resolve } from 'path';

const handler = async (req) => {
    const logMeta = extractMeta(req, __filename);
    appLogger.debug(`↓↓↓ 販売情報 コピー登録処理 Start ↓↓↓`, logMeta);

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

        let maxSaleId = null;
        // 最大 sale_id の取得
        maxSaleId = await new Promise((resolve, reject) => {
            db.getNextSequenceValue(req, 'sale_id', (err, rows) => {
                if (err) {
                    appLogger.error(`DBエラーが発生しました.>>${err}`, logMeta);
                    return reject(new Error('DBエラーが発生しました.'));
                }
                if (rows.length < 1) {
                    appLogger.error('販売ID発番に失敗しました.', logMeta);
                    return resolve(null);
                }
                resolve(rows);
            });
        });

        if (!maxSaleId) {
            return new NextResponse(JSON.stringify({
                message: 'シーケンス発番処理に失敗しました.',
                data: maxSaleId,
            }), { status: HttpStatusCodes.INTERNAL_SERVER_ERROR });
        }

        // モジュールのインスタンス生成と初期設定
        const addModule = new AddModule(req);
        addModule.setData(maxSaleId, reqData, updUserId, factoryId);
        // ファイルパス生成
        const copyFrom = resolve(process.cwd()
            , process.env.NEXT_PUBLIC_DIRCTORY_PUBLIC
            , process.env.NEXT_PUBLIC_FOLDER_STORAGE
            , reqData.sale_id_from.toString());
        appLogger.info(`ファイルコピー元対象パス:${copyFrom}`, logMeta);

        const copyTo = resolve(process.cwd()
            , process.env.NEXT_PUBLIC_DIRCTORY_PUBLIC
            , process.env.NEXT_PUBLIC_FOLDER_STORAGE
            , maxSaleId.toString());
        appLogger.info(`ファイルコピー先対象パス:${copyTo}`, logMeta);

        // トランザクション実行
        const result = await (async () => {
            // コピー対象ファイルがある場合は所定のフォルダからコピー
            if (0 < reqData.filesToCopy?.length) {
                try {
                    for (let i = 0; i < reqData.filesToCopy.length; i++) {
                        let file = reqData.filesToCopy[i];
                        // 対象ファイルをコピー
                        await copyFileToFolder(req, `${copyFrom}/${file.fileName}`, copyTo, file.fileName);
                    }
                } catch (err) {
                    throw err; // エラーを上位に伝播
                }
            }

            // 販売データのDB登録実行
            return await new Promise((resolve, reject) => {
                addModule.runTransaction((err, result) => {
                    if (err) {
                        // DB更新エラーが発生した場合はコピー追加したファイルを削除
                        if (0 < reqData.filesToCopy?.length) {
                            try {
                                for (let i = 0; i < reqData.filesToCopy.length; i++) {
                                    let file = reqData.filesToCopy[i];
                                    // コピー先フォルダから削除
                                    const delPath = `${copyTo}/${file.fileName}`;
                                    deleteFile(req, delPath);
                                }
                            } catch (fileErr) {
                                return reject(fileErr);
                            }
                        }
                        return reject(err);
                    }
                    resolve(result);
                });
            });
        })();

        // 販売IDのフォルダを作成
        const saleDir = resolve(process.cwd()
            , process.env.NEXT_PUBLIC_DIRCTORY_PUBLIC
            , process.env.NEXT_PUBLIC_FOLDER_STORAGE
            , maxSaleId.toString());

        // フォルダパス
        appLogger.info(`作成フォルダパス:${saleDir}`, logMeta);

        try {
            // 販売IDのディレクトリを作成
            if (!fs.existsSync(saleDir)) {
                fs.mkdirSync(saleDir, { recursive: true });
                appLogger.debug(`販売IDディレクトリを作成しました: ${saleDir}`, logMeta);
            } else {
                appLogger.debug(`販売IDディレクトリは既に存在します: ${saleDir}`, logMeta);
            }
        } catch (fsError) {
            // フォルダ作成に失敗しても処理は続行（エラーログのみ出力）
            appLogger.error(`販売IDフォルダの作成に失敗しました: ${fsError.message}`, logMeta);
        }

        // 成功レスポンスの返却
        const response = NextResponse.json({
            message: "販売データのコピー登録に成功しました",
            data: result
        }, {
            status: HttpStatusCodes.OK
        });

        appLogger.debug(`販売情報 コピー登録処理が完了しました`, logMeta);
        return response;
    } catch (error) {
        appLogger.error(`販売情報 コピー登録処理でエラーが発生しました`, {
            ...logMeta,
            error: error.message
        });

        // エラーメッセージに応じたステータスコードを設定
        let statusCode = HttpStatusCodes.INTERNAL_SERVER_ERROR;
        if (error.message === '対象の販売データが見つかりません') {
            statusCode = HttpStatusCodes.NOT_FOUND;
        } else if (error.message === '販売IDが存在します') {
            statusCode = HttpStatusCodes.CONFLICT;
        }

        return NextResponse.json({
            message: error.message || '登録処理中にエラーが発生しました'
        }, {
            status: statusCode
        });
    }
}

// HTTPメソッドごとに名前付きエクスポートを使用
export const POST = sessionMiddleware(handler);