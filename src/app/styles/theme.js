/**
 * MUIのカスタムテーマを定義
 */
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  components: {
    MuiButton: {
      variants: [
        {
          // 青(MUIプライマリー色)
          props: { variant: 'doButton' },
          style: {
            backgroundColor: '#0288d1',
            color: 'white',
            '&:hover': {
              backgroundColor: '#0277bd'
            }
          }
        },
        {
          // グレー
          props: { variant: 'cancelButton' },
          style: {
            backgroundColor: 'rgb(156, 163, 175)',
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgb(107, 114, 128)'
            }
          }
        },
        {
          // 緑
          props: { variant: 'outputButton' },
          style: {
            backgroundColor: '#00c853', //66bb6a,
            color: 'white',
            '&:hover': {
              backgroundColor: '#43a047'
            }
          }
        }
      ]
    }
  }
});