"use client";

import { useState } from "react";
import { Player } from "@/types";
import { TIERS } from "@/lib/tiers";
import { updatePlayerTier } from "@/actions/players";

type Props = {
  players: Player[];
  onClose: () => void;
  onUpdated: () => void;
};

export default function TierEditModal({ players, onClose, onUpdated }: Props) {
  const [search, setSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [newTierScore, setNewTierScore] = useState<number | null>(null);
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
    setSearch(player.nickname);
  };

  const handleSave = async () => {
    if (!selectedPlayer || newTierScore === null) return;
    setLoading(true);
    const tier = TIERS.find((t) => t.score === newTierScore);
    if (!tier) return;

    const result = await updatePlayerTier(selectedPlayer.id, newTierScore, tier.label);
    if (result.error) {
      setMessage(`❌ ${result.error}`);
    } else {
      setMessage(`✅ ${selectedPlayer.nickname}의 티어가 ${tier.label}(으)로 변경되었습니다.`);
      onUpdated();
      setSelectedPlayer(null);
      setSearch("");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm animate-fade-in">
        <h2 className="text-lg font-bold mb-4">✏️ 티어 수정</h2>

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

        {/* 선택된 선수 - 티어 변경 */}
        {selectedPlayer && (
          <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-sm text-gray-300 mb-2">
              <span className="font-bold text-white">{selectedPlayer.nickname}</span>
              <span className="ml-2 text-gray-500">현재: {selectedPlayer.tier_label}</span>
            </p>
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
            <button
              onClick={handleSave}
              disabled={loading || newTierScore === selectedPlayer.tier_score}
              className="w-full mt-2 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold disabled:opacity-50 transition-colors"
            >
              {loading ? "저장 중..." : "티어 변경"}
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
