"use client";

import { useState } from "react";
import { Player } from "@/types";
import { Position } from "@/lib/tiers";

type Props = {
  players: Player[];
  participants: Map<string, { teamNumber: number; sessionPosition: Position | null }>;
  teamCount: number;
  isAdmin: boolean;
  onAssignTeam: (playerId: string, teamNumber: number) => void | Promise<void>;
};

export default function PlayerPool({ players, participants, teamCount, isAdmin, onAssignTeam }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, playerId: string) => {
    e.dataTransfer.setData("playerId", playerId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleClick = (playerId: string) => {
    if (!isAdmin) return;
    setSelectedPlayer(selectedPlayer === playerId ? null : playerId);
  };

  if (players.length === 0) {
    return (
      <section
        className="border border-gray-800 rounded-xl p-4 bg-gray-900/50"
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
        onDrop={(e) => {
          e.preventDefault();
          const playerId = e.dataTransfer.getData("playerId");
          if (playerId && isAdmin) onAssignTeam(playerId, 0);
        }}
      >
        <h2 className="text-sm font-bold text-gray-300 mb-2">참가자 풀 (미배치)</h2>
        <p className="text-gray-500 text-sm text-center py-2">참가자를 선택해주세요 (또는 여기에 드롭)</p>
      </section>
    );
  }

  return (
    <section
      className="border border-yellow-900/50 rounded-xl p-4 bg-yellow-950/20"
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
      onDrop={(e) => {
        e.preventDefault();
        const playerId = e.dataTransfer.getData("playerId");
        if (playerId && isAdmin) onAssignTeam(playerId, 0);
      }}
    >
      <h2 className="text-sm font-bold text-yellow-300 mb-2">
        참가자 풀 (미배치) — {players.length}명
      </h2>
      <div className="flex flex-wrap gap-2">
        {players.map((player) => (
          <div key={player.id} className="relative">
            <button
              draggable={isAdmin}
              onDragStart={(e) => handleDragStart(e, player.id)}
              onClick={() => handleClick(player.id)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm border transition-all cursor-pointer select-none ${
                selectedPlayer === player.id
                  ? "bg-indigo-700 border-indigo-400 text-white"
                  : "bg-gray-800 border-gray-700 text-gray-200 hover:border-gray-500"
              } ${isAdmin ? "active:scale-95" : ""}`}
            >
              <span className="text-[10px] text-gray-400">{player.tier_label}</span>
              <span className="font-medium">{player.nickname}</span>
              <span className="text-[10px] text-gray-400">{player.position}</span>
            </button>

            {/* 클릭 시 팀 선택 팝업 */}
            {selectedPlayer === player.id && isAdmin && (
              <div className="absolute top-full left-0 mt-1 z-20 flex gap-1 bg-gray-900 border border-gray-600 rounded-lg p-1.5 shadow-xl animate-fade-in">
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

      {/* 바깥 클릭하면 팝업 닫기 */}
      {selectedPlayer && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setSelectedPlayer(null)}
        />
      )}
    </section>
  );
}
