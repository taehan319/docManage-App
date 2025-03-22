/**
 * 工場管理ページ
 */
'use client';
import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import AddIcon from '@mui/icons-material/AddBox';
import FactoryIcon from '@mui/icons-material/Factory';
import DeleteIcon from '@mui/icons-material/Delete';
import { red } from '@mui/material/colors';
import { DataGridPro } from '@mui/x-data-grid-pro';
import ToastService from '@/app/utilities/toast';
import { useApi } from '../../../hooks/useApi';
import ConfirmDialog from '../../../components/confirmDialog';
import FactoriesFormModal from './components/factoriesFormModal';
import { initializeApi } from '../../../utilities/apiService';
import { localeText } from '../../../utilities/contains';
import * as func from "./function";

export default function FactoriesPage() {
  const { fetchWrapper, isLoading } = useApi();
  const [gridData, setGridData] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editingFactory, setEditingFactory] = useState(null);
  const [contentWidth, setContentWidth] = useState('calc(100vw - 300px)');
  const [contentHeight, setContentHeight] = useState('calc(100vh - 115px)');
  const [selectedRows, setSelectedRows] = useState([]);
  const [columnVisibilityModel, setColumnVisibilityModel] = useState({
    factory_id: false, // IDは非表示にする
  });
  const { refreshFactoryMaster } = useMasterData();
  const [confirmDialogProps, setConfirmDialogProps] = useState({
    open: false,
    title: '工場管理',
    confirmText: 'はい',
    cancelText: 'いいえ',
    severity: 'info',
    onConfirm: () => {}
  });

  // APIサービスの初期化
  useEffect(() => {
    initializeApi(fetchWrapper);
  }, [fetchWrapper]);

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

    // クリーンアップ
    return () => resizeObserver.disconnect();
  }, []);

  // 初回マウント時にマスタ情報を取得
  useEffect(() => {
    // 工場マスタ取得
    fetchMstData();
  }, []);

  // データ取得
  const fetchMstData = async () => {
    try {
      const data = await func.getFactoriesData(fetchWrapper);
      if (data?.data) {
        // 各行にonEdit関数を追加
        const rowsWithActions = data.data.map(row => ({
          ...row,
          onEdit: handleEditClick // 編集ハンドラーを追加
        }));
        setGridData(rowsWithActions);
      }
    } catch (error) {
      console.error('データ取得エラー: ', error);
    } 
  };

  // 追加ボタン押下時
  const handleRegisterClick = () => {
    // 送信時に既存のトーストを消去
    ToastService.dismissAll();

    setEditingFactory(null);
    setOpenModal(true);
  };

  // 編集アイコンクリック
  const handleEditClick = (data) =>{
    // 送信時に既存のトーストを消去
    ToastService.dismissAll(); 
    
    setEditingFactory(data);
    setOpenModal(true);
  };

  // 登録・更新ボタンクリック処理
  const handleModalSubmit = async (data) => {
    try {
      // 登録処理が完了したら
      setOpenModal(false);
      setEditingFactory(null);

      if (data?.data?.newfactoryId) {
        // 新規追加
        ToastService.success(`工場ID：${data?.data?.newfactoryId} を作成しました.`, {
          // ログイン成功時は0.5秒後に自動で消去
          autoClose: 500
        });
      } else {
        // 更新
        ToastService.success(`工場情報を更新しました.`, {
          // ログイン成功時は0.5秒後に自動で消去
          autoClose: 500
        });
      }

      // リスト情報を再取得
      await fetchMstData();

      //  キャッシュのマスタデータを更新
      await refreshFactoryMaster();
      
    } catch (error){
    }
  };

  // キャンセルボタンクリック処理
  const handleModalClose = () => {
    setOpenModal(false);
    setEditingFactory(null);
  };

  // 削除ボタン押下時
  const handleDeleteClick = async () => {
    const result = await func.handleDeleteFactories(selectedRows);

    // 選択行をクリア
    setSelectedRows([]);

    // データを再取得
    await fetchMstData();

    //  キャッシュのマスタデータを更新
    await refreshFactoryMaster();
  };

  // 確認ダイアログを開く関数
  const openConfirmDialog = (props) => {
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
        fontSize: '2rem',
        fontWeight: 700,
        mb: 2,
        display: 'flex',
        alignItems: 'center'
      }}>
        <FactoryIcon sx={{ fontSize: '2.5rem', mr: 1 }}/>
        工場管理
      </Typography>

      {/* ボタン部分 */}
      <Box sx={{ mb: 2 }}>
        <Button
          onClick={handleRegisterClick}
          variant='contained'
          size='medium'
          sx={{ mr: 1 }}
          startIcon={<AddIcon />}
        >
          追加
        </Button>
        <Button
          onClick={() => openConfirmDialog({
            title: '工場管理',
            message: `選択された ${selectedRows.length} 件のデータを削除してもよろしいですか？<br>この操作は取り消せません。`,
            confirmText: 'はい',
            cancelText: 'いいえ',
            severity: 'info',
            onConfirm: handleDeleteClick,
          })}
          variant='contained'
          size='medium'
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
        height: '100%',
        flex: 1,
        minHeight: 300,
        backgroundColor: 'background.paper',
        overflow: 'hidden'
      }}>
        <DataGridPro
          rows={gridData}
          columns={func.columns}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(newModel) => 
            setColumnVisibilityModel(newModel)
          }
          getRowId={(row) => row.factory_id}
          pagination
          autoPageSize
          isRowSelectable={(params) => params.id !== 0}
          checkboxSelection
          disableRowSelectionOnClick
          density='compact'
          localeText={localeText}
          onRowSelectionModelChange={(newSelectionModel) => {
            setSelectedRows(newSelectionModel);
          }}
          rowSelectionModel={selectedRows}
         />
      </Box>

      {/* モーダル */}
      <FactoriesFormModal
        open={openModal}
        onClose={handleModalClose}
        factoryData={editingFactory}
        onSubmit={handleModalSubmit}
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