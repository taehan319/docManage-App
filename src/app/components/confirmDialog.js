/**
 * 確認ダイアログ
 */
import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

const ConfirmDialog = ({
  open,
  title = '確認',
  message,
  confirmText = '実行',
  cancelText = 'キャンセル',
  onConfirm, 
  onCancel, 
  onClose,
  severity = 'warning' // 'info', 'success', 'warning', 'error'を指定可能
}) => {
  // キャンセルボタンクリック時の処理
  const handleCancel = () => {
    // キャンセル処理を実行
    if (onCancel) {
      onCancel();
    }
    // ダイアログを閉じる
    if (onClose) {
      onClose();
    }
  };
  
  // 確認ボタンのスタイルをseverityに応じて変更
  const getButtonColor = () => {
    switch(severity) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'success': return 'success';
      default: return 'primary';
    }
  };
  
  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason !== 'backdropClick') {
          handleCancel();
        }
      }}
      disableEscapeKeyDown
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <div dangerouslySetInnerHTML={{ __html: message }} />
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleCancel} 
          variant="cancelButton"
          data-testid="cancel-button"
        >
          {cancelText}
        </Button>
        <Button 
          onClick={() => {
            if (onConfirm) {
              onConfirm();
            }
            // 確認ボタンクリック時はonCloseは呼ばない（onConfirm内で制御）
          }} 
          color={getButtonColor()} 
          variant="doButton"
          data-testid="confirm-button"
          autoFocus
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;