"use client";

import { useState } from "react";
import { Player } from "@/types";

type Props = {
  players: Player[];
  onClose: () => void;
  onApply: (nicknames: string[]) => void;
};

export default function TextParseModal({ players, onClose, onApply }: Props) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ found: string[]; notFound: string[] } | null>(null);

  const KEYWORDS = ["ㅅ", "손"];

  const handleParse = () => {
    const lines = text.split("\n").map((l) => l.trim());
    const found: string[] = [];
    const notFound: string[] = [];
    const playerNicks = players.map((p) => p.nickname);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // 현재 줄이 닉네임 줄인지 확인 (# 포함)
      if (!line.includes("#")) continue;

      const discordNick = line.split("#")[0].trim();
      if (!discordNick) continue;

      // 참가 여부 판단:
      // 1) 현재 줄 끝에 "ㅅ" 또는 "손"이 있거나
      // 2) 다음 줄(들)에서 다음 닉네임(#포함) 나오기 전에 "ㅅ" 또는 "손"이 있으면 참가
      let isParticipant = false;

      // 현재 줄 끝 체크
      if (KEYWORDS.some((kw) => line.endsWith(kw))) {
        isParticipant = true;
      } else {
        // 다음 줄들 체크 (다음 # 줄 나오기 전까지)
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          if (!nextLine) continue;
          if (nextLine.includes("#")) break; // 다음 닉네임 줄이면 중단
          if (KEYWORDS.some((kw) => nextLine === kw || nextLine.endsWith(kw))) {
            isParticipant = true;
            break;
          }
        }
      }

      if (!isParticipant) continue;

      // DB 부분 매칭
      const matched = playerNicks.find(
        (dbNick) => discordNick.includes(dbNick) || dbNick.includes(discordNick)
      );

      if (matched) {
        if (!found.includes(matched)) found.push(matched);
      } else {
        if (!notFound.includes(discordNick)) notFound.push(discordNick);
      }
    }

    setResult({ found, notFound });
  };

  const handleApply = () => {
    if (result) {
      onApply(result.found);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg animate-fade-in">
        <h2 className="text-lg font-bold mb-2">📋 텍스트 파싱</h2>
        <p className="text-xs text-gray-400 mb-3">
          디스코드/카톡에서 복사한 텍스트를 붙여넣으세요. 줄 끝에 &quot;ㅅ&quot; 또는 &quot;손&quot;이 있으면 참가로 인식합니다. (닉네임#태그 형식 지원)
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`예시 (디스코드 복사):\n아이린#카리나/M218/MID — 오전 4:23ㅅ\ncream#nyang/M16/SUP — 오전 4:21ㅅ\nvasco#NKR1/G3/JG — 오전 4:21ㅅ`}
          className="w-full h-40 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
        />

        {result && (
          <div className="mt-3 text-sm">
            {result.found.length > 0 && (
              <p className="text-green-400">
                ✅ 인식됨: {result.found.join(", ")}
              </p>
            )}
            {result.notFound.length > 0 && (
              <p className="text-yellow-400 mt-1">
                ⚠️ DB에 없음: {result.notFound.join(", ")}
              </p>
            )}
            {result.found.length === 0 && result.notFound.length === 0 && (
              <p className="text-gray-400">인식된 참가자가 없습니다.</p>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleParse}
            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold transition-colors"
          >
            파싱
          </button>
          {result && result.found.length > 0 && (
            <button
              onClick={handleApply}
              className="flex-1 py-2 rounded-lg bg-green-700 hover:bg-green-600 font-semibold transition-colors"
            >
              적용 ({result.found.length}명)
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
