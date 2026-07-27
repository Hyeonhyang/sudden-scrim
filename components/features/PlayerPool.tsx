"use client";

import { useState } from "react";
import { Player } from "@/types";
import { Position, TIERS } from "@/lib/tiers";

type Props = {
  players: Player[]; // 풀에 있는 선수들만
  allPlayers: Player[];
  participants: Map<string, { teamNumber: number; sessionPosition: Position | null }>;
  teamCount: number;
  isAdmin: boolean;
  onAssignTeam: (playerId: string, teamNumber: number) => void | Promise<void>;
  onAddToBalance: (playerId: string, slot: 1 | 2) => void;
  onToggleParticipant: (playerId: string) => void | Promise<void>;
  balanceIds: Set<string>;
  onRemoveFromBalance: (playerId: string) => void;
};

export default function PlayerPool({ players, allPlayers, participants, teamCount, isAdmin, onAssignTeam, onAddToBalance, onToggleParticipant, balanceIds, onRemoveFromBalance }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, playerId: string) => {
    e.dataTransfer.setData("playerId", playerId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("playerId");
    if (playerId && isAdmin) {
      // 밸런스에 있으면 밸런스에서 제거
      if (balanceIds.has(playerId)) {
        onRemoveFromBalance(playerId);
      }
      // 참가 안 된 선수면 먼저 참가시키기
      if (!participants.has(playerId)) {
        onToggleParticipant(playerId);
      } else {
        onAssignTeam(playerId, 0);
      }
    }
  };

  const handleClick = (playerId: string) => {
    if (!isAdmin) return;
    setSelectedPlayer(selectedPlayer === playerId ? null : playerId);
  };

  // 티어별 그룹화
  const playersByTier = TIERS.filter((tier) =>
    players.some((p) => p.tier_score === tier.score)
  ).map((tier) => ({
    tier,
    players: players.filter((p) => p.tier_score === tier.score),
  }));

  if (players.length === 0) {
    return (
      <section
        className="border border-gray-800 rounded-xl p-4 bg-gray-900/50"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <h2 className="text-sm font-bold text-gray-300 mb-2">참가자 풀 (미배치)</h2>
        <p className="text-gray-500 text-sm text-center py-2">참가자를 선택해주세요 (또는 여기에 드롭)</p>
      </section>
    );
  }

  return (
    <section
      className="border border-yellow-900/50 rounded-xl p-4 bg-yellow-950/20"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <h2 className="text-sm font-bold text-yellow-300 mb-2">
        참가자 풀 (미배치) — {players.length}명
      </h2>
      <div className="flex flex-col gap-2">
        {playersByTier.map(({ tier, players: tierPlayers }) => (
          <div key={tier.score} className="flex items-start gap-2">
            <span className="text-xs font-bold text-gray-500 w-20 shrink-0 pt-0.5">
              {tier.label}
            </span>
            <div className="flex flex-wrap gap-1.5 flex-1">
              {tierPlayers.map((player) => (
                <div key={player.id} className="relative">
                  <button
                    draggable={isAdmin}
                    onDragStart={(e) => handleDragStart(e, player.id)}
                    onClick={() => handleClick(player.id)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border transition-all cursor-pointer select-none ${
                      selectedPlayer === player.id
                        ? "bg-indigo-700 border-indigo-400 text-white"
                        : balanceIds.has(player.id)
                        ? "bg-pink-600/40 border-pink-400 text-pink-200"
                        : "bg-gray-800 border-gray-700 text-gray-200 hover:border-gray-500"
                    } ${isAdmin ? "active:scale-95" : ""}`}
                  >
                    <span>{player.nickname}</span>
                    <span className="opacity-60">{player.position}</span>
                  </button>

                  {/* 클릭 시 팀 선택 팝업 */}
                  {selectedPlayer === player.id && isAdmin && (
                    <div className="absolute top-full left-0 mt-1 z-20 flex gap-1 bg-gray-900 border border-gray-600 rounded-lg p-1.5 shadow-xl animate-fade-in">
                      <button
                        onClick={(e) => { e.stopPropagation(); if (!participants.has(player.id)) onToggleParticipant(player.id); onAddToBalance(player.id, 1); setSelectedPlayer(null); }}
                        className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white font-medium whitespace-nowrap"
                      >
                        밸1
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (!participants.has(player.id)) onToggleParticipant(player.id); onAddToBalance(player.id, 2); setSelectedPlayer(null); }}
                        className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white font-medium whitespace-nowrap"
                      >
                        밸2
                      </button>
                      {Array.from({ length: teamCount }, (_, i) => i + 1).map((t) => (
                        <button
                          key={t}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAssignTeam(player.id, t);
                            setSelectedPlayer(null);
                          }}
                          className="px-2 py-1 text-xs rounded bg-indigo-700 hover:bg-indigo-600 text-white font-medium whitespace-nowrap"
                        >
                          팀{t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 바깥 클릭하면 팝업 닫기 */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-10" onClick={() => setSelectedPlayer(null)} />
      )}
    </section>
  );
}
