/**
 * 外部発注処理に関連する処理
 */
'use client';
import { formatDate } from '../../../lib/comCUtil';
/**
 * 合計枚数計算
 * @param {Array} orders 発注先工場リスト
 * @returns {number} 合計枚数
 */
export const calcTotalQuantity = (orders) => {
    return orders.reduce((sum, order) => sum + (order.quantity || 0), 0);
};

/**
 * 合計金額計算
 * @param {Array} orders 発注先工場リスト
 * @returns {number} 合計金額
 */
export const calcTotalAmount = (orders) => {
    return orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
};
/**
 * 発注の利益を計算する関数
 * 基本情報の合計金額 - 発注明細の合計金額を計算し、フォーマットされた文字列を返す
 * 
 * @param {Array} orders 発注明細の配列
 * @param {Object} saleData 基本情報のデータ
 * @returns {Object} 利益額と、表示用のコンポーネント
 */
export const calcTotalMargin = (orders, saleData) => {
    if (!saleData || !saleData.quantity || !saleData.cost) {
        return {
            value: 0,
            display: '0'
        };
    }

    // 基本情報の合計金額
    const totalSaleAmount = saleData.quantity * saleData.cost;

    // 発注明細の合計金額
    const totalOrderAmount = orders.reduce((sum, order) => {
        return sum + (order.quantity || 0) * (order.cost || 0);
    }, 0);

    // 差額を計算
    const margin = totalSaleAmount - totalOrderAmount;

    // 表示用フォーマット
    const formattedMargin = Math.abs(margin).toLocaleString();
    const prefix = margin >= 0 ? '+' : '-';

    let displayMargin = "";
    if (margin !== 0) {
        // 差額が発生する場合のみ表示
        displayMargin = `${prefix}${formattedMargin} 円`;
    }

    return {
        value: margin,
        display: displayMargin
    };
};

/**
 * 最小ステータス取得
 * @param {Array} orders 発注先工場リスト
 * @param {Array} statusList ステータスリスト
 * @returns {Object|null} 最小ステータス情報
 */
export const getMinStatus = (orders, statusList) => {
    if (!orders || orders.length === 0) return null;

    const minStatusFactory = orders.reduce((min, order) => {
        return (order.status < min.status) ? order : min;
    }, orders[0]);

    return statusList.find(s => s.general_key === minStatusFactory.status);
};

/**
 * 生地フラグを表示用に変換
 * @param {number} flag 生地フラグ
 * @returns {string} 表示用テキスト
 */
export const getClothFlagText = (flag) => {
    return flag === 1 ? '入荷済' : '未着';
};

/**
 * 変更があるかどうかを判定
 * @param {Array} addedOrders 追加された発注先
 * @param {Array} updatedOrders 更新された発注先
 * @param {Array} deletedOrders 削除された発注先
 * @param {string} currentRemarks 現在の備考
 * @param {string} originalRemarks 元の備考
 * @returns {boolean} 変更があるかどうか
 */
export const hasChanges = (addedOrders, updatedOrders, deletedOrders, currentRemarks, originalRemarks) => {
    return addedOrders.length > 0 ||
        updatedOrders.length > 0 ||
        deletedOrders.length > 0 ||
        (currentRemarks && currentRemarks !== originalRemarks);
};

/**
 * 送信データの準備
 * @param {Object} formData フォームデータ
 * @param {number} saleId 販売ID
 * @param {number} minStatusId 最小ステータスID
 * @param {Array} addedOrders 追加された発注先
 * @param {Array} updatedOrders 更新された発注先
 * @param {Array} deletedOrders 削除された発注先
 * @returns {Object} 送信用データ
 */
export const prepareSubmitData = (formData, saleId, minStatusId, addedOrders, updatedOrders, deletedOrders) => {
    return {
        ...formData,
        remarks: formData.remarks, // sale_mngの備考
        saleId,
        // 最小ステータス情報
        minStatus: minStatusId,
        // 発注先データの変更内容
        orders: {
            added: addedOrders.map(order => ({
                ...order,
                // APIに送信するためにフォーマット
                deadline_ymd: formatDate(order.deadline_ymd, 'YYYYMMDD'),
                cloth_arrival_ymd: formatDate(order.cloth_arrival_ymd, 'YYYYMMDD')
            })),
            updated: updatedOrders.map(order => ({
                ...order,
                // APIに送信するためにフォーマット
                deadline_ymd: formatDate(order.deadline_ymd, 'YYYYMMDD'),
                cloth_arrival_ymd: formatDate(order.cloth_arrival_ymd, 'YYYYMMDD')
            })),
            deleted: deletedOrders.map(order => ({
                sale_id: order.sale_id,
                factory_id: order.factory_id
            }))
        }
    };
};

/**
 * 新規行追加
 */
export const addNewOrder = (saleId) => {
    // ランダムなUUIDを生成
    const uuid = crypto.randomUUID();
    return {
        uuid: uuid,
        id: null,
        sale_id: saleId,
        factory_id: '',
        factory_name: '',
        status: 0,
        deadline_ymd: null,
        cloth_arrival_ymd: null,
        quantity: 0,
        cost: 0,
        total_amount: 0,
        remarks: '',
        isNew: true // 新規追加フラグ
    };
};