import { FormEvent, useEffect, useState } from 'react';
import { DoorOpen, Plus, Users } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { Message } from '../components/Message';
import { createGroup, getMyGroups, joinGroupByInviteCode } from '../lib/api';
import type { Group } from '../types';

type GroupsPageProps = {
  userId: string;
  navigate: (path: string) => void;
};

export function GroupsPage({ userId, navigate }: GroupsPageProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadGroups() {
    setLoading(true);
    setError(null);

    try {
      const rows = await getMyGroups(userId);
      setGroups(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'グループ一覧の読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadGroups();
  }, [userId]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const trimmedName = groupName.trim();
      if (!trimmedName) {
        throw new Error('グループ名は1文字以上で入力してください。');
      }

      const group = await createGroup(userId, trimmedName);
      setGroupName('');
      setNotice('グループを作成しました。');
      await loadGroups();
      navigate(`/groups/${group.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'グループ作成に失敗しました。');
    } finally {
      setSaving(false);
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoining(true);
    setError(null);
    setNotice(null);

    try {
      if (!inviteCode.trim()) {
        throw new Error('招待コードを入力してください。');
      }

      const groupId = await joinGroupByInviteCode(inviteCode);
      setInviteCode('');
      setNotice('グループに参加しました。');
      await loadGroups();
      navigate(`/groups/${groupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'グループ参加に失敗しました。');
    } finally {
      setJoining(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-title">
        <p>Groups</p>
        <h1>グループ一覧</h1>
      </div>

      <Message message={error} tone="error" />
      <Message message={notice} tone="success" />

      <section className="panel">
        <div className="section-heading">
          <Users size={22} aria-hidden="true" />
          <h2>参加中グループ</h2>
        </div>
        {loading ? <p className="loading-text">グループを読み込み中...</p> : null}
        {!loading && groups.length === 0 ? (
          <EmptyState title="まだグループがありません" description="グループを作成するか、友達から届いた招待コードで参加できます。" />
        ) : null}
        <div className="group-list">
          {groups.map((group) => (
            <button className="group-row" key={group.id} type="button" onClick={() => navigate(`/groups/${group.id}`)}>
              <span>
                <strong>{group.name}</strong>
                <small>招待コード: {group.invite_code}</small>
              </span>
              <span className="row-arrow">詳細</span>
            </button>
          ))}
        </div>
      </section>

      <div className="split-layout">
        <section className="panel form-stack">
          <h2>グループ作成</h2>
          <form className="form-stack compact" onSubmit={handleCreate}>
            <label>
              グループ名
              <input
                placeholder="例: 3限あと散歩部"
                required
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
              />
            </label>
            <button className="primary-button" disabled={saving} type="submit">
              <Plus size={18} aria-hidden="true" />
              <span>{saving ? '作成中...' : '作成する'}</span>
            </button>
          </form>
        </section>

        <section className="panel form-stack">
          <h2>招待コードで参加</h2>
          <form className="form-stack compact" onSubmit={handleJoin}>
            <label>
              招待コード
              <input
                placeholder="例: ABCD2345"
                required
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              />
            </label>
            <button className="secondary-button" disabled={joining} type="submit">
              <DoorOpen size={18} aria-hidden="true" />
              <span>{joining ? '参加中...' : '参加する'}</span>
            </button>
          </form>
        </section>
      </div>
    </section>
  );
}
