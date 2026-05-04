import { useEffect, useState } from 'react';
import { getSocket } from '../lib/socket';

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

export interface GameState {
  roomId: string | null;
  hostId: string | null;
  status: 'lobby' | 'countdown' | 'playing' | 'ended';
  players: Player[];
  currentLevel: number;
  gridSize: number;
  phase: 'memorize' | 'answer';
  timeRemaining: number;
  memorizeTime: number;
  answerTime: number;
  itemsToMemorize: PlacedItem[];
  countdown: number;
  finalLeaderboard: Player[];
}

export const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>({
    roomId: null, hostId: null, status: 'lobby', players: [],
    currentLevel: 1, gridSize: 2, phase: 'memorize',
    timeRemaining: 0, memorizeTime: 8, answerTime: 20,
    itemsToMemorize: [], countdown: 3, finalLeaderboard: [],
  });

  const [error, setError] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const onConnect    = () => setIsSocketConnected(true);
    const onDisconnect = () => setIsSocketConnected(false);

    const onRoomState = (data: { roomId: string; status: 'lobby' | 'countdown' | 'playing' | 'ended'; players: Player[]; hostId?: string }) => {
      setGameState(prev => ({
        ...prev,
        roomId:  data.roomId,
        status:  data.status,
        players: data.players,
        hostId:  data.hostId ?? prev.hostId,
      }));
    };

    const onGameCountdown = (data: { count: number }) => {
      setGameState(prev => ({ ...prev, countdown: data.count, status: 'countdown' }));
    };

    const onLevelStart = (data: { level: number; gridSize: number; items: PlacedItem[]; memorizeTime: number; answerTime: number }) => {
      setGameState(prev => ({
        ...prev,
        currentLevel:    data.level,
        gridSize:        data.gridSize,
        itemsToMemorize: data.items,
        memorizeTime:    data.memorizeTime,
        answerTime:      data.answerTime,
        status:          'playing',
        phase:           'memorize',
        timeRemaining:   data.memorizeTime,
      }));
    };

    const onPhaseSync = (data: { phase: 'memorize' | 'answer'; timeRemaining: number }) => {
      setGameState(prev => ({
        ...prev,
        phase:         data.phase,
        timeRemaining: Math.max(0, data.timeRemaining),
      }));
    };

    const onLeaderboardUpdate = (data: { players: Player[] }) => {
      setGameState(prev => ({ ...prev, players: data.players }));
    };

    const onGameOver = (data: { finalLeaderboard: Player[] }) => {
      setGameState(prev => ({
        ...prev,
        status:           'ended',
        finalLeaderboard: data.finalLeaderboard,
      }));
    };

    const onError = (data: { message?: string; error?: string }) => {
      setError(data.message || data.error || 'Terjadi kesalahan');
    };

    socket.on('connect',           onConnect);
    socket.on('disconnect',        onDisconnect);
    socket.on('room_state',        onRoomState);
    socket.on('game_countdown',    onGameCountdown);
    socket.on('level_start',       onLevelStart);
    socket.on('phase_sync',        onPhaseSync);
    socket.on('leaderboard_update',onLeaderboardUpdate);
    socket.on('game_over',         onGameOver);
    socket.on('error',             onError);

    return () => {
      socket.off('connect',            onConnect);
      socket.off('disconnect',         onDisconnect);
      socket.off('room_state',         onRoomState);
      socket.off('game_countdown',     onGameCountdown);
      socket.off('level_start',        onLevelStart);
      socket.off('phase_sync',         onPhaseSync);
      socket.off('leaderboard_update', onLeaderboardUpdate);
      socket.off('game_over',          onGameOver);
      socket.off('error',              onError);
    };
  }, []);

  const createRoom = (callback?: (roomId: string) => void) => {
    setError(null);
    getSocket().emit('create_room', (res: { roomId?: string }) => {
      if (res.roomId && callback) callback(res.roomId);
    });
  };

  const joinRoom = (roomId: string, playerName: string, callback?: (ok: boolean) => void) => {
    setError(null);
    getSocket().emit('join_room', { roomId, playerName }, (res: { error?: string }) => {
      if (res.error) {
        setError(res.error);
        if (callback) callback(false);
      } else {
        setGameState(prev => ({ ...prev, roomId }));
        if (callback) callback(true);
      }
    });
  };

  const toggleReady = () => {
    if (gameState.roomId) getSocket().emit('player_ready', { roomId: gameState.roomId });
  };

  const startGame = () => {
    if (gameState.roomId) getSocket().emit('game_start', { roomId: gameState.roomId });
  };

  const submitAnswer = (placedItems: PlacedItem[], timeRemaining: number) => {
    if (gameState.roomId) {
      getSocket().emit('submit_answer', { roomId: gameState.roomId, placedItems, timeRemaining });
    }
  };

  const leaveRoom = () => {
    if (gameState.roomId) {
      getSocket().emit('leave_room', { roomId: gameState.roomId });
      setGameState(prev => ({ ...prev, roomId: null, hostId: null, status: 'lobby', players: [] }));
    }
  };

  return { gameState, error, isSocketConnected, createRoom, joinRoom, toggleReady, startGame, submitAnswer, leaveRoom };
};
