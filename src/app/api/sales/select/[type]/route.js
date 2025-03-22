/**
 * 販売管理情報取得
 */
import db from '../../../../lib/transactionManager';
import HttpStatusCodes from '../../../../lib/httpStatusCodes';
import { appLogger } from '../../../../lib/logger';
import { extractMeta, StringBuilder, getFirstDayOfMonth, getLastDayOfMonth, getTypeFromURL } from '../../../../lib/comSUtil';
import { NextResponse } from 'next/server';
import { sessionMiddleware } from '../../../../lib/session';
import { getUserFromCookies } from '../../../../lib/cookieManager';
import * as CONST from '../../../../utilities/contains';

// クエリビルダー関数
const buildQuery = (req, type, params = {}) => {
  const sql = new StringBuilder();
  const queryParams = [];
  // 日付変換処理を例外ハンドリング
  let ymfrom = null;
  let ymto = null;

  try {
    // ユーザー情報取得
    const userInfo = getUserFromCookies(req);
    if (!userInfo) {
        return NextResponse.json({
            message: "ログインされていません."
        }, {
            status: HttpStatusCodes.UNAUTHORIZED
        });
    }
    const isAdmin = (userInfo[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ADMINFLG] === String(CONST.USER_ADMIN));
    const factoryId = userInfo[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_FACTORYID];

    if (type !== 'detail') {
      // 対象年月から開始日、終了日を取得
      const targYm = params.targYm;
      if (!targYm) {
        return NextResponse.json(
          { message: 'targYmが不正です.' },
          { status: HttpStatusCodes.BAD_REQUEST }
        );
      }
      if (targYm) {
        try {
          ymfrom = getFirstDayOfMonth(targYm, true);
          ymto = getLastDayOfMonth(targYm, true);
        } catch (e) {
          return NextResponse.json(
            { message: '日付変換に失敗しました.' },
            { status: HttpStatusCodes.BAD_REQUEST }
          );
        }
      }
    }

    switch (type) {
      /** 自社工場ユーザーの場合 */
      case 'company':
        sql.append('SELECT a.sale_id, a.maker_id, a.document_id, a.product_no, a.contract_ym, a.brand_id, a.finishing, ');
        sql.append('a.item_category_id, a.item_id, a.quantity, a.deadline_ymd, a.remarks, a.cost, ');
        sql.append('(SELECT COALESCE(MIN(status), 0) FROM sale_detail WHERE sale_id = a.sale_id) as status, ');
        sql.append('a.invoice_ym, a.csvout_flg, a.csvout_date, a.csvout_user_id, a.update_date, a.update_user_id, ');
        sql.append('b.cloth_arrival_ymd, b.cloth_arrival_flg, c.brand_name, d.item_name, ');
        sql.append(`GROUP_CONCAT(e.file_name ORDER BY e.document_id, e.update_date desc SEPARATOR ',') as files `);
        sql.append('FROM sale_mng a ');
        sql.append('LEFT OUTER JOIN sale_detail b ON a.sale_id = b.sale_id AND b.factory_id = 0 '); // 自社の詳細をJOIN
        sql.append('LEFT OUTER JOIN brand_mst c ON a.brand_id = c.brand_id ');
        sql.append('LEFT OUTER JOIN item_mst d ');
        sql.append('ON a.item_category_id = d.item_category_id AND a.item_id = d.item_id ');
        sql.append('LEFT OUTER JOIN ');
        if (!isAdmin) {
          // 管理者以外の場合はログインユーザーが属する工場更新分または公開フラグがONのもの
          sql.append('( SELECT * FROM document_mng WHERE publish_flg = 1 OR upd_factory_id = ? ) e ');
          queryParams.push(factoryId);
        } else {
          // 管理者の場合はすべて表示
          sql.append(' document_mng e ');
        }
        sql.append('ON a.document_id = e.document_id ');
        sql.append('WHERE a.contract_ym BETWEEN ? AND ? ');
        queryParams.push(ymfrom);
        queryParams.push(ymto);

        // メーカーID
        if (params.makerId) {
          sql.append('AND a.maker_id = ? ');
          queryParams.push(params.makerId);
        }
        // ステータス
        if (params.statuses && Array.isArray(params.statuses) && params.statuses.length > 0) {
          sql.append('AND a.status ');
          const where = db.inQuery(params.statuses);
          sql.append(where);
          params.statuses.forEach((status) => {
            queryParams.push(status);
          });
        }

        sql.append(' GROUP BY a.sale_id, c.brand_name, d.item_name ');
        sql.append(' ORDER BY a.update_date DESC, a.sale_id DESC ');
        break;

      /** 自社工場ユーザーで詳細表示の場合 */
      case 'detail':
        sql.append('SELECT a.*, b.factory_name ');
        sql.append('FROM sale_detail a ');
        sql.append('LEFT OUTER JOIN factory_mst b ');
        sql.append('ON a.factory_id = b.factory_id ');
        sql.append('WHERE a.sale_id = ? ');
        sql.append('ORDER BY a.factory_id ');

        // 販売ID条件
        queryParams.push(params.saleId);
        break;

      /** 他社工場ユーザーの場合 */
      case 'factory':
        sql.append('SELECT a.sale_id, a.brand_id, a.product_no, a.finishing, ');
        sql.append('b.quantity, b.deadline_ymd, b.remarks, b.cost, b.status, b.cloth_arrival_ymd, b.cloth_arrival_flg, ');
        sql.append('c.brand_name, d.item_name, ');
        sql.append(`GROUP_CONCAT(e.file_name ORDER BY e.document_id, e.update_date desc SEPARATOR ',') as files `);
        sql.append('FROM sale_mng a ');
        sql.append('JOIN sale_detail b ');
        sql.append('ON a.sale_id = b.sale_id ');
        sql.append('AND b.factory_id = ? ');
        // ログインユーザーのデータのみ
        queryParams.push(factoryId);
        sql.append('LEFT OUTER JOIN brand_mst c ');
        sql.append('ON a.brand_id = c.brand_id ');
        sql.append('LEFT OUTER JOIN item_mst d ');
        sql.append('ON a.item_category_id = d.item_category_id ');
        sql.append('AND a.item_id = d.item_id ');
        // 公開ドキュメントかログインユーザーの工場が更新したもののみ
        sql.append('LEFT OUTER JOIN ');
        sql.append('( SELECT * FROM document_mng WHERE publish_flg = 1 OR upd_factory_id = ? ) e ');
        sql.append('ON a.document_id = e.document_id ');
        queryParams.push(factoryId);
        // 販売管理検索の条件
        sql.append('WHERE a.contract_ym BETWEEN ? AND ? ');
        queryParams.push(ymfrom);
        queryParams.push(ymto);
        // ステータス
        if (params.statuses && Array.isArray(params.statuses) && params.statuses.length > 0) {
          sql.append('AND a.status ');
          const where = db.inQuery(params.statuses);
          sql.append(where);
          params.statuses.forEach((status) => {
            queryParams.push(status);
          });
        }
        sql.append('GROUP BY a.sale_id, a.brand_id, a.product_no, a.finishing, ');
        sql.append('b.quantity, b.deadline_ymd, b.remarks, b.cost, b.status, b.cloth_arrival_ymd, b.cloth_arrival_flg, ');
        sql.append('c.brand_name, d.item_name ');
        sql.append('ORDER BY b.update_date DESC, a.sale_id DESC ');
        break;

      default:
        appLogger.warn(`不正なパラメータです: ${type}`);
        return null;
    }
  } catch (error) {
    appLogger.error(`buildQuery: ${error.message}`);
    return null;
  }
  const result = {
    query: sql.toString(),
    params: queryParams
  };
  return result;
};

// メッセージマッピング
const getSuccessMessage = (type) => {
  const messages = {
    company: '販売管理情報取得に成功しました。',
    detail: '詳細情報取得に成功しました。',
    factory: '販売情報取得に成功しました。',
  };

  return messages[type] || 'データ取得に成功しました。';
};

// ハンドラー関数
const handler = async (req) => {
  // URLからtypeパラメータを取得
  const type = getTypeFromURL(req, 'select');
  const logMeta = extractMeta(req, __filename);
  appLogger.debug(`↓↓↓ ${type}情報取得 Start ↓↓↓`, logMeta);

  try {
    // POSTデータ取得
    let requestParams = {};
    if (req.method === 'POST') {
      try {
        // まずリクエストの生テキストを取得して確認
        const text = await req.text();
        appLogger.debug(`Request body text: ${text}`, logMeta);

        if (text && text.trim()) {
          try {
            requestParams = JSON.parse(text);
          } catch (parseError) {
            appLogger.error(`JSON parse error: ${parseError.message}`, logMeta);
            return NextResponse.json(
              { message: 'リクエストデータの解析に失敗しました。' },
              { status: HttpStatusCodes.BAD_REQUEST }
            );
          }
        }
      } catch (e) {
        appLogger.error(e.message, logMeta);
        requestParams = {};
      }
    }

    // クエリ構築
    const queryData = buildQuery(req, type, requestParams);

    if (!queryData) {
      return NextResponse.json(
        { message: '無効なデータタイプです。' },
        { status: HttpStatusCodes.BAD_REQUEST }
      );
    }

    // 非同期DBアクセスをPromiseで実装
    const results = await new Promise((resolve, reject) => {
      db.query(req, queryData.query, queryData.params, (err, results) => {
        if (err) {
          appLogger.error(`DBエラーが発生しました: ${err}`, logMeta);
          return reject(new Error('DBエラーが発生しました.'));
        }
        resolve(results);
      });
    });
    return NextResponse.json(
      {
        message: getSuccessMessage(type),
        data: results,
      },
      { status: HttpStatusCodes.OK }
    );
  } catch (error) {
    appLogger.error(`エラーが発生しました: ${error.message}`, logMeta);
    return NextResponse.json(
      {
        message: 'エラーが発生しました。',
        error: error.message
      },
      { status: HttpStatusCodes.INTERNAL_SERVER_ERROR }
    );
  } finally {
    appLogger.debug(`↑↑↑ ${type}情報取得 End ↑↑↑`, logMeta);
  }
}

// セッションミドルウェアを適用
export const POST = sessionMiddleware(handler);