/**
 * バリデーションの基底クラス
 */
import * as CONST from '../contains';
export class BaseValidator {
    constructor() {
        this.errors = [];
        this.value = null;
        this.label = '';
    }

    /**
     * バリデーション実行
     * @param {*} value 検証値
     * @param {string} label 項目名
     * @param {Object} options オプション
     * @returns {boolean} 検証結果
     */
    validate(value, label = '', options = {}) {
        this.value = value;
        this.label = label;
        this.errors = [];

        // 基本バリデーションの実行
        this.checkRequired(options.required, options.selected);
        this.checkValueRange(options.min, options.max, options.minmax);
        this.checkLength(options.minLength, options.maxLength);
        this.checkPattern(options.pattern);
        this.checkDateFormat(options.dateFormat);

        // カスタムバリデーションの実行
        this.customValidation(options);

        return this.errors.length === 0;
    }

    /**
     * エラーメッセージの追加
     * @param {string} message エラーメッセージ
     */
    addError(message) {
        this.errors.push(message);
    }

    /**
     * エラーメッセージの取得
     * @returns {string[]} エラーメッセージ配列
     */
    getErrors() {
        return this.errors;
    }

    /**
     * 必須チェック
     * @param {boolean} required 必須フラグ
     * @param {booleen} selected 選択項目
     */
    checkRequired(required, selected) {
        if (required && (this.value === '' || this.value === undefined || this.value === null)) {
            const err = selected ? '選択' : '入力';
            this.addError(`${this.label}を${err}してください`);
        }
    }

    /**
     * 入力値チェック
     * @param {number} min 最小値
     * @param {number} max 最大値
     * @param {boolean} minmax 範囲チェックかどうか
     */
    checkValueRange(min, max, minmax) {
        const minLocal = min ? min.toLocaleString() : '';
        const maxLocal = max ? max.toLocaleString() : '';
        // 範囲チェック
        if (this.value && minmax) {
            if ((min && this.value < min)
                || (max && this.value > max)) {
                this.addError(`${this.label}は${minLocal}～${maxLocal}を入力してください`);
            }
        } else {
            if (this.value && min && this.value < min) {
                this.addError(`${this.label}は${minLocal}以上を入力してください`);
            }
            if (this.value && max && this.value > max) {
                this.addError(`${this.label}は${maxLocal}以内を入力してください`);
            }
        }
    }

    /**
     * 文字数チェック
     * @param {number} min 最小文字数
     * @param {number} max 最大文字数
     */
    checkLength(min, max) {
        if (this.value && min && this.value.length < min) {
            this.addError(`${this.label}は${min}文字以上入力してください`);
        }
        if (this.value && max && this.value.length > max) {
            this.addError(`${this.label}は${max}文字以内で入力してください`);
        }
    }

    /**
     * パターンチェック
     * @param {RegExp|string} pattern 正規表現パターン
     */
    checkPattern(pattern) {
        if (this.value && pattern) {
            const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
            if (!regex.test(this.value)) {
                this.addError(`${this.label}は正しいフォーマットで入力してください`);
            }
        }
    }

    /**
     * 日付フォーマットチェック
     * @param {boolean} dateFormat 日付チェックフラグ
     */
    checkDateFormat(dateFormat) {
        if (dateFormat && this.value) {
            const date = new Date(this.value);
            if (isNaN(date.getTime())) {
                this.addError(`${this.label}は正しい日付形式で入力してください`);
            } else if (this.value < CONST.MINDATE || CONST.MAXDATE < this.value) {
                // 1900/01/01 ~ 2999/99/99までを許容する
                this.addError(`${this.label}に入力可能範囲外の日付が入力されています`);
            }
        }
    }

    /**
     * カスタムバリデーション（オーバーライド用）
     * @param {Object} options バリデーションオプション
     */
    customValidation(options) {
        // 継承先でオーバーライド
    }
}