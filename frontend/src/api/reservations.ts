import type {
  Reservation,
  ReservationRequest,
  ReservationSchedule,
} from './types';

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

export async function createReservation(
  reservation: ReservationRequest,
): Promise<Reservation> {
  const response = await fetch('/api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reservation),
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
  return (await response.json()) as Reservation;
}

export async function getReservationsByDate(
  date: string,
): Promise<ReservationSchedule[]> {
  const response = await fetch(`/api/reservations?date=${encodeURIComponent(date)}`);
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
  return (await response.json()) as ReservationSchedule[];
}

export async function getReservationsByRoom(roomId: number): Promise<Reservation[]> {
  const response = await fetch(`/api/rooms/${roomId}/reservations`);
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
  return (await response.json()) as Reservation[];
}
