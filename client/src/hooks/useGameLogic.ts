import { useEffect, useState, useRef } from 'react';
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

// settings room yang dipilih host sebelum buat room
export interface RoomSettings {
  maxLevel: 5 | 8 | 10;
  maxPlayers: number | null;
  hostIsSpectator: boolean;
  isPrivate: boolean;
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
  // info setting room, datang dari server lewat room_state
  maxLevel: number;
  maxPlayers: number | null;
  hostIsSpectator: boolean;
}

export const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>({
    roomId: null, hostId: null, status: 'lobby', players: [],
    currentLevel: 1, gridSize: 2, phase: 'memorize',
    timeRemaining: 0, memorizeTime: 8, answerTime: 20,
    itemsToMemorize: [], countdown: 3, finalLeaderboard: [],
    maxLevel: 10, maxPlayers: null, hostIsSpectator: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  // flag supaya event dari server tidak overwrite state setelah user keluar
  const leavingRef = useRef(false);

  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const onConnect    = () => setIsSocketConnected(true);
    const onDisconnect = () => setIsSocketConnected(false);

    const onRoomState = (data: {
      roomId: string;
      status: 'lobby' | 'countdown' | 'playing' | 'ended';
      players: Player[];
      hostId?: string;
      maxLevel?: number;
      maxPlayers?: number | null;
      hostIsSpectator?: boolean;
    }) => {
      // abaikan kalau user sudah klik keluar
      if (leavingRef.current) return;
      setGameState(prev => ({
        ...prev,
        roomId:  data.roomId,
        status:  data.status,
        players: data.players,
        hostId:  data.hostId ?? prev.hostId,
        maxLevel: data.maxLevel ?? prev.maxLevel,
        maxPlayers: data.maxPlayers !== undefined ? data.maxPlayers : prev.maxPlayers,
        hostIsSpectator: data.hostIsSpectator ?? prev.hostIsSpectator,
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

    const onRoomDeleted = () => {
      leavingRef.current = false;
      setGameState(prev => ({ ...prev, roomId: null, hostId: null, status: 'lobby', players: [] }));
      setError('Room telah dibubarkan oleh Host');
    };

    socket.on('connect',            onConnect);
    socket.on('disconnect',         onDisconnect);
    socket.on('room_state',         onRoomState);
    socket.on('game_countdown',     onGameCountdown);
    socket.on('level_start',        onLevelStart);
    socket.on('phase_sync',         onPhaseSync);
    socket.on('leaderboard_update', onLeaderboardUpdate);
    socket.on('game_over',          onGameOver);
    socket.on('error',              onError);
    socket.on('room_deleted',       onRoomDeleted);

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
      socket.off('room_deleted',       onRoomDeleted);
    };
  }, []);

  // buat room baru dengan settings dari host
  const createRoom = (settings: RoomSettings, callback?: (roomId: string) => void) => {
    setError(null);
    getSocket().emit('create_room', settings, (res: { roomId?: string }) => {
      if (res.roomId && callback) callback(res.roomId);
    });
  };

  const joinRoom = (roomId: string, playerName: string, callback?: (ok: boolean) => void) => {
    setError(null);
    // reset flag leaving karena user masuk room baru
    leavingRef.current = false;
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

  // langsung reset state ke awal dan set flag supaya event server tidak overwrite
  const leaveRoom = () => {
    if (gameState.roomId) {
      leavingRef.current = true;
      getSocket().emit('leave_room', { roomId: gameState.roomId });
      setGameState({
        roomId: null, hostId: null, status: 'lobby', players: [],
        currentLevel: 1, gridSize: 2, phase: 'memorize',
        timeRemaining: 0, memorizeTime: 8, answerTime: 20,
        itemsToMemorize: [], countdown: 3, finalLeaderboard: [],
        maxLevel: 10, maxPlayers: null, hostIsSpectator: false,
      });
    }
  };

  const deleteRoom = () => {
    if (gameState.roomId) {
      leavingRef.current = true;
      getSocket().emit('delete_room', { roomId: gameState.roomId });
      setGameState({
        roomId: null, hostId: null, status: 'lobby', players: [],
        currentLevel: 1, gridSize: 2, phase: 'memorize',
        timeRemaining: 0, memorizeTime: 8, answerTime: 20,
        itemsToMemorize: [], countdown: 3, finalLeaderboard: [],
        maxLevel: 10, maxPlayers: null, hostIsSpectator: false,
      });
    }
  };

  return { gameState, error, isSocketConnected, createRoom, joinRoom, toggleReady, startGame, submitAnswer, leaveRoom, deleteRoom };
};
