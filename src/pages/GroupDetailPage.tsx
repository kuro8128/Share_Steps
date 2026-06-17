import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ArrowLeft, Copy, Trophy, Users } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { Message } from '../components/Message';
import { getGroup, getGroupMembers, getGroupRanking } from '../lib/api';
import type { Group, GroupMember, RankingRow } from '../types';

type GroupDetailPageProps = {
  date: string;
  groupId: string;
  navigate: (path: string) => void;
};

export function GroupDetailPage({ date, groupId, navigate }: GroupDetailPageProps) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [rankingData, setRankingData] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedMemberId(null);
  }, [date, groupId]);

  useEffect(() => {
    let ignore = false;

    async function loadDetail() {
      setLoading(true);
      setError(null);

      try {
        const [groupRow, memberRows, rankingRows] = await Promise.all([
          getGroup(groupId),
          getGroupMembers(groupId),
          getGroupRanking(groupId, date),
        ]);

        if (!groupRow) {
          throw new Error('グループが見つからないか、参加していません。');
        }

        if (!ignore) {
          setGroup(groupRow);
          setMembers(memberRows);
          setRankingData(rankingRows);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'グループ詳細の読み込みに失敗しました。');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      ignore = true;
    };
  }, [date, groupId]);

  async function copyInviteCode() {
    if (!group) {
      return;
    }

    try {
      await navigator.clipboard.writeText(group.invite_code);
      setNotice('招待コードをコピーしました。');
    } catch {
      setNotice('招待コードを選択してコピーしてください。');
    }
  }


  const ranking = useMemo(() => {
    if (rankingData.length === 0) {
      return [];
    }

    const maxSteps = Math.max(...rankingData.map((row) => Math.max(row.steps, row.targetSteps)), 1);

    return rankingData.map((row) => ({
      ...row,
      percent: Math.min((row.steps / maxSteps) * 100, 100),
      targetPercent: Math.min((row.targetSteps / maxSteps) * 100, 100),
    }));
  }, [rankingData]);

  const groupTotalSteps = useMemo(() => 
    rankingData.reduce((acc, row) => acc + row.steps, 0),
    [rankingData]
  );

  const selectedMember = useMemo(() => 
    ranking.find(row => row.userId === selectedMemberId),
    [ranking, selectedMemberId]
  );

  return (
    <section className="page-stack" onClick={() => setSelectedMemberId(null)}>
      <button className="back-button" type="button" onClick={() => navigate('/groups')}>
        <ArrowLeft size={18} aria-hidden="true" />
        <span>グループ一覧へ</span>
      </button>

      <div className="page-title">
        <p>{date}</p>
        <h1>{group?.name ?? 'グループ詳細'}</h1>
      </div>

      <Message message={error} tone="error" />
      <Message message={notice} tone="success" />
      {loading ? <p className="loading-text">グループ詳細を読み込み中...</p> : null}

      {group ? (
        <>
          <section className="invite-band">
            <span>
              <small>招待コード</small>
              <strong>{group.invite_code}</strong>
            </span>
            <button className="secondary-button" type="button" onClick={copyInviteCode}>
              <Copy size={18} aria-hidden="true" />
              <span>コピー</span>
            </button>
          </section>

          <div className="split-layout">
            <section className="panel" onClick={(e) => e.stopPropagation()}>
              <div className="section-heading">
                <Users size={22} aria-hidden="true" />
                <h2>メンバー</h2>
              </div>
              <div className="member-list">
                {members.map((member) => (
                  <div className={`member-row ${selectedMemberId === member.user_id ? 'selected' : ''}`} key={member.id} onClick={() => setSelectedMemberId(member.user_id)}>
                    <span>{member.profile?.username ?? '未設定ユーザー'}</span>
                    <small>目標 {Number(member.profile?.target_steps ?? 8000).toLocaleString()}歩</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel" onClick={(e) => e.stopPropagation()}>
              <div className="section-heading">
                <Trophy size={22} aria-hidden="true" />
                <h2>ランキング</h2>
              </div>
              {ranking.length === 0 ? (
                <EmptyState title="ランキングはまだありません" description="メンバーの歩数が読み込まれるとここに表示されます。" />
              ) : (
                <div className="health-chart-card group-ranking-card">
                  <div className="health-chart-header">
                    <span className="label">
                      {selectedMember ? selectedMember.username : 'グループ合計'}
                    </span>
                    <div className="main-value">
                      {(selectedMember ? selectedMember.steps : groupTotalSteps).toLocaleString()}
                      <span>歩</span>
                    </div>
                  </div>

                  <div className="health-chart-container">
                    <div className="health-chart-grid">
                      <div className="health-chart-grid-line" />
                      <div className="health-chart-grid-line" />
                      <div className="health-chart-grid-line" />
                      <div className="health-chart-grid-line" />
                    </div>
                    <div className="health-chart-bars">
                      {ranking.map((row) => (
                        <div 
                          className={`health-chart-bar-wrapper ${selectedMemberId === row.userId ? 'selected' : ''} ${selectedMemberId && selectedMemberId !== row.userId ? 'dimmed' : ''}`} 
                          key={row.userId}
                          onClick={() => setSelectedMemberId(selectedMemberId === row.userId ? null : row.userId)}
                        >
                          <div
                            className={`health-chart-bar ${row.achieved ? '' : 'not-achieved'}`}
                            style={{ '--bar-height': `${row.percent}%` } as CSSProperties}
                            title={`${row.username}: ${row.steps.toLocaleString()}歩`}
                          />
                          <span className="health-chart-axis-label">
                            {row.rank}位
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}

