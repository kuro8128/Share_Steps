import type { ReactNode } from 'react';
import { CalendarDays, Footprints, House, RotateCcw, Users, UserCircle } from 'lucide-react';
import type { Profile } from '../types';

type LayoutProps = {
  actualToday: string;
  children: ReactNode;
  demoDate: string;
  profile: Profile | null;
  route: string;
  navigate: (path: string) => void;
  onDemoDateChange: (date: string) => void;
  onRestoreToday: () => void;
};

const navItems = [
  { path: '/', label: 'ホーム', icon: House },
  { path: '/groups', label: 'グループ', icon: Users },
  { path: '/mypage', label: 'マイページ', icon: UserCircle },
];

export function Layout({
  actualToday,
  children,
  demoDate,
  profile,
  route,
  navigate,
  onDemoDateChange,
  onRestoreToday,
}: LayoutProps) {
  const isDemoDate = demoDate !== actualToday;

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand-button" type="button" onClick={() => navigate('/')}>
          <span className="brand-mark">
            <Footprints size={22} aria-hidden="true" />
          </span>
          <span>Share Steps</span>
        </button>
        <div className="topbar-actions">
          <div className={isDemoDate ? 'demo-date-control active' : 'demo-date-control'}>
            <label htmlFor="demo-date">
              <CalendarDays size={18} aria-hidden="true" />
              <span>{isDemoDate ? 'デモ日付' : '日付'}</span>
            </label>
            <input
              id="demo-date"
              type="date"
              value={demoDate}
              onChange={(event) => onDemoDateChange(event.target.value)}
            />
            {isDemoDate ? (
              <button className="reset-date-button" type="button" onClick={onRestoreToday}>
                <RotateCcw size={16} aria-hidden="true" />
                <span>今日に戻す</span>
              </button>
            ) : null}
          </div>
          <div className="signed-in-user">{profile?.username ?? '読み込み中'}</div>
        </div>
      </header>

      <nav className="main-nav" aria-label="メインナビゲーション">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.path === '/' ? route === '/' : route.startsWith(item.path);

          return (
            <button
              className={active ? 'nav-button active' : 'nav-button'}
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <main className="content">{children}</main>
    </div>
  );
}
