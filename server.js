// server.js
// ENVファイル読込み
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

////////////////////////////////////////////////////////
// ログローテート
const compressLogs = require('./compressLogs');
const runCompressLogs = async () => {
  await compressLogs(); // 実行完了を待つ
};
runCompressLogs();
////////////////////////////////////////////////////////

////////////////////////////////////////////////////////
// 開発時は下記がないとrunモードが動かない
const express = require('express');
const next = require('next');
const session = require('express-session');
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const redirectTo = process.env.NEXT_PUBLIC_REDIRECT_ROOT_TO || '/login'

app.prepare().then(() => {
    const server = express();

    server.use(
        session({
          secret: 'your-secret-key',
          resave: false,
          saveUninitialized: true,
          cookie: { secure: true },
        })
    );
    // リダイレクトの設定
    server.get('/', (req, res) => {
        res.redirect(301, redirectTo);
    });
    server.all('*', (req, res) => {
        return handle(req, res);
    });

    server.listen(3000, (err) => {
        if (err) {
            console.log(`> listen error >> ${err}`);
            throw err;
        }
        console.log(`> Ready on ${process.env.NEXTAUTH_URL}`);
    });
});
////////////////////////////////////////////////////////
