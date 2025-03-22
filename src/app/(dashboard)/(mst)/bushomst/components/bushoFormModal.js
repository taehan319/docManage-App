/**
 * 工場登録・編集フォーム
 */
'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import { createValidator, factoryInsUpd } from './function';
import ToastService from '../../../../utilities/toast';
import ConfirmDialog from '../../../../components/confirmDialog';

export default function FactoriesFormModal({
  open,
  onClose,
  factoryData = null,
  onSubmit,
}) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors }
  } = useForm ({
    mode: 'onSubmit',
    defaultValues: {
      name: '',
      kbn: 'other',
      invoice: '',
    }
  });

  // 確認ダイアログの状態を管理
  const [confirmDialogProps, setConfirmDialogProps] = useState({
    open: false,
    title: '工場管理',
    message: '',
    onConfirm: () => {},
  });

  // フォームリセット処理
  const formClear = () => {
    reset({
      id: '',
      name: '',
      kbn: 'other',
      invoice: '',
    });
    setValue('kbn', 'other');
  };

  useEffect(() => {
    if (factoryData) {
      reset({
        id: factoryData.factory_id,
        name: factoryData.factory_name,
        kbn: factoryData.factory_flg === 0 ? 'ownCampany' : 'other',
        invoice: factoryData.invoice_no,
      });
    } else {
      formClear();
    }
  }, [factoryData, reset]);

  // 工場登録処理
  const handleFetch = async (data) => {
    const result = await factoryInsUpd(data);

    if (result.ok) {
      // フォームリセット
      formClear();

      // 親コンポーネントのonSubmitを呼び出してデータ再取得
      onSubmit(result.data);
    }
  };

  const handleFormSubmit = (data, event = null) => {
    if (event) event.preventDefault();
    // 送信時に既存のトーストを消去
    ToastService.dismissAll();
    handleFetch(data);
  };

  // バリデーションエラー時のハンドラー
  const onError = (errors) => {
    // バリデーションエラー表示時に既存のトーストを消去
    ToastService.dismissAll();
    ToastService.showValidationErrors(errors);
  };

  // モーダルを閉じる共通処理
  const handleCloseModal = () => {
    // 既存のトーストを消去
    ToastService.dismissAll();
    // フォームをリセット
    formClear();
    // モーダルを閉じる
    onClose();
  };

  // 確認ダイアログを開く関数
  const openConfirmDialog = (props) => {
    setConfirmDialogProps({
      ...confirmDialogProps,
      open: true,
      ...props,
    });
  };

  // 確認ダイアログを閉じる関数
  const closeConfirmDialog = () => {
    setConfirmDialogProps({
      ...confirmDialogProps,
      open: false,
    });
  };

  const kbnValue = watch('kbn', 'other');

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason !== 'backdropClick') {
          handleCloseModal();
        }
      }}
      maxWidth='sm'
      fullWidth
      disableEscapeKeyDown
    >
      <DialogTitle sx={{ fontSize: '1.5rem', fontWeight: 700, paddingBottom: 0 }}>
        {factoryData ? '工場情報編集' : '新規登録'}
      </DialogTitle>
      <form>
        <DialogContent sx={{ paddingTop: 1 }}>
          <TextField
            fullWidth
            label='名前'
            margin='normal'
            name='name'
            error={!!errors.name}
            {...register('name', createValidator('name'))}
          />
          <div style={{ paddingTop: '10px' }}>
            <ToggleButtonGroup
              color='primary'
              value={kbnValue}
              exclusive
              aria-label='Platform'
            >
              <ToggleButton style={{ flex: 1, minWidth: 120 }} value='ownCampany' disabled={true}>自社工場</ToggleButton>
              <ToggleButton style={{ flex: 1, minWidth: 120 }} value='other' disabled={true}>取引先工場</ToggleButton>
            </ToggleButtonGroup>
          </div>
          <TextField
            fullWidth
            label='インボイス番号'
            margin='normal'
            name='invoice'
            error={!!errors.invoice}
            {...register('invoice', createValidator('invoice'))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} variant='cancelButton'>
            キャンセル
          </Button>
          <Button
            type='button'
            variant='doButton'
            onClick={handleSubmit(
              (data, event) =>
                openConfirmDialog({
                  title: '工場管理',
                  message: `${factoryData ? '更新' : '登録'}します。よろしいですか？`,
                  confirmText: 'はい',
                  cancelText: 'いいえ',
                  severity: 'info',
                  onConfirm: () => handleFormSubmit(data, event),
                }),
              (error) => onError(error)
            )}
          >
            {factoryData ? '更新' : '登録'}
          </Button>
        </DialogActions>
      </form>

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
    </Dialog>
  );
}