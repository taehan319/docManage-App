/**
 * API通信 ローディング画面使用プロバイダー
 */
'use client';
import { useRouter } from 'next/navigation'
import React, { createContext, useState, useRef } from 'react';
// mask.jsの中からお好みのローダーを選択してimport
import { DualRingLoader as Mask } from '../components/mask';
import ToastService from '../utilities/toast';
import HttpStatusCodes from '../lib/httpStatusCodes';
import cookie from 'js-cookie';
import { checkUrlPermission } from '../utilities/urlPermissions';
import { decryptByKey } from '../utilities/encrypt';

export const ApiContext = createContext();

const ERROR_MESSAGES = {
  400: 'リクエストが不正です',
  401: '認証が必要です',
  403: 'アクセスが拒否されました',
  404: 'リソースが見つかりません',
  500: 'サーバーエラーが発生しました',
  default: '予期せぬエラーが発生しました'
};

const sessionCookieName = process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME || 'userSession';
const sessionCookieUserInfo = process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO || 'user';
const sessionCookieUserInfoId = process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ID || 'id';
const sessionCookieUserInfoFactoryId = process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_FACTORYID || 'factoryid';
const redirectTo = process.env.NEXT_PUBLIC_REDIRECT_ROOT_TO || '/login'

export const ApiProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const pendingRequests = useRef(new Map()); // 進行中のリクエストを追跡
  const autoHideMask = useRef(true); // マスクを自動的に非表示にするかどうか
  const maskControlledManually = useRef(false); // マスクが手動で制御されているかどうか
  const batchRequestId = useRef(null); // バッチリクエスト用のID

  const router = useRouter(); // ルーターのインスタンスを取得

  // マスクの表示/非表示を手動で制御する関数
  const showMask = () => {
    maskControlledManually.current = true;
    setIsLoading(true);
  };
  
  const hideMask = () => {
    maskControlledManually.current = false;
    setIsLoading(false);
  };
  
  // 自動非表示の設定を切り替える関数
  const setAutoHideMask = (value) => {
    autoHideMask.current = value;
  };
  
  // バッチリクエスト開始（ループ処理などで複数のリクエストを実行する前に呼び出す）
  const startBatch = () => {
    batchRequestId.current = Date.now().toString();
    if (!maskControlledManually.current) {
      setIsLoading(true);
    }
    return batchRequestId.current;
  };
  
  // バッチリクエスト終了
  const endBatch = (batchId) => {
    if (batchId === batchRequestId.current) {
      batchRequestId.current = null;
      // 手動制御中でなく、自動非表示が有効で、他のリクエストが進行中でなければマスクを非表示
      if (!maskControlledManually.current && autoHideMask.current && pendingRequests.current.size === 0) {
        setIsLoading(false);
      }
    }
  };

  const fetchWrapper = async (url, options = {}) => {
    // リクエストの一意のキーを生成（URLとメソッドの組み合わせ）
    const requestKey = `${options.method || 'POST'}-${url}-${Date.now()}`;
    
    // オプションからマスク表示制御のフラグを取得
    const { 
      showMaskForThisRequest = true,
      batchId = batchRequestId.current // 現在のバッチIDを取得（省略可能）
    } = options;
    
    // バッチ処理の一部かどうかを確認
    const isPartOfBatch = batchId !== null;
    
    // オプションからautoHideMaskの一時的な上書き設定を取得
    const tempAutoHide = options.autoHideMask !== undefined 
      ? options.autoHideMask 
      : autoHideMask.current;

    // 同じリクエストが進行中の場合は、そのPromiseを返す
    if (pendingRequests.current.has(requestKey)) {
      return pendingRequests.current.get(requestKey);
    }
    try {
      // このリクエストでマスクを表示する場合のみ、かつバッチ処理の一部でない場合
      if (showMaskForThisRequest && !isPartOfBatch && !maskControlledManually.current) {
        setIsLoading(true);
      }
      if (!url.startsWith(`/api${redirectTo}`)) {
        // ログイン認証済判定
        const userSession = cookie.get(sessionCookieName);
        let userJson = {};
        if (userSession) {
          userJson = JSON.parse(userSession);
        }
        if (!userSession
          || !userJson[sessionCookieUserInfo] 
          || !userJson[sessionCookieUserInfo][sessionCookieUserInfoId]) {
          const error = new Error('一定時間操作が行われなかったか、ログインされていません');
          error.status = HttpStatusCodes.UNAUTHORIZED;
          throw error;
        }
        // アクセス制御
        if (userJson[sessionCookieUserInfo]) {
          if (!checkUrlPermission(decryptByKey(sessionCookieUserInfoFactoryId, userJson[sessionCookieUserInfo]), url)) {
            // 不正アクセスの場合
            const error = new Error('Forbidden - このページにはアクセスできません');
            error.status = HttpStatusCodes.FORBIDDEN;
            throw error;
          }  
        }    
      }
      // 新しいリクエストのPromiseを作成
      const promise = (async () => {
        try {
          // 実際のオプションからAPIコントロール用のプロパティを除外
          const { showMaskForThisRequest, autoHideMask, batchId, ...fetchOptions } = options;
          const response = await fetch(url, {
            ...fetchOptions,
            headers: {
              'Content-Type': 'application/json',
              ...fetchOptions.headers,
            },
          });

          // レスポンスヘッダーを確認
          const contentDisposition = response.headers.get('Content-Disposition');
          if (contentDisposition && contentDisposition.startsWith('attachment')) {
              // ファイルダウンロード用レスポンスの場合
              const blob = await response.blob();
          
              // ダウンロードリンクを作成してファイルを保存
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
          
              // ファイル名をヘッダーから抽出（存在しない場合はデフォルト名を使用）
              const filenameMatch = contentDisposition.match(/filename="(.+)"/);
              const filename = filenameMatch ? filenameMatch[1] : 'downloaded-file.zip';
          
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              a.remove();
          
              return {
                  data: null, // ダウンロードファイルにデータは含まれない
                  ok: true,
                  error: null,
                  status: response.status,
              };
          }
          
          const data = await response.json();

          if (!response.ok) {
            const errorMessage = data.message || ERROR_MESSAGES[response.status] || ERROR_MESSAGES.default;
            const error = new Error(errorMessage);
            error.status = response?.status || HttpStatusCodes.INTERNAL_SERVER_ERROR;
            throw error;
          }

          return {
            data,
            ok: true,
            error: null,
            status: response.status
          };
        } catch (error) {
          return {
            data: null,
            ok: false,
            error: error.message,
            status: error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR
          };
        }
      })();

      // 進行中のリクエストを保存
      pendingRequests.current.set(requestKey, promise);

      // リクエストの完了を待つ
      const result = await promise;

      if (result?.status === HttpStatusCodes.OK) {
        // 正常終了の場合は何もしない
      } else if (result?.status === HttpStatusCodes.UNAUTHORIZED) {
        // ログイン認証エラーの場合のみ警告を出す
        if (url.startsWith(`/api${redirectTo}`)) {
          ToastService.warning(`エラーコード：${result.status}<br>${result?.error}`);
        }
      } else if (result?.status === HttpStatusCodes.CONFLICT) {
        // 警告トースト表示
        ToastService.warning(`エラーコード：${result.status}<br>${result?.error}`);
      } else {
        // 上記以外はすべてエラートースト表示
        ToastService.error(`エラーコード：${result.status}<br>${result?.error}`);
      }

      return result;
    } catch (error) {
      // 通信エラー
      if (error.status === HttpStatusCodes.UNAUTHORIZED || error.status === HttpStatusCodes.NOT_FOUND
        || error.status === HttpStatusCodes.FORBIDDEN
      ) {
        // 認証エラー|ページなし|不正アクセス発生時にエラーページへリダイレクト
        const errorMessage = encodeURIComponent(`${error.status} | ${error.message}`);
        router.push(`/error?error=${errorMessage}`);    
      } else {
        ToastService.error(`エラーコード：${error.status ? error.status : HttpStatusCodes.INTERNAL_SERVER_ERROR}<br>${error.message}`);
      }
      return {
        data: null,
        ok: false,
        error: error.message,
        status: error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR
      };
    } finally {
      // リクエスト完了後にクリーンアップ
      pendingRequests.current.delete(requestKey);
      
      // 進行中のリクエストがなくなったらローディングを終了 
      // 自動非表示が有効で、進行中のリクエストがなくなり、バッチ処理の一部でなく、手動制御中でもなければマスクを非表示
      if (tempAutoHide && pendingRequests.current.size === 0 && showMaskForThisRequest && 
          !isPartOfBatch && !maskControlledManually.current && batchRequestId.current === null) {
        setIsLoading(false);
      }
    }
  };

  return (
    <ApiContext.Provider value={{ 
      fetchWrapper, 
      isLoading, 
      showMask, 
      hideMask, 
      setAutoHideMask,
      startBatch,
      endBatch
    }}>
      {children}
      <Mask visible={isLoading} />
    </ApiContext.Provider>
  );
};