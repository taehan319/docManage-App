////////////////////////
// ログファイル圧縮処理 //
////////////////////////
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const logDir = path.join(process.cwd(), 'logs');
const moment = require('moment');

// dotenv パッケージを再読み込み
const dotenv = require('dotenv');
// NODE_ENV に基づいて適切な環境ファイルを選択
const envFilePath = `.env.${process.env.NODE_ENV}`;
// 環境変数を読み込む
const result = dotenv.config({ path: envFilePath });
if (result.error) {
  console.log(`${result.error}`);
  throw result.error;
}
// ログファイルの圧縮関数
const compressLogFile = async (file) => {

  const filePath = path.join(logDir, file);
  if (!fs.existsSync(filePath)) {
    return;
  }
  const gzFilePath = `${filePath}${process.env.LOG_ROTATE_EXTENSION}`;
  try {
    const gzip = zlib.createGzip();
    const source = fs.createReadStream(filePath);
    const destination = fs.createWriteStream(gzFilePath);
    await new Promise((resolve, reject) => {
      let called = false; // ローカルフラグ
      source.pipe(gzip).pipe(destination)
        .on('finish', () => {
          if (!called) {
            called = true; // 解決済みフラグ
            console.log(`圧縮完了: ${gzFilePath}`);
            resolve();
          }
        })
        .on('error', (streamError) => {
          if (!called) {
            called = true; // エラー時にもフラグを設定
            console.error(`ストリームエラー: ${streamError.message}`);
            reject(streamError);
          }
        });
    });

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath); // 元のファイルを削除  
    }
  } catch (error) {
    console.error(`圧縮エラー: ${error.message}, ファイル: ${filePath}`);
  }
};
// ログファイルの名前から日付を抽出
const extractDateFromFilename = (filename, prefix) => {
  const regex = new RegExp(`^${prefix}_(\\d{4}-\\d{2}-\\d{2})\\.log$`);
  const match = filename.match(regex);
  if (match) {
    return moment(match[1], 'YYYY-MM-DD');
  }
  return null;
}

// ログディレクトリのログファイルをチェックして圧縮
const checkAndCompressLogs = () => {
  fs.readdir(logDir, (err, files) => {
    if (err) {
      console.error('ログディレクトリの読み取りエラー:', err);
      return;
    }
    const today = moment();
    const aplogFiles = files.filter(file => file.startsWith(`${process.env.LOG_FILE_APP}_`) && file.endsWith(process.env.LOG_FILE_EXTENSION));
    aplogFiles.forEach(file => {
      const logDate = extractDateFromFilename(file, process.env.LOG_FILE_APP);
      if (logDate && logDate.isBefore(today, 'day')) {
        compressLogFile(file);
      }
    });
    const dblogFiles = files.filter(file => file.startsWith(`${process.env.LOG_FILE_DB}_`) && file.endsWith(process.env.LOG_FILE_EXTENSION));
    dblogFiles.forEach(file => {
      const logDate = extractDateFromFilename(file, process.env.LOG_FILE_DB);
      if (logDate && logDate.isBefore(today, 'day')) {
        compressLogFile(file);
      }
    });
  });
};

// モジュールをエクスポート
module.exports = checkAndCompressLogs;

// スクリプトを直接実行
if (require.main === module) {
  checkAndCompressLogs();
}