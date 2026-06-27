cat > src/pages/MyPage.tsx << 'EOF'
import { FormEvent, useEffect, useState } from 'react';
import { KeyRound, LogOut, Save } from 'lucide-react';
import { Message } from '../components/Message';
import { getCurrentUser, signOut, updatePassword, updateProfile } from '../lib/api';
import { parsePositiveInteger } from '../lib/validation';
import type { Profile } from '../types';

type MyPageProps = {
  profile: Profile;
  onProfileUpdated: (profile: Profile) => void;
};

export function MyPage({ profile, onProfileUpdated }: MyPageProps) {
  const [username, setUsername] = useState(profile.username);
  const [targetSteps, setTargetSteps] = useState(profile.target_steps.toString());
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [email, setEmail] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  useEffect(() => {
    setUsername(profile.username);
    setTargetSteps(profile.target_steps.toString());
  }, [profile]);

  useEffect(() => {
    getCurrentUser().then((user) => {
      setEmail(user?.email ?? null);
      setIsAnonymous(user?.is_anonymous ?? false);
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) throw new Error('ユーザー名を入力してください。');
      const parsedTargetSteps = parsePositiveInteger(targetSteps, '目標歩数');
      const saved = await updateProfile(profile.id, trimmedUsername, parsedTargetSteps);
      onProfileUpdated(saved);
      setNotice('プロフィールを保存しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'プロフィールの保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordNotice(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('パスワードが一致しません。');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('6文字以上で入力してください。');
      return;
    }
    setPasswordSaving(true);
    try {
      await updatePassword(newPassword);
      setPasswordNotice('パスワードを変更しました。');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'パスワードの変更に失敗しました。');
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleSignOut() {
    setLoggingOut(true);
    setError(null);
    try {
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログアウトに失敗しました。');
      setLoggingOut(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-title">
        <p>Profile & Settings</p>
        <h1>マイページ</h1>
      </div>

      <section className="panel form-stack">
        <h2>プロフィール編集</h2>
        <form className="form-stack compact" onSubmit={handleSubmit}>
          <label>
            ユーザー名
            <input required value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            1日の目標歩数
            <input
              inputMode="numeric"
              min={1}
              pattern="[0-9]*"
              required
              type="number"
              value={targetSteps}
              onChange={(event) => setTargetSteps(event.target.value)}
            />
          </label>
          <button className="primary-button" disabled={saving} type="submit">
            <Save size={18} aria-hidden="true" />
            <span>{saving ? '保存中...' : '保存する'}</span>
          </button>
        </form>
        <Message message={error} tone="error" />
        <Message message={notice} tone="success" />
      </section>

      <section className="panel form-stack">
        <h2>アカウント情報</h2>
        <p>
          メールアドレス：
          {isAnonymous ? 'ゲストユーザー（未登録）' : (email ?? '取得中...')}
        </p>
      </section>

      {!isAnonymous && (
        <section className="panel form-stack">
          <h2>パスワード変更</h2>
          <form className="form-stack compact" onSubmit={handlePasswordChange}>
            <label>
              新しいパスワード
              <input
                required
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </label>
            <label>
              パスワード（確認）
              <input
                required
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
            <button className="primary-button" disabled={passwordSaving} type="submit">
              <KeyRound size={18} aria-hidden="true" />
              <span>{passwordSaving ? '変更中...' : 'パスワードを変更する'}</span>
            </button>
          </form>
          <Message message={passwordError} tone="error" />
          <Message message={passwordNotice} tone="success" />
        </section>
      )}

      <section className="panel">
        <button className="danger-button" disabled={loggingOut} type="button" onClick={handleSignOut}>
          <LogOut size={18} aria-hidden="true" />
          <span>{loggingOut ? 'ログアウト中...' : 'ログアウト'}</span>
        </button>
      </section>
    </section>
  );
}
EOF