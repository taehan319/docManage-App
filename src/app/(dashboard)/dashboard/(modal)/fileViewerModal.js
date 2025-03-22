/**
 * ファイルビュアーモーダル（タッチスクリーン対応版）
 */
import React, { useState, useEffect, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MenuIcon from '@mui/icons-material/Menu';
import DescriptionIcon from '@mui/icons-material/Description';

const FileViewerModal = ({ open, onClose, files, rowInfo }) => {
  // ファイル名をカンマで分割して配列に変換
  const fileList = files;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [mouseStart, setMouseStart] = useState(null);
  const [mouseEnd, setMouseEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const contentRef = useRef(null);

  // モーダルが開かれたときに最初のファイルを表示
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setActiveTab(0);
    }
  }, [open]);

  // タブとインデックスの同期を確実にする
  useEffect(() => {
    setActiveTab(currentIndex);
  }, [currentIndex]);

  // ファイルが存在しない場合(基本ここまで来ない想定)
  if (fileList.length === 0 || rowInfo === undefined) {
    return (
      <Dialog
        open={open}
        onClose={(event, reason) => {
          if (reason !== 'backdropClick') {
            handleCloseModal();
          }
        }}
        maxWidth='sm'
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{rowInfo.product_no} ドキュメント</Typography>
            <Button onClick={onClose} color="primary" endIcon={<CloseIcon />}>
              閉じる
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <Typography variant="body1">表示するファイルがありません</Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  // 現在のファイル名
  const currentFileName = fileList[currentIndex];
  
  // ファイルの拡張子を取得
  const getFileExtension = (filename) => {
    return filename.split('.').pop().toLowerCase();
  };
  
  // 拡張子に基づいてファイルタイプを判定
  const getFileType = (filename) => {
    const ext = getFileExtension(filename);
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic'].includes(ext)) return 'image';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['mp4', 'webm', 'ogg', 'mov', 'hevc'].includes(ext)) return 'video';
    return 'other';
  };
  
  // 現在のファイルタイプ
  const currentFileType = getFileType(currentFileName);
  
  // 前のファイルへ
  const handlePrevFile = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : fileList.length - 1));
  };
  
  // 次のファイルへ
  const handleNextFile = () => {
    setCurrentIndex((prev) => (prev < fileList.length - 1 ? prev + 1 : 0));
  };
  
  // タブ変更ハンドラ
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setCurrentIndex(newValue);
  };

  // タッチイベントハンドラ
  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe) {
      handleNextFile();
    } else if (isRightSwipe) {
      handlePrevFile();
    }
  };

  // マウスドラッグイベントハンドラ
  const handleMouseDown = (e) => {
    e.preventDefault();
    setMouseEnd(null);
    setMouseStart(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setMouseEnd(e.clientX);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (!mouseStart || !mouseEnd) return;
    const distance = mouseStart - mouseEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe) {
      handleNextFile();
    } else if (isRightSwipe) {
      handlePrevFile();
    }
  };

  // マウスドラッグがキャンセルされた場合（ウィンドウ外にマウスが移動した場合など）
  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // モバイルメニューのトグル
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  // コンポーネント全体のマウスアップイベントリスナー
  useEffect(() => {
    // ドキュメント全体にマウスアップイベントリスナーを追加
    const handleGlobalMouseUp = () => {
      handleMouseUp();
    };
    
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    // クリーンアップ関数
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [mouseStart, mouseEnd, isDragging]);

  // ファイルのレンダリング
  const renderFileContent = () => {
    const path = `/${process.env.NEXT_PUBLIC_FOLDER_STORAGE}/${rowInfo.sale_id}/${currentFileName}`;
    switch (currentFileType) {
      case 'image':
        return (
          <Box 
            display="flex" 
            justifyContent="center" 
            alignItems="center"
            sx={{
              height: '100%',
            }}
            ref={contentRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <img 
              src={path}
              alt={currentFileName}
              style={{
                width: '95%',
                height: '100%',
                objectFit: 'contain'
              }}
              draggable={false}
            />
          </Box>
        );
        
      case 'pdf':
        return (
          <Box 
            display="flex" 
            justifyContent="center" 
            alignItems="center"
            sx={{ 
              height: '100%',
            }}
            ref={contentRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
          <iframe
            src={path}
            style={{
              width: '95%',
              height: '100%',
              border: 'none',
            }}
            title={currentFileName}
          />
          </Box>
        );
        
      case 'video':
        return (
          <Box 
            display="flex" 
            justifyContent="center" 
            alignItems="center"
            sx={{ 
              height: '100%',
            }}
            ref={contentRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <video src={path} controls
              style={{
                width: '95%',
                height: '100%',
              }}>
            </video>
          </Box>
        );
        
      default:
        return (
          <Box 
            display="flex" 
            justifyContent="center" 
            alignItems="center"
            sx={{ 
              height: '100%',
            }}
            ref={contentRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <Typography>
              このファイル形式はプレビューできません（{currentFileName}）
            </Typography>
          </Box>
        );
    }
  };

  // モバイルメニュードロワーの内容
  const mobileMenuContent = (
    <Box sx={{ width: 250, p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>ファイル一覧</Typography>
      {fileList.map((file, index) => (
        <Box 
          key={index} 
          sx={{ 
            p: 1, 
            mb: 1, 
            cursor: 'pointer',
            backgroundColor: currentIndex === index ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
            borderLeft: currentIndex === index ? '4px solid #1976d2' : '4px solid transparent',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)'
            }
          }}
          onClick={() => {
            setCurrentIndex(index);
            setMobileMenuOpen(false);
          }}
        >
          <Typography variant="body2" noWrap>{file}</Typography>
        </Box>
      ))}
    </Box>
  );
  
  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason !== 'backdropClick') {
          handleCloseModal();
        }
      }}
      maxWidth='xl'
      fullWidth
      fullScreen
      disableEscapeKeyDown
    >
      <DialogTitle sx={{padding: '0 1rem'}}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center">
            {/* モバイル向けメニューボタン */}
            <IconButton
              sx={{ mr: 1, display: { xs: 'inline-flex', md: 'none' } }}
              onClick={toggleMobileMenu}
              color="primary"
              aria-label="ファイル一覧"
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="p" fontSize="1rem" display="flex" justifyContent="flex-start" alignItems="center" color='primary'>
              <DescriptionIcon fontSize="medium" sx={{ mr: 1 }} />
              {rowInfo.product_no}
              <Typography variant="span" sx={{fontSize: '1rem', mx: 2}}>{fileList[currentIndex]}（{currentIndex + 1}/{fileList.length}ファイル）</Typography>
            </Typography>
          </Box>
          <Button onClick={onClose} color="primary" endIcon={<CloseIcon />}>
            閉じる
          </Button>
        </Box>
      </DialogTitle>
      {/* モバイル向けスワイプ可能なドロワーメニュー */}
      <SwipeableDrawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onOpen={() => setMobileMenuOpen(true)}
        sx={{ display: 'block' }}
      >
        {mobileMenuContent}
      </SwipeableDrawer>
      
      <DialogContent dividers sx={{ p: 1, height: 'calc(100vh - 120px)' }}>
        <Box position="relative" sx={{ height: '100%' }}>
          {/* 前へ・次へボタン */}
          {fileList.length > 1 && (
            <>
              <IconButton 
                onClick={handlePrevFile}
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(255,255,255,0.5)',
                  zIndex: 10,
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.8)',
                  }
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
              
              <IconButton 
                onClick={handleNextFile}
                sx={{
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(255,255,255,0.5)',
                  zIndex: 10,
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.8)',
                  }
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </>
          )}
          
          {/* ファイルコンテンツ */}
          {renderFileContent()}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default FileViewerModal;