/**
 * ユーザー管理画面 実務ロジック
 */
'use client';
import ToastService from '../../../utilities/toast';
import { getApiService } from '../../../utilities/apiService';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';
import Cookies from 'js-cookie';
import { decryptByKeys } from '../../../utilities/encrypt';
import * as CONST from '../../../utilities/contains';
const gridHen = 1;

/**
 * DBデータ取得処理(全件検索)
 * @param {Function} fetchWrapper - APIリクエスト用の関数
 */
export async function getUserData(fetchWrapper) {
  try {
    const result = await fetchWrapper('/api/users/selectAll', {
      method: 'POST',
    });

    if (result.ok) {
      return result.data; // データを返す
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

/**
 * ユーザー管理画面のカラム定義
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
          size="small"
          color="primary"
          disabled={!gridActivControl(gridHen, params.row.user_id)}
        >
          <EditIcon />
        </IconButton>
      );
    }
  },
  {
    field: 'user_id',
    headerName: 'ID',
    width: 90,
    sortable: true
  },
  {
    field: 'user_name',
    headerName: '名前',
    width: 150,
    sortable: true
  },
  {
    field: 'user_email',
    headerName: 'メールアドレス',
    width: 250,
    sortable: true
  },
  {
    field: 'part_name',
    headerName: '所属',
    width: 200,
    sortable: true
  }
];

// 削除処理関数
export const handleDeleteUsers = async (selectedRows) => {
  try {
    // シングルトンパターンでAPIサービスを取得
    const api = getApiService();
    const data = { userIds: selectedRows };
    const result = await api('/api/users/delete', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (result.ok) {
      ToastService.success(`${result.data?.data?.deleteCount}件のユーザーを削除しました`, {
        autoClose: 1500
      });
      return result;
    } else {
    }
  } catch (error) {
    console.error('削除エラー:', error);
  }
};

/**
 * セッション情報からログイン中のユーザーデータを取得
 */
export function getLoginUser() {
  const user = Cookies.get(process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME);
  if (user) {
    const loginData = JSON.parse(user);

    return(decryptByKeys(loginData[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO]))
  }
};

/**
 * グリッドチェックボックス活性非活性制御
 */
export function gridActivControl(mode, id) {

  // ログインユーザー情報を取得
  const lginUserData = getLoginUser();

  if (lginUserData) {
    if (lginUserData[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ADMINFLG]== String(CONST.USER_ADMIN)) {
      if (mode == 0 && id == 1) {
        // Id=1の管理者データは管理者でも削除不可、編集は可能
        return false;
      }
      // 管理者の場合全てのユーザーデータを削除、編集可能
      return true;
    } else {
      if (lginUserData[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ID] == id) {
        // 管理者以外のユーザーは自分のデータのみ削除、編集可能
        return true;
      }
      return false;
    }
  }
};

/**
 * 削除したユーザーにログインユーザーがあるかをチェック
 */
export function checkDleteUser(selectedRows) {
  // ログインユーザー情報を取得
  const lginUserData = getLoginUser();
  // 削除したユーザーにログインユーザーがあるかをチェック
  if (selectedRows.indexOf(lginUserData[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ID]) !== -1) {
    return true;
  }
  return false;
}