/**
 * ドラッグアンドドロップ対応ファイルアップロードコンポーネント
 * 既存ファイルと新規ファイルを1つのテーブルに統合表示
 * 編集モードでは既存ファイルの公開・非公開切り替えも可能
 * ファイル名重複時に確認ダイアログを表示する機能を追加
 */
import * as React from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Link from '@mui/material/Link';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import * as CONST from '../../../utilities/contains';

const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
});

// ドラッグアンドドロップ領域を表すコンテナ
const DropZoneContainer = styled(Box)(({ theme, isDragActive, readOnly }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(2),
    borderWidth: 2,
    borderRadius: theme.shape.borderRadius,
    borderColor: isDragActive
        ? theme.palette.primary.main
        : readOnly
            ? theme.palette.action.disabledBackground
            : theme.palette.divider,
    borderStyle: 'dashed',
    backgroundColor: isDragActive
        ? theme.palette.action.hover
        : readOnly
            ? theme.palette.action.disabledBackground
            : theme.palette.background.paper,
    color: readOnly
        ? theme.palette.text.disabled
        : theme.palette.text.primary,
    outline: 'none',
    transition: 'border .24s ease-in-out',
    cursor: readOnly ? 'default' : 'pointer',
    '&:hover': {
        borderColor: readOnly
            ? theme.palette.action.disabledBackground
            : theme.palette.primary.light,
    }
}));

// 固定幅のテーブルセル
const FixedWidthCell = styled(TableCell)(({ width }) => ({
    width: width,
    minWidth: width,
    maxWidth: width,
}));

export default function InputFileUpload({
    saleId,            // 呼び出し元の販売ID(追加の場合はnull)
    onFilesChange,     // ファイルが変更されたときに呼び出されるコールバック関数
    onDeleteExisting,  // 既存ファイルを削除するときのコールバック
    onPublishFlagChange, // 公開フラグが変更されたときのコールバック関数
    initialFiles = [], // 初期ファイル（既存のアップロード済みファイル）
    readOnly = false,  // 読み取り専用モード
    currentUserFactory = null, // 現在のユーザーの工場ID
    isAdmin = false,   // 管理者フラグ
    isCopyMode = false // コピーモードフラグ
}) {
    const [isDragActive, setIsDragActive] = React.useState(false);
    const [inputFiles, setInputFiles] = React.useState([]);
    const [existingFiles, setExistingFiles] = React.useState([]);
    const [modifiedExistingFiles, setModifiedExistingFiles] = React.useState([]); // 変更された既存ファイル
    const initialProcessedRef = React.useRef(false);
    const inputRef = React.useRef(null);

    // ファイル重複確認ダイアログ用の状態
    const [duplicateDialogOpen, setDuplicateDialogOpen] = React.useState(false);
    const [duplicateFileQueue, setDuplicateFileQueue] = React.useState([]);
    const [currentDuplicateFile, setCurrentDuplicateFile] = React.useState(null);
    const [existingDuplicateFile, setExistingDuplicateFile] = React.useState(null);
    const [pendingFiles, setPendingFiles] = React.useState([]);
    const [deletedFiles, setDeletedFiles] = React.useState([]); // 削除されたファイル
    const [updatedFiles, setUpdatedFiles] = React.useState([]); // 更新されたファイル

    // 初期ファイルが変更されたら状態を更新
    React.useEffect(() => {
        if (initialFiles && Array.isArray(initialFiles)) {
            setExistingFiles(initialFiles);
            // コンポーネントが再マウントされた場合に初期処理フラグをリセット
            if (isCopyMode) {
                initialProcessedRef.current = false;
            }
        }
    }, [initialFiles, isCopyMode]);

    // コピーモード時の初期処理（一度だけ実行）
    React.useEffect(() => {
        // useEffectの最初に実行条件チェックを厳密に行う
        if (!isCopyMode || initialProcessedRef.current || !existingFiles.length || !onFilesChange) {
            return;
        }
        // ここまで来たら初期処理を実行してフラグを立てる
        initialProcessedRef.current = true;

        const existingFilesToCopy = existingFiles.map(file => ({
            originalFile: file,
            fileName: file.file_name,
            isPublic: file.publish_flg,
            isDisp: (isAdmin || file.publish_flg === CONST.FLG_ON || file.upd_factory_id === currentUserFactory), // 非公開のドキュメントを裏で保持(重複チェックのため)
            fromExisting: true
        }));

        // 変換した既存ファイルを通知（1回だけ）
        onFilesChange(existingFilesToCopy);
    }, [isCopyMode, existingFiles]);

    // ファイル変更通知
    React.useEffect(() => {
        // 通常モードでのファイル変更通知
        if (!isCopyMode && onFilesChange) {
            const allChanges = [
                // 新規ファイル
                ...inputFiles.map(file => ({
                    file: file.file,
                    isPublic: file.isPublic ? CONST.FLG_ON : CONST.FLG_OFF,
                    isDisp: true,
                    isNew: true
                })),
                // 更新ファイル（公開設定が変更されたファイル）
                ...updatedFiles.map(file => ({
                    originalFile: file,
                    documentId: file.document_id,
                    branchNo: file.branch_no,
                    isPublic: file.publish_flg,
                    isDisp: true,
                    publishUpdate: true
                })),
                // 削除するファイル（後方互換性のため modifiedExistingFiles も残す）
                ...deletedFiles.map(file => ({
                    originalFile: file,
                    documentId: file.document_id,
                    branchNo: file.branch_no,
                    delete: true
                }))
            ];

            onFilesChange(allChanges);
        }
    }, [inputFiles, updatedFiles, deletedFiles, isCopyMode, onFilesChange]);

    // 重複ファイル処理のための処理キュー管理
    const [isHiddenDuplicate, setIsHiddenDuplicate] = React.useState(false);
    React.useEffect(() => {
        // 処理すべき重複ファイルがあり、ダイアログが開いていない場合
        if (duplicateFileQueue.length > 0 && !duplicateDialogOpen) {
            const nextFile = duplicateFileQueue[0];
            const duplicateResult = findDuplicateFile(nextFile);

            if (duplicateResult) {
                // 重複ファイルがある場合
                setCurrentDuplicateFile(nextFile);
                setExistingDuplicateFile(duplicateResult.file);

                // 非表示ファイルかどうかを状態に保存
                const isEnableEdit = canEditFile(duplicateResult.file);
                setIsHiddenDuplicate(!isEnableEdit || duplicateResult.isHidden);

                // ダイアログを表示
                setDuplicateDialogOpen(true);
            } else {
                // 重複がない場合は通常の追加処理を行う
                addFileToInputFiles(nextFile);
                // キューから削除
                setDuplicateFileQueue(prevQueue => prevQueue.slice(1));
            }
        }
    }, [duplicateFileQueue, duplicateDialogOpen]);

    const handleDragEnter = (event) => {
        if (readOnly) return;
        event.preventDefault();
        event.stopPropagation();
        setIsDragActive(true);
    };

    const handleDragLeave = (event) => {
        if (readOnly) return;
        event.preventDefault();
        event.stopPropagation();
        setIsDragActive(false);
    };

    const handleDragOver = (event) => {
        if (readOnly) return;
        event.preventDefault();
        event.stopPropagation();
        setIsDragActive(true);
    };

    const handleDrop = (event) => {
        if (readOnly) return;
        event.preventDefault();
        event.stopPropagation();
        setIsDragActive(false);

        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            handleFiles(event.dataTransfer.files);
            event.dataTransfer.clearData();
        }
    };

    // ファイル名の重複をチェックする関数
    const findDuplicateFile = (newFile) => {
        // ファイル名を取得
        const fileName = newFile.file.name;

        // 既存の新規ファイルで重複があるか確認
        const duplicateInNew = inputFiles.find(f => f.file.name === fileName);
        if (duplicateInNew) return { file: duplicateInNew, isHidden: false };

        // 既存のアップロード済みファイルで重複があるか確認
        const duplicateInExisting = existingFiles.find(f => f.file_name === fileName);
        if (duplicateInExisting) {
            // 非表示ファイルかどうかを判定
            const isHiddenFile = !(isAdmin || duplicateInExisting.publish_flg === CONST.FLG_ON ||
                duplicateInExisting.upd_factory_id === currentUserFactory);

            return {
                file: duplicateInExisting,
                isHidden: isHiddenFile
            };
        }

        // 重複なし
        return null;
    };

    // 新規ファイルをinputFilesに追加
    const addFileToInputFiles = (fileObj) => {
        setInputFiles(prev => [...prev, fileObj]);
    };

    // 重複ファイルダイアログの「はい」（上書き）処理
    const handleOverwriteConfirm = () => {
        if (!currentDuplicateFile) return;

        // 既存ファイルの種類によって処理を分ける
        if (existingDuplicateFile.isNew) {
            // 新規追加ファイルの場合は、元のファイルを削除して新しいファイルを追加
            setInputFiles(prev => {
                const filtered = prev.filter(f => f.file !== existingDuplicateFile.file);
                return [...filtered, {
                    file: currentDuplicateFile.file,
                    isPublic: true,
                    isDisp: true,
                    isNew: true
                }];
            });
        } else {
            // 既存のアップロード済みファイルの場合は、削除リストに追加
            if (onDeleteExisting) {
                onDeleteExisting(existingDuplicateFile);
            }

            // UIから既存ファイルを削除
            setExistingFiles(prev => prev.filter(f =>
                !(f.document_id === existingDuplicateFile.document_id && f.branch_no === existingDuplicateFile.branch_no)
            ));

            // 新しいファイルを追加
            addFileToInputFiles({
                file: currentDuplicateFile.file,
                isPublic: true,
                isDisp: true,
                isNew: true
            });
        }

        // ダイアログを閉じる
        setDuplicateDialogOpen(false);

        // 次の重複ファイルの処理に進む
        setDuplicateFileQueue(prev => prev.slice(1));
        setCurrentDuplicateFile(null);
        setExistingDuplicateFile(null);
    };

    // 重複ファイルダイアログの「いいえ」（スキップ）処理
    const handleOverwriteCancel = () => {
        // ダイアログを閉じる
        setDuplicateDialogOpen(false);

        // 現在の重複ファイルはスキップして次に進む
        setDuplicateFileQueue(prev => prev.slice(1));
        setCurrentDuplicateFile(null);
        setExistingDuplicateFile(null);
    };

    const handleFiles = (fileList) => {
        if (readOnly) return;

        // ペンディング状態として保存
        const filesArray = Array.from(fileList).map(file => ({
            file: file,
            isPublic: true, // デフォルトで公開
            isDisp: true,   // 表示フラグ
            isNew: true     // 新規ファイルフラグ
        }));

        // 確認が必要なファイルをキューに追加
        setDuplicateFileQueue(prev => [...prev, ...filesArray]);
        setPendingFiles(filesArray); // 後で参照するために保存
    };

    const handleChange = (event) => {
        if (readOnly) return;
        if (event.target.files) {
            handleFiles(event.target.files);
        }
    };

    // 新規アップロードファイルの削除
    const handleDeleteFile = (fileToDelete) => {
        if (readOnly) return;
        const updatedFiles = inputFiles.filter(fileObj => fileObj.file !== fileToDelete.file);
        setInputFiles(updatedFiles);

        // コピーモード時のみ特殊処理
        if (isCopyMode && onFilesChange) {
            // 既存ファイルの変換データを作成
            const existingFilesToCopy = existingFiles.map(file => ({
                originalFile: file,
                fileName: file.file_name,
                isPublic: file.publish_flg === CONST.FLG_ON,
                fromExisting: true
            }));

            // 既存ファイルと更新後の新規ファイルを合わせて通知
            onFilesChange([...existingFilesToCopy, ...updatedFiles]);
        }
    };

    // 既存ファイルの削除処理
    const handleDeleteExistingFile = (file) => {
        if (readOnly) return;

        // 削除権限チェック
        const canDelete = isAdmin || (file.upd_factory_id === currentUserFactory);
        if (!canDelete) return;

        // 削除リストに追加
        setDeletedFiles(prev => {
            // 既に同じファイルが削除リストにあるか確認
            const exists = prev.some(f =>
                f.document_id === file.document_id && f.branch_no === file.branch_no
            );

            if (exists) {
                return prev; // 既に存在する場合は何もしない
            } else {
                // 新しい項目を追加
                return [...prev, file];
            }
        });

        // 親コンポーネントに削除イベントを通知（後方互換性のため）
        if (onDeleteExisting) {
            onDeleteExisting(file);
        }

        // 更新ファイルリストからも削除
        setUpdatedFiles(prev =>
            prev.filter(f => !(f.document_id === file.document_id && f.branch_no === file.branch_no))
        );

        // 変更ファイルリストからも削除（後方互換性のため）
        setModifiedExistingFiles(prev =>
            prev.filter(f => !(f.document_id === file.document_id && f.branch_no === file.branch_no))
        );

        // UIから削除
        setExistingFiles(prev => prev.filter(f =>
            !(f.document_id === file.document_id && f.branch_no === file.branch_no)
        ));

        // コピーモード時のみ特殊処理
        if (isCopyMode && onFilesChange) {
            // 更新された既存ファイルの変換データを作成
            const existingFilesToCopy = existingFiles.filter(f =>
                !(f.document_id === file.document_id && f.branch_no === file.branch_no)
            ).map(f => ({
                originalFile: f,
                fileName: f.file_name,
                isPublic: f.publish_flg,
                fromExisting: true
            }));

            // 既存ファイルと新規ファイルを合わせて通知
            onFilesChange([
                ...existingFilesToCopy,
                ...inputFiles.map(file => ({
                    file: file.file,
                    isPublic: file.isPublic ? CONST.FLG_ON : CONST.FLG_OFF,
                    isNew: true
                }))
            ]);
        }
    };

    // 新規ファイルの公開設定の切り替え
    const handleTogglePublic = (fileObj) => {
        if (readOnly) return;
        const updatedFiles = inputFiles.map(item =>
            item.file === fileObj.file
                ? { ...item, isPublic: !item.isPublic }
                : item
        );
        setInputFiles(updatedFiles);

        // コピーモード時のみ特殊処理
        if (isCopyMode && onFilesChange) {
            // 既存ファイルの変換データを作成
            const existingFilesToCopy = existingFiles.map(file => ({
                originalFile: file,
                fileName: file.file_name,
                isPublic: file.publish_flg,
                fromExisting: true
            }));

            // 既存ファイルと更新後の新規ファイルを合わせて通知
            onFilesChange([
                ...existingFilesToCopy,
                ...updatedFiles.map(file => ({
                    file: file.file,
                    isPublic: file.isPublic ? CONST.FLG_ON : CONST.FLG_OFF,
                    isNew: true
                }))
            ]);
        }
    };

    // 既存ファイルの公開設定の切り替え
    const handleToggleExistingPublic = (file) => {
        if (readOnly) return;

        // 権限チェック
        const canEdit = isAdmin || (file.upd_factory_id === currentUserFactory);
        if (!canEdit) return;

        // 新しい公開状態
        const newPublishFlag = file.publish_flg === CONST.FLG_ON ? CONST.FLG_OFF : CONST.FLG_ON;

        // UIの更新
        setExistingFiles(prev => prev.map(f =>
            (f.document_id === file.document_id && f.branch_no === file.branch_no)
                ? { ...f, publish_flg: newPublishFlag }
                : f
        ));

        // 変更ファイルリストを更新（切り替えたファイルだけ保持）
        setUpdatedFiles(prev => {
            // ファイル識別子
            const fileKey = `${file.document_id}-${file.branch_no}`;

            // 同じファイルが既にリストにあるか確認
            const existingIndex = prev.findIndex(f =>
                `${f.document_id}-${f.branch_no}` === fileKey
            );

            // 新しいリストを作成
            const newList = [...prev];

            if (existingIndex >= 0) {
                // 既に存在する場合は更新
                newList[existingIndex] = {
                    ...file,
                    publish_flg: newPublishFlag,
                    originalPublishFlag: file.original_publish_flg || file.publish_flg
                };
            } else {
                // 存在しない場合は追加
                newList.push({
                    ...file,
                    publish_flg: newPublishFlag,
                    originalPublishFlag: file.publish_flg // 元の値を保存
                });
            }

            return newList;
        });

        // 変更ファイルリストも更新（後方互換性のため）
        setModifiedExistingFiles(prev => {
            // 既に同じファイルが変更リストにあるか確認
            const exists = prev.some(f =>
                f.document_id === file.document_id && f.branch_no === file.branch_no
            );

            if (exists) {
                // 既存の項目を更新
                return prev.map(f =>
                    (f.document_id === file.document_id && f.branch_no === file.branch_no)
                        ? { ...f, publish_flg: newPublishFlag }
                        : f
                );
            } else {
                // 新しい項目を追加
                return [...prev, { ...file, publish_flg: newPublishFlag }];
            }
        });

        // 親コンポーネントに公開フラグ変更を通知
        if (onPublishFlagChange) {
            onPublishFlagChange(file, newPublishFlag);
        }

        // コピーモード時のみ特殊処理
        if (isCopyMode && onFilesChange) {
            // 更新された既存ファイルの変換データを作成
            const existingFilesToCopy = existingFiles.map(f => {
                if (f.document_id === file.document_id && f.branch_no === file.branch_no) {
                    return {
                        ...f,
                        publish_flg: newPublishFlag
                    };
                }
                return f;
            }).map(f => ({
                originalFile: f,
                fileName: f.file_name,
                isPublic: f.publish_flg,
                fromExisting: true
            }));

            // 既存ファイルと新規ファイルを合わせて通知
            onFilesChange([
                ...existingFilesToCopy,
                ...inputFiles.map(file => ({
                    file: file.file,
                    isPublic: file.isPublic ? CONST.FLG_ON : CONST.FLG_OFF,
                    isNew: true
                }))
            ]);
        }
    };

    // DropZoneをクリックした時の処理（ダブルダイアログを防止）
    const handleDropZoneClick = (event) => {
        if (readOnly) return;
        // イベントの伝播を停止して、ボタンのクリックイベントとの重複を防ぐ
        event.stopPropagation();
        inputRef.current.click();
    };

    // ボタンクリック時の処理（DropZoneのクリックイベントとの重複を防止）
    const handleButtonClick = (event) => {
        if (readOnly) return;
        // イベントの伝播を停止して、ファイル選択ダイアログが2回開くのを防ぐ
        event.stopPropagation();
    };

    // 削除権限判定
    const canDeleteFile = (file) => {
        // 新規ファイルの場合は常に削除可能
        if (file.isNew) return true;

        // 読み取り専用モードの場合は削除不可
        if (readOnly) return false;

        // 他社の非公開ファイルの場合は削除不可
        if (!file.isDisp) return false;

        // 管理者は全てのファイルを削除可能
        if (isAdmin) return true;

        // 工場IDが一致するファイルなら削除可能
        return file.upd_factory_id === currentUserFactory;
    };

    // 編集権限判定
    const canEditFile = (file) => {
        // 読み取り専用モードの場合は編集不可
        if (readOnly) return false;

        // 他社の非公開ファイルの場合は編集不可
        if (!file.isDisp) return false;

        // 新規ファイルの場合は常に編集可能
        if (file.isNew) return true;

        // 管理者は全てのファイルを編集可能
        if (isAdmin) return true;

        // 工場IDが一致するファイルなら編集可能
        return file.upd_factory_id === currentUserFactory;
    };

    // 既存ファイルと新規ファイルを結合
    const allFiles = [
        ...existingFiles.map(file => ({
            ...file,
            isNew: false,
            isPublic: file.publish_flg === CONST.FLG_ON,
            isDisp: (isAdmin || file.publish_flg === CONST.FLG_ON || file.upd_factory_id === currentUserFactory), // 非公開のドキュメントを裏で保持(重複チェックのため)
        })),
        ...inputFiles
    ];
    // まず表示可能なファイルだけをフィルタリングした配列を作成
    const displayableFiles = allFiles.filter(file => file.isDisp === true);

    // ファイル名のみを表示する関数
    const getFileName = (file) => {
        if (file.isNew) {
            return file.file.name;
        } else {
            return file.file_name;
        }
    };

    // 重複ファイル名の表示用関数（既存ファイルかどうかで表示を分ける）
    const getDuplicateFileName = (file) => {
        if (!file) return '';

        if (file.isNew) {
            return file.file.name;
        } else {
            return file.file_name;
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%', mt: 1, justifyContent: 'left', overflow: 'auto' }}>
            {/* ドラッグ&ドロップエリア（読み取り専用でない場合のみ表示） */}
            {!readOnly && (
                <DropZoneContainer
                    isDragActive={isDragActive}
                    readOnly={readOnly}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={handleDropZoneClick}
                    sx={{ width: '40%', maxWidth: 500 }}
                >
                    <Typography component="div" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CloudUploadIcon sx={{ fontSize: 40, color: readOnly ? 'text.disabled' : 'primary.main', mr: 1 }} />
                        {isDragActive ? 'ファイルをドロップ' : 'ファイルを選択またはドラッグ&ドロップ'}
                    </Typography>
                    <Button
                        component="label"
                        role={undefined}
                        variant="contained"
                        tabIndex={-1}
                        startIcon={<CloudUploadIcon />}
                        sx={{ mt: 2 }}
                        onClick={handleButtonClick}
                        disabled={readOnly}
                    >
                        ファイルを選択
                        <VisuallyHiddenInput
                            ref={inputRef}
                            type="file"
                            onChange={handleChange}
                            multiple
                            disabled={readOnly}
                        />
                    </Button>
                </DropZoneContainer>
            )}

            {/* 統合ファイルリスト */}
            <Box sx={{
                width: readOnly ? '100%' : '60%',
                pl: readOnly ? 0 : 3,
                pr: 1
            }}>
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small" sx={{ tableLayout: 'fixed' }}>
                        <TableHead>
                            <TableRow>
                                <TableCell width="auto">ファイル名</TableCell>
                                <FixedWidthCell width="100px">状態</FixedWidthCell>
                                <FixedWidthCell width="2rem">操作</FixedWidthCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {displayableFiles.length > 0 ? (
                                displayableFiles.map((file, index) => (
                                    <TableRow key={file.isNew ? `new-${index}` : `${file.document_id}-${file.branch_no}`}>
                                        <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            <Tooltip title={getFileName(file)}>
                                                <span>
                                                    {file.isNew ? (
                                                        <>
                                                            <Chip
                                                                label="新規"
                                                                color="primary"
                                                                size="small"
                                                                sx={{ mr: 1, height: 20, fontSize: '0.7rem' }}
                                                            />
                                                            {getFileName(file)}
                                                        </>
                                                    ) : (
                                                        <Link href={`/${process.env.NEXT_PUBLIC_FOLDER_STORAGE}/${saleId}/${getFileName(file)}`} target='_blank' >
                                                            {getFileName(file)}
                                                        </Link>
                                                    )}
                                                </span>
                                            </Tooltip>
                                        </TableCell>
                                        <FixedWidthCell width="100px">
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                {/* アイコンは常に表示するが、編集権限がない場合はクリックできない */}
                                                {canEditFile(file) ? (
                                                    <Tooltip
                                                        title={file.isPublic ? "非公開に切り替える" : "公開に切り替える"}
                                                        arrow
                                                    >
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => file.isNew ?
                                                                handleTogglePublic(file) :
                                                                handleToggleExistingPublic(file)
                                                            }
                                                            color={file.isPublic ? "success" : "default"}
                                                            sx={{ p: 0.5 }}
                                                        >
                                                            {file.isPublic ? (
                                                                <LockOpenIcon fontSize="small" />
                                                            ) : (
                                                                <LockIcon fontSize="small" />
                                                            )}
                                                        </IconButton>
                                                    </Tooltip>
                                                ) : (
                                                    <IconButton
                                                        size="small"
                                                        disabled={true}
                                                        sx={{ p: 0.5 }}
                                                    >
                                                        {file.isPublic ? (
                                                            <LockOpenIcon fontSize="small" color='success' />
                                                        ) : (
                                                            <LockIcon fontSize="small" color='default' />
                                                        )}
                                                    </IconButton>
                                                )}

                                                {/* ラベルは囲みなしテキストで表示 */}
                                                <Typography
                                                    variant="span"
                                                    backgroundColor={file.isPublic ? "success.main" : "text.secondary"}
                                                    color={file.isPublic ? "white" : "white"}
                                                    sx={{ py: 0.3, px: 1, ml: 0.5, borderRadius: '1rem' }}
                                                >
                                                    {file.isPublic ? "公開" : "非公開"}
                                                </Typography>
                                            </Box>
                                        </FixedWidthCell>
                                        <FixedWidthCell width="130px">
                                            {canDeleteFile(file) && !readOnly && (
                                                <Tooltip title="削除">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => file.isNew
                                                            ? handleDeleteFile(file)
                                                            : handleDeleteExistingFile(file)
                                                        }
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </FixedWidthCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} align="center">
                                        ファイルがありません
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>

            {/* ファイル重複確認ダイアログ */}
            <Dialog
                open={duplicateDialogOpen}
                onClose={handleOverwriteCancel}
                aria-labelledby="duplicate-dialog-title"
                aria-describedby="duplicate-dialog-description"
            >
                <DialogTitle id="duplicate-dialog-title">
                    {isHiddenDuplicate ? "アップロードエラー" : "ファイル名の重複"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="duplicate-dialog-description">
                        {isHiddenDuplicate
                            ? `「${getDuplicateFileName(currentDuplicateFile)}」というファイル名はアップロードできません。ファイル名を変更してください。`
                            : `「${getDuplicateFileName(currentDuplicateFile)}」というファイルは既に存在します。上書きしますか？`
                        }
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    {isHiddenDuplicate ? (
                        <Button onClick={handleOverwriteCancel} color="primary">
                            OK
                        </Button>
                    ) : (
                        <>
                            <Button onClick={handleOverwriteCancel} color="primary">
                                いいえ
                            </Button>
                            <Button onClick={handleOverwriteConfirm} color="primary" autoFocus>
                                はい
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
}