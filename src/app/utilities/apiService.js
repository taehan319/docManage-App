/**
 * Api共通化サービス
 */
let apiServiceInstance = null;

// APIサービスを初期化する関数
export const initializeApi = (apiService) => {
  apiServiceInstance = apiService;
};

// APIサービスを取得する関数
export const getApiService = () => {
  if (!apiServiceInstance) {
    throw new Error('API service must be initialized first');
  }
  return apiServiceInstance;
};