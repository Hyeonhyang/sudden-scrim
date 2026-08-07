"use client";

import { useState } from "react";
import { Player } from "@/types";

type ParsedResult = {
  discordNick: string;
  matchedPlayer: Player | null;
  checked: boolean;
};

type Props = {
  players: Player[];
  onClose: () => void;
  onApply: (nicknames: string[]) => void;
};

export default function TextParseModal({ players, onClose, onApply }: Props) {
  const [text, setText] = useState("");
  const [results, setResults] = useState<ParsedResult[] | null>(null);

  const KEYWORDS = ["ㅅ", "손", "t", "T", "발"];

  // 연속 매칭 점수 계산 (2글자 이상 연속으로 겹치는 횟수)
  const getMatchScore = (dbNick: string, discordNick: string): number => {
    const lower1 = dbNick.toLowerCase();
    const lower2 = discordNick.toLowerCase();
    let score = 0;
    for (let i = 0; i <= lower1.length - 2; i++) {
      const sub = lower1.substring(i, i + 2);
      if (lower2.includes(sub)) score++;
    }
    // 완전 포함이면 추가 점수
    if (lower2.includes(lower1)) score += 10;
    if (lower1.includes(lower2)) score += 10;
    return score;
  };

  const handleParse = () => {
    const lines = text.split("\n").map((l) => l.trim());
    const parsed: ParsedResult[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      if (!line.includes("#")) continue;

      const discordNick = line.split("#")[0].trim();
      if (!discordNick) continue;

      // 참가 여부 판단
      let isParticipant = false;
      if (KEYWORDS.some((kw) => line.includes(kw))) {
        isParticipant = true;
      } else {
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          if (!nextLine) continue;
          if (nextLine.includes("#")) break;
          if (KEYWORDS.some((kw) => nextLine.includes(kw))) {
            isParticipant = true;
            break;
          }
        }
      }

      if (!isParticipant) continue;

      // DB 매칭 (점수 가장 높은 걸 선택)
      const candidates = players
        .map((p) => ({ player: p, score: getMatchScore(p.nickname, discordNick) }))
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score);
      const matched = candidates.length > 0 ? candidates[0].player : null;

      // 중복 방지
      if (!parsed.some((r) => r.matchedPlayer?.id === matched?.id && matched)) {
        parsed.push({
          discordNick,
          matchedPlayer: matched || null,
          checked: !!matched,
        });
      }
    }

    setResults(parsed);
  };

  const toggleCheck = (idx: number) => {
    setResults((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], checked: !next[idx].checked };
      return next;
    });
  };

  const changeMatch = (idx: number, playerId: string) => {
    setResults((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const player = players.find((p) => p.id === playerId) || null;
      next[idx] = { ...next[idx], matchedPlayer: player, checked: !!player };
      return next;
    });
  };

  const handleApply = () => {
    if (!results) return;
    const nicknames = results
      .filter((r) => r.checked && r.matchedPlayer)
      .map((r) => r.matchedPlayer!.nickname);
    onApply(nicknames);
    onClose();
  };

  const checkedCount = results?.filter((r) => r.checked && r.matchedPlayer).length ?? 0;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-2">📋 텍스트 파싱</h2>
        <p className="text-xs text-gray-400 mb-3">
          디스코드/카톡에서 복사한 텍스트를 붙여넣으세요. &quot;ㅅ&quot; 또는 &quot;손&quot;이 있으면 참가로 인식합니다.
        </p>

        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setResults(null); }}
          placeholder={`예시 (디스코드 복사):\n아이린#카리나/M218/MID — 오전 4:23\nㅅ\nvasco#NKR1/G3/JG — 오전 4:21ㅅ`}
          className="w-full h-32 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
        />

        {/* 파싱 결과 */}
        {results && (
          <div className="mt-3 border border-gray-700 rounded-lg bg-gray-800 p-3">
            <p className="text-xs text-gray-400 mb-2">
              매칭 결과 ({checkedCount}명 선택됨) — 잘못된 매칭은 체크 해제하거나 변경하세요
            </p>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {results.map((r, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={r.checked}
                    onChange={() => toggleCheck(idx)}
                    className="w-4 h-4 shrink-0"
                  />
                  <span className="text-gray-400 text-xs w-28 truncate shrink-0" title={r.discordNick}>
                    {r.discordNick}
                  </span>
                  <span className="text-gray-600">→</span>
                  <select
                    value={r.matchedPlayer?.id ?? ""}
                    onChange={(e) => changeMatch(idx, e.target.value)}
                    className="flex-1 px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white text-xs"
                  >
                    <option value="">매칭 없음</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nickname} ({p.tier_label})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              {results.length === 0 && (
                <p className="text-gray-500 text-xs">인식된 참가자가 없습니다.</p>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleParse}
            disabled={!text.trim()}
            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold disabled:opacity-50 transition-colors"
          >
            파싱
          </button>
          {results && checkedCount > 0 && (
            <button
              onClick={handleApply}
              className="flex-1 py-2 rounded-lg bg-green-700 hover:bg-green-600 font-semibold transition-colors"
            >
              적용 ({checkedCount}명)
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
