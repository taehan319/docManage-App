/**
 * 販売情報 更新API
 */
import { NextResponse } from 'next/server';
import HttpStatusCodes from '../../../../../lib/httpStatusCodes';
import { appLogger } from '../../../../../lib/logger';
import { extractMeta, getTypeFromURL } from '../../../../../lib/comSUtil';
import UpdateModule from './module';
import { getUserFromCookies } from '../../../../../lib/cookieManager';
// Session管理ミドルウェア
import { sessionMiddleware } from '../../../../../lib/session';
import * as CONST from '../../../../../utilities/contains';
// ファイル操作
import { copyFiles, copyFileToFolder, deleteFile, deleteFolder } from '../../../../../utilities/fileUtils';
// ファイルシステム操作用
import fs from 'fs';
import { resolve } from 'path';

const handler = async (req) => {
    // URLからtypeパラメータを取得
    const updType = getTypeFromURL(req, 'saleMng');
    const logMeta = extractMeta(req, __filename);

    // 更新タイプをバリデーション
    if (updType !== 'mng' && updType !== 'detail') {
        return NextResponse.json({
            message: '無効な操作です'
        }, {
            status: HttpStatusCodes.BAD_REQUEST
        });
    }
    appLogger.debug(`↓↓↓ 販売情報 更新 Start ↓↓↓`, logMeta);
    appLogger.debug(`更新処理タイプ: ${updType}`, logMeta);

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

        // 自社ユーザーかどうかの判定
        const isCompanyUser = userInfo[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_FACTORYID] === String(CONST.USER_OWNERCOMPANY);
        // 権限チェック：自社ユーザーでなければmng更新は許可しない
        if (!isCompanyUser && updType === 'mng') {
            return NextResponse.json({
                message: '販売データの更新権限がありません'
            }, {
                status: HttpStatusCodes.FORBIDDEN
            });
        }

        // 必須パラメータのチェック
        if (!reqData.sale_id) {
            throw new Error('販売IDは必須です');
        }

        // 販売IDのフォルダパスを設定
        const saleDir = resolve(process.cwd()
            , process.env.NEXT_PUBLIC_DIRCTORY_PUBLIC
            , process.env.NEXT_PUBLIC_FOLDER_STORAGE
            , reqData.sale_id.toString());

        // フォルダが存在するか確認し、存在しなければ作成
        if (!fs.existsSync(saleDir)) {
            try {
                fs.mkdirSync(saleDir, { recursive: true });
                appLogger.debug(`販売IDディレクトリを作成しました: ${saleDir}`, logMeta);
            } catch (fsError) {
                appLogger.error(`販売IDフォルダの作成に失敗しました: ${fsError.message}`, logMeta);
                throw new Error('フォルダ作成に失敗しました');
            }
        }

        // ロックファイルのパス
        const lockFilePath = resolve(saleDir, process.env.SALEMNG_LOCK_FILE_NAME);

        // ロックファイルが存在するか確認
        if (fs.existsSync(lockFilePath)) {
            appLogger.warn(`排他ロックファイルが存在します: ${lockFilePath}`, logMeta);
            throw new Error('このデータは現在別のユーザーが編集中です。</br>しばらく経ってから再度お試しください。');
        }

        // ロックファイルを作成
        try {
            fs.writeFileSync(lockFilePath, '', { encoding: 'utf8' });
            appLogger.debug(`排他ロックファイルを作成しました: ${lockFilePath}`, logMeta);
        } catch (lockError) {
            appLogger.error(`排他ロックファイルの作成に失敗しました: ${lockError.message}`, logMeta);
            throw new Error('排他ロックの設定に失敗しました');
        }

        // モジュールのインスタンス生成と初期設定
        const updateModule = new UpdateModule(req);
        updateModule.setData(reqData, updUserId, factoryId, isCompanyUser, updType);

        // ファイルパス生成
        const pathFrom = resolve(process.cwd()
            , process.env.NEXT_PUBLIC_DIRCTORY_PUBLIC
            , process.env.NEXT_PUBLIC_FOLDER_STORAGE
            , reqData.sale_id.toString());
        appLogger.info(`削除対象フォルダパス:${pathFrom}`, logMeta);

        const pathTo = resolve(process.cwd()
            , process.env.NEXT_PUBLIC_DIRCTORY_PUBLIC
            , process.env.NEXT_PUBLIC_FOLDER_STORAGE
            , reqData.sale_id.toString()
            , process.env.UPLOADFILE_BACKUP_FOLDER);
        appLogger.info(`削除対象退避先フォルダパス:${pathTo}`, logMeta);

        // トランザクション実行
        const result = await (async () => {
            // 削除対象ファイルがある場合はBKフォルダに退避
            if (0 < reqData.filesToDelete?.length) {
                try {
                    for (let i = 0; i < reqData.filesToDelete.length; i++) {
                        let file = reqData.filesToDelete[i];
                        // 対象ファイルをバックアップフォルダに退避
                        await copyFileToFolder(req, `${pathFrom}/${file.fileName}`, pathTo, file.fileName);
                        // 元フォルダから削除
                        const delPath = `${pathFrom}/${file.fileName}`;
                        await deleteFile(req, delPath);
                    }
                } catch (err) {
                    throw err;
                }
            }

            // DB更新実行
            try {
                const transactionResult = await new Promise((resolve, reject) => {
                    updateModule.runTransaction((err, result) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    });
                });

                // 成功したら退避したBKフォルダ内のファイルを一括削除
                if (0 < reqData.filesToDelete?.length) {
                    await deleteFolder(req, pathTo);
                }

                return transactionResult;
            } catch (err) {
                // DB更新失敗時、退避したデータをBKから所定のフォルダに戻す
                if (0 < reqData.filesToDelete?.length) {
                    await copyFiles(req, pathTo, pathFrom);
                    // 戻したらBKフォルダ内を削除
                    await deleteFolder(req, pathTo);
                }
                throw err;
            }
        })();

        // 成功レスポンスの返却
        const response = NextResponse.json({
            message: " 更新に成功しました",
            data: result
        }, {
            status: HttpStatusCodes.OK
        });

        appLogger.debug(`販売情報 更新が完了しました`, logMeta);
        return response;
    } catch (error) {
        appLogger.error(`販売情報 更新でエラーが発生しました`, {
            ...logMeta,
            error: error.message
        });

        // エラーメッセージに応じたステータスコードを設定
        let statusCode = HttpStatusCodes.INTERNAL_SERVER_ERROR;
        if (error.message.includes('別のユーザーが編集中です')) {
            statusCode = HttpStatusCodes.CONFLICT; // 409: 競合エラー
        }

        return NextResponse.json({
            message: error.message || '販売情報 更新中にエラーが発生しました'
        }, {
            status: statusCode
        });
    }
}

// HTTPメソッドごとに名前付きエクスポートを使用
export const POST = sessionMiddleware(handler);