'use client';
import { useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { initializeApi } from './apiService';

/**
 * APIサービスを初期化するコンポーネント
 * アプリケーションのルートレベルでこのコンポーネントを使用します
 */
const ApiServiceInitializer = () => {
  const { fetchWrapper } = useApi();
  
  useEffect(() => {
    // APIサービスをシングルトンとして初期化
    initializeApi(fetchWrapper);
    
    // クリーンアップ処理は不要（アプリケーション終了時にリセットされる）
  }, [fetchWrapper]);
  
  return null;
};

export default ApiServiceInitializer;