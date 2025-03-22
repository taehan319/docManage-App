////////////////////////////////////////////////////////////////////////////////////
// 404エラーページ                                                                 //
// ∟Next.jsのデフォルト404ページをカスタマイズするため、この階層に配置しなければならない //
////////////////////////////////////////////////////////////////////////////////////
"use client"
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NotFound() {
  const router = useRouter();
  const Not_Found = encodeURIComponent('404 | This page could not be found.');

  // エラーページへ遷移させる場合
  useEffect(() => {
    router.push(`/error?error=${Not_Found}`);
  }, [router, Not_Found]);

  return null; //コンポーネントのレンダリングを防ぐ
};



