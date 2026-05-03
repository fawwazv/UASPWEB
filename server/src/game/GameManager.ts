import { GameRoom } from './GameRoom';

export class GameManager {
  private rooms: Map<string, GameRoom> = new Map();

  public createRoom(): string {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.rooms.set(roomId, new GameRoom(roomId));
    return roomId;
  }

  public getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  public removeRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }
}

export const gameManager = new GameManager();
