/**
 * トースト通知
 */
import { toast } from 'react-toastify';

const defaultOptions = {
    position: "bottom-left",
    autoClose: false,
    newestOnTop: false,
    closeOnClick: true,
    rtl: false,
    pauseOnFocusLoss: true,
    draggable: true,
    theme: "colored"
};

class ToastService {
    static containerRef = null;
    static createToast(message, type, options = {}, toastId = null) {
        // トーストを表示する前にアクティブなトーストをチェックして閉じる
        this.dismissAllIfAnyActive();

        const content = typeof message === 'string' ? (
            <div dangerouslySetInnerHTML={{ __html: message }} />
        ) : message;

        return toast[type](content, {
            ...defaultOptions,
            ...options,
            toastId: toastId // トーストIDを設定
        });
    }

    // アクティブなトーストがあるかチェックして、あれば全て閉じる
    static dismissAllIfAnyActive() {
        const toastContainer = document.querySelector('.Toastify');
        if (toastContainer && toastContainer.hasChildNodes()) {
            toast.dismiss();
            return true;
        }
        return false;
    }

    static success(message, options = {}, toastId = null) {
        return this.createToast(message, 'success', options, toastId);
    }

    static error(message, options = {}, toastId = null) {
        return this.createToast(message, 'error', options, toastId);
    }

    static info(message, options = {}, toastId = null) {
        return this.createToast(message, 'info', options, toastId);
    }

    static warning(message, options = {}, toastId = null) {
        return this.createToast(message, 'warning', options, toastId);
    }

    static custom(message, options = {}, toastId = null) {
        this.dismissAllIfAnyActive();
        const content = typeof message === 'string' ? (
            <div dangerouslySetInnerHTML={{ __html: message }} />
        ) : message;

        return toast(content, {
            ...defaultOptions,
            ...options,
            toastId: toastId
        });
    }

    // すべてのトーストを消去
    static dismissAll() {
        toast.dismiss();
    }

    // 特定のトーストを消去
    static dismiss(toastId) {
        toast.dismiss(toastId);
    }

    // 特定のトーストが表示されているか確認
    static isActive(toastId) {
        return toast.isActive(toastId);
    }
    // バリデーションエラー出力のメソッド
    static showValidationErrors(errors) {
        // エラーがなければ何もしない
        if (!errors || Object.keys(errors).length === 0) {
            return;
        }
        const errorMessages = Object.values(errors).map(error => {
            // error自体が文字列の場合と、messageプロパティを持つオブジェクトの場合の両方に対応
            return typeof error === 'string' ? error : error.message;
        }).filter(Boolean); // 空や未定義の値を除外

        if (errorMessages.length > 0) {
            const errorHtml = `
          <div>
            <h4 class="font-semibold" style="margin:0 0 0.5rem;">入力エラー</h4>
            <ul class="w-full list-none">
              ${errorMessages.map(msg => `<li>${msg}</li>`).join('')}
            </ul>
          </div>
        `;

            this.error(errorHtml);
        }
    }

}

export default ToastService;
export { toast };