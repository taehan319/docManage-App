////////////////////////
// 販売情報 更新モジュール //
////////////////////////
// データベース接続をインポート
import db from '../../../../../lib/transactionManager';
import { StringBuilder } from '../../../../../lib/comSUtil';
import * as CONST from '../../../../../utilities/contains';

class UpdateModule extends db.TransactionManager {
    constructor(req) {
        super(req);
        this.reqData = null;
        this.updUserId = null;
        this.factoryId = null;
        this.isCompanyUser = false;
        this.updType = 'mng'; // デフォルトはmng
    }

    async executeTransaction(callback) {
        try {
            // 更新日
            const updateDate = new Date();

            /** 自社工場ユーザーの場合のみsale_mngを更新 */
            if (this.updType === 'mng') {
                // 1.販売詳細(sale_detail)からステータスの最小値を取得
                const minStatusSql = `
                    SELECT MIN(status) as min_status 
                    FROM sale_detail 
                    WHERE sale_id = ?
                `;

                const minStatus = await new Promise((resolve, reject) => {
                    this.query(minStatusSql, [this.reqData.sale_id], (err, result) => {
                        if (err) return reject(err);
                        // 結果が空の場合や最小値がnullの場合は元のstatusを使用
                        const status = result.length > 0 && result[0].min_status !== null
                            ? result[0].min_status
                            : this.reqData.status;
                        resolve(status);
                    });
                });

                // 2.sale_mngの更新
                let sql = new StringBuilder();
                let params = [];

                // 指定された販売IDの更新
                sql.append("UPDATE sale_mng SET ");

                sql.append("maker_id = ?, ");
                params.push(this.reqData.maker_id);

                sql.append("product_no = ?, ");
                params.push(this.reqData.product_no);

                sql.append("contract_ym = ?, ");
                params.push(this.reqData.contract_ym);

                sql.append("brand_id = ?, ");
                params.push(this.reqData.brand_id);

                sql.append("finishing = ?, ");
                params.push(this.reqData.finishing);

                sql.append("item_category_id = ?, ");
                params.push(this.reqData.item_category_id);

                sql.append("item_id = ?, ");
                params.push(this.reqData.item_id);

                sql.append("quantity = ?, ");
                params.push(this.reqData.quantity);

                sql.append("deadline_ymd = ?, ");
                params.push(this.reqData.deadline_ymd);

                sql.append("remarks = ?, ");
                params.push(this.reqData.remarks);

                sql.append("cost = ?, ");
                params.push(this.reqData.cost);

                sql.append("status = ?, ");
                params.push(minStatus);

                sql.append("invoice_ym = ?, ");
                params.push(this.reqData.invoice_ym);
                
                sql.append("update_date = ?, ");
                params.push(updateDate);

                sql.append("update_user_id = ? ");
                params.push(this.updUserId);

                // 条件句の追加
                sql.append("WHERE sale_id = ?");
                params.push(this.reqData.sale_id);

                // クエリの実行
                await new Promise((resolve, reject) => {
                    this.query(sql.toString(), params, (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    });
                });

                // 3. 自社詳細(sale_detail)の納期、工賃、生地入荷情報を更新する
                let updateDetailSql = new StringBuilder();
                updateDetailSql.append('UPDATE sale_detail SET ');
                updateDetailSql.append('cost = ?, ');
                updateDetailSql.append('deadline_ymd = ?, ');
                updateDetailSql.append('cloth_arrival_ymd = ?, ');
                updateDetailSql.append('cloth_arrival_flg = ?, ');
                updateDetailSql.append('update_date = ?, ');
                updateDetailSql.append('update_user_id = ? ');
                updateDetailSql.append('WHERE sale_id = ? ');
                updateDetailSql.append('AND factory_id = ? ');

                const detailParams = [
                    this.reqData.cost,
                    this.reqData.deadline_ymd,
                    this.reqData.cloth_arrival_ymd,
                    this.reqData.cloth_arrival_flg,
                    updateDate,
                    this.updUserId,
                    this.reqData.sale_id,
                    CONST.ADMIN_FACTORY_ID
                ];

                await new Promise((resolve, reject) => {
                    this.query(updateDetailSql.toString(), detailParams, (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    });
                });
            } else if (this.updType === 'detail') {
                // 他社ユーザーの場合は生地入荷情報のみを更新
                // 3. 自社詳細(sale_detail)の納期、工賃を更新する
                const updateSql = `
                    UPDATE sale_detail SET 
                    cloth_arrival_ymd = ?, 
                    cloth_arrival_flg = ?, 
                    remarks = ?, 
                    update_date = ?, 
                    update_user_id = ?
                    WHERE sale_id = ?
                    AND factory_id = ?
                `;
                const params = [
                    this.reqData.cloth_arrival_ymd,
                    this.reqData.cloth_arrival_flg,
                    this.reqData.remarks,
                    updateDate,
                    this.updUserId,
                    this.reqData.sale_id,
                    this.factoryId
                ];

                await new Promise((resolve, reject) => {
                    this.query(updateSql, params, (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    });
                });
            } else {
                return callback(new Error('不正なアクセスです'));
            }

            /** ↓↓↓ ここから自社・他社共通処理 ↓↓↓ */
            // 既存ファイルの公開フラグ更新
            const updFlgSql = new StringBuilder();
            updFlgSql.append('UPDATE document_mng SET ');
            updFlgSql.append('publish_flg = ?, ');
            updFlgSql.append('update_date = ?, ');
            updFlgSql.append('update_user_id = ? ');
            updFlgSql.append('WHERE document_id = ? ');
            updFlgSql.append('AND branch_no ');

            // 公開→非公開
            const publicToPrivateFiles = this.reqData.documentsToUpdateFlag.filter(doc => doc.publishFlag === "0");
            if (0 < publicToPrivateFiles.length) {
                // IN句作成
                const toPrivateSql = new StringBuilder();
                toPrivateSql.append(updFlgSql.toString());
                toPrivateSql.append(db.inQuery(publicToPrivateFiles));

                const toPrivateParams = [];
                toPrivateParams.push(CONST.FLG_OFF);
                toPrivateParams.push(updateDate);
                toPrivateParams.push(this.updUserId);
                toPrivateParams.push(this.reqData.document_id);
                let index = 0;
                while (index < publicToPrivateFiles.length) {
                    toPrivateParams.push(publicToPrivateFiles[index].branchNo);
                    index++;
                }

                // SQL実行
                await new Promise((resolve, reject) => {
                    this.query(toPrivateSql.toString(), toPrivateParams, (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    });
                });
            }

            // 非公開→公開
            const privateToPublicFiles = this.reqData.documentsToUpdateFlag.filter(doc => doc.publishFlag === "1");
            if (0 < privateToPublicFiles.length) {
                // IN句作成
                const toPublicSql = new StringBuilder();
                toPublicSql.append(updFlgSql.toString());
                toPublicSql.append(db.inQuery(privateToPublicFiles));

                const toPublicParams = [];
                toPublicParams.push(CONST.FLG_ON);
                toPublicParams.push(updateDate);
                toPublicParams.push(this.updUserId);
                toPublicParams.push(this.reqData.document_id);
                let index = 0;
                while (index < privateToPublicFiles.length) {
                    toPublicParams.push(privateToPublicFiles[index].branchNo);
                    index++;
                }

                // SQL実行
                await new Promise((resolve, reject) => {
                    this.query(toPublicSql.toString(), toPublicParams, (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    });
                });
            }

            // 削除対象ファイルがある場合はドキュメント管理テーブルから削除する
            const deleteFiles = this.reqData.filesToDelete;
            let deleteBranchs = [];
            // deleteFilesからbranch_no値を抽出する
            if (deleteFiles && deleteFiles.length > 0) {
                // deleteFilesがオブジェクトの配列である場合（各オブジェクトにbranch_noプロパティがある）
                deleteBranchs = deleteFiles.map(file => file.branchNo);

                const deleteDocSql = new StringBuilder();
                deleteDocSql.append('DELETE FROM document_mng ');
                deleteDocSql.append('WHERE document_id = ? ');
                deleteDocSql.append('AND branch_no ');
                deleteDocSql.append(db.inQuery(deleteBranchs));
                
                const deleteParams = [];
                deleteParams.push(this.reqData.document_id);
                
                // パラメータにbranch_no値を追加
                for (let i = 0; i < deleteBranchs.length; i++) {
                    deleteParams.push(deleteBranchs[i]);
                }
                
                // SQL実行
                await new Promise((resolve, reject) => {
                    this.query(deleteDocSql.toString(), deleteParams, (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    });
                });
            }

            callback(null, { success: true });

        } catch (error) {
            callback(error);
        }
    }

    setData(reqData, updUserId, factoryId, isCompanyUser, updType) {
        this.reqData = reqData;
        this.updUserId = updUserId;
        this.factoryId = factoryId;
        this.isCompanyUser = isCompanyUser === true;
        if (updType && (updType === 'mng' || updType === 'detail')) {
            this.updType = updType;
        }
    }
}

export default UpdateModule;