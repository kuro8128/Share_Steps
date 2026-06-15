import { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import { BarChart3, LogOut, Save, CalendarDays, CalendarRange, CalendarFold } from 'lucide-react';
import { Message } from '../components/Message';
import { EmptyState } from '../components/EmptyState';
import { getStepHistory, signOut, updateProfile } from '../lib/api';
import { parsePositiveInteger } from '../lib/validation';
import type { Profile, StepRecord } from '../types';

type MyPageProps = {
  profile: Profile;
  onProfileUpdated: (profile: Profile) => void;
};

type ViewType = 'day' | 'month' | 'year';

export function MyPage({ profile, onProfileUpdated }: MyPageProps) {
  const [username, setUsername] = useState(profile.username);
  const [targetSteps, setTargetSteps] = useState(profile.target_steps.toString());
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [history, setHistory] = useState<StepRecord[]>([]);
  const [viewType, setViewType] = useState<ViewType>('day');
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    setUsername(profile.username);
    setTargetSteps(profile.target_steps.toString());
  }, [profile]);

  useEffect(() => {
    async function loadHistory() {
      setLoadingHistory(true);
      try {
        const data = await getStepHistory(profile.id);
        setHistory(data);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoadingHistory(false);
      }
    }
    void loadHistory();
  }, [profile.id]);

  const chartData = useMemo(() => {
    if (history.length === 0) return [];

    const grouped = new Map<string, { steps: number; count: number }>();

    history.forEach((record) => {
      let key = record.date;
      if (viewType === 'month') {
        key = record.date.substring(0, 7); // YYYY-MM
      } else if (viewType === 'year') {
        key = record.date.substring(0, 4); // YYYY
      }

      const existing = grouped.get(key) ?? { steps: 0, count: 0 };
      grouped.set(key, {
        steps: existing.steps + record.steps,
        count: existing.count + 1,
      });
    });

    const items = Array.from(grouped.entries()).map(([label, data]) => {
      let currentTarget = profile.target_steps;
      if (viewType === 'month') {
        // Approximate monthly target (days in month * daily target)
        // For simplicity, we can use the count of records if they are daily
        currentTarget = profile.target_steps * data.count;
      } else if (viewType === 'year') {
        currentTarget = profile.target_steps * data.count;
      }

      return {
        label,
        steps: data.steps,
        targetSteps: currentTarget,
        achieved: data.steps >= currentTarget,
      };
    });

    // Sort by label descending (newest first)
    items.sort((a, b) => b.label.localeCompare(a.label));

    // Limit items for display
    let limitedItems = items;
    if (viewType === 'day') {
      limitedItems = items.slice(0, 7);
    } else if (viewType === 'month') {
      limitedItems = items.slice(0, 12);
    }

    const maxSteps = Math.max(...limitedItems.map((item) => Math.max(item.steps, item.targetSteps)), 1);

    return limitedItems.map((item) => ({
      ...item,
      percent: Math.min((item.steps / maxSteps) * 100, 100),
      targetPercent: Math.min((item.targetSteps / maxSteps) * 100, 100),
    }));
  }, [history, viewType, profile.target_steps]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
        throw new Error('ユーザー名を入力してください。');
      }

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
        <p>Profile & Stats</p>
        <h1>マイページ</h1>
      </div>

      <section className="panel">
        <div className="section-heading">
          <BarChart3 size={22} aria-hidden="true" />
          <h2>歩数統計</h2>
        </div>

        <div className="view-selector">
          <button
            className={`view-button ${viewType === 'day' ? 'active' : ''}`}
            type="button"
            onClick={() => setViewType('day')}
          >
            <CalendarDays size={18} />
            <span>日別</span>
          </button>
          <button
            className={`view-button ${viewType === 'month' ? 'active' : ''}`}
            type="button"
            onClick={() => setViewType('month')}
          >
            <CalendarRange size={18} />
            <span>月別</span>
          </button>
          <button
            className={`view-button ${viewType === 'year' ? 'active' : ''}`}
            type="button"
            onClick={() => setViewType('year')}
          >
            <CalendarFold size={18} />
            <span>年別</span>
          </button>
        </div>

        {loadingHistory ? (
          <p className="loading-text">統計データを読み込み中...</p>
        ) : chartData.length === 0 ? (
          <EmptyState title="データがありません" description="歩数を登録するとここに統計が表示されます。" />
        ) : (
          <div className="ranking-list">
            {chartData.map((row) => (
              <div className="ranking-viz-row" key={row.label}>
                <div className="rank-number" style={{ background: '#eef2f6', color: '#687587' }}>
                  {viewType === 'day' ? <CalendarDays size={18} /> : viewType === 'month' ? <CalendarRange size={18} /> : <CalendarFold size={18} />}
                </div>
                <span className="viz-username">{row.label}</span>
                <div className="viz-bar-container">
                  <span
                    className="viz-target"
                    style={{ left: `${row.targetPercent}%` }}
                    title={`目標 ${row.targetSteps.toLocaleString()}歩`}
                  />
                  <div
                    aria-label={`${row.label}: ${row.steps.toLocaleString()}歩`}
                    className={`viz-bar ${row.achieved ? 'achieved' : ''}`}
                    role="img"
                    style={{ '--bar-width': `${row.percent}%` } as CSSProperties}
                  />
                </div>
                <span className="viz-value">
                  {row.steps.toLocaleString()}歩
                  <small>目標 {row.targetSteps.toLocaleString()}歩</small>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

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

      <section className="panel">
        <button className="danger-button" disabled={loggingOut} type="button" onClick={handleSignOut}>
          <LogOut size={18} aria-hidden="true" />
          <span>{loggingOut ? 'ログアウト中...' : 'ログアウト'}</span>
        </button>
      </section>
    </section>
  );
}
