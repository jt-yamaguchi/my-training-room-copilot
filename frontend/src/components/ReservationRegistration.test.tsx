import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createReservation } from '../api/reservations';
import { getRooms } from '../api/rooms';
import type { Room } from '../api/types';
import ReservationRegistration from './ReservationRegistration';

vi.mock('../api/reservations', () => ({
  createReservation: vi.fn(),
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
});
