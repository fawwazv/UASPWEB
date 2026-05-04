'use client';

import { useState } from 'react';
import { useGameLogic } from '../hooks/useGameLogic';
import { motion, AnimatePresence } from 'framer-motion';
import { GameBoard } from '../components/GameBoard';
import { Lobby } from '../components/Lobby';

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
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [formError, setFormError] = useState('');

  const handleCreate = () => {
    if (!playerName.trim()) {
      setFormError('Masukkan nama pemain terlebih dahulu 👋');
      return;
    }
    setFormError('');
    createRoom((roomId) => {
      joinRoom(roomId, playerName);
    });
  };

  const handleJoin = () => {
    if (!playerName.trim()) {
      setFormError('Masukkan nama pemain terlebih dahulu 👋');
      return;
    }
    if (!joinId.trim()) {
      setFormError('Masukkan kode room terlebih dahulu 🔑');
      return;
    }
    setFormError('');
    joinRoom(joinId.trim().toUpperCase(), playerName);
  };

  // ── Connecting Screen ────────────────────────────────────────────────────────
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
            Menyiapkan arena pertempuran 🧠
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

        {/* ── Home Screen ─────────────────────────────────────────────────── */}
        {!gameState.roomId && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md space-y-6 md:space-y-8"
          >
            {/* Hero */}
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
                Siapa yang paling kuat ingatannya? 💪
              </p>
            </div>

            {/* Error */}
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
                  ⚠️ {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Player Name Input */}
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
                onKeyDown={e => e.key === 'Enter' && (activeTab === 'create' ? handleCreate() : handleJoin())}
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

            {/* Tab Switcher */}
            <div
              className="flex rounded-2xl p-1"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              {(['create', 'join'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-black transition-all"
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
                  {tab === 'create' ? '✨ Buat Room' : '🔑 Gabung Room'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'create' ? (
                <motion.div
                  key="create"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                >
                  <button
                    id="create-room-btn"
                    onClick={handleCreate}
                    className="btn-3d btn-purple w-full py-3 md:py-4 text-sm md:text-base"
                  >
                    🚀 Buat Room Baru
                  </button>
                  <AnimatePresence>
                    {formError && activeTab === 'create' && (
                      <motion.p
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="text-center text-xs font-bold mt-2"
                        style={{ color: '#f87171' }}
                      >
                        {formError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <p className="text-center text-xs font-semibold mt-2" style={{ color: 'var(--txt-faint)' }}>
                    Kamu akan menjadi host dan mengundang teman
                  </p>
                </motion.div>
              ) : (
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
                    ⚡ Gabung Sekarang
                  </button>
                  <AnimatePresence>
                    {formError && activeTab === 'join' && (
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <p className="text-center text-xs font-semibold" style={{ color: 'var(--txt-faint)' }}>
              Hafalkan posisi emoji · Drag & Drop · Menangkan skor tertinggi 🏆
            </p>
          </motion.div>
        )}

        {/* ── Lobby ─────────────────────────────────────────────────────────── */}
        {inLobby && (
          <Lobby
            key="lobby"
            gameState={gameState}
            toggleReady={toggleReady}
            startGame={startGame}
            leaveRoom={leaveRoom}
          />
        )}

        {/* ── Game Board ────────────────────────────────────────────────────── */}
        {inGame && (
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
