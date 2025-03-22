/**
 * サイドメニュー
 */
'use client';
import { useState, useEffect, useMemo } from 'react';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Collapse from '@mui/material/Collapse';
import PersonIcon from '@mui/icons-material/Person';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import BusinessIcon from '@mui/icons-material/Business';
import SalesIcon from '@mui/icons-material/Inventory';
import DescriptionIcon from '@mui/icons-material/Description';
import MasterIcon from '@mui/icons-material/Build';
import FactoryIcon from '@mui/icons-material/Factory';
import CategoryIcon from '@mui/icons-material/Category';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import { useRouter, usePathname } from 'next/navigation';
import { useUserContext } from '../../(dashboard)/layout';

export function Sidebar({ open, onClose }) {
  const [expanded, setExpanded] = useState(true);
  const [openSubMenus, setOpenSubMenus] = useState({ 'マスタ管理': true });
  const router = useRouter();
  const pathname = usePathname();

  // ユーザーコンテキストから情報を取得
  const { userData, isCompanyUser } = useUserContext();

  // 認証状態を確認	
  useEffect(() => {
    try {
      if (!userData) {
        router.push('/login');
        return;
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
      router.push('/login');
    }
  }, [router, userData]);

  // メニュー項目をメモ化して再レンダリングを最小化
  const menuItems = useMemo(() => {
    // 基本のメニュー（全ユーザー共通）
    const commonMenuItems = [
      {
        text: '販売管理',
        icon: <SalesIcon />,
        path: '/dashboard',
      },
      {
        text: 'レポート',
        icon: <DescriptionIcon />,
        path: '/report',
      },
      {
        text: 'マスタ管理',
        icon: <MasterIcon />,
        children: [
          { text: 'ユーザーマスタ', icon: <PersonIcon />, path: '/users' },
          { text: '部署マスタ', icon: <FactoryIcon />, path: '/bushomst' },
        ]
      },
    ];

    // 自社ユーザー（factory_id = 0）のみ表示するメニュー
    const companyOnlyMenuItems = [
    ];

    // 工場ユーザー（factory_id ≠ 0）のみ表示するメニュー
    const factoryOnlyMenuItems = [];

    // 条件に基づいてメニュー項目を結合
    return [
      ...commonMenuItems,
      ...(isCompanyUser ? companyOnlyMenuItems : factoryOnlyMenuItems)
    ];
  }, [isCompanyUser]); // isCompanyUserが変更された場合のみ再計算

  const drawerWidth = expanded ? 240 : 68;

  const handleToggleExpand = () => {
    setExpanded(!expanded);
  };

  const handleToggleSubMenu = (text) => {
    setOpenSubMenus(prev => ({
      ...prev,
      [text]: !prev[text]
    }));
  };

  const renderMenuItem = (item, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isSelected = pathname === item.path;

    return (
      <Box key={item.text}>
        <ListItem
          component="div"
          sx={{
            justifyContent: expanded ? 'initial' : 'center',
            height: '4rem', // 高さを固定
            pl: expanded ? `${(depth + 1)}rem` : '1rem',
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
            backgroundColor: isSelected ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
          }}
          onClick={() => {
            if (hasChildren) {
              handleToggleSubMenu(item.text);
            } else {
              router.push(item.path);
            }
          }}
        >
          <ListItemIcon sx={{
            minWidth: expanded ? '2rem' : 'auto',
            ml: expanded ? '0.5rem' : 0
          }}>
            {item.icon}
          </ListItemIcon>
          {expanded && (
            <>
              <ListItemText primary={item.text} />
              {hasChildren && (
                openSubMenus[item.text] ? <ExpandLess /> : <ExpandMore />
              )}
            </>
          )}
        </ListItem>

        {hasChildren && expanded && (
          <Collapse in={openSubMenus[item.text]} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map(child => renderMenuItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </Box>
    );
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          transition: expanded ? 'none' : 'width 0.1s linear', // 重要: 開くときは即時、閉じるときのみトランジション
          overflowX: 'hidden',
          position: 'fixed', // 固定位置を使用してレイアウトフローから切り離す
          transform: 'translateZ(0)', // ハードウェアアクセラレーションを強制
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'hidden' }}>
        <List>
          <ListItem 
            sx={{ 
              pl: '1rem',
              height: '4rem', // トグルボタン部分も高さを固定
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <IconButton onClick={handleToggleExpand} edge="start">
              {expanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </IconButton>
          </ListItem>
          <Divider />
          {menuItems.map(item => renderMenuItem(item))}
        </List>
      </Box>
    </Drawer>
  );
}