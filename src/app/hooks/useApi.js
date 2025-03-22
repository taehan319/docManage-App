/**
 * API通信ラップ処理
 */
import { useContext } from 'react';
import { ApiContext } from '../contexts/apiWrapProvider';

export const useApi = () => {
  const context = useContext(ApiContext);
  
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  
  const { 
    fetchWrapper, 
    isLoading, 
    showMask, 
    hideMask, 
    setAutoHideMask,
    startBatch,
    endBatch
  } = context;
  
  return { 
    fetchWrapper, 
    isLoading, 
    showMask, 
    hideMask, 
    setAutoHideMask,
    startBatch,
    endBatch
  };
};