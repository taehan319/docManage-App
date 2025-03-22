//////////////////////////////////
// ファイルアップロード(チャンク) //
//////////////////////////////////
import { NextResponse } from 'next/server';
import { open, unlink, mkdir } from 'fs/promises';
import { join, resolve } from 'path';
// HTTPステータスコード定義をインポート
import HttpStatusCodes from '../../../../../lib/httpStatusCodes';
// ロガー
import { appLogger } from '../../../../../lib/logger';
// 共通
import { extractMeta } from '../../../../../lib/comSUtil';
import { sessionMiddleware } from '../../../../../lib/session';

// ドキュメント管理登録モジュール
import RegisterModule from './module';

// チャンクアップロードアクション
const chunkUploadAction = async (request, chunkFormData, metadata) => {
    const logMeta = extractMeta(request, __filename);
    const blob = chunkFormData.get('blob');
    const offset = Number(chunkFormData.get('offset'));
    const isLastChunk = chunkFormData.get('isLastChunk') === 'true';
    const buffer = Buffer.from(await blob.arrayBuffer());
    // ファイル格納ディレクトリ
    const storageDir = resolve(process.cwd(), process.env.NEXT_PUBLIC_DIRCTORY_PUBLIC, process.env.NEXT_PUBLIC_FOLDER_STORAGE, metadata.id);
    const filePath = join(storageDir, metadata.name);
    // ディレクトリが存在しない場合に作成
    try {
        await mkdir(storageDir, { recursive: true });
    } catch (error) {
        let msg = `ディレクトリの作成に失敗しました. >> ${error}`;
        appLogger.error(msg, logMeta);
        throw new Error(msg);
    }

    if (offset === 0) {
        // 最初のチャンクの場合、既存のファイルを削除
        try {
            await unlink(filePath);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                appLogger.error(`ファイル削除中に予期しないエラーが発生しました: ${error}`, logMeta);
            }            
            // ファイルが存在しない場合のエラーは無視
        }
    }
    // ファイルを開き、データを書き込み
    const fileHandle = await open(filePath, 'a'); // 追記モードでファイルを開く
    await fileHandle.write(buffer, 0, buffer.length, offset);
    await fileHandle.close();
    appLogger.debug(`チャンク情報 >> offset:${offset}byte`, logMeta);

    if (isLastChunk) {
        const logMeta = extractMeta(request, __filename);
        appLogger.info(`ファイルアップロード成功. >> ${filePath}`, logMeta);

        // ここでデータベース:ドキュメント管理の更新
        const registerModule = new RegisterModule(request);
        registerModule.setDocumentMng(metadata.id, metadata.name, metadata.flg);
        // トランザクション実行
        try {
            appLogger.debug('↓↓↓ ドキュメント管理登録 Start ↓↓↓', logMeta);
            // クエリ実行をPromiseでラップしてからawaitする
            const result = await new Promise((resolve, reject) => {
                registerModule.runTransaction((err, result) => {
                    if (err) {
                        appLogger.error(`RegisterModule Error:${err}`, logMeta);
                        reject(new Error('ドキュメント管理登録処理に失敗しました.'));
                    }
                    appLogger.debug('ドキュメント管理登録処理成功.', logMeta);
                    resolve(result);
                });
            });
        } catch(error) {
            appLogger.error(`ドキュメント管理登録処理に失敗しました.:${error}`, logMeta);
            throw error;
        } finally {
            appLogger.debug('↑↑↑ ドキュメント管理登録 End ↑↑↑', logMeta);
        }
    }
};

// POSTメソッドハンドラー
const handler = async (request) => {
    const logMeta = extractMeta(request, __filename);
    let isLastChunk = false;
    try {

        const urlSegments = request.nextUrl.pathname.split('/').filter(Boolean);
        const id = urlSegments[urlSegments.length - 2];  // 販売ID
        const flg = urlSegments[urlSegments.length - 1]; // 公開フラグ
        const formData = await request.formData();
        const filename = formData.get('filename')
        const offset = Number(formData.get('offset'));
        isLastChunk = formData.get('isLastChunk') === 'true';
        if (offset === 0) {
            appLogger.info('↓↓↓ ファイルアップロード Start ↓↓↓', logMeta);
            appLogger.info(`アップロードファイル >> ${filename}`, logMeta);
        }

        const metadata = { name: filename, id: id, flg: flg };
        try {
            await chunkUploadAction(request, formData, metadata);
        } catch (error) {
            appLogger.error(`アップロード中のトランザクションエラー: ${error}`, logMeta);
            return NextResponse.json({ error: `アップロード中のトランザクションエラー >> ${error}` }, { status: HttpStatusCodes.INTERNAL_SERVER_ERROR });
        }        
        return NextResponse.json({ message: 'ファイルアップロード成功' }, { status: HttpStatusCodes.OK });
    } catch (error) {
        console.error('アップロード中にエラーが発生しました:', error);
        return NextResponse.json({ error: `ファイルアップロード中にエラーが発生しました. >> ${error}` }, { status: HttpStatusCodes.INTERNAL_SERVER_ERROR });
    } finally {
        if (isLastChunk) {
            appLogger.info('↑↑↑ ファイルアップロード End ↑↑↑', logMeta);
        }
    }
};
// sessionMiddlewareを介し、Session延長
export const POST = sessionMiddleware(handler);
