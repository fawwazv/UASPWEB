import { Server, Socket } from 'socket.io';
import { gameManager } from '../game/GameManager';
import { RoomSettings } from '../game/GameRoom';

// kirim daftar room publik ke semua client yang terhubung
const broadcastPublicRooms = async (io: Server) => {
  const rooms = await gameManager.getPublicRooms();
  io.emit('public_rooms_updated', rooms);
};

export const handleSocketConnection = (io: Server, socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  // map untuk lacak user ini ada di room mana (lokal per koneksi)
  const userRooms = new Map<string, string>(); 

  socket.on('get_public_rooms', async (callback) => {
    if (typeof callback === 'function') {
      callback(await gameManager.getPublicRooms());
    }
  });

  // host buat room baru, kirim settings dari modal setting room
  socket.on('create_room', async (arg1, arg2) => {
    let settings: Partial<RoomSettings> = {};
    let callback;

    if (typeof arg1 === 'function') {
      callback = arg1;
    } else {
      settings = arg1 || {};
      callback = arg2;
    }

    const roomId = await gameManager.createRoom(settings);
    const room = await gameManager.getRoom(roomId);
    if (room) {
      room.setIo(io);
    }
    if (typeof callback === 'function') {
      callback({ roomId });
    }
    // kalau publik, update daftar room untuk semua
    if (!settings.isPrivate) {
      await broadcastPublicRooms(io);
    }
  });

  socket.on('join_room', async ({ roomId, playerName }, callback) => {
    const room = await gameManager.getRoom(roomId);
    if (!room) {
      if (typeof callback === 'function') callback({ error: 'Room tidak ditemukan' });
      return;
    }

    if (room.status !== 'lobby') {
      if (typeof callback === 'function') callback({ error: 'Game sudah dimulai' });
      return;
    }

    // cek apakah room sudah penuh
    if (room.isFull()) {
      if (typeof callback === 'function') callback({ error: 'Room sudah penuh' });
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

  socket.on('game_start', async ({ roomId }, callback) => {
    const room = await gameManager.getRoom(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room tidak ditemukan' });
      return;
    }
    if (room.hostId !== socket.id) {
      socket.emit('error', { message: 'Hanya host yang bisa memulai game' });
      return;
    }
    if (!room.canStart()) {
      // kasih tahu alasan gagal supaya user tidak bingung
      const nonHost = room.getPlayers().filter(p => p.id !== room.hostId);
      const minPlayers = room.hostIsSpectator ? 2 : 1;
      if (nonHost.length < minPlayers) {
        socket.emit('error', { message: `Butuh minimal ${minPlayers} pemain lain untuk memulai` });
      } else {
        socket.emit('error', { message: 'Semua pemain harus siap terlebih dahulu' });
      }
      return;
    }
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
      const isPlaying = room.status === 'playing';
      const wasPrivate = room.isPrivate;

      if (isPlaying) {
        // kalau lagi main, keluarkan host dan lanjutkan game
        await room.removePlayer(socket.id);
        socket.leave(roomId);
        userRooms.delete(socket.id);
        
        if (room.getPlayers().length === 0) {
          await gameManager.removeRoom(roomId);
        } else {
          io.to(roomId).emit('opponent_left', { playerId: socket.id });
        }
      } else {
        // kalau di lobby, bubarkan room dan usir semua player
        io.to(roomId).emit('room_deleted');
        await gameManager.removeRoom(roomId);
        io.socketsLeave(roomId);
      }
      
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
      const isPlaying = room.status === 'playing';

      if (isHost && !isPlaying) {
        // host keluar saat lobby = bubarkan room
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
          if (isPlaying) {
            io.to(roomId).emit('opponent_left', { playerId: socket.id });
          } else {
            await room.resetToLobby();
          }
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
        const isPlaying = room.status === 'playing';

        if (isHost && !isPlaying) {
          io.to(roomId).emit('room_deleted');
          await gameManager.removeRoom(roomId);
          io.socketsLeave(roomId);
        } else {
          await room.removePlayer(socket.id);
          if (room.getPlayers().length === 0) {
            await gameManager.removeRoom(roomId);
          } else {
            if (isPlaying) {
              io.to(roomId).emit('opponent_left', { playerId: socket.id });
            } else {
              await room.resetToLobby();
            }
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
