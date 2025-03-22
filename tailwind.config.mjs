/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@material-tailwind/react/components/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@material-tailwind/react/theme/components/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@mui/material/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        /** ↓↓ ここからカスタマイズ ↓↓ */
        /** ↑↑ ここまでカスタマイズ ↑↑ 
         * 
        */
      },
      /** ↓↓ ここからカスタマイズ ↓↓ */
      spacing: {
        // 間隔
      },
      fontSize: {
        // フォントサイズ
      },
      fontWeight: {
        // フォントウェイト
      },
      fontFamily: {
        // フォント種類
      },
      lineHeight: {
        // 行高
      },
      letterSpacing: {
        // 文字間隔
      },
      height: {
        // 高さ
      },
      width: {
        // 幅
      },
      minHeight: {
        // 最小高さ
      },
      minWidth: {
        // 最小幅
      },
      maxHeight: {
        // 最大高さ
      },
      maxWidth: {
        // 最大幅
      },
      borderRadius: {
        // 角丸
      },
      boxShadow: {
        // 影
      },
      inset: {
        // 内部の影
      },
      zIndex: {
        // z-index
      },
      keyframes: {
        // アニメーションのフレームを定義
      },
      animation: {
        // アニメーションを再生
      },
      screens: {
        // レスポンシブ対応 ※モバイルファーストのため適用するmin-pxを指定
        screenTab: "769px", // タブレットサイズ以上
        screenTabL: "1025px", // タブレット(大)以上
        screenPC: "1367px", // PCサイズ以上
      }
      /** ↑↑ ここまでカスタマイズ ↑↑ */
    },
  },
  plugins: [],
};
