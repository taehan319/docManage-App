/**
 * 販売管理画面 実務ロジック
 */
'use client';
import dayjs from 'dayjs';
import ToastService from '../../utilities/toast';
import * as CONST from '../../utilities/contains';
import { BaseValidator } from '../../utilities/validation/baseValidator';
import { uploadFileInChunks } from '../../utilities/uploadFileChunks';

/** データ取得 */
/**
 * DBデータ取得処理(販売管理検索)
 * @param {boolean} isCompanyUser ログインユーザーフラグ
 * @param {*} params 画面の検索条件
 * @param {Function} fetchWrapper APIリクエスト用の関数
 */
export async function fetchSalesData(isCompanyUser, params, fetchWrapper) {
  const isCompany = isCompanyUser || false;
  try {
    // パラメータをJSON文字列化（一貫性を保つ）
    const requestBody = JSON.stringify(params);

    /** 受注年月とメーカーが一致する全販売情報を取得 */
    let result;
    if (isCompany) {
      /** 自社ユーザーの場合 */
      result = await fetchWrapper('/api/sales/select/company', {
        method: 'POST',
        body: requestBody, // JSON文字列化されたボディ
        headers: {
          'Content-Type': 'application/json'
        },
        showMaskForThisRequest: false // マスク表示を抑制するオプションを追加
      });
    } else {
      /** 他工場ユーザーの場合 */
      result = await fetchWrapper('/api/sales/select/factory', {
        method: 'POST',
        body: requestBody, // JSON文字列化されたボディ
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    let datas = [];
    let resDatas = [];
    // 結果が成功で、dataフィールドが存在する場合
    if (result && result.ok && result.data) {
      // dataフィールドがオブジェクトで、さらにdataプロパティがある場合（APIの二重構造に対応）
      if (result.data.data && Array.isArray(result.data.data)) {
        datas = result.data.data;
      }
      // dataフィールドが直接配列の場合
      else if (Array.isArray(result.data)) {
        datas = result.data;
      }
    }
    // 返却データの成形
    if (datas && Array.isArray(datas) && datas.length > 0) {
      resDatas = datas.map(row => ({
        ...row,
        details: [],
        isExpanded: false
      }));
    } else {
      ToastService.info('該当するデータがありません', {
        autoClose: 1500,
      });
    }
    return resDatas;
  } catch (error) {
    ToastService.error('データ取得中にエラーが発生しました');
    return [];
  }
}

/**
* DBデータ取得処理(販売管理詳細検索)
* @param {boolean} isCompanyUser ログインユーザーフラグ
* @param {*} saleId 販売ID
* @param {Function} fetchWrapper APIリクエスト用の関数
*/
export async function fetchSalesDetailData(isCompanyUser, saleId, fetchWrapper) {
  const isCompany = isCompanyUser || false;
  try {
    // 不正なIDの場合は早期リターン
    if (!saleId) {
      console.warn('[fetchSalesDetailData] 販売IDが指定されていません');
      return [];
    }

    let result;
    /** 販売IDに紐づく詳細情報を取得 */
    if (isCompany) {
      // パラメータをJSON文字列化
      const requestBody = JSON.stringify({ saleId: saleId });
      result = await fetchWrapper('/api/sales/select/detail', {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json'
        },
        showMaskForThisRequest: false // マスク表示を抑制するオプションを追加
      });
    } else {
      /** 他工場ユーザーの場合 */
      console.warn('[fetchSalesDetailData] 他工場ユーザーは詳細を取得できません');
      ToastService.warning("不正なアクセスです。");
      return [];
    }

    // 結果が成功で、dataフィールドが存在する場合
    if (result && result.ok && result.data) {
      // dataフィールドがオブジェクトで、さらにdataプロパティがある場合（APIの二重構造に対応）
      if (result.data.data && Array.isArray(result.data.data)) {
        return result.data.data;
      }
      // dataフィールドが直接配列の場合
      else if (Array.isArray(result.data)) {
        return result.data;
      }
    }
    // 有効なデータがない場合は空配列を返す
    return [];
  } catch (error) {
    return [];
  }
}

/**
* 販売データDB登録処理(自社)
* @param {*} data フォーム入力情報
* @param {boolean} isCompanyUser ログインユーザーフラグ
* @param {Function} fetchWrapper APIリクエスト用の関数
* @param {Function} showMask APIマスク表示の関数
* @param {Function} hideMask APIマスク非表示の関数
*/
export async function insertSaleMng(data, isCompanyUser, fetchWrapper, showMask, hideMask) {
  const isCompany = isCompanyUser || false;
  try {
    // データが空の場合は処理しない
    if (!data) {
      console.warn('[insertSaleMng] データが不正です');
      return null;
    }

    showMask();
    if (isCompany) {
      // パラメータをJSON文字列化
      const requestBody = JSON.stringify(data);
      const result = await fetchWrapper('/api/sales/register', {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json'
        },
        showMaskForThisRequest: false // マスク表示を抑制するオプションを追加
      });

      if (result && result.ok) {
        // 発番された販売ID
        const newSaleId = result.data.data.newSaleId;
        const files = data.uploadedFiles?.filter((file) => file.isNew === true);
        if (newSaleId && files && 0 < files.length) {
          const fileErrors = [];
          for (const file of files) {
            try {
              const res = await uploadFileInChunks(newSaleId, file.isPublic, file.file);
              if (!res || !res.ok) {
                // アップロードエラーを配列に追加
                fileErrors.push({ message: `${file.file.name}のアップロードに失敗しました。` });
              }
            } catch (uploadErr) {
              // エラーを配列に追加
              fileErrors.push({ message: `${file.file.name}: ${uploadErr.message}` });
            }
          }

          // エラーがある場合はトースト通知（表示時間を5秒に延長）
          if (fileErrors.length > 0) {
            ToastService.showValidationErrors(fileErrors, {
              autoClose: 5000 // 5秒間表示
            });
          }
        }
      }
      // ファイルアップロードの成功/失敗に関わらず、元のAPIが成功していれば成功とみなす
      return result;
    } else {
      /** 他工場ユーザーの場合 */
      ToastService.warning("不正なアクセスです。");
      return null;
    }
  } catch (error) {
    // 更新処理失敗
    return { ok: false, error: error.message };
  } finally {
    hideMask();
  }
}

/**
* 販売データDB更新処理
* @param {*} data フォーム入力情報
* @param {boolean} isCompanyUser ログインユーザーフラグ
* @param {Function} fetchWrapper APIリクエスト用の関数
* @param {Function} showMask APIマスク表示の関数
* @param {Function} hideMask APIマスク非表示の関数
*/
export async function updateSaleMng(data, isCompanyUser, fetchWrapper, showMask, hideMask) {
  const isCompany = isCompanyUser || false;
  const saleId = data.sale_id;
  try {
    // データが空の場合、販売IDが空の場合は処理しない
    if (!data || !saleId) {
      return null;
    }

    showMask();
    let result;
    if (isCompany) {
      /** 自社工場ユーザー(sale_mngの更新) */
      // パラメータをJSON文字列化
      const requestBody = JSON.stringify(data);
      result = await fetchWrapper('/api/sales/update/saleMng/mng', {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json'
        },
        showMaskForThisRequest: false // マスク表示を抑制するオプションを追加
      });
    } else {
      /** 他工場ユーザーの場合(sale_detail) */
      // パラメータをJSON文字列化
      const requestBody = JSON.stringify(data);
      result = await fetchWrapper('/api/sales/update/saleMng/detail', {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json'
        },
        showMaskForThisRequest: false // マスク表示を抑制するオプションを追加
      });
    }

    if (result && result.ok) {
      const files = data.uploadedFiles?.filter((file) => file.isNew === true);
      if (saleId && files && 0 < files.length) {
        const fileErrors = [];
        for (const file of files) {
          try {
            const res = await uploadFileInChunks(saleId, file.isPublic, file.file);
            if (!res || !res.ok) {
              // アップロードエラーを配列に追加
              fileErrors.push({ message: `${file.file.name}のアップロードに失敗しました。` });
            }
          } catch (uploadErr) {
            // エラーを配列に追加
            fileErrors.push({ message: `${file.file.name}: ${uploadErr.message}` });
          }
        }

        // エラーがある場合はトースト通知（表示時間を5秒に延長）
        if (fileErrors.length > 0) {
          ToastService.showValidationErrors(fileErrors, {
            autoClose: 5000 // 5秒間表示
          });
        }
      }

      // ファイルアップロードの成功/失敗に関わらず、元のAPIが成功していれば成功とみなす
      return result;
    } else {
      // 更新失敗
      return result;
    }
  } catch (error) {
    // 更新処理失敗
    return { ok: false, error: error.message };
  } finally {
    // ロックファイル削除
    await fetchWrapper(`/api/files/remove/${saleId}`, {
        method: 'GET',
        showMaskForThisRequest: false // マスク表示を抑制するオプションを追加
    });
    hideMask();
  }
}

/**
* 販売データコピー DB登録処理(自社)
* @param {*} data フォーム入力情報
* @param {boolean} isCompanyUser ログインユーザーフラグ
* @param {Function} fetchWrapper APIリクエスト用の関数
* @param {Function} showMask APIマスク表示の関数
* @param {Function} hideMask APIマスク非表示の関数
*/
export async function insertCopySaleMng(data, isCompanyUser, fetchWrapper, showMask, hideMask) {
  const isCompany = isCompanyUser || false;
  try {
    // データが空の場合は処理しない
    if (!data) {
      console.warn('[insertCopySaleMng] データが不正です');
      return null;
    }

    showMask();
    if (isCompany) {
      // パラメータをJSON文字列化
      const requestBody = JSON.stringify(data);
      // データ登録＋コピー元からのファイルコピー処理、ドキュメント管理への登録を実行
      const result = await fetchWrapper('/api/sales/copyadd', {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json'
        },
        showMaskForThisRequest: false // マスク表示を抑制するオプションを追加
      });

      if (result && result.ok) {
        // 発番された販売ID
        const newSaleId = result.data.data.newSaleId;
        // 新規追加ファイル
        const addfiles = data.uploadedFiles?.filter((file) => file.isNew === true);
        if (newSaleId && addfiles && 0 < addfiles.length) {
          const fileErrors = [];
          for (const file of addfiles) {
            try {
              const res = await uploadFileInChunks(newSaleId, file.isPublic, file.file);
              if (!res || !res.ok) {
                // アップロードエラーを配列に追加
                fileErrors.push({ message: `${file.file.name}のアップロードに失敗しました。` });
              }
            } catch (uploadErr) {
              // エラーを配列に追加
              fileErrors.push({ message: `${file.file.name}: ${uploadErr.message}` });
            }
          }
          // エラーがある場合はトースト通知（表示時間を5秒に延長）
          if (fileErrors.length > 0) {
            ToastService.showValidationErrors(fileErrors, {
              autoClose: 5000 // 5秒間表示
            });
          }
        }
      }
      // ファイルアップロードの成功/失敗に関わらず、元のAPIが成功していれば成功とみなす
      return result;
    } else {
      /** 他工場ユーザーの場合 */
      ToastService.warning("不正なアクセスです。");
      return null;
    }
  } catch (error) {
    // 更新処理失敗
    return { ok: false, error: error.message };
  } finally {
    hideMask();
  }
}

/**
 * フォーム バリデーションチェック
 * @param {*} type チェック対象インプット
 * @param {*} mode t:新規追加 f:更新 
 */
export const createValidator = (type, mode) => {
  const validator = new BaseValidator();

  switch (type) {
    case 'marker':
      return {
        required: "メーカーを選択してください",
      };

    // 他のバリデーションパターンを追加
    default:
      return {};
  }
};

/**
 * ファイルビューワーを開く関数
 * @param {number} info レコード情報
 * @param {Object} fileData ファイルデータ（カンマ区切りのファイル名文字列）
 * @param {Function} setViewerOpen モーダルオープン状態を設定する関数
 * @param {Function} setViewerFiles 表示ファイルを設定する関数
 * @param {Function} setViewerInfo 表示するIDを設定する関数
 * @returns {boolean} 処理結果（ファイルが存在してビューワーを開いた場合はtrue）
 */
export function openFileViewer(info, fileData, setViewerOpen, setViewerFiles, setViewerInfo) {
  // ファイルの有無を確認
  const hasFiles = Boolean(fileData && fileData.trim && fileData.trim() !== '');

  if (!hasFiles) {
    ToastService.warning("ファイルがアップロードされていません。", {
      autoClose: 1500,
    });
    return false;
  }

  // ファイル一覧を生成
  const fileList = fileData.split(',').map(file => file.trim());

  // ビューワーにファイル一覧をセット
  setViewerFiles(fileList);

  // 表示するIDをセット
  setViewerInfo(info);

  // ビューワーを開く
  setViewerOpen(true);

  return true;
}

/**
 * 追加、詳細、編集、コピー追加を実行する関数
 * @param {Object} row レコードデータ
 * @param {Function} updateCallback 更新後コールバック関数
 */
export const openSaleFormFunc = (saleId, mode, openSaleForm) => {
  openSaleForm(mode, saleId, row);
};

/**
 * キャンセル処理を実行する関数
 * @param {Object} row レコードデータ
 * @param {Function} updateCallback 更新後コールバック関数
 */
export async function cancelOrder(row, fetchWrapper, isCompanyUser, updateCallback) {
  // すでにキャンセル済みかチェック
  if (row.status === CONST.STATUS_CANCELED) {
    ToastService.warning("既にキャンセル済みです。", { autoClose: 1500 });
    return false;
  }

  try {
    // キャンセルタイプ決定（自社ユーザーは販売管理のキャンセル、他社ユーザーは詳細のキャンセル）
    const cancelType = isCompanyUser === true ? 'mng' : 'detail';

    // APIパラメータを構築
    const requestBody = JSON.stringify({
      saleId: row.sale_id
    });

    // キャンセルAPIを呼び出し
    const response = await fetchWrapper(`/api/sales/cancel/${cancelType}`, {
      method: 'POST',
      body: requestBody,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // レスポンスをチェック
    if (!response || !response.ok) {
      throw new Error('キャンセル処理に失敗しました');
    }

    // レスポンスデータを取得
    let result;
    try {
      // 標準的なfetchと同じ戻り値形式の場合
      result = await response.json();
    } catch (err) {
      // すでにJSONとして解析されている場合や他の形式の場合
      result = response.data || response;
    }

    // 成功時のメッセージ
    ToastService.success(`${row.product_no || row.sale_id}のキャンセル処理が完了しました`, { autoClose: 1500 });

    // 更新されたレコードを作成
    const updatedRow = {
      ...row,
      status: CONST.STATUS_CANCELED // キャンセル済みに更新
    };

    // 詳細データがある場合は、それも更新
    if (row.details && Array.isArray(row.details)) {
      updatedRow.details = row.details.map(detail => ({
        ...detail,
        status: CONST.STATUS_CANCELED // 詳細もキャンセル済みに更新
      }));
    }

    // 更新コールバックがあれば呼び出し
    if (updateCallback) {
      updateCallback(updatedRow);
    }
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 裁断枚数設定を開く関数
 * @param {number} id レコードID
 * @param {Function} setInventoryOpen 裁断枚数設定オープン状態を設定する関数
 * @param {Function} setInventoryId 表示するIDを設定する関数
 */
export function openInventorySetting(id, setInventoryOpen, setInventoryId) {
  // 表示するIDをセット
  setInventoryId(id);

  // フォームを開く
  setInventoryOpen(true);
}

/**
 * 外部発注処理を開く関数
 * @param {number} id レコードID
 * @param {Function} setExternalOpen 外部発注オープン状態を設定する関数
 * @param {Function} setExternalId 表示するIDを設定する関数
 */
export function openExternalOrder(id, setExternalOpen, setExternalId) {
  // 表示するIDをセット
  setExternalId(id);

  // フォームを開く
  setExternalOpen(true);
}

/**
 * 詳細パネルの展開/収縮処理
 * @param {Object} params 行データ
 * @param {boolean} isExpanded 展開状態
 * @param {Array} rows 現在の行データ配列
 * @param {Function} setRows 行データ更新関数
 * @param {boolean} isCompanyUser 自社ユーザーフラグ
 * @param {Function} fetchWrapper APIリクエスト関数
 */
export async function handleDetailPanelExpandChange(params, isExpanded, rows, setRows, isCompanyUser, fetchWrapper) {
  const saleId = params.id;
  const row = rows.find(row => row.sale_id === saleId) ?? null;

  // 詳細パネルを展開したとき
  if (isExpanded) {
    // 詳細データがまだ取得されていない場合のみ取得
    if (!row || !row?.details || row?.details?.length === 0) {
      // ローディング状態を設定
      setRows(prevRows => prevRows.map(r =>
        r.sale_id === saleId
          ? { ...r, detailsLoading: true }
          : r
      ));

      try {
        // 詳細データを取得
        const detailData = await fetchSalesDetailData(isCompanyUser, saleId, fetchWrapper);

        // 詳細データ配列を確認
        const validDetailData = Array.isArray(detailData) ? detailData : [];

        // 成功したら詳細データを設定
        setRows(prevRows => prevRows.map(r =>
          r.sale_id === saleId
            ? {
              ...r,
              details: validDetailData,
              detailsLoading: false
            }
            : r
        ));
      } catch (error) {
        console.error('詳細データ取得エラー:', error);
        // エラー時は空配列を設定
        setRows(prevRows => prevRows.map(r =>
          r.sale_id === saleId
            ? { ...r, details: [], detailsLoading: false }
            : r
        ));
      }
    }
  }
}

/**
 * 検索条件の妥当性確認と設定
 * @param {string} mode 検索モード（prev, current, next）
 * @param {Function} watch React Hook Formのwatch関数
 * @param {Function} setValue React Hook FormのsetValue関数
 * @param {Array} statusItems ステータス項目配列
 * @returns {Object|null} 検索パラメータ、エラー時はnull
 */
export function setSelectParams(mode, watch, setValue, statusItems) {
  // 入力データを取得
  const errors = [];
  // watch()で監視している値から targYm を取得
  let searchYm = watch('targYm');
  let yearMonthInt;

  // dayjs オブジェクトであることを確認
  if (searchYm && dayjs.isDayjs(searchYm) && searchYm.isValid()) {
    switch (mode) {
      case 'prev':
        // 入力値の前月を設定
        searchYm = searchYm.subtract(1, 'month');
        // フォームの値も更新
        setValue('targYm', searchYm);
        break;
      case 'current':
        // 入力値をそのまま使用
        break;
      case 'next':
        // 入力値の次月を設定
        searchYm = searchYm.add(1, 'month');
        // フォームの値も更新
        setValue('targYm', searchYm);
        break;
    }
    // YYYYMMの形式でIntに変換
    yearMonthInt = parseInt(searchYm.format('YYYYMM'), 10);
    if (!yearMonthInt || yearMonthInt === 0) {
      // エラーメッセージを表示
      errors.push("受注年月を入力してください");
    }
  } else {
    errors.push("日付が不正です");
  }

  // メーカーIDを取得
  const makerId = watch('makerId');

  // 状態（ステータス）のチェック状態を取得
  const statusValues = {};
  statusItems.forEach(item => {
    statusValues[item.id] = watch(item.id.toString());
  });

  // チェックされているステータスIDの配列を作成
  const selectedStatuses = statusItems
    .filter(item => statusValues[item.id])
    .map(item => item.id);

  if (selectedStatuses.length === 0) {
    // エラーメッセージを表示
    errors.push("状態を選択してください");
  }

  if (errors.length > 0) {
    // エラーがある場合は検索中断
    ToastService.showValidationErrors(errors);
    return null;
  }

  // 検索パラメータの作成
  const params = {
    targYm: yearMonthInt,
    makerId: makerId || null, // 未選択の場合はnull
    statuses: selectedStatuses
  };

  return params;
}

/**
 * 展開されている詳細パネルの詳細データを更新する
 * @param {Array} expandedDetailPanelIds 展開中の詳細パネルID配列
 * @param {Array} rows 現在の行データ配列
 * @param {Function} setRows 行データ更新関数
 * @param {boolean} isCompanyUser 自社ユーザーフラグ
 * @param {Function} fetchWrapper APIリクエスト関数
 */
export async function refreshExpandedPanels(expandedDetailPanelIds, rows, setRows, isCompanyUser, fetchWrapper) {
  if (!expandedDetailPanelIds || expandedDetailPanelIds.length === 0) return;

  // 展開されている行IDごとに詳細データを取得
  const detailPromises = expandedDetailPanelIds.map(async (saleId) => {
    // 新しい検索結果に該当するsaleIdが存在するか確認
    const rowExists = rows.some(row => row.sale_id === saleId);

    if (rowExists) {
      // ローディング状態を設定
      setRows(prevRows => prevRows.map(r =>
        r.sale_id === saleId
          ? { ...r, isExpanded: true, detailsLoading: true }
          : r
      ));

      try {
        // 詳細データを取得
        const detailData = await fetchSalesDetailData(isCompanyUser, saleId, fetchWrapper);

        // 成功したら詳細データを設定
        setRows(prevRows => prevRows.map(r =>
          r.sale_id === saleId
            ? {
              ...r,
              details: Array.isArray(detailData) ? detailData : [],
              detailsLoading: false,
              isExpanded: true
            }
            : r
        ));
      } catch (error) {
        console.error('詳細データ取得エラー:', error);
        // エラー時は空配列を設定
        setRows(prevRows => prevRows.map(r =>
          r.sale_id === saleId
            ? { ...r, details: [], detailsLoading: false, isExpanded: true }
            : r
        ));
      }
    }
  });

  // すべての詳細データ取得を並行処理
  await Promise.all(detailPromises);
}
