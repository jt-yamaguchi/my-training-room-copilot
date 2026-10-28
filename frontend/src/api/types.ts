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
