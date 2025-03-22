//////////////////////////////////
// ファイルアップロード(チャンク) //
//////////////////////////////////
"use client"

import { ChunkUploader } from 'nextjs-chunk-upload-action';

/**
 * ファイルをチャンク分割してアップロードする
 * @param {string} id 販売ID
 * @param {boolean} flg 公開フラグ
 * @param {File} file アップロードするファイル
 * @returns {Promise<Object>} アップロード結果
 */
export async function uploadFileInChunks(id, flg, file) {
    const CHUNK_SIZE = parseInt(process.env.NEXT_PUBLIC_CHUNK_SIZE, 10) || 1024 * 1024; // デフォルト1MB

    // Promiseを返す
    return new Promise((resolve, reject) => {
        let uploaderInstance = null;
        
        try {
            uploaderInstance = new ChunkUploader({
                file,
                chunkBytes: CHUNK_SIZE,
                metadata: { id: id, flg: flg },
                onChunkUpload: async (chunkFormData, metadata) => {
                    try {
                        const formData = new FormData();
                        for (const [key, value] of chunkFormData.entries()) {
                            formData.append(key, value);
                        }

                        // ファイル名設定
                        formData.append('filename', file.name);   

                        const response = await fetch(`/api/files/upload/${metadata.id}/${metadata.flg}`, {
                            method: 'POST',
                            body: formData,
                        });

                        // レスポンスが失敗の場合
                        if (!response.ok) {
                            const errorData = await response.json().catch(() => ({}));
                            const errorMessage = errorData.error || `チャンク ${chunkFormData.get('offset')} のアップロードに失敗しました (${response.status})`;
                            throw new Error(errorMessage);
                        }
                        
                        return response;
                    } catch (error) {
                        // アップローダーを中止する
                        if (uploaderInstance) {
                            uploaderInstance.abort();
                        }
                        
                        // エラーを再スローする
                        throw error;
                    }
                },
                // 成功コールバックの追加
                onSuccess: (result) => {
                    resolve({ ok: true, result });
                },
                // エラーコールバックの追加
                onError: (error) => {
                    // アップローダーを中止する
                    if (uploaderInstance) {
                        uploaderInstance.abort();
                    }
                    
                    // エラーを返すが、Promise自体は解決する（reject ではなく resolve）
                    resolve({ ok: false, error: error.message });
                },
            });

            // アップロード開始
            uploaderInstance.start();
        } catch (error) {
            // アップローダーの初期化など、最初のエラーを処理
            // Promise自体は解決する
            resolve({ ok: false, error: error.message });
        }
    });
}