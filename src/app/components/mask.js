/**
 * API通信 ローディングマスク
 */
'use client';

import React from 'react';
import AutorenewIcon from '@mui/icons-material/Autorenew';

// アイコンローダー
export const IconLoader = ({ visible }) => {
  if (!visible) {
    return null;
  }

  return (
    <div className="loader-container">
      <div className="flex items-center gap-3">
        <AutorenewIcon 
          sx={{ 
            color: 'white',
            fontSize: '5rem',
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              '0%': {
                transform: 'rotate(0deg)',
              },
              '100%': {
                transform: 'rotate(360deg)',
              },
            },
          }} 
        />
      </div>
    </div>
  );
};

// スタイリッシュなデュアルリングローダー( 二重リングの回転アニメーション)
export const DualRingLoader = ({ visible }) => {
	  if (!visible) {
	    return null;
	  }

	  return (
	  <div className="loader-container">
	    <div style={{display: 'inline-block'}}>
	      <div className="dual-ring-spinner" />
	    </div>
	  </div>
	);
};

// パルスエフェクトローダー(3つのドットのパルスアニメーション)
export const PulseLoader = ({ visible }) => {
	  if (!visible) {
	    return null;
	  }

	  return (
  <div className="loader-container">
    <div className="loader-content">
      <div className="dot-container">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
    </div>
  </div>
  );
};

// モダンなスピナー
export const ModernSpinner = ({ visible }) => {
	  if (!visible) {
	    return null;
	  }

	  return (
  <div className="loader-container">
    <div className="spinner-container">
      <svg 
        className="spinner-svg" 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="spinner-circle" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="spinner-path" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  </div>
);
};

// グラデーションリングローダー
export const GradientRingLoader = ({ visible }) => {
	  if (!visible) {
	    return null;
	  }

	  return (
	  <div className="loader-container">
	    <div className="relative flex flex-col items-center gap-4">
	      <div className="absolute w-16 h-16 border-4 border-gray-200 rounded-full"></div>
	      <div className="w-16 h-16 border-4 border-blue-500 rounded-full animate-spin" 
	           style={{ 
	             borderTopColor: 'transparent',
	             borderLeftColor: 'transparent',
	             borderRightColor: 'transparent'
	           }}>
	      </div>
	    </div>
	  </div>
	);
};
