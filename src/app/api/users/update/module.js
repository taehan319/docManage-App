////////////////////////
// ユーザ更新モジュール //
////////////////////////
// データベース接続をインポート
import db from '../../../lib/transactionManager';
import { StringBuilder } from '../../../lib/comSUtil';

class UpdateModule extends db.TransactionManager {
    constructor(req) {
        super(req);
        this.userData = null;
    }

    async executeTransaction(callback) {
        try {
            // メールアドレスの重複チェック
            const checkEmailSql = 'SELECT COUNT(*) as count FROM user_mst WHERE user_email = ? and user_id != ?';
            await new Promise((resolve, reject) => {
                this.query(checkEmailSql, [this.userData.email,this.userData.userId], (err, result) => {
                    if (err) return reject(err);
                    if (result[0].count > 0) {
                        return reject(new Error('既に登録されているメールアドレスです'));
                    }
                    resolve();
                });
            });
            // ユーザー情報の登録
            let sql = new StringBuilder();
            let params = [];
            sql.append("UPDATE user_mst SET ");
            if (this.userData.userName) {
                sql.append("user_name = ? ");
                params.push(this.userData.userName);
            }
            if (this.userData.email) {
                if (0 < params.length) {
                    sql.append(",");
                }
                sql.append("user_email = ? ");
                params.push(this.userData.email);
            }
            if (this.userData.password) {
                if (0 < params.length) {
                    sql.append(",");
                }
                sql.append("user_pass = ? ");
                params.push(this.userData.password);
            }
            if (this.userData.factoryId) {
                if (0 < params.length) {
                    sql.append(",");
                }
                sql.append("factory_id = ? ");
                params.push(this.userData.factoryId);
            }
            if (0 < params.length) {
                sql.append(",");
            }
            sql.append("update_date = ? ");
            const now = new Date();
            params.push(now);
            if (0 < params.length) {
                sql.append(",");
            }
            sql.append("update_user_id = ? ");
            params.push(this.userData.updUserId);
            
            sql.append("WHERE user_id = ?");
            params.push(this.userData.userId);

            await new Promise((resolve, reject) => {
                this.query(sql.toString(), params, (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });

            callback(null, {});

        } catch (error) {
            callback(error);
        }
    }

    setUserData(userData) {
        this.userData = userData;
    }
}

export default UpdateModule;