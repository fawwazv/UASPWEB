'use client';

import { useState } from 'react';
import { useGameLogic } from '../hooks/useGameLogic';
import { motion, AnimatePresence } from 'framer-motion';
import { GameBoard } from '../components/GameBoard';
import { Lobby } from '../components/Lobby';

export default function Home() {
  const { gameState, error, createRoom, joinRoom, toggleReady, submitAnswer, leaveRoom, isSocketConnected } = useGameLogic();
  const [joinId, setJoinId] = useState('');
  const [playerName, setPlayerName] = useState('');

  const handleCreate = () => {
    if (!playerName.trim()) return alert('Please enter your name');
    createRoom((roomId) => {
      joinRoom(roomId, playerName);
    });
  };

  const handleJoin = () => {
    if (!playerName.trim()) return alert('Please enter your name');
    if (!joinId.trim()) return alert('Please enter a room ID');
    joinRoom(joinId, playerName);
  };

  if (!isSocketConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-electric-cyan animate-pulse text-2xl font-mono">Connecting to Server...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {!gameState.roomId ? (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel p-8 max-w-md w-full space-y-6 rounded-xl"
          >
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-electric-cyan to-vivid-purple">
                MEMORY HACK
              </h1>
              <p className="text-slate-400 text-sm font-mono">Neural Link Synchronization</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-electric-cyan mb-1 uppercase tracking-wider">Operative Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-electric-cyan focus:ring-1 focus:ring-electric-cyan transition-all"
                  placeholder="Enter your name"
                />
              </div>

              <button
                onClick={handleCreate}
                className="w-full bg-vivid-purple/20 border border-vivid-purple/50 text-vivid-purple hover:bg-vivid-purple/30 hover:text-white px-4 py-3 rounded-lg font-bold tracking-widest transition-all uppercase"
              >
                Create Room
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-white/30 text-xs uppercase font-mono">Or Join</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-electric-cyan transition-all"
                  placeholder="ROOM ID"
                />
                <button
                  onClick={handleJoin}
                  className="bg-electric-cyan/20 border border-electric-cyan/50 text-electric-cyan hover:bg-electric-cyan/30 hover:text-white px-6 py-2 rounded-lg font-bold tracking-widest transition-all uppercase"
                >
                  Join
                </button>
              </div>
            </div>
          </motion.div>
        ) : gameState.status === 'lobby' ? (
          <Lobby
            key="lobby"
            gameState={gameState}
            toggleReady={toggleReady}
            leaveRoom={leaveRoom}
          />
        ) : (
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
