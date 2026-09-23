import { Client, Room } from "colyseus.js";
import { ROOM_NAME } from "./roomName.js";

export async function joinTankRoom(nickname: string): Promise<Room> {
  const endpoint = import.meta.env.VITE_COLYSEUS_URL ?? "ws://localhost:2567";
  const client = new Client(endpoint);
  return client.joinOrCreate(ROOM_NAME, { nickname });
}
