"use client";

import { useState } from "react";

const ALL_MAPS = [
  { id: "dr", name: "드", fullName: "드래곤로드" },
  { id: "pr", name: "프", fullName: "프로방스" },
  { id: "si", name: "시", fullName: "시티캣" },
  { id: "kr", name: "크", fullName: "크로스포트" },
  { id: "ol", name: "올", fullName: "올드타운" },
  { id: "3", name: "3", fullName: "3보" },
  { id: "de", name: "데", fullName: "데저트" },
];

export default function MapPicker() {
  const [enabledMaps, setEnabledMaps] = useState<Set<string>>(
    new Set(ALL_MAPS.map((m) => m.id))
  );
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const toggleMap = (mapId: string) => {
    setEnabledMaps((prev) => {
      const next = new Set(prev);
      if (next.has(mapId)) {
        if (next.size <= 1) return prev; // 최소 1개는 남겨야 함
        next.delete(mapId);
      } else {
        next.add(mapId);
      }
      return next;
    });
  };

  const pickRandomMap = () => {
    const pool = ALL_MAPS.filter((m) => enabledMaps.has(m.id));
    if (pool.length === 0) return;

    setIsRolling(true);
    setSelectedMap(null);

    // 0.6초 후 결과
    setTimeout(() => {
      const random = pool[Math.floor(Math.random() * pool.length)];
      setSelectedMap(random.id);
      setIsRolling(false);
    }, 600);
  };

  const selectedMapInfo = ALL_MAPS.find((m) => m.id === selectedMap);

  return (
    <div className="border border-gray-700 rounded-xl p-4 bg-gray-900/50">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-300">🗺️ 맵 선택</h2>
        <button
          onClick={pickRandomMap}
          disabled={isRolling}
          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          {isRolling ? "돌리는 중..." : "🎲 랜덤 맵"}
        </button>
      </div>

      {/* 맵 토글 버튼들 */}
      <div className="flex flex-wrap gap-2 mb-3">
        {ALL_MAPS.map((map) => {
          const isEnabled = enabledMaps.has(map.id);
          const isSelected = selectedMap === map.id;
          return (
            <button
              key={map.id}
              onClick={() => toggleMap(map.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${
                isSelected
                  ? "bg-yellow-600 border-yellow-400 text-white scale-110"
                  : isEnabled
                  ? "bg-gray-800 border-gray-600 text-gray-200 hover:border-gray-400"
                  : "bg-gray-900 border-gray-800 text-gray-600 line-through opacity-50"
              }`}
              title={map.fullName}
            >
              {map.name}
            </button>
          );
        })}
      </div>

      {/* 결과 표시 */}
      {selectedMapInfo && !isRolling && (
        <div className="text-center py-2 animate-fade-in">
          <span className="text-lg font-bold text-yellow-400">
            🎯 {selectedMapInfo.fullName}
          </span>
        </div>
      )}
      {isRolling && (
        <div className="text-center py-2">
          <span className="text-lg font-bold text-gray-400 animate-pulse">
            🎲 ...
          </span>
        </div>
      )}

      <p className="text-[11px] text-gray-600 mt-1">
        클릭: 맵 ON/OFF (회색 = 제외) | 활성 맵: {enabledMaps.size}개
      </p>
    </div>
  );
}
