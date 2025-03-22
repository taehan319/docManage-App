////////////////////////
// ドキュメント管理登録 //
////////////////////////
// データベース接続をインポート
import db from '../../../../../lib/transactionManager';
import { extractMeta, StringBuilder } from '../../../../../lib/comSUtil';
import { getUserFromCookies } from '../../../../../lib/cookieManager';
const util = require('util');
const getNextSequenceValue = util.promisify(db.getNextSequenceValue);

class RegisterModule extends db.TransactionManager {
    constructor(request) {
        super(request);
        this.document_id = null;
        this.file_name = "";
        this.publish_flg = '1';
    }

    async executeTransaction(callback) {
        const logMeta = extractMeta(this.request, __filename);
        try {
            // 枝番を発番
            const branchNo = await getNextSequenceValue(this.request, 'branch_no');
            if (!branchNo || branchNo.length < 1) {
                appLogger.error(`ドキュメント管理.枝番発番に失敗しました.>>document_id=${this.document_id} file_name=${this.file_name} publish_flg=${this.publish_flg}`, logMeta);
                throw new Error(JSON.stringify({
                    message: 'シーケンス発番処理に失敗しました。',
                    branchNo,
                }));
            }

            // ドキュメント管理登録
            const insertSql = new StringBuilder()
                .append("INSERT INTO document_mng(")
                .append("document_id, branch_no, upd_factory_id, file_name, publish_flg, update_date, update_user_id")
                .append(") VALUES (?,?,?,?,?,?,?)")
                .toString();

            // セッション情報取得
            const userInfo = getUserFromCookies(this.request);
            const updUserId = userInfo[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ID];
            const updFactoryId = userInfo[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_FACTORYID];
            if (!userInfo || !userInfo[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ID]) {
                appLogger.error('セッション情報の取得に失敗しました.', logMeta);
                throw new Error('セッション情報が取得できませんでした.');
            }        
            const now = new Date();
            const params = [
                 this.document_id  // ドキュメント管理ID
                ,branchNo          // 枝番
                ,updFactoryId      // 更新工場ID
                ,this.file_name    // ファイル名
                ,this.publish_flg  // 公開フラグ
                ,now               // 最終更新日時
                ,updUserId || null // 最終更新ユーザID
            ];

            await new Promise((resolve, reject) => {
                this.query(insertSql, params, (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });

            callback(null, { branchNo: branchNo });

        } catch (error) {
            callback(error);
        }
    }

    /**
     * ドキュメント管理情報設定
     * @param {string} documentId - ドキュメント管理ID
     * @param {string} filename   - ファイル名
     * @param {string} publishFlg - 公開フラグ
     */
    setDocumentMng(documentId, filename, publishFlg) {
        this.document_id = documentId;
        this.file_name = filename;
        this.publish_flg = publishFlg;
    }
}

export default RegisterModule;