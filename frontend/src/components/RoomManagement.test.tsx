import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoom, deleteRoom, getRooms, updateRoom } from '../api/rooms';
import type { Room, RoomRequest } from '../api/types';
import RoomManagement from './RoomManagement';

vi.mock('../api/rooms', () => ({
  createRoom: vi.fn(),
  deleteRoom: vi.fn(),
  getRooms: vi.fn(),
  updateRoom: vi.fn(),
}));

describe('RoomManagement', () => {
  const rooms: Room[] = [];

  beforeEach(() => {
    rooms.splice(0, rooms.length);
    vi.clearAllMocks();
    vi.mocked(getRooms).mockImplementation(async () => rooms.slice());
    vi.mocked(createRoom).mockImplementation(async (request: RoomRequest) => {
      const room = { ...request, id: 1 };
      rooms.push(room);
      return room;
    });
    vi.mocked(updateRoom).mockImplementation(async (id: number, request: RoomRequest) => {
      const room = { ...request, id };
      const index = rooms.findIndex((item) => item.id === id);
      rooms[index] = room;
      return room;
    });
    vi.mocked(deleteRoom).mockImplementation(async (id: number) => {
      const index = rooms.findIndex((room) => room.id === id);
      rooms.splice(index, 1);
    });
  });

  it('会議室を登録・編集・削除して一覧を更新する', async () => {
    const user = userEvent.setup();
    render(<RoomManagement />);

    await user.type(screen.getByLabelText('会議室名'), 'A会議室');
    await user.type(screen.getByLabelText('定員'), '6');
    await user.type(screen.getByLabelText('備考'), 'モニタあり');
    await user.click(screen.getByRole('button', { name: '登録' }));

    expect(await screen.findByRole('heading', { name: 'A会議室' })).toBeInTheDocument();
    expect(createRoom).toHaveBeenCalledWith({
      name: 'A会議室',
      capacity: 6,
      notes: 'モニタあり',
    });

    await user.click(screen.getByRole('button', { name: '編集' }));
    const nameInput = screen.getByLabelText('会議室名');
    await user.clear(nameInput);
    await user.type(nameInput, '大会議室');
    await user.click(screen.getByRole('button', { name: '更新' }));
    expect(await screen.findByRole('heading', { name: '大会議室' })).toBeInTheDocument();
    expect(updateRoom).toHaveBeenCalledWith(1, {
      name: '大会議室',
      capacity: 6,
      notes: 'モニタあり',
    });

    await user.click(screen.getByRole('button', { name: '削除' }));
    await waitFor(() => expect(screen.getByText('登録された会議室はありません。')).toBeInTheDocument());
    expect(deleteRoom).toHaveBeenCalledWith(1);
  });

  it('会議室一覧APIのエラーを表示する', async () => {
    vi.mocked(getRooms).mockRejectedValueOnce(new Error('一覧を取得できませんでした。'));
    render(<RoomManagement />);

    expect(await screen.findByRole('alert')).toHaveTextContent('一覧を取得できませんでした。');
  });

  it('会議室の保存エラーを表示する', async () => {
    vi.mocked(createRoom).mockRejectedValueOnce(new Error('会議室名は既に使用されています。'));
    render(<RoomManagement />);

    fireEvent.change(screen.getByLabelText('会議室名'), { target: { value: 'A会議室' } });
    fireEvent.change(screen.getByLabelText('定員'), { target: { value: '4' } });
    await userEvent.click(screen.getByRole('button', { name: '登録' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('会議室名は既に使用されています。');
  });
});
