///////////////////////////////////
// クライアントサイドユーティリティ //
///////////////////////////////////
'use client'

import dayjs from 'dayjs';

// HTTPステータスコード定義をインポート
import HttpStatusCodes from './httpStatusCodes';

// サーバーレスポンス結果判定
const chkResponseStatus = (res, router) => {
  if (!res.ok) {
    if (res.status == HttpStatusCodes.UNAUTHORIZED) {
      res.statusText = '一定時間操作が行われなかったか、ログインされていません';
    }
    const errorMessage = encodeURIComponent(`${res.status} | ${res.statusText}`);
    router.push(`/error?error=${errorMessage}`);
    return false;
  }
  return true;
}

/**
 * 日付のフォーマット関数
 * @param {number|string} ymd YYYYMMDDの日付
 * @param {string} format 出力フォーマット（デフォルト: 'YYYY/MM/DD'）
 * @returns {string} フォーマットされた日付文字列
 */
const formatDate = (ymd, format = 'YYYY/MM/DD') => {
  if (!ymd) return '';

  // dayjsオブジェクトの場合
  if (ymd && typeof ymd === 'object' && typeof ymd.format === 'function') {
    return ymd.format(format);
  }

  // 数値型の場合
  if (typeof ymd === 'number' || !isNaN(Number(ymd))) {
    const str = ymd.toString();
    if (str.length === 8) {
      const year = str.substring(0, 4);
      const month = str.substring(4, 6);
      const day = str.substring(6, 8);
      return dayjs(`${year}-${month}-${day}`).format(format);
    }
    return str;
  }

  // 文字列の場合
  return String(ymd);
};

/**
 * 日付のフォーマット関数(年月)
 * @param {number|string} ym YYYYMMの年月
 * @param {string} format 出力フォーマット（デフォルト: 'YYYY/MM'）
 * @returns {string} フォーマットされた年月文字列
 */
const formatYYYYMM = (ym, format = 'YYYY/MM') => {
  if (!ym) return '';

  // 数値型の場合
  if (typeof ym === 'number' || !isNaN(Number(ym))) {
    const str = ym.toString();
    if (str.length === 6) {
      const year = str.substring(0, 4);
      const month = str.substring(4, 6);
      return dayjs(`${year}-${month}-01`).format(format);
    }
    return str;
  }

  // dayjsオブジェクトの場合
  if (ym && typeof ym === 'object' && typeof ym.format === 'function') {
    return ym.format(format);
  }

  // 文字列の場合
  return String(ym);
};

/**
 * 数値型日付（YYYYMMDD）をdayjsオブジェクトに変換
 * @param {number|string} ymd YYYYMMDDの日付
 * @returns {object|null} dayjsオブジェクトまたはnull
 */
const parseDateToObj = (ymd) => {
  if (!ymd) return null;

  // 数値型の場合
  if (typeof ymd === 'number' || !isNaN(Number(ymd))) {
    const str = ymd.toString();
    if (str.length === 8) {
      const year = str.substring(0, 4);
      const month = str.substring(4, 6);
      const day = str.substring(6, 8);
      return dayjs(`${year}-${month}-${day}`);
    }
  }

  // 既にdayjsオブジェクトの場合
  if (ymd && typeof ymd === 'object' && typeof ymd.format === 'function') {
    return ymd;
  }

  // その他の場合
  try {
    return dayjs(ymd);
  } catch (e) {
    console.error('日付変換エラー:', e);
    return null;
  }
};

/**
 * 数値型年月（YYYYMM）をdayjsオブジェクトに変換
 * @param {number|string} ym YYYYMMの年月
 * @returns {object|null} dayjsオブジェクトまたはnull
 */
const parseYYYYMMToObj = (ym) => {
  if (!ym) return null;

  // 数値型の場合
  if (typeof ym === 'number' || !isNaN(Number(ym))) {
    const str = ym.toString();
    if (str.length === 6) {
      const year = str.substring(0, 4);
      const month = str.substring(4, 6);
      return dayjs(`${year}-${month}-01`);
    }
  }

  // 既にdayjsオブジェクトの場合
  if (ym && typeof ym === 'object' && typeof ym.format === 'function') {
    return ym;
  }

  // その他の場合
  try {
    return dayjs(ym);
  } catch (e) {
    console.error('年月変換エラー:', e);
    return null;
  }
};

/**
 * dayjsオブジェクトを数値型日付（YYYYMMDD）に変換
 * @param {object} dateObj dayjsオブジェクト
 * @returns {number|null} YYYYMMDD形式の数値または現在日付
 */
const formatObjToYYYYMMDD = (dateObj) => {
  if (!dateObj) return null;

  // dayjsオブジェクトの場合
  if (dateObj && typeof dateObj === 'object' && typeof dateObj.format === 'function') {
    return parseInt(dateObj.format('YYYYMMDD'), 10);
  }

  // 既に数値型の場合
  if (typeof dateObj === 'number') {
    return dateObj;
  }

  return null;
};

/**
 * dayjsオブジェクトを数値型年月（YYYYMM）に変換
 * @param {object} dateObj dayjsオブジェクト
 * @returns {number|null} YYYYMM形式の数値または現在年月
 */
const formatObjToYYYYMM = (dateObj) => {
  if (!dateObj) return null;

  // dayjsオブジェクトの場合
  if (dateObj && typeof dateObj === 'object' && typeof dateObj.format === 'function') {
    return parseInt(dateObj.format('YYYYMM'), 10);
  }

  // 既に数値型の場合
  if (typeof dateObj === 'number') {
    return dateObj;
  }

  return null;
};

module.exports = {
  chkResponseStatus,
  formatDate,
  formatYYYYMM,
  parseDateToObj,
  parseYYYYMMToObj,
  formatObjToYYYYMMDD,
  formatObjToYYYYMM,
};