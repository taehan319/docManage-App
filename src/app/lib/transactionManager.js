///////////////////////////////////////
// データベースアクセス管理マネージャー //
///////////////////////////////////////
require('dotenv').config();
// データベース設定
const mysql = require('mysql2');
// ロガー
import { dbLogger } from './logger';
// 共通
import { extractMeta } from './comSUtil';
// データベースコネクション管理マネージャー
const { initPool, getPool } = require('./dbManager');

if (!process.env.DATABASE_URL) {
    throw new Error('環境変数 `DATABASE_URL` が定義されていません');
}

// データベースコネクションプール作成
initPool();
const pool = getPool();

// シグナルをキャッチしてクリーンアップ処理を実行
const cleanup = async () => {
    console.log('Cleanup starting...');
    try {
        console.log('Waiting for pool to close...');
        const result = await pool.end(); // `pool.end()`の戻り値を確認
        console.log('Pool end result:', result); // 結果をログに出力
        console.log('Database connections closed.');
    } catch (error) {
        console.error('Error while closing the pool:', error.message);
        console.error('Full error details:', error); // 詳細なエラー情報を出力
    }
};

process.on('SIGINT', cleanup); // 手動停止（Ctrl+Cなど）
process.on('SIGTERM', cleanup); // プロセス終了（PM2停止時など）

///////////////////////////
// OverrideしたQuery関数 //
///////////////////////////
const query = (req, sql, params, callback) => {
    const logMeta = extractMeta(req, __filename); // 共通関数でログ出力メタデータを抽出
    dbLogger.info(`Executing Query: ${sql} \nbindParams: ${JSON.stringify(params)}`, logMeta);
    pool.getConnection((err, connection) => {
        if (err) {
            dbLogger.error(`GetConnection Error: ${err.message}`, logMeta);
            return callback(err);
        }
        try {
            connection.query(sql, params, (err, results) => {
                if (err) {
                    dbLogger.error(`Query Error: ${err.message}\nStack: ${err.stack}`, logMeta);
                } else {
                    dbLogger.info(`Query Success: ${JSON.stringify(results)}`, logMeta);
                }
                callback(err, results);
            });
        } finally {
            if (connection) connection.release();
        }
    });
};

 // エスケープ関数
 const escapeParam = (param) => {
    if (Array.isArray(param)) {
        return param.map(p => typeof p === 'string' ?
                p.replace(/'/g, "''")             //「'」→「''」
                .replace(/\\/g, '\\\\\\\\')       //「\」→「\\」
                .replace(/%/g, '\\%')             //「%」→「\%」
                .replace(/_/g, '\\_')             //「_」→「\_」
               : p
        );
    } else {
       return typeof param === 'string' ? 
             param.replace(/'/g, "''")            //「'」→「''」
             .replace(/\\/g, '\\\\\\\\')          //「\」→「\\」
             .replace(/%/g, '\\%')                //「%」→「\%」
             .replace(/_/g, '\\_')                //「_」→「\_」
            : param ;
    }
 };

//IN句 「true(NOT IN句) or false(IN句)」
const inQuery = (params, not = false) => {
    const placeholders = params.map(() => '?').join(',');
    return `${not ? 'NOT IN' : 'IN'} (${placeholders})`;
};

//LIKE句 (pattern(後方)(前方)(前後)(なし)]
const likeQuery = (param, pattern = 'default', not = false) =>{
    let likeParam;
    const escapedParam =  param;

    switch (pattern) {
        case 'startsWith':
            likeParam = `${escapedParam}%`;
            break;
        case 'endsWith':
            likeParam = `%${escapedParam}`;
            break;
        case 'contains':
            likeParam = `%${escapedParam}%`;
            break;
        default:
            likeParam = `${escapedParam}`;
            break;
    }
    return `${not ? 'NOT LIKE' : 'LIKE'} '${likeParam}'`;
};

///////////////////////////
// シーケンス値取得        //
///////////////////////////
const getNextSequenceValue = (req, seq_name, callback) => {
    const logMeta = extractMeta(req, __filename); // 共通関数でログ出力メタデータを抽出
    // ストアドプロシージャ呼び出し
    const params = [seq_name];
    const sqlCall = 'CALL nextval(?, @seq_value);';
    dbLogger.info(`Executing Query: ${sqlCall} \nbindParams: ${JSON.stringify(params)}`, logMeta);
    const sqlSelect = 'SELECT @seq_value AS seq_value;';

    query(req, sqlCall, params, (err, results) => {
        if (err) {
            return callback(err);
        }

        // シーケンス値を取得
        dbLogger.info(`Executing Query: ${sqlSelect}`, logMeta);
        query(req, sqlSelect, [], (err, results) => {
            if (err) {
                dbLogger.error(`Query Error: ${err.message}`, logMeta);
                return callback(err);
            }

            const seq_value = results[0].seq_value;
            dbLogger.info(`Query Success: getNextSequenceValue(${seq_name}) >> ${seq_value}`, logMeta);
            callback(null, seq_value);
        });
    });
};
/////////////////////////////////
// DBトランザクション管理クラス  //
/////////////////////////////////
class TransactionManager {
    constructor(req) {
        this.pool = pool;
        this.request = req;
        this.logMeta = extractMeta(req, __filename); // 共通関数でメタデータを抽出
    }

    async begin(callback) {
        this.pool.getConnection((err, connection) => {
            if (err) {
                dbLogger.error(`GetConnection Error: ${err.message}`, this.logMeta);
                return callback(err);
            }
            this.connection = connection;
            this.connection.beginTransaction((err) => {
                if (err) {
                    dbLogger.error(`Transaction Error: ${err}`, this.logMeta);
                    callback(err);
                } else {
                    dbLogger.debug('Transaction Start', this.logMeta);
                    callback(null);
                }
            });
        });
    }

    async commit(callback) {
        if (!this.connection) {
            return callback(new Error('No active connection'));
        }
        try {
            this.connection.commit((err) => {
                if (err) {
                    this.rollback(() => {
                        dbLogger.error(`Commit Error: ${err}`, this.logMeta);
                        callback(err);
                    });
                } else {
                    dbLogger.debug('Transaction Commit Success', this.logMeta);
                    callback(null);
                }
            });
        } finally {
            if (this.connection) this.connection.release();
        }
    }

    async rollback(callback) {
        if (!this.connection) {
            return callback(new Error('No active connection'));
        }
        try {
            this.connection.rollback(() => {
                dbLogger.debug('Transaction Rollback Success', this.logMeta);
                callback();
            });
        } finally {
            if (this.connection) this.connection.release();
        }
    }

    async query(sql, params, callback) {
        dbLogger.info(`Executing Query: ${sql} \nbindParams: ${JSON.stringify(params)}`, this.logMeta);
        if (!this.connection) {
            return callback(new Error('No active connection'));
        }
        this.connection.query(sql, params, (err, results) => {
            if (err) {
                dbLogger.error(`Query Error: ${err.message}`, this.logMeta);
            } else {
                dbLogger.info(`Query Success: ${JSON.stringify(results)}`, this.logMeta);
            }
            callback(err, results);
        });
    }

    async executeTransaction(callback) {
        throw new Error('executeTransactionメソッドをオーバーライドしてください', this.logMeta);
    }

    async runTransaction(callback) {
        this.begin((err) => {
            if (err) {
                return callback(err);
            }
            this.executeTransaction((err, result) => {
                if (err) {
                    return this.rollback(() => {
                        callback(err);
                    });
                }
                this.commit((err) => {
                    if (err) {
                        return this.rollback(() => {
                            callback(err);
                        });
                    }
                    callback(null, result);
                });
            });
        });
    }
}
export default { query, escapeParam, inQuery, likeQuery, getNextSequenceValue, TransactionManager };
