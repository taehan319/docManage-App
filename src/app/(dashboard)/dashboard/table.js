import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import IosShareIcon from '@mui/icons-material/IosShare';
import * as CONST from '../../utilities/contains';
import { formatDate, formatYYYYMM, getGeneralLabel } from '../../lib/comCUtil';
import { convertToYYYYMMDD } from './(modal)/saleMngFormFunctions';
import dayjs from 'dayjs';


// 今日の日付を処理内で保持
const date = new Date();
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
const today = parseInt(year + month + day, 10);

// CSV出力セル
export const CsvStatusCell = (props) => {
  // propsから必要な値を取り出す
  const { row } = props;

  if (row?.csvout_flg === CONST.NUMFLG_ON) {
    // successより明るめの緑を設定
    return <IosShareIcon fontSize="small" sx={{ color: '#4caf50' }} />;
  } else {
    // CSV未出力
    return <IosShareIcon fontSize="small" color="disabled" />;
  }
};

// 状態セレクトボックス
export const StatusSelect = (props) => {
  // propsから必要な値を取り出す
  const { row, fetchWrapper, statusItems, api } = props;
  // 状態を管理するためのステート
  const [currentStatus, setCurrentStatus] = React.useState(row.status);
  const [loading, setLoading] = React.useState(false);
  const [isCanceled, setIsCanceled] = React.useState(currentStatus === CONST.STATUS_CANCELED);
  React.useEffect(() => {
    // 外部からの値の変更を検知してステートを更新
    setCurrentStatus(row?.status);
    // キャンセル状態も同時に更新
    setIsCanceled(row?.status === CONST.STATUS_CANCELED);
  }, [row?.status]);

  // 状態変更時の処理
  const handleStatusChange = async (event) => {
    event.stopPropagation();
    const newStatus = event.target.value;

    // 値が変わらない場合は何もしない
    if (newStatus === currentStatus) return;

    setLoading(true);

    try {
      // 非同期で状態更新処理を行う
      // パラメータをJSON文字列化（一貫性を保つ）
      const requestBody = JSON.stringify({
        saleId: row.sale_id,
        status: newStatus
      });

      // API呼び出しのモック
      const response = await fetchWrapper('/api/sales/update/detailStatus', {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // 成功したら、ローカルの状態を更新
        setCurrentStatus(newStatus);
        // キャンセルになった場合はコンボじゃなくするため
        setIsCanceled(newStatus === CONST.STATUS_CANCELED);
        
        // APIが存在している場合に限り実行
        if (api && typeof api.updateRows === 'function') {
          api.updateRows([{
            sale_id: row.sale_id,
            status: newStatus
          }]);
        } else {
          console.warn('グリッドAPIが利用できないため更新できません');
        }
      }
    } catch (error) {
      console.error('状態の更新に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    isCanceled ? (
      // キャンセル済の場合は変更不可
      <Typography variant='p' sx={{ pl: 1 }}>キャンセル済</Typography>
    ) : (
      // キャンセル済以外は変更可能なコンボボックス
      <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}
    >
      <FormControl fullWidth size="small" disabled={loading}>
        <Select
          value={currentStatus}
          onChange={handleStatusChange}
          variant="outlined"
          onClick={(e) => e.stopPropagation()}
          sx={{
            fontSize: '0.875rem',
            '.MuiSelect-select': {
              padding: '0.3rem 0.5rem'
            }
          }}
        >
          {statusItems.map((status) => (
            <MenuItem
              key={status.id}
              value={status.id}
            >
              {status.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* ローディング表示 */}
      {loading && (
        <CircularProgress
          size={20}
          sx={{
            position: 'absolute',
            top: '0.5rem',
            right: '1rem',
          }}
        />
      )}
    </Box>
    )
  );
};

// 生地アイコンセル
export const ClothStatusCell = (props) => {
  // propsから必要な値を取り出す
  const { row, fetchWrapper } = props;
  // React stateを使って再レンダリングを制御
  const [clothArriveFlg, setClothArriveFlg] = React.useState(row.cloth_arrival_flg);
  const formatedDate = formatDate(row.cloth_arrival_ymd);

  // 条件に基づいて背景色とボタンスタイルを決定
  let noticeBg = "";
  let chipProps = {};

  // 今日以前かどうかの判定
  const isPastOrToday = row.cloth_arrival_ymd <= today;
  // 未来日かどうかの判定a
  const isFutureDate = row.cloth_arrival_ymd > today;

  // キャンセル済かどうか
  const [isCanceled, setIsCanceled] = React.useState(row.status === CONST.STATUS_CANCELED);
  React.useEffect(() => {
    // 外部からの値の変更を検知してステートを更新
    setIsCanceled(row?.status === CONST.STATUS_CANCELED);
  }, [row?.status]);

  // 表示条件の判定
  if (clothArriveFlg === 1) {
    // 生地入荷済みの場合 - 緑のOKボタン
    chipProps = {
      icon: <CheckCircleIcon />,
      label: "OK",
      color: "success",
      onClick: handleIconClick
    };
  } else if (isFutureDate || isCanceled) {
    // 未来日＆未入荷の場合 - グレーのOKボタン
    chipProps = {
      icon: <CheckCircleIcon />,
      label: "OK",
      color: "default",
      onClick: handleIconClick
    };
  } else {
    // キャンセル済以外&今日以前&未入荷の場合 - 警告ボタン + 赤背景
    noticeBg = "rgba(255, 0, 0, 0.2)";
    chipProps = {
      icon: <WarningIcon />,
      label: "未着",
      color: "warning",
      onClick: handleIconClick
    };
  }

  // クリックイベントを追加
  async function handleIconClick(e) {
    e.stopPropagation();
    try {
      // 非同期で生地フラグ更新処理を行う
      const newValue = clothArriveFlg === 0 ? 1 : 0;
      // リクエストオブジェクトを作成
      const requestObj = {
        saleId: row.sale_id,
        clothFlg: newValue
      };

      let clothYmd = null;
      if (newValue === CONST.NUMFLG_ON
          && (!row.cloth_arrival_ymd || row.cloth_arrival_ymd <= 0)) {
        // 生地入荷予定日未定でOKに更新する場合は作業日で更新
        clothYmd = dayjs();
      }
      
      // clothYmdがnullでない場合のみ追加
      if (clothYmd !== null) {
        requestObj.clothYmd = convertToYYYYMMDD(clothYmd);
      }
      // オブジェクトをJSONに変換
      const requestBody = JSON.stringify(requestObj);

      // API呼び出しのモック
      const response = await fetchWrapper('/api/sales/update/clothFlg', {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // 成功したら、ローカルの状態とグリッドデータの両方を更新
        setClothArriveFlg(newValue);
        // 更新データの準備
        const updateData = {
          sale_id: row.sale_id,
          cloth_arrival_flg: newValue
        };
        // clothYmdがnullでない場合のみ日付を更新
        if (clothYmd !== null) {
          updateData.cloth_arrival_ymd = clothYmd;
        }
        
        // グリッドデータを更新
        props.api.updateRows([updateData]);
      }
    } catch (error) {
      console.error('生地フラグの更新に失敗しました:', error);
    }
  }

  return (
    <Box
      sx={{
        background: `${noticeBg}`,
        display: 'flex',
        paddingX: '0.5rem',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        columnGap: '0.5rem',
        width: '100%',
        height: '100%'
      }}
    >
      <Typography variant="body2" width={70}>{formatedDate}</Typography>
      <Chip
        icon={chipProps.icon}
        label={chipProps.label}
        color={chipProps.color}
        size="small"
        onClick={chipProps.onClick}
        sx={{
          height: '1.3rem',
          '& .MuiChip-label': { fontSize: '0.7rem' },
          cursor: 'pointer'
        }}
        disabled={ isCanceled }
      />
    </Box>
  );
};

/**
 * 販売管理画面のカラム定義 - Pro版DetailPanel対応
 */
export const columns = [
  {
    field: 'csvout_flg',
    headerName: 'CSV',
    width: 60,
    sortable: false,
    filterable: false,
  },
  {
    field: 'status',
    headerName: 'ステータス',
    width: 120,
    valueGetter: (params) => {
      // データソースからマスタ情報を取得
      const { getGeneralMastersByKbn } = params.api.props || {};
      return getGeneralLabel(params.value, CONST.GENERAL_KBN_STATUS, getGeneralMastersByKbn);
    },
  },
  { field: 'brand_name', headerName: 'ブランド', width: 200 },
  { field: 'product_no', headerName: '品番・品名', width: 150 },
  {
    field: 'finishing',
    headerName: '先上げ・納前',
    width: 120,
  },
  {
    field: 'cloth_arrival_ymd',
    headerName: '生地入荷予定日',
    width: 160,
  },
  {
    field: 'item_name',
    headerName: 'アイテム',
    width: 100,
  },
  {
    field: 'quantity',
    headerName: '枚数',
    width: 80,
    align: 'right',
    valueGetter: (params) => params.value?.toLocaleString()
  },
  {
    field: 'deadline_ymd',
    headerName: '納期',
    width: 120,
    valueGetter: (params) => formatDate(params.value)
  },
  {
    field: 'invoice_ym',
    headerName: '請求月',
    width: 100,
    valueGetter: (params) => formatYYYYMM(params.value)
  },
  { field: 'remarks', headerName: '備考', width: 200 },
  {
    field: 'actions',
    headerName: 'アクション',
    width: 100,
    sortable: false,
    filterable: false,
  },
];

/**
 * 販売管理画面のカラム定義(他工場ユーザー)
 */
export const columnsFactory = [
  {
    field: 'status',
    headerName: 'ステータス',
    width: 150,
  },
  { field: 'brand_name', headerName: 'ブランド', width: 150 },
  { field: 'product_no', headerName: '品番・品名', width: 150 },
  {
    field: 'finishing',
    headerName: '先上げ・納前',
    width: 120,
  },
  {
    field: 'cloth_arrival_ymd',
    headerName: '生地',
    width: 160,
  },
  {
    field: 'item_name',
    headerName: 'アイテム',
    width: 100,
  },
  {
    field: 'quantity',
    headerName: '枚数',
    width: 80,
    align: 'right',
    valueGetter: (params) => params.value?.toLocaleString()
  },
  {
    field: 'cost',
    headerName: '工賃',
    width: 100,
    align: 'right',
    valueGetter: (params) => params.value?.toLocaleString()
  },
  {
    field: 'total',
    headerName: '合計',
    width: 120,
    align: 'right',
    valueGetter: (params) => {
      // 枚数 * 工賃
      return params.row.quantity * params.row.cost;
    },
    valueFormatter: (params) => {
      if (params.value === null) return '';
      return params.value.toLocaleString();;
    }
  },
  {
    field: 'deadline_ymd',
    headerName: '納期',
    width: 120,
    valueGetter: (params) => formatDate(params.value)
  },
  { field: 'remarks', headerName: '備考', width: 200 },
  {
    field: 'actions',
    headerName: 'アクション',
    width: 100,
    sortable: false,
    filterable: false,
  },
];

// カスタムソートコンポレーター：合計行を常に最後に表示する
export const getSortComparator = () => {
  return (v1, v2, cellParams1, cellParams2) => {
    // パラメータの存在チェック
    if (!cellParams1 || !cellParams1.row) return -1;
    if (!cellParams2 || !cellParams2.row) return 1;

    // いずれかが合計行の場合、ソート対象外とする
    if (cellParams1.row.isFooter) return 1;  // 常に最後に表示
    if (cellParams2.row.isFooter) return -1;

    // 数値型の場合
    if (typeof v1 === 'number' && typeof v2 === 'number') {
      return v1 - v2;
    }

    // 日付型の場合（YYYYMMDDフォーマット）
    if (/^\d{8}$/.test(v1) && /^\d{8}$/.test(v2)) {
      return parseInt(v1) - parseInt(v2);
    }

    // 文字列型の場合
    if (typeof v1 === 'string' && typeof v2 === 'string') {
      return v1.localeCompare(v2, 'ja');
    }

    // デフォルトのソート
    if (v1 === v2) return 0;
    return v1 < v2 ? -1 : 1;
  };
};

// 集計行の生成関数
export const createTotalRow = (parentRow, details, idPrefix = 'total') => {
  if (!details || !Array.isArray(details) || details.length === 0) {
    return null;
  }

  // 枚数合計を計算
  const quantityTotal = details.reduce((sum, item) => sum + item.quantity, 0);

  // 合計金額を計算
  const totalAmount = details.reduce((sum, item) => sum + (item.quantity * item.cost), 0);

  // すべて自社工場で生産した場合の工賃合計を算出
  const ownCost = parentRow?.cost;
  const totalIfAllOwn = details.reduce((sum, item) => sum + (item.quantity * ownCost), 0);

  // 差額を計算
  const totalBenefit = totalIfAllOwn - totalAmount;

  // 自社工場の合計枚数を計算
  const selfAmountQuantity = details
    .filter(item => item.factory_id === CONST.USER_OWNERCOMPANY)
    .reduce((sum, item) => sum + item.quantity, 0);

  // 自社作業率(枚数ベース)
  const selfRateQuantity = parentRow?.quantity > 0 ? (selfAmountQuantity / parentRow?.quantity) * 100 : 0;

  // 合計行のデータを返す
  return {
    id: `${idPrefix}-${Math.random().toString(36).substr(2, 9)}`,
    detail_id: `${idPrefix}-row`,
    factory_name: '合計',
    quantity: quantityTotal,      // 枚数合計
    cost: '',                     // 工賃は合計しない
    totalCost: totalAmount,       // 合計金額
    totalMargin: totalBenefit,    // 全量自社作業した場合との差額
    selfRate: selfRateQuantity,   // 自社作業率
    isFooter: true                // ソート対象外にするためのフラグ
  };
};

// DataGridの詳細パネル用設定を生成する関数
export const getDetailPanelSettings = (handleDetailPanelExpandChange) => {
  return {
    // 詳細パネルの展開変更イベントハンドラー
    onDetailPanelExpandedRowIdsChange: (newExpandedRowIds) => {
      // 適切な処理をここに実装
    },

    // 詳細パネルの展開アイコン
    slots: {
      detailPanelExpandIcon: KeyboardArrowDownIcon,
      detailPanelCollapseIcon: KeyboardArrowUpIcon
    },

    // 詳細パネルの高さ設定
    getDetailPanelHeight: () => 'auto'
  };
};

// 合計行を含むDataGrid設定の生成
export const configureDataGridWithFooter = (rows, totalRow) => {
  // 合計行がある場合は追加し、ない場合は元のデータをそのまま返す
  const dataWithTotal = totalRow ? [...rows, totalRow] : rows;

  // カスタムソートを適用したカラム設定
  const columnsWithCustomSort = columns.map(column => ({
    ...column,
    sortComparator: getSortComparator()
  }));

  return {
    rows: dataWithTotal,
    columns: columnsWithCustomSort
  };
};