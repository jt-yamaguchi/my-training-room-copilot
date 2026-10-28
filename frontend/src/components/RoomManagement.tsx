import { useEffect, useState, type FormEvent } from 'react';
import { createRoom, deleteRoom, getRooms, updateRoom } from '../api/rooms';
import type { Room, RoomRequest } from '../api/types';

type RoomForm = {
  name: string;
  capacity: string;
  notes: string;
};

const emptyForm: RoomForm = { name: '', capacity: '', notes: '' };

export default function RoomManagement() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [form, setForm] = useState<RoomForm>(emptyForm);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadRooms() {
    setError('');
    try {
      setRooms(await getRooms());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '会議室一覧を取得できませんでした。');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRooms();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingRoomId(null);
  }

  function editRoom(room: Room) {
    setEditingRoomId(room.id);
    setForm({
      name: room.name,
      capacity: String(room.capacity),
      notes: room.notes ?? '',
    });
    setError('');
  }

  async function saveRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const request: RoomRequest = {
      name: form.name,
      capacity: Number(form.capacity),
      notes: form.notes || null,
    };
    try {
      if (editingRoomId === null) {
        await createRoom(request);
      } else {
        await updateRoom(editingRoomId, request);
      }
      resetForm();
      await loadRooms();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '会議室を保存できませんでした。');
    }
  }

  async function removeRoom(room: Room) {
    setError('');
    try {
      await deleteRoom(room.id);
      if (editingRoomId === room.id) {
        resetForm();
      }
      await loadRooms();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '会議室を削除できませんでした。');
    }
  }

  return (
    <main className="container room-page">
      <header className="header">
        <h1>会議室管理</h1>
        <a href="/">予約状況へ戻る</a>
      </header>

      {error && <p className="error" role="alert">{error}</p>}

      <section aria-labelledby="room-form-title">
        <h2 id="room-form-title">{editingRoomId === null ? '会議室を登録' : '会議室を編集'}</h2>
        <form className="room-form" onSubmit={(event) => void saveRoom(event)}>
          <label>
            会議室名
            <input
              required
              maxLength={50}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>
          <label>
            定員
            <input
              required
              type="number"
              min={1}
              step={1}
              value={form.capacity}
              onChange={(event) => setForm({ ...form, capacity: event.target.value })}
            />
          </label>
          <label>
            備考
            <textarea
              maxLength={200}
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </label>
          <div className="room-form-actions">
            <button type="submit">{editingRoomId === null ? '登録' : '更新'}</button>
            {editingRoomId !== null && (
              <button type="button" className="room-cancel" onClick={resetForm}>
                編集をキャンセル
              </button>
            )}
          </div>
        </form>
      </section>

      <section aria-labelledby="room-list-title">
        <h2 id="room-list-title">会議室一覧</h2>
        {loading ? (
          <p>読み込み中...</p>
        ) : rooms.length === 0 ? (
          <p className="empty">登録された会議室はありません。</p>
        ) : (
          <ul className="room-list">
            {rooms.map((room) => (
              <li className="room-item" key={room.id}>
                <div>
                  <h3>{room.name}</h3>
                  <p>定員: {room.capacity}名</p>
                  {room.notes && <p>{room.notes}</p>}
                </div>
                <div className="room-actions">
                  <button type="button" onClick={() => editRoom(room)}>編集</button>
                  <button
                    type="button"
                    className="room-delete"
                    onClick={() => void removeRoom(room)}
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
