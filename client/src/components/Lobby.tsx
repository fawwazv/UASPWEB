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

export const Lobby = ({ gameState, toggleReady, startGame, leaveRoom }: LobbyProps) => {
  const myId = getSocket().id;
  const isHost = myId === gameState.hostId;
  const myPlayer = gameState.players.find(p => p.id === myId);

  // All non-host players must be ready (and at least one must exist)
  const nonHostPlayers = gameState.players.filter(p => p.id !== gameState.hostId);
  const canStart = nonHostPlayers.length > 0 && nonHostPlayers.every(p => p.isReady);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative glass-panel p-8 max-w-2xl w-full space-y-6 rounded-xl"
    >
      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-widest">LOBBY</h2>
          <p className="text-electric-cyan font-mono text-sm">ROOM: {gameState.roomId}</p>
        </div>
        <button
          onClick={leaveRoom}
          className="flex items-center gap-2 text-red-400 hover:text-red-300 font-mono text-sm uppercase transition-all border border-red-500/40 hover:border-red-400/70 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-lg"
        >
          <span>❌</span> Keluar
        </button>
      </div>

      {/* Player list */}
      <div className="space-y-4">
        <h3 className="text-white/50 text-xs font-mono uppercase tracking-wider">
          Pemain Terhubung ({gameState.players.length})
        </h3>
        <div className="grid gap-3">
          <AnimatePresence>
            {gameState.players.map(player => {
              const isPlayerHost = player.id === gameState.hostId;
              const isSelf = player.id === myId;

              return (
                <motion.div
                  key={player.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={`rounded-lg p-4 flex justify-between items-center border transition-all ${
                    isSelf
                      ? 'bg-electric-cyan/5 border-electric-cyan/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                      : 'bg-slate-900/50 border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">{player.name}</span>
                    {isPlayerHost && (
                      <span className="text-[10px] font-mono bg-vivid-purple/30 text-vivid-purple border border-vivid-purple/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        HOST
                      </span>
                    )}
                    {isSelf && !isPlayerHost && (
                      <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">You</span>
                    )}
                  </div>
                  <span
                    className={`font-mono text-sm ${
                      isPlayerHost
                        ? 'text-vivid-purple'
                        : player.isReady
                        ? 'text-electric-cyan'
                        : 'text-slate-500'
                    }`}
                  >
                    {isPlayerHost ? 'KOMANDAN' : player.isReady ? '✓ SIAP' : 'MENUNGGU'}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {gameState.players.length === 0 && (
            <div className="text-slate-500 font-mono text-sm text-center py-4">
              Menunggu pemain...
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="pt-4 border-t border-white/10 space-y-3">
        {isHost ? (
          /* HOST: Start Game button */
          <div className="space-y-2">
            <button
              onClick={startGame}
              disabled={!canStart}
              className={`w-full py-4 rounded-lg font-bold tracking-widest transition-all uppercase ${
                canStart
                  ? 'bg-gradient-to-r from-electric-cyan/20 to-vivid-purple/20 border border-electric-cyan/60 text-white hover:from-electric-cyan/30 hover:to-vivid-purple/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer'
                  : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              {canStart ? '▶ Mulai Permainan' : '⏳ Menunggu Pemain...'}
            </button>
            <p className="text-center text-xs font-mono text-white/30">
              {canStart
                ? 'Semua pemain siap — kamu bisa mulai'
                : `${nonHostPlayers.filter(p => p.isReady).length} / ${nonHostPlayers.length} pemain siap`}
            </p>
          </div>
        ) : (
          /* NON-HOST: Ready toggle */
          <button
            onClick={toggleReady}
            className={`w-full py-4 rounded-lg font-bold tracking-widest transition-all uppercase ${
              myPlayer?.isReady
                ? 'bg-electric-cyan/20 border border-electric-cyan/50 text-electric-cyan'
                : 'bg-vivid-purple/20 border border-vivid-purple/50 text-vivid-purple hover:bg-vivid-purple/30 hover:text-white'
            }`}
          >
            {myPlayer?.isReady ? '✓ Siap — Klik untuk Batal' : 'Klik untuk Siap'}
          </button>
        )}
      </div>

      {/* Countdown overlay */}
      {gameState.status === 'countdown' && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <motion.div
            key={gameState.countdown}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="text-8xl font-bold text-electric-cyan"
          >
            {gameState.countdown}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
