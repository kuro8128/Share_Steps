import { FormEvent, useState } from 'react';
import { DoorOpen, Footprints, LogIn, UserPlus } from 'lucide-react';
import { Message } from '../components/Message';
import { signIn, signInAsGuest, signUp } from '../lib/api';

type AuthPageProps = {
  mode: 'login' | 'signup';
  navigate: (path: string) => void;
};

export function AuthPage({ mode, navigate }: AuthPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestInviteCode, setGuestInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const isSignup = mode === 'signup';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      if (isSignup) {
        const data = await signUp(email, password);
        if (!data.session) {
          setNotice('登録しました。確認メールが届いた場合は、メール内のリンクを開いてからログインしてください。');
          navigate('/login');
        }
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '認証に失敗しました。');
    } finally {
      setLoading(false);
    }
  }

  async function handleGuestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setGuestLoading(true);

    try {
      const groupId = await signInAsGuest(guestName, guestInviteCode);
      navigate(groupId ? `/groups/${groupId}` : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ゲスト開始に失敗しました。');
    } finally {
      setGuestLoading(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="auth-heading">
          <span className="brand-mark">
            <Footprints size={26} aria-hidden="true" />
          </span>
          <div>
            <h1>Share Steps</h1>
            <p>友達グループで今日の歩数を共有</p>
          </div>
        </div>

        <form className="form-stack guest-start" onSubmit={handleGuestSubmit}>
          <h2>ゲストで始める</h2>
          <label>
            名前
            <input
              autoComplete="nickname"
              placeholder="例: みな"
              required
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
            />
          </label>
          <label>
            参加コード
            <input
              autoCapitalize="characters"
              placeholder="グループ参加時のみ"
              value={guestInviteCode}
              onChange={(event) => setGuestInviteCode(event.target.value.toUpperCase())}
            />
          </label>
          <button className="primary-button" disabled={guestLoading} type="submit">
            <DoorOpen size={18} aria-hidden="true" />
            <span>{guestLoading ? '開始中...' : guestInviteCode.trim() ? 'グループに参加' : '一人で始める'}</span>
          </button>
        </form>

        <div className="auth-divider">
          <span>または</span>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <h2>{isSignup ? '新規登録' : 'ログイン'}</h2>
          <label>
            メールアドレス
            <input
              autoComplete="email"
              inputMode="email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            パスワード
            <input
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              minLength={6}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="primary-button" disabled={loading} type="submit">
            {isSignup ? <UserPlus size={18} aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />}
            <span>{loading ? '処理中...' : isSignup ? '登録する' : 'ログインする'}</span>
          </button>
          <Message message={error} tone="error" />
          <Message message={notice} tone="success" />
        </form>

        <button className="text-button" type="button" onClick={() => navigate(isSignup ? '/login' : '/signup')}>
          {isSignup ? 'ログイン画面へ' : '新規登録画面へ'}
        </button>
      </section>
    </main>
  );
}
