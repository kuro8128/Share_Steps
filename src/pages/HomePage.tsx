import { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Footprints, Target, Save, BarChart3, CalendarDays, CalendarRange, CalendarFold } from 'lucide-react';
import { Message } from '../components/Message';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { getStepHistory, getTodayStep, upsertTodayStep } from '../lib/api';
import { parseNonNegativeInteger } from '../lib/validation';
import type { Profile, StepRecord } from '../types';

type HomePageProps = {
  date: string;
  userId: string;
  profile: Profile;
};

type ViewType = 'day' | 'month' | 'year';

export function HomePage({ date, userId, profile }: HomePageProps) {
  const [stepRecord, setStepRecord] = useState<StepRecord | null>(null);
  const [stepsInput, setStepsInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [history, setHistory] = useState<StepRecord[]>([]);
  const [viewType, setViewType] = useState<ViewType>('day');
  const [loadingHistory, setLoadingHistory] = useState(true);

  const steps = stepRecord?.steps ?? 0;
  const achieved = steps >= profile.target_steps;

  useEffect(() => {
    let ignore = false;

    async function loadStep() {
      setLoading(true);
      setError(null);

      try {
        const record = await getTodayStep(userId, date);
        if (!ignore) {
          setStepRecord(record);
          setStepsInput(record?.steps.toString() ?? '');
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : '歩数の読み込みに失敗しました。');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadStep();

    return () => {
      ignore = true;
    };
  }, [date, userId]);

  useEffect(() => {
    async function loadHistory() {
      setLoadingHistory(true);
      try {
        const data = await getStepHistory(userId);
        setHistory(data);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoadingHistory(false);
      }
    }
    void loadHistory();
  }, [userId, notice]); // Reload history when a new step is saved

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
      let displayLabel = label;

      if (viewType === 'month') {
        const [year, month] = label.split('-');
        displayLabel = `${parseInt(month, 10)}月 合計`;
        currentTarget = profile.target_steps * data.count;
      } else if (viewType === 'year') {
        displayLabel = `${label}年 合計`;
        currentTarget = profile.target_steps * data.count;
      }

      return {
        label,
        displayLabel,
        steps: data.steps,
        averageSteps: Math.round(data.steps / data.count),
        targetSteps: currentTarget,
        achieved: data.steps >= currentTarget,
      };
    });

    items.sort((a, b) => b.label.localeCompare(a.label));

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

  const overallAverage = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, row) => acc + row.steps, 0);
    return Math.round(sum / chartData.length);
  }, [chartData]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const parsedSteps = parseNonNegativeInteger(stepsInput, '歩数');
      const saved = await upsertTodayStep(userId, date, parsedSteps);
      setStepRecord(saved);
      setNotice(`${date} の歩数を保存しました。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '歩数の保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-title">
        <p>{date}</p>
        <h1>ホーム</h1>
      </div>

      {loading ? <p className="loading-text">歩数を読み込み中...</p> : null}
      <Message message={error} tone="error" />
      <Message message={notice} tone="success" />

      <div className="stats-grid">
        <StatCard label="この日の歩数" value={`${steps.toLocaleString()}歩`} icon={<Footprints size={22} aria-hidden="true" />} />
        <StatCard label="目標歩数" value={`${profile.target_steps.toLocaleString()}歩`} icon={<Target size={22} aria-hidden="true" />} />
        <StatCard
          label="達成状況"
          value={achieved ? '達成' : '未達成'}
          detail={achieved ? 'この日の目標をクリアしています。' : `${Math.max(profile.target_steps - steps, 0).toLocaleString()}歩で達成`}
          icon={<CheckCircle2 size={22} aria-hidden="true" />}
        />
      </div>

      <form className="panel form-stack" onSubmit={handleSubmit}>
        <h2>歩数登録</h2>
        <label>
          この日の歩数
          <input
            inputMode="numeric"
            min={0}
            pattern="[0-9]*"
            placeholder="例: 9200"
            required
            type="number"
            value={stepsInput}
            onChange={(event) => setStepsInput(event.target.value)}
          />
        </label>
        <button className="primary-button" disabled={saving} type="submit">
          <Save size={18} aria-hidden="true" />
          <span>{saving ? '保存中...' : '保存する'}</span>
        </button>
      </form>

      <section className="health-chart-card">
        <div className="health-period-selector">
          {(['day', 'month', 'year'] as ViewType[]).map((type) => (
            <button
              key={type}
              className={`health-period-button ${viewType === type ? 'active' : ''}`}
              type="button"
              onClick={() => setViewType(type)}
            >
              {type === 'day' ? '日' : type === 'month' ? '月' : '年'}
            </button>
          ))}
        </div>

        <div className="health-chart-header">
          <span className="label">
            {viewType === 'day' ? '日別平均' : viewType === 'month' ? '月別平均' : '年別平均'}
          </span>
          <div className="main-value">
            {overallAverage.toLocaleString()}
            <span>歩</span>
          </div>
        </div>

        {loadingHistory ? (
          <div style={{ height: '240px', display: 'grid', placeItems: 'center' }}>
            <p className="loading-text">統計データを読み込み中...</p>
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ height: '240px' }}>
            <EmptyState title="データがありません" description="歩数を登録するとここに統計が表示されます。" />
          </div>
        ) : (
          <div className="health-chart-container">
            <div className="health-chart-grid">
              <div className="health-chart-grid-line" />
              <div className="health-chart-grid-line" />
              <div className="health-chart-grid-line" />
              <div className="health-chart-grid-line" />
            </div>
            {chartData.slice().reverse().map((row) => (
              <div className="health-chart-bar-wrapper" key={row.label}>
                <div
                  className={`health-chart-bar ${row.achieved ? '' : 'not-achieved'}`}
                  style={{ '--bar-height': `${row.percent}%` } as CSSProperties}
                  title={`${row.displayLabel || row.label}: ${row.steps.toLocaleString()}歩`}
                />
                <span className="health-chart-axis-label">
                  {viewType === 'day'
                    ? row.label.substring(8) // Just day DD
                    : viewType === 'month'
                    ? `${parseInt(row.label.split('-')[1], 10)}月`
                    : `${row.label}年`}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
