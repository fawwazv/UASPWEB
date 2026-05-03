import { GameState, PlacedItem } from '../hooks/useGameLogic';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { Cpu, Database, Globe, HardDrive, Layers, Monitor, Server, Wifi, Zap, Shield, Code, Terminal } from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  'cpu': <Cpu />, 'database': <Database />, 'globe': <Globe />,
  'hard-drive': <HardDrive />, 'layers': <Layers />, 'monitor': <Monitor />,
  'server': <Server />, 'wifi': <Wifi />, 'zap': <Zap />,
  'shield': <Shield />, 'code': <Code />, 'terminal': <Terminal />
};

interface GameBoardProps {
  gameState: GameState;
  submitAnswer: (items: PlacedItem[], timeRemaining: number) => void;
}

export const GameBoard = ({ gameState, submitAnswer }: GameBoardProps) => {
  const isMemorize = gameState.phase === 'memorize';
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
  const [poolItems, setPoolItems] = useState<{ id: string, iconType: string }[]>([]);

  useEffect(() => {
    if (gameState.phase === 'answer' && poolItems.length === 0 && placedItems.length === 0) {
      // Shuffle items for the pool
      const shuffled = [...gameState.itemsToMemorize].sort(() => Math.random() - 0.5);
      setPoolItems(shuffled.map(item => ({ id: item.id, iconType: item.iconType })));
    } else if (gameState.phase === 'memorize') {
      setPlacedItems([]);
      setPoolItems([]);
    }
  }, [gameState.phase, gameState.itemsToMemorize]);

  // Auto submit when time runs out
  useEffect(() => {
    if (gameState.phase === 'answer' && gameState.timeRemaining === 0) {
      submitAnswer(placedItems, 0);
    }
  }, [gameState.timeRemaining, gameState.phase]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const itemId = active.id as string;
    const droppableId = over.id as string; // 'cell-row-col' or 'pool'

    if (droppableId === 'pool') {
      // Move back to pool
      const placedIndex = placedItems.findIndex(i => i.id === itemId);
      if (placedIndex > -1) {
        const item = placedItems[placedIndex];
        setPlacedItems(prev => prev.filter(i => i.id !== itemId));
        setPoolItems(prev => [...prev, { id: item.id, iconType: item.iconType }]);
      }
    } else if (droppableId.startsWith('cell-')) {
      const [, r, c] = droppableId.split('-');
      const row = parseInt(r);
      const col = parseInt(c);

      // Check if cell is already occupied
      const existingItemIndex = placedItems.findIndex(i => i.row === row && i.col === col);
      
      let itemToPlace: { id: string, iconType: string } | undefined;
      
      // If coming from pool
      const poolIndex = poolItems.findIndex(i => i.id === itemId);
      if (poolIndex > -1) {
        itemToPlace = poolItems[poolIndex];
        setPoolItems(prev => prev.filter(i => i.id !== itemId));
      } else {
        // Coming from another cell
        const pIndex = placedItems.findIndex(i => i.id === itemId);
        if (pIndex > -1) {
          itemToPlace = { id: placedItems[pIndex].id, iconType: placedItems[pIndex].iconType };
          setPlacedItems(prev => prev.filter(i => i.id !== itemId));
        }
      }

      if (itemToPlace) {
        // If cell was occupied, move the existing item back to pool
        if (existingItemIndex > -1) {
          const existing = placedItems[existingItemIndex];
          setPoolItems(prev => [...prev, { id: existing.id, iconType: existing.iconType }]);
          setPlacedItems(prev => prev.filter((_, idx) => idx !== existingItemIndex));
        }
        
        setPlacedItems(prev => [...prev, { ...itemToPlace!, row, col }]);
      }
    }
  };

  const handleSubmit = () => {
    if (gameState.phase === 'answer') {
      submitAnswer(placedItems, gameState.timeRemaining);
    }
  };

  const isTimeCritical = gameState.timeRemaining <= 3;

  if (gameState.status === 'ended') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-8 max-w-2xl w-full text-center space-y-6">
        <h2 className="text-4xl font-bold text-electric-cyan">SIMULATION COMPLETE</h2>
        <div className="space-y-4">
          {gameState.finalLeaderboard.map((p, i) => (
            <div key={p.id} className="flex justify-between items-center bg-slate-900/50 p-4 rounded-lg border border-white/10">
              <div className="flex items-center space-x-4">
                <span className={`text-2xl font-bold ${i === 0 ? 'text-yellow-400' : 'text-slate-400'}`}>#{i + 1}</span>
                <span className="text-xl text-white">{p.name}</span>
              </div>
              <span className="text-2xl font-mono text-vivid-purple">{p.score}</span>
            </div>
          ))}
        </div>
        <button onClick={() => window.location.reload()} className="mt-8 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-lg text-white font-bold transition-all">
          Return to Hub
        </button>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
      <div className="space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-white">LEVEL {gameState.currentLevel}</h2>
            <p className="text-electric-cyan font-mono">Phase: {gameState.phase.toUpperCase()}</p>
          </div>
          <motion.div 
            animate={isTimeCritical ? { x: [-5, 5, -5, 5, 0], color: '#ef4444' } : {}}
            transition={{ duration: 0.5, repeat: isTimeCritical ? Infinity : 0 }}
            className={`text-5xl font-mono font-bold ${isTimeCritical ? 'text-red-500' : 'text-white'}`}
          >
            00:{gameState.timeRemaining.toString().padStart(2, '0')}
          </motion.div>
        </div>

        <DndContext onDragEnd={handleDragEnd}>
          <div className="glass-panel p-8 rounded-xl flex items-center justify-center min-h-[400px]">
            <div 
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${gameState.gridSize}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: gameState.gridSize }).map((_, r) => (
                Array.from({ length: gameState.gridSize }).map((_, c) => {
                  const cellId = `cell-${r}-${c}`;
                  const memoryItem = isMemorize ? gameState.itemsToMemorize.find(i => i.row === r && i.col === c) : null;
                  const placedItem = !isMemorize ? placedItems.find(i => i.row === r && i.col === c) : null;
                  
                  return (
                    <DroppableCell key={cellId} id={cellId}>
                      {isMemorize && memoryItem && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="w-16 h-16 bg-electric-cyan/20 border-2 border-electric-cyan rounded-lg flex items-center justify-center text-electric-cyan">
                          {ICON_MAP[memoryItem.iconType]}
                        </motion.div>
                      )}
                      {!isMemorize && placedItem && (
                        <DraggableItem id={placedItem.id} iconType={placedItem.iconType} />
                      )}
                    </DroppableCell>
                  );
                })
              ))}
            </div>
          </div>

          <AnimatePresence>
            {!isMemorize && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-6 rounded-xl"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white/50 text-sm font-mono uppercase tracking-wider">Selection Pool</h3>
                  <button 
                    onClick={handleSubmit}
                    className="bg-vivid-purple/20 hover:bg-vivid-purple border border-vivid-purple text-white px-6 py-2 rounded font-bold uppercase transition-all"
                  >
                    Submit Layout
                  </button>
                </div>
                <DroppablePool id="pool">
                  <div className="flex flex-wrap gap-4 min-h-[80px]">
                    {poolItems.map(item => (
                      <DraggableItem key={item.id} id={item.id} iconType={item.iconType} />
                    ))}
                    {poolItems.length === 0 && placedItems.length === 0 && (
                      <div className="w-full text-center text-white/20 py-4">Waiting for pool...</div>
                    )}
                  </div>
                </DroppablePool>
              </motion.div>
            )}
          </AnimatePresence>
        </DndContext>
      </div>

      <div className="glass-panel p-6 rounded-xl h-fit">
        <h3 className="text-xl font-bold text-white mb-6 tracking-widest border-b border-white/10 pb-4">LEADERBOARD</h3>
        <div className="space-y-4">
          {gameState.players.sort((a, b) => b.score - a.score).map((player, idx) => (
            <motion.div layout key={player.id} className="flex justify-between items-center bg-slate-900/50 p-3 rounded border border-white/5">
              <div className="flex items-center space-x-3">
                <span className="text-white/30 text-sm">#{idx + 1}</span>
                <span className="text-white font-medium">{player.name}</span>
              </div>
              <span className="text-electric-cyan font-mono">{player.score}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DroppableCell = ({ id, children }: { id: string, children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div 
      ref={setNodeRef} 
      className={`w-20 h-20 rounded-xl border-2 transition-all flex items-center justify-center
        ${isOver ? 'border-vivid-purple bg-vivid-purple/20' : 'border-white/10 bg-slate-900/50'}`}
    >
      {children}
    </div>
  );
};

const DroppablePool = ({ id, children }: { id: string, children: React.ReactNode }) => {
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

const DraggableItem = ({ id, iconType }: { id: string, iconType: string }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50,
  } : undefined;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className={`w-16 h-16 rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing transition-shadow
        ${isDragging ? 'shadow-2xl shadow-vivid-purple/50 bg-vivid-purple/40 border-vivid-purple' : 'bg-slate-800 border-white/20 hover:border-vivid-purple/50'} 
        border-2`}
    >
      <div className={`${isDragging ? 'text-white' : 'text-slate-300'}`}>
        {ICON_MAP[iconType]}
      </div>
    </div>
  );
};
