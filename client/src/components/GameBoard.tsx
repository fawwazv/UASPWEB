'use client';

import { GameState, PlacedItem } from '../hooks/useGameLogic';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { DndContext, useDraggable, useDroppable, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { getSocket } from '../lib/socket';

// ─── Emoji Display ─────────────────────────────────────────────────────────────

const EmojiDisplay = ({ emoji, size = 'md' }: { emoji: string; size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClass = size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-3xl' : 'text-2xl';
  return (
    <span
      className={`${sizeClass} select-none leading-none`}
      style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}
      role="img"
    >
      {emoji}
    </span>
  );
};

// ─── Droppable Cell ─────────────────────────────────────────────────────────────

const DroppableCell = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`w-16 h-16 rounded-xl border-2 transition-all flex items-center justify-center
        ${isOver ? 'border-vivid-purple bg-vivid-purple/20 scale-105' : 'border-white/10 bg-slate-900/50'}`}
    >
      {children}
    </div>
  );
};

// ─── Droppable Pool ─────────────────────────────────────────────────────────────

const DroppablePool = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`p-4 rounded-xl border-2 transition-all min-h-[100px]
        ${isOver ? 'border-vivid-purple bg-vivid-purple/10' : 'border-white/5 bg-slate-900/30'}`}
    >
      {children}
    </div>
  );
};

// ─── Draggable Item ─────────────────────────────────────────────────────────────

const DraggableItem = ({ id, iconType }: { id: string; iconType: string }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`w-16 h-16 rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing
        ${isDragging
          ? 'shadow-2xl shadow-vivid-purple/50 bg-vivid-purple/40 border-vivid-purple scale-110 opacity-90'
          : 'bg-slate-800 border-white/20 hover:border-vivid-purple/50 hover:bg-slate-700'
        } border-2`}
    >
      <EmojiDisplay emoji={iconType} size="md" />
    </div>
  );
};

// ─── Animated Leaderboard ──────────────────────────────────────────────────────

interface LeaderboardProps {
  players: { id: string; name: string; score: number }[];
  myId: string;
}

const AnimatedLeaderboard = ({ players, myId }: LeaderboardProps) => {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const prevScoresRef = useRef<Record<string, number>>({});
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newFlash = new Set<string>();
    sorted.forEach(p => {
      const prev = prevScoresRef.current[p.id];
      if (prev !== undefined && p.score > prev) {
        newFlash.add(p.id);
      }
    });
    if (newFlash.size > 0) {
      setFlashIds(newFlash);
      const timer = setTimeout(() => setFlashIds(new Set()), 800);
      return () => clearTimeout(timer);
    }
    // Update reference scores
    const next: Record<string, number> = {};
    sorted.forEach(p => { next[p.id] = p.score; });
    prevScoresRef.current = next;
  }, [players]);

  return (
    <div className="glass-panel p-6 rounded-xl h-fit sticky top-4">
      <h3 className="text-xl font-bold text-white mb-6 tracking-widest border-b border-white/10 pb-4">
        📊 PAPAN SKOR
      </h3>
      <motion.div layout className="space-y-3">
        <AnimatePresence initial={false}>
          {sorted.map((player, idx) => {
            const isSelf = player.id === myId;
            const isFlashing = flashIds.has(player.id);
            const rankColors = ['text-yellow-400', 'text-slate-300', 'text-amber-600'];

            return (
              <motion.div
                key={player.id}
                layout
                layoutId={`lb-${player.id}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  scale: isFlashing ? [1, 1.04, 1] : 1,
                }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ layout: { type: 'spring', stiffness: 400, damping: 30 } }}
                className={`flex justify-between items-center p-3 rounded-lg border transition-all ${
                  isSelf
                    ? 'bg-electric-cyan/10 border-electric-cyan/40 shadow-[0_0_14px_rgba(6,182,212,0.35)]'
                    : 'bg-slate-900/50 border-white/5'
                } ${isFlashing ? 'shadow-[0_0_20px_rgba(168,85,247,0.5)]' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold w-6 text-center ${rankColors[idx] ?? 'text-slate-500'}`}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </span>
                  <div>
                    <span className={`font-medium text-sm ${isSelf ? 'text-electric-cyan' : 'text-white'}`}>
                      {player.name}
                    </span>
                    {isSelf && (
                      <span className="block text-[9px] font-mono text-electric-cyan/50 uppercase tracking-wider">Kamu</span>
                    )}
                  </div>
                </div>
                <motion.span
                  key={`score-${player.id}-${player.score}`}
                  initial={{ scale: 1.4, color: '#a855f7' }}
                  animate={{ scale: 1, color: isSelf ? '#06b6d4' : '#a855f7' }}
                  transition={{ duration: 0.4 }}
                  className="font-mono font-bold text-sm"
                >
                  {player.score.toLocaleString()}
                </motion.span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// ─── Timer Display ──────────────────────────────────────────────────────────────

const TimerDisplay = ({ seconds, isAnswer }: { seconds: number; isAnswer: boolean }) => {
  const safeSeconds = Math.max(0, seconds); // clamp to prevent -1:-1 display
  const isWarning = safeSeconds <= 10;
  const isCritical = safeSeconds <= 5;
  const mins = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60);
  const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <motion.div
      animate={
        isCritical
          ? { x: [-4, 4, -4, 4, 0], color: '#ef4444' }
          : isWarning
          ? { color: '#f97316' }
          : { color: '#ffffff' }
      }
      transition={{ duration: 0.4, repeat: isCritical ? Infinity : 0 }}
      className="text-5xl font-mono font-bold tabular-nums"
    >
      {formatted}
    </motion.div>
  );
};

// ─── Main GameBoard ─────────────────────────────────────────────────────────────

interface GameBoardProps {
  gameState: GameState;
  submitAnswer: (items: PlacedItem[], timeRemaining: number) => void;
}

export const GameBoard = ({ gameState, submitAnswer }: GameBoardProps) => {
  const isMemorize = gameState.phase === 'memorize';
  const myId = getSocket().id ?? '';

  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
  const [poolItems, setPoolItems] = useState<{ id: string; iconType: string }[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 1 } }),
  );

  // Re-init pool when entering answer phase or new level
  useEffect(() => {
    if (gameState.phase === 'answer' && poolItems.length === 0 && placedItems.length === 0) {
      const shuffled = [...gameState.itemsToMemorize].sort(() => Math.random() - 0.5);
      setPoolItems(shuffled.map(item => ({ id: item.id, iconType: item.iconType })));
      setSubmitted(false);
    } else if (gameState.phase === 'memorize') {
      setPlacedItems([]);
      setPoolItems([]);
      setSubmitted(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.phase, gameState.currentLevel]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (gameState.phase === 'answer' && gameState.timeRemaining <= 0 && !submitted) {
      setSubmitted(true);
      submitAnswer(placedItems, 0);
    }
  }, [gameState.timeRemaining, gameState.phase]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const itemId = active.id as string;
    const droppableId = over.id as string;

    if (droppableId === 'pool') {
      const idx = placedItems.findIndex(i => i.id === itemId);
      if (idx > -1) {
        const item = placedItems[idx];
        setPlacedItems(prev => prev.filter(i => i.id !== itemId));
        setPoolItems(prev => [...prev, { id: item.id, iconType: item.iconType }]);
      }
    } else if (droppableId.startsWith('cell-')) {
      const [, r, c] = droppableId.split('-');
      const row = parseInt(r);
      const col = parseInt(c);

      const existingIdx = placedItems.findIndex(i => i.row === row && i.col === col);

      let itemToPlace: { id: string; iconType: string } | undefined;

      const poolIdx = poolItems.findIndex(i => i.id === itemId);
      if (poolIdx > -1) {
        itemToPlace = poolItems[poolIdx];
        setPoolItems(prev => prev.filter(i => i.id !== itemId));
      } else {
        const pIdx = placedItems.findIndex(i => i.id === itemId);
        if (pIdx > -1) {
          itemToPlace = { id: placedItems[pIdx].id, iconType: placedItems[pIdx].iconType };
          setPlacedItems(prev => prev.filter(i => i.id !== itemId));
        }
      }

      if (itemToPlace) {
        if (existingIdx > -1) {
          const existing = placedItems[existingIdx];
          setPoolItems(prev => [...prev, { id: existing.id, iconType: existing.iconType }]);
          setPlacedItems(prev => prev.filter((_, i) => i !== existingIdx));
        }
        setPlacedItems(prev => [...prev, { ...itemToPlace!, row, col }]);
      }
    }
  };

  const handleSubmit = () => {
    if (gameState.phase === 'answer' && !submitted) {
      setSubmitted(true);
      submitAnswer(placedItems, gameState.timeRemaining);
    }
  };

  // ── Game Over Screen ──────────────────────────────────────────────────────────
  if (gameState.status === 'ended') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel p-8 max-w-2xl w-full text-center space-y-6 rounded-xl"
      >
        <div>
          <h2 className="text-4xl font-bold text-electric-cyan tracking-widest">SIMULASI SELESAI</h2>
          <p className="text-white/40 font-mono text-sm mt-2">Peringkat Akhir</p>
        </div>
        <div className="space-y-3">
          {gameState.finalLeaderboard.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex justify-between items-center p-4 rounded-xl border ${
                i === 0
                  ? 'bg-yellow-400/10 border-yellow-400/40 shadow-[0_0_20px_rgba(250,204,21,0.2)]'
                  : i === 1
                  ? 'bg-slate-300/10 border-slate-300/30'
                  : i === 2
                  ? 'bg-amber-600/10 border-amber-600/30'
                  : 'bg-slate-900/50 border-white/10'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                <span className="text-xl text-white font-semibold">{p.name}</span>
                {p.id === myId && (
                  <span className="text-[10px] font-mono text-electric-cyan border border-electric-cyan/30 px-2 py-0.5 rounded-full">KAMU</span>
                )}
              </div>
              <span className="text-2xl font-mono font-bold text-vivid-purple">{p.score.toLocaleString()}</span>
            </motion.div>
          ))}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-white/10 hover:bg-white/20 px-8 py-3 rounded-lg text-white font-bold uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          Kembali ke Lobby
        </button>
      </motion.div>
    );
  }

  // ── Game Board ────────────────────────────────────────────────────────────────
  const gridCols = `repeat(${gameState.gridSize}, minmax(0, 1fr))`;

  return (
    <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      {/* Left column: grid + pool */}
      <div className="space-y-6">
        {/* Level & timer header */}
        <div className="glass-panel p-4 rounded-xl flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white tracking-widest">LEVEL {gameState.currentLevel}</h2>
              <span
                className={`text-xs font-mono uppercase px-3 py-1 rounded-full border ${
                  isMemorize
                    ? 'text-electric-cyan border-electric-cyan/40 bg-electric-cyan/10'
                    : 'text-vivid-purple border-vivid-purple/40 bg-vivid-purple/10'
                }`}
              >
                {isMemorize ? '👁 Hafalkan' : '🧩 Jawab'}
              </span>
            </div>
            <p className="text-white/40 font-mono text-xs mt-1">
              Grid: {gameState.gridSize}×{gameState.gridSize} — {gameState.gridSize * gameState.gridSize} emoji
            </p>
          </div>
          <TimerDisplay seconds={gameState.timeRemaining} isAnswer={!isMemorize} />
        </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {/* Grid */}
          <div className="glass-panel p-6 rounded-xl flex items-center justify-center">
            <div className="grid gap-3" style={{ gridTemplateColumns: gridCols }}>
              {Array.from({ length: gameState.gridSize }).map((_, r) =>
                Array.from({ length: gameState.gridSize }).map((_, c) => {
                  const cellId = `cell-${r}-${c}`;
                  const memoryItem = isMemorize
                    ? gameState.itemsToMemorize.find(i => i.row === r && i.col === c)
                    : null;
                  const placedItem = !isMemorize
                    ? placedItems.find(i => i.row === r && i.col === c)
                    : null;

                  return (
                    <DroppableCell key={cellId} id={cellId}>
                      {isMemorize && memoryItem && (
                        <motion.div
                          initial={{ scale: 0, rotate: -10 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', delay: (r * gameState.gridSize + c) * 0.04 }}
                          className="w-14 h-14 bg-electric-cyan/10 border-2 border-electric-cyan/50 rounded-xl flex items-center justify-center"
                        >
                          <EmojiDisplay emoji={memoryItem.iconType} size="lg" />
                        </motion.div>
                      )}
                      {!isMemorize && placedItem && (
                        <DraggableItem id={placedItem.id} iconType={placedItem.iconType} />
                      )}
                    </DroppableCell>
                  );
                }),
              )}
            </div>
          </div>

          {/* Pool (answer phase only) */}
          <AnimatePresence>
            {!isMemorize && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="glass-panel p-6 rounded-xl"
              >
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-white/50 text-sm font-mono uppercase tracking-wider">Pool Pilihan</h3>
                    <p className="text-white/20 text-xs font-mono mt-0.5">
                      {poolItems.length} tersisa · {placedItems.length} ditempatkan
                    </p>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={submitted}
                    className={`px-6 py-2 rounded-lg font-bold uppercase tracking-wider transition-all ${
                      submitted
                        ? 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
                        : 'bg-vivid-purple/20 hover:bg-vivid-purple border border-vivid-purple text-white hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                    }`}
                  >
                    {submitted ? '✓ Dikirim' : 'Kirim Jawaban'}
                  </button>
                </div>
                <DroppablePool id="pool">
                  <div className="flex flex-wrap gap-3 min-h-[80px]">
                    {poolItems.map(item => (
                      <DraggableItem key={item.id} id={item.id} iconType={item.iconType} />
                    ))}
                    {poolItems.length === 0 && placedItems.length === 0 && (
                      <div className="w-full text-center text-white/20 py-4 font-mono text-sm">
                        Menunggu pool...
                      </div>
                    )}
                    {poolItems.length === 0 && placedItems.length > 0 && (
                      <div className="w-full text-center text-electric-cyan/40 py-4 font-mono text-sm">
                        Semua sudah ditempatkan — kirim jawaban!
                      </div>
                    )}
                  </div>
                </DroppablePool>
              </motion.div>
            )}
          </AnimatePresence>
        </DndContext>
      </div>

      {/* Right column: leaderboard */}
      <AnimatedLeaderboard players={gameState.players} myId={myId} />
    </div>
  );
};
