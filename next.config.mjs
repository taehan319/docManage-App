import webpack from 'webpack';
import dotenv from 'dotenv';
import path from 'path';

// 環境に応じて適切な `.env` ファイルを動的に読み込む
const envPath = path.resolve(process.cwd(), `.env.${process.env.NODE_ENV}`);
dotenv.config({ path: envPath });

/** @type {import('next').NextConfig} */
const Internal_Server_Error = encodeURIComponent('500 | Internal Server Error.');
const nextConfig = {
  output: 'standalone', // 静的ファイルとサーバーファイルを分離
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer, dev }) => {
    if (dev || isServer) {
      config.devtool = 'cheap-module-source-map';
    }
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
        'process.env.NEXT_PUBLIC_REDIRECT_ROOT_TO': JSON.stringify(process.env.NEXT_PUBLIC_REDIRECT_ROOT_TO),
        'process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME': JSON.stringify(process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME),
        'process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO': JSON.stringify(process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO),
        'process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ID': JSON.stringify(process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ID),
        'process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_NAME': JSON.stringify(process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_NAME),
        'process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ADMINFLG': JSON.stringify(process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ADMINFLG),
        'process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_FACTORYID': JSON.stringify(process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_FACTORYID),
        'process.env.NEXT_PUBLIC_SESSION_COOKIE_SESSION': JSON.stringify(process.env.NEXT_PUBLIC_SESSION_COOKIE_SESSION),
        'process.env.NEXT_PUBLIC_CHUNK_SIZE': JSON.stringify(process.env.NEXT_PUBLIC_CHUNK_SIZE),
        'process.env.NEXT_PUBLIC_DIRCTORY_PUBLIC': JSON.stringify(process.env.NEXT_PUBLIC_DIRCTORY_PUBLIC),
        'process.env.NEXT_PUBLIC_FOLDER_STORAGE': JSON.stringify(process.env.NEXT_PUBLIC_FOLDER_STORAGE),
        'process.env.NEXT_PUBLIC_FOLDER_PUBLIC_TEMPLATE': JSON.stringify(process.env.NEXT_PUBLIC_FOLDER_PUBLIC_TEMPLATE),
        'process.env.TZ': JSON.stringify(process.env.TZ),
        'process.env.NEXTAUTH_SECRET': JSON.stringify(process.env.NEXTAUTH_SECRET),
        'process.env.NEXT_PUBLIC_SECREK_KEY': JSON.stringify(process.env.NEXT_PUBLIC_SECREK_KEY),
      }),
    );
    config.externals = [...config.externals, 'bcrypt'];
    
    return config;
  },
  async redirects() {
    return [
      // rootアクセスされた場合にログインページへリダイレクト
      {
        source: '/',
        destination: process.env.NEXT_PUBLIC_REDIRECT_ROOT_TO,
        permanent: false,
      },
    ];
  },
  env: {
    TZ: process.env.TZ, // タイムゾーン設定を追加
    NEXT_PUBLIC_REDIRECT_ROOT_TO: process.env.NEXT_PUBLIC_REDIRECT_ROOT_TO,
    NEXT_PUBLIC_SESSION_COOKIE_NAME: process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME,
    NEXT_PUBLIC_SESSION_COOKIE_USERINFO: process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO,
    NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ID: process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ID,
    NEXT_PUBLIC_SESSION_COOKIE_USERINFO_NAME: process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_NAME,
    NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ADMINFLG: process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_ADMINFLG,
    NEXT_PUBLIC_SESSION_COOKIE_USERINFO_FACTORYID: process.env.NEXT_PUBLIC_SESSION_COOKIE_USERINFO_FACTORYID,
    NEXT_PUBLIC_SESSION_COOKIE_SESSIONINFO: process.env.NEXT_PUBLIC_SESSION_COOKIE_SESSION,
    NEXT_PUBLIC_DIRCTORY_PUBLIC: process.env.NEXT_PUBLIC_DIRCTORY_PUBLIC,
    NEXT_PUBLIC_FOLDER_STORAGE: process.env.NEXT_PUBLIC_FOLDER_STORAGE,
    NEXT_PUBLIC_FOLDER_PUBLIC_TEMPLATE: process.env.NEXT_PUBLIC_FOLDER_PUBLIC_TEMPLATE,
    NEXT_PUBLIC_CHUNK_SIZE: process.env.NEXT_PUBLIC_CHUNK_SIZE,
    NEXT_PUBLIC_SECREK_KEY: process.env.NEXT_PUBLIC_SECREK_KEY,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
};

console.log('Current Timezone:', process.env.TZ);

export default nextConfig;
