"use client";

import React from "react";
import { Player } from "@/types";
import { Position, POSITIONS, POSITION_LABELS, getTierDisplay } from "@/lib/tiers";

type Props = {
  players: Player[];
  participants: Map<string, { teamNumber: number; sessionPosition: Position | null }>;
  teamCount: number;
  isAdmin: boolean;
  onAssignTeam: (playerId: string, teamNumber: number) => void | Promise<void>;
  onChangePosition: (playerId: string, position: Position) => void | Promise<void>;
  getTeamStats: (teamNumber: number) => { total: number; avg: string; count: number };
  onSwapInTeam?: (teamNum: number, fromIdx: number, toIdx: number) => void;
  teamOrders?: Record<number, string[]>;
  snaSlotsByTeam?: Record<number, number>;
  teamSnaPlayers?: Record<number, (string | null)[]>;
  onChangeSnaSlots?: (teamNum: number, count: number) => void;
  onSortByTier?: (teamNum: number) => void;
  onDropToSna?: (teamNum: number, slotIdx: number, playerId: string) => void;
  onDropToRifle?: (teamNum: number, playerId: string) => void;
  onRemoveSna?: (teamNum: number, slotIdx: number) => void;
};

const TEAM_COLORS = [
  "", // 0 = pool
  "border-blue-600 bg-blue-950/30",
  "border-red-600 bg-red-950/30",
  "border-green-600 bg-green-950/30",
  "border-purple-600 bg-purple-950/30",
];

const TEAM_TEXT_COLORS = [
  "",
  "text-blue-400",
  "text-red-400",
  "text-green-400",
  "text-purple-400",
];

export default function TeamGrid({
  players,
  participants,
  teamCount,
  isAdmin,
  onAssignTeam,
  onChangePosition,
  getTeamStats,
  onSwapInTeam,
  teamOrders,
  snaSlotsByTeam = {},
  teamSnaPlayers = {},
  onChangeSnaSlots,
  onSortByTier,
  onDropToSna,
  onDropToRifle,
  onRemoveSna,
}: Props) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, teamNum: number) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("playerId");
    if (playerId && isAdmin) {
      // 팀 전체 영역에 드롭 = 라이플(아래) 배치
      onAssignTeam(playerId, teamNum);
    }
  };

  return (
    <div className={`grid gap-4 ${teamCount <= 2 ? "grid-cols-1 md:grid-cols-2" : teamCount === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"}`}>
      {Array.from({ length: teamCount }, (_, i) => i + 1).map((teamNum) => {
        const stats = getTeamStats(teamNum);
        const teamPlayersRaw = players.filter((p) => {
          const info = participants.get(p.id);
          return info && info.teamNumber === teamNum;
        });
        // teamOrders로 정렬 (없으면 참가 순서 유지 - tier 정렬 안 함)
        const order = teamOrders?.[teamNum];
        const teamPlayers = order
          ? order.map((id) => teamPlayersRaw.find((p) => p.id === id)).filter(Boolean).concat(
              teamPlayersRaw.filter((p) => !order.includes(p.id))
            ) as Player[]
          : teamPlayersRaw;

        return (
          <div
            key={teamNum}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, teamNum)}
            className={`border-2 rounded-xl p-4 min-h-48 transition-colors ${TEAM_COLORS[teamNum]}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className={`font-bold ${TEAM_TEXT_COLORS[teamNum]}`}>
                  팀 {teamNum}
                </h3>
                {onChangeSnaSlots && (
                  <div className="flex gap-0.5">
                    {[1, 2].map((n) => (
                      <button
                        key={n}
                        onClick={() => onChangeSnaSlots(teamNum, n)}
                        className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${
                          (snaSlotsByTeam[teamNum] ?? 2) === n
                            ? "bg-gray-600 text-white"
                            : "bg-gray-800 text-gray-500 hover:text-gray-300"
                        }`}
                        title={`스나 ${n}명`}
                      >
                        S{n}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        if (onSortByTier) onSortByTier(teamNum);
                      }}
                      className="px-1.5 py-0.5 text-[9px] rounded bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors ml-1"
                      title="라이플 티어순 정렬"
                    >
                      정렬
                    </button>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-400">
                <span>{stats.count}명</span>
                <span className="mx-1">|</span>
                <span>합산: {stats.total}</span>
                <span className="mx-1">|</span>
                <span>평균: {stats.avg}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              {/* 스나 슬롯 (고정 칸 - 비어있어도 표시) */}
              {Array.from({ length: snaSlotsByTeam[teamNum] ?? 2 }).map((_, slotIdx) => {
                const snaList = teamSnaPlayers?.[teamNum] ?? [];
                const playerId = snaList[slotIdx] ?? null;
                const player = playerId ? teamPlayers.find(p => p.id === playerId) : null;
                
                if (player) {
                  const info = participants.get(player.id)!;
                  const currentPos = info.sessionPosition || player.position;
                  return (
                    <div
                      key={player.id}
                      draggable={isAdmin}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("playerId", player.id);
                        e.dataTransfer.setData("fromArea", "sna");
                        e.dataTransfer.setData("fromTeam", String(teamNum));
                        e.dataTransfer.setData("fromSlotIdx", String(slotIdx));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="flex items-center justify-between px-2 py-1.5 rounded bg-gray-800/60 text-sm cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">{getTierDisplay(player.tier_label)}</span>
                        <span className="font-medium">{player.nickname}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {isAdmin ? (
                          <select value={currentPos} onChange={(e) => onChangePosition(player.id, e.target.value as Position)} className="text-[11px] bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-gray-200">
                            {POSITIONS.map((pos) => (<option key={pos} value={pos}>{pos}</option>))}
                          </select>
                        ) : (<span className="text-[11px] text-gray-400">{currentPos}</span>)}
                        {isAdmin && (<button onClick={() => { if (onRemoveSna) onRemoveSna(teamNum, slotIdx); }} className="text-[10px] text-gray-500 hover:text-red-400 ml-1">✕</button>)}
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={`sna-empty-${teamNum}-${slotIdx}`}
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const playerId = e.dataTransfer.getData("playerId");
                        if (playerId && isAdmin && onDropToSna) {
                          onDropToSna(teamNum, slotIdx, playerId);
                        }
                      }}
                      className="px-2 py-1.5 rounded border border-dashed border-gray-700 text-[10px] text-gray-600 text-center"
                    >
                      스나 {slotIdx + 1}
                    </div>
                  );
                }
              })}

              {/* 구분선 */}
              <div className="flex items-center gap-2 my-0.5">
                <div className="flex-1 border-t border-dashed border-gray-600" />
                <span className="text-[10px] text-gray-500">▼ 라이플</span>
                <div className="flex-1 border-t border-dashed border-gray-600" />
              </div>

              {/* 라이플 영역 */}
              <div
                className="flex flex-col gap-1.5 min-h-[24px]"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const playerId = e.dataTransfer.getData("playerId");
                  if (playerId && isAdmin && onDropToRifle) {
                    onDropToRifle(teamNum, playerId);
                  }
                }}
              >
                {(() => {
                  const snaIds = new Set((teamSnaPlayers?.[teamNum] ?? []).filter(Boolean) as string[]);
                  const riflePlayers = teamPlayers.filter(p => !snaIds.has(p.id));
                  
                  if (riflePlayers.length === 0) {
                    return <p className="text-gray-700 text-[10px] text-center py-1">라이플 자리</p>;
                  }
                  
                  return riflePlayers.map((player, idx) => {
                    const info = participants.get(player.id)!;
                    const currentPos = info.sessionPosition || player.position;
                    return (
                      <div
                        key={player.id}
                        draggable={isAdmin}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("playerId", player.id);
                          e.dataTransfer.setData("fromArea", "rifle");
                          e.dataTransfer.setData("fromTeam", String(teamNum));
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(e) => { e.preventDefault(); }}
                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        className="flex items-center justify-between px-2 py-1.5 rounded bg-gray-800/60 text-sm cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500">{getTierDisplay(player.tier_label)}</span>
                          <span className="font-medium">{player.nickname}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {isAdmin ? (
                            <select value={currentPos} onChange={(e) => onChangePosition(player.id, e.target.value as Position)} className="text-[11px] bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-gray-200">
                              {POSITIONS.map((pos) => (<option key={pos} value={pos}>{pos}</option>))}
                            </select>
                          ) : (<span className="text-[11px] text-gray-400">{currentPos}</span>)}
                          {isAdmin && (<button onClick={() => onAssignTeam(player.id, 0)} className="text-[10px] text-gray-500 hover:text-red-400 ml-1">✕</button>)}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
