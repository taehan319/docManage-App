/**
 * ログインページ   ロジック
 */
import { BaseValidator } from '../utilities/validation/baseValidator';

export const createValidator = (type) => {
  const validator = new BaseValidator();
  
  switch (type) {
    case 'email':
      return {
        required: "メールアドレスを入力してください",
        validate: (value) => {
          const isValid = validator.validate(value, 'メールアドレス', {
            required: true,
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          });
          return isValid ? true : validator.getErrors()[0];
        }
      };

    case 'password':
      return {
        required: "パスワードを入力してください",
        validate: (value) => {
          const isValid = validator.validate(value, 'パスワード', {
            required: true,
            minLength: 1,
          });
          return isValid ? true : validator.getErrors()[0];
        }
      };

    // 他のバリデーションパターンを追加
    default:
      return {};
  }
};