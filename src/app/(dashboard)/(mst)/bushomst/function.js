/**
 * 工場管理画面 実務ロジック
 */
'use client';
import ToastService from '../../../utilities/toast';
import { getApiService } from '../../../utilities/apiService';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';

/**
 * DBデータ取得処理(全件検索)
 * @param {Function} fetchWeaper - APIリクエスト用の関数
 */
export async function getFactoriesData(fetchWeaper) {
  try {
    const result = await fetchWeaper('/api/factories/selectAll', {
      method: 'POST',
    });
  
    if (result.ok) {
      // データを返す
      return result.data;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

/**
 * 工場管理画面のカラム定義
 */
export const columns = [
  {
    field: 'actions',
    headerName: '編集',
    width: 60,
    sortable: false,
    renderCell: (params) => {
      return (
        <IconButton
          onClick={() => params.row.onEdit(params.row)}
          size='small'
          color='primary'
        >
          <EditIcon />
        </IconButton>
      );
    }
  },
  {
    field: 'factory_id',
    headerName: 'ID',
    width: 90,
    sortable: true
  },
  {
    field: 'factory_name',
    headerName: '工場名',
    width: 150,
    sortable: true
  },
  {
    field: 'factory_flg',
    headerName: '区分',
    width: 150,
    sortable: true,
    renderCell: (params) => {
      return params.value === 0 ? '自社工場' : '取引先工場'
    }
  },
  {
    field: 'invoice_no',
    headerName: 'インボイス番号',
    width: 220,
    sortable: true
  }
];

// 削除処理関数
export const handleDeleteFactories = async (selectedRows) => {
  try {
    // シングルトンパターンでAPIサービスを取得
    const api = getApiService();
    const data = { factoryIds: selectedRows };

    const result = await api('/api/factories/delete', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (result.ok) {
      ToastService.success(`${result.data?.data?.deleteCount}件のデータを削除しました`, {
        autoClose: 1500
      });
    } else {
    }
  } catch (error) {
    console.error('削除エラー:', error);
  }
};
