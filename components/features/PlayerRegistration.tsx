"use client";

import { useState } from "react";
import { createPlayer } from "@/actions/players";
import { TIERS, POSITIONS, Position } from "@/lib/tiers";

type Props = {
  onClose: () => void;
  onRegistered: () => void;
};

export default function PlayerRegistration({ onClose, onRegistered }: Props) {
  const [nickname, setNickname] = useState("");
  const [tierScore, setTierScore] = useState(17); // 기본: 1티어
  const [position, setPosition] = useState<Position>("R");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    setLoading(true);
    setError("");

    const tier = TIERS.find((t) => t.score === tierScore)!;
    const result = await createPlayer(nickname.trim(), tierScore, tier.label, position);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onRegistered();
    setNickname("");
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm animate-fade-in">
        <h2 className="text-lg font-bold mb-4">선수 등록</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임"
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            autoFocus
          />
          <select
            value={tierScore}
            onChange={(e) => setTierScore(Number(e.target.value))}
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500"
          >
            {TIERS.map((tier) => (
              <option key={tier.score} value={tier.score}>
                {tier.label}
              </option>
            ))}
          </select>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value as Position)}
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500"
          >
            {POSITIONS.map((pos) => (
              <option key={pos} value={pos}>
                {pos} - {pos === "S" ? "스나" : pos === "R" ? "라이플" : pos === "M" ? "멀티" : pos === "SM" ? "스나/멀티" : "라이플/멀티"}
              </option>
            ))}
          </select>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !nickname.trim()}
              className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold disabled:opacity-50 transition-colors"
            >
              {loading ? "등록 중..." : "등록"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              닫기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
