////////////
// ロガー //
///////////
require('dotenv').config();
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, metadata } = format;
const moment = require('moment-timezone');
const path = require('path');
const { URL } = require('url');
const DailyRotateFile = require('winston-daily-rotate-file');

// ログファイル名
const apLogFileName = `${process.env.LOG_FILE_APP}${process.env.LOG_FILE_EXTENSION}`;
const dbLogDbFileName = `${process.env.LOG_FILE_DB}${process.env.LOG_FILE_EXTENSION}`; // 未使用

// ログファイルの基本パス
const logDir = path.join(process.cwd(), 'logs');
// 日付を埋め込むためのファイル名設定（app.log_YYYY-MM-DD形式）
const apLogFile = path.join(logDir, apLogFileName);
const dbLogFile = path.join(logDir, dbLogDbFileName);
// ログローテート設定
/// アプリケーションログ
const apLogTransport = new DailyRotateFile({
  filename: `${apLogFile.replace('.log', '')}_%DATE%.log`,                                            // ファイル名の後ろに日付を追加
  datePattern: 'YYYY-MM-DD',                                                                          // 日付フォーマット
  zippedArchive: (process.env.LOG_ROTATE_ARCHIVE == '0') ? false: true,                               // ログファイルをGZ形式で圧縮(GZのみに対応)
  maxSize: (process.env.LOG_ROTATE_MAX_SIZE == '0')  ? 0 : process.env.LOG_ROTATE_MAX_SIZE,           // 1ファイルあたり最大サイズ
  maxFiles: (process.env.LOG_ROTATE_MAX_FILES == '0') ? '': process.env.LOG_ROTATE_MAX_FILES,         // ログファイルの保持期間
});
/// データベースログ(アプリケーションログと分けたい場合に使用)
/*
const dbLogTransport = new DailyRotateFile({
  filename: `${dbLogFile.replace('.log', '')}_%DATE%.log`,                                            // ファイル名の後ろに日付を追加
  datePattern: 'YYYY-MM-DD',                                                                          // 日付フォーマット
  zippedArchive: (process.env.LOG_ROTATE_ARCHIVE == '0') ? false: true,                               // ログファイルをGZ形式で圧縮(GZのみに対応)
  maxSize: (process.env.LOG_ROTATE_MAX_SIZE == '0')  ? 0 : process.env.LOG_ROTATE_MAX_SIZE,           // 1ファイルあたり最大サイズ
  maxFiles: (process.env.LOG_ROTATE_MAX_FILES == '0') ? '': process.env.LOG_ROTATE_MAX_FILES,         // ログファイルの保持期間
});
*/
// Log Format
const logFormat = (loggerType) => printf(({ level, message, timestamp, metadata }) => {
    // タイムゾーンをJSTに変換
    const jstTimestamp = moment(timestamp).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss.sss');
    // メタ情報取得
    const { url, method, userId, sessionId, appName } = metadata || {};
    // RequestUrlからドメイン名を除去
    const parsedUrl = url ? new URL(url) : null;
    const formattedUrl = parsedUrl ? parsedUrl.pathname + (parsedUrl.search || '') : '-';
    // 実行ファイルフルパスから特定のサブパスを抽出
    const basePath = path.resolve(__dirname, '..'); // プロジェクトのルートディレクトリを基準にする
    const formattedFileName = appName ? path.relative(basePath, appName) : '-';
    return `${jstTimestamp} [${loggerType || '-'}] [${sessionId || '-'}] [${userId || '-'}] [${level}] [${formattedUrl || '-'}] [${method || '-'}] [${formattedFileName || '-'}]: ${message}`;
});

// アプリケーションログの設定
const appLogger = createLogger({
    format: combine(
      timestamp(),
      metadata(), // `metadata`フォーマットを設定
      logFormat('App')
    ),
    transports: [
      new transports.Console(),
      apLogTransport
    ],
    level: 'debug'
  });
  
  // データベースアクセスログの設定
  const dbLogger = createLogger({
    format: combine(
      timestamp(),
      metadata(), // `metadata`フォーマットを設定
      logFormat('DB')
    ),
    transports: [
      new transports.Console(),
      apLogTransport
    ],
    level: 'debug'
  });

  
module.exports = { appLogger, dbLogger };
