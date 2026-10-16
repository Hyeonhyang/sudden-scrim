"use client";

import React from "react";
import { Player } from "@/types";
import { Position, POSITIONS, getTierDisplay, getTierColor, Game } from "@/lib/tiers";

type Props = {
  players: Player[];
  participants: Map<string, { teamNumber: number; sessionPosition: Position | null }>;
  teamCount: number;
  isAdmin: boolean;
  isPubg?: boolean;
  game?: Game;
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
  onReorderRifle?: (teamNum: number, newOrder: string[]) => void;
};

const TEAM_COLORS = [
  "",
  "border-blue-600 bg-blue-950/30",
  "border-red-600 bg-red-950/30",
  "border-green-600 bg-green-950/30",
  "border-purple-600 bg-purple-950/30",
  "border-orange-500 bg-orange-950/30",
  "border-cyan-500 bg-cyan-950/30",
  "border-pink-500 bg-pink-950/30",
  "border-lime-500 bg-lime-950/30",
];

const TEAM_TEXT_COLORS = [
  "",
  "text-blue-400",
  "text-red-400",
  "text-green-400",
  "text-purple-400",
  "text-orange-400",
  "text-cyan-400",
  "text-pink-400",
  "text-lime-400",
];

export default function TeamGrid({
  players,
  participants,
  teamCount,
  isAdmin,
  isPubg = false,
  game,
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
  onReorderRifle,
}: Props) {
  // game prop이 없으면 isPubg로부터 추론
  const currentGame: Game = game ?? (isPubg ? "pubg" : "suddenattack");
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, teamNum: number) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("playerId");
    if (playerId && isAdmin) {
      onAssignTeam(playerId, teamNum);
    }
  };

  const gridClass =
    teamCount <= 2 ? "grid-cols-1 md:grid-cols-2" :
    teamCount === 3 ? "grid-cols-1 md:grid-cols-3" :
    teamCount <= 4 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" :
    teamCount === 5 ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-5" :
    teamCount === 6 ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-6" :
    teamCount === 7 ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-7" :
    "grid-cols-2 md:grid-cols-4 lg:grid-cols-8";

  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {Array.from({ length: teamCount }, (_, i) => i + 1).map((teamNum) => {
        const stats = getTeamStats(teamNum);

        // 팀 선수 목록 (participants 순서 유지)
        const teamPlayersRaw: Player[] = [];
        for (const [pid] of participants) {
          const info = participants.get(pid);
          if (info && info.teamNumber === teamNum) {
            const p = players.find((pl) => pl.id === pid);
            if (p) teamPlayersRaw.push(p);
          }
        }

        const order = teamOrders?.[teamNum];
        const teamPlayers = order && order.length > 0
          ? (order.map((id) => teamPlayersRaw.find((p) => p.id === id)).filter(Boolean) as Player[])
              .concat(teamPlayersRaw.filter((p) => !order.includes(p.id)))
          : teamPlayersRaw;

        return (
          <div
            key={teamNum}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, teamNum)}
            className={`border-2 rounded-xl p-4 min-h-48 transition-colors ${TEAM_COLORS[teamNum] ?? "border-gray-600 bg-gray-900/30"}`}
          >
            {/* 팀 헤더 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className={`font-bold ${TEAM_TEXT_COLORS[teamNum] ?? "text-gray-400"}`}>
                  팀 {teamNum}
                </h3>
                {/* 서든 전용: 스나 슬롯 수 조정 + 정렬 버튼 */}
                {!isPubg && onChangeSnaSlots && (
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
                      onClick={() => onSortByTier && onSortByTier(teamNum)}
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

            {/* 배그 모드: 단순 목록, 4인 제한 */}
            {isPubg ? (
              <div className="flex flex-col gap-1.5">
                {teamPlayers.map((player) => (
                  <div
                    key={player.id}
                    draggable={isAdmin}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("playerId", player.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="flex items-center justify-between px-2 py-1.5 rounded bg-gray-800/60 text-sm cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] ${getTierColor(player.tier_label, currentGame)}`}>
                        {getTierDisplay(player.tier_label, currentGame)}
                      </span>
                      <span className="font-medium">{player.nickname}</span>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => onAssignTeam(player.id, 0)}
                        className="text-[10px] text-gray-500 hover:text-red-400 ml-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {teamPlayers.length === 0 && (
                  <p className="text-gray-700 text-[10px] text-center py-2">여기에 드롭</p>
                )}
                {teamPlayers.length >= 4 && (
                  <p className="text-xs text-orange-400 text-center py-1">팀 인원 가득 (4/4)</p>
                )}
              </div>
            ) : (
              /* 서든 모드: 스나/라이플 구분 */
              <div className="flex flex-col gap-1.5">
                {/* 스나 슬롯 */}
                {Array.from({ length: snaSlotsByTeam[teamNum] ?? 2 }).map((_, slotIdx) => {
                  const snaList = teamSnaPlayers?.[teamNum] ?? [];
                  const snaPlayerId = snaList[slotIdx] ?? null;
                  const player = snaPlayerId ? teamPlayers.find((p) => p.id === snaPlayerId) : null;

                  if (player) {
                    const info = participants.get(player.id)!;
                    const currentPos = info.sessionPosition ?? player.position ?? "R";
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
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const draggedId = e.dataTransfer.getData("playerId");
                          const fromArea = e.dataTransfer.getData("fromArea");
                          if (draggedId && isAdmin && fromArea === "rifle") {
                            if (onDropToSna) onDropToSna(teamNum, slotIdx, draggedId);
                            if (onDropToRifle) onDropToRifle(teamNum, player.id);
                          }
                        }}
                        className="flex items-center justify-between px-2 py-1.5 rounded bg-gray-800/60 text-sm cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] ${getTierColor(player.tier_label, currentGame)}`}>
                            {getTierDisplay(player.tier_label, currentGame)}
                          </span>
                          <span className="font-medium">{player.nickname}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {isAdmin ? (
                            <select
                              value={currentPos}
                              onChange={(e) => onChangePosition(player.id, e.target.value as Position)}
                              className="text-[11px] bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-gray-200"
                            >
                              {POSITIONS.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
                            </select>
                          ) : (
                            <span className="text-[11px] text-gray-400">{currentPos}</span>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => onRemoveSna && onRemoveSna(teamNum, slotIdx)}
                              className="text-[10px] text-gray-500 hover:text-red-400 ml-1"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div
                        key={`sna-empty-${teamNum}-${slotIdx}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const pid = e.dataTransfer.getData("playerId");
                          if (pid && isAdmin && onDropToSna) onDropToSna(teamNum, slotIdx, pid);
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
                    const pid = e.dataTransfer.getData("playerId");
                    if (pid && isAdmin && onDropToRifle) onDropToRifle(teamNum, pid);
                  }}
                >
                  {(() => {
                    const snaIds = new Set(
                      (teamSnaPlayers?.[teamNum] ?? []).filter(Boolean) as string[]
                    );
                    const riflePlayersRaw = teamPlayers.filter((p) => !snaIds.has(p.id));
                    const rifleOrder = teamOrders?.[teamNum];
                    const riflePlayers = rifleOrder && rifleOrder.length > 0
                      ? (rifleOrder.map((id) => riflePlayersRaw.find((p) => p.id === id)).filter(Boolean) as Player[])
                          .concat(riflePlayersRaw.filter((p) => !rifleOrder.includes(p.id)))
                      : riflePlayersRaw;

                    if (riflePlayers.length === 0) {
                      return <p className="text-gray-700 text-[10px] text-center py-1">라이플 자리</p>;
                    }

                    return riflePlayers.map((player) => {
                      const info = participants.get(player.id)!;
                      const currentPos = info.sessionPosition ?? player.position ?? "R";
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
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const draggedId = e.dataTransfer.getData("playerId");
                            const fromArea = e.dataTransfer.getData("fromArea");
                            const fromTeam = e.dataTransfer.getData("fromTeam");
                            if (!draggedId || !isAdmin || player.id === draggedId) return;

                            if (fromArea === "sna") {
                              const fromSlotIdx = Number(e.dataTransfer.getData("fromSlotIdx"));
                              if (onDropToRifle) onDropToRifle(teamNum, draggedId);
                              if (onDropToSna && !isNaN(fromSlotIdx)) onDropToSna(teamNum, fromSlotIdx, player.id);
                            } else if (fromArea === "rifle" && fromTeam === String(teamNum) && onSwapInTeam) {
                              const sIds = new Set((teamSnaPlayers?.[teamNum] ?? []).filter(Boolean) as string[]);
                              const localRifle = teamPlayers.filter((p) => !sIds.has(p.id));
                              const fromIdx = localRifle.findIndex((p) => p.id === draggedId);
                              const toIdx = localRifle.findIndex((p) => p.id === player.id);
                              if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
                                const cur = teamOrders?.[teamNum] ?? localRifle.map((p) => p.id);
                                const newOrder = [...cur];
                                const fIdx = newOrder.indexOf(draggedId);
                                const tIdx = newOrder.indexOf(player.id);
                                if (fIdx !== -1 && tIdx !== -1) {
                                  [newOrder[fIdx], newOrder[tIdx]] = [newOrder[tIdx], newOrder[fIdx]];
                                  if (onReorderRifle) onReorderRifle(teamNum, newOrder);
                                }
                              }
                            } else if (onDropToRifle) {
                              onDropToRifle(teamNum, draggedId);
                            }
                          }}
                          className="flex items-center justify-between px-2 py-1.5 rounded bg-gray-800/60 text-sm cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] ${getTierColor(player.tier_label, currentGame)}`}>
                              {getTierDisplay(player.tier_label, currentGame)}
                            </span>
                            <span className="font-medium">{player.nickname}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {isAdmin ? (
                              <select
                                value={currentPos}
                                onChange={(e) => onChangePosition(player.id, e.target.value as Position)}
                                className="text-[11px] bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-gray-200"
                              >
                                {POSITIONS.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
                              </select>
                            ) : (
                              <span className="text-[11px] text-gray-400">{currentPos}</span>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => onAssignTeam(player.id, 0)}
                                className="text-[10px] text-gray-500 hover:text-red-400 ml-1"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                  {/* 라이플 하단 드롭존 */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const pid = e.dataTransfer.getData("playerId");
                      if (pid && isAdmin && onDropToRifle) onDropToRifle(teamNum, pid);
                    }}
                    className="min-h-[20px] rounded border border-transparent hover:border-dashed hover:border-gray-700"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
