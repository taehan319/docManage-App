/**
 * トースト通知プロバイダー
 */
'use client';

import { useEffect } from 'react';
import { ToastContainer, Bounce, toast } from "react-toastify";
import { usePathname } from 'next/navigation';
import 'react-toastify/dist/ReactToastify.css';

export function ToastProvider({ children }) {
    // 現在のパスを取得
    const pathname = usePathname();
    
    // パスの変更を検知してトーストを消去
    useEffect(() => {
        // toast.dismissAll() はすべてのトーストを消去
        toast.dismiss();
    }, [pathname]); // パスが変わるたびに実行
    
    return (
        <>
            {children}
            <ToastContainer
                transition={Bounce}
                style={{
                  width: 'auto'
                }}
                toastStyle={{
                  width: 'max-content',
                  maxWidth: '90vw',
                  minWidth: '200px',
                  padding: '0.5rem 1.5rem',
                }}
            />
        </>
    );
}