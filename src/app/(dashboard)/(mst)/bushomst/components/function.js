/**
 * 工場管理画面 子画面 実務ロジック
 */
import { BaseValidator } from '../../../../utilities/validation/baseValidator';
import { getApiService } from '../../../../utilities/apiService';

/**
 * フォーム バリデーションチェック
 * @param {*} type チェック対象インプット
 */
export const createValidator = (type) => {
  const validator = new BaseValidator();
  const maxVal = 40;
  const invoicemaxVal = 14;
  const INVOICE_PATTERN = /^T\d{13}$/;

  switch (type) {
    case 'name':
      return {
        validate: (value) => {
          const isValid = validator.validate(value, '名前', {
            required: true,
            maxLength: maxVal
          });
          return isValid ? true : validator.getErrors()[0];
        }
      };
    case 'invoice':
      return {
        validate: (value) => {
          const isValid = validator.validate(value, 'インボイス番号', {
            maxLength: invoicemaxVal,
            pattern: INVOICE_PATTERN,
          });
          return isValid ? true : validator.getErrors()[0];
        }
      };
    // 他のバリデーションパターンを追加
    default:
      return {};
  }
};

/**
 * 登録・更新処理
 * @param {*} data 登録・更新対象データ
 */
export const factoryInsUpd = async (data) => {
  try {
    let result = null;
    const api = getApiService();

    if (data?.id === 0 || data?.id) {
      // 更新
      result = await api('/api/factories/update', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } else {
      result = await api('/api/factories/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }

    if (!result.ok) {
      // エラーあり
    }
    return result;
  } catch (error) {
  }
};