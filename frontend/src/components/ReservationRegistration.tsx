import { useEffect, useState, type FormEvent } from 'react';
import {
  createReservation,
  deleteReservation,
  getReservationsByDate,
  getReservationsByRoom,
} from '../api/reservations';
import { getRooms } from '../api/rooms';
import type { ReservationRequest, ReservationSchedule, Reservation, Room } from '../api/types';

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

function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
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
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [selectedScheduleRoomId, setSelectedScheduleRoomId] = useState('');
  const [daySchedules, setDaySchedules] = useState<ReservationSchedule[]>([]);
  const [roomReservations, setRoomReservations] = useState<Reservation[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [roomScheduleLoading, setRoomScheduleLoading] = useState(false);
  const [deletingReservationId, setDeletingReservationId] = useState<number | null>(null);

  useEffect(() => {
    async function loadRooms() {
      try {
        const availableRooms = await getRooms();
        setRooms(availableRooms);
        if (availableRooms.length > 0) {
          setForm((current) => ({ ...current, roomId: String(availableRooms[0].id) }));
          setSelectedScheduleRoomId(String(availableRooms[0].id));
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '会議室一覧を取得できませんでした。');
      } finally {
        setLoading(false);
      }
    }

    void loadRooms();
  }, []);

  useEffect(() => {
    let active = true;
    setScheduleLoading(true);
    async function loadDayReservations() {
      try {
        const schedules = await getReservationsByDate(selectedDate);
        if (active) {
          setDaySchedules(schedules);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : '予約状況を取得できませんでした。');
        }
      } finally {
        if (active) {
          setScheduleLoading(false);
        }
      }
    }

    void loadDayReservations();
    return () => {
      active = false;
    };
  }, [selectedDate, refreshToken]);

  useEffect(() => {
    let active = true;
    if (!selectedScheduleRoomId) {
      setRoomReservations([]);
      setRoomScheduleLoading(false);
      return () => {
        active = false;
      };
    }

    setRoomScheduleLoading(true);
    async function loadRoomReservations() {
      try {
        const reservations = await getReservationsByRoom(Number(selectedScheduleRoomId));
        if (active) {
          setRoomReservations(reservations);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : '会議室別予約一覧を取得できませんでした。');
        }
      } finally {
        if (active) {
          setRoomScheduleLoading(false);
        }
      }
    }

    void loadRoomReservations();
    return () => {
      active = false;
    };
  }, [selectedScheduleRoomId, refreshToken]);

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
      setRefreshToken((current) => current + 1);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '予約を登録できませんでした。');
    }
  }

  async function removeReservation(reservation: Reservation) {
    setError('');
    setMessage('');
    setDeletingReservationId(reservation.id);
    try {
      await deleteReservation(reservation.id);
      setMessage(`${reservation.title}の予約を取り消しました。`);
      setRefreshToken((current) => current + 1);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '予約を取り消せませんでした。');
    } finally {
      setDeletingReservationId(null);
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

      <section aria-labelledby="daily-schedule-title">
        <h2 id="daily-schedule-title">日付別の予約状況</h2>
        <label className="schedule-filter">
          照会する日付
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </label>
        {scheduleLoading ? (
          <p>予約状況を読み込み中...</p>
        ) : daySchedules.length === 0 ? (
          <p className="empty">会議室がありません。</p>
        ) : (
          <ul className="schedule-list">
            {daySchedules.map((schedule) => (
              <li className="schedule-room" key={schedule.roomId}>
                <h3>{schedule.roomName}</h3>
                {schedule.reservations.length === 0 ? (
                  <p className="empty">予約はありません。</p>
                ) : (
                  <ul className="schedule-reservations">
                    {schedule.reservations.map((reservation) => (
                      <li key={reservation.id}>
                        <time>{reservation.startTime}〜{reservation.endTime}</time>
                        <span>{reservation.title}</span>
                        <span>予約者: {reservation.organizerName}</span>
                        <button
                          className="reservation-cancel"
                          type="button"
                          aria-label={`${reservation.title}の予約を取り消す`}
                          disabled={deletingReservationId === reservation.id}
                          onClick={() => void removeReservation(reservation)}
                        >
                          取り消し
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="room-schedule-title">
        <h2 id="room-schedule-title">会議室別の予約一覧</h2>
        <label className="schedule-filter">
          照会する会議室
          <select
            value={selectedScheduleRoomId}
            onChange={(event) => setSelectedScheduleRoomId(event.target.value)}
            disabled={rooms.length === 0}
          >
            {rooms.map((room) => (
              <option value={room.id} key={room.id}>{room.name}</option>
            ))}
          </select>
        </label>
        {roomScheduleLoading ? (
          <p>予約一覧を読み込み中...</p>
        ) : roomReservations.length === 0 ? (
          <p className="empty">予約はありません。</p>
        ) : (
          <ul className="schedule-list">
            {roomReservations.map((reservation) => (
              <li className="schedule-reservation" key={reservation.id}>
                <time>{reservation.date} {reservation.startTime}〜{reservation.endTime}</time>
                <span>{reservation.title}</span>
                <span>予約者: {reservation.organizerName}</span>
                <button
                  className="reservation-cancel"
                  type="button"
                  aria-label={`${reservation.title}の予約を取り消す`}
                  disabled={deletingReservationId === reservation.id}
                  onClick={() => void removeReservation(reservation)}
                >
                  取り消し
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
