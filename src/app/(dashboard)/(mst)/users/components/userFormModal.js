/**
 * ユーザー登録・編集フォーム
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
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { createValidator, setActivControl } from './function';
import ToastService from '../../../../utilities/toast';
import { userInsUpd } from './function';
import ConfirmDialog from '../../../../components/confirmDialog';
import { getLoginUser } from '../function';


export default function UserFormModal({
  open,
  onClose,
  userData = null,
  onSubmit,
  factories = [],
}) {
  const [showPassword, setShowPassword] = useState(false); // パスワード表示状態
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    mode: 'onSubmit',
    defaultValues: {
      name: '',
      email: '',
      password: '',
      factoryId: '',
    }
  });

  // 確認ダイアログの状態を管理
  const [confirmDialogProps, setConfirmDialogProps] = useState({
    open: false,
    title: 'ユーザー管理',
    message: '',
    onConfirm: () => {},
  });

  // パスワード表示切替
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const formClear = () => {
    // フォームリセット処理
    reset({
      id: '',
      name: '',
      email: '',
      password: '',
      factoryId: '',
    });
  };

  useEffect(() => {
    if (userData) {
      // factory_idが0でも正しく設定されるようにする
      const factoryIdValue = userData.factory_id !== undefined && userData.factory_id !== null 
        ? userData.factory_id 
        : '';
      reset({
        id: userData.user_id,
        name: userData.user_name,
        email: userData.user_email,
        password: '',
        now_passeword: userData.user_pass,
        factoryId: factoryIdValue,
      });
    } else {
      formClear();
    }
  }, [userData, reset]);

  // ユーザー登録処理
  const handleFetch = async (data) => {
    const result = await userInsUpd(data);

    if (result.ok) {
      // フォームリセット
      formClear();

      // 親コンポーネントのonSubmitを呼び出してデータ再取得
      onSubmit(result.data);
    }
  };

  // ログインユーザー情報を取得
  const lginUserData = getLoginUser();
  // 活性非活性制御
  const activControl = setActivControl(userData, lginUserData);

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

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason !== 'backdropClick') {
          handleCloseModal();
        }
      }}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
    >
      <DialogTitle sx={{ fontSize: '1.5rem', fontWeight: 700, paddingBottom: 0 }}>
        {userData ? 'ユーザー情報編集' : '新規登録'}
      </DialogTitle>
      <form>
        <DialogContent sx={{ paddingTop: 1 }}>
          <TextField
            fullWidth
            label="名前"
            margin="normal"
            error={!!errors.name}
            {...register('name', createValidator('name'))}
          />
          <TextField
            fullWidth
            label="メールアドレス"
            type="email"
            margin="normal"
            disabled={activControl.email}
            error={!!errors.email}
            {...register('email', createValidator('email'))}
          />
          <TextField
            fullWidth
            label={userData ? '新しいパスワード（変更する場合のみ）' : 'パスワード'}
            type={showPassword ? 'text' : 'password'} // 表示状態によって切替
            margin="normal"
            error={!!errors.password}
            {...register('password', createValidator('password', (!userData)))}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="パスワードの表示切替"
                    onClick={handleTogglePasswordVisibility}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <FormControl
            fullWidth
            margin="normal"
            error={!!errors.factoryId}
          >
            <InputLabel>所属</InputLabel>
            <Select
              label="所属"
              defaultValue={userData?.factory_id !== undefined ? userData.factory_id : ''}
              {...register('factoryId', createValidator('factoryId'))}
            >
              {factories.map((factory) => (
                <MenuItem key={factory.factory_id} value={factory.factory_id}>
                  {factory.factory_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} variant="cancelButton">
            キャンセル
          </Button>
          <Button
            type="button"
            variant="doButton"            
            onClick={handleSubmit(
              (data, event) => 
                openConfirmDialog({
                  title: 'ユーザー管理',
                  message: `${userData ? '更新' : '登録'}します。よろしいですか？`,
                  confirmText: 'はい',
                  cancelText: 'いいえ',
                  severity: 'info',
                  onConfirm: () => handleFormSubmit(data, event),
                }),
              (error) => onError(error)
            )}
          >
            {userData ? '更新' : '登録'}
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