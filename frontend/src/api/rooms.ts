import type { Room, RoomRequest } from './types';

async function getErrorMessage(response: Response): Promise<string> {
  const body: unknown = await response.json();
  if (
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof body.message === 'string'
  ) {
    return body.message;
  }
  return `リクエストに失敗しました（${response.status}）。`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
  return (await response.json()) as T;
}

export function getRooms(): Promise<Room[]> {
  return request<Room[]>('/api/rooms');
}

export function createRoom(room: RoomRequest): Promise<Room> {
  return request<Room>('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(room),
  });
}

export function updateRoom(id: number, room: RoomRequest): Promise<Room> {
  return request<Room>(`/api/rooms/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(room),
  });
}

export async function deleteRoom(id: number): Promise<void> {
  const response = await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
}
