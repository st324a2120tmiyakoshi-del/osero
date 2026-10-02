import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  Clock,
  History,
  Shield,
  Zap,
  RotateCcw,
  Volume2,
  VolumeX,
  Copy,
  Check,
  HelpCircle,
  X,
  Swords,
  Pause,
  Play,
  TrendingUp,
  Music
} from 'lucide-react';
import { sounds, type SoundTheme, SOUND_THEMES } from './sound';
import { BattleScoreChart } from './BattleScoreChart';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 1: 漆黒 (Player), 2: 純白 (CPU)
type Player = 1 | 2;
type Board = number[][];

const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

const CORNERS: [number, number][] = [
  [0, 0], [0, 7], [7, 0], [7, 7]
];

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const ROWS = ['1', '2', '3', '4', '5', '6', '7', '8'];

export interface TurnHistoryItem {
  id: number;
  turnNumber: number;
  player: Player;
  pos: [number, number] | null; // null for pass
  coordLabel: string;
  actionType: 'normal' | 'corner' | 'calamity' | 'chain' | 'pass' | 'timeout';
  actionName: string;
  flipsCount: number;
  scoreAfter: { 1: number; 2: number };
  timeSpent: number;
  timestamp: string;
}

const initialBoard = (): Board => {
  const b = Array(8).fill(null).map(() => Array(8).fill(0));
  b[3][3] = 2;
  b[4][4] = 2;
  b[3][4] = 1;
  b[4][3] = 1;
  return b;
};

export default function App() {
  const [board, setBoard] = useState<Board>(initialBoard());
  const [turn, setTurn] = useState<Player>(1);
  const [cutin, setCutin] = useState<{ title: string; subtitle?: string; isBig?: boolean } | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [scores, setScores] = useState({ 1: 2, 2: 2 });
  const [shake, setShake] = useState(false);
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);
  const [highlightedMove, setHighlightedMove] = useState<[number, number] | null>(null);

  // Sound state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundTheme, setSoundTheme] = useState<SoundTheme>('gothic');

  const handleSoundThemeChange = (newTheme: SoundTheme) => {
    setSoundTheme(newTheme);
    sounds.setTheme(newTheme);
  };

  // Turn History State
  const [history, setHistory] = useState<TurnHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'player' | 'cpu' | 'special'>('all');
  const [copied, setCopied] = useState(false);
  const historyScrollRef = useRef<HTMLDivElement>(null);

  // Countdown Timer State
  // 0 means unlimited
  const [timeLimit, setTimeLimit] = useState<number>(15);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [turnStartTime, setTurnStartTime] = useState<number>(Date.now());
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Rule explanation modal
  const [showRules, setShowRules] = useState(false);

  // End of game chart overlay modal
  const [showEndGameChart, setShowEndGameChart] = useState(true);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.enabled = next;
  };

  const showCutin = (title: string, subtitle?: string, isBig: boolean = false) => {
    setCutin({ title, subtitle, isBig });
    if (isBig) {
      setShake(true);
      sounds.playCalamity();
      setTimeout(() => setShake(false), 600);
    }
    setTimeout(() => {
      setCutin(prev => prev?.title === title ? null : prev);
    }, 2200);
  };

  const countScores = (b: Board) => {
    let s1 = 0, s2 = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (b[r][c] === 1) s1++;
        if (b[r][c] === 2) s2++;
      }
    }
    return { 1: s1, 2: s2 };
  };

  const getFlips = (b: Board, r: number, c: number, p: Player): [number, number][] => {
    if (b[r][c] !== 0) return [];
    const flips: [number, number][] = [];
    const opp = p === 1 ? 2 : 1;

    for (const [dr, dc] of DIRS) {
      let cr = r + dr;
      let cc = c + dc;
      const tempFlips: [number, number][] = [];

      while (cr >= 0 && cr < 8 && cc >= 0 && cc < 8 && b[cr][cc] === opp) {
        tempFlips.push([cr, cc]);
        cr += dr;
        cc += dc;
      }

      if (cr >= 0 && cr < 8 && cc >= 0 && cc < 8 && b[cr][cc] === p && tempFlips.length > 0) {
        flips.push(...tempFlips);
      }
    }
    return flips;
  };

  const getValidMoves = (b: Board, p: Player): [number, number][] => {
    const moves: [number, number][] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (getFlips(b, r, c, p).length > 0) {
          moves.push([r, c]);
        }
      }
    }
    return moves;
  };

  // Convert coords (r, c) to notation (e.g. 2, 3 -> "D3")
  const toNotation = (r: number, c: number): string => {
    return `${COLS[c]}${ROWS[r]}`;
  };

  const checkPassOrEnd = (b: Board, nextPlayer: Player, currentScores: { 1: number; 2: number }) => {
    const nextMoves = getValidMoves(b, nextPlayer);
    if (nextMoves.length > 0) {
      setTurn(nextPlayer);
      setTimeLeft(timeLimit);
      setTurnStartTime(Date.now());
    } else {
      const currentMoves = getValidMoves(b, nextPlayer === 1 ? 2 : 1);
      if (currentMoves.length > 0) {
        // Pass
        const now = new Date();
        const passItem: TurnHistoryItem = {
          id: Date.now() + Math.random(),
          turnNumber: history.length + 1,
          player: nextPlayer,
          pos: null,
          coordLabel: 'PASS',
          actionType: 'pass',
          actionName: '《絶対パス》 行動不能',
          flipsCount: 0,
          scoreAfter: currentScores,
          timeSpent: 0,
          timestamp: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
        };
        setHistory(prev => [passItem, ...prev]);
        showCutin(`《絶対パス》`, `${nextPlayer === 1 ? '漆黒' : '純白'}に合法手なし…強制ターン譲渡`, false);
        setTurn(nextPlayer === 1 ? 2 : 1);
        setTimeLeft(timeLimit);
        setTurnStartTime(Date.now());
      } else {
        // Game Over
        setGameOver(true);
        setShowEndGameChart(true);
        if (currentScores[1] > currentScores[2]) {
          sounds.playCorner();
        }
      }
    }
  };

  const handleMove = (r: number, c: number, p: Player, isTimeout: boolean = false) => {
    const flips = getFlips(board, r, c, p);
    if (flips.length === 0) return false;

    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = p;
    flips.forEach(([fr, fc]) => {
      newBoard[fr][fc] = p;
    });

    setBoard(newBoard);
    setLastMove([r, c]);
    const newScores = countScores(newBoard);
    setScores(newScores);

    // Audio SFX
    sounds.playPlace(p === 1);
    sounds.playFlip(flips.length);

    // Abilities detection
    const isCorner = CORNERS.some(([cr, cc]) => cr === r && cc === c);
    let actionType: TurnHistoryItem['actionType'] = 'normal';
    let actionName = '《挟撃反転(リバース)》';

    if (isTimeout) {
      actionType = 'timeout';
      actionName = '《思考限界・強制降臨》';
      showCutin('《思考限界》強制降臨!!', '思考時間枯渇による緊急配置が執行された', false);
    } else if (flips.length >= 5) {
      actionType = 'calamity';
      actionName = '《全滅返し(カタストロフ)》!!';
      showCutin('真の恐怖...《全滅返し》!!', `一撃で${flips.length}体の精神を強制書き換え!`, true);
    } else if (isCorner) {
      actionType = 'corner';
      actionName = '《絶対聖域(コーナー)》確立';
      sounds.playCorner();
      showCutin('《絶対聖域》確立!!', '四隅の絶対防御を獲得…いかなる反転も無効化される', false);
    } else if (flips.length >= 3) {
      actionType = 'chain';
      actionName = `《連続反転(チェイン)》 ${flips.length}連`;
    }

    // Add to Turn Log
    const now = new Date();
    const timeSpent = Math.max(1, Math.round((Date.now() - turnStartTime) / 1000));
    const coord = toNotation(r, c) + (isCorner ? ' [聖域]' : '');

    const historyItem: TurnHistoryItem = {
      id: Date.now() + Math.random(),
      turnNumber: history.length + 1,
      player: p,
      pos: [r, c],
      coordLabel: coord,
      actionType,
      actionName,
      flipsCount: flips.length,
      scoreAfter: newScores,
      timeSpent,
      timestamp: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
    };

    setHistory(prev => [historyItem, ...prev]);

    // Next step
    checkPassOrEnd(newBoard, p === 1 ? 2 : 1, newScores);
    return true;
  };

  // Timer Tick & Timeout handling
  useEffect(() => {
    if (gameOver || isPaused || timeLimit === 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Timeout triggers!
          if (turn === 1) {
            // Force random valid move for Player
            const moves = getValidMoves(board, 1);
            if (moves.length > 0) {
              const randomMove = moves[Math.floor(Math.random() * moves.length)];
              handleMove(randomMove[0], randomMove[1], 1, true);
            }
          }
          return timeLimit;
        }

        const nextVal = prev - 1;
        if (nextVal <= 5 && nextVal > 0) {
          sounds.playWarningTick(nextVal <= 3);
        }
        return nextVal;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, turn, gameOver, isPaused, timeLimit, history]);

  // CPU Turn AI
  useEffect(() => {
    if (turn === 2 && !gameOver) {
      const delay = Math.floor(Math.random() * 600) + 700;
      const timer = setTimeout(() => {
        const moves = getValidMoves(board, 2);
        if (moves.length > 0) {
          // AI strategy: Prioritize corners, avoid cells adjacent to corners early, then maximize flips
          let bestMove = moves[0];
          let maxFlips = -1;
          let foundCorner = false;

          for (const [mr, mc] of moves) {
            const isCorner = CORNERS.some(([cr, cc]) => cr === mr && cc === mc);
            const flipsCount = getFlips(board, mr, mc, 2).length;

            if (isCorner) {
              bestMove = [mr, mc];
              foundCorner = true;
              break;
            }
            if (!foundCorner && flipsCount > maxFlips) {
              maxFlips = flipsCount;
              bestMove = [mr, mc];
            }
          }
          handleMove(bestMove[0], bestMove[1], 2);
        }
      }, delay);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, board, gameOver]);

  // Restart match
  const handleRestart = () => {
    setBoard(initialBoard());
    setScores({ 1: 2, 2: 2 });
    setTurn(1);
    setGameOver(false);
    setShowEndGameChart(true);
    setHistory([]);
    setLastMove(null);
    setHighlightedMove(null);
    setTimeLeft(timeLimit);
    setTurnStartTime(Date.now());
    sounds.playPlace(true);
  };

  // Copy Battle Chronicle
  const handleCopyHistory = () => {
    if (history.length === 0) return;
    const text = [
      '【裏切りの盤上（リバース・フィールド） 戦況記録譜】',
      `対戦結果: 漆黒 ${scores[1]}体 vs 純白 ${scores[2]}体`,
      '----------------------------------------',
      ...history
        .slice()
        .reverse()
        .map(h => {
          const pName = h.player === 1 ? '漆黒' : '純白';
          return `#${String(h.turnNumber).padStart(2, '0')} [${h.coordLabel.padEnd(5)}] ${pName}: ${h.actionName} (反転${h.flipsCount}体 / 思考${h.timeSpent}秒) 局勢[黒${h.scoreAfter[1]}-白${h.scoreAfter[2]}]`;
        })
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter history
  const filteredHistory = history.filter(item => {
    if (historyFilter === 'player') return item.player === 1;
    if (historyFilter === 'cpu') return item.player === 2;
    if (historyFilter === 'special') return item.actionType === 'corner' || item.actionType === 'calamity' || item.actionType === 'timeout';
    return true;
  });

  const validMoves = turn === 1 ? getValidMoves(board, 1) : [];

  // Timer percentage
  const timerPercentage = timeLimit > 0 ? (timeLeft / timeLimit) * 100 : 100;
  const isUrgent = timeLimit > 0 && timeLeft <= 5;

  return (
    <div className={cn(
      "w-full min-h-screen bg-[#060608] text-white flex flex-col items-center justify-between relative overflow-x-hidden selection:bg-rose-500/30 font-chuunibyou",
      shake && "animate-ping-slow scale-[1.01]"
    )}>
      {/* Background Anime Ambience */}
      <div className="fixed inset-0 pointer-events-none opacity-25 z-0">
        <div className="absolute top-1/4 left-1/5 w-[500px] h-[500px] bg-rose-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/5 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px]" />
        {/* Subtle geometric battlefield grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e11d4808_1px,transparent_1px),linear-gradient(to_bottom,#e11d4808_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Top Header & Tactical Controls */}
      <header className="w-full max-w-7xl px-4 py-3 z-20 flex items-center justify-between border-b border-rose-950/40 bg-black/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rose-600 to-black border border-rose-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(225,29,72,0.4)]">
            <Swords className="w-5 h-5 text-rose-300" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-rose-200 to-rose-500 italic drop-shadow-[0_0_12px_rgba(225,29,72,0.6)]">
              裏切りの盤上
            </h1>
            <p className="text-[10px] tracking-[0.4em] text-rose-400/70 font-sans font-bold uppercase">Reverse Field</p>
          </div>
        </div>

        {/* Global Control Bar */}
        <div className="flex items-center gap-2 md:gap-3 text-xs">
          {/* Timer Mode Selector */}
          <div className="flex items-center bg-black/70 border border-white/10 rounded-lg p-1">
            <Clock className="w-3.5 h-3.5 text-zinc-400 ml-1.5 mr-1" />
            <select
              value={timeLimit}
              onChange={(e) => {
                const val = Number(e.target.value);
                setTimeLimit(val);
                setTimeLeft(val);
              }}
              className="bg-transparent text-zinc-200 text-xs py-1 px-1 focus:outline-none cursor-pointer"
            >
              <option value={10} className="bg-zinc-900 text-white">10秒 (超速決闘)</option>
              <option value={15} className="bg-zinc-900 text-white">15秒 (標準格闘)</option>
              <option value={30} className="bg-zinc-900 text-white">30秒 (深層熟考)</option>
              <option value={0} className="bg-zinc-900 text-white">無制限 (無限思索)</option>
            </select>
            {timeLimit > 0 && (
              <button
                onClick={() => setIsPaused(!isPaused)}
                title={isPaused ? "思考再開" : "思考停止（一時停止）"}
                className={cn(
                  "p-1 rounded text-zinc-400 hover:text-white transition-colors ml-1",
                  isPaused && "text-amber-400 bg-amber-500/20"
                )}
              >
                {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              </button>
            )}
          </div>

          {/* Sound Theme Selector */}
          <div className="flex items-center bg-black/70 border border-white/10 rounded-lg p-1">
            <Music className="w-3.5 h-3.5 text-zinc-400 ml-1.5 mr-1" />
            <select
              value={soundTheme}
              onChange={(e) => handleSoundThemeChange(e.target.value as SoundTheme)}
              disabled={!soundEnabled}
              title="音響テーマ（効果音スタイル切替）"
              className={cn(
                "bg-transparent text-zinc-200 text-xs py-1 px-1 focus:outline-none cursor-pointer",
                !soundEnabled && "opacity-40 cursor-not-allowed"
              )}
            >
              {SOUND_THEMES.map((st) => (
                <option key={st.id} value={st.id} className="bg-zinc-900 text-white">
                  {st.name} ({st.badge})
                </option>
              ))}
            </select>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? "音響切断" : "音響詠唱"}
            className={cn(
              "p-2 rounded-lg border transition-all flex items-center justify-center",
              soundEnabled ? "border-rose-500/40 bg-rose-950/30 text-rose-300" : "border-zinc-800 bg-zinc-900 text-zinc-500"
            )}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Rules Modal Button */}
          <button
            onClick={() => setShowRules(true)}
            className="p-2 rounded-lg border border-white/10 bg-black/60 hover:border-rose-500/40 text-zinc-300 hover:text-white transition-all flex items-center gap-1"
          >
            <HelpCircle className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline font-sans text-xs">能力解説</span>
          </button>

          {/* Turn Log Toggle for Mobile/Desktop */}
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className={cn(
              "px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 font-sans font-medium text-xs",
              isHistoryOpen
                ? "border-rose-500/60 bg-rose-950/40 text-rose-200 shadow-[0_0_12px_rgba(225,29,72,0.3)]"
                : "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white"
            )}
          >
            <History className="w-3.5 h-3.5" />
            <span>ターン履歴</span>
            <span className="bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded-full text-[10px]">
              {history.length}
            </span>
          </button>
        </div>
      </header>

      {/* Main Duel Stadium Arena */}
      <div className="w-full max-w-7xl px-3 md:px-6 py-4 flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 z-10">
        
        {/* Left Side: Battle Field Container */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl w-full">
          
          {/* Duelists Cards & HUD Status Bar */}
          <div className="w-full grid grid-cols-2 gap-3 mb-4">
            
            {/* Player 1: 漆黒の軍勢 (YOU) */}
            <div className={cn(
              "relative p-3.5 rounded-xl border transition-all duration-300 backdrop-blur-md overflow-hidden",
              turn === 1
                ? "border-rose-500/80 bg-gradient-to-br from-rose-950/40 via-black to-black shadow-[0_0_20px_rgba(225,29,72,0.35)] ring-1 ring-rose-500/50"
                : "border-zinc-900 bg-black/40 opacity-70"
            )}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-zinc-700 to-black border border-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.8)]" />
                  <span className="text-sm font-bold text-rose-300">漆黒の軍勢</span>
                </div>
                <span className="text-[10px] tracking-wider text-rose-400/80 font-sans font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">YOU</span>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl md:text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(225,29,72,0.6)]">
                    {scores[1]}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    {turn === 1 ? `支配可能マス: ${validMoves.length}手` : '待機中...'}
                  </div>
                </div>

                {/* Countdown Gauge for Player */}
                {turn === 1 && timeLimit > 0 && !gameOver && (
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className={cn("w-3.5 h-3.5", isUrgent ? "text-red-500 animate-pulse" : "text-rose-400")} />
                      <span className={cn(
                        "text-lg font-mono font-bold tracking-tighter",
                        isUrgent ? "text-red-500 text-glow animate-pulse scale-110" : "text-rose-200"
                      )}>
                        {String(timeLeft).padStart(2, '0')}s
                      </span>
                    </div>
                    {/* Linear mini gauge */}
                    <div className="w-20 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-rose-500/30">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          isUrgent ? "bg-gradient-to-r from-red-600 to-rose-400 animate-pulse" : "bg-gradient-to-r from-rose-500 to-red-600"
                        )}
                        style={{ width: `${timerPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Active Aura Beam */}
              {turn === 1 && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_10px_#e11d48]" />
              )}
            </div>

            {/* Player 2: 純白の騎士団 (CPU) */}
            <div className={cn(
              "relative p-3.5 rounded-xl border transition-all duration-300 backdrop-blur-md overflow-hidden",
              turn === 2
                ? "border-blue-500/80 bg-gradient-to-br from-blue-950/40 via-black to-black shadow-[0_0_20px_rgba(59,130,246,0.35)] ring-1 ring-blue-500/50"
                : "border-zinc-900 bg-black/40 opacity-70"
            )}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-white to-zinc-400 border border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                  <span className="text-sm font-bold text-blue-300">純白の騎士団</span>
                </div>
                <span className="text-[10px] tracking-wider text-blue-400/80 font-sans font-bold bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">CPU</span>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl md:text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]">
                    {scores[2]}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    {turn === 2 ? '思考詠唱中...' : '待機中...'}
                  </div>
                </div>

                {/* Countdown Gauge for CPU */}
                {turn === 2 && timeLimit > 0 && !gameOver && (
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                      <span className="text-lg font-mono font-bold text-blue-200">
                        {String(timeLeft).padStart(2, '0')}s
                      </span>
                    </div>
                    <div className="w-20 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-blue-500/30">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                        style={{ width: `${timerPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {turn === 2 && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_10px_#3b82f6]" />
              )}
            </div>

          </div>

          {/* Central Battle Grid & Board */}
          <div className="relative p-2 md:p-3 bg-black/80 rounded-2xl border-2 border-rose-900/40 shadow-[0_0_40px_rgba(225,29,72,0.15)] backdrop-blur-xl">
            
            {/* Column coordinate labels A-H */}
            <div className="grid grid-cols-8 gap-1 mb-1 px-5 text-center text-[10px] md:text-xs font-mono font-bold text-zinc-500 select-none">
              {COLS.map(c => <div key={c}>{c}</div>)}
            </div>

            <div className="flex items-center">
              {/* Row coordinate labels 1-8 */}
              <div className="flex flex-col justify-around h-full pr-1.5 text-center text-[10px] md:text-xs font-mono font-bold text-zinc-500 select-none">
                {ROWS.map(r => <div key={r} className="h-8 sm:h-10 md:h-12 flex items-center justify-center">{r}</div>)}
              </div>

              {/* 8x8 Grid */}
              <div className="grid grid-cols-8 gap-1 p-1 bg-zinc-950/90 border border-white/10 rounded-lg shadow-inner">
                {board.map((row, r) => (
                  row.map((cell, c) => {
                    const isCorner = CORNERS.some(([cr, cc]) => cr === r && cc === c);
                    const flips = turn === 1 && !gameOver ? getFlips(board, r, c, 1) : [];
                    const isValid = flips.length > 0;
                    const isLast = lastMove && lastMove[0] === r && lastMove[1] === c;
                    const isHighlighted = highlightedMove && highlightedMove[0] === r && highlightedMove[1] === c;

                    return (
                      <div
                        key={`${r}-${c}`}
                        onClick={() => {
                          if (turn === 1 && isValid && !gameOver) {
                            handleMove(r, c, 1);
                          }
                        }}
                        className={cn(
                          "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 border border-white/5 flex items-center justify-center relative transition-all select-none rounded-[3px]",
                          isCorner ? "bg-rose-950/20" : "bg-black/40",
                          isValid && "hover:bg-rose-950/40 cursor-pointer hover:border-rose-500/60 shadow-[inset_0_0_8px_rgba(225,29,72,0.3)]",
                          isHighlighted && "ring-2 ring-amber-400 bg-amber-500/20 shadow-[0_0_15px_#f59e0b]"
                        )}
                      >
                        {/* Absolute Sanctuary (Corner) Sacred Glyph */}
                        {isCorner && (
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-full h-full border border-rose-500/30 rotate-45 scale-75 opacity-40" />
                            <Shield className="w-3 h-3 text-rose-400/40 absolute" />
                          </div>
                        )}

                        {/* Last Move Target Reticle */}
                        {isLast && cell !== 0 && (
                          <div className="absolute inset-0 rounded-full border border-rose-400 animate-ping opacity-60 pointer-events-none" />
                        )}

                        {/* Valid Move Indicator Rune */}
                        {isValid && (
                          <div className="group relative flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60 animate-pulse-fast shadow-[0_0_8px_rgba(225,29,72,0.9)]" />
                            {/* Hover flip preview count */}
                            <span className="absolute -top-3 text-[9px] font-mono text-rose-300 font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-black/90 px-1 rounded border border-rose-500/40">
                              +{flips.length}
                            </span>
                          </div>
                        )}

                        {/* Placed Piece with 3D Flip Mechanics */}
                        {cell !== 0 && (
                          <motion.div
                            initial={false}
                            animate={{ rotateY: cell === 1 ? 0 : 180 }}
                            transition={{ duration: 0.55, type: "spring", bounce: 0.35 }}
                            style={{ transformStyle: 'preserve-3d' }}
                            className="w-[82%] h-[82%] relative"
                          >
                            {/* 漆黒 (Front - 0 deg) */}
                            <div
                              className={cn(
                                "absolute inset-0 rounded-full bg-gradient-to-br from-zinc-700 via-zinc-900 to-black border-2 border-rose-500/70 shadow-[0_0_12px_rgba(225,29,72,0.7)] flex items-center justify-center",
                                isCorner && "border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.9)]"
                              )}
                              style={{ backfaceVisibility: 'hidden' }}
                            >
                              {isCorner && (
                                <Shield className="w-3 h-3 text-amber-300/80 drop-shadow-[0_0_4px_#f59e0b]" />
                              )}
                            </div>

                            {/* 純白 (Back - 180 deg) */}
                            <div
                              className={cn(
                                "absolute inset-0 rounded-full bg-gradient-to-br from-white via-zinc-100 to-zinc-300 border-2 border-blue-400/80 shadow-[0_0_12px_rgba(59,130,246,0.7)] flex items-center justify-center",
                                isCorner && "border-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.9)]"
                              )}
                              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                            >
                              {isCorner && (
                                <Shield className="w-3 h-3 text-amber-600/90 drop-shadow-[0_0_4px_#f59e0b]" />
                              )}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })
                ))}
              </div>

              {/* Right spacing */}
              <div className="w-1.5" />
            </div>

            {/* Game Over Compact Banner on Board (when modal is closed/minimized) */}
            {gameOver && !showEndGameChart && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-x-2 bottom-3 z-30 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md rounded-xl border border-rose-500/80 p-3 text-center shadow-[0_0_30px_rgba(225,29,72,0.7)]"
              >
                <div className="text-xs text-rose-300 font-bold mb-1.5 font-chuunibyou flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>終局決着: 漆黒 {scores[1]} vs {scores[2]} 純白</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEndGameChart(true)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(225,29,72,0.8)] transition-all hover:scale-105 active:scale-95"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>戦況推移チャートを開く</span>
                  </button>
                  <button
                    onClick={handleRestart}
                    className="px-3 py-1.5 rounded-lg border border-white/20 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs flex items-center gap-1 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>再誕</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Active Turn Status Pill / Quick Bar */}
          <div className="mt-3 w-full flex items-center justify-between text-xs text-zinc-400 px-2 font-sans">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>
                {turn === 1 ? 'あなたの番（漆黒）: 盤上の光点をクリックして配置' : '相手の番（純白）: 敵思考詠唱中...'}
              </span>
            </div>
            <button
              onClick={handleRestart}
              className="text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>盤面初期化</span>
            </button>
          </div>

        </div>

        {/* Right Side: Turn Log / Tactical Chronicle Panel */}
        <AnimatePresence>
          {isHistoryOpen && (
            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full lg:w-96 flex flex-col bg-zinc-950/90 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl h-[480px] lg:h-[580px] overflow-hidden"
            >
              {/* Turn Log Header */}
              <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-black/60">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-rose-400" />
                  <span className="font-bold text-sm tracking-wide text-zinc-200">戦況記録譜 (Turn Log)</span>
                  <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                    {history.length}手
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopyHistory}
                    title="戦況をクリップボードにコピー"
                    className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => setIsHistoryOpen(false)}
                    className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white lg:hidden"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-2 bg-black/40 border-b border-white/5 font-sans text-xs">
                <button
                  onClick={() => setHistoryFilter('all')}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all",
                    historyFilter === 'all' ? "bg-rose-950/60 text-rose-200 border border-rose-500/30" : "text-zinc-400 hover:text-white"
                  )}
                >
                  全戦歴
                </button>
                <button
                  onClick={() => setHistoryFilter('player')}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all",
                    historyFilter === 'player' ? "bg-rose-950/60 text-rose-200 border border-rose-500/30" : "text-zinc-400 hover:text-white"
                  )}
                >
                  漆黒(YOU)
                </button>
                <button
                  onClick={() => setHistoryFilter('cpu')}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all",
                    historyFilter === 'cpu' ? "bg-blue-950/60 text-blue-200 border border-blue-500/30" : "text-zinc-400 hover:text-white"
                  )}
                >
                  純白(CPU)
                </button>
                <button
                  onClick={() => setHistoryFilter('special')}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all flex items-center gap-1",
                    historyFilter === 'special' ? "bg-amber-950/60 text-amber-200 border border-amber-500/30" : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  特殊発動
                </button>
              </div>

              {/* Turn Items Scroll Area */}
              <div
                ref={historyScrollRef}
                className="flex-1 overflow-y-auto p-2 space-y-2 font-sans select-none scrollbar-thin scrollbar-thumb-zinc-800"
              >
                {filteredHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600 text-xs py-8">
                    <History className="w-8 h-8 mb-2 opacity-30" />
                    <p>盤上に最初のコマを降臨させると</p>
                    <p>ここに戦況が逐次刻まれます</p>
                  </div>
                ) : (
                  filteredHistory.map((item) => {
                    const isPlayer = item.player === 1;
                    const isHighlight = highlightedMove && item.pos && highlightedMove[0] === item.pos[0] && highlightedMove[1] === item.pos[1];

                    return (
                      <div
                        key={item.id}
                        onMouseEnter={() => item.pos && setHighlightedMove(item.pos)}
                        onMouseLeave={() => setHighlightedMove(null)}
                        className={cn(
                          "p-2.5 rounded-lg border text-xs transition-all relative overflow-hidden cursor-pointer",
                          isPlayer
                            ? "bg-rose-950/15 border-rose-900/30 hover:border-rose-500/50"
                            : "bg-blue-950/15 border-blue-900/30 hover:border-blue-500/50",
                          isHighlight && "ring-1 ring-amber-400 bg-amber-950/30",
                          item.actionType === 'calamity' && "border-red-500 bg-red-950/40 shadow-[0_0_12px_rgba(239,68,68,0.3)]",
                          item.actionType === 'corner' && "border-amber-500/60 bg-amber-950/30"
                        )}
                      >
                        {/* Header: Turn number, Player badge, Time */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-zinc-500 font-bold">
                              #{String(item.turnNumber).padStart(2, '0')}
                            </span>
                            <span className={cn(
                              "font-bold text-[11px] px-1.5 py-0.2 rounded font-chuunibyou",
                              isPlayer ? "text-rose-300 bg-rose-500/10" : "text-blue-300 bg-blue-500/10"
                            )}>
                              {isPlayer ? '漆黒の軍勢' : '純白の騎士団'}
                            </span>
                            <span className="font-mono font-bold text-zinc-200 bg-black/60 px-1.5 py-0.5 rounded border border-white/10">
                              {item.coordLabel}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {item.timestamp}
                          </span>
                        </div>

                        {/* Action Description */}
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-1.5">
                            {item.actionType === 'corner' && (
                              <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                            {item.actionType === 'calamity' && (
                              <Zap className="w-3.5 h-3.5 text-red-400 animate-pulse shrink-0" />
                            )}
                            <span className={cn(
                              "font-chuunibyou font-bold",
                              item.actionType === 'calamity' ? "text-red-400 text-glow" :
                              item.actionType === 'corner' ? "text-amber-300" :
                              item.actionType === 'timeout' ? "text-orange-400" :
                              isPlayer ? "text-rose-200" : "text-blue-200"
                            )}>
                              {item.actionName}
                            </span>
                          </div>

                          <div className="text-[10px] font-mono text-zinc-400">
                            反転 <strong className="text-white">+{item.flipsCount}</strong>
                          </div>
                        </div>

                        {/* Footer: Board score tally & time spent */}
                        <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-white/5 text-[10px] text-zinc-500 font-mono">
                          <span>
                            戦局: 漆黒 {item.scoreAfter[1]} - {item.scoreAfter[2]} 純白
                          </span>
                          <span>詠唱 {item.timeSpent}秒</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Panel Footer */}
              <div className="p-2 border-t border-white/10 bg-black/70 flex items-center justify-between text-[11px] text-zinc-400 font-sans">
                <span className="truncate">※履歴ホバーで着手マスを照準探知</span>
                {copied && (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> コピー完了
                  </span>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

      </div>

      {/* Dramatic Cinematic Anime Cut-in Overlay */}
      <AnimatePresence>
        {cutin && (
          <motion.div
            initial={{ opacity: 0, scale: 1.15, filter: "blur(12px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.9, filter: "blur(12px)" }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4"
          >
            <div className="w-full max-w-4xl bg-black/80 border-y-2 border-rose-500/90 py-8 md:py-12 shadow-[0_0_70px_rgba(225,29,72,0.7)] flex flex-col items-center justify-center backdrop-blur-xl relative overflow-hidden">
              {/* Slanted energy bars */}
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(225,29,72,0.1)_50%,transparent_75%)] bg-[size:1rem_1rem] opacity-60" />
              
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center z-10"
              >
                <h2 className="text-3xl sm:text-5xl md:text-6xl font-black font-chuunibyou text-white tracking-widest text-glow skew-x-[-8deg] mb-2">
                  {cutin.title}
                </h2>
                {cutin.subtitle && (
                  <p className="text-xs sm:text-sm font-sans tracking-[0.3em] text-rose-300/90 uppercase font-bold">
                    {cutin.subtitle}
                  </p>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rule Explanation Modal */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-zinc-950 border border-rose-500/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(225,29,72,0.3)] relative font-sans"
            >
              <button
                onClick={() => setShowRules(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold font-chuunibyou text-rose-300 text-glow mb-1">
                裏切りの盤上：能力体系録
              </h2>
              <p className="text-xs text-zinc-400 mb-5 font-mono">REVERSE FIELD TACTICAL ABILITIES</p>

              <div className="space-y-4 text-xs">
                {/* 1. 挟撃反転 */}
                <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-chuunibyou font-bold">
                      基本能力
                    </span>
                    <strong className="text-sm font-chuunibyou text-white">《挟撃反転（リバース）》</strong>
                  </div>
                  <p className="text-zinc-300 leading-relaxed">
                    新しく降臨させたコマで敵のコマを挟み込むと、敵の精神を書き換え、一瞬で味方に変貌させる悪魔的ルール。連続で多くのコマを反転させるほどチェインが発動する。
                  </p>
                </div>

                {/* 2. 絶対聖域 */}
                <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-chuunibyou font-bold">
                      絶対聖域
                    </span>
                    <strong className="text-sm font-chuunibyou text-white">《絶対聖域（コーナー）》</strong>
                  </div>
                  <p className="text-zinc-300 leading-relaxed">
                    四隅（A1, A8, H1, H8）のマスに降臨したコマは「絶対防御」を獲得。いかなる敵の挟撃をもってしても永劫に反転不可能となる戦況支配の要衝。
                  </p>
                </div>

                {/* 3. 全滅返し */}
                <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-chuunibyou font-bold animate-pulse">
                      真の恐怖
                    </span>
                    <strong className="text-sm font-chuunibyou text-white">《全滅返し（カタストロフ）》</strong>
                  </div>
                  <p className="text-zinc-300 leading-relaxed">
                    劣勢の絶望から一挙に5体以上の敵駒を呑み込んで反転させた際に発動する大逆転劇。勝ち誇った敵を盤上から一撃で叩き落とす。
                  </p>
                </div>

                {/* 4. カウントダウンタイマー */}
                <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-chuunibyou font-bold">
                      思考限界
                    </span>
                    <strong className="text-sm font-chuunibyou text-white">《思考限界時間（タイマー）》</strong>
                  </div>
                  <p className="text-zinc-300 leading-relaxed">
                    設定された秒数（10秒/15秒/30秒）以内に着手せねばならず、時間切れになると《思考限界・強制降臨》が自動執行される。
                  </p>
                </div>

                {/* 5. 音響テーマ */}
                <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-chuunibyou font-bold">
                      音響詠唱
                    </span>
                    <strong className="text-sm font-chuunibyou text-white">《音響テーマ（サウンド・プロファイル）》</strong>
                  </div>
                  <p className="text-zinc-300 leading-relaxed mb-2">
                    ヘッダーの選択肢より、戦場を彩るシンセ音響スタイルをリアルタイムに切り替え可能：
                  </p>
                  <div className="grid grid-cols-1 gap-1 text-[11px] text-zinc-400">
                    <div>· <strong className="text-zinc-200">冥界ゴシック (GOTHIC)</strong>: 大聖堂の鐘、重厚な鉄石の打音、陰鬱なオルガン和音</div>
                    <div>· <strong className="text-zinc-200">電脳サイバー (CYBER)</strong>: 高速レーザーパルス、FMデジタルグリッチ、重低音サイバーベース</div>
                    <div>· <strong className="text-zinc-200">深淵魔導 (FANTASY)</strong>: 漆黒の呪術波、神聖アルペジオ、地響きサブベース</div>
                  </div>
                </div>
              </div>

              <div className="mt-5 text-center">
                <button
                  onClick={() => setShowRules(false)}
                  className="px-6 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all text-xs"
                >
                  戦場へ戻る
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End-of-Game Strategic Analysis Modal with Recharts Line Chart */}
      <AnimatePresence>
        {gameOver && showEndGameChart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.92, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 15 }}
              className="w-full max-w-4xl flex justify-center my-auto"
            >
              <BattleScoreChart
                history={history}
                scores={scores}
                onRestart={handleRestart}
                onCopyHistory={handleCopyHistory}
                copied={copied}
                onCloseOverlay={() => setShowEndGameChart(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="w-full py-2 px-4 border-t border-white/5 bg-black/80 text-center text-[10px] text-zinc-500 font-sans z-10 flex items-center justify-center gap-4">
        <span>裏切りの盤上（リバース・フィールド） v1.2</span>
        <span>·</span>
        <span>基本能力《挟撃反転》</span>
        <span>·</span>
        <span>絶対聖域《コーナー》</span>
        <span>·</span>
        <span>真の恐怖《全滅返し》</span>
      </footer>

    </div>
  );
}
