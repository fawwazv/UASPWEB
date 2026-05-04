import { Server, Socket } from 'socket.io';
import { gameManager } from '../game/GameManager';

const broadcastPublicRooms = async (io: Server) => {
  const rooms = await gameManager.getPublicRooms();
  io.emit('public_rooms_updated', rooms);
};

export const handleSocketConnection = (io: Server, socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  // In a distributed Redis setup, userRooms map is local. 
  // It's okay because socket connections are also local to this node.
  const userRooms = new Map<string, string>(); 

  socket.on('get_public_rooms', async (callback) => {
    if (typeof callback === 'function') {
      callback(await gameManager.getPublicRooms());
    }
  });

  socket.on('create_room', async (arg1, arg2) => {
    let isPrivate = false;
    let callback;
    if (typeof arg1 === 'function') {
      callback = arg1;
    } else {
      isPrivate = arg1?.isPrivate || false;
      callback = arg2;
    }

    const roomId = await gameManager.createRoom(isPrivate);
    const room = await gameManager.getRoom(roomId);
    if (room) {
      room.setIo(io);
    }
    if (typeof callback === 'function') {
      callback({ roomId });
    }
    if (!isPrivate) {
      await broadcastPublicRooms(io);
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

    if (!room.isPrivate) {
      await broadcastPublicRooms(io);
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

  socket.on('delete_room', async ({ roomId }) => {
    const room = await gameManager.getRoom(roomId);
    if (room && room.hostId === socket.id) {
      const wasPrivate = room.isPrivate;
      io.to(roomId).emit('room_deleted');
      await gameManager.removeRoom(roomId);
      io.socketsLeave(roomId);
      
      if (!wasPrivate) {
        await broadcastPublicRooms(io);
      }
    }
  });

  socket.on('leave_room', async ({ roomId }) => {
    const room = await gameManager.getRoom(roomId);
    if (room) {
      room.setIo(io);
      const wasPrivate = room.isPrivate;
      const isHost = room.hostId === socket.id;

      if (isHost) {
        io.to(roomId).emit('room_deleted');
        await gameManager.removeRoom(roomId);
        io.socketsLeave(roomId);
      } else {
        await room.removePlayer(socket.id);
        socket.leave(roomId);
        userRooms.delete(socket.id);
        
        if (room.getPlayers().length === 0) {
          await gameManager.removeRoom(roomId);
        } else {
          await room.resetToLobby();
        }
      }
      
      if (!wasPrivate) {
        await broadcastPublicRooms(io);
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
        const wasPrivate = room.isPrivate;
        const isHost = room.hostId === socket.id;

        if (isHost) {
          io.to(roomId).emit('room_deleted');
          await gameManager.removeRoom(roomId);
          io.socketsLeave(roomId);
        } else {
          await room.removePlayer(socket.id);
          if (room.getPlayers().length === 0) {
            await gameManager.removeRoom(roomId);
          } else {
            await room.resetToLobby();
          }
        }
        
        if (!wasPrivate) {
          await broadcastPublicRooms(io);
        }
      }
      userRooms.delete(socket.id);
    }
  });
};
