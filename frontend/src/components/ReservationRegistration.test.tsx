import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createReservation,
  deleteReservation,
  getReservationsByDate,
  getReservationsByRoom,
} from '../api/reservations';
import { getRooms } from '../api/rooms';
import type { Room } from '../api/types';
import ReservationRegistration from './ReservationRegistration';

vi.mock('../api/reservations', () => ({
  createReservation: vi.fn(),
  deleteReservation: vi.fn(),
  getReservationsByDate: vi.fn(),
  getReservationsByRoom: vi.fn(),
}));

vi.mock('../api/rooms', () => ({
  getRooms: vi.fn(),
}));

describe('ReservationRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRooms).mockResolvedValue([
      { id: 1, name: 'A会議室', capacity: 6, notes: null } satisfies Room,
    ]);
    vi.mocked(getReservationsByDate).mockResolvedValue([]);
    vi.mocked(getReservationsByRoom).mockResolvedValue([]);
  });

  it('入力内容で予約を登録して成功メッセージを表示する', async () => {
    vi.mocked(createReservation).mockResolvedValue({
      id: 1,
      roomId: 1,
      roomName: 'A会議室',
      date: '2099-01-02',
      startTime: '10:00',
      endTime: '11:00',
      title: '定例会議',
      organizerName: '山田',
    });
    const user = userEvent.setup();
    render(<ReservationRegistration />);

    await user.selectOptions(await screen.findByLabelText('会議室'), '1');
    await user.clear(screen.getByLabelText('日付'));
    await user.type(screen.getByLabelText('日付'), '2099-01-02');
    await user.type(screen.getByLabelText('開始時刻'), '10:00');
    await user.type(screen.getByLabelText('終了時刻'), '11:00');
    await user.type(screen.getByLabelText('件名'), '定例会議');
    await user.type(screen.getByLabelText('予約者名'), '山田');
    await user.click(screen.getByRole('button', { name: '予約を登録' }));

    expect(createReservation).toHaveBeenCalledWith({
      roomId: 1,
      date: '2099-01-02',
      startTime: '10:00',
      endTime: '11:00',
      title: '定例会議',
      organizerName: '山田',
    });
    expect(await screen.findByRole('status')).toHaveTextContent('A会議室の予約を登録しました。');
  });

  it('予約登録APIのエラーを表示する', async () => {
    vi.mocked(createReservation).mockRejectedValue(new Error('指定した時間帯には既に予約があります。'));
    const user = userEvent.setup();
    render(<ReservationRegistration />);

    await screen.findByLabelText('会議室');
    await user.type(screen.getByLabelText('開始時刻'), '10:00');
    await user.type(screen.getByLabelText('終了時刻'), '11:00');
    await user.type(screen.getByLabelText('件名'), '定例会議');
    await user.type(screen.getByLabelText('予約者名'), '山田');
    await user.click(screen.getByRole('button', { name: '予約を登録' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('指定した時間帯には既に予約があります。');
  });

  it('日付別の全会議室予約と会議室別予約を照会する', async () => {
    vi.mocked(getRooms).mockResolvedValue([
      { id: 1, name: 'A会議室', capacity: 6, notes: null },
      { id: 2, name: 'B会議室', capacity: 8, notes: null },
    ]);
    vi.mocked(getReservationsByDate).mockResolvedValue([
      {
        roomId: 1,
        roomName: 'A会議室',
        reservations: [{
          id: 11,
          roomId: 1,
          roomName: 'A会議室',
          date: '2099-01-02',
          startTime: '10:00',
          endTime: '11:00',
          title: '設計レビュー',
          organizerName: '山田',
        }],
      },
      { roomId: 2, roomName: 'B会議室', reservations: [] },
    ]);
    vi.mocked(getReservationsByRoom).mockResolvedValue([{
      id: 11,
      roomId: 1,
      roomName: 'A会議室',
      date: '2099-01-02',
      startTime: '10:00',
      endTime: '11:00',
      title: '設計レビュー',
      organizerName: '山田',
    }]);
    const user = userEvent.setup();
    render(<ReservationRegistration />);

    expect(await screen.findByText('設計レビュー')).toBeInTheDocument();
    expect(screen.getByText('予約はありません。')).toBeInTheDocument();
    expect(getReservationsByDate).toHaveBeenCalled();
    expect(getReservationsByRoom).toHaveBeenCalledWith(1);

    await user.clear(screen.getByLabelText('照会する日付'));
    await user.type(screen.getByLabelText('照会する日付'), '2099-01-02');
    expect(getReservationsByDate).toHaveBeenLastCalledWith('2099-01-02');

    await user.selectOptions(screen.getByLabelText('照会する会議室'), '2');
    expect(getReservationsByRoom).toHaveBeenLastCalledWith(2);
  });

  it('予約を取り消すと一覧を更新して成功メッセージを表示する', async () => {
    const reservation = {
      id: 11,
      roomId: 1,
      roomName: 'A会議室',
      date: '2099-01-02',
      startTime: '10:00',
      endTime: '11:00',
      title: '設計レビュー',
      organizerName: '山田',
    };
    vi.mocked(getReservationsByDate)
      .mockResolvedValueOnce([{
        roomId: 1,
        roomName: 'A会議室',
        reservations: [reservation],
      }])
      .mockResolvedValue([{
        roomId: 1,
        roomName: 'A会議室',
        reservations: [],
      }]);
    vi.mocked(getReservationsByRoom)
      .mockResolvedValueOnce([reservation])
      .mockResolvedValue([]);
    vi.mocked(deleteReservation).mockResolvedValue();
    const user = userEvent.setup();
    render(<ReservationRegistration />);

    const cancelButtons = await screen.findAllByRole('button', {
      name: '設計レビューの予約を取り消す',
    });
    await user.click(cancelButtons[0]);

    expect(deleteReservation).toHaveBeenCalledWith(11);
    expect(await screen.findByRole('status')).toHaveTextContent(
      '設計レビューの予約を取り消しました。',
    );
    expect(await screen.findAllByText('予約はありません。')).toHaveLength(2);
    expect(getReservationsByDate).toHaveBeenCalledTimes(2);
    expect(getReservationsByRoom).toHaveBeenCalledTimes(2);
  });

  it('予約取り消しAPIのエラーを画面に表示する', async () => {
    const reservation = {
      id: 12,
      roomId: 1,
      roomName: 'A会議室',
      date: '2099-01-02',
      startTime: '10:00',
      endTime: '11:00',
      title: '設計レビュー',
      organizerName: '山田',
    };
    vi.mocked(getReservationsByDate).mockResolvedValue([{
      roomId: 1,
      roomName: 'A会議室',
      reservations: [reservation],
    }]);
    vi.mocked(getReservationsByRoom).mockResolvedValue([reservation]);
    vi.mocked(deleteReservation).mockRejectedValue(new Error('予約が見つかりません。'));
    const user = userEvent.setup();
    render(<ReservationRegistration />);

    await user.click((await screen.findAllByRole('button', {
      name: '設計レビューの予約を取り消す',
    }))[0]);

    expect(await screen.findByRole('alert')).toHaveTextContent('予約が見つかりません。');
    expect(screen.getAllByText('設計レビュー')).toHaveLength(2);
  });
});
