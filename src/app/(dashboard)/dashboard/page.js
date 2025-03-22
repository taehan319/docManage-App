'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import Paper from '@mui/material/Paper';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import SalesIcon from '@mui/icons-material/Inventory';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { LocalizationProvider } from '@mui/x-date-pickers-pro';
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers-pro';
import dayjs from 'dayjs';
import ja from 'dayjs/locale/ja';
import { useForm, Controller } from 'react-hook-form';
import { DataGridPro } from '@mui/x-data-grid-pro';
import { localeText } from '../../utilities/contains';
import * as func from './function';
import * as tbl from './table';
import { OutLineCheckBoxLabel } from './components/outLineCheckBox';
import ConfirmDialog from '../../components/confirmDialog';
import ToastService from '../../utilities/toast';
import { useUserContext } from '../layout';
import { useApi } from '../../hooks/useApi';
import * as CONST from '../../utilities/contains';

// ダッシュボード固有のモーダルウィンドウ
import FileViewerModal from './(modal)/fileViewerModal';
import SaleMngForm from './(modal)/saleMngForm';

// 日本語ロケールを設定
dayjs.locale('ja');

export default function DashboardPage() {
    const router = useRouter();
    const [rows, setRows] = useState([]);
    // 展開されている行IDを管理するstate変数
    const [expandedDetailPanelIds, setExpandedDetailPanelIds] = useState([]);
    const { fetchWrapper, isLoading: apiLoading, showMask, hideMask } = useApi();

    // ユーザーコンテキストから情報を取得	
    const { userData, isCompanyUser } = useUserContext();

    // 認証状態を確認
    useEffect(() => {
        try {
            if (!userData) {
                router.push('/login');
                return;
            }
        } catch (error) {
            console.error("userのパース処理に失敗しました:", error);
            router.push('/login');
        }
    }, [router, userData]);

    // ↓↓ 認証後の処理 ↓↓
    const [initialLoading, setInitialLoading] = useState(true); // 初期ロード用の状態
    const [contentWidth, setContentWidth] = useState('calc(100vw - 280px)');
    const [contentHeight, setContentHeight] = useState('calc(100vh - 115px)');
    // 子画面モーダル用
    const [saleFormOpen, setSaleFormOpen] = useState(false);
    const [saleFormId, setSaleFormId] = useState(null);
    const [saleFormRowData, setSaleFormRowData] = useState(null);
    const [saleFormMode, setSaleFormMode] = useState('add'); // 'add', 'edit', 'detail', 'copy'

    // データ取得関数
    const performSearch = async (searchParams = {}) => {
        setRows([]);
        try {
            // 初期ロード中でない場合のみマスクを表示
            if (!initialLoading) {
                showMask();
            }
            // 検索の実行
            const data = await func.fetchSalesData(isCompanyUser, searchParams, fetchWrapper);

            // 現在展開されている行のIDを保存
            const currentExpandedIds = expandedDetailPanelIds;

            // データの設定（展開状態はリセットせずに維持）
            setRows(data);

            // 展開されていた行がある場合、それらの詳細データを取得
            if (currentExpandedIds.length > 0) {
                await func.refreshExpandedPanels(
                    currentExpandedIds, data, setRows, isCompanyUser, fetchWrapper
                );
            }
        } catch (error) {
            ToastService.error('検索処理でエラーが発生しました');
        } finally {
            // 初期ロード中でない場合のみマスクを非表示
            if (!initialLoading) {
                hideMask();
            }
        }
    };

    // 共通の開閉関数
    const openSaleForm = (mode, id = null, rowData = null) => {
        setSaleFormMode(mode);
        setSaleFormId(id);
        setSaleFormRowData(rowData);
        setSaleFormOpen(true);
    };

    const closeSaleForm = () => {
        setSaleFormOpen(false);
    };
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerFiles, setViewerFiles] = useState([]);
    const [viewerInfo, setViewerInfo] = useState(null);
    const [confirmDialogProps, setConfirmDialogProps] = useState({
        open: false,
        title: 'キャンセル処理',
        message: '',
        confirmText: 'はい',
        cancelText: 'キャンセル',
        severity: 'warning',
        onConfirm: () => { }
    });
    // 確認ダイアログを開く関数
    const openConfirmDialog = (props) => {
        setConfirmDialogProps({
            ...confirmDialogProps,
            open: true,
            ...props
        });
    };

    // 確認ダイアログを閉じる関数
    const closeConfirmDialog = () => {
        setConfirmDialogProps({
            ...confirmDialogProps,
            open: false
        });
    };

    const [inventoryOpen, setInventoryOpen] = useState(false);
    const [inventoryId, setInventoryId] = useState(null);
    const [externalOpen, setExternalOpen] = useState(false);
    const [externalId, setExternalId] = useState(null);
    const modals = {
        // ファイルビューワー
        setViewerOpen, setViewerFiles, setViewerInfo,
        // 販売管理フォーム (詳細・編集・追加・コピー)
        openSaleForm,
        // 確認ダイアログ(キャンセル処理)
        openConfirmDialog,
        // 裁断枚数設定
        setInventoryOpen, setInventoryId,
        // 外部発注
        setExternalOpen, setExternalId
    };

    // 裁断枚数を起動する行のブランド名取得関数
    const getIventryBrandName = (saleId) => {
        const targetRow = rows.find(row => row.sale_id === saleId);
        if (!targetRow || targetRow === undefined) {
            console.error(`sale_id: ${saleId} 対象行がありません`);
            return "";
        }
        return targetRow.brand_name ?? "";
    }
    
    // 裁断枚数を起動する行のアイテム名取得関数
    const getIventryItemName = (saleId) => {
        const targetRow = rows.find(row => row.sale_id === saleId);
        if (!targetRow || targetRow === undefined) {
            console.error(`sale_id: ${saleId} 対象行がありません`);
            return "";
        }
        return targetRow.item_name ?? "";
    }

    // フォーム送信時の処理
    const handleSaleFormSubmit = async (mode, data) => {
        // モードに応じた処理
        let result;
        try {
            switch (mode) {
                case 'add':
                    // 新規追加処理
                    result = await func.insertSaleMng(data, isCompanyUser, fetchWrapper, showMask, hideMask);
                    break;
                case 'edit':
                    // 編集処理
                    result = await func.updateSaleMng(data, isCompanyUser, fetchWrapper, showMask, hideMask);
                    break;
                case 'copy':
                    // コピー追加処理
                    result = await func.insertCopySaleMng(data, isCompanyUser, fetchWrapper, showMask, hideMask);
                    break;
            }
        } catch (error) {
            // 登録・更新エラー
            ToastService.error(error.message);
        }
        if (result && result.ok) {
            // 成功したら再検索を実行
            handleSearchClick();
        }
        return result;
    };

    // ステータスの定義
    // 汎用マスタから取得したステータス情報を保持するstate
    const [statusItems, setStatusItems] = useState([
        { id: 0, name: '未着手' },
        { id: 1, name: '作業中' },
        { id: 2, name: '作業済' },
        { id: 3, name: '納品済' },
        { id: 4, name: 'キャンセル済' },
    ]);

    // React Hook Form の初期化
    const { register, control, watch, setValue, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            all: true,
            targYm: dayjs(), // 現在の日付（今日）を設定
            makerId: "", // メーカーの初期値
            // statusItemsはuseEffectで動的に設定するのでここでは指定しない
        }
    });

    // 汎用マスタからステータスが読み込まれたらフォームのデフォルト値も更新
    useEffect(() => {
        if (statusItems.length > 0) {
            // ステータスごとのチェックボックスのデフォルト値を設定
            const defaultStatusValues = statusItems.reduce((acc, status) => {
                acc[status.id] = true;
                return acc;
            }, {});

            // デフォルト値を設定
            setValue('all', true);
            // 各ステータスのチェックボックスに値を設定
            Object.entries(defaultStatusValues).forEach(([key, value]) => {
                setValue(key.toString(), value);
            });
        }
    }, [statusItems, setValue]);

    // すべてのチェックボックスの値を監視
    const allValues = watch();

    // 個別ステータスの変更に応じて「すべて」の状態を更新
    useEffect(() => {
        const allChecked = statusItems.every(item => allValues[item.id]);
        if (allChecked !== allValues.all) {
            setValue('all', allChecked);
        }
    }, [statusItems.map(item => allValues[item.id]), setValue, allValues.all]);

    // 「すべて」が変更された時のハンドラー
    const handleAllChange = (event) => {
        const newValue = event.target.checked;

        // すべての個別ステータスを「すべて」と同じ状態に更新
        setValue('all', newValue);
        statusItems.forEach(item => {
            setValue(item.id.toString(), newValue);
        });
    };

    // サイドバーの状態を監視してコンテンツ幅を調整
    useEffect(() => {
        const updateContentWidth = () => {
            const sideNav = document.querySelector('.MuiDrawer-paper');
            if (sideNav) {
                const sideNavWidth = sideNav.offsetWidth;
                setContentWidth(`calc(100vw - ${sideNavWidth}px - 5rem)`);
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

    /**
     * 検索処理
     * @param {String} targYm
     * 　prev: 入力値の前月, current: 入力値, next: 入力値の次月
     */
    const handleSearchClick = async (mode = 'current') => {
        // 検索パラメータを設定
        const params = func.setSelectParams(mode, watch, setValue, statusItems);

        // ここまで来たら表示されているエラーを消去
        ToastService.dismissAllIfAnyActive();
        if (!params) {
            // 検索不可
            return;
        }

        // 共通化した検索処理を呼び出し
        await performSearch(params);
    };

    const handleRegisterClick = () => {
        // 追加処理
        openSaleForm('add');
    };

    // マスタロードと初期検索を統合して管理
    const loadInitialData = async () => {
        try {
            // マスク表示
            showMask();

            // 無限ループを防ぐためにタイムアウト設定を追加
            let waitCount = 0;
            const maxWait = 50; // 最大待機回数（5秒程度）

            if (isCompanyUser) {
                // 自社ユーザーの場合はマスタデータの読み込みを待つが、無限に待たない
                while (masterLoading && waitCount < maxWait) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    waitCount++;
                }

                // タイムアウトした場合でもマスタデータがある程度あれば処理を継続
                if (waitCount >= maxWait) {
                    console.warn('マスタデータのロード待機がタイムアウトしました。利用可能なデータで処理を続行します。');
                }
            }

            // 現在の年月を取得
            const currentYm = watch('targYm');
            // YYYYMMの形式でIntに変換
            const yearMonthInt = parseInt(currentYm.format('YYYYMM'), 10);

            // すべてのステータスを選択
            const allStatuses = statusItems.map(item => item.id);

            // 初期検索用のパラメータ
            const initialParams = {
                targYm: yearMonthInt,
                makerId: null,
                statuses: allStatuses
            };

            // 初期検索を実行
            await performSearch(initialParams);

        } catch (error) {
            ToastService.error('データの読み込みに失敗しました');
        } finally {
            // 初期ロード完了
            setInitialLoading(false);
            // マスク非表示
            hideMask();
        }
    };

    // 初期読み込み処理
    useEffect(() => {
        // ユーザーデータが揃ったら初期データ読み込みを開始
        if (userData) {
            loadInitialData();
        }
    }, [userData]);

    // DashboardPage.js内でカラムを拡張
    const columnsWithModals = React.useMemo(() => {
        if (isCompanyUser) {
            // 自社工場ユーザー
            return tbl.columns.map(column => {
                if (column.field === 'actions') {
                    return {
                        ...column,
                    };
                }
                // 生地カラムの修正
                if (column.field === 'cloth_arrival_ymd') {
                    return {
                        ...column,
                    };
                }
                return column;
            });
        } else {
            // 他工場ユーザー
            return tbl.columnsFactory.map(column => {
                if (column.field === 'actions') {
                    return {
                        ...column,
                    };
                }
                // 状態カラムの修正
                if (column.field === 'status') {
                    return {
                        ...column,
                        // renderCell: (params) => <StatusSelect {...params} fetchWrapper={fetchWrapper} statusItems={statusItems} />
                    };
                }
                // 生地カラムの修正
                if (column.field === 'cloth_arrival_ymd') {
                    return {
                        ...column,
                        // renderCell: (params) => <ClothStatusCell {...params} fetchWrapper={fetchWrapper} />
                    };
                }
                return column;
            });
        }
    }, [modals, fetchWrapper, statusItems]);

    // DataGridProでのイベントハンドラを設定
    const handleDetailPanelExpandChange = React.useCallback(
        (params, isExpanded) => {
            // function.jsの関数を呼び出し
            func.handleDetailPanelExpandChange(
                params, isExpanded, rows, setRows, isCompanyUser, fetchWrapper
            );
        },
        [rows, isCompanyUser, fetchWrapper, setRows]
    );

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
                <SalesIcon sx={{ fontSize: "2.5rem", mr: 1 }} />
                販売管理
            </Typography>

            {/* 表示条件 */}
            <Box>
                <FormGroup row sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="body1" sx={{ mr: 1 }}>状態：</Typography>

                    <Controller
                        name="all"
                        control={control}
                        render={({ field }) => (
                            <OutLineCheckBoxLabel
                                checked={field.value}
                                control={
                                    <Checkbox
                                        {...field}
                                        onChange={handleAllChange}
                                        color="primary"
                                    />
                                }
                                label="すべて"
                            />
                        )}
                    />

                    {statusItems.map(status => (
                        <Controller
                            key={status.id}
                            name={status.id.toString()} // IDを文字列として使用
                            control={control}
                            render={({ field }) => (
                                <OutLineCheckBoxLabel
                                    checked={field.value}
                                    control={
                                        <Checkbox
                                            {...field}
                                            color="primary"
                                        />
                                    }
                                    label={status.name} // 表示名を使用
                                />
                            )}
                        />
                    ))}
                </FormGroup>


                {/* 年月、メーカーで絞り込み(請求書の発行単位を考慮) */}
                <FormGroup row sx={{ alignItems: 'center', mt: 2 }}>
                    <Typography variant="body1" sx={{ mr: 1 }}>受注年月：</Typography>

                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
                        {/* 前月ボタン */}
                        <IconButton
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSearchClick('prev');
                            }}
                            size='large'
                            color='primary'
                        >
                            <ArrowBackIosNewIcon />
                        </IconButton>
                        <Controller
                            name="targYm"
                            control={control}
                            render={({ field }) => {
                                // nullや無効な値の場合、現在の日付にフォールバック
                                const safeValue = field.value && dayjs.isDayjs(field.value) && field.value.isValid()
                                    ? field.value
                                    : dayjs();

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
                                                size: "small",
                                                sx: { width: 150 }
                                            }
                                        }}
                                        format="YYYY年MM月"
                                    />
                                );
                            }}
                        />
                        {/* 次月ボタン */}
                        <IconButton
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSearchClick('next');
                            }}
                            size='large'
                            color='primary'
                        >
                            <ArrowForwardIosIcon />
                        </IconButton>
                    </LocalizationProvider>

                    {/* メーカーコンボ(自社のみ)*/}
                    {isCompanyUser &&
                        <>
                            <Typography variant="body1" sx={{ mx: 1 }}>メーカー：</Typography>
                            <FormControl sx={{ width: 250 }}>
                                {masterLoading ? (
                                    <Box p={1} display="flex" justifyContent="center" alignItems="center">
                                        <Typography variant="body2">読み込み中...</Typography>
                                    </Box>
                                ) : (
                                    <Controller
                                        name="makerId"
                                        control={control}
                                        defaultValue=""
                                        render={({ field }) => (
                                            <Select
                                                {...field}
                                                size="small"
                                                displayEmpty
                                            >
                                                <MenuItem value="">
                                                    <em>未選択</em>
                                                </MenuItem>
                                                {Array.isArray(makers) && makers.length > 0 ? (
                                                    makers.map((maker) => (
                                                        <MenuItem
                                                            key={maker.maker_id || maker.id}
                                                            value={maker.maker_id || maker.id}
                                                        >
                                                            {maker.maker_name || maker.name}
                                                        </MenuItem>
                                                    ))
                                                ) : (
                                                    <MenuItem disabled value="">
                                                        <em>メーカーがありません</em>
                                                    </MenuItem>
                                                )}
                                            </Select>
                                        )}
                                    />
                                )}
                            </FormControl>
                        </>
                    }

                    {/* 検索ボタン */}
                    <Button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSearchClick('current');
                        }}
                        variant="outlined"
                        size="large"
                        startIcon={<ManageSearchIcon />}
                        sx={{ ml: 5 }}
                    >
                        検索
                    </Button>
                </FormGroup>
            </Box>

            {/* ボタン */}
            <Box flex sx={{ mt: 2, mb: 2 }}>
                {isCompanyUser &&
                    <>
                        <Button
                            onClick={handleRegisterClick}
                            variant="doButton"
                            size="medium"
                            sx={{ mr: 1 }}
                            startIcon={<PlaylistAddIcon />}
                        >
                            追加
                        </Button>
                    </>
                }
                <Button
                    variant="outputButton"
                    size="medium"
                    startIcon={<SaveAltIcon />}
                    component="a"   // ａタグとして機能させてダウンロードを可能にする
                    href={`/${process.env.NEXT_PUBLIC_FOLDER_STORAGE}/${process.env.NEXT_PUBLIC_FOLDER_PUBLIC_TEMPLATE}/原料取引依頼書.xlsm`}
                    download={"原料取引依頼書"}
                >
                    原料取引依頼書テンプレート
                </Button>
            </Box>


            {/* DataGrid部分 */}
            <Box sx={{
                width: '100%',
                flex: 1, // 残りの空間を埋める
                minHeight: 300, // 最小の高さを確保
                backgroundColor: 'background.paper',
            }}>
                {isCompanyUser ? (
                    /* 自社用 */
                    <DataGridPro
                        rows={rows}
                        columns={columnsWithModals}
                        getRowId={(row) => row.sale_id}
                        rowSelection={false}
                        pagination
                        autoPageSize
                        initialState={{
                            pinnedColumns: {
                                right: ['actions'] // 右側に固定する列のfieldを指定
                            }
                        }}
                        disableRowSelectionOnClick
                        density="compact"
                        localeText={localeText}
                        getDetailPanelHeight={() => 'auto'}
                        // 展開状態を明示的に制御
                        detailPanelExpandedRowIds={expandedDetailPanelIds}
                        onDetailPanelExpandedRowIdsChange={(newIds) => {
                            // 展開状態を更新
                            setExpandedDetailPanelIds(newIds);

                            // 展開された行IDが変更されたときのイベント
                            newIds.forEach(id => {
                                const params = { id };
                                const wasExpanded = rows.find(row => row.sale_id === id)?.isExpanded;

                                // 新たに展開された行のみ処理
                                if (!wasExpanded) {
                                    // 展開状態を記録
                                    setRows(prevRows => prevRows.map(row =>
                                        row.sale_id === id
                                            ? { ...row, isExpanded: true }
                                            : row
                                    ));

                                    // 展開イベントを処理
                                    handleDetailPanelExpandChange(params, true);
                                }
                            });

                            // 閉じられた行の処理
                            rows.forEach(row => {
                                if (row.isExpanded && !newIds.includes(row.sale_id)) {
                                    // 展開状態を更新
                                    setRows(prevRows => prevRows.map(r =>
                                        r.sale_id === row.sale_id
                                            ? { ...r, isExpanded: false }
                                            : r
                                    ));
                                }
                            });
                        }}
                        slots={{
                            detailPanelExpandIcon: KeyboardArrowDownIcon,
                            detailPanelCollapseIcon: KeyboardArrowUpIcon
                        }}
                    />
                ) : (
                    /* 他社用 */
                    <DataGridPro
                        rows={rows}
                        columns={columnsWithModals}
                        getRowId={(row) => `${row.sale_id}-${row.factory_id}`} // sale_idとfactory_idの組み合わせで一意識別子を生成}
                        rowSelection={false}
                        pagination
                        autoPageSize
                        initialState={{
                            pinnedColumns: {
                                right: ['actions'] // 右側に固定する列のfieldを指定
                            }
                        }}
                        disableRowSelectionOnClick
                        density="compact"
                        localeText={localeText}
                    />
                )
                }
            </Box>

            {/* ファイルビューワーモーダル */}
            {viewerOpen && (
                <FileViewerModal
                    open={viewerOpen}
                    onClose={() => setViewerOpen(false)}
                    files={viewerFiles}
                    rowInfo={viewerInfo}
                />
            )}

            {/* 確認ダイアログ */}
            <ConfirmDialog
                open={confirmDialogProps.open}
                title={confirmDialogProps.title}
                message={confirmDialogProps.message}
                onConfirm={() => {
                    confirmDialogProps.onConfirm();
                    closeConfirmDialog();
                }}
                onClose={closeConfirmDialog}
            />

            {/* 販売管理フォーム（新規追加・編集・詳細・コピー共通） */}
            <SaleMngForm
                open={saleFormOpen}
                onClose={closeSaleForm}
                saleId={saleFormId}
                rowData={saleFormRowData}
                mode={saleFormMode}
                userData={userData}
                isCompanyUser={isCompanyUser}
                onSubmit={handleSaleFormSubmit}
            />
        </Box>
    );
}