'use client';

import { GameState, PlacedItem } from '../hooks/useGameLogic';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import {
  DndContext, useDraggable, useDroppable,
  DragEndEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { getSocket } from '../lib/socket';

// ─── Emoji Display ──────────────────────────────────────────────────────────
const EmojiDisplay = ({ emoji, size = 'md' }: { emoji: string; size?: 'sm' | 'md' | 'lg' }) => {
  const sz = size === 'lg' ? 'text-3xl md:text-4xl' : size === 'md' ? 'text-2xl md:text-3xl' : 'text-lg md:text-xl';
  return (
    <span className={`${sz} select-none leading-none`}
      style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>
      {emoji}
    </span>
  );
};

// ─── Draggable Item ─────────────────────────────────────────────────────────
const DraggableItem = ({
  id, iconType, feedbackState, sizeClass = 'w-12 h-12 md:w-14 md:h-14'
}: { id: string; iconType: string; feedbackState?: 'correct' | 'wrong' | null; sizeClass?: string }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

  const mergedStyle: React.CSSProperties = {
    ...(feedbackState === 'correct' ? { border: '2px solid #10b981', boxShadow: '0 0 18px rgba(16,185,129,0.7), 0 4px 0 #064e3b', background: 'rgba(16,185,129,0.2)' } : {}),
    ...(feedbackState === 'wrong'   ? { border: '2px solid #ef4444', boxShadow: '0 0 16px rgba(239,68,68,0.6)' } : {}),
    // Ghost when dragging — original stays faint in place
    ...(isDragging ? { opacity: 0.3 } : {}),
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={mergedStyle}
      {...listeners}
      {...attributes}
      layout
      animate={feedbackState === 'wrong' ? { x: [-6, 6, -5, 5, -3, 3, 0] } : {}}
      transition={feedbackState === 'wrong' ? { duration: 0.45 } : { layout: { type: 'spring', stiffness: 400, damping: 30 } }}
      className={`drag-chip flex items-center justify-center touch-none ${sizeClass}`}
    >
      <EmojiDisplay emoji={iconType} size="md" />
    </motion.div>
  );
};

// ─── Drag Overlay Item (follows cursor) ─────────────────────────────────────
const DragOverlayItem = ({ iconType, sizeClass = 'w-14 h-14 md:w-16 md:h-16' }: { iconType: string; sizeClass?: string }) => (
  <div
    className={`drag-chip flex items-center justify-center touch-none ${sizeClass}`}
    style={{
      transform: 'scale(1.15) rotate(4deg)',
      boxShadow: '0 12px 40px rgba(139,92,246,0.5)',
      border: '2px solid rgba(139,92,246,0.6)',
      background: 'rgba(139,92,246,0.18)',
      cursor: 'grabbing',
    }}
  >
    <EmojiDisplay emoji={iconType} size="md" />
  </div>
);

// ─── Droppable Cell ─────────────────────────────────────────────────────────
const DroppableCell = ({ id, children, size }: { id: string; children: React.ReactNode; size: number }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  const cellClass = size <= 2 ? 'w-16 h-16 md:w-20 md:h-20' : size <= 3 ? 'w-14 h-14 md:w-[72px] md:h-[72px]' : size <= 4 ? 'w-[50px] h-[50px] md:w-16 md:h-16' : 'w-11 h-11 md:w-14 md:h-14';
  return (
    <div
      ref={setNodeRef}
      className={`drop-cell flex items-center justify-center transition-all ${cellClass}`}
      style={{
        ...(isOver ? { borderColor: '#a78bfa', borderStyle: 'solid', background: 'rgba(139,92,246,0.18)', boxShadow: 'inset 0 0 16px rgba(139,92,246,0.25)' } : {}),
      }}
    >
      {children}
    </div>
  );
};

// ─── Droppable Pool ─────────────────────────────────────────────────────────
const DroppablePool = ({ children }: { children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'pool' });
  return (
    <div ref={setNodeRef} className="flex flex-wrap gap-3 min-h-[76px] p-2 rounded-2xl transition-all"
      style={isOver ? { background: 'rgba(139,92,246,0.08)', outline: '2px dashed rgba(139,92,246,0.4)' } : {}}>
      {children}
    </div>
  );
};

// ─── Leaderboard ────────────────────────────────────────────────────────────
const Leaderboard = ({ players, myId }: { players: { id: string; name: string; score: number }[]; myId: string }) => {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="glass-card rounded-3xl p-5 h-fit sticky top-4 space-y-4">
      <h3 className="text-base font-black text-white">📊 Papan Skor</h3>
      <motion.div layout className="space-y-2">
        <AnimatePresence initial={false}>
          {sorted.map((p, i) => {
            const isSelf = p.id === myId;
            return (
              <motion.div
                key={p.id} layout layoutId={`lb-${p.id}`}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ layout: { type: 'spring', stiffness: 400, damping: 30 } }}
                className="flex items-center justify-between rounded-xl px-3 py-2.5"
                style={{
                  background: isSelf ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${isSelf ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.07)'}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm w-5 text-center">{medals[i] ?? `#${i + 1}`}</span>
                  <div>
                    <p className="text-sm font-black text-white leading-none">{p.name}</p>
                    {isSelf && <p className="text-[10px] font-bold mt-0.5" style={{ color: '#a78bfa' }}>Kamu</p>}
                  </div>
                </div>
                <motion.span
                  key={p.score}
                  initial={{ scale: 1.4, color: '#a78bfa' }}
                  animate={{ scale: 1, color: isSelf ? '#a78bfa' : '#67e8f9' }}
                  className="text-sm font-black tabular-nums"
                >
                  {p.score.toLocaleString()}
                </motion.span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// ─── Timer ──────────────────────────────────────────────────────────────────
const Timer = ({ seconds }: { seconds: number; isAnswer: boolean }) => {
  const s = Math.max(0, seconds);
  const isCritical = s <= 5;
  const isWarning = s <= 10;
  const mins = Math.floor(s / 60).toString().padStart(2, '0');
  const secs = Math.floor(s % 60).toString().padStart(2, '0');
  return (
    <motion.div
      animate={isCritical
        ? { scale: [1, 1.08, 1], color: '#ef4444' }
        : isWarning ? { color: '#f97316' } : { color: '#ffffff' }}
      transition={{ duration: 0.5, repeat: isCritical ? Infinity : 0 }}
      className="text-3xl md:text-4xl font-black tabular-nums"
    >
      {mins}:{secs}
    </motion.div>
  );
};

// ─── Main GameBoard ──────────────────────────────────────────────────────────
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
  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'correct' | 'wrong'>>({});
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  const [levelCompleteNum, setLevelCompleteNum] = useState(0);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 1 } }));

  // Init pool when entering answer phase or reset on memorize
  useEffect(() => {
    if (gameState.phase === 'answer' && poolItems.length === 0 && placedItems.length === 0) {
      const shuffled = [...gameState.itemsToMemorize].sort(() => Math.random() - 0.5);
      setPoolItems(shuffled.map(i => ({ id: i.id, iconType: i.iconType })));
      setSubmitted(false);
      setFeedbackMap({});
    } else if (gameState.phase === 'memorize') {
      setPlacedItems([]);
      setPoolItems([]);
      setSubmitted(false);
      setFeedbackMap({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.phase, gameState.currentLevel]);

  // Handle answer_result feedback from server
  useEffect(() => {
    const socket = getSocket();
    const onResult = () => {
      // Build feedback map: compare placedItems vs itemsToMemorize
      const newMap: Record<string, 'correct' | 'wrong'> = {};
      placedItems.forEach(item => {
        const correct = gameState.itemsToMemorize.some(
          m => m.iconType === item.iconType && m.row === item.row && m.col === item.col,
        );
        newMap[item.id] = correct ? 'correct' : 'wrong';
      });
      setFeedbackMap(newMap);
    };
    socket.on('answer_result', onResult);
    return () => { socket.off('answer_result', onResult); };
  }, [placedItems, gameState.itemsToMemorize]);

  // Handle level_complete event
  useEffect(() => {
    const socket = getSocket();
    const onLevelComplete = (data: { level: number }) => {
      setLevelCompleteNum(data.level);
      setShowLevelComplete(true);
      setTimeout(() => setShowLevelComplete(false), 2500);
    };
    socket.on('level_complete', onLevelComplete);
    return () => { socket.off('level_complete', onLevelComplete); };
  }, []);

  // Auto-submit on timer expiry
  useEffect(() => {
    if (gameState.phase === 'answer' && gameState.timeRemaining <= 0 && !submitted) {
      setSubmitted(true);
      submitAnswer(placedItems, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.timeRemaining, gameState.phase]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;
    const itemId = active.id as string;
    const target = over.id as string;

    if (target === 'pool') {
      const idx = placedItems.findIndex(i => i.id === itemId);
      if (idx > -1) {
        const item = placedItems[idx];
        setPlacedItems(prev => prev.filter(i => i.id !== itemId));
        setPoolItems(prev => [...prev, { id: item.id, iconType: item.iconType }]);
      }
      return;
    }

    if (target.startsWith('cell-')) {
      const [, r, c] = target.split('-');
      const row = parseInt(r), col = parseInt(c);
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
        const existingIdx = placedItems.findIndex(i => i.row === row && i.col === col && i.id !== itemId);
        if (existingIdx > -1) {
          const displaced = placedItems[existingIdx];
          setPoolItems(prev => [...prev, { id: displaced.id, iconType: displaced.iconType }]);
          setPlacedItems(prev => prev.filter((_, i) => i !== existingIdx));
        }
        setPlacedItems(prev => [...prev, { ...itemToPlace!, row, col }]);
      }
    }
  }, [placedItems, poolItems]);

  const handleSubmit = () => {
    if (gameState.phase === 'answer' && !submitted) {
      setSubmitted(true);
      submitAnswer(placedItems, gameState.timeRemaining);
    }
  };

  // ── Game Over ──────────────────────────────────────────────────────────────
  if (gameState.status === 'ended') {
    const sorted = [...gameState.finalLeaderboard].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    const isWinner = winner?.id === myId;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="glass-card rounded-3xl p-6 md:p-8 max-w-lg w-full text-center space-y-5 md:space-y-6"
      >
        <div className="space-y-2">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.1 }}
            className="text-6xl md:text-7xl"
          >
            {isWinner ? '🏆' : '🎮'}
          </motion.div>
          <h2 className="text-3xl md:text-4xl font-black text-white">
            {isWinner ? 'Kamu Menang!' : 'Game Selesai!'}
          </h2>
          <p className="text-sm font-bold" style={{ color: 'var(--txt-muted)' }}>Peringkat Akhir</p>
        </div>

        <div className="space-y-2">
          {sorted.map((p, i) => {
            const medals = ['🥇', '🥈', '🥉'];
            const isSelf = p.id === myId;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center justify-between rounded-2xl px-4 py-3"
                style={{
                  background: i === 0 ? 'rgba(245,158,11,0.15)' : isSelf ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${i === 0 ? 'rgba(245,158,11,0.4)' : isSelf ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{medals[i] ?? `#${i + 1}`}</span>
                  <span className="font-black text-white">{p.name}</span>
                  {isSelf && <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.25)', color: '#a78bfa' }}>Kamu</span>}
                </div>
                <span className="font-black text-lg tabular-nums" style={{ color: i === 0 ? '#fcd34d' : '#a78bfa' }}>
                  {p.score.toLocaleString()}
                </span>
              </motion.div>
            );
          })}
        </div>

        <button onClick={() => window.location.reload()} className="btn-3d btn-purple w-full py-3 md:py-4 text-sm md:text-base">
          🔁 Main Lagi
        </button>
      </motion.div>
    );
  }

  // ── Playing ────────────────────────────────────────────────────────────────
  const gridCols = `repeat(${gameState.gridSize}, minmax(0, 1fr))`;

  return (
    <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5">

      {/* Level-Complete toast */}
      <AnimatePresence>
        {showLevelComplete && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl font-black text-base text-white"
            style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', boxShadow: '0 8px 30px rgba(139,92,246,0.5)' }}
          >
            ✅ Level {levelCompleteNum} Selesai! Level {levelCompleteNum + 1} dimulai...
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {/* Header: level + phase + timer */}
        <div className="glass-card rounded-3xl px-6 py-4 flex justify-between items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-black text-white">Level {gameState.currentLevel}</h2>
              <span
                className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full"
                style={isMemorize
                  ? { background: 'rgba(6,182,212,0.2)', border: '1.5px solid rgba(6,182,212,0.4)', color: '#67e8f9' }
                  : { background: 'rgba(139,92,246,0.2)', border: '1.5px solid rgba(139,92,246,0.4)', color: '#a78bfa' }}
              >
                {isMemorize ? '👁 Hafalkan' : '🧩 Jawab'}
              </span>
            </div>
            <p className="text-xs font-bold" style={{ color: 'var(--txt-faint)' }}>
              Grid {gameState.gridSize}×{gameState.gridSize} · {gameState.gridSize * gameState.gridSize} emoji
            </p>
          </div>
          <Timer seconds={gameState.timeRemaining} isAnswer={!isMemorize} />
        </div>

        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} autoScroll={false}>
          {/* Grid */}
          <div className="glass-card rounded-3xl p-6 flex items-center justify-center">
            <div className="grid gap-3" style={{ gridTemplateColumns: gridCols }}>
              {Array.from({ length: gameState.gridSize }).map((_, r) =>
                Array.from({ length: gameState.gridSize }).map((_, c) => {
                  const cellId = `cell-${r}-${c}`;
                  const memItem = isMemorize ? gameState.itemsToMemorize.find(i => i.row === r && i.col === c) : null;
                  const placedItem = !isMemorize ? placedItems.find(i => i.row === r && i.col === c) : null;
                  return (
                    <DroppableCell key={cellId} id={cellId} size={gameState.gridSize}>
                      {isMemorize && memItem && (
                        <motion.div
                          initial={{ scale: 0, rotate: -12 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', delay: (r * gameState.gridSize + c) * 0.04 }}
                          className="emoji-card flex items-center justify-center w-full h-full"
                        >
                          <EmojiDisplay emoji={memItem.iconType} size={gameState.gridSize <= 3 ? 'lg' : 'md'} />
                        </motion.div>
                      )}
                      {!isMemorize && placedItem && (
                        <DraggableItem
                          id={placedItem.id}
                          iconType={placedItem.iconType}
                          feedbackState={feedbackMap[placedItem.id] ?? null}
                          sizeClass="w-full h-full"
                        />
                      )}
                    </DroppableCell>
                  );
                })
              )}
            </div>
          </div>

          {/* Pool — answer phase only */}
          <AnimatePresence>
            {!isMemorize && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                className="glass-card rounded-3xl p-5 space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-white">Pool Pilihan</h3>
                    <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--txt-faint)' }}>
                      {poolItems.length} tersisa · {placedItems.length} ditempatkan
                    </p>
                  </div>
                  <motion.button
                    id="submit-answer-btn"
                    onClick={handleSubmit}
                    disabled={submitted}
                    whileTap={!submitted ? { scale: 0.96 } : {}}
                    className={`btn-3d px-5 py-2.5 text-sm ${submitted ? '' : 'btn-purple'}`}
                    style={submitted ? { background: 'rgba(255,255,255,0.05)', color: 'var(--txt-faint)', borderRadius: 12, fontWeight: 800, border: '1.5px solid rgba(255,255,255,0.08)', cursor: 'not-allowed' } : {}}
                  >
                    {submitted ? '✓ Dikirim!' : '🚀 Kirim Jawaban'}
                  </motion.button>
                </div>

                <DroppablePool>
                  {poolItems.map(item => (
                    <motion.div key={item.id} layout
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.7, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}>
                      <DraggableItem id={item.id} iconType={item.iconType} feedbackState={null} />
                    </motion.div>
                  ))}
                  {poolItems.length === 0 && placedItems.length === 0 && (
                    <p className="w-full text-center text-sm font-bold py-4" style={{ color: 'var(--txt-faint)' }}>Menunggu pool...</p>
                  )}
                  {poolItems.length === 0 && placedItems.length > 0 && (
                    <motion.p
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="w-full text-center text-sm font-bold py-4"
                      style={{ color: '#6ee7b7' }}
                    >
                      🎉 Semua sudah ditempatkan — kirim jawaban!
                    </motion.p>
                  )}
                </DroppablePool>
              </motion.div>
            )}
          </AnimatePresence>
          {/* DragOverlay — renders emoji that follows the cursor */}
          <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
            {activeDragId ? (() => {
              const fromPool = poolItems.find(i => i.id === activeDragId);
              const fromPlaced = placedItems.find(i => i.id === activeDragId);
              const item = fromPool ?? fromPlaced;
              return item ? <DragOverlayItem iconType={item.iconType} /> : null;
            })() : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Leaderboard */}
      <Leaderboard players={gameState.players} myId={myId} />
    </div>
  );
};
