///////////////////////////////////////////
// データベースコネクション管理マネージャー  //
///////////////////////////////////////////
require('dotenv').config();

const mysql = require('mysql2');

// データベースコネクションプール作成
if (!process.env.DATABASE_URL) {
    throw new Error('環境変数 `DATABASE_URL` が定義されていません');
}
if (!global.sharedData) {
    global.sharedData = { initialized: false, pool: null };
}
// プール初期化(初回のみ実行)
const initPool = () => {
    if (!global.sharedData.initialized) {
        const pool = mysql.createPool({
            uri: process.env.DATABASE_URL,
            timezone: '+09:00',       // JSTタイムゾーンで接続
            dateStrings: true,        // 日時を文字列として返す
            waitForConnections: true, // 上限に達した場合、次の接続が解放されるまで待つ
            connectionLimit: 10,      // 最大コネクション数（デフォルトは10）
            maxIdle: 10,              // 最大アイドル数
            idleTimeout: 60000,       // 30秒後にアイドル接続を終了
            queueLimit: 0,
        });
        console.log('Database connection pool initialized');
        global.sharedData.initialized = true;
        global.sharedData.pool = pool;
    }
};

// プールの取得関数
const getPool = () => {
    if (!global.sharedData.pool) {
        throw new Error('Pool has not been initialized. Call initPool() first.');
    }
    return global.sharedData.pool;
};

module.exports = { initPool, getPool };
