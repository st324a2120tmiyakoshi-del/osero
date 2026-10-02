import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { Shield, Zap, RotateCcw, Copy, Check, Eye, Trophy, Skull, Scale } from 'lucide-react';
import type { TurnHistoryItem } from './App';

interface BattleScoreChartProps {
  history: TurnHistoryItem[];
  scores: { 1: number; 2: number };
  onRestart: () => void;
  onCopyHistory: () => void;
  copied: boolean;
  onCloseOverlay: () => void;
}

interface ChartPoint {
  turn: number;
  turnLabel: string;
  playerScore: number;
  cpuScore: number;
  coord: string;
  actor: string;
  player: 1 | 2;
  actionName: string;
  actionType: TurnHistoryItem['actionType'];
  flipsCount: number;
  isCalamity: boolean;
  isCorner: boolean;
}

export const BattleScoreChart: React.FC<BattleScoreChartProps> = ({
  history,
  scores,
  onRestart,
  onCopyHistory,
  copied,
  onCloseOverlay
}) => {
  const [selectedTurn, setSelectedTurn] = useState<number | null>(null);

  // Reconstruct chronological progression from start
  const chronological = history.slice().reverse();

  const chartData: ChartPoint[] = [
    {
      turn: 0,
      turnLabel: '開戦',
      playerScore: 2,
      cpuScore: 2,
      coord: '-',
      actor: '開戦',
      player: 1,
      actionName: '開戦初期配置',
      actionType: 'normal',
      flipsCount: 0,
      isCalamity: false,
      isCorner: false,
    },
    ...chronological.map(item => ({
      turn: item.turnNumber,
      turnLabel: `T${item.turnNumber}`,
      playerScore: item.scoreAfter[1],
      cpuScore: item.scoreAfter[2],
      coord: item.coordLabel,
      actor: item.player === 1 ? '漆黒の軍勢 (YOU)' : '純白の騎士団 (CPU)',
      player: item.player,
      actionName: item.actionName,
      actionType: item.actionType,
      flipsCount: item.flipsCount,
      isCalamity: item.actionType === 'calamity',
      isCorner: item.actionType === 'corner',
    }))
  ];

  // Identify all strategic turning points (Corner and Calamity)
  const strategicEvents = chartData.filter(d => d.isCalamity || d.isCorner);
  const cornerCountPlayer = chronological.filter(h => h.player === 1 && h.actionType === 'corner').length;
  const cornerCountCPU = chronological.filter(h => h.player === 2 && h.actionType === 'corner').length;
  const calamityCountPlayer = chronological.filter(h => h.player === 1 && h.actionType === 'calamity').length;
  const calamityCountCPU = chronological.filter(h => h.player === 2 && h.actionType === 'calamity').length;

  const isPlayerWin = scores[1] > scores[2];
  const isCPUWin = scores[2] > scores[1];

  // Custom Dot for strategic moves
  const renderStrategicDot = (props: { cx?: number; cy?: number; payload?: ChartPoint }) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy || !payload) return null;

    if (payload.isCalamity) {
      return (
        <g key={`calamity-dot-${payload.turn}`}>
          <circle cx={cx} cy={cy} r={10} fill="#ef4444" opacity={0.35} className="animate-ping" />
          <circle cx={cx} cy={cy} r={6} fill="#dc2626" stroke="#ffffff" strokeWidth={2} />
        </g>
      );
    }

    if (payload.isCorner) {
      return (
        <g key={`corner-dot-${payload.turn}`}>
          <polygon
            points={`${cx},${cy - 7} ${cx + 6},${cy} ${cx},${cy + 7} ${cx - 6},${cy}`}
            fill="#f59e0b"
            stroke="#ffffff"
            strokeWidth={1.5}
          />
        </g>
      );
    }

    return null;
  };

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartPoint }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black/95 border border-zinc-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs font-sans max-w-xs">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-2">
            <span className="font-mono font-bold text-zinc-300">
              {data.turn === 0 ? '対戦開始' : `第 ${data.turn} 手 [${data.coord}]`}
            </span>
            <span className="text-[11px] text-zinc-400 font-chuunibyou font-bold">
              {data.actor}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 mb-2 font-mono">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
              <span>漆黒: {data.playerScore}</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
              <span>純白: {data.cpuScore}</span>
            </div>
          </div>

          {data.isCalamity && (
            <div className="mt-1.5 p-2 rounded-lg bg-red-950/70 border border-red-500/70 text-red-200 font-chuunibyou text-[11px] flex items-center gap-2 shadow-[0_0_12px_rgba(239,68,68,0.4)]">
              <Zap className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
              <div>
                <strong className="block text-red-300">真の恐怖《全滅返し》発動！</strong>
                <span>一撃で {data.flipsCount} 体の精神を書き換えた</span>
              </div>
            </div>
          )}

          {data.isCorner && (
            <div className="mt-1.5 p-2 rounded-lg bg-amber-950/70 border border-amber-500/70 text-amber-200 font-chuunibyou text-[11px] flex items-center gap-2 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <strong className="block text-amber-300">《絶対聖域(コーナー)》制圧！</strong>
                <span>永劫反転不能の防衛拠点を獲得</span>
              </div>
            </div>
          )}

          {!data.isCalamity && !data.isCorner && data.turn > 0 && (
            <div className="text-[11px] text-zinc-400 font-chuunibyou">
              {data.actionName} (反転 {data.flipsCount}体)
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-4xl bg-zinc-950/95 border-2 border-rose-500/80 rounded-2xl p-5 md:p-6 shadow-[0_0_60px_rgba(225,29,72,0.4)] backdrop-blur-2xl text-white font-sans max-h-[88vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
      
      {/* Result Header */}
      <div className="text-center pb-4 border-b border-white/10 relative">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono mb-2">
          {isPlayerWin ? (
            <><Trophy className="w-3.5 h-3.5 text-amber-400" /> 漆黒の完全制圧</>
          ) : isCPUWin ? (
            <><Skull className="w-3.5 h-3.5 text-blue-400" /> 純白の掌握</>
          ) : (
            <><Scale className="w-3.5 h-3.5 text-zinc-400" /> 運命の均衡（引分）</>
          )}
        </div>

        <h2 className="text-2xl sm:text-4xl font-black font-chuunibyou text-white text-glow tracking-wider mb-2">
          {isPlayerWin
            ? "漆黒の完全掌握...!!"
            : isCPUWin
            ? "純白による制裁..."
            : "神々の引き分け（均衡）"}
        </h2>

        <p className="text-xs sm:text-sm text-zinc-400 font-chuunibyou">
          最終軍勢: <strong className="text-rose-400 font-mono text-base">漆黒 {scores[1]}体</strong> vs{" "}
          <strong className="text-blue-400 font-mono text-base">純白 {scores[2]}体</strong>（総着手: 全{history.length}手）
        </p>
      </div>

      {/* Strategic Metrics Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
        <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-900/30 flex flex-col items-center text-center">
          <div className="flex items-center gap-1 text-[11px] text-rose-300 mb-1">
            <Shield className="w-3 h-3 text-amber-400" />
            <span>漆黒 聖域制圧</span>
          </div>
          <span className="text-lg font-mono font-bold text-white">{cornerCountPlayer} / 4隅</span>
        </div>

        <div className="p-2.5 rounded-xl bg-blue-950/20 border border-blue-900/30 flex flex-col items-center text-center">
          <div className="flex items-center gap-1 text-[11px] text-blue-300 mb-1">
            <Shield className="w-3 h-3 text-amber-400" />
            <span>純白 聖域制圧</span>
          </div>
          <span className="text-lg font-mono font-bold text-white">{cornerCountCPU} / 4隅</span>
        </div>

        <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-900/30 flex flex-col items-center text-center">
          <div className="flex items-center gap-1 text-[11px] text-rose-300 mb-1">
            <Zap className="w-3 h-3 text-red-400" />
            <span>漆黒 全滅返し</span>
          </div>
          <span className="text-lg font-mono font-bold text-red-400">{calamityCountPlayer}回発動</span>
        </div>

        <div className="p-2.5 rounded-xl bg-blue-950/20 border border-blue-900/30 flex flex-col items-center text-center">
          <div className="flex items-center gap-1 text-[11px] text-blue-300 mb-1">
            <Zap className="w-3 h-3 text-red-400" />
            <span>純白 全滅返し</span>
          </div>
          <span className="text-lg font-mono font-bold text-red-400">{calamityCountCPU}回発動</span>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-black/60 border border-white/10 rounded-xl p-3 sm:p-4 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 font-chuunibyou">
              <span>戦況推移チャート（Score Progression）</span>
              <span className="text-[10px] text-zinc-400 font-sans font-normal">
                ※角の制圧《絶対聖域》および5枚以上《全滅返し》の影響をプロット
              </span>
            </h3>
          </div>

          {/* Legend Items */}
          <div className="flex items-center flex-wrap gap-3 text-[11px] font-sans">
            <div className="flex items-center gap-1.5 text-rose-300">
              <span className="w-3 h-0.5 bg-rose-500 inline-block" />
              <span>漆黒(YOU)</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-300">
              <span className="w-3 h-0.5 bg-blue-500 inline-block" />
              <span>純白(CPU)</span>
            </div>
            <div className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rotate-45 bg-amber-400 inline-block" />
              <span>聖域(Corner)</span>
            </div>
            <div className="flex items-center gap-1 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" />
              <span>全滅返し(Calamity)</span>
            </div>
          </div>
        </div>

        {/* Recharts LineChart */}
        <div className="w-full h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 12, right: 12, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.6} />
              <XAxis
                dataKey="turn"
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                tickFormatter={(val) => (val === 0 ? '開戦' : `T${val}`)}
              />
              <YAxis
                domain={[0, 64]}
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                ticks={[0, 16, 32, 48, 64]}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Vertical Reference Lines for Calamity Events */}
              {strategicEvents.map((ev, i) => (
                <ReferenceLine
                  key={`ref-line-${ev.turn}-${i}`}
                  x={ev.turn}
                  stroke={ev.isCalamity ? '#ef4444' : '#f59e0b'}
                  strokeDasharray={ev.isCalamity ? '3 3' : '2 2'}
                  strokeWidth={ev.isCalamity ? 1.5 : 1}
                  opacity={selectedTurn === ev.turn ? 1 : 0.45}
                />
              ))}

              {/* Player Score Line */}
              <Line
                type="monotone"
                dataKey="playerScore"
                name="漆黒"
                stroke="#f43f5e"
                strokeWidth={2.8}
                dot={renderStrategicDot}
                activeDot={{ r: 6, fill: '#f43f5e', stroke: '#ffffff', strokeWidth: 2 }}
              />

              {/* CPU Score Line */}
              <Line
                type="monotone"
                dataKey="cpuScore"
                name="純白"
                stroke="#3b82f6"
                strokeWidth={2.4}
                dot={renderStrategicDot}
                activeDot={{ r: 6, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strategic Breakdown of Key Turning Points */}
      <div className="mb-5">
        <h4 className="text-xs font-bold text-zinc-300 font-chuunibyou flex items-center gap-1.5 mb-2.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>戦略的変転の刻（Calamity & Corner Impact Breakdown）</span>
        </h4>

        {strategicEvents.length === 0 ? (
          <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-500 text-center font-sans">
            本対戦では《絶対聖域》および《全滅返し》の発動はありませんでした。
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 pr-1">
            {strategicEvents.map((ev, idx) => {
              const isP = ev.player === 1;
              const isSelected = selectedTurn === ev.turn;

              return (
                <div
                  key={`impact-${ev.turn}-${idx}`}
                  onMouseEnter={() => setSelectedTurn(ev.turn)}
                  onMouseLeave={() => setSelectedTurn(null)}
                  className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
                    ev.isCalamity
                      ? 'bg-red-950/25 border-red-500/40 hover:border-red-500'
                      : 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500'
                  } ${isSelected ? 'ring-1 ring-white/60 bg-white/5' : ''}`}
                >
                  <div className="flex items-center justify-between font-mono mb-1">
                    <span className="font-bold text-zinc-300 text-[11px]">
                      第{ev.turn}手 [{ev.coord}]
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-chuunibyou ${
                        isP ? 'text-rose-300 bg-rose-500/20' : 'text-blue-300 bg-blue-500/20'
                      }`}
                    >
                      {isP ? '漆黒' : '純白'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {ev.isCalamity ? (
                      <Zap className="w-3 h-3 text-red-400 shrink-0" />
                    ) : (
                      <Shield className="w-3 h-3 text-amber-400 shrink-0" />
                    )}
                    <span
                      className={`font-chuunibyou font-bold truncate ${
                        ev.isCalamity ? 'text-red-300' : 'text-amber-200'
                      }`}
                    >
                      {ev.isCalamity ? `《全滅返し》 一挙${ev.flipsCount}体反転` : `《絶対聖域》 [${ev.coord}]制圧`}
                    </span>
                  </div>

                  <div className="mt-1 text-[10px] font-mono text-zinc-400 flex justify-between">
                    <span>戦局への影響: 反転 +{ev.flipsCount}体</span>
                    <span>黒{ev.playerScore} - 白{ev.cpuScore}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 font-sans text-xs">
        <button
          onClick={onCloseOverlay}
          className="px-3.5 py-2 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 flex items-center gap-1.5 transition-all hover:text-white"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>最終盤面を確認（背後を表示）</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onCopyHistory}
            className="px-3.5 py-2 rounded-lg border border-white/20 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 flex items-center gap-1.5 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>戦歴記録を複写</span>
          </button>

          <button
            onClick={onRestart}
            className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5 shadow-[0_0_20px_rgba(225,29,72,0.8)] transition-all hover:scale-105 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>《再誕(リスタート)》</span>
          </button>
        </div>
      </div>
    </div>
  );
};
