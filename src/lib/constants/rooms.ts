export interface RoomConfig {
  name: string;
  windows: number;
  doors: number;
}

export const PRESET_ROOMS: RoomConfig[] = [
  { name: 'A31', windows: 7, doors: 7 },
  { name: 'A32', windows: 7, doors: 7 },
  { name: 'A34', windows: 7, doors: 7 },
  { name: 'B03', windows: 6, doors: 6 },
  { name: 'A03', windows: 8, doors: 8 },
  { name: 'B11', windows: 6, doors: 5 },
  { name: 'B12', windows: 6, doors: 5 },
  { name: 'B14', windows: 6, doors: 6 },
  { name: 'B25', windows: 5, doors: 6 },
];

export function calculateRoomCapacity(room: RoomConfig, studentsPerBench: number): number {
  return (room.windows + room.doors) * studentsPerBench;
}
