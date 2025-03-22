////////////////////////
// 販売情報 コピー登録処理モジュール //
////////////////////////
// データベース接続をインポート
import db from '../../../lib/transactionManager';
import { StringBuilder } from '../../../lib/comSUtil';
import * as CONST from '../../../utilities/contains';

class AddModule extends db.TransactionManager {
    constructor(req) {
        super(req);
        this.newSaleId = null;
        this.reqData = null;
        this.updUserId = null;
        this.factoryId = null;
        this.logMeta = {}; // logMetaの初期化
    }

    async executeTransaction(callback) {
        try {
            // sale_mngテーブルへの登録処理
            // 1. 販売IDの重複チェック
            const checkSql = 'SELECT COUNT(*) as count FROM sale_mng WHERE sale_id = ?';
            const checkResult = await new Promise((resolve, reject) => {
                this.query(checkSql, [this.newSaleId], (err, result) => {
                    if (err) return reject(err);
                    resolve(result[0]);
                });
            });

            if (checkResult.count > 0) {
                return callback(new Error('販売IDが存在します'));
            }

            // 2. sale_mngテーブルにデータを登録
            let sqlMng = new StringBuilder();
            sqlMng.append("INSERT INTO sale_mng (");
            sqlMng.append("sale_id, maker_id, document_id, product_no, contract_ym, brand_id, ");
            sqlMng.append("finishing, item_category_id, item_id, ");
            sqlMng.append("quantity, deadline_ymd, remarks, cost, status, invoice_ym, update_date, update_user_id");
            sqlMng.append(") VALUES (");
            sqlMng.append("?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?");
            sqlMng.append(")");

            const now = new Date();
            const paramsMng = [
                this.newSaleId,
                this.reqData.maker_id,
                this.newSaleId, // document_id
                this.reqData.product_no,
                this.reqData.contract_ym,
                this.reqData.brand_id,
                this.reqData.finishing || 1, // デフォルトは1:なし
                this.reqData.item_category_id,
                this.reqData.item_id,
                this.reqData.quantity,
                this.reqData.deadline_ymd,
                this.reqData.remarks || '',
                this.reqData.cost,
                this.reqData.status || 0, // デフォルトは0:未着手
                this.reqData.invoice_ym,
                now,
                this.updUserId
            ];

            await new Promise((resolve, reject) => {
                this.query(sqlMng.toString(), paramsMng, (err, result) => {
                    if (err) return reject(err);
                    if (result.affectedRows === 0) {
                        return reject(new Error('登録処理に失敗しました'));
                    }
                    resolve(result);
                });
            });

            // 3. sale_detailテーブルに自社レコードを作成
            let sqlDetail = new StringBuilder();
            sqlDetail.append("INSERT INTO sale_detail (");
            sqlDetail.append("sale_id, factory_id, quantity, deadline_ymd, remarks, cost, status, cloth_arrival_ymd, cloth_arrival_flg, update_date, update_user_id");
            sqlDetail.append(") VALUES (");
            sqlDetail.append("?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?");
            sqlDetail.append(")");

            const paramsDetail = [
                this.newSaleId,
                CONST.USER_OWNERCOMPANY, // 自社工場ID
                this.reqData.quantity,
                this.reqData.deadline_ymd,
                '', // detailの備考は空で登録する
                this.reqData.cost,
                this.reqData.status || 0, // デフォルトは0:未着手
                this.reqData.cloth_arrival_ymd,
                this.reqData.cloth_arrival_flg || 0,
                now,
                this.updUserId
            ];

            await new Promise((resolve, reject) => {
                this.query(sqlDetail.toString(), paramsDetail, (err, result) => {
                    if (err) return reject(err);
                    if (result.affectedRows === 0) {
                        return reject(new Error('詳細データの登録に失敗しました'));
                    }
                    resolve(result);
                });
            });

            // 4.コピーしたファイルをdocument_mngへ登録
            if (this.reqData.filesToCopy && this.reqData.filesToCopy.length > 0) {
                for (const file of this.reqData.filesToCopy) {
                    // 枝番を発番
                    const branchNo = await new Promise((resolve, reject) => {
                        db.getNextSequenceValue(this.request, 'branch_no', (err, result) => {
                            if (err) return reject(err);
                            resolve(result);
                        });
                    });

                    if (!branchNo) {
                        appLogger.error(`ドキュメント管理.枝番発番に失敗しました.>>document_id=${this.newSaleId} file_name=${file.fileName}`, this.logMeta);
                        throw new Error('シーケンス発番処理に失敗しました。');
                    }

                    let sqlDocment = new StringBuilder();

                    sqlDocment.append("INSERT INTO document_mng (");
                    sqlDocment.append("document_id, branch_no, upd_factory_id, file_name, publish_flg, update_date, update_user_id");
                    sqlDocment.append(") VALUES (");
                    sqlDocment.append("?, ?, ?, ?, ?, ?, ?");
                    sqlDocment.append(")");

                    const paramsDocument = [
                        this.newSaleId,
                        branchNo,
                        this.factoryId, // ログインユーザーの工場ID(基本的に自社以外ありえない)
                        file.fileName,
                        file.publishFlag || 0,
                        now,
                        this.updUserId
                    ];

                    await new Promise((resolve, reject) => {
                        this.query(sqlDocment.toString(), paramsDocument, (err, result) => {
                            if (err) return reject(err);
                            if (result.affectedRows === 0) {
                                return reject(new Error('ドキュメントデータの登録に失敗しました'));
                            }
                            resolve(result);
                        });
                    });
                }
            }
            // 発番したIDを返却
            callback(null, {
                success: true,
                message: '登録処理が完了しました',
                newSaleId: this.newSaleId
            });
        } catch (error) {
            callback(error);
        }
    }

    setData(newSaleId, reqData, updUserId, factoryId) {
        this.newSaleId = newSaleId;
        this.reqData = reqData;
        this.updUserId = updUserId;
        this.factoryId = factoryId;
    }
}

export default AddModule;