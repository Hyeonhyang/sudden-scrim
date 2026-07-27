"use client";

import { useState } from "react";
import { Player } from "@/types";
import { TIERS, POSITIONS, Position } from "@/lib/tiers";
import { updatePlayerTier, updatePlayerPosition } from "@/actions/players";
import { createClient } from "@/lib/supabase/client";

type Props = {
  players: Player[];
  onClose: () => void;
  onUpdated: () => void;
};

export default function TierEditModal({ players, onClose, onUpdated }: Props) {
  const [search, setSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [newTierScore, setNewTierScore] = useState<number | null>(null);
  const [newNickname, setNewNickname] = useState("");
  const [newPosition, setNewPosition] = useState<Position>("R");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const filtered = search.trim()
    ? players.filter((p) =>
        p.nickname.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setNewTierScore(player.tier_score);
    setNewNickname(player.nickname);
    setNewPosition(player.position);
    setSearch(player.nickname);
  };

  const handleSave = async () => {
    if (!selectedPlayer || newTierScore === null) return;
    setLoading(true);
    setMessage("");

    const supabase = createClient();
    const tier = TIERS.find((t) => t.score === newTierScore)!;

    // 닉네임 변경
    if (newNickname.trim() && newNickname.trim() !== selectedPlayer.nickname) {
      const { error } = await supabase
        .from("players")
        .update({ nickname: newNickname.trim() })
        .eq("id", selectedPlayer.id);
      if (error) {
        setMessage(error.code === "23505" ? "❌ 이미 사용 중인 닉네임입니다." : "❌ 닉네임 변경 실패");
        setLoading(false);
        return;
      }
    }

    // 티어 변경
    if (newTierScore !== selectedPlayer.tier_score) {
      await updatePlayerTier(selectedPlayer.id, newTierScore, tier.label);
    }

    // 포지션 변경
    if (newPosition !== selectedPlayer.position) {
      await updatePlayerPosition(selectedPlayer.id, newPosition);
    }

    setMessage(`✅ ${newNickname.trim() || selectedPlayer.nickname} 수정 완료`);
    onUpdated();
    setSelectedPlayer(null);
    setSearch("");
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm animate-fade-in">
        <h2 className="text-lg font-bold mb-4">✏️ 선수 수정</h2>

        {/* 검색 */}
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedPlayer(null);
            setMessage("");
          }}
          placeholder="선수 닉네임 검색..."
          className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          autoFocus
        />

        {/* 검색 결과 */}
        {!selectedPlayer && filtered.length > 0 && (
          <div className="mt-2 max-h-40 overflow-y-auto border border-gray-700 rounded-lg bg-gray-800">
            {filtered.slice(0, 10).map((player) => (
              <button
                key={player.id}
                onClick={() => handleSelectPlayer(player)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors flex items-center justify-between"
              >
                <span className="font-medium">{player.nickname}</span>
                <span className="text-xs text-gray-400">
                  {player.tier_label} | {player.position}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* 선택된 선수 - 수정 폼 */}
        {selectedPlayer && (
          <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700 flex flex-col gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">닉네임</label>
              <input
                type="text"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">티어</label>
              <select
                value={newTierScore ?? selectedPlayer.tier_score}
                onChange={(e) => setNewTierScore(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-indigo-500"
              >
                {TIERS.map((tier) => (
                  <option key={tier.score} value={tier.score}>
                    {tier.label} {tier.score === selectedPlayer.tier_score ? "(현재)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">포지션</label>
              <select
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value as Position)}
                className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-indigo-500"
              >
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos} {pos === selectedPlayer.position ? "(현재)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold disabled:opacity-50 transition-colors"
            >
              {loading ? "저장 중..." : "저장"}
            </button>
          </div>
        )}

        {/* 메시지 */}
        {message && (
          <p className="mt-3 text-sm text-center">{message}</p>
        )}

        {/* 닫기 */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
