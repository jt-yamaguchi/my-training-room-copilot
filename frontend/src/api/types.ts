export type Room = {
  id: number;
  name: string;
  capacity: number;
  notes: string | null;
};

export type RoomRequest = {
  name: string;
  capacity: number;
  notes: string | null;
};

export type Reservation = {
  id: number;
  roomId: number;
  roomName: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  organizerName: string;
};

export type ReservationRequest = {
  roomId: number;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  organizerName: string;
};
