import { Server, Socket } from 'socket.io';
import { gameManager } from '../game/GameManager';

export const handleSocketConnection = (io: Server, socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  const userRooms = new Map<string, string>(); // socket.id -> roomId

  socket.on('create_room', (callback) => {
    const roomId = gameManager.createRoom();
    const room = gameManager.getRoom(roomId);
    if (room) {
      room.setIo(io);
    }
    if (typeof callback === 'function') {
      callback({ roomId });
    }
  });

  socket.on('join_room', ({ roomId, playerName }, callback) => {
    const room = gameManager.getRoom(roomId);
    if (!room) {
      if (typeof callback === 'function') callback({ error: 'Room not found' });
      return;
    }

    if (room.status !== 'lobby') {
      if (typeof callback === 'function') callback({ error: 'Game already started' });
      return;
    }

    socket.join(roomId);
    room.addPlayer(socket.id, playerName);
    userRooms.set(socket.id, roomId);

    if (typeof callback === 'function') {
      callback({ success: true, roomId });
    }
  });

  socket.on('player_ready', ({ roomId }) => {
    const room = gameManager.getRoom(roomId);
    if (room) {
      room.toggleReady(socket.id);
    }
  });

  // Only the host can trigger this — GameRoom.startGame() is guarded by canStart()
  socket.on('game_start', ({ roomId }) => {
    const room = gameManager.getRoom(roomId);
    if (!room) return;
    if (room.hostId !== socket.id) return; // must be host
    if (!room.canStart()) return;          // all non-host players must be ready
    room.startGame();
  });

  socket.on('submit_answer', ({ roomId, placedItems, timeRemaining }) => {
    const room = gameManager.getRoom(roomId);
    if (room) {
      room.submitAnswer(socket.id, placedItems, timeRemaining);
    }
  });

  socket.on('leave_room', ({ roomId }) => {
    const room = gameManager.getRoom(roomId);
    if (room) {
      room.removePlayer(socket.id);
      socket.leave(roomId);
      userRooms.delete(socket.id);
      if (room.getPlayers().length === 0) {
        gameManager.removeRoom(roomId);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    const roomId = userRooms.get(socket.id);
    if (roomId) {
      const room = gameManager.getRoom(roomId);
      if (room) {
        room.removePlayer(socket.id);
        if (room.getPlayers().length === 0) {
          gameManager.removeRoom(roomId);
        }
      }
      userRooms.delete(socket.id);
    }
  });
};
