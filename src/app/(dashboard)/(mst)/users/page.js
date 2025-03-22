/**
 * ユーザー管理
 */
'use client';
import { useEffect, useState } from 'react';
import { Button, Typography, Box } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonIcon from '@mui/icons-material/Person';
import DeleteIcon from '@mui/icons-material/Delete';
import { red } from '@mui/material/colors';
import { DataGridPro } from '@mui/x-data-grid-pro';
import ToastService from '../../../utilities/toast';
import { useApi } from '../../../hooks/useApi';
import ConfirmDialog from '../../../components/confirmDialog';
import UserFormModal from './components/userFormModal';
import { localeText } from '../../../utilities/contains';
import * as func from "./function";
import Cookies from 'js-cookie';

export default function UsersPage() {
  const { fetchWrapper, isLoading:apiLoading } = useApi();
  const [gridData, setGridData] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [contentWidth, setContentWidth] = useState('calc(100vw - 280px)');
  const [contentHeight, setContentHeight] = useState('calc(100vh - 115px)');
  // 選択された行を管理
  const [selectedRows, setSelectedRows] = useState([]);
  const [columnVisibilityModel, setColumnVisibilityModel] = useState({
    user_id: false, // IDは非表示にする
  });
  const [confirmDialogProps, setConfirmDialogProps] = useState({
    open: false,
    title: 'ユーザー管理',
    confirmText: 'はい',
    cancelText: 'いいえ',
    severity: 'info',
    onConfirm: () => {}
  });
  // リダイレクト先
  const redirectTo = process.env.NEXT_PUBLIC_REDIRECT_ROOT_TO || '/login'
  const griCheck = 0;

  // マスタデータ使用
  const { 
      factories,
      refreshFactoryMaster,
      isLoading:masterLoading
  } = useMasterData();

  // サイドバーの状態を監視してコンテンツ幅を調整
  useEffect(() => {
    const updateContentWidth = () => {
      const sideNav = document.querySelector('.MuiDrawer-paper');
      if (sideNav) {
        const sideNavWidth = sideNav.offsetWidth;
        setContentWidth(`calc(100vw - ${sideNavWidth}px - 3rem)`);
      }
    };

    // 初回実行
    updateContentWidth();

    // ResizeObserverを設定
    const resizeObserver = new ResizeObserver(updateContentWidth);
    const sideNav = document.querySelector('.MuiDrawer-paper');
    if (sideNav) {
      resizeObserver.observe(sideNav);
    }

    // 初回マウント時に工場データ取得
    refreshFactoryMaster();

    // 初回マウント時にユーザーマスタ取得
    fetchMstData();

    return () => resizeObserver.disconnect();
  }, []);

  // データ取得
  const fetchMstData = async () => {
    try {
      const data = await func.getUserData(fetchWrapper);
      if (data?.data) {
        // 各行にonEdit関数を追加
        const rowsWithActions = data.data.map(row => {
          // factory_idから所属名を取得
          const factory = factories?.find(f => f.factory_id === row.factory_id);
          return {
            ...row,
            factory_name: factory?.factory_name || '', // 所属名を設定
            onEdit: handleEditClick  // 編集ハンドラーを追加
          };
        });
        setGridData(rowsWithActions);
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    }
  };

  // 追加ボタンクリック処理
  const handleRegisterClick = () => {
    // 既存のトーストを消去
    ToastService.dismissAll();
    setEditingUser(null);  // 新規登録モードを示す
    setOpenModal(true);
  };

  // 編集アイコンクリック処理
  const handleEditClick = (user) => {
    // 既存のトーストを消去
    ToastService.dismissAll();
    setEditingUser(user);  // 編集対象のユーザー情報をセット
    setOpenModal(true);    // モーダルを開く
  };

  // 登録・更新ボタンクリック処理
  const handleModalSubmit = async (data) => {
    try {
      // 登録処理が完了したら
      setOpenModal(false);
      setEditingUser(null);

      if (data?.data?.newUserId) {
        // 新規追加
        ToastService.success(`ユーザーID：${data?.data?.newUserId} を作成しました.`, {
          // ログイン成功時は0.5秒後に自動で消去
          autoClose: 500
        });
      } else {
        // 更新
        ToastService.success(`ユーザー情報を更新しました.`, {
          // ログイン成功時は0.5秒後に自動で消去
          autoClose: 500
        });
      }

      // リスト情報を再取得
      await fetchMstData();

    } catch (error) {
    }
  };

  // キャンセルボタンクリック処理
  const handleModalClose = () => {
    // 既存のトーストを消去
    ToastService.dismissAll();
    setOpenModal(false);
    setEditingUser(null);
  };

  // 削除ボタンクリック処理を修正
  const handleDeleteClick = async () => {
    const result = await func.handleDeleteUsers(selectedRows);
    // 選択をクリア
    setSelectedRows([]);

    // データを再取得
    await fetchMstData();

    if (result.ok) {
      // 削除したユーザーにログインユーザーがあるかをチェック
      if (func.checkDleteUser(selectedRows)) {
        // クライアント側のCookieを削除
        Cookies.remove(process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME);
        Cookies.remove(process.env.NEXT_PUBLIC_SESSION_COOKIE_SESSION);
        // ページをリフレッシュしてからログインページへリダイレクト
        window.location.href = redirectTo;
      }
    }
  };

  // 確認ダイアログを開く関数
  const openConfirmDialog = (props) => {
    // 既存のトーストを消去
    ToastService.dismissAll();
    if (selectedRows.length === 0) {
      ToastService.warning('削除するデータを選択してください');
      return;
    } else {
      setConfirmDialogProps({
        ...confirmDialogProps,
        open: true,
        ...props
      });
    }
  };

  // 確認ダイアログを閉じる関数
  const closeConfirmDialog = () => {
    setConfirmDialogProps({
      ...confirmDialogProps,
      open: false
    });
  };

  return (
    <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: 0,
        width: contentWidth,
        height: contentHeight,
        transition: 'width 0.1s ease'
    }}>
      {/* タイトル部分 */}
      <Typography sx={{
        fontSize: "2rem",
        fontWeight: 700,
        mb: 2,
        display: 'flex',
        alignItems: 'center'
      }}>
        <PersonIcon sx={{ fontSize: "2.5rem", mr: 1 }} />
        ユーザー管理
      </Typography>

      {/* ボタン部分 */}
      <Box sx={{ mb: 2 }}>
        <Button
          onClick={handleRegisterClick}
          variant="contained"
          size="medium"
          sx={{ mr: 1 }}
          startIcon={<PersonAddIcon />}
        >
          追加
        </Button>
        <Button
          onClick={() => openConfirmDialog({
            title: 'ユーザー管理',
            message: `選択された ${selectedRows.length} 件のユーザーを削除してもよろしいですか？<br>この操作は取り消せません`,
            confirmText: 'はい',
            cancelText: 'いいえ',
            severity: 'info',
            onConfirm: handleDeleteClick
          })}
          variant="contained"
          size="medium"
          sx={{
            bgcolor: red[500],
            '&:hover': {
              bgcolor: red[700]
            }
          }}
          startIcon={<DeleteIcon />}
        >
          削除
        </Button>
      </Box>

      {/* DataGrid部分 */}
      <Box sx={{
          width: '100%',
          backgroundColor: 'background.paper',
          flex: 1, // 残りの空間を埋める
          minHeight: 300, // 最小の高さを確保
          overflow: 'hidden' // スクロールバーが表示されないようにする
      }}>
        <DataGridPro
          rows={gridData} // 行データ
          columns={func.columns}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(newModel) => 
            setColumnVisibilityModel(newModel)
          }
          getRowId={(row) => row.user_id} // user_idをidとして使用
          pagination
          autoPageSize  // ページサイズ可変に設定
          // チェックボックス活性非活性制御
          isRowSelectable={(params) => func.gridActivControl(griCheck, params.id)}
          checkboxSelection
          density="compact"
          localeText={localeText}
          onRowSelectionModelChange={(newSelectionModel) => {
            setSelectedRows(newSelectionModel);
          }}
          rowSelectionModel={selectedRows}
        />
      </Box>

      {/* モーダル */}
      <UserFormModal
        open={openModal}
        onClose={handleModalClose}
        userData={editingUser}
        onSubmit={handleModalSubmit}
        factories={factories}
      />

      {/* 確認ダイアログ */}
      <ConfirmDialog
        open={confirmDialogProps.open}
        title={confirmDialogProps.title}
        message={confirmDialogProps.message}
        confirmText={confirmDialogProps.confirmText}
        cancelText={confirmDialogProps.cancelText}
        severity={confirmDialogProps.severity}
        onConfirm={() => {
          confirmDialogProps.onConfirm();
          closeConfirmDialog();
        }}
        onClose={closeConfirmDialog}
      />
    </Box>
  );
}