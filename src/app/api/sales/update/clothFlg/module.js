////////////////////////
// 販売情報 生地到着フラグ更新モジュール //
////////////////////////
// データベース接続をインポート
import db from '../../../../lib/transactionManager';
import { StringBuilder } from '../../../../lib/comSUtil';

class UpdateStatusModule extends db.TransactionManager {
    constructor(req) {
        super(req);
        this.updateData = null;
    }

    async executeTransaction(callback) {
        try {
            let sql = new StringBuilder();
            let params = [];

            // 指定された販売IDの生地到着フラグ更新
            sql.append("UPDATE sale_detail SET ");
            sql.append("cloth_arrival_flg = ? ");
            params.push(this.updateData.clothFlg);
            if (this.updateData.clothYmd) {
                sql.append(", cloth_arrival_ymd = ? ");
                params.push(this.updateData.clothYmd);
            }
            // 共通の更新情報を追加
            sql.append(", update_date = ? ");
            params.push(new Date());

            sql.append(", update_user_id = ? ");
            params.push(this.updateData.updateUserId);

            // 条件句の追加
            sql.append("WHERE sale_id = ? ");
            params.push(this.updateData.saleId);
            sql.append("AND factory_id = ?");
            params.push(this.updateData.factoryId);

            // クエリの実行
            await new Promise((resolve, reject) => {
                this.query(sql.toString(), params, (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });

            callback(null, { success: true });

        } catch (error) {
            callback(error);
        }
    }

    setUpdateData(data) {
        this.updateData = data;
    }
}

export default UpdateStatusModule;