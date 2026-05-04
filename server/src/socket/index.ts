import { Server, Socket } from 'socket.io';
import { gameManager } from '../game/GameManager';

export const handleSocketConnection = (io: Server, socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  // In a distributed Redis setup, userRooms map is local. 
  // It's okay because socket connections are also local to this node.
  const userRooms = new Map<string, string>(); 

  socket.on('create_room', async (callback) => {
    const roomId = await gameManager.createRoom();
    const room = await gameManager.getRoom(roomId);
    if (room) {
      room.setIo(io);
    }
    if (typeof callback === 'function') {
      callback({ roomId });
    }
  });

  socket.on('join_room', async ({ roomId, playerName }, callback) => {
    const room = await gameManager.getRoom(roomId);
    if (!room) {
      if (typeof callback === 'function') callback({ error: 'Room not found' });
      return;
    }

    if (room.status !== 'lobby') {
      if (typeof callback === 'function') callback({ error: 'Game already started' });
      return;
    }

    room.setIo(io);
    socket.join(roomId);
    await room.addPlayer(socket.id, playerName);
    userRooms.set(socket.id, roomId);

    if (typeof callback === 'function') {
      callback({ success: true, roomId });
    }
  });

  socket.on('player_ready', async ({ roomId }) => {
    const room = await gameManager.getRoom(roomId);
    if (room) {
      room.setIo(io);
      await room.toggleReady(socket.id);
    }
  });

  socket.on('game_start', async ({ roomId }) => {
    const room = await gameManager.getRoom(roomId);
    if (!room) return;
    if (room.hostId !== socket.id) return; 
    if (!room.canStart()) return;          
    room.setIo(io);
    await room.startGame();
  });

  socket.on('submit_answer', async ({ roomId, placedItems, timeRemaining }) => {
    const room = await gameManager.getRoom(roomId);
    if (room) {
      room.setIo(io);
      await room.submitAnswer(socket.id, placedItems, timeRemaining);
    }
  });

  socket.on('leave_room', async ({ roomId }) => {
    const room = await gameManager.getRoom(roomId);
    if (room) {
      room.setIo(io);
      await room.removePlayer(socket.id);
      socket.leave(roomId);
      userRooms.delete(socket.id);
      if (room.getPlayers().length === 0) {
        await gameManager.removeRoom(roomId);
      }
    }
  });

  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.id}`);
    const roomId = userRooms.get(socket.id);
    if (roomId) {
      const room = await gameManager.getRoom(roomId);
      if (room) {
        room.setIo(io);
        await room.removePlayer(socket.id);
        if (room.getPlayers().length === 0) {
          await gameManager.removeRoom(roomId);
        }
      }
      userRooms.delete(socket.id);
    }
  });
};
