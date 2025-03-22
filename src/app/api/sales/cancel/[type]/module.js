////////////////////////
// 販売情報 キャンセル処理モジュール //
////////////////////////
// データベース接続をインポート
import db from '../../../../lib/transactionManager';
import { StringBuilder } from '../../../../lib/comSUtil';
import * as CONST from '../../../../utilities/contains';

class CancelModule extends db.TransactionManager {
    constructor(req) {
        super(req);
        this.saleId = null;
        this.userInfo = null;
        this.isCompanyUser = false;
        this.cancelType = 'detail'; // デフォルトはdetail
    }

    async executeTransaction(callback) {
        try {
            // 販売データの取得（存在確認と現在のステータス確認）
            const checkSaleSql = 'SELECT status FROM sale_mng WHERE sale_id = ?';
            const saleData = await new Promise((resolve, reject) => {
                this.query(checkSaleSql, [this.saleId], (err, result) => {
                    if (err) return reject(err);
                    if (!result || result.length === 0) {
                        return reject(new Error('対象の販売データが見つかりません'));
                    }
                    resolve(result[0]);
                });
            });

            // すでにキャンセル済みかチェック
            if (saleData.status === CONST.STATUS_CANCELED) {
                return callback(new Error('既にキャンセル済みです'));
            }

            // キャンセルタイプに応じた処理
            if (this.cancelType === 'mng') {
                // sale_mngをキャンセル済みに更新（自社ユーザーの場合）
                if (this.isCompanyUser) {
                    const now = new Date();

                    // 1. 販売管理データ(sale_mng)を更新
                    let sqlMng = new StringBuilder();
                    sqlMng.append("UPDATE sale_mng SET ");
                    sqlMng.append(`status = ${CONST.STATUS_CANCELED}, `); // 4:キャンセル済
                    sqlMng.append("update_date = ?, ");
                    sqlMng.append("update_user_id = ? ");
                    sqlMng.append("WHERE sale_id = ?");

                    const paramsMng = [
                        now,
                        this.userInfo.id,
                        this.saleId
                    ];

                    await new Promise((resolve, reject) => {
                        this.query(sqlMng.toString(), paramsMng, (err, result) => {
                            if (err) return reject(err);
                            if (result.affectedRows === 0) {
                                return reject(new Error('キャンセル処理に失敗しました'));
                            }
                            resolve(result);
                        });
                    });

                    // 2. 関連する全ての詳細データ(sale_detail)も更新
                    let sqlDetail = new StringBuilder();
                    sqlDetail.append("UPDATE sale_detail SET ");
                    sqlDetail.append(`status = ${CONST.STATUS_CANCELED}, `); // 4:キャンセル済
                    sqlDetail.append("update_date = ?, ");
                    sqlDetail.append("update_user_id = ? ");
                    sqlDetail.append("WHERE sale_id = ?");

                    const paramsDetail = [
                        now,
                        this.userInfo.id,
                        this.saleId
                    ];

                    await new Promise((resolve, reject) => {
                        this.query(sqlDetail.toString(), paramsDetail, (err, result) => {
                            if (err) return reject(err);
                            resolve(result);
                        });
                    });
                } else {
                    return callback(new Error('販売データのキャンセル権限がありません'));
                }
            } else if (this.cancelType === 'detail') {
                // 詳細データのみキャンセル処理（他工場ユーザーの場合）
                const checkDetailSql = 'SELECT * FROM sale_detail WHERE sale_id = ? AND factory_id = ?';
                const saleDetailData = await new Promise((resolve, reject) => {
                    this.query(checkDetailSql, [this.saleId, this.userInfo.factoryId], (err, result) => {
                        if (err) return reject(err);
                        if (!result || result.length === 0) {
                            return reject(new Error('対象の販売データが見つかりません'));
                        }
                        resolve(result[0]);
                    });
                });

                // すでにキャンセル済みかチェック
                if (saleDetailData.status === CONST.STATUS_CANCELED) {
                    return callback(new Error('既にキャンセル済みです'));
                }

                // 工場別の更新処理
                let sql = new StringBuilder();
                sql.append("UPDATE sale_detail SET ");
                sql.append(`status = ${CONST.STATUS_CANCELED}, `); // 4:キャンセル済
                sql.append("update_date = ?, ");
                sql.append("update_user_id = ? ");
                sql.append("WHERE sale_id = ? ");
                // 自工場のみ更新
                sql.append("AND factory_id = ?");

                const now = new Date();
                const params = [
                    now,
                    this.userInfo.id,
                    this.saleId,
                    this.userInfo.factoryId
                ];

                await new Promise((resolve, reject) => {
                    this.query(sql.toString(), params, (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    });
                });
            }

            callback(null, {
                success: true,
                message: 'キャンセル処理が完了しました',
                type: this.cancelType,
                isCompanyUser: this.isCompanyUser
            });
        } catch (error) {
            callback(error);
        }
    }

    setData(saleId, userInfo, isCompanyUser, cancelType) {
        this.saleId = saleId;
        this.userInfo = userInfo;
        this.isCompanyUser = isCompanyUser === true;
        if (cancelType && (cancelType === 'mng' || cancelType === 'detail')) {
            this.cancelType = cancelType;
        }
    }
}

export default CancelModule;