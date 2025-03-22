/**
 * ログインページ
 */
'use client';
import React, { useEffect, useState } from "react";
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import { useRouter } from 'next/navigation';
import LoginIcon from '@mui/icons-material/Login';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useForm } from 'react-hook-form';
import { createValidator } from './function';
import ToastService from '../utilities/toast';
import { useApi } from '../hooks/useApi';
import Cookies from 'js-cookie';


const Login = () => {
  const [showPassword, setShowPassword] = useState(false);  // パスワード表示状態の管理
  const { fetchWrapper, isLoading } = useApi();
  const { register, handleSubmit, formState: { errors } } = useForm({
    mode: 'onSubmit', // フォーム送信時にバリデーション
  });
  const router = useRouter();

  // ページ遷移時にトーストを消去
  useEffect(() => {
    // 初期ロード時に念のためCookieをクリア
    Cookies.remove(process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME);
    Cookies.remove(process.env.NEXT_PUBLIC_SESSION_COOKIE_SESSION);
    return () => {
      ToastService.dismissAllIfAnyActive();
    };
  }, []);

  // パスワードの表示/非表示を切り替える関数
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  // ログイン処理
  const handleLogin = async (data) => {
    try {
      const result = await fetchWrapper('/api/login', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      if (result.ok) {
        ToastService.success('ログインに成功しました', {
          // ログイン成功時は0.5秒後に自動で消去
          autoClose: 500,
          onClose: () => {
            router.push("/dashboard");
          }
        });
      } else {
      }
    } catch (error) {
    }
  };

  // フォーム送信時のハンドラー
  const onSubmit = (data, event) => {
    event.preventDefault();
    // 送信時に既存のトーストを消去
    ToastService.dismissAll();
    handleLogin(data);
  };

  // バリデーションエラー時のハンドラー
  const onError = (errors) => {
    // バリデーションエラー表示時に既存のトーストを消去
    ToastService.dismissAll();
    ToastService.showValidationErrors(errors);
  };

  return (
    <>
      <Box component="div" className="titleBox">
        <h1 className="titleName">ドキュメント・販売管理</h1>
        <img className="version" src="/common/img/logo.png" />
        {/* <p className="version">-- 社名 --</p> */}
      </Box>
      <Container
        component="form"
        className="w-1/2 screenPC:w-1/3"
        onSubmit={handleSubmit(onSubmit, onError)}
        noValidate
        sx={{ 
          mt: 1,
          width: '90%',
          '@media (min-width: 1025px)': {
            width: '50%',
          },
          '@media (min-width: 1367px)': {
            width: '33.333%',
          }
        }}
      >
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="メールアドレス"
          name="email"
          autoComplete="email"
          autoFocus
          {...register("email", createValidator('email'))}
          error={!!errors.email}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="パスワード"
          type={showPassword ? 'text' : 'password'}  // showPasswordの状態に応じて型を切り替え
          id="password"
          autoComplete="current-password"
          {...register("password", createValidator('password'))}
          error={!!errors.password}
          InputProps={{  // 目のアイコンを追加
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="パスワードの表示切り替え"
                  onClick={handleClickShowPassword}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Button
          type="submit"
          variant="contained"
          size="medium"
          sx={{ mt: 3, mb: 1 }}
          startIcon={<LoginIcon />}
          fullWidth
          disabled={isLoading}
        >
          ログイン
        </Button>
      </Container>
    </>
  );
};

export default Login;