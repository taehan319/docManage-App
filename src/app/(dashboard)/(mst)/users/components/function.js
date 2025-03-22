/**
 * ユーザー管理画面 子画面 実務ロジック
 */
import { BaseValidator } from '../../../../utilities/validation/baseValidator';
import ToastService from '../../../../utilities/toast';
import { getApiService } from '../../../../utilities/apiService';

/**
 * フォーム バリデーションチェック
 * @param {*} type チェック対象インプット
 * @param {*} mode t:新規追加 f:更新 
 */
export const createValidator = (type, mode) => {
  const validator = new BaseValidator();
  const name_maxVal = 40;
  const email_maxVal = 254;
  const password_minVal = 8;
  const password_maxVal = 64;

  switch (type) {
    case 'name':
      return {
        validate: (value) => {
          const isValid = validator.validate(value, '名前', {
           required: true,
           maxLength: name_maxVal
          });
          return isValid ? true : validator.getErrors()[0];
         }
        }
    case 'email':
      return {
        validate: (value) => {
          const isValid = validator.validate(value, 'メールアドレス', {
            required: true,
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            maxLength: email_maxVal
          });
          return isValid ? true : validator.getErrors()[0];
        }
      };

    case 'password':
      return {
        validate: (value) => {
          const isValid = validator.validate(value, 'パスワード', {
            required: mode, // 新規追加のみ必須
            minLength: password_minVal,
            maxLength: password_maxVal
          });
          return isValid ? true : validator.getErrors()[0];
        }
      };

    case 'factoryId':
      return {
          validate: (value) => {
            const isValid = validator.validate(value, '所属', {
              required: true,
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
 * 
 */
export const userInsUpd = async (data) => {
  try {
    let result = null;
    const api = getApiService();
    if (data?.id) {
      // 更新
      result = await api('/api/users/update', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } else {
      result = await api('/api/users/register', {
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

/**
 * 活性非活性制御
 * 
 */
export function setActivControl(userData, lginData) {
  const newRole = {email: false};  // 新規
  const editRole = {email: true};  // 更新
  
  if (userData) {
    if (lginData.user_id == 0) {      
      return newRole;
    }
    // ユーザーIDが0以外であれば更新   
    return editRole;
  } else {    
    return newRole;
  }
};