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

export class GameRoom {
  public id: string;
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

  constructor(id: string) {
    this.id = id;
  }

  public setIo(io: Server) {
    this.io = io;
  }

  public addPlayer(id: string, name: string) {
    this.players.set(id, { id, name, isReady: false, score: 0 });
    this.broadcastState();
  }

  public removePlayer(id: string) {
    this.players.delete(id);
    this.broadcastState();
    if (this.players.size > 0 && this.status === 'lobby') {
      this.checkAllReady();
    }
  }

  public getPlayers() {
    return Array.from(this.players.values());
  }

  public toggleReady(id: string) {
    const player = this.players.get(id);
    if (player) {
      player.isReady = !player.isReady;
      this.broadcastState();
      this.checkAllReady();
    }
  }

  private checkAllReady() {
    const players = this.getPlayers();
    if (players.length > 0 && players.every(p => p.isReady) && this.status === 'lobby') {
      this.startGame();
    }
  }

  public startGame() {
    this.status = 'countdown';
    this.currentLevel = 1;
    this.getPlayers().forEach(p => p.score = 0);
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
    
    this.gridSize = Math.min(2 + Math.floor((this.currentLevel - 1) / 2), 5);
    const numItems = this.currentLevel + 2;
    this.itemsToMemorize = this.generateItems(numItems, this.gridSize);

    this.currentPhase = 'memorize';
    this.timeRemaining = 5;
    
    this.io?.to(this.id).emit('level_start', {
      level: this.currentLevel,
      gridSize: this.gridSize,
      items: this.itemsToMemorize
    });

    this.startPhaseTimer();
  }

  private startPhaseTimer() {
    if (this.phaseTimer) clearInterval(this.phaseTimer);
    
    this.io?.to(this.id).emit('phase_sync', {
      phase: this.currentPhase,
      timeRemaining: this.timeRemaining
    });

    this.phaseTimer = setInterval(() => {
      this.timeRemaining--;
      this.io?.to(this.id).emit('phase_sync', {
        phase: this.currentPhase,
        timeRemaining: this.timeRemaining
      });

      if (this.timeRemaining <= 0) {
        clearInterval(this.phaseTimer!);
        if (this.currentPhase === 'memorize') {
          this.currentPhase = 'answer';
          this.timeRemaining = 10;
          this.startPhaseTimer();
        } else {
          this.evaluateLevel();
        }
      }
    }, 1000);
  }

  public submitAnswer(playerId: string, placedItems: PlacedItem[], timeRemainingAtSubmit: number) {
    if (this.status !== 'playing' || this.currentPhase !== 'answer' || this.answersSubmitted.has(playerId)) return;
    
    this.answersSubmitted.add(playerId);
    const player = this.players.get(playerId);
    
    if (player) {
      let correctCount = 0;
      placedItems.forEach(item => {
        const isCorrect = this.itemsToMemorize.some(
          m => m.iconType === item.iconType && m.row === item.row && m.col === item.col
        );
        if (isCorrect) correctCount++;
      });

      const multiplier = this.currentLevel;
      const scoreGain = (correctCount * 10) + (timeRemainingAtSubmit * multiplier);
      player.score += scoreGain;
    }

    if (this.answersSubmitted.size === this.players.size) {
      if (this.phaseTimer) clearInterval(this.phaseTimer);
      this.evaluateLevel();
    }
  }

  private evaluateLevel() {
    this.io?.to(this.id).emit('leaderboard_update', {
      players: this.getPlayers().map(p => ({ id: p.id, name: p.name, score: p.score }))
    });

    if (this.currentLevel >= 10) {
      this.status = 'ended';
      this.broadcastState();
      this.io?.to(this.id).emit('game_over', {
        finalLeaderboard: this.getPlayers().sort((a, b) => b.score - a.score)
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
      players: this.getPlayers()
    });
  }

  private generateItems(count: number, gridSize: number): PlacedItem[] {
    const items: PlacedItem[] = [];
    const availablePositions = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        availablePositions.push({ row: r, col: c });
      }
    }

    for (let i = availablePositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]];
    }

    const availableIcons = ['cpu', 'database', 'globe', 'hard-drive', 'layers', 'monitor', 'server', 'wifi', 'zap', 'shield', 'code', 'terminal'];
    
    // Shuffle icons
    const shuffledIcons = [...availableIcons];
    for (let i = shuffledIcons.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledIcons[i], shuffledIcons[j]] = [shuffledIcons[j], shuffledIcons[i]];
    }
    
    for (let i = 0; i < Math.min(count, availablePositions.length); i++) {
      items.push({
        id: `item-${i}`,
        iconType: shuffledIcons[i % shuffledIcons.length],
        row: availablePositions[i].row,
        col: availablePositions[i].col
      });
    }
    
    return items;
  }
}
