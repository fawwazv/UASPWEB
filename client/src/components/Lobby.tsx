'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { GameState } from '../hooks/useGameLogic';
import { getSocket } from '../lib/socket';

interface LobbyProps {
  gameState: GameState;
  toggleReady: () => void;
  startGame: () => void;
  leaveRoom: () => void;
}

// Deterministic color per player based on their name's char code sum
const PLAYER_COLORS = [
  { bg: 'rgba(139,92,246,0.25)', border: 'rgba(139,92,246,0.6)', text: '#a78bfa', shadow: 'rgba(139,92,246,0.3)' },
  { bg: 'rgba(6,182,212,0.2)',   border: 'rgba(6,182,212,0.6)',   text: '#67e8f9', shadow: 'rgba(6,182,212,0.3)' },
  { bg: 'rgba(236,72,153,0.2)',  border: 'rgba(236,72,153,0.6)',  text: '#f9a8d4', shadow: 'rgba(236,72,153,0.3)' },
  { bg: 'rgba(245,158,11,0.2)',  border: 'rgba(245,158,11,0.6)',  text: '#fcd34d', shadow: 'rgba(245,158,11,0.3)' },
  { bg: 'rgba(16,185,129,0.2)',  border: 'rgba(16,185,129,0.6)',  text: '#6ee7b7', shadow: 'rgba(16,185,129,0.3)' },
  { bg: 'rgba(249,115,22,0.2)',  border: 'rgba(249,115,22,0.6)',  text: '#fdba74', shadow: 'rgba(249,115,22,0.3)' },
];

function getPlayerColor(idx: number) {
  return PLAYER_COLORS[idx % PLAYER_COLORS.length];
}

// Avatar initials with color
const PlayerAvatar = ({ name, idx }: { name: string; idx: number }) => {
  const color = getPlayerColor(idx);
  return (
    <div
      className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center text-xs md:text-sm font-black shrink-0"
      style={{ background: color.bg, border: `2px solid ${color.border}`, color: color.text }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
};

export const Lobby = ({ gameState, toggleReady, startGame, leaveRoom }: LobbyProps) => {
  const myId = getSocket().id;
  const isHost = myId === gameState.hostId;
  const myPlayer = gameState.players.find(p => p.id === myId);

  const nonHostPlayers = gameState.players.filter(p => p.id !== gameState.hostId);
  const readyCount = nonHostPlayers.filter(p => p.isReady).length;
  const canStart = nonHostPlayers.length > 0 && readyCount === nonHostPlayers.length;

  return (
    <motion.div
      key="lobby"
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="relative glass-card rounded-3xl p-6 md:p-8 w-full max-w-xl space-y-5 md:space-y-6"
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-black text-white">Ruang Tunggu</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--txt-muted)' }}>
              Kode Room:
            </span>
            <span
              className="text-lg md:text-xl font-black tracking-[0.2em] px-3 py-0.5 rounded-xl"
              style={{
                background: 'rgba(139,92,246,0.2)',
                border: '1.5px solid rgba(139,92,246,0.5)',
                color: '#a78bfa',
              }}
            >
              {gameState.roomId}
            </span>
          </div>
        </div>
        <button
          id="leave-room-btn"
          onClick={leaveRoom}
          className="btn-3d btn-red px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm"
        >
          ✕ Keluar
        </button>
      </div>

      {/* ── Share hint ───────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 md:gap-3 rounded-2xl px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm font-bold"
        style={{ background: 'rgba(6,182,212,0.08)', border: '1.5px solid rgba(6,182,212,0.2)', color: 'var(--clr-cyan-lt)' }}
      >
        <span className="text-base md:text-lg">💡</span>
        <span>Bagikan kode room ke temanmu agar mereka bisa bergabung!</span>
      </div>

      {/* ── Player List ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--txt-muted)' }}>
            Pemain ({gameState.players.length})
          </h3>
          {nonHostPlayers.length > 0 && (
            <span className="text-xs font-bold" style={{ color: 'var(--txt-muted)' }}>
              {readyCount}/{nonHostPlayers.length} siap
            </span>
          )}
        </div>

        <div className="space-y-2">
          <AnimatePresence>
            {gameState.players.map((player, idx) => {
              const isPlayerHost = player.id === gameState.hostId;
              const isSelf = player.id === myId;
              const color = getPlayerColor(idx);

              return (
                <motion.div
                  key={player.id}
                  layout
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  className="flex items-center gap-2 md:gap-3 rounded-2xl px-3 py-2 md:px-4 md:py-3"
                  style={{
                    background: isSelf ? color.bg : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${isSelf ? color.border : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: isSelf ? `0 0 20px ${color.shadow}` : 'none',
                  }}
                >
                  <PlayerAvatar name={player.name} idx={idx} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm md:text-base text-white truncate">{player.name}</span>
                      {isSelf && (
                        <span
                          className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: color.bg, border: `1px solid ${color.border}`, color: color.text }}
                        >
                          Kamu
                        </span>
                      )}
                      {isPlayerHost && (
                        <span
                          className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.5)', color: '#fcd34d' }}
                        >
                          👑 Host
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ready status badge */}
                  <div
                    className="text-[10px] md:text-xs font-black px-2 py-1 md:px-3 md:py-1.5 rounded-xl shrink-0"
                    style={
                      isPlayerHost
                        ? { background: 'rgba(245,158,11,0.15)', color: '#fcd34d' }
                        : player.isReady
                        ? { background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#6ee7b7' }
                        : { background: 'rgba(255,255,255,0.05)', color: 'var(--txt-faint)' }
                    }
                  >
                    {isPlayerHost ? '⚡ Host' : player.isReady ? '✓ Siap' : '⏳ Belum'}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {gameState.players.length === 0 && (
            <div className="text-center py-8 text-sm font-bold" style={{ color: 'var(--txt-faint)' }}>
              Menunggu pemain bergabung...
            </div>
          )}
        </div>
      </div>

      {/* ── Action Buttons ───────────────────────────────────────────────── */}
      <div className="pt-2">
        {isHost ? (
          <div className="space-y-3">
            <button
              id="start-game-btn"
              onClick={startGame}
              disabled={!canStart}
              className="btn-3d w-full py-3 md:py-4 text-sm md:text-base"
              style={
                canStart
                  ? {}
                  : {
                      background: 'rgba(255,255,255,0.05)',
                      border: '2px solid rgba(255,255,255,0.08)',
                      color: 'var(--txt-faint)',
                      borderRadius: '16px',
                      fontWeight: 800,
                      cursor: 'not-allowed',
                    }
              }
            >
              {/* We can't use btn-green class with disabled conditional so use inline style */}
              {canStart ? (
                <span
                  className="btn-3d btn-green w-full py-3 md:py-4 text-sm md:text-base block"
                  style={{ pointerEvents: 'none' }}
                >
                  ▶ Mulai Permainan!
                </span>
              ) : (
                `⏳ ${readyCount}/${nonHostPlayers.length} pemain siap...`
              )}
            </button>
            {!canStart && nonHostPlayers.length === 0 && (
              <p className="text-center text-xs font-bold" style={{ color: 'var(--txt-faint)' }}>
                Butuh minimal 1 pemain lain untuk memulai
              </p>
            )}
          </div>
        ) : (
          <motion.button
            id="ready-btn"
            onClick={toggleReady}
            whileTap={{ scale: 0.97 }}
            className={`btn-3d w-full py-3 md:py-4 text-sm md:text-base ${myPlayer?.isReady ? 'btn-green' : 'btn-purple'}`}
          >
            {myPlayer?.isReady ? '✓ Siap! (Klik untuk batal)' : '🙋 Klik untuk Siap'}
          </motion.button>
        )}
      </div>

      {/* ── Countdown Overlay ────────────────────────────────────────────── */}
      <AnimatePresence>
        {gameState.status === 'countdown' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl"
            style={{ background: 'rgba(13,13,26,0.88)', backdropFilter: 'blur(12px)' }}
          >
            <motion.p
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-sm font-black uppercase tracking-widest mb-4"
              style={{ color: 'var(--txt-muted)' }}
            >
              Game dimulai dalam...
            </motion.p>
            <motion.div
              key={gameState.countdown}
              initial={{ scale: 2.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="text-7xl md:text-9xl font-black"
              style={{
                background: 'linear-gradient(135deg, #a78bfa, #67e8f9)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {gameState.countdown}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
