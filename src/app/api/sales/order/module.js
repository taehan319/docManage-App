////////////////////////
// 外部発注処理モジュール //
////////////////////////
// データベース接続をインポート
import db from '../../../lib/transactionManager';
import { StringBuilder } from '../../../lib/comSUtil';
import * as CONST from '../../../utilities/contains';
import { appLogger } from '../../../lib/logger';

class OrderModule extends db.TransactionManager {
    constructor(req) {
        super(req);
        this.reqData = null;
        this.updUserId = null;
        this.factoryId = null;
        this.logMeta = {}; // logMetaの初期化
    }

    async executeTransaction(callback) {
        try {
            // 万が一自社ユーザー以外がここまで来た場合はスロー
            if (this.factoryId !== CONST.ADMIN_FACTORY_ID) {
                appLogger.error(`外部発注処理を行う権限がありません.>>sale_id=${this.reqData.sale_id}`, this.logMeta);
                throw new Error('外部発注処理を行う権限がありません.');
            }

            // 更新日時を合わせる
            const now = new Date();
            // sale_detailテーブルへの登録処理
            const orders = this.reqData.orders;
            // 1. 追加データをinsert
            if (orders.added && orders.added.length > 0) {
                for (const order of orders.added) {
                    let sql = new StringBuilder();
                    sql.append("INSERT INTO sale_detail (");
                    sql.append("sale_id, factory_id, quantity, deadline_ymd, remarks, cost, status, cloth_arrival_ymd, cloth_arrival_flg, update_date, update_user_id");
                    sql.append(") VALUES (");
                    sql.append("?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?");
                    sql.append(")");

                    const params = [
                        order.sale_id,
                        order.factory_id,
                        order.quantity,
                        order.deadline_ymd,
                        order.remarks,
                        order.cost,
                        order.status,
                        order.cloth_arrival_ymd,
                        0, // 外部発注画面で指定できないため未着を設定
                        now,
                        this.updUserId
                    ];

                    await new Promise((resolve, reject) => {
                        this.query(sql.toString(), params, (err, result) => {
                            if (err) return reject(err);
                            if (result.affectedRows === 0) {
                                return reject(new Error('外部発注データの登録に失敗しました'));
                            }
                            resolve(result);
                        });
                    });
                }
            }

            // 2. sale_detailの更新対象を更新
            if (orders.updated && orders.updated.length > 0) {
                for (const order of orders.updated) {
                    let sql = new StringBuilder();
                    sql.append("UPDATE sale_detail SET ");
                    sql.append("quantity = ?, ");
                    sql.append("deadline_ymd = ?, ");
                    sql.append("remarks = ?, ");
                    sql.append("cost = ?, ");
                    sql.append("status = ?, ");
                    sql.append("cloth_arrival_ymd = ?, ");
                    sql.append("update_date = ?, ");
                    sql.append("update_user_id = ? ");
                    sql.append("WHERE sale_id = ? ");
                    sql.append("AND factory_id = ? ");

                    const params = [
                        order.quantity,
                        order.deadline_ymd,
                        order.remarks,
                        order.cost,
                        order.status,
                        order.cloth_arrival_ymd,
                        now,
                        this.updUserId,
                        order.sale_id,
                        order.factory_id
                    ];

                    await new Promise((resolve, reject) => {
                        this.query(sql.toString(), params, (err, result) => {
                            if (err) return reject(err);
                            // レコードが存在しない場合は警告ログを出すが、エラーとしない
                            if (result.affectedRows === 0) {
                                appLogger.warn(`更新対象のレコードが見つかりませんでした: sale_id=${order.sale_id}, factory_id=${order.factory_id}`, this.logMeta);
                            }
                            resolve(result);
                        });
                    });
                }
            }

            // 3. sale_detailから削除対象を削除
            if (orders.deleted && orders.deleted.length > 0) {
                for (const order of orders.deleted) {
                    const sql = `
                        DELETE FROM sale_detail 
                        WHERE sale_id = ? 
                        AND factory_id = ? 
                    `;

                    const params = [
                        order.sale_id,
                        order.factory_id
                    ];

                    await new Promise((resolve, reject) => {
                        this.query(sql, params, (err, result) => {
                            if (err) return reject(err);
                            // レコードが存在しない場合は警告ログを出すが、エラーとしない
                            if (result.affectedRows === 0) {
                                appLogger.warn(`削除対象のレコードが見つかりませんでした: sale_id=${order.sale_id}, factory_id=${order.factory_id}`, this.logMeta);
                            }
                            resolve(result);
                        });
                    });
                }
            }
            
            // 4. sale_mngの更新(備考/状態)
            let mngUpdSql = new StringBuilder();
            mngUpdSql.append('UPDATE sale_mng SET ');
            mngUpdSql.append('remarks = ?, ');
            mngUpdSql.append('status = ?, ');
            mngUpdSql.append('update_date = ?, ');
            mngUpdSql.append('update_user_id = ? ');
            mngUpdSql.append('WHERE sale_id = ? ');

            const mngUpdParams = [
                this.reqData.remarks,
                this.reqData.minStatus,
                now,
                this.updUserId,
                this.reqData.saleId,
            ];

            await new Promise((resolve, reject) => {
                this.query(mngUpdSql.toString(), mngUpdParams, (err, result) => {
                    if (err) return reject(err);
                    // レコードが存在しない場合は警告ログを出すが、エラーとしない
                    if (result.affectedRows === 0) {
                        appLogger.warn(`対象の親レコードが見つかりませんでした: sale_id=${this.reqData.saleId}`, this.logMeta);
                    }
                    resolve(result);
                });
            });

            // 正常終了
            callback(null, {
                success: true,
                message: '外部発注処理が完了しました',
            });
        } catch (error) {
            callback(error);
        }
    }

    setData(reqData, updUserId, factoryId) {
        this.reqData = reqData;
        this.updUserId = updUserId;
        this.factoryId = factoryId;
    }
}

export default OrderModule;