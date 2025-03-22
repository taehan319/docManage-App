/**
 * 販売管理 追加・登録・編集・コピー追加フォーム
 * 他社ユーザーの場合はファイルアップロードのみ操作可能
 */
'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InfoIcon from '@mui/icons-material/Info';
import Tooltip from '@mui/material/Tooltip';
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { LocalizationProvider } from '@mui/x-date-pickers-pro';
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers-pro';
import dayjs from 'dayjs';
import { useForm, Controller, useWatch } from 'react-hook-form';
import InputFileUpload from '../components/fileUploadInput';
import { useApi } from '../../../hooks/useApi';
import ToastService from '../../../utilities/toast';
import * as CONST from '../../../utilities/contains';
import * as func from './saleMngFormFunctions';
import ConfirmDialog from '../../../components/confirmDialog';

// 販売管理フォーム
const SaleMngForm = ({
  open,
  onClose,
  saleId,
  rowData,
  mode, // 'detail', 'add', 'edit', 'copy'
  userData,
  isCompanyUser,
  onSubmit // 保存時のコールバック
}) => {
  const isAdmin = userData?.[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ADMINFLG] === CONST.USER_ADMIN || userData?.[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ADMINFLG] === String(CONST.USER_ADMIN) || false;
  const factoryId = parseInt(userData?.[process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_FACTORYID]) || null;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ドキュメント関連の状態変数を追加
  const localFetchStatus = useRef(new Set());
  const [documents, setDocuments] = useState([]);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [filesToDelete, setFilesToDelete] = useState([]);
  const [documentsToUpdateFlag, setDocumentsToUpdateFlag] = useState([]);

  // 確認ダイアログの状態を管理
  const [confirmDialogProps, setConfirmDialogProps] = useState({
    open: false,
    title: '販売管理',
    message: '',
    confirmText: 'はい',
    cancelText: 'いいえ',
    severity: 'info',
    onConfirm: () => { },
  });

  // API呼び出し用のフック
  const { fetchWrapper } = useApi();

  // フォーム設定
  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    mode: 'onSubmit',
    defaultValues: func.getDefaultFormValues()
  });

  // 関連ドキュメントを取得する関数
  const fetchDocuments = useCallback(async (id) => {
    if (!id) return;

    // 既にこのIDでフェッチしたかどうかをチェック
    if (localFetchStatus.current.has(id)) {
      return;
    }

    // このIDを取得済みとして記録
    localFetchStatus.current.add(id);

    setDocumentLoading(true);

    try {
      const response = await fetchWrapper('/api/documents/select', {
        method: 'POST',
        body: JSON.stringify({ saleId: id })
      });

      if (response.data) {
        let docsData = response.data?.data || [];
        
        // コピーモードの場合
        if (mode === 'copy') {
          // コピー対象ファイルリストの作成
          const filesToCopy = docsData.map(doc => ({
            documentId: doc.document_id,
            branchNo: doc.branch_no,
            fileName: doc.file_name,
            publishFlag: doc.publish_flg
          }));
          
          // filesToCopyを設定
          setValue('filesToCopy', filesToCopy);
        }
        setDocuments(docsData);
      } else {
        // responseがない場合は空配列をセット
        setDocuments([]);
      }
    } catch (error) {
      // エラー時にはこのIDをlocalFetchStatusから削除して再取得可能にする
      localFetchStatus.current.delete(id);
      ToastService.error('ドキュメントの取得に失敗しました');
      // エラー時は空の配列を設定
      setDocuments([]);
    } finally {
      setDocumentLoading(false);
    }
  }, [fetchWrapper]);

  // ダイアログが閉じたときにキャッシュをクリアするuseEffectを追加
  useEffect(() => {
    if (!open) {
      // ダイアログが閉じられたときにフェッチ状態をリセット
      localFetchStatus.current.clear();
    }
  }, [open]);

  // 数量と工賃を監視して合計を計算
  const quantity = useWatch({ control, name: 'quantity' });
  const cost = useWatch({ control, name: 'cost' });

  // 合計金額の計算と更新
  useEffect(() => {
    // 空文字列や未入力の場合は0として扱う
    const qtyNum = quantity === '' || quantity === null || quantity === undefined ? 0 : Number(quantity);
    const costNum = cost === '' || cost === null || cost === undefined ? 0 : Number(cost);

    const total = qtyNum * costNum;
    setValue('totalCost', total);
  }, [quantity, cost, setValue]);

  // モード表示名の設定
  const getModeTitle = () => {
    switch (mode) {
      case 'detail': return '詳細表示';
      case 'add': return '新規追加';
      case 'edit': return '編集';
      case 'copy': return 'コピー追加';
      default: return '';
    }
  };

  // 読み取り専用かどうか (基本条件)
  const isReadOnly = (mode === 'detail' || !userData);

  // フィールドが編集可能かどうか (他社ユーザーの場合はファイルアップロード以外は無効)
  const isFieldDisabled = isReadOnly || (!isCompanyUser && mode === 'edit');

  // 初期データ読み込み
  useEffect(() => {
    if (!open) return;

    setLoading(true);

    // 新規追加の場合はデフォルト値を設定して終了
    if (mode === 'add') {
      reset(func.getDefaultFormValues());
      // ファイル関連状態もリセット
      setDocuments([]);
      setFilesToDelete([]);
      setUploadedFiles([]);
      setDocumentsToUpdateFlag([]);
      setLoading(false);
      return;
    }

    // rowDataがある場合はそれを使用
    if (rowData) {
      try {
        // フォーマット関数を使用してデータを変換
        const formattedData = func.formatInitialData(rowData, mode);
        // コピー追加の場合は受注日を今日の日付に設定
        if (mode === 'copy') {
          formattedData.contract_ym = dayjs(); // 今日の日付を設定
        }
        
        reset(formattedData);

        // ドキュメント取得処理を追加
        // コピー追加の場合は元のsaleIdを使う
        const targetSaleId = mode === 'copy' ? rowData.sale_id : saleId;
        fetchDocuments(targetSaleId);
      } catch (error) {
        console.error('データ変換エラー:', error);
      }
      setLoading(false);
    }
  }, [open, saleId, mode, rowData, reset, setValue, fetchDocuments]);

  // 公開フラグ変更を処理する関数
  const handlePublishFlagChange = useCallback((doc, newPublishFlag) => {
    const { updatedFlagList, updatedDocuments } = func.handlePublishFlagChange(
      doc,
      newPublishFlag,
      documentsToUpdateFlag,
      documents
    );

    setDocumentsToUpdateFlag(updatedFlagList);
    setDocuments(updatedDocuments);
  }, [documentsToUpdateFlag, documents]);

  // ファイルが変更されたときの処理（ファイル名重複チェック）
  const handleFilesChange = useCallback((files) => {
    // 既存のファイル名リスト
    const existingFileNames = documents.map(doc => doc.file_name);
    // 関数をインポートして使用
    const processedFiles = func.handleFilesChange(files, existingFileNames);
    setUploadedFiles(processedFiles);
  }, [documents]);

  // 既存ファイルの削除処理
  const handleDeleteExistingFile = useCallback((doc) => {
    const { updatedFilesToDelete, updatedDocuments } = func.handleDeleteExistingFile(
      doc,
      filesToDelete,
      documents
    );

    setFilesToDelete(updatedFilesToDelete);
    setDocuments(updatedDocuments);
  }, [filesToDelete, documents]);

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
    // 処理中を解除
    setSubmitting(false);
    setConfirmDialogProps({
      ...confirmDialogProps,
      open: false,
    });
  };

  // バリデーションエラー時のハンドラー
  const onError = (errors) => {
    // バリデーションエラー表示時に既存のトーストを消去
    ToastService.dismissAll();
    ToastService.showValidationErrors(errors);
  };

  // フォーム送信処理
  const handleFormSubmit = async (data) => {
    // 完全に読み取り専用の場合は単に閉じる
    if (isReadOnly) {
      onClose();
      return;
    }

    // 送信時に既存のトーストを消去
    ToastService.dismissAll();

    setSubmitting(true);

    // アップロードファイルの処理（重複ファイル名を新しい名前に変更）
    const processedUploadFiles = func.processUploadFiles(uploadedFiles);

    // 他社ユーザーの場合は生地入荷情報・備考とファイル情報のみを送信
    if (!isCompanyUser && mode === 'edit') {
      const forFactoryData = {
        sale_id: saleId,
        cloth_arrival_ymd: func.convertToYYYYMMDD(data.cloth_arrival_ymd),
        cloth_arrival_flg: data.cloth_arrival_flg,
        remarks: data.remarks,
        uploadedFiles: processedUploadFiles,
        filesToDelete: filesToDelete,
        documentsToUpdateFlag: documentsToUpdateFlag, // 公開フラグ変更情報を追加
        // 他社ユーザーフラグ
        isOtherCompanyUser: true
      };
      // 親コンポーネントのコールバックを呼び出し
      if (onSubmit) {
        try {
          const result = await onSubmit(mode, forFactoryData);

          // 成功時のみモーダルを閉じる
          if (result && result.ok) {
            onClose(); // モーダルを閉じる
          } else {
            // エラー時はモーダルを閉じずにエラー表示
            ToastService.error(result?.message || 'エラーが発生しました');
          }
        } catch (error) {
          // 例外発生時もモーダルを閉じない
          ToastService.error('処理中にエラーが発生しました');
        } finally {
          setSubmitting(false);
        }
      }
      return;
    }

    // 自社ユーザーの場合は全データを送信
    const processedData = func.processSendData(data, mode, documentsToUpdateFlag, uploadedFiles, filesToDelete, documents);

    // 確認ダイアログを表示
    openConfirmDialog({
      title: '販売管理',
      message: `${mode === 'add' ? '登録' : mode === 'edit' ? '更新' : mode === 'copy' ? 'コピー登録' : '処理'}します。よろしいですか？`,
      confirmText: 'はい',
      cancelText: 'いいえ',
      severity: 'info',
      onConfirm: async () => {
        try {
          // 親コンポーネントのコールバックを呼び出し
          if (onSubmit) {
            const result = await onSubmit(mode, processedData);

            // 成功時のみモーダルを閉じる
            if (result && result.ok) {
              // モーダルを閉じる
              handleCloseModal();
            } else {
              setSubmitting(false); // エラー時に処理中状態を解除
              // エラー時のファイル状態リセット
              if (!isCompanyUser && mode === 'edit') {
                // 他社ユーザー編集時は部分的にリセット
                setUploadedFiles([]);
                setFilesToDelete([]);
              }
            }
          }
        } catch (error) {
          // 例外発生時もモーダルを閉じない
          console.error('API処理エラー:', error);
          ToastService.error('処理中にエラーが発生しました');
          setSubmitting(false); // エラー時に処理中状態を解除

          // エラー時のファイル状態リセット
          if (!isCompanyUser && mode === 'edit') {
            setUploadedFiles([]);
            setFilesToDelete([]);
          }
        }
      },
      // キャンセル時の処理
      onCancel: () => {
        setSubmitting(false); // 処理中状態を解除
        // 既存のトーストメッセージをクリア
        ToastService.dismissAll();
      }
    });
  };

  // 自身のダイアログを閉じる関数
  const handleCloseModal = () => {
    if (submitting) return; // 処理中は閉じない

    // 既存のトーストを消去
    ToastService.dismissAll();
    // ファイル状態をリセット
    setUploadedFiles([]);
    setFilesToDelete([]);
    setDocumentsToUpdateFlag([]);
    // モーダルを閉じる
    onClose();
  };
  // モーダルが閉じられた時にすべてのファイル関連状態をリセット
  useEffect(() => {
    if (!open) {
      // モーダルが閉じられた時に状態をリセット
      setDocuments([]);
      setUploadedFiles([]);
      setFilesToDelete([]);
      setDocumentsToUpdateFlag([]);
      localFetchStatus.current.clear();
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason !== 'backdropClick') {
          handleCloseModal();
        }
      }}
      maxWidth='lg'
      fullWidth
      disableEscapeKeyDown
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {getModeTitle()}
          </Typography>
          <IconButton onClick={handleCloseModal} size="small" disabled={submitting}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit(handleFormSubmit, onError)}>
        <DialogContent dividers>
          {loading ? (
            <Box p={3} display="flex" justifyContent="center" alignItems="center">
              <CircularProgress size={40} />
            </Box>
          ) : (
            <Grid container rowSpacing={1} columnSpacing={2}>
              {/* 受注日 */}
              <Grid item xs={12} sm={4}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
                  <Controller
                    name="contract_ym"
                    control={control}
                    rules={func.createValidator('contract_ym', isCompanyUser)}
                    render={({ field }) => {
                      // 安全な値の確保
                      const safeValue = field.value && dayjs.isDayjs(field.value) && field.value.isValid()
                        ? field.value
                        : null;

                      return (
                        <DatePicker
                          value={safeValue}
                          onChange={(newValue) => {
                            // 有効な値のみを設定
                            if (newValue && dayjs.isDayjs(newValue) && newValue.isValid()) {
                              field.onChange(newValue);
                            } else {
                              field.onChange(null);
                            }
                          }}
                          label="受注日"
                          format="YYYY/MM/DD"
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              margin: "normal",
                              readOnly: isFieldDisabled,
                              error: !!errors.contract_ym
                            }
                          }}
                          disabled={isFieldDisabled}
                        />
                      );
                    }}
                  />
                </LocalizationProvider>
              </Grid>

              {/* 品番 */}
              <Grid item xs={12} sm={8}>
                <Controller
                  name="product_no"
                  control={control}
                  rules={func.createValidator('product_no', isCompanyUser)}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="品番・品名"
                      fullWidth
                      variant="outlined"
                      margin="normal"
                      error={!!errors.product_no}
                      disabled={isFieldDisabled}
                      InputProps={{
                        readOnly: isFieldDisabled,
                        inputProps: { maxLength: 60 }, // 入力桁数制限
                        ...(isCompanyUser ? {
                          endAdornment: (
                            <Tooltip title="請求書の品番・品名に印字されます">
                              <IconButton edge="end" size="small">
                                <InfoIcon />
                              </IconButton>
                            </Tooltip>
                          )
                        } : {})
                      }}
                    />
                  )}
                />
              </Grid>

              {/* 納期 */}
              <Grid item xs={12} sm={4}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
                  <Controller
                    name="deadline_ymd"
                    control={control}
                    rules={func.createValidator('deadline_ymd', isCompanyUser)}
                    render={({ field }) => {
                      // 安全な値の確保
                      const safeValue = field.value && dayjs.isDayjs(field.value) && field.value.isValid()
                        ? field.value
                        : null;

                      return (
                        <DatePicker
                          value={safeValue}
                          onChange={(newValue) => {
                            // 有効な値のみを設定
                            if (newValue && dayjs.isDayjs(newValue) && newValue.isValid()) {
                              field.onChange(newValue);
                            } else {
                              field.onChange(null);
                            }
                          }}
                          label="納期"
                          format="YYYY/MM/DD"
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              margin: "normal",
                              readOnly: isFieldDisabled,
                              error: !!errors.deadline_ymd
                            }
                          }}
                          disabled={isFieldDisabled}
                        />
                      );
                    }}
                  />
                </LocalizationProvider>
              </Grid>

              {/* 生地入荷予定日とフラグのコンテナ */}
              <Grid item xs={12} sm={4}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {/* 生地入荷予定日 */}
                  <Box sx={{ flexGrow: 1 }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
                      <Controller
                        name="cloth_arrival_ymd"
                        control={control}
                        rules={func.createValidator('cloth_arrival_ymd', isCompanyUser)}
                        render={({ field }) => {
                          // 安全な値の確保
                          const safeValue = field.value && dayjs.isDayjs(field.value) && field.value.isValid()
                            ? field.value
                            : null;

                          return (
                            <DatePicker
                              value={safeValue}
                              onChange={(newValue) => {
                                // 有効な値のみを設定
                                if (newValue && dayjs.isDayjs(newValue) && newValue.isValid()) {
                                  field.onChange(newValue);
                                } else {
                                  field.onChange(null);
                                }
                              }}
                              label="生地入荷予定日"
                              format="YYYY/MM/DD"
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  margin: "normal",
                                  readOnly: isFieldDisabled,
                                  error: !!errors.cloth_arrival_ymd
                                }
                              }}
                              disabled={isReadOnly} // 標準のisReadOnlyを使用(他社も更新可能)
                            />
                          );
                        }}
                      />
                    </LocalizationProvider>
                  </Box>

                  {/* 生地到着フラグ - 固定幅設定 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', ml: 1, mt: 1, width: '100px' }}>
                    <Controller
                      name="cloth_arrival_flg"
                      control={control}
                      render={({ field }) => (
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            cursor: isReadOnly ? 'default' : 'pointer', // 標準のisReadOnlyを使用(他社も更新可能)
                            p: 0.5,
                            borderRadius: 1,
                            width: '100%',
                            height: '100%',
                            '&:hover': {
                              bgcolor: isReadOnly ? 'transparent' : 'action.hover' // 標準のisReadOnlyを使用(他社も更新可能)
                            }
                          }}
                          onClick={() => {
                            if (!isReadOnly) { // 標準のisReadOnlyを使用(他社も更新可能)
                              field.onChange(field.value === 1 ? 0 : 1);
                            }
                          }}
                        >
                          {field.value === 1 ? (
                            <CheckCircleIcon color="success" fontSize="medium" />
                          ) : (
                            <CheckCircleIcon color="disabled" fontSize="medium" />
                          )}
                          <Typography
                            variant="caption"
                            color={field.value === 1 ? "success.main" : "text.disabled"}
                            sx={{ ml: 0.5, whiteSpace: 'nowrap', fontSize: '1rem' }}
                          >
                            {field.value === 1 ? "入荷済" : "未着"}
                          </Typography>
                        </Box>
                      )}
                    />
                  </Box>
                </Box>
              </Grid>

              {/* 請求月 */}
              {isCompanyUser ? (
                <Grid item xs={12} sm={4}>
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
                    <Controller
                      name="invoice_ym"
                      control={control}
                      rules={func.createValidator('invoice_ym', isCompanyUser)}
                      render={({ field }) => {
                        // 安全な値の確保
                        const safeValue = field.value && dayjs.isDayjs(field.value) && field.value.isValid()
                          ? field.value
                          : null;

                        return (
                          <DatePicker
                            value={safeValue}
                            onChange={(newValue) => {
                              // 有効な値のみを設定
                              if (newValue && dayjs.isDayjs(newValue) && newValue.isValid()) {
                                field.onChange(newValue);
                              } else {
                                field.onChange(dayjs());
                              }
                            }}
                            views={['year', 'month']}
                            openTo="month"
                            slotProps={{
                              textField: {
                                fullWidth: true,
                                size: "medium",
                                margin: "normal",
                                readOnly: isFieldDisabled,
                                error: !!errors.invoice_ym
                              }
                            }}
                            label="請求月"
                            format="YYYY/MM"
                            disabled={isFieldDisabled}
                          />
                        );
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
              ) : (
                // 他社の場合はダミー
                <Grid item xs={12} sm={4}>{/* ダミー */}</Grid>
              )}

              {/* 枚数 */}
              <Grid item xs={12} sm={4}>
                <Controller
                  name="quantity"
                  control={control}
                  rules={func.createValidator('quantity', isCompanyUser)}
                  render={({ field }) => {
                    // 数値を文字列に変換してから表示用フォーマットを適用
                    const displayValue = field.value !== null && field.value !== undefined && field.value !== ''
                      ? Number(field.value).toLocaleString()
                      : '';

                    return (
                      <TextField
                        label="枚数"
                        type="text" // 数値ではなくテキストとして扱う
                        fullWidth
                        variant="outlined"
                        margin="normal"
                        error={!!errors.quantity}
                        disabled={isFieldDisabled}
                        InputProps={{
                          readOnly: isFieldDisabled,
                          inputProps: {
                            // 右寄せ表示
                            style: { textAlign: "right" }
                          }
                        }}
                        // 表示値としてフォーマット済みの値を使用
                        value={displayValue}
                        // 入力時はカンマを取り除いて保存
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/,/g, '');
                          // 9桁までに制限
                          if (rawValue.length <= 9) {
                            if (rawValue === '') {
                              field.onChange('');
                            } else {
                              const numValue = Number(rawValue);
                              if (!isNaN(numValue)) {
                                field.onChange(rawValue); // 数値ではなく文字列として保存
                              }
                            }
                          }
                        }}
                      />
                    );
                  }}
                />
              </Grid>

              {/* 工賃 */}
              <Grid item xs={12} sm={4}>
                <Controller
                  name="cost"
                  control={control}
                  rules={func.createValidator('cost', isCompanyUser)}
                  render={({ field }) => {
                    // 数値を文字列に変換してから表示用フォーマットを適用
                    const displayValue = field.value !== null && field.value !== undefined && field.value !== ''
                      ? Number(field.value).toLocaleString()
                      : '';

                    return (
                      <TextField
                        label="工賃"
                        type="text" // 数値ではなくテキストとして扱う
                        fullWidth
                        variant="outlined"
                        margin="normal"
                        error={!!errors.cost}
                        disabled={isFieldDisabled}
                        InputProps={{
                          readOnly: isFieldDisabled,
                          startAdornment: <Typography variant="body2">￥</Typography>,
                          inputProps: {
                            // 右寄せ表示
                            style: { textAlign: "right" }
                          }
                        }}
                        // 表示値としてフォーマット済みの値を使用
                        value={displayValue}
                        // 入力時はカンマを取り除いて保存
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/,/g, '');
                          // 9桁までに制限
                          if (rawValue.length <= 9) {
                            if (rawValue === '') {
                              field.onChange('');
                            } else {
                              const numValue = Number(rawValue);
                              if (!isNaN(numValue)) {
                                field.onChange(rawValue); // 数値ではなく文字列として保存
                              }
                            }
                          }
                        }}
                      />
                    );
                  }}
                />
              </Grid>

              {/* 合計(枚数 * 工賃) */}
              <Grid item xs={12} sm={4}>
                <Controller
                  name="totalCost"
                  control={control}
                  rules={func.createValidator('totalCost', isCompanyUser)}
                  render={({ field }) => (
                    <TextField
                      value={field.value.toLocaleString()}
                      label="合計"
                      fullWidth
                      variant="outlined"
                      margin="normal"
                      InputProps={{
                        readOnly: true,
                        startAdornment: <Typography variant="body2">￥</Typography>,
                        inputProps: {
                          // 右寄せ表示
                          style: { textAlign: "right" }
                        }
                      }}
                      disabled={isFieldDisabled}
                    />
                  )}
                />
              </Grid>

              {/* 備考 */}
              <Grid item xs={12}>
                <Controller
                  name="remarks"
                  control={control}
                  rules={func.createValidator('remarks', isCompanyUser)}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="備考"
                      multiline
                      rows={3}
                      fullWidth
                      variant="outlined"
                      margin="normal"
                      disabled={isReadOnly}  // 標準のisReadOnlyを使用(他社も更新可能)
                      InputProps={{
                        readOnly: isReadOnly,  // 標準のisReadOnlyを使用(他社も更新可能)
                        inputProps: { maxLength: 200 } // 入力桁数制限
                      }}
                    />
                  )}
                />
              </Grid>

              {/* 画像アップロード - 他社ユーザーの場合でも編集可能 */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    設計書アップロード
                  </Typography>
                  {(!isCompanyUser && mode === 'edit') && (
                    <Typography variant="caption" color="primary.main">
                      ※編集可能
                    </Typography>
                  )}
                </Box>
                {/* ドキュメント読み込み中の表示 */}
                {documentLoading ? (
                  <Box p={2} display="flex" justifyContent="center" alignItems="center">
                    <CircularProgress size={24} />
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      ドキュメント読み込み中...
                    </Typography>
                  </Box>
                ) : (
                  <InputFileUpload
                    onFilesChange={handleFilesChange}
                    onDeleteExisting={handleDeleteExistingFile}
                    onPublishFlagChange={handlePublishFlagChange}
                    initialFiles={documents}
                    readOnly={isReadOnly} // 標準の読み取り専用条件のみ適用（他社ユーザーでも編集可能）
                    currentUserFactory={factoryId}
                    isAdmin={isAdmin}
                    isCopyMode={mode === 'copy'}
                    saleId={saleId}
                  />
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={handleCloseModal}
            color="inherit"
            disabled={submitting}
            variant="cancelButton"
          >
            {isReadOnly ? '閉じる' : 'キャンセル'}
          </Button>

          {!isReadOnly && (
            <Button
              type="submit"
              color="primary"
              variant="doButton"
              disabled={loading || submitting}
              startIcon={submitting && <CircularProgress size={16} color="inherit" />}
            >
              {submitting ? '処理中...' : mode === 'add' || mode === 'copy' ? '追加' : (!isCompanyUser && mode === 'edit') ? '更新' : '保存'}
            </Button>
          )}
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
        onCancel={closeConfirmDialog}
      />
    </Dialog>
  );
};

export default SaleMngForm;