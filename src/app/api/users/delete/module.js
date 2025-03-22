////////////////////////
// ユーザ登録モジュール //
////////////////////////
// データベース接続をインポート
import db from '../../../lib/transactionManager';
import { StringBuilder } from '../../../lib/comSUtil';

class DeleteModule extends db.TransactionManager {
    constructor(req) {
        super(req);
        this.userData = null;
    }

    async executeTransaction(callback) {
        try {
            // 削除
            let sql = new StringBuilder();
            sql.append("DELETE FROM user_mst WHERE user_id ");
            const where = db.inQuery(this.userData.userIds);
            sql.append(where);

            const result = await new Promise((resolve, reject) => {
                this.query(sql.toString(), this.userData.userIds, (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });

            callback(null, { deleteCount: result.affectedRows });

        } catch (error) {
            callback(error);
        }
    }

    setUserData(userData) {
        this.userData = userData;
    }
}

export default DeleteModule;