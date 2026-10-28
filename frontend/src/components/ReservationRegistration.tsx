import { useEffect, useState, type FormEvent } from 'react';
import { createReservation } from '../api/reservations';
import { getRooms } from '../api/rooms';
import type { ReservationRequest, Room } from '../api/types';

type ReservationForm = {
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  organizerName: string;
};

function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const emptyForm: ReservationForm = {
  roomId: '',
  date: getTomorrowDate(),
  startTime: '',
  endTime: '',
  title: '',
  organizerName: '',
};

export default function ReservationRegistration() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [form, setForm] = useState<ReservationForm>(emptyForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRooms() {
      try {
        const availableRooms = await getRooms();
        setRooms(availableRooms);
        if (availableRooms.length > 0) {
          setForm((current) => ({ ...current, roomId: String(availableRooms[0].id) }));
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '会議室一覧を取得できませんでした。');
      } finally {
        setLoading(false);
      }
    }

    void loadRooms();
  }, []);

  async function saveReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    const request: ReservationRequest = {
      roomId: Number(form.roomId),
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      title: form.title,
      organizerName: form.organizerName,
    };
    try {
      const reservation = await createReservation(request);
      setMessage(`${reservation.roomName}の予約を登録しました。`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '予約を登録できませんでした。');
    }
  }

  return (
    <main className="container reservation-page">
      <header className="header">
        <h1>会議室予約システム</h1>
        <a href="/rooms">会議室を管理する</a>
      </header>

      {error && <p className="error" role="alert">{error}</p>}
      {message && <p className="success" role="status">{message}</p>}

      <section aria-labelledby="reservation-form-title">
        <h2 id="reservation-form-title">予約を登録</h2>
        {loading ? (
          <p>会議室を読み込み中...</p>
        ) : rooms.length === 0 ? (
          <p className="empty">予約する会議室がありません。先に会議室を登録してください。</p>
        ) : (
          <form className="reservation-form" onSubmit={(event) => void saveReservation(event)}>
            <label>
              会議室
              <select
                required
                value={form.roomId}
                onChange={(event) => setForm({ ...form, roomId: event.target.value })}
              >
                {rooms.map((room) => (
                  <option value={room.id} key={room.id}>{room.name}</option>
                ))}
              </select>
            </label>
            <label>
              日付
              <input
                required
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
              />
            </label>
            <label>
              開始時刻
              <input
                required
                type="time"
                step={60}
                value={form.startTime}
                onChange={(event) => setForm({ ...form, startTime: event.target.value })}
              />
            </label>
            <label>
              終了時刻
              <input
                required
                type="time"
                step={60}
                value={form.endTime}
                onChange={(event) => setForm({ ...form, endTime: event.target.value })}
              />
            </label>
            <label>
              件名
              <input
                required
                maxLength={100}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </label>
            <label>
              予約者名
              <input
                required
                maxLength={50}
                value={form.organizerName}
                onChange={(event) => setForm({ ...form, organizerName: event.target.value })}
              />
            </label>
            <button type="submit">予約を登録</button>
          </form>
        )}
      </section>
    </main>
  );
}
