import { motion } from 'framer-motion';
import { GameState } from '../hooks/useGameLogic';

interface LobbyProps {
  gameState: GameState;
  toggleReady: () => void;
  leaveRoom: () => void;
}

import { getSocket } from '../lib/socket';

export const Lobby = ({ gameState, toggleReady, leaveRoom }: LobbyProps) => {
  const allReady = gameState.players.length > 0 && gameState.players.every(p => p.isReady);
  const myPlayer = gameState.players.find(p => p.id === getSocket().id);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-panel p-8 max-w-2xl w-full space-y-6 rounded-xl"
    >
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-widest">LOBBY</h2>
          <p className="text-electric-cyan font-mono text-sm">ROOM: {gameState.roomId}</p>
        </div>
        <button
          onClick={leaveRoom}
          className="text-red-400 hover:text-red-300 font-mono text-sm uppercase transition-colors"
        >
          [ Leave ]
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="text-white/50 text-xs font-mono uppercase tracking-wider">Connected Operatives ({gameState.players.length})</h3>
        <div className="grid gap-3">
          {gameState.players.map(player => (
            <div key={player.id} className="bg-slate-900/50 border border-white/5 rounded-lg p-4 flex justify-between items-center">
              <span className="text-white font-medium">{player.name}</span>
              <span className={`font-mono text-sm ${player.isReady ? 'text-electric-cyan' : 'text-slate-500'}`}>
                {player.isReady ? 'READY' : 'STANDBY'}
              </span>
            </div>
          ))}
          {gameState.players.length === 0 && (
            <div className="text-slate-500 font-mono text-sm text-center py-4">Waiting for operatives...</div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-white/10">
        <button
          onClick={toggleReady}
          className={`w-full py-4 rounded-lg font-bold tracking-widest transition-all uppercase ${
            myPlayer?.isReady
            ? 'bg-electric-cyan/20 border border-electric-cyan/50 text-electric-cyan'
            : 'bg-vivid-purple/20 border border-vivid-purple/50 text-vivid-purple hover:bg-vivid-purple/30 hover:text-white'
          }`}
        >
          Toggle Ready Status
        </button>
      </div>
      
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
