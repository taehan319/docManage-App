/**
 * 販売管理 追加・登録・編集・コピー追加フォーム    実務ロジック
 */
'use client';
import dayjs from "dayjs";
import { BaseValidator } from '../../../utilities/validation/baseValidator';

// YYYYMMDDフォーマットを日付オブジェクトに変換
export const convertToDate = (yyyymmdd) => {
    if (!yyyymmdd) return null;

    // 文字列に変換して処理
    const str = yyyymmdd.toString();
    if (str.length !== 8) return null;

    const year = str.substring(0, 4);
    const month = str.substring(4, 6);
    const day = str.substring(6, 8);

    // ISO形式の文字列からdayjsオブジェクトを生成
    return dayjs(`${year}-${month}-${day}`);
};

// 日付オブジェクトをYYYYMMDD形式に変換
export const convertToYYYYMMDD = (date) => {
    if (!date || !dayjs.isDayjs(date)) return null;

    const year = date.year();
    const month = date.month() + 1; // dayjs月は0始まり
    const day = date.date();

    return parseInt(`${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`);
};

/**
 * 販売管理フォーム　バリデーション処理
 * @param {*} type チェック対象のフィールド
 * @param {boolean} isCompanyUser 自社工場ユーザーフラグ
 * @returns エラーなし(true) / エラーメッセージ
 */
export const createValidator = (type, isCompanyUser) => {
    const validator = new BaseValidator();

    if (!isCompanyUser) {
        // チェック不要
        return {};
    }

    switch (type) {
        case 'contract_ym':
            return {
                validate: (value) => {
                    const checkYmd = convertToYYYYMMDD(value);
                    const isValid = validator.validate(checkYmd, '受注日', {
                        required: true,
                        dateFormat: true,
                    });
                    return isValid ? true : validator.getErrors()[0];
                }
            };
        case 'product_no':
            return {
                validate: (value) => {
                    const isValid = validator.validate(value, '品番', {
                        required: true,
                        maxLength: 60,
                    });
                    return isValid ? true : validator.getErrors()[0];
                }
            };
        case 'brandInfo':
            return {
                validate: (value) => {
                    const isValid = validator.validate(value?.brandId, 'ブランド', {
                        required: true,
                        selected: true
                    });
                    return isValid ? true : validator.getErrors()[0];
                }
            };
        case 'itemInfo':
            return {
                validate: (value) => {
                    const isValid = validator.validate(value?.itemId, 'アイテム', {
                        required: true,
                        selected: true
                    });
                    return isValid ? true : validator.getErrors()[0];
                }
            };
        case 'deadline_ymd':
            return {
                validate: (value) => {
                    const checkYmd = convertToYYYYMMDD(value);
                    const isValid = validator.validate(checkYmd, '納期', {
                        required: true,
                        dateFormat: true,
                    });
                    return isValid ? true : validator.getErrors()[0];
                }
            };
        case 'cloth_arrival_ymd':
            return {
                validate: (value) => {
                    const checkYmd = convertToYYYYMMDD(value);
                    const isValid = validator.validate(checkYmd, '生地入荷予定日', {
                        dateFormat: true,
                    });
                    return isValid ? true : validator.getErrors()[0];
                }
            };
        case 'invoice_ym':
            return {
                validate: (value) => {
                    // 日付に戻してチェック
                    const checkYmd = convertToYYYYMMDD(value);
                    const isValid = validator.validate(checkYmd, '請求月', {
                        dateFormat: true,
                    });
                    return isValid ? true : validator.getErrors()[0];
                }
            };
        case 'quantity':
            return {
                validate: (value) => {
                    const isValid = validator.validate(value, '枚数', {
                        required: true,
                        min: 1,
                        max: 999999999,
                    });
                    return isValid ? true : validator.getErrors()[0];
                }
            };
        case 'cost':
            return {
                validate: (value) => {
                    const isValid = validator.validate(value, '工賃', {
                        required: true,
                        min: 1,
                        max: 999999999,
                    });
                    return isValid ? true : validator.getErrors()[0];
                }
            };
        // 他のバリデーションパターンを追加
        default:
            return {};
    }
};

// 送信データの処理
export const processSendData = (data, mode, documentsToUpdateFlag, uploadedFiles, filesToDelete, documents = []) => {
    // コピーモード時のファイルコピー情報を作成
    const filesToCopy = mode === 'copy' ? 
        documents.map(doc => ({
            documentId: doc.document_id,
            branchNo: doc.branch_no,
            fileName: doc.file_name,
            publishFlag: doc.publish_flg
        })) : [];
    const processedData =
    {
        ...data,
        // sale_idはコピーと新規追加の場合はnull
        sale_id: mode === 'add' || mode === 'copy' ? null : data.sale_id,
        // 数字フィールドを適切に変換
        quantity: data.quantity === '' ? null : Number(data.quantity),
        cost: data.cost === '' ? null : Number(data.cost),
        // 日付フィールドをYYYYMMDD形式に変換
        cloth_arrival_ymd: convertToYYYYMMDD(data.cloth_arrival_ymd),
        deadline_ymd: convertToYYYYMMDD(data.deadline_ymd),
        contract_ym: convertToYYYYMMDD(data.contract_ym),
        // 請求月を年月(YYYYMM)の数値形式に変換 (例: 202312)
        invoice_ym: data.invoice_ym && dayjs.isDayjs(data.invoice_ym) ?
            parseInt(data.invoice_ym.format('YYYYMM')) : null,
        // オブジェクトで保持しているデータの値のみ送信
        maker_id: data.brandInfo?.makerId || null,
        brand_id: data.brandInfo?.brandId || null,
        finishing: data.finishing?.general_key || null,
        item_category_id: data.itemInfo?.categoryId || null,
        item_id: data.itemInfo?.itemId || null,
        finishing: data.finishing?.general_key || 1, // デフォルトで1:なし
        // ドキュメント関連情報を追加
        documentsToUpdateFlag: documentsToUpdateFlag,
        uploadedFiles: processUploadFiles(uploadedFiles),
        filesToDelete: mode === 'copy' ? [] : filesToDelete, // コピーモードでは削除対象なし
        // コピーモード用のファイル情報
        filesToCopy: mode === 'copy' ? filesToCopy : [],
        // モード情報
        isCopyMode: mode === 'copy',
    };
    return processedData;
};

// アップロードファイルの処理（重複ファイル名を新しい名前に変更）
export const processUploadFiles = (uploadedFiles) => {
    return uploadedFiles.map(file => {
        // 名前が変更された場合は新しい名前を使用
        if (file.renamed && file.newName) {
            // ファイル名を変更したBlobを作成
            const renamedFile = new File(
                [file],
                file.newName,
                { type: file.type }
            );

            return {
                ...renamedFile,
                originalName: file.originalName,
                newName: file.newName,
            };
        }
        return file;
    });
};

/**
 * ファイル処理ユーティリティ関数
 */

// ファイル処理関数
export const handleFilesChange = (files, existingFileNames) => {
    // 処理したファイルリスト
    const processedFiles = files.map(file => {
        let fileName = "";
        if (file.originalFile) {
            // 既存のファイルの場合
            fileName = file.originalFile.file_name || file.fileName || "";
        } else {
            fileName = file.fileName || file.file?.name || "";
        }

        // 元のファイル情報を保持
        return {
            ...file,
            originalName: fileName,
            newName: fileName,
            // 重複しているかのフラグ（確認ダイアログ表示用）
            isDuplicate: existingFileNames.includes(fileName)
        };
    });

    return processedFiles;
};

/**
 * ドキュメント関連の処理関数
 */
// 公開フラグ変更処理
export const handlePublishFlagChange = (doc, newPublishFlag, documentsToUpdateFlag, documents) => {
    // 更新対象リストの作成
    const updatedFlagList = [...documentsToUpdateFlag];
    
    // 既存のエントリを確認
    const existingIndex = updatedFlagList.findIndex(item =>
        item.documentId === doc.document_id && item.branchNo === doc.branch_no
    );

    // 更新対象リストの更新
    if (existingIndex >= 0) {
        // 既存のエントリを更新
        updatedFlagList[existingIndex] = {
            ...updatedFlagList[existingIndex],
            publishFlag: newPublishFlag
        };
    } else {
        // 新しいエントリを追加
        updatedFlagList.push({
            documentId: doc.document_id,
            branchNo: doc.branch_no,
            publishFlag: newPublishFlag
        });
    }

    // 表示用のドキュメントリストを更新
    const updatedDocuments = documents.map(item => {
        if (item.document_id === doc.document_id && item.branch_no === doc.branch_no) {
            return { ...item, publish_flg: newPublishFlag };
        }
        return item;
    });

    return { updatedFlagList, updatedDocuments };
};

// 既存ファイルの削除処理
export const handleDeleteExistingFile = (doc, filesToDelete, documents) => {
    // 削除対象に追加
    const updatedFilesToDelete = [
        ...filesToDelete,
        {
            documentId: doc.document_id,
            branchNo: doc.branch_no,
            fileName: doc.file_name
        }
    ];

    // 表示用リストから削除
    const updatedDocuments = documents.filter(item =>
        !(item.document_id === doc.document_id && item.branch_no === doc.branch_no)
    );

    return { updatedFilesToDelete, updatedDocuments };
};

/**
 * モード表示名の設定
 */
export const getModeTitle = (mode) => {
    switch (mode) {
        case 'detail': return '詳細表示';
        case 'add': return '新規追加';
        case 'edit': return '編集';
        case 'copy': return 'コピー追加';
        default: return '';
    }
};

/**
 * フォームデータの初期化関数
 */
export const formatInitialData = (rowData, mode) => {
    try {
        // 日付フィールドを変換
        let cloth_arrival_ymd = convertToDate(rowData.cloth_arrival_ymd);
        let deadline_ymd = convertToDate(rowData.deadline_ymd);
        let contract_ym = convertToDate(rowData.contract_ym);
        let invoice_ym = convertToDate((rowData.invoice_ym * 100 + 1)); // 日付にする

        // 日付変換に失敗した場合のデフォルト値
        if (!cloth_arrival_ymd || !dayjs.isDayjs(cloth_arrival_ymd) || !cloth_arrival_ymd.isValid()) {
            cloth_arrival_ymd = null;
        }

        if (!deadline_ymd || !dayjs.isDayjs(deadline_ymd) || !deadline_ymd.isValid()) {
            deadline_ymd = dayjs().add(1, 'month');
        }

        if (!contract_ym || !dayjs.isDayjs(contract_ym) || !contract_ym.isValid()) {
            contract_ym = dayjs();
        }

        if (!invoice_ym || !dayjs.isDayjs(invoice_ym) || !invoice_ym.isValid()) {
            invoice_ym = null;
        }

        // ブランド情報の整形
        const brandInfo = {
            makerId: rowData.maker_id,
            makerName: rowData.maker_name,
            brandId: rowData.brand_id,
            brandName: rowData.brand_name
        };

        // アイテム情報の整形
        const itemInfo = {
            categoryId: rowData.item_category_id || '',
            categoryName: rowData.item_category_name || '',
            itemId: rowData.item_id || '',
            itemName: rowData.item_name || ''
        };

        // 仕上げ情報 - nullチェックを明示的に行う
        const finishing = rowData.finishing !== null && rowData.finishing !== undefined 
            ? rowData.finishing 
            : 1;

        if (mode === 'copy') {
            // コピーモードの場合
            return {
                ...rowData,
                sale_id_from: rowData.sale_id,
                sale_id: null,
                product_no: rowData.product_no,
                cloth_arrival_ymd,
                deadline_ymd,
                contract_ym,
                brandInfo,
                itemInfo,
                finishing,
                cloth_arrival_flg: 0,
                status: 0,
                invoice_ym,
                remarks: '',
                totalCost: (rowData.quantity || 0) * (rowData.cost || 0)
            };
        } else {
            // 通常の編集・詳細表示モード
            return {
                ...rowData,
                cloth_arrival_ymd,
                deadline_ymd,
                contract_ym,
                invoice_ym,
                brandInfo,
                itemInfo,
                finishing,
                totalCost: (rowData.quantity || 0) * (rowData.cost || 0)
            };
        }
    } catch (error) {
        console.error('日付変換エラー:', error);
        // エラー時はデフォルト値を設定
        return {
            ...rowData,
            cloth_arrival_ymd: dayjs(),
            deadline_ymd: null,
            contract_ym: null,
            invoice_ym: null,
            totalCost: (rowData.quantity || 0) * (rowData.cost || 0)
        };
    }
};

// デフォルトフォーム値
export const getDefaultFormValues = () => ({
    product_no: '',
    brandInfo: null,
    finishing: null,
    cloth_arrival_ymd: null,
    cloth_arrival_flg: null,
    itemInfo: null,
    quantity: '',
    deadline_ymd: null,
    contract_ym: dayjs(),
    remarks: '',
    cost: '',
    totalCost: 0,
    status: 0,
    invoice_ym: null,
});