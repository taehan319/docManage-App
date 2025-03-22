"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const CommonErrorPage = ({ noLogin = false }) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {noLogin ? <NoLoginContent/> : <ErrorContent />}
    </Suspense>
  );
};

const ErrorContent = () => {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center' }}>
      <h1>Server Access Error</h1>
      {error ? <h2>{decodeURIComponent(error)}</h2> : <h2>不明なエラーが発生しました。</h2>}

      <Link href="/" legacyBehavior>
        <a style={{ display: 'inline-block', padding: '10px 20px', marginTop: '20px', fontSize: '16px', color: '#fff', backgroundColor: '#0070f3', borderRadius: '5px', textDecoration: 'none', transition: 'background-color 0.3s ease' }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = '#005bb5'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = '#0070f3'}
        >
          ログイン画面へ
        </a>
      </Link>
    </div>  );
};

const NoLoginContent = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center' }}>
      <h1>Server Access Error</h1>
      <h2>401｜ 一定時間操作が行われなかったか、ログインされていません。</h2>

      <Link href="/" legacyBehavior>
        <a style={{ display: 'inline-block', padding: '10px 20px', marginTop: '20px', fontSize: '16px', color: '#fff', backgroundColor: '#0070f3', borderRadius: '5px', textDecoration: 'none', transition: 'background-color 0.3s ease' }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = '#005bb5'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = '#0070f3'}
        >
          ログイン画面へ
          </a>
      </Link>
    </div>  );
};


export default CommonErrorPage;