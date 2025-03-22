/**
 * 定数定義
 */
import { jaJP } from '@mui/x-data-grid-pro';

/* (エンドユーザ)本店用定数 */
export const ADMIN_USER_ID = 0;             // 管理者ユーザID
export const ADMIN_FACTORY_ID = 0;          // 本店工場ID
export const ADMIN_FACTORY_NAME = "自社";   // 本店工場表示名 

/* ログインユーザー判定 */
export const USER_ADMIN = 1;         // 管理者
export const USER_OWNERCOMPANY = 0;  // 自社ユーザー

/* ステータス(状態) */
export const STATUS_YET = 0;         // 未着手
export const STATUS_ONWORK = 1;      // 作業中
export const STATUS_DONE = 2;        // 作業済
export const STATUS_DELIVERED = 3;   // 納品済
export const STATUS_CANCELED = 4;    // キャンセル済

/* 汎用マスタ データ区分 */
export const GENERAL_KBN_FINISHING = 1; // 先上げ・納前
export const GENERAL_KBN_STATUS  = 2;   // ステータス(状態)

/* フラグ */
export const FLG_OFF = '0';
export const FLG_ON = '1';
export const NUMFLG_OFF = 0;
export const NUMFLG_ON = 1;

/* システム入力可能範囲 */
export const MINDATE = 19000101;
export const MAXDATE = 29999999;

/**
 * DataGridの各操作メニューを日本語化
 * MUI Xの標準日本語ロケールを拡張
 */
export const localeText = {
    // MUI Xの標準日本語ロケールを基本として取り込む
    ...jaJP.components.MuiDataGrid.defaultProps.localeText,
    
    // 以下、カスタム・オーバーライド
    // ツールバー
    toolbarDensity: '表示密度',
    toolbarDensityLabel: '表示密度',
    toolbarDensityCompact: 'コンパクト',
    toolbarDensityStandard: '標準',
    toolbarDensityComfortable: '広め',
    toolbarColumns: '列の表示設定',
    toolbarFilters: 'フィルター',
    toolbarExport: 'エクスポート',
    toolbarExportCSV: 'CSVダウンロード',
    toolbarExportPrint: '印刷',

    // 列メニュー
    columnMenuLabel: '列メニュー',
    columnMenuShowColumns: '列の表示設定',
    columnMenuManageColumns: '列の管理',
    columnMenuFilter: 'フィルター',
    columnMenuHideColumn: '列を非表示',
    columnMenuUnsort: 'ソート解除',
    columnMenuSortAsc: '昇順',
    columnMenuSortDesc: '降順',
    
    // v6系の新しいキー
    pinToLeft: '左側に固定',
    pinToRight: '右側に固定',
    unpin: '固定解除',
    
    // v5系との互換性のために残す
    columnMenuPinLeft: '左側に固定',
    columnMenuPinRight: '右側に固定',
    columnMenuUnpin: '固定解除',

    // フィルター
    filterPanelAddFilter: 'フィルター追加',
    filterPanelRemoveAll: 'すべて削除',
    filterPanelDeleteIconLabel: '削除',
    filterPanelLogicOperator: '論理演算子',
    filterPanelOperator: '演算子',
    filterPanelOperatorAnd: 'かつ',
    filterPanelOperatorOr: 'または',
    filterOperatorEquals: '一致',
    filterOperatorContains: '含む',
    filterOperatorStartsWith: '前方一致',
    filterOperatorEndsWith: '後方一致',
    filterOperatorIsEmpty: '空白',
    filterOperatorIsNotEmpty: '空白以外',

    // ページネーション
    MuiTablePagination: {
        labelRowsPerPage: '表示件数:',
        labelDisplayedRows: ({ from, to, count }) =>
            `${from}-${to} / ${count !== -1 ? count : `${to}以上`}`,
    },

    // チェックボックス
    checkboxSelectionSelectAllRows: 'すべて選択',
    checkboxSelectionUnselectAllRows: 'すべて選択解除',
    checkboxSelectionSelectRow: '行を選択',
    checkboxSelectionUnselectRow: '行の選択を解除',

    // その他
    noRowsLabel: 'データがありません',
    noResultsOverlayLabel: '結果がありません',
    errorOverlayDefaultLabel: 'エラーが発生しました',

    // フッター
    footerRowSelected: (count) => `${count}行を選択中`,
    footerTotalRows: '総行数:',
};

/* 裁断枚数ダウンロードファイル名 */
export const DL_CUTSHEET_FILENAME = 'CuttingSheet.xlsx';
