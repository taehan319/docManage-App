/**
 * MUIのカスタムテーマを使用するためのプロバイダー
 */
'use client';

import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { theme } from '../styles/theme';

export function ThemeProvider({ children }) {
  return (
    <MuiThemeProvider theme={theme}>
      {children}
    </MuiThemeProvider>
  );
}