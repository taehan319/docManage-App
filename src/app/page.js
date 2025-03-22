/**
 * ルートページ
 */
import { redirect } from 'next/navigation';
// リダイレクト先
const redirectTo = process.env.NEXT_PUBLIC_REDIRECT_ROOT_TO || '/login'

export default function Home() {
  redirect(redirectTo);
}
