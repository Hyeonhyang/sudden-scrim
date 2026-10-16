"use client";

import { useEffect, useRef, useState } from "react";
import { TIERS, TierInfo } from "@/lib/tiers";

type Props = {
  value: number; // tier_score
  onChange: (score: number) => void;
  className?: string;
};

export default function TierSelect({ value, onChange, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [listStyle, setListStyle] = useState<React.CSSProperties>({});

  const selectedTier = TIERS.find((t) => t.score === value) ?? TIERS[0];

  // 드롭다운 위치 계산 (모달 안에서도 잘리지 않도록 fixed 포지션)
  const calcPosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const listHeight = Math.min(288, TIERS.length * 36);

    if (spaceBelow < listHeight) {
      setListStyle({
        position: "fixed",
        bottom: window.innerHeight - rect.top,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    } else {
      setListStyle({
        position: "fixed",
        top: rect.bottom + 2,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  };

  const openDropdown = () => {
    calcPosition();
    setOpen(true);
  };

  // 창 크기 변경 / 스크롤 시 위치 재계산 (또는 닫기)
  useEffect(() => {
    if (!open) return;
    const handleResize = () => calcPosition();
    const handleScroll = () => calcPosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current?.contains(e.target as Node) ||
        listRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 선택된 값 표시 버튼 */}
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 flex items-center justify-between gap-2 hover:border-gray-500 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className={`font-bold ${selectedTier.color}`}>
            {selectedTier.display}
          </span>
          <span className="text-sm text-gray-300">{selectedTier.label}</span>
        </span>
        <span className="text-gray-500 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {/* 드롭다운 목록 (fixed 포지션) */}
      {open && (
        <div
          ref={listRef}
          style={listStyle}
          className="bg-gray-800 border border-gray-600 rounded-lg shadow-2xl overflow-y-auto max-h-72"
        >
          {TIERS.map((tier) => (
            <button
              key={tier.score}
              type="button"
              onClick={() => {
                onChange(tier.score);
                setOpen(false);
              }}
              className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-700 transition-colors text-left ${
                tier.score === value ? "bg-gray-700" : ""
              }`}
            >
              <span className={`font-bold w-28 shrink-0 inline-block ${tier.color}`}>
                {tier.display}
              </span>
              <span className="text-sm text-gray-300">{tier.label}</span>
              {tier.score === value && (
                <span className="ml-auto text-indigo-400 text-xs">현재</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
