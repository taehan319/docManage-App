/*
 * 囲みチェックボックス
*/
import { styled } from '@mui/material/styles';
import FormControlLabel from '@mui/material/FormControlLabel';

// スタイル付きのチェックボックスラベル
export const OutLineCheckBoxLabel = styled(FormControlLabel)(({ theme, checked }) => ({
  margin: theme.spacing(0, 0.5, 0.5),
  padding: theme.spacing(0.5, 1.5),
  borderRadius: 24,
  backgroundColor: checked ? theme.palette.primary.main : theme.palette.grey[200],
  color: checked ? theme.palette.primary.contrastText : theme.palette.text.primary,
  '&:hover': {
    backgroundColor: checked ? theme.palette.primary.dark : theme.palette.grey[300],
  },
  '& .MuiFormControlLabel-label': {
    fontSize: '1rem',
  },
  // チェックボックスの四角い部分を非表示にする
  '& .MuiCheckbox-root': {
    display: 'none',
  }
}));