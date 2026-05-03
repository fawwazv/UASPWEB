import { Server } from 'socket.io';

export interface Player {
  id: string;
  name: string;
  isReady: boolean;
  score: number;
}

export interface PlacedItem {
  id: string;
  iconType: string; // native emoji string
  row: number;
  col: number;
}

// 32 unique native emojis across 4 categories — enough to fill a 5×5 grid
const EMOJI_POOL = [
  // Animals
  '🐶','🐱','🦊','🐻','🐼','🦁','🐯','🐨',
  // Foods
  '🍕','🍔','🌮','🍣','🧇','🍩','🎂','🍉',
  // Objects
  '🎸','🚀','🎮','🔮','🧲','🎨','🧸','🪄',
  // Symbols
  '⚡','🔥','💧','🌊','🌈','☄️','🌙','⭐',
];

/** Calculate memorize phase duration for a given level */
export function getMemorizeTime(level: number): number {
  // L1-2 (2x2): 8s, L3-5 (3x3): 12-15s, L6-8 (4x4): 20-25s, L9-10 (5x5): 30-35s
  return Math.round((8 + (level - 1) * 3) * 10) / 10;
}

/** Calculate answer phase duration for a given level */
export function getAnswerTime(level: number): number {
  // L1-2 (2x2): 20s, L3-5 (3x3): 30-40s, L6-8 (4x4): 50-65s, L9-10 (5x5): 80-90s
  return Math.round((20 + (level - 1) * 8) * 10) / 10;
}

/** Get grid size for a given level:
 * L1-2 = 2x2, L3-5 = 3x3, L6-8 = 4x4, L9-10 = 5x5
 */
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
  private answersSubmitted: Set<string> = new Set();
  private io: Server | null = null;
  private levelEvaluated: boolean = false;

  constructor(id: string) {
    this.id = id;
  }

  public setIo(io: Server) {
    this.io = io;
  }

  public addPlayer(id: string, name: string) {
    // First player to join becomes the host
    if (this.players.size === 0) {
      this.hostId = id;
    }
    this.players.set(id, { id, name, isReady: false, score: 0 });
    this.broadcastState();
  }

  public removePlayer(id: string) {
    this.players.delete(id);
    // If host left, promote the next available player
    if (id === this.hostId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value!;
    }
    this.broadcastState();
  }

  public getPlayers() {
    return Array.from(this.players.values());
  }

  public toggleReady(id: string) {
    // Host does not use the ready toggle — they use "Start Game"
    if (id === this.hostId) return;
    const player = this.players.get(id);
    if (player) {
      player.isReady = !player.isReady;
      this.broadcastState();
    }
  }

  /**
   * Returns true when the game can be started:
   * - At least one non-host player exists
   * - All non-host players are ready
   */
  public canStart(): boolean {
    const nonHostPlayers = this.getPlayers().filter(p => p.id !== this.hostId);
    return nonHostPlayers.length > 0 && nonHostPlayers.every(p => p.isReady);
  }

  public startGame() {
    this.status = 'countdown';
    this.currentLevel = 1;
    this.getPlayers().forEach(p => (p.score = 0));
    this.broadcastState();

    let countdown = 3;
    const interval = setInterval(() => {
      this.io?.to(this.id).emit('game_countdown', { count: countdown });
      countdown--;
      if (countdown < 0) {
        clearInterval(interval);
        this.startLevel();
      }
    }, 1000);
  }

  private startLevel() {
    this.status = 'playing';
    this.answersSubmitted.clear();
    this.levelEvaluated = false;

    this.gridSize = getGridSize(this.currentLevel);
    // Fill EVERY cell in the grid
    const totalCells = this.gridSize * this.gridSize;
    this.itemsToMemorize = this.generateGrid(totalCells, this.gridSize);

    const memorizeTime = getMemorizeTime(this.currentLevel);
    const answerTime = getAnswerTime(this.currentLevel);

    this.currentPhase = 'memorize';
    this.timeRemaining = memorizeTime;

    this.io?.to(this.id).emit('level_start', {
      level: this.currentLevel,
      gridSize: this.gridSize,
      items: this.itemsToMemorize,
      memorizeTime,
      answerTime,
    });

    this.startPhaseTimer(memorizeTime, answerTime);
  }

  private startPhaseTimer(memorizeTime: number, answerTime: number) {
    if (this.phaseTimer) clearInterval(this.phaseTimer);

    this.io?.to(this.id).emit('phase_sync', {
      phase: this.currentPhase,
      timeRemaining: this.timeRemaining,
    });

    this.phaseTimer = setInterval(() => {
      this.timeRemaining = Math.round((this.timeRemaining - 1) * 10) / 10;
      this.io?.to(this.id).emit('phase_sync', {
        phase: this.currentPhase,
        timeRemaining: this.timeRemaining,
      });

      if (this.timeRemaining <= 0) {
        clearInterval(this.phaseTimer!);
        if (this.currentPhase === 'memorize') {
          this.currentPhase = 'answer';
          this.timeRemaining = answerTime;
          this.startPhaseTimer(memorizeTime, answerTime);
        } else {
          this.evaluateLevel();
        }
      }
    }, 1000);
  }

  public submitAnswer(
    playerId: string,
    placedItems: PlacedItem[],
    timeRemainingAtSubmit: number,
  ) {
    if (
      this.status !== 'playing' ||
      this.currentPhase !== 'answer' ||
      this.answersSubmitted.has(playerId)
    ) return;

    this.answersSubmitted.add(playerId);
    const player = this.players.get(playerId);

    if (player) {
      let correctCount = 0;
      placedItems.forEach(item => {
        const isCorrect = this.itemsToMemorize.some(
          m => m.iconType === item.iconType && m.row === item.row && m.col === item.col,
        );
        if (isCorrect) correctCount++;
      });

      const multiplier = this.currentLevel;
      // Time bonus only applies when there is at least one correct answer
      const timeBonus = correctCount > 0 ? Math.floor(Math.max(0, timeRemainingAtSubmit)) * multiplier : 0;
      const scoreGain = correctCount * 10 * multiplier + timeBonus;
      player.score += scoreGain;

      // Broadcast leaderboard immediately after each submission
      this.broadcastLeaderboard();
    }

    if (this.answersSubmitted.size === this.players.size) {
      if (this.phaseTimer) clearInterval(this.phaseTimer);
      this.evaluateLevel();
    }
  }

  private broadcastLeaderboard() {
    const sorted = this.getPlayers()
      .slice()
      .sort((a, b) => b.score - a.score)
      .map(p => ({ id: p.id, name: p.name, score: p.score }));

    this.io?.to(this.id).emit('leaderboard_update', { players: sorted });
  }

  private evaluateLevel() {
    // Guard against double-evaluation (e.g. all-submit + timer expiry race)
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
    } else {
      setTimeout(() => {
        this.currentLevel++;
        this.startLevel();
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

  /**
   * Generates PlacedItems that fill every cell in the grid.
   * Uses a shuffled subset of EMOJI_POOL.
   */
  private generateGrid(totalCells: number, gridSize: number): PlacedItem[] {
    const items: PlacedItem[] = [];

    // Build all cell positions
    const positions: { row: number; col: number }[] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        positions.push({ row: r, col: c });
      }
    }

    // Shuffle positions (Fisher-Yates)
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    // Shuffle emoji pool
    const shuffledEmojis = [...EMOJI_POOL];
    for (let i = shuffledEmojis.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledEmojis[i], shuffledEmojis[j]] = [shuffledEmojis[j], shuffledEmojis[i]];
    }

    // Assign one unique emoji per cell (wraps if totalCells > pool size, but that never happens here)
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
