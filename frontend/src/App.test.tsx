import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { getRooms } from './api/rooms';

vi.mock('./api/rooms', () => ({
  createRoom: vi.fn(),
  deleteRoom: vi.fn(),
  getRooms: vi.fn(),
  updateRoom: vi.fn(),
}));

describe('App', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('会議室管理画面へのリンクと予約登録画面を表示する', async () => {
    vi.mocked(getRooms).mockResolvedValue([]);
    render(<App />);
    expect(screen.getByRole('heading', { name: '会議室予約システム' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '会議室を管理する' })).toHaveAttribute('href', '/rooms');
    expect(await screen.findByRole('heading', { name: '予約を登録' })).toBeInTheDocument();
  });

  it('会議室管理画面のパスで管理画面を表示する', async () => {
    vi.mocked(getRooms).mockResolvedValue([]);
    window.history.replaceState({}, '', '/rooms');

    render(<App />);

    expect(await screen.findByRole('heading', { name: '会議室管理' })).toBeInTheDocument();
  });
});
