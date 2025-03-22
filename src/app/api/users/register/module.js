////////////////////////
// ユーザ登録モジュール //
////////////////////////
// データベース接続をインポート
import db from '../../../lib/transactionManager';
import { StringBuilder } from '../../../lib/comSUtil';

class RegisterModule extends db.TransactionManager {
    constructor(req) {
        super(req);
        this.userData = null;
        this.newUserId = null;
    }

    async executeTransaction(callback) {
        try {
            // メールアドレスの重複チェック
            const checkEmailSql = 'SELECT COUNT(*) as count FROM user_mst WHERE user_email = ?';
            await new Promise((resolve, reject) => {
                this.query(checkEmailSql, [this.userData.email], (err, result) => {
                    if (err) return reject(err);
                    if (result[0].count > 0) {
                        return reject(new Error('既に登録されているメールアドレスです'));
                    }
                    resolve();
                });
            });

            // ユーザー情報の登録
            const insertSql = new StringBuilder()
                .append("INSERT INTO user_mst(")
                .append("user_id, user_name, user_email, user_pass, factory_id, update_date, update_user_id")
                .append(") VALUES (?,?,?,?,?,?,?)")
                .toString();

            const now = new Date();
            const params = [
                this.newUserId,
                this.userData.userName || null,
                this.userData.email || null,
                this.userData.password || null,
                this.userData.factoryId || 0,
                now,
                this.userData.updUserId || 0,
            ];

            await new Promise((resolve, reject) => {
                this.query(insertSql, params, (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });

            callback(null, { newUserId: this.newUserId });

        } catch (error) {
            callback(error);
        }
    }

    setUserData(userData) {
        this.userData = userData;
    }

    setNewUserId(newUserId) {
      this.newUserId = newUserId;
    }

    getNewUserId() {
        return this.newUserId;
    }
}

export default RegisterModule;