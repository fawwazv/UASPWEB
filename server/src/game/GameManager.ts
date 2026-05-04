import { redisClient } from '../redis';
import { GameRoom, GameRoomState } from './GameRoom';

export interface PublicRoomInfo {
  roomId: string;
  hostName: string;
  playerCount: number;
}

export class GameManager {
  private localRooms: Map<string, GameRoom> = new Map();

  public async createRoom(isPrivate: boolean = false): Promise<string> {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const room = new GameRoom(roomId);
    room.isPrivate = isPrivate;
    
    // Inject save hook so GameRoom can save its state automatically
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
        
        let room = this.localRooms.get(roomId);
        if (!room) {
          room = new GameRoom(roomId);
          room.setSaveHandler(async (s) => {
            await this.saveRoomState(roomId, s);
          });
          this.localRooms.set(roomId, room);
        }
        
        // Rehydrate
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
            if (!state.isPrivate && state.status === 'lobby' && playerCount < 2) {
              const host = state.players[state.hostId];
              publicRooms.push({
                roomId: state.id,
                hostName: host ? host.name : 'Unknown',
                playerCount,
              });
            }
          }
        }
      }
    } else {
      for (const [roomId, room] of this.localRooms.entries()) {
        const playerCount = room.getPlayers().length;
        if (!room.isPrivate && room.status === 'lobby' && playerCount < 2) {
          const host = room.players.get(room.hostId);
          publicRooms.push({
            roomId,
            hostName: host ? host.name : 'Unknown',
            playerCount,
          });
        }
      }
    }

    return publicRooms;
  }

  private async saveRoomState(roomId: string, state: GameRoomState): Promise<void> {
    if (redisClient) {
      // 2 hours expiration for inactive rooms
      await redisClient.setEx(`room:${roomId}`, 7200, JSON.stringify(state));
    }
  }

  public async removeRoom(roomId: string): Promise<void> {
    if (redisClient) {
      await redisClient.del(`room:${roomId}`);
    }
    const room = this.localRooms.get(roomId);
    if (room) {
      room.cleanup(); // To clear any intervals
    }
    this.localRooms.delete(roomId);
  }
}

export const gameManager = new GameManager();
