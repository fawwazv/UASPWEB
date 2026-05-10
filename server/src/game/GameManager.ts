import { redisClient } from '../redis';
import { GameRoom, GameRoomState, RoomSettings } from './GameRoom';

export interface PublicRoomInfo {
  roomId: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number | null;
  maxLevel: number;
}

export class GameManager {
  private localRooms: Map<string, GameRoom> = new Map();

  // buat room baru, terima settings dari host
  public async createRoom(settings: Partial<RoomSettings> = {}): Promise<string> {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const room = new GameRoom(roomId);

    // terapkan setting dari host, pakai default kalau tidak diisi
    room.isPrivate = settings.isPrivate ?? false;
    room.maxLevel = settings.maxLevel ?? 10;
    room.maxPlayers = settings.maxPlayers ?? null;
    room.hostIsSpectator = settings.hostIsSpectator ?? false;
    
    // inject save hook supaya GameRoom bisa simpan state-nya sendiri
    room.setSaveHandler(async (state) => {
      await this.saveRoomState(roomId, state);
    });

    this.localRooms.set(roomId, room);
    await this.saveRoomState(roomId, room.getState());
    return roomId;
  }

  public async getRoom(roomId: string): Promise<GameRoom | undefined> {
    if (redisClient) {
      const stateStr = await redisClient.get(`room:${roomId}`);
      if (stateStr) {
        const state = JSON.parse(stateStr) as GameRoomState;
        
        // kalau room sudah ada di memory lokal, pakai yang itu
        let room = this.localRooms.get(roomId);
        if (!room) {
          room = new GameRoom(roomId);
          room.setSaveHandler(async (s) => {
            await this.saveRoomState(roomId, s);
          });
          this.localRooms.set(roomId, room);
        }
        
        // hydrate dari data redis
        room.setState(state);
        return room;
      }
      return undefined;
    } else {
      return this.localRooms.get(roomId);
    }
  }

  public async getPublicRooms(): Promise<PublicRoomInfo[]> {
    const publicRooms: PublicRoomInfo[] = [];

    if (redisClient) {
      const keys = await redisClient.keys('room:*');
      if (keys.length > 0) {
        const states = await redisClient.mGet(keys);
        for (const stateStr of states) {
          if (stateStr) {
            const state = JSON.parse(stateStr) as GameRoomState;
            const playerCount = Object.keys(state.players).length;
            if (!state.isPrivate && state.status === 'lobby') {
              const host = state.players[state.hostId];
              publicRooms.push({
                roomId: state.id,
                hostName: host ? host.name : 'Unknown',
                playerCount,
                maxPlayers: state.maxPlayers ?? null,
                maxLevel: state.maxLevel ?? 10,
              });
            }
          }
        }
      }
    } else {
      for (const [roomId, room] of this.localRooms.entries()) {
        const playerCount = room.getPlayers().length;
        if (!room.isPrivate && room.status === 'lobby') {
          const host = room.players.get(room.hostId);
          publicRooms.push({
            roomId,
            hostName: host ? host.name : 'Unknown',
            playerCount,
            maxPlayers: room.maxPlayers,
            maxLevel: room.maxLevel,
          });
        }
      }
    }

    return publicRooms;
  }

  private async saveRoomState(roomId: string, state: GameRoomState): Promise<void> {
    if (redisClient) {
      // simpan 2 jam, cukup untuk satu sesi game
      await redisClient.setEx(`room:${roomId}`, 7200, JSON.stringify(state));
    }
  }

  public async removeRoom(roomId: string): Promise<void> {
    if (redisClient) {
      await redisClient.del(`room:${roomId}`);
    }
    const room = this.localRooms.get(roomId);
    if (room) {
      // bersihkan interval yang masih jalan
      room.cleanup();
    }
    this.localRooms.delete(roomId);
  }
}

export const gameManager = new GameManager();
