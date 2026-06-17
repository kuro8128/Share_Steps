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

type ViewType = 'W' | 'M' | '6M' | 'Y';

export function HomePage({ date, userId, profile }: HomePageProps) {
  const [stepRecord, setStepRecord] = useState<StepRecord | null>(null);
  const [stepsInput, setStepsInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [history, setHistory] = useState<StepRecord[]>([]);
  const [viewType, setViewType] = useState<ViewType>('W');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedDataPoint, setSelectedDataPoint] = useState<string | null>(null);

  const steps = stepRecord?.steps ?? 0;
  const achieved = steps >= profile.target_steps;

  useEffect(() => {
    setSelectedDataPoint(null);
  }, [viewType]);

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
  }, [userId, notice]);


  const chartData = useMemo(() => {
    const today = new Date(date);
    const items: {
      label: string;
      displayLabel: string;
      steps: number;
      targetSteps: number;
      achieved: boolean;
    }[] = [];

    if (viewType === 'W' || viewType === 'M') {
      const daysToShow = viewType === 'W' ? 7 : 30;
      const historyMap = new Map(history.map((r) => [r.date, r.steps]));

      for (let i = daysToShow - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const s = historyMap.get(dateStr) ?? 0;
        
        items.push({
          label: dateStr,
          displayLabel: viewType === 'W' 
            ? d.toLocaleDateString('ja-JP', { weekday: 'short' })
            : d.getDate().toString(),
          steps: s,
          targetSteps: profile.target_steps,
          achieved: s >= profile.target_steps,
        });
      }
    } else {
      const monthsToShow = viewType === '6M' ? 6 : 12;
      const historyMap = new Map<string, number>();
      history.forEach((r) => {
        const monthKey = r.date.substring(0, 7);
        historyMap.set(monthKey, (historyMap.get(monthKey) ?? 0) + r.steps);
      });

      for (let i = monthsToShow - 1; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const s = historyMap.get(monthKey) ?? 0;
        
        // Target for the month is target_steps * days in that month
        const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const monthlyTarget = profile.target_steps * daysInMonth;

        items.push({
          label: monthKey,
          displayLabel: `${d.getMonth() + 1}月`,
          steps: s,
          targetSteps: monthlyTarget,
          achieved: s >= monthlyTarget,
        });
      }
    }


    const maxSteps = Math.max(...items.map((item) => Math.max(item.steps, item.targetSteps)), 1);

    return items.map((item) => ({
      ...item,
      percent: Math.min((item.steps / maxSteps) * 100, 100),
      targetPercent: Math.min((item.targetSteps / maxSteps) * 100, 100),
    }));
  }, [history, viewType, profile.target_steps, date]);

  const overallAverage = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, row) => acc + row.steps, 0);
    return Math.round(sum / chartData.length);
  }, [chartData]);

  const selectedItem = useMemo(() => 
    chartData.find(item => item.label === selectedDataPoint),
    [chartData, selectedDataPoint]
  );

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
    <section className="page-stack" onClick={() => setSelectedDataPoint(null)}>
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

      <form className="panel form-stack" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
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

      <section className="health-chart-card" onClick={(e) => e.stopPropagation()}>
        <div className="health-period-selector">
          {(['W', 'M', '6M', 'Y'] as ViewType[]).map((type) => (
            <button
              key={type}
              className={`health-period-button ${viewType === type ? 'active' : ''}`}
              type="button"
              onClick={() => setViewType(type)}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="health-chart-header">
          <span className="label">
            {selectedItem 
              ? selectedItem.label 
              : viewType === 'W' ? '週間平均' : viewType === 'M' ? '月間平均' : viewType === '6M' ? '6ヶ月平均' : '年間平均'
            }
          </span>
          <div className="main-value">
            {(selectedItem ? selectedItem.steps : overallAverage).toLocaleString()}
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
              <div 
                className="health-chart-avg-line" 
                style={{ bottom: `${(overallAverage / Math.max(...chartData.map(d => Math.max(d.steps, d.targetSteps)))) * 100}%` } as CSSProperties}
              >
                <span>平均</span>
              </div>
            </div>
            <div className={`health-chart-bars ${viewType === 'M' ? 'compact' : ''}`}>
              {chartData.map((row) => (
                <div 
                  className={`health-chart-bar-wrapper ${selectedDataPoint === row.label ? 'selected' : ''} ${selectedDataPoint && selectedDataPoint !== row.label ? 'dimmed' : ''}`} 
                  key={row.label}
                  onClick={() => setSelectedDataPoint(selectedDataPoint === row.label ? null : row.label)}
                >
                  <div
                    className={`health-chart-bar ${row.achieved ? '' : 'not-achieved'}`}
                    style={{ '--bar-height': `${row.percent}%` } as CSSProperties}
                    title={`${row.label}: ${row.steps.toLocaleString()}歩`}
                  />
                  <span className="health-chart-axis-label">
                    {viewType === 'M' 
                      ? (parseInt(row.label.split('-')[2]) % 5 === 0 || row.label.split('-')[2] === '01' ? row.displayLabel : '')
                      : row.displayLabel
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </section>
  );
}

