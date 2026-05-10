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

// Settings room yang dibuat oleh host sebelum masuk lobby
export interface RoomSettings {
  maxLevel: 5 | 8 | 10;       // sampai level berapa game berjalan
  maxPlayers: number | null;   // null = tidak ada batas
  hostIsSpectator: boolean;    // true = host hanya nonton, false = ikut main
  isPrivate: boolean;          // apakah room disembunyikan dari daftar publik
}

export interface GameRoomState {
  id: string;
  hostId: string;
  players: Record<string, Player>;
  status: 'lobby' | 'countdown' | 'playing' | 'ended';
  isPrivate: boolean;
  currentLevel: number;
  currentPhase: 'memorize' | 'answer';
  itemsToMemorize: PlacedItem[];
  gridSize: number;
  timeRemaining: number;
  currentAnswerTime: number;
  answersSubmitted: Record<string, PlacedItem[]>;
  levelEvaluated: boolean;
  // setting room
  maxLevel: number;
  maxPlayers: number | null;
  hostIsSpectator: boolean;
}

const EMOJI_POOL = [
  '🐶','🐱','🦊','🐻','🐼','🦁','🐯','🐨',
  '🍕','🍔','🌮','🍣','🧇','🍩','🎂','🍉',
  '🎸','🚀','🎮','🔮','🧲','🎨','🧸','🪄',
  '⚡','🔥','💧','🌊','🌈','☄️','🌙','⭐',
];

// waktu menghafal naik seiring level
export function getMemorizeTime(level: number): number {
  if (level <= 2) return 8;
  if (level <= 5) return 10 + (level - 3) * 3;
  if (level <= 8) return 20 + (level - 6) * 5;
  return 35 + (level - 9) * 5;
}

// waktu menjawab juga makin panjang di level tinggi
export function getAnswerTime(level: number): number {
  if (level <= 2) return 20;
  if (level <= 5) return 30 + (level - 3) * 5;
  if (level <= 8) return 50 + (level - 6) * 8;
  return 75 + (level - 9) * 10;
}

// ukuran grid sesuai level, mulai 2x2 sampai 5x5
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
  public isPrivate: boolean = false;
  public currentLevel: number = 1;
  public currentPhase: 'memorize' | 'answer' = 'memorize';
  public itemsToMemorize: PlacedItem[] = [];
  public gridSize: number = 2;

  // setting room dari host
  public maxLevel: number = 10;
  public maxPlayers: number | null = null;
  public hostIsSpectator: boolean = false;

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
      isPrivate: this.isPrivate,
      currentLevel: this.currentLevel,
      currentPhase: this.currentPhase,
      itemsToMemorize: this.itemsToMemorize,
      gridSize: this.gridSize,
      timeRemaining: this.timeRemaining,
      currentAnswerTime: this.currentAnswerTime,
      answersSubmitted: Object.fromEntries(this.answersSubmitted),
      levelEvaluated: this.levelEvaluated,
      maxLevel: this.maxLevel,
      maxPlayers: this.maxPlayers,
      hostIsSpectator: this.hostIsSpectator,
    };
  }

  public setState(state: GameRoomState) {
    this.id = state.id;
    this.hostId = state.hostId;
    this.players = new Map(Object.entries(state.players));
    this.status = state.status;
    this.isPrivate = state.isPrivate ?? false;
    this.currentLevel = state.currentLevel;
    this.currentPhase = state.currentPhase;
    this.itemsToMemorize = state.itemsToMemorize;
    this.gridSize = state.gridSize;
    this.timeRemaining = state.timeRemaining;
    this.currentAnswerTime = state.currentAnswerTime;
    this.answersSubmitted = new Map(Object.entries(state.answersSubmitted));
    this.levelEvaluated = state.levelEvaluated;
    this.maxLevel = state.maxLevel ?? 10;
    this.maxPlayers = state.maxPlayers ?? null;
    this.hostIsSpectator = state.hostIsSpectator ?? false;
  }

  public setIo(io: Server) {
    this.io = io;
  }

  // cek apakah room masih bisa menerima pemain baru
  public isFull(): boolean {
    if (this.maxPlayers === null) return false;
    return this.players.size >= this.maxPlayers;
  }

  public async addPlayer(id: string, name: string) {
    // player pertama otomatis jadi host
    if (this.players.size === 0) {
      this.hostId = id;
    }
    this.players.set(id, { id, name, isReady: false, score: 0 });
    this.broadcastState();
    await this.saveState();
  }

  public async removePlayer(id: string) {
    this.players.delete(id);
    this.answersSubmitted.delete(id);
    
    // kalau yang keluar adalah host, tunjuk player berikutnya
    if (id === this.hostId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value!;
    }
    this.broadcastState();
    await this.saveState();

    // kalau fase jawaban dan semua sudah submit, langsung evaluasi
    if (this.status === 'playing' && this.currentPhase === 'answer') {
      const activePlayers = this.getActivePlayers();
      if (activePlayers.length > 0 && this.answersSubmitted.size >= activePlayers.length) {
        this.clearPhaseTimer();
        await this.evaluateLevel();
      }
    }
  }

  public getPlayers() {
    return Array.from(this.players.values());
  }

  // pemain aktif = semua player, tapi kalau host spectator, host tidak dihitung
  public getActivePlayers() {
    if (this.hostIsSpectator) {
      return this.getPlayers().filter(p => p.id !== this.hostId);
    }
    return this.getPlayers();
  }

  public async toggleReady(id: string) {
    // host tidak perlu ready
    if (id === this.hostId) return;
    const player = this.players.get(id);
    if (player) {
      player.isReady = !player.isReady;
      this.broadcastState();
      await this.saveState();
    }
  }

  public canStart(): boolean {
    // non-host players = semua yang bukan host
    const nonHostPlayers = this.getPlayers().filter(p => p.id !== this.hostId);
    return nonHostPlayers.length > 0 && nonHostPlayers.every(p => p.isReady);
  }

  public async startGame() {
    this.status = 'countdown';
    this.currentLevel = 1;
    // reset skor semua player
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

  public async resetToLobby() {
    this.cleanup();
    this.status = 'lobby';
    this.currentLevel = 1;
    this.getPlayers().forEach(p => {
      p.isReady = false;
      p.score = 0;
    });
    this.broadcastState();
    await this.saveState();
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

      if (this.timeRemaining <= 0) {
        this.clearPhaseTimer();

        if (this.currentPhase === 'memorize') {
          // waktu hafal habis, masuk fase jawab
          this.currentPhase = 'answer';
          this.timeRemaining = answerTime;
          await this.saveState();
          this.startPhaseTimer(memorizeTime, answerTime);
        } else {
          // waktu jawab habis, evaluasi hasil level ini
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
    // host spectator tidak bisa submit
    if (this.hostIsSpectator && playerId === this.hostId) return;

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

    // pakai getActivePlayers() supaya host spectator tidak ikut dihitung
    const activePlayers = this.getActivePlayers();
    if (this.answersSubmitted.size >= activePlayers.length) {
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

    // game selesai kalau sudah mencapai maxLevel yang ditentukan host
    if (this.currentLevel >= this.maxLevel) {
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
      // jeda 3 detik sebelum level berikutnya
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
      maxLevel: this.maxLevel,
      maxPlayers: this.maxPlayers,
      hostIsSpectator: this.hostIsSpectator,
    });
  }

  private generateGrid(totalCells: number, gridSize: number): PlacedItem[] {
    const items: PlacedItem[] = [];

    // bikin semua posisi di grid
    const positions: { row: number; col: number }[] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        positions.push({ row: r, col: c });
      }
    }

    // acak posisi
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    // acak emoji
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
