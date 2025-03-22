//////////////////////////////
// ファイル操作ユーティリティ //
//////////////////////////////
const fs = require('fs/promises'); // fs/promisesを使用
const path = require('path');
// ロガー
import { appLogger } from '../lib/logger';
// 共通
import { extractMeta } from '../lib/comSUtil';

/**
 * ファイルをコピーする関数
 * @param {Request} req         - Requestオブジェクト
 * @param {string} sourceFolder - コピー元フォルダのパス
 * @param {string} targetFolder - コピー先フォルダのパス
 */
export const copyFiles = async (req, sourceFolder, targetFolder) => {
    // コピー元フォルダが存在しない場合は処理終了
    if (!(await folderExists(sourceFolder))) {
        return;
    }

    const logMeta = extractMeta(req, __filename);

    try {
        // コピー先フォルダが存在しない場合は作成
        if (!(await folderExists(targetFolder))) {
            await fs.mkdir(targetFolder, { recursive: true });
        }

        const files = await fs.readdir(sourceFolder);

        await Promise.all(files.map(async (file) => {
            const sourcePath = path.join(sourceFolder, file);
            const targetPath = path.join(targetFolder, file);

            try {
                await fs.copyFile(sourcePath, targetPath);
                appLogger.debug(`コピー完了: ${sourcePath} => ${targetPath}`, logMeta);
            } catch (err) {
                appLogger.error(`コピー中にエラーが発生しました: folder=${targetFolder}, file=${file}, error=${err.message}`, logMeta);
                throw err;
            }
        }));
    } catch (err) {
        appLogger.error(`コピー処理中にエラーが発生しました: error=${err.message}`, logMeta);
        throw err;
    }
};

/**
 * 指定されたファイルを削除する関数
 * @param {Request} req     - Requestオブジェクト
 * @param {string} filePath - 削除対象ファイルのパス
 */
export const deleteFile = async (req, filePath) => {
    const logMeta = extractMeta(req, __filename);
    try {
        await fs.unlink(filePath);
        appLogger.debug(`ファイル削除完了: ${filePath}`, logMeta);
    } catch (err) {
        appLogger.error(`ファイル削除中にエラーが発生しました: file=${filePath}, error=${err.message}`, logMeta);
        throw err;
    }
};

/**
 * 指定されたフォルダとその中身を削除する関数
 * @param {Request} req       - Requestオブジェクト
 * @param {string} folderPath - 削除対象フォルダのパス
 */
export const deleteFolder = async (req, folderPath) => {
    const logMeta = extractMeta(req, __filename);
    try {
        await fs.rm(folderPath, { recursive: true, force: true });
        appLogger.debug(`フォルダ削除完了: ${folderPath}`, logMeta);
    } catch (err) {
        appLogger.error(`フォルダ削除中にエラーが発生しました: folderPath=${folderPath}, error=${err.message}`, logMeta);
        throw err;
    }
};

/**
 * 指定されたファイルを指定フォルダにコピーする関数（コピー先のファイル名を指定可能）
 * @param {Object} req - Requestオブジェクト
 * @param {string} sourceFilePath - コピー元ファイルのパス
 * @param {string} targetFolder - コピー先フォルダのパス
 * @param {string} [targetFileName] - コピー先のファイル名（省略可能）
 */
export const copyFileToFolder = async (req, sourceFilePath, targetFolder, targetFileName) => {
    const logMeta = extractMeta(req, __filename);

    try {
        // コピー元ファイルが存在するか確認
        try {
            await fs.access(sourceFilePath);
        } catch (err) {
            appLogger.error(`コピー元ファイルが存在しません: ${sourceFilePath}`, logMeta);
            throw new Error(`コピー元ファイルが存在しません: ${sourceFilePath}`);
        }

        // コピー先フォルダが存在しない場合は作成
        if (!(await folderExists(targetFolder))) {
            await fs.mkdir(targetFolder, { recursive: true });
        }

        // コピー先のファイル名を決定
        const fileName = targetFileName || path.basename(sourceFilePath);
        const targetFilePath = path.join(targetFolder, fileName); // コピー先パスを生成

        // ファイルコピー
        await fs.copyFile(sourceFilePath, targetFilePath);
        appLogger.debug(`ファイルコピー完了: ${sourceFilePath} => ${targetFilePath}`, logMeta);
    } catch (err) {
        appLogger.error(`ファイルコピー中にエラーが発生しました: sourceFile=${sourceFilePath}, targetFolder=${targetFolder}, targetFileName=${targetFileName}, error=${err.message}`, logMeta);
        throw err; // 必要に応じて例外をスロー
    }
};

/**
 * フォルダの存在を確認するヘルパー関数
 * @param {string} folderPath - 確認対象のフォルダパス
 * @returns {Promise<boolean>}
 */
const folderExists = async (folderPath) => {
    try {
        await fs.access(folderPath);
        return true;
    } catch {
        return false;
    }
};