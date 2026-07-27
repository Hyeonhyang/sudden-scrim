"use client";

import { useState } from "react";
import { Player } from "@/types";
import { Position, getTierDisplay } from "@/lib/tiers";

type Props = {
  players: Player[];
  balance1: (string | null)[];
  balance2: (string | null)[];
  teamCount: number;
  isAdmin: boolean;
  onDropToBalance: (playerId: string, slot: 1 | 2) => void;
  onRemoveFromBalance: (playerId: string, slot: 1 | 2) => void;
  onAssignTeam: (playerId: string, teamNumber: number) => void | Promise<void>;
  onFillSlot: (playerId: string, slot: 1 | 2, index: number) => void;
  onSwapInBalance: (slot: 1 | 2, fromIndex: number, toIndex: number) => void;
  onSwapBetweenBalance: (fromSlot: 1 | 2, fromIndex: number, toSlot: 1 | 2, toIndex: number) => void;
};

export default function BalanceCompare({
  players,
  balance1,
  balance2,
  teamCount,
  isAdmin,
  onDropToBalance,
  onRemoveFromBalance,
  onAssignTeam,
  onFillSlot,
  onSwapInBalance,
  onSwapBetweenBalance,
}: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; slot: 1 | 2 } | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, slot: 1 | 2) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("playerId");
    if (playerId && isAdmin) {
      // 반대 밸런스에서 오는 경우: 반대편에서 제거 후 이쪽에 추가
      const otherSlot = slot === 1 ? 2 : 1;
      const otherList = slot === 1 ? balance2 : balance1;
      if (otherList.includes(playerId)) {
        onRemoveFromBalance(playerId, otherSlot);
      }
      // 이미 같은 쪽에 있으면 무시
      const thisList = slot === 1 ? balance1 : balance2;
      if (thisList.includes(playerId)) return;
      onDropToBalance(playerId, slot);
    }
  };

  const handlePlayerClick = (playerId: string, slot: 1 | 2) => {
    if (!isAdmin) return;
    if (selectedPlayer?.id === playerId && selectedPlayer?.slot === slot) {
      setSelectedPlayer(null);
    } else {
      setSelectedPlayer({ id: playerId, slot });
    }
  };

  const handleMoveTo = (playerId: string, slot: 1 | 2, target: "pool" | number) => {
    if (target === "pool") {
      onRemoveFromBalance(playerId, slot);
      onAssignTeam(playerId, 0);
    } else {
      // 팀으로 보낼 때 - 훅 내부에서 밸런스 제거 (null로 위치 유지)
      onAssignTeam(playerId, target);
    }
    setSelectedPlayer(null);
  };

  const renderSlot = (slot: 1 | 2, playerIds: (string | null)[]) => {
    const slotEntries = playerIds.map((id) => id ? players.find((p) => p.id === id) || null : null);
    const activeCount = slotEntries.filter(Boolean).length;
    const totalScore = slotEntries.filter(Boolean).reduce((sum, p) => sum + (p?.tier_score ?? 0), 0);

    // 2명씩 짝 짓기
    const pairs: (Player | null)[][] = [];
    for (let i = 0; i < slotEntries.length; i += 2) {
      const pair: (Player | null)[] = [slotEntries[i] || null];
      if (i + 1 < slotEntries.length) {
        pair.push(slotEntries[i + 1] || null);
      }
      pairs.push(pair);
    }

    return (
      <div
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, slot)}
        className="flex-1 border border-gray-700 rounded-xl p-4 bg-gray-900/50 min-h-24"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-400">밸런스 {slot}</h3>
          <span className="text-xs text-gray-500">
            합산: {totalScore} | {activeCount}명
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {pairs.map((pair, rowIdx) => (
            <div key={rowIdx} className="flex gap-2">
              {pair.map((player, colIdx) => (
                <div key={`${rowIdx}-${colIdx}`} className="relative">
                  {player ? (
                    <button
                      draggable={isAdmin}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("playerId", player.id);
                        e.dataTransfer.setData("fromBalanceSlot", String(slot));
                        e.dataTransfer.setData("fromBalanceIndex", String(rowIdx * 2 + colIdx));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const draggedId = e.dataTransfer.getData("playerId");
                        const fromSlot = e.dataTransfer.getData("fromBalanceSlot");
                        const fromIndex = e.dataTransfer.getData("fromBalanceIndex");
                        if (!draggedId) return;
                        
                        const toIndex = rowIdx * 2 + colIdx;
                        
                        // 같은 밸런스 내에서 swap
                        if (fromSlot === String(slot) && fromIndex) {
                          if (Number(fromIndex) !== toIndex) {
                            onSwapInBalance(slot, Number(fromIndex), toIndex);
                          }
                        }
                        // 다른 밸런스에서 온 경우: 서로 교체
                        else if (fromSlot && fromSlot !== String(slot) && fromIndex && player) {
                          const fromSlotNum = Number(fromSlot) as 1 | 2;
                          const fromIdx = Number(fromIndex);
                          onSwapBetweenBalance(fromSlotNum, fromIdx, slot, toIndex);
                        }
                        // 밸런스 외부(팀/풀/DB)에서 온 경우: 밸런스에 추가
                        else if (!fromSlot) {
                          onDropToBalance(draggedId, slot);
                        }
                      }}
                      onClick={() => handlePlayerClick(player.id, slot)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-sm border transition-all cursor-pointer select-none ${
                        selectedPlayer?.id === player.id && selectedPlayer?.slot === slot
                          ? "bg-indigo-700 border-indigo-400 text-white"
                          : "bg-gray-800 border-gray-600 text-gray-200 hover:border-gray-500"
                      } ${isAdmin ? "active:scale-95" : ""}`}
                    >
                      <span className="opacity-60 text-xs">{getTierDisplay(player.tier_label)}</span>
                      <span className="font-medium">{player.nickname}</span>
                      <span className="opacity-60 text-xs">{player.position}</span>
                    </button>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const playerId = e.dataTransfer.getData("playerId");
                        const fromBalanceSlot = e.dataTransfer.getData("fromBalanceSlot");
                        const fromBalanceIndex = e.dataTransfer.getData("fromBalanceIndex");
                        if (playerId && isAdmin) {
                          const idx = rowIdx * 2 + colIdx;
                          if (fromBalanceSlot) {
                            const fromSlotNum = Number(fromBalanceSlot) as 1 | 2;
                            const fromIdx = Number(fromBalanceIndex);
                            // 같은 밸런스 내 이동
                            if (fromSlotNum === slot) {
                              onSwapInBalance(slot, fromIdx, idx);
                            } else {
                              // 다른 밸런스에서 빈자리로 이동
                              onSwapBetweenBalance(fromSlotNum, fromIdx, slot, idx);
                            }
                          } else {
                            // 외부(팀/풀/DB)에서 빈 슬롯에 드롭
                            onFillSlot(playerId, slot, idx);
                          }
                        }
                      }}
                      className="inline-flex items-center px-3 py-1 rounded text-sm border border-dashed border-gray-700 text-gray-700 min-w-[60px] justify-center hover:border-gray-500 hover:text-gray-500 transition-colors"
                    >
                      —
                    </div>
                  )}

                  {/* 클릭 시 이동 팝업 */}
                  {player && selectedPlayer?.id === player.id && selectedPlayer?.slot === slot && isAdmin && (
                    <div className="absolute top-full left-0 mt-1 z-20 flex gap-1 bg-gray-900 border border-gray-600 rounded-lg p-1.5 shadow-xl animate-fade-in">
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemoveFromBalance(player.id, slot); setSelectedPlayer(null); }}
                        className="px-2 py-1 text-[10px] rounded bg-yellow-700 hover:bg-yellow-600 text-white font-medium whitespace-nowrap"
                      >
                        풀
                      </button>
                      {Array.from({ length: teamCount }, (_, i) => i + 1).map((t) => (
                        <button
                          key={t}
                          onClick={(e) => { e.stopPropagation(); handleMoveTo(player.id, slot, t); }}
                          className="px-2 py-1 text-[10px] rounded bg-indigo-700 hover:bg-indigo-600 text-white font-medium whitespace-nowrap"
                        >
                          팀{t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
          {activeCount === 0 && (
            <p className="text-gray-600 text-xs">여기에 드래그해서 비교</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex gap-3">
        {renderSlot(1, balance1)}
        {renderSlot(2, balance2)}
      </div>
      {/* 바깥 클릭하면 팝업 닫기 */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-10" onClick={() => setSelectedPlayer(null)} />
      )}
    </>
  );
}
