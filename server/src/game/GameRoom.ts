import { Server } from 'socket.io';

export interface Player {
  id: string;
  name: string;
  isReady: boolean;
  score: number;
}

export interface PlacedItem {
  id: string;
  iconType: string;
  row: number;
  col: number;
}

export interface GameRoomState {
  id: string;
  hostId: string;
  players: Record<string, Player>;
  status: 'lobby' | 'countdown' | 'playing' | 'ended';
  currentLevel: number;
  currentPhase: 'memorize' | 'answer';
  itemsToMemorize: PlacedItem[];
  gridSize: number;
  timeRemaining: number;
  currentAnswerTime: number;
  answersSubmitted: Record<string, PlacedItem[]>;
  levelEvaluated: boolean;
}

const EMOJI_POOL = [
  '🐶','🐱','🦊','🐻','🐼','🦁','🐯','🐨',
  '🍕','🍔','🌮','🍣','🧇','🍩','🎂','🍉',
  '🎸','🚀','🎮','🔮','🧲','🎨','🧸','🪄',
  '⚡','🔥','💧','🌊','🌈','☄️','🌙','⭐',
];

export function getMemorizeTime(level: number): number {
  if (level <= 2) return 8;
  if (level <= 5) return 10 + (level - 3) * 3;
  if (level <= 8) return 20 + (level - 6) * 5;
  return 35 + (level - 9) * 5;
}

export function getAnswerTime(level: number): number {
  if (level <= 2) return 20;
  if (level <= 5) return 30 + (level - 3) * 5;
  if (level <= 8) return 50 + (level - 6) * 8;
  return 75 + (level - 9) * 10;
}

export function getGridSize(level: number): number {
  if (level <= 2) return 2;
  if (level <= 5) return 3;
  if (level <= 8) return 4;
  return 5;
}

export class GameRoom {
  public id: string;
  public hostId: string = '';
  public players: Map<string, Player> = new Map();
  public status: 'lobby' | 'countdown' | 'playing' | 'ended' = 'lobby';
  public currentLevel: number = 1;
  public currentPhase: 'memorize' | 'answer' = 'memorize';
  public itemsToMemorize: PlacedItem[] = [];
  public gridSize: number = 2;

  private phaseTimer: NodeJS.Timeout | null = null;
  private timeRemaining: number = 0;
  private answersSubmitted: Map<string, PlacedItem[]> = new Map();
  private io: Server | null = null;
  private levelEvaluated: boolean = false;
  private currentAnswerTime: number = 0;
  
  private saveHandler?: (state: GameRoomState) => Promise<void>;

  constructor(id: string) {
    this.id = id;
  }

  public setSaveHandler(handler: (state: GameRoomState) => Promise<void>) {
    this.saveHandler = handler;
  }

  private async saveState() {
    if (this.saveHandler) {
      await this.saveHandler(this.getState());
    }
  }

  public getState(): GameRoomState {
    return {
      id: this.id,
      hostId: this.hostId,
      players: Object.fromEntries(this.players),
      status: this.status,
      currentLevel: this.currentLevel,
      currentPhase: this.currentPhase,
      itemsToMemorize: this.itemsToMemorize,
      gridSize: this.gridSize,
      timeRemaining: this.timeRemaining,
      currentAnswerTime: this.currentAnswerTime,
      answersSubmitted: Object.fromEntries(this.answersSubmitted),
      levelEvaluated: this.levelEvaluated,
    };
  }

  public setState(state: GameRoomState) {
    this.id = state.id;
    this.hostId = state.hostId;
    this.players = new Map(Object.entries(state.players));
    this.status = state.status;
    this.currentLevel = state.currentLevel;
    this.currentPhase = state.currentPhase;
    this.itemsToMemorize = state.itemsToMemorize;
    this.gridSize = state.gridSize;
    this.timeRemaining = state.timeRemaining;
    this.currentAnswerTime = state.currentAnswerTime;
    this.answersSubmitted = new Map(Object.entries(state.answersSubmitted));
    this.levelEvaluated = state.levelEvaluated;
  }

  public setIo(io: Server) {
    this.io = io;
  }

  public async addPlayer(id: string, name: string) {
    if (this.players.size === 0) {
      this.hostId = id;
    }
    this.players.set(id, { id, name, isReady: false, score: 0 });
    this.broadcastState();
    await this.saveState();
  }

  public async removePlayer(id: string) {
    this.players.delete(id);
    if (id === this.hostId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value!;
    }
    this.broadcastState();
    await this.saveState();
  }

  public getPlayers() {
    return Array.from(this.players.values());
  }

  public async toggleReady(id: string) {
    if (id === this.hostId) return;
    const player = this.players.get(id);
    if (player) {
      player.isReady = !player.isReady;
      this.broadcastState();
      await this.saveState();
    }
  }

  public canStart(): boolean {
    const nonHostPlayers = this.getPlayers().filter(p => p.id !== this.hostId);
    return nonHostPlayers.length > 0 && nonHostPlayers.every(p => p.isReady);
  }

  public async startGame() {
    this.status = 'countdown';
    this.currentLevel = 1;
    this.getPlayers().forEach(p => (p.score = 0));
    this.broadcastState();
    await this.saveState();

    let countdown = 3;
    const interval = setInterval(async () => {
      countdown--;
      if (countdown > 0) {
        this.io?.to(this.id).emit('game_countdown', { count: countdown });
      } else {
        clearInterval(interval);
        await this.startLevel();
      }
    }, 1000);
  }

  public cleanup() {
    this.clearPhaseTimer();
  }

  private clearPhaseTimer() {
    if (this.phaseTimer) {
      clearInterval(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  private async startLevel() {
    this.status = 'playing';
    this.answersSubmitted.clear();
    this.levelEvaluated = false;

    this.gridSize = getGridSize(this.currentLevel);
    const totalCells = this.gridSize * this.gridSize;
    this.itemsToMemorize = this.generateGrid(totalCells, this.gridSize);

    const memorizeTime = getMemorizeTime(this.currentLevel);
    const answerTime = getAnswerTime(this.currentLevel);
    this.currentAnswerTime = answerTime;

    this.currentPhase = 'memorize';
    this.timeRemaining = memorizeTime;

    this.io?.to(this.id).emit('level_start', {
      level: this.currentLevel,
      gridSize: this.gridSize,
      items: this.itemsToMemorize,
      memorizeTime,
      answerTime,
    });

    await this.saveState();
    this.startPhaseTimer(memorizeTime, answerTime);
  }

  private startPhaseTimer(memorizeTime: number, answerTime: number) {
    this.clearPhaseTimer();

    this.io?.to(this.id).emit('phase_sync', {
      phase: this.currentPhase,
      timeRemaining: this.timeRemaining,
    });

    this.phaseTimer = setInterval(async () => {
      this.timeRemaining = Math.max(0, Math.round((this.timeRemaining - 1) * 10) / 10);

      this.io?.to(this.id).emit('phase_sync', {
        phase: this.currentPhase,
        timeRemaining: this.timeRemaining,
      });

      // To prevent spamming Redis every second, we might not await this.saveState() here, 
      // but for accuracy and cross-node sync we will do it every few seconds or only at transitions.
      // For now, let's keep it simple and just do it at phase transitions to avoid overloading Redis.
      
      if (this.timeRemaining <= 0) {
        this.clearPhaseTimer();

        if (this.currentPhase === 'memorize') {
          this.currentPhase = 'answer';
          this.timeRemaining = answerTime;
          await this.saveState();
          this.startPhaseTimer(memorizeTime, answerTime);
        } else {
          await this.evaluateLevel();
        }
      }
    }, 1000);
  }

  public async submitAnswer(
    playerId: string,
    placedItems: PlacedItem[],
    timeRemainingAtSubmit: number,
  ) {
    if (
      this.status !== 'playing' ||
      this.currentPhase !== 'answer' ||
      this.answersSubmitted.has(playerId)
    ) return;

    this.answersSubmitted.set(playerId, placedItems);
    const player = this.players.get(playerId);

    if (player) {
      let correctCount = 0;
      const totalCells = this.gridSize * this.gridSize;

      placedItems.forEach(item => {
        const isCorrect = this.itemsToMemorize.some(
          m => m.iconType === item.iconType && m.row === item.row && m.col === item.col,
        );
        if (isCorrect) correctCount++;
      });

      const multiplier = this.currentLevel;
      const safeTime = Math.max(0, timeRemainingAtSubmit);
      const timeBonus = correctCount > 0
        ? Math.floor(safeTime * (correctCount / totalCells)) * multiplier
        : 0;
      const scoreGain = correctCount * 10 * multiplier + timeBonus;
      player.score += scoreGain;

      this.io?.to(playerId).emit('answer_result', {
        correctCount,
        totalCells,
        scoreGain,
        timeBonus,
      });

      this.broadcastLeaderboard();
      await this.saveState();
    }

    if (this.answersSubmitted.size >= this.players.size) {
      this.clearPhaseTimer();
      await this.evaluateLevel();
    }
  }

  private broadcastLeaderboard() {
    const sorted = this.getPlayers()
      .slice()
      .sort((a, b) => b.score - a.score)
      .map(p => ({ id: p.id, name: p.name, score: p.score }));

    this.io?.to(this.id).emit('leaderboard_update', { players: sorted });
  }

  private async evaluateLevel() {
    if (this.levelEvaluated) return;
    this.levelEvaluated = true;

    this.broadcastLeaderboard();

    if (this.currentLevel >= 10) {
      this.status = 'ended';
      this.broadcastState();
      this.io?.to(this.id).emit('game_over', {
        finalLeaderboard: this.getPlayers()
          .slice()
          .sort((a, b) => b.score - a.score),
      });
      await this.saveState();
    } else {
      this.io?.to(this.id).emit('level_complete', {
        level: this.currentLevel,
        nextLevel: this.currentLevel + 1,
      });
      await this.saveState();
      setTimeout(async () => {
        this.currentLevel++;
        await this.startLevel();
      }, 3000);
    }
  }

  public broadcastState() {
    this.io?.to(this.id).emit('room_state', {
      roomId: this.id,
      status: this.status,
      players: this.getPlayers(),
      hostId: this.hostId,
    });
  }

  private generateGrid(totalCells: number, gridSize: number): PlacedItem[] {
    const items: PlacedItem[] = [];

    const positions: { row: number; col: number }[] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        positions.push({ row: r, col: c });
      }
    }

    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    const shuffledEmojis = [...EMOJI_POOL];
    for (let i = shuffledEmojis.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledEmojis[i], shuffledEmojis[j]] = [shuffledEmojis[j], shuffledEmojis[i]];
    }

    for (let i = 0; i < totalCells; i++) {
      items.push({
        id: `item-${i}`,
        iconType: shuffledEmojis[i % shuffledEmojis.length],
        row: positions[i].row,
        col: positions[i].col,
      });
    }

    return items;
  }
}
