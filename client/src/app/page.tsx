'use client';

import { useState, useEffect } from 'react';
import { useGameLogic, RoomSettings } from '../hooks/useGameLogic';
import { motion, AnimatePresence } from 'framer-motion';
import { GameBoard } from '../components/GameBoard';
import { Lobby } from '../components/Lobby';
import { getSocket } from '../lib/socket';

export interface PublicRoomInfo {
  roomId: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number | null;
  maxLevel: number;
}

// default setting room kalau host tidak mengubah apapun
const defaultSettings: RoomSettings = {
  maxLevel: 10,
  maxPlayers: null,
  hostIsSpectator: false,
  isPrivate: false,
};

export default function Home() {
  const {
    gameState,
    error,
    createRoom,
    joinRoom,
    toggleReady,
    startGame,
    submitAnswer,
    leaveRoom,
    deleteRoom,
    isSocketConnected,
  } = useGameLogic();

  const [joinId, setJoinId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'join' | 'public'>('create');
  const [formError, setFormError] = useState('');
  const [publicRooms, setPublicRooms] = useState<PublicRoomInfo[]>([]);

  // state untuk modal setting room
  const [showSettings, setShowSettings] = useState(false);
  const [roomSettings, setRoomSettings] = useState<RoomSettings>(defaultSettings);
  // state khusus max players, untuk handle input custom
  const [useMaxPlayers, setUseMaxPlayers] = useState(false);
  const [maxPlayersInput, setMaxPlayersInput] = useState('4');

  useEffect(() => {
    if (isSocketConnected) {
      const socket = getSocket();
      socket.emit('get_public_rooms', (rooms: PublicRoomInfo[]) => {
        setPublicRooms(rooms);
      });

      const onPublicRoomsUpdated = (rooms: PublicRoomInfo[]) => {
        setPublicRooms(rooms);
      };

      socket.on('public_rooms_updated', onPublicRoomsUpdated);
      return () => {
        socket.off('public_rooms_updated', onPublicRoomsUpdated);
      };
    }
  }, [isSocketConnected]);

  // klik "Buat Room" di tab create -> validasi nama dulu, baru buka modal setting
  const handleOpenSettings = () => {
    if (!playerName.trim()) {
      setFormError('Masukkan nama pemain terlebih dahulu');
      return;
    }
    setFormError('');
    setShowSettings(true);
  };

  // tombol konfirmasi di modal setting -> buat room dengan settings yang dipilih
  const handleCreate = () => {
    const finalSettings: RoomSettings = {
      ...roomSettings,
      maxPlayers: useMaxPlayers ? (parseInt(maxPlayersInput) || 4) : null,
    };
    setShowSettings(false);
    createRoom(finalSettings, (roomId) => {
      joinRoom(roomId, playerName);
    });
  };

  const handleJoin = () => {
    if (!playerName.trim()) {
      setFormError('Masukkan nama pemain terlebih dahulu');
      return;
    }
    if (!joinId.trim()) {
      setFormError('Masukkan kode room terlebih dahulu');
      return;
    }
    setFormError('');
    joinRoom(joinId.trim().toUpperCase(), playerName);
  };

  // layar loading saat socket belum konek
  if (!isSocketConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          className="w-16 h-16 rounded-full border-4 border-transparent"
          style={{
            borderTopColor: 'var(--clr-purple)',
            borderRightColor: 'var(--clr-cyan)',
          }}
        />
        <div className="text-center space-y-1">
          <p className="text-xl font-bold text-white">Menghubungkan ke server...</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--txt-muted)' }}>
            Harap tunggu sebentar
          </p>
        </div>
      </div>
    );
  }

  const inLobby = !!gameState.roomId && (gameState.status === 'lobby' || gameState.status === 'countdown');
  const inGame = gameState.status === 'playing' || gameState.status === 'ended';

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-4 md:p-8">
      <AnimatePresence mode="wait">

        {/* halaman utama sebelum masuk room */}
        {!gameState.roomId && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md space-y-6 md:space-y-8"
          >
            {/* header / hero */}
            <div className="text-center space-y-3">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                className="text-6xl md:text-7xl leading-none select-none"
              >
                🧠
              </motion.div>
              <h1
                className="text-4xl md:text-5xl font-black tracking-tight leading-none"
                style={{
                  background: 'linear-gradient(135deg, #a78bfa, #06b6d4, #ec4899)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Memory Hack
              </h1>
              <p className="font-bold text-xs md:text-sm" style={{ color: 'var(--txt-muted)' }}>
                Siapa yang paling kuat ingatannya?
              </p>
            </div>

            {/* error dari server */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl p-3 text-center text-sm font-bold"
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1.5px solid rgba(239, 68, 68, 0.35)',
                    color: '#fca5a5',
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* input nama pemain */}
            <div className="space-y-2">
              <label
                htmlFor="player-name"
                className="block text-xs font-black uppercase tracking-widest"
                style={{ color: 'var(--clr-cyan-lt)' }}
              >
                Nama Pemain
              </label>
              <input
                id="player-name"
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (activeTab === 'create' ? handleOpenSettings() : handleJoin())}
                className="w-full rounded-2xl px-4 py-3 md:px-5 md:py-3.5 text-sm md:text-base font-bold text-white outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '2px solid rgba(255,255,255,0.1)',
                  caretColor: 'var(--clr-purple-lt)',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--clr-purple-lt)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.2)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Masukkan nama panggilanmu..."
                maxLength={20}
              />
            </div>

            {/* pesan error validasi form */}
            <AnimatePresence>
              {formError && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="text-center text-xs font-bold"
                  style={{ color: '#f87171' }}
                >
                  {formError}
                </motion.p>
              )}
            </AnimatePresence>

            {/* tab switcher: buat / gabung / publik */}
            <div
              className="flex rounded-2xl p-1"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              {(['create', 'join', 'public'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 py-2 md:py-2.5 rounded-xl text-[11px] md:text-sm font-black transition-all"
                  style={
                    activeTab === tab
                      ? {
                          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                          color: '#fff',
                          boxShadow: '0 4px 12px rgba(139,92,246,0.4)',
                        }
                      : { color: 'var(--txt-muted)' }
                  }
                >
                  {tab === 'create' ? 'Buat' : tab === 'join' ? 'Gabung' : 'Publik'}
                </button>
              ))}
            </div>

            {/* konten tab */}
            <AnimatePresence mode="wait">
              {activeTab === 'create' ? (
                <motion.div
                  key="create"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <p className="text-xs font-semibold text-center" style={{ color: 'var(--txt-faint)' }}>
                    Kamu akan menjadi host. Setting room bisa diatur di langkah berikutnya.
                  </p>
                  <button
                    id="create-room-btn"
                    onClick={handleOpenSettings}
                    className="btn-3d btn-purple w-full py-3 md:py-4 text-sm md:text-base"
                  >
                    Buat Room Baru
                  </button>
                </motion.div>
              ) : activeTab === 'join' ? (
                <motion.div
                  key="join"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  <input
                    id="room-code-input"
                    type="text"
                    value={joinId}
                    onChange={e => setJoinId(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                    className="w-full rounded-2xl px-4 py-3 md:px-5 md:py-3.5 text-center text-xl md:text-2xl font-black tracking-[0.3em] uppercase text-white outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '2px solid rgba(255,255,255,0.1)',
                      caretColor: 'var(--clr-cyan-lt)',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = 'var(--clr-cyan-lt)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,0.2)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                      e.target.style.boxShadow = 'none';
                    }}
                    placeholder="XXXXXX"
                    maxLength={8}
                  />
                  <button
                    id="join-room-btn"
                    onClick={handleJoin}
                    className="btn-3d btn-cyan w-full py-3 md:py-4 text-sm md:text-base"
                  >
                    Gabung Sekarang
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="public"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}>
                    {publicRooms.length > 0 ? (
                      publicRooms.map(room => (
                        <div key={room.roomId} className="flex items-center justify-between p-3 rounded-2xl" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-white truncate">{room.hostName}&apos;s Room</p>
                            <div className="flex gap-3 items-center mt-0.5 flex-wrap">
                              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--clr-cyan-lt)' }}>ID: {room.roomId}</p>
                              <p className="text-[10px] font-bold" style={{ color: 'var(--txt-muted)' }}>
                                {room.playerCount} pemain
                                {room.maxPlayers ? ` / maks ${room.maxPlayers}` : ''}
                              </p>
                              <p className="text-[10px] font-bold" style={{ color: 'var(--txt-faint)' }}>
                                s/d level {room.maxLevel}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (!playerName.trim()) {
                                setFormError('Masukkan nama pemain terlebih dahulu');
                                return;
                              }
                              setFormError('');
                              joinRoom(room.roomId, playerName);
                            }}
                            className="ml-3 px-3 py-1.5 rounded-xl text-xs font-black transition-transform hover:scale-105"
                            style={{ background: 'var(--clr-cyan)', color: '#0f172a', boxShadow: '0 2px 8px rgba(6,182,212,0.4)' }}
                          >
                            Gabung
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 px-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <p className="text-sm font-bold" style={{ color: 'var(--txt-muted)' }}>Belum ada room publik</p>
                        <p className="text-xs font-semibold mt-1" style={{ color: 'var(--txt-faint)' }}>Jadilah yang pertama membuat room!</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* footer kecil */}
            <p className="text-center text-xs font-semibold" style={{ color: 'var(--txt-faint)' }}>
              Hafalkan posisi emoji · Drag &amp; Drop · Raih skor tertinggi
            </p>
          </motion.div>
        )}

        {/* lobby / ruang tunggu */}
        {inLobby && (
          <Lobby
            key="lobby"
            gameState={gameState}
            toggleReady={toggleReady}
            startGame={startGame}
            leaveRoom={leaveRoom}
            deleteRoom={deleteRoom}
          />
        )}

        {/* papan game */}
        {inGame && (
          <GameBoard
            key="game"
            gameState={gameState}
            submitAnswer={submitAnswer}
            leaveRoom={leaveRoom}
          />
        )}

      </AnimatePresence>

      {/* modal setting room, muncul saat host klik "Buat Room Baru" */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md space-y-6"
              onClick={e => e.stopPropagation()}
            >
              {/* judul modal */}
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-white">Setting Room</h2>
                <p className="text-xs font-semibold" style={{ color: 'var(--txt-muted)' }}>
                  Atur preferensi room sebelum membuat
                </p>
              </div>

              <div className="space-y-5">

                {/* setting: sampai level berapa */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-widest" style={{ color: 'var(--clr-cyan-lt)' }}>
                    Batas Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([5, 8, 10] as const).map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setRoomSettings(s => ({ ...s, maxLevel: lvl }))}
                        className="py-2.5 rounded-xl text-sm font-black transition-all"
                        style={
                          roomSettings.maxLevel === lvl
                            ? { background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', boxShadow: '0 4px 12px rgba(139,92,246,0.4)' }
                            : { background: 'rgba(255,255,255,0.05)', color: 'var(--txt-muted)', border: '1px solid rgba(255,255,255,0.08)' }
                        }
                      >
                        Level {lvl}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] font-semibold" style={{ color: 'var(--txt-faint)' }}>
                    Game akan selesai saat mencapai level yang dipilih
                  </p>
                </div>

                {/* setting: batas jumlah pemain */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-widest" style={{ color: 'var(--clr-cyan-lt)' }}>
                    Batas Pemain
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setUseMaxPlayers(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all"
                      style={
                        !useMaxPlayers
                          ? { background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', boxShadow: '0 4px 12px rgba(139,92,246,0.4)' }
                          : { background: 'rgba(255,255,255,0.05)', color: 'var(--txt-muted)', border: '1px solid rgba(255,255,255,0.08)' }
                      }
                    >
                      Tidak dibatasi
                    </button>
                    <button
                      onClick={() => setUseMaxPlayers(true)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all"
                      style={
                        useMaxPlayers
                          ? { background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', boxShadow: '0 4px 12px rgba(139,92,246,0.4)' }
                          : { background: 'rgba(255,255,255,0.05)', color: 'var(--txt-muted)', border: '1px solid rgba(255,255,255,0.08)' }
                      }
                    >
                      Dibatasi
                    </button>
                  </div>
                  {useMaxPlayers && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <input
                        type="number"
                        min={2}
                        max={20}
                        value={maxPlayersInput}
                        onChange={e => setMaxPlayersInput(e.target.value)}
                        className="w-full rounded-xl px-4 py-2.5 text-center text-base font-black text-white outline-none transition-all mt-2"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '2px solid rgba(139,92,246,0.4)',
                          caretColor: 'var(--clr-purple-lt)',
                        }}
                        placeholder="Maks. pemain (min. 2)"
                      />
                    </motion.div>
                  )}
                </div>

                {/* setting: mode host */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-widest" style={{ color: 'var(--clr-cyan-lt)' }}>
                    Mode Host
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRoomSettings(s => ({ ...s, hostIsSpectator: false }))}
                      className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all"
                      style={
                        !roomSettings.hostIsSpectator
                          ? { background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', boxShadow: '0 4px 12px rgba(139,92,246,0.4)' }
                          : { background: 'rgba(255,255,255,0.05)', color: 'var(--txt-muted)', border: '1px solid rgba(255,255,255,0.08)' }
                      }
                    >
                      Ikut Bermain
                    </button>
                    <button
                      onClick={() => setRoomSettings(s => ({ ...s, hostIsSpectator: true }))}
                      className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all"
                      style={
                        roomSettings.hostIsSpectator
                          ? { background: 'linear-gradient(135deg, #06b6d4, #0e7490)', color: '#fff', boxShadow: '0 4px 12px rgba(6,182,212,0.4)' }
                          : { background: 'rgba(255,255,255,0.05)', color: 'var(--txt-muted)', border: '1px solid rgba(255,255,255,0.08)' }
                      }
                    >
                      Spectate
                    </button>
                  </div>
                  <p className="text-[10px] font-semibold" style={{ color: 'var(--txt-faint)' }}>
                    {roomSettings.hostIsSpectator
                      ? 'Kamu hanya mengawasi, tidak ikut dihitung skor'
                      : 'Kamu ikut bermain dan bersaing dengan pemain lain'}
                  </p>
                </div>

                {/* setting: visibilitas room */}
                <div className="flex items-center justify-between p-3 md:p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">Room Private</p>
                    <p className="text-[10px] md:text-xs font-semibold" style={{ color: 'var(--txt-faint)' }}>Sembunyikan dari daftar publik</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={roomSettings.isPrivate}
                      onChange={(e) => setRoomSettings(s => ({ ...s, isPrivate: e.target.checked }))}
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                  </label>
                </div>

              </div>

              {/* tombol aksi modal */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 py-3 rounded-2xl text-sm font-black transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--txt-muted)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Batal
                </button>
                <button
                  id="confirm-create-room-btn"
                  onClick={handleCreate}
                  className="btn-3d btn-purple flex-1 py-3 text-sm"
                >
                  Buat Room
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
