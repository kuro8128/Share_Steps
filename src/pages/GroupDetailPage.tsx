import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ArrowLeft, Copy, Crown, Medal, Trophy, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { Message } from '../components/Message';
import { getGroup, getGroupMembers, getGroupRanking } from '../lib/api';
import type { Group, GroupMember, RankingRow } from '../types';

type GroupDetailPageProps = {
  currentUserId: string;
  date: string;
  groupId: string;
  navigate: (path: string) => void;
};

function getPreviousDateString(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  const previousDate = new Date(year, month - 1, day);
  previousDate.setDate(previousDate.getDate() - 1);

  return [
    previousDate.getFullYear(),
    String(previousDate.getMonth() + 1).padStart(2, '0'),
    String(previousDate.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatStepDelta(delta: number) {
  if (delta > 0) {
    return `+${delta.toLocaleString()}`;
  }

  if (delta < 0) {
    return `-${Math.abs(delta).toLocaleString()}`;
  }

  return '±0';
}

export function GroupDetailPage({ currentUserId, date, groupId, navigate }: GroupDetailPageProps) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [rankingData, setRankingData] = useState<RankingRow[]>([]);
  const [previousRankingData, setPreviousRankingData] = useState<RankingRow[]>([]);
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
        const previousDate = getPreviousDateString(date);
        const [groupRow, memberRows, rankingRows, previousRankingRows] = await Promise.all([
          getGroup(groupId),
          getGroupMembers(groupId),
          getGroupRanking(groupId, date),
          getGroupRanking(groupId, previousDate),
        ]);

        if (!groupRow) {
          throw new Error('グループが見つからないか、参加していません。');
        }

        if (!ignore) {
          setGroup(groupRow);
          setMembers(memberRows);
          setRankingData(rankingRows);
          setPreviousRankingData(previousRankingRows);
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


  const previousStepsByUserId = useMemo(
    () => new Map(previousRankingData.map((row) => [row.userId, row.steps])),
    [previousRankingData],
  );

  const ranking = useMemo(() => {
    if (rankingData.length === 0) {
      return [];
    }

    const maxSteps = Math.max(...rankingData.map((row) => Math.max(row.steps, row.targetSteps)), 1);

    return rankingData.map((row) => ({
      ...row,
      deltaSteps: row.steps - (previousStepsByUserId.get(row.userId) ?? 0),
      isCurrentUser: row.userId === currentUserId,
      percent: Math.min((row.steps / maxSteps) * 100, 100),
      targetPercent: Math.min((row.targetSteps / maxSteps) * 100, 100),
    }));
  }, [currentUserId, previousStepsByUserId, rankingData]);

  const groupTotalSteps = useMemo(() => 
    rankingData.reduce((acc, row) => acc + row.steps, 0),
    [rankingData]
  );
  const previousGroupTotalSteps = useMemo(
    () => previousRankingData.reduce((acc, row) => acc + row.steps, 0),
    [previousRankingData],
  );
  const groupTotalDelta = groupTotalSteps - previousGroupTotalSteps;
  const achievedMemberCount = rankingData.filter((row) => row.achieved).length;

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
          <section className="group-total-band" onClick={(event) => event.stopPropagation()}>
            <div>
              <span className="group-total-label">グループ合計歩数</span>
              <strong>{groupTotalSteps.toLocaleString()}<small>歩</small></strong>
            </div>
            <dl className="group-total-stats">
              <div>
                <dt>前日比</dt>
                <dd className={groupTotalDelta > 0 ? 'is-positive' : groupTotalDelta < 0 ? 'is-negative' : ''}>
                  {formatStepDelta(groupTotalDelta)}
                </dd>
              </div>
              <div>
                <dt>達成者</dt>
                <dd>{achievedMemberCount}/{rankingData.length}</dd>
              </div>
              <div>
                <dt>メンバー</dt>
                <dd>{members.length}</dd>
              </div>
            </dl>
          </section>

          <div className="split-layout">
            <section className="panel" onClick={(e) => e.stopPropagation()}>
              <div className="section-heading">
                <Users size={22} aria-hidden="true" />
                <h2>メンバー</h2>
              </div>
              <div className="member-list">
                {members.map((member) => (
                  <div
                    className={`member-row ${selectedMemberId === member.user_id ? 'selected' : ''} ${member.user_id === currentUserId ? 'current-user' : ''}`}
                    key={member.id}
                    onClick={() => setSelectedMemberId(member.user_id)}
                  >
                    <span>
                      {member.profile?.username ?? '未設定ユーザー'}
                      {member.user_id === currentUserId ? <small className="you-label">あなた</small> : null}
                    </span>
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
                    <span className="label">{selectedMember ? '選択中のメンバー' : 'グループ合計'}</span>
                    <div className="main-value-row">
                      <div className="main-value">
                        {(selectedMember ? selectedMember.steps : groupTotalSteps).toLocaleString()}
                        <span>歩</span>
                      </div>
                      <span
                        className={`ranking-delta-chip ${
                          (selectedMember?.deltaSteps ?? groupTotalDelta) > 0
                            ? 'is-positive'
                            : (selectedMember?.deltaSteps ?? groupTotalDelta) < 0
                              ? 'is-negative'
                              : ''
                        }`}
                      >
                        {(selectedMember?.deltaSteps ?? groupTotalDelta) >= 0 ? (
                          <TrendingUp size={15} aria-hidden="true" />
                        ) : (
                          <TrendingDown size={15} aria-hidden="true" />
                        )}
                        前日比 {formatStepDelta(selectedMember?.deltaSteps ?? groupTotalDelta)}
                      </span>
                    </div>
                    <strong className="selected-ranking-name">
                      {selectedMember ? selectedMember.username : `${ranking.length}人でチャレンジ中`}
                    </strong>
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
                          className={`health-chart-bar-wrapper ${selectedMemberId === row.userId ? 'selected' : ''} ${selectedMemberId && selectedMemberId !== row.userId ? 'dimmed' : ''} ${row.isCurrentUser ? 'current-user' : ''}`}
                          key={row.userId}
                          onClick={() => setSelectedMemberId(selectedMemberId === row.userId ? null : row.userId)}
                        >
                          <span className={`health-chart-rank-badge ${row.rank === 1 ? 'winner' : ''}`}>
                            {row.rank === 1 ? <Crown size={15} aria-hidden="true" /> : row.rank}
                          </span>
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

                  <div className="ranking-game-list">
                    {ranking.map((row) => (
                      <button
                        className={`ranking-game-row ${row.rank === 1 ? 'winner' : ''} ${row.isCurrentUser ? 'current-user' : ''} ${selectedMemberId === row.userId ? 'selected' : ''}`}
                        key={row.userId}
                        type="button"
                        onClick={() => setSelectedMemberId(selectedMemberId === row.userId ? null : row.userId)}
                      >
                        <span className="ranking-game-rank">
                          {row.rank === 1 ? <Crown size={19} aria-hidden="true" /> : row.rank}
                        </span>
                        <span className="ranking-game-user">
                          <strong>{row.username}</strong>
                          <small>{row.isCurrentUser ? 'あなた' : `目標 ${row.targetSteps.toLocaleString()}歩`}</small>
                        </span>
                        {row.achieved ? (
                          <span className="achievement-badge">
                            <Medal size={14} aria-hidden="true" />
                            達成
                          </span>
                        ) : null}
                        <span
                          className={`ranking-delta-chip compact ${
                            row.deltaSteps > 0 ? 'is-positive' : row.deltaSteps < 0 ? 'is-negative' : ''
                          }`}
                        >
                          {row.deltaSteps >= 0 ? (
                            <TrendingUp size={14} aria-hidden="true" />
                          ) : (
                            <TrendingDown size={14} aria-hidden="true" />
                          )}
                          {formatStepDelta(row.deltaSteps)}
                        </span>
                        <strong className="ranking-game-steps">{row.steps.toLocaleString()}歩</strong>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

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
        </>
      ) : null}
    </section>
  );
}

