'use client';

import { useState } from 'react';
import { useGameLogic } from '../hooks/useGameLogic';
import { motion, AnimatePresence } from 'framer-motion';
import { GameBoard } from '../components/GameBoard';
import { Lobby } from '../components/Lobby';
import { getSocket } from '../lib/socket';

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
    isSocketConnected,
  } = useGameLogic();

  const [joinId, setJoinId] = useState('');
  const [playerName, setPlayerName] = useState('');

  const handleCreate = () => {
    if (!playerName.trim()) return alert('Masukkan nama pemainmu terlebih dahulu');
    createRoom((roomId) => {
      joinRoom(roomId, playerName);
    });
  };

  const handleJoin = () => {
    if (!playerName.trim()) return alert('Masukkan nama pemainmu terlebih dahulu');
    if (!joinId.trim()) return alert('Masukkan ID room terlebih dahulu');
    joinRoom(joinId.trim().toUpperCase(), playerName);
  };

  if (!isSocketConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-electric-cyan animate-pulse text-2xl font-mono">Menghubungkan ke Server...</div>
        <div className="text-white/20 font-mono text-sm">Menyinkronkan koneksi...</div>
      </div>
    );
  }

  const inGame = gameState.status === 'playing' || gameState.status === 'ended' || gameState.status === 'countdown';

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <AnimatePresence mode="wait">
        {!gameState.roomId ? (
          /* ── Home / Entry Screen ─────────────────────────── */
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel p-8 max-w-md w-full space-y-6 rounded-xl"
          >
            <div className="text-center space-y-3">
              <div className="text-5xl mb-2">🧠</div>
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-electric-cyan to-vivid-purple tracking-widest">
                MEMORY HACK
              </h1>
              <p className="text-slate-400 text-sm font-mono">Protokol Sinkronisasi Memori</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center font-mono">
                ⚠ {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-electric-cyan mb-1 uppercase tracking-wider">
                  Nama Pemain
                </label>
                <input
                  id="operative-name"
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-electric-cyan focus:ring-1 focus:ring-electric-cyan transition-all font-mono"
                  placeholder="Masukkan nama panggilanmu"
                />
              </div>

              <button
                id="create-room-btn"
                onClick={handleCreate}
                className="w-full bg-vivid-purple/20 border border-vivid-purple/50 text-vivid-purple hover:bg-vivid-purple/30 hover:text-white px-4 py-3 rounded-lg font-bold tracking-widest transition-all uppercase hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]"
              >
                + Buat Room
              </button>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-white/10" />
                <span className="flex-shrink-0 mx-4 text-white/30 text-xs uppercase font-mono">Atau Gabung</span>
                <div className="flex-grow border-t border-white/10" />
              </div>

              <div className="flex gap-2">
                <input
                  id="room-id-input"
                  type="text"
                  value={joinId}
                  onChange={e => setJoinId(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  className="flex-1 bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-electric-cyan transition-all font-mono uppercase tracking-widest"
                  placeholder="ID ROOM"
                  maxLength={8}
                />
                <button
                  id="join-room-btn"
                  onClick={handleJoin}
                  className="bg-electric-cyan/20 border border-electric-cyan/50 text-electric-cyan hover:bg-electric-cyan/30 hover:text-white px-6 py-2 rounded-lg font-bold tracking-widest transition-all uppercase hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  Gabung
                </button>
              </div>
            </div>
          </motion.div>
        ) : gameState.status === 'lobby' || gameState.status === 'countdown' ? (
          /* ── Lobby ──────────────────────────────────────── */
          <Lobby
            key="lobby"
            gameState={gameState}
            toggleReady={toggleReady}
            startGame={startGame}
            leaveRoom={leaveRoom}
          />
        ) : (
          /* ── Game Board ─────────────────────────────────── */
          <GameBoard
            key="game"
            gameState={gameState}
            submitAnswer={submitAnswer}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
