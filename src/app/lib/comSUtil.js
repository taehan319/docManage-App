////////////////////////////////
// サーバーサイドユーティリティ //
////////////////////////////////
const { parse, serialize } = require('cookie');
import { decrypt } from '../utilities/encrypt';

// 環境変数からCookie名称を取得
const cookiename = process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME;
const userinfo = process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO;
const userinfo_id = process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ID;
const sessionname = process.env.NEXT_PUBLIC_SESSION_COOKIE_SESSION;

// ログ出力メタ情報生成
export const extractMeta = (req, apName) => {
  const cookies = parse(req.headers.get('cookie') || '');
  if (cookies[cookiename]) {
    const sessionData = JSON.parse(cookies[cookiename]);
    req.session = sessionData;
  } else {
    req.session = {};
  }

  const userId = req.session ? (req.session[userinfo] ? decrypt(req.session[userinfo][userinfo_id]) : 'NoLog') : 'NoLog';
  const sessionId = cookies[sessionname] ? cookies[sessionname] : '---';
  const appName = apName;
  return {
    url: req.url,
    method: req.method,
    userId,
    sessionId,
    appName,
  };
};

/**
 * 月初日取得処理
 * @param {number} ym 処理対象年月 (YYYYMM)
 * @param {boolean} numflg 返却型フラグ(デフォルトfalse)
 * @returns {string | number} 月初日 (YYYY-MM-DD/YYYYMMDD)
 */
export function getFirstDayOfMonth(ym, numflg = false) {
  try {
    if (typeof ym !== 'number' || ym < 100000 || ym > 999912) {
      throw new Error('引数が不正です。 対象年月: ' + ym);
    }
    // 年と月を抽出
    const year = Math.floor(ym / 100);
    const month = ym % 100;

    // 月初日を取得
    const firstDay = new Date(year, month - 1, 1).getDate();

    if (numflg) {
      // YYYYMMDDになるように
      const formattedMonth = String(month).padStart(2, '0');
      const formattedDay = String(firstDay).padStart(2, '0');
      const ymdStr = `${year}${formattedMonth}${formattedDay}`;
      const result = Number(ymdStr);
      return result;
    }

    // フォーマットされた日付を返す (例: 2024-01-01)
    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;

    return formattedDate;
  } catch (error) {
    console.error(`getFirstDayOfMonthでエラーが発生しました。: ${error.message}`);
    throw error;
  }
}

/**
 * 月末日取得処理
 * @param {number} ym 処理対象年月 (YYYYMM)
 * @param {boolean} numflg 返却型フラグ(デフォルトfalse)
 * @returns {string | number} 月初日 (YYYY-MM-DD/YYYYMMDD)
 */
export function getLastDayOfMonth(ym, numflg = false) {
  try {
    if (typeof ym !== 'number' || ym < 100000 || ym > 999912) {
      throw new Error('引数が不正です。 対象年月: ' + ym);
    }
    // 年と月を抽出
    const year = Math.floor(ym / 100);
    const month = ym % 100;

    // 次の月の1日の前日を月の最終日にする
    const lastDay = new Date(year, month, 0).getDate();

    if (numflg) {
      // YYYYMMDDになるように
      const formattedMonth = String(month).padStart(2, '0');
      const formattedDay = String(lastDay).padStart(2, '0');
      const ymdStr = `${year}${formattedMonth}${formattedDay}`;
      const result = Number(ymdStr);
      return result;
    }

    // フォーマットされた日付を返す (例: 2024-01-31)
    return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  } catch (error) {
    console.error(`Error in getLastDayOfMonth: ${error}`);
    throw error;
  }
}

/**
 * ダイナミックルートのパラメータを取得するヘルパー関数
 * @param {*} req リクエスト情報
 * @param {*} chkpath パラメータの入口
 * @returns 
 */
export function getTypeFromURL(req, chkpath) {
  // URLからtypeパラメータを抽出
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  // /api/xxx/xxx/[type] の [type] 部分を取得
  const typeIndex = pathParts.findIndex(part => part === chkpath) + 1;
  return pathParts[typeIndex] || 'unknown';
}

//////////////////////////////////////////////////////////////
// 文字列連結クラス                                          //
// 使い方:                                                  //
// import { StringBuilder } from './comSUtil.js';          //
//                                                         //
// const sb = new StringBuilder();                         //
// sb.append("Hello")                                      //
// .append(" ")                                            //
// .append("World")                                        //
// .append("!");                                           //
// console.log(sb.toString()); // "Hello World!"           //
/////////////////////////////////////////////////////////////
class StringBuilder {
  constructor() {
    this.strings = [];
  }

  // 文字列を追加
  append(str) {
    this.strings.push(str);
    return this;
  }

  // 連結された文字列を取得
  toString() {
    return this.strings.join('');
  }
}

// StringBuilderクラスをエクスポート
export { StringBuilder };