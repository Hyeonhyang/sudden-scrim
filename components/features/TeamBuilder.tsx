"use client";

import { useCallback, useEffect, useState } from "react";
import { Player } from "@/types";
import { getPlayers, updatePlayerTier, reorderPlayers } from "@/actions/players";
import { TIERS, POSITION_LABELS, Position, getTierDisplay } from "@/lib/tiers";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeSession } from "@/hooks/useRealtimeSession";
import PlayerPool from "./PlayerPool";
import TeamGrid from "./TeamGrid";
import MapPicker from "./MapPicker";
import RulesBox from "./RulesBox";
import BalanceCompare from "./BalanceCompare";
import TierEditModal from "./TierEditModal";
import TextParseModal from "./TextParseModal";
import PlayerRegistration from "./PlayerRegistration";

type Props = {
  isAdmin: boolean;
  onGoHome?: () => void;
};

export default function TeamBuilder({ isAdmin, onGoHome }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamCount, setTeamCount] = useState(2);
  const [showRegister, setShowRegister] = useState(false);
  const [showTextParse, setShowTextParse] = useState(false);
  const [showTierEdit, setShowTierEdit] = useState(false);
  const [search, setSearch] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedDbPlayer, setSelectedDbPlayer] = useState<string | null>(null);
  const [dragOverPlayer, setDragOverPlayer] = useState<string | null>(null);
  const [teamOrders, setTeamOrders] = useState<Record<number, string[]>>({});
  const [snaSlotsByTeam, setSnaSlotsByTeam] = useState<Record<number, number>>({ 1: 2, 2: 2, 3: 2, 4: 2 });
  // 각 팀의 스나 자리에 배치된 선수 ID
  const [teamSnaPlayers, setTeamSnaPlayers] = useState<Record<number, (string | null)[]>>({
    1: [null, null], 2: [null, null], 3: [null, null], 4: [null, null],
  });

  const {
    participants,
    balance1,
    balance2,
    toggleParticipant,
    assignTeam,
    changePosition,
    resetAllTeams,
    clearAllParticipants,
    addMultipleParticipants,
    updateBalance,
  } = useRealtimeSession(sessionId, players);

  const loadPlayers = useCallback(async () => {
    const result = await getPlayers();
    if (result.data) setPlayers(result.data);
  }, []);

  // 세션 생성 또는 기존 세션 로드
  const initSession = useCallback(async () => {
    const supabase = createClient();
    const { data: existing } = await supabase
      .from("sessions")
      .select("*")
      .eq("status", "drafting")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      setSessionId(existing.id);
      setTeamCount(existing.team_count);
    } else if (isAdmin) {
      const { data: newSession } = await supabase
        .from("sessions")
        .insert({ name: "내전", team_count: 2 })
        .select()
        .single();
      if (newSession) {
        setSessionId(newSession.id);
      }
    }
  }, [isAdmin]);

  useEffect(() => {
    loadPlayers();
    initSession();
  }, [loadPlayers, initSession]);

  // 밸런스 정리: 한 줄(2칸)이 둘 다 null이면 제거, 뒤쪽 null 트림
  const cleanBalance = (arr: (string | null)[]): (string | null)[] => {
    // 2개씩 묶어서 둘 다 null인 쌍 제거
    const cleaned: (string | null)[] = [];
    for (let i = 0; i < arr.length; i += 2) {
      const a = arr[i] ?? null;
      const b = arr[i + 1] ?? null;
      if (a === null && b === null) continue; // 둘 다 빈 줄이면 스킵
      cleaned.push(a);
      if (i + 1 < arr.length) cleaned.push(b);
    }
    // 뒤쪽 null 트림
    while (cleaned.length > 0 && cleaned[cleaned.length - 1] === null) {
      cleaned.pop();
    }
    return cleaned;
  };

  // 밸런스 업데이트 래퍼 (로컬 + DB)
  const setBalance1 = (updater: (string | null)[] | ((prev: (string | null)[]) => (string | null)[])) => {
    const newVal = typeof updater === "function" ? updater(balance1) : updater;
    updateBalance(1, newVal);
  };
  const setBalance2 = (updater: (string | null)[] | ((prev: (string | null)[]) => (string | null)[])) => {
    const newVal = typeof updater === "function" ? updater(balance2) : updater;
    updateBalance(2, newVal);
  };

  // 팀 배치 (참가 안 됐으면 참가시키고, 밸런스에서도 제거)
  const assignTeamAndCleanBalance = useCallback(async (playerId: string, teamNumber: number) => {
    if (!participants.has(playerId)) {
      await toggleParticipant(playerId);
    }
    await assignTeam(playerId, teamNumber);
    if (teamNumber > 0) {
      // teamOrders에 뒤에 추가 (라이플 영역)
      setTeamOrders((prev) => {
        const current = prev[teamNumber] || [];
        if (!current.includes(playerId)) {
          return { ...prev, [teamNumber]: [...current, playerId] };
        }
        return prev;
      });
      // 밸런스에서 제거 (직접 updateBalance 호출)
      const newB1 = cleanBalance(balance1.map((id) => id === playerId ? null : id));
      const newB2 = cleanBalance(balance2.map((id) => id === playerId ? null : id));
      if (newB1.length !== balance1.length || newB1.some((v, i) => v !== balance1[i])) {
        updateBalance(1, newB1);
      }
      if (newB2.length !== balance2.length || newB2.some((v, i) => v !== balance2[i])) {
        updateBalance(2, newB2);
      }
    } else {
      // 풀로 되돌릴 때 teamOrders에서 제거
      for (let t = 1; t <= 4; t++) {
        setTeamOrders((prev) => {
          const current = prev[t];
          if (current) {
            return { ...prev, [t]: current.filter((id) => id !== playerId) };
          }
          return prev;
        });
      }
    }
  }, [assignTeam, participants, toggleParticipant, balance1, balance2, updateBalance]);

  // 팀 수 변경 시 DB도 업데이트
  const handleTeamCountChange = async (count: number) => {
    setTeamCount(count);
    if (sessionId) {
      const supabase = createClient();
      await supabase.from("sessions").update({ team_count: count }).eq("id", sessionId);
    }
  };

  // 텍스트 파싱 결과 적용
  const applyParsedParticipants = (nicknames: string[]) => {
    const ids = nicknames
      .map((nick) => players.find((p) => p.nickname === nick)?.id)
      .filter(Boolean) as string[];
    addMultipleParticipants(ids);
  };

  // 팀 결과 복사
  const copyTeamResult = () => {
    const lines: string[] = [];
    for (let t = 1; t <= teamCount; t++) {
      const teamPlayers = players.filter((p) => {
        const info = participants.get(p.id);
        return info && info.teamNumber === t;
      });
      const names = teamPlayers.map((p) => {
        const info = participants.get(p.id)!;
        const pos = info.sessionPosition || p.position;
        return `${p.nickname}(${pos})`;
      });
      lines.push(`[팀${t}] ${names.join(", ")}`);
    }
    navigator.clipboard.writeText(lines.join("\n"));
  };

  // 팀별 합산/평균 계산
  const getTeamStats = (teamNumber: number) => {
    const teamPlayers = players.filter((p) => {
      const info = participants.get(p.id);
      return info && info.teamNumber === teamNumber;
    });
    const total = teamPlayers.reduce((sum, p) => sum + p.tier_score, 0);
    const avg = teamPlayers.length > 0 ? (total / teamPlayers.length).toFixed(1) : "0";
    return { total, avg, count: teamPlayers.length };
  };

  // 필터링된 선수 목록
  const filteredPlayers = players.filter((p) =>
    p.nickname.toLowerCase().includes(search.toLowerCase())
  );

  // 티어별 그룹핑 (사람 있는 티어만)
  const playersByTier = TIERS.filter((tier) =>
    filteredPlayers.some((p) => p.tier_score === tier.score)
  ).map((tier) => ({
    tier,
    players: filteredPlayers.filter((p) => p.tier_score === tier.score),
  }));

  // 참가자 풀 (미배치)
  const poolPlayers = players.filter((p) => {
    const info = participants.get(p.id);
    return info && info.teamNumber === 0;
  });

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-5">
      {/* 헤더 */}
      <header className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-extrabold">⚔️ SA 내전 팀짜기</h1>
        <div className="flex gap-2 items-center">
          {!isAdmin && (
            <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded">
              뷰어 모드
            </span>
          )}
          <span className="text-sm text-gray-400">
            참가: {participants.size}명
          </span>
          {isAdmin && (
            <>
              <button
                onClick={() => setShowTextParse(true)}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                📋 텍스트 파싱
              </button>
              <button
                onClick={() => setShowTierEdit(true)}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                ✏️ 선수 수정
              </button>
              <button
                onClick={() => setShowRegister(true)}
                className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors"
              >
                + 선수 등록
              </button>
            </>
          )}
          <button
            onClick={copyTeamResult}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            📋 팀 복사
          </button>
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="px-3 py-1.5 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              🏠 홈
            </button>
          )}
        </div>
      </header>

      {/* 선수 DB (티어별) */}
      <section
        className="border border-gray-800 rounded-xl p-4 bg-gray-900/50"
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => {
          // 이 영역에 직접 드롭된 경우만 처리 (하위 요소에서 처리 안 된 경우)
          const playerId = e.dataTransfer.getData("playerId");
          if (playerId && isAdmin && participants.has(playerId)) {
            const info = participants.get(playerId);
            // 팀이나 풀에 있는 선수를 DB로 드래그 = 참가 해제
            if (info && info.teamNumber === 0) {
              toggleParticipant(playerId);
              setBalance1((prev) => cleanBalance(prev.map((id) => id === playerId ? null : id)));
              setBalance2((prev) => cleanBalance(prev.map((id) => id === playerId ? null : id)));
            }
          }
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-300">선수 DB</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="닉네임 검색..."
            className="px-3 py-1 text-sm rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-48"
          />
        </div>
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {playersByTier.map(({ tier, players: tierPlayers }) => (
            <div key={tier.score} className="flex items-start gap-2">
              <span className="text-xs font-bold text-gray-500 w-20 shrink-0 pt-0.5">
                {tier.display}
              </span>
              <div className="flex flex-wrap gap-1.5 flex-1">
              {tierPlayers.map((player) => {
                const info = participants.get(player.id);
                const isParticipant = !!info;
                const teamNum = info?.teamNumber ?? 0;
                const teamColorClass =
                  teamNum === 1 ? "bg-blue-700 border-blue-400 text-white" :
                  teamNum === 2 ? "bg-red-700 border-red-400 text-white" :
                  teamNum === 3 ? "bg-green-700 border-green-400 text-white" :
                  teamNum === 4 ? "bg-purple-700 border-purple-400 text-white" :
                  isParticipant ? "bg-orange-300/40 text-orange-100 border border-orange-300" :
                  "bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-500";

                return (
                  <div key={player.id} className="relative">
                    <button
                      draggable={isAdmin}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("playerId", player.id);
                        e.dataTransfer.setData("fromTier", String(player.tier_score));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        // 같은 티어 내에서만 드롭 허용 표시
                        const fromTier = e.dataTransfer.types.length > 0 ? undefined : undefined;
                        e.preventDefault();
                        setDragOverPlayer(player.id);
                      }}
                      onDragLeave={() => setDragOverPlayer(null)}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverPlayer(null);
                        const draggedId = e.dataTransfer.getData("playerId");
                        const fromTier = e.dataTransfer.getData("fromTier");
                        if (draggedId && fromTier === String(player.tier_score) && draggedId !== player.id) {
                          const sameTier = players.filter((p) => p.tier_score === player.tier_score);
                          const fromIdx = sameTier.findIndex((p) => p.id === draggedId);
                          const toIdx = sameTier.findIndex((p) => p.id === player.id);
                          if (fromIdx !== -1 && toIdx !== -1) {
                            const reordered = [...sameTier];
                            const [moved] = reordered.splice(fromIdx, 1);
                            reordered.splice(toIdx, 0, moved);
                            // 즉시 로컬 업데이트
                            setPlayers((prev) => {
                              const others = prev.filter((p) => p.tier_score !== player.tier_score);
                              const updated = reordered.map((p, i) => ({ ...p, sort_order: i + 1 }));
                              return [...others, ...updated].sort((a, b) => b.tier_score - a.tier_score || a.sort_order - b.sort_order);
                            });
                            // 백그라운드 DB 저장
                            const updates = reordered.map((p, i) => ({ id: p.id, sort_order: i + 1 }));
                            reorderPlayers(updates);
                          }
                        }
                      }}
                      onClick={() => {
                        if (!isAdmin) return;
                        setSelectedDbPlayer(selectedDbPlayer === player.id ? null : player.id);
                      }}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all border ${teamColorClass} ${
                        selectedDbPlayer === player.id ? "ring-2 ring-white" : ""
                      } ${dragOverPlayer === player.id ? "ring-2 ring-yellow-400" : ""} ${!isAdmin && "cursor-default"}`}
                    >
                      <span>{player.nickname}</span>
                      <span className="opacity-60">{player.position}</span>
                    </button>

                    {/* 클릭 시 목적지 선택 팝업 */}
                    {selectedDbPlayer === player.id && isAdmin && (
                      <div className="absolute left-0 mt-1 z-20 flex gap-1 bg-gray-900 border border-gray-600 rounded-lg p-1.5 shadow-xl animate-fade-in"
                        style={{ bottom: player.tier_score <= 3 ? '100%' : undefined, top: player.tier_score <= 3 ? undefined : '100%' }}
                      >
                        {!isParticipant && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleParticipant(player.id); setSelectedDbPlayer(null); }}
                            className="px-2 py-1 text-[10px] rounded bg-yellow-700 hover:bg-yellow-600 text-white font-medium whitespace-nowrap"
                          >
                            풀
                          </button>
                        )}
                        {isParticipant && teamNum === 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleParticipant(player.id); setBalance1((prev) => cleanBalance(prev.map((id) => id === player.id ? null : id))); setBalance2((prev) => cleanBalance(prev.map((id) => id === player.id ? null : id))); setSelectedDbPlayer(null); }}
                            className="px-2 py-1 text-[10px] rounded bg-gray-600 hover:bg-gray-500 text-white font-medium whitespace-nowrap"
                          >
                            제거
                          </button>
                        )}
                        <button
                          onClick={async (e) => { e.stopPropagation(); if (!participants.has(player.id)) await toggleParticipant(player.id); if (!balance2.includes(player.id) && !balance1.includes(player.id)) setBalance1((prev) => [...prev, player.id]); setSelectedDbPlayer(null); }}
                          className="px-2 py-1 text-[10px] rounded bg-gray-700 hover:bg-gray-600 text-white font-medium whitespace-nowrap"
                        >
                          밸1
                        </button>
                        <button
                          onClick={async (e) => { e.stopPropagation(); if (!participants.has(player.id)) await toggleParticipant(player.id); if (!balance1.includes(player.id) && !balance2.includes(player.id)) setBalance2((prev) => [...prev, player.id]); setSelectedDbPlayer(null); }}
                          className="px-2 py-1 text-[10px] rounded bg-gray-700 hover:bg-gray-600 text-white font-medium whitespace-nowrap"
                        >
                          밸2
                        </button>
                        {Array.from({ length: teamCount }, (_, i) => i + 1).map((t) => (
                          <button
                            key={t}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!isParticipant) await toggleParticipant(player.id);
                              await assignTeamAndCleanBalance(player.id, t);
                              setSelectedDbPlayer(null);
                            }}
                            className="px-2 py-1 text-[10px] rounded bg-indigo-700 hover:bg-indigo-600 text-white font-medium whitespace-nowrap"
                          >
                            팀{t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          ))}
          {playersByTier.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">
              등록된 선수가 없습니다. 선수를 먼저 등록해주세요.
            </p>
          )}
        </div>

        {/* 바깥 클릭하면 DB 팝업 닫기 */}
        {selectedDbPlayer && (
          <div className="fixed inset-0 z-10" onClick={() => setSelectedDbPlayer(null)} />
        )}
      </section>

      {/* 참가자 풀 (티어별 그룹화) */}
      <PlayerPool
        players={poolPlayers}
        allPlayers={players}
        participants={participants}
        teamCount={teamCount}
        isAdmin={isAdmin}
        onAssignTeam={assignTeamAndCleanBalance}
        onAddToBalance={(playerId, slot) => {
          if (slot === 1) {
            if (balance2.includes(playerId)) return;
            if (balance1.includes(playerId)) return;
            setBalance1((prev) => [...prev, playerId]);
          } else {
            if (balance1.includes(playerId)) return;
            if (balance2.includes(playerId)) return;
            setBalance2((prev) => [...prev, playerId]);
          }
        }}
        onToggleParticipant={toggleParticipant}
        balanceIds={new Set([...balance1, ...balance2].filter(Boolean) as string[])}
        onRemoveFromBalance={(playerId) => {
          setBalance1((prev) => cleanBalance(prev.map((id) => id === playerId ? null : id)));
          setBalance2((prev) => cleanBalance(prev.map((id) => id === playerId ? null : id)));
        }}
      />

      {/* 밸런스 비교 */}
      <BalanceCompare
        players={players}
        balance1={balance1}
        balance2={balance2}
        teamCount={teamCount}
        isAdmin={isAdmin}
        onDropToBalance={async (playerId, slot) => {
          // 참가 안 된 선수면 먼저 참가시키기
          if (!participants.has(playerId)) {
            await toggleParticipant(playerId);
          }
          // 팀에 배치된 선수면 풀로 되돌리기
          const info = participants.get(playerId);
          if (info && info.teamNumber > 0) {
            await assignTeam(playerId, 0);
          }
          if (slot === 1) {
            if (balance1.includes(playerId)) return;
            setBalance1((prev) => [...prev, playerId]);
          } else {
            if (balance2.includes(playerId)) return;
            setBalance2((prev) => [...prev, playerId]);
          }
        }}
        onRemoveFromBalance={(playerId, slot) => {
          if (slot === 1) {
            setBalance1((prev) => cleanBalance(prev.map((id) => id === playerId ? null : id)));
          } else {
            setBalance2((prev) => cleanBalance(prev.map((id) => id === playerId ? null : id)));
          }
        }}
        onAssignTeam={assignTeamAndCleanBalance}
        onFillSlot={async (playerId, slot, index) => {
          if (!participants.has(playerId)) {
            await toggleParticipant(playerId);
          }
          if (slot === 1 && balance2.includes(playerId)) return;
          if (slot === 2 && balance1.includes(playerId)) return;
          if (slot === 1 && balance1.includes(playerId)) return;
          if (slot === 2 && balance2.includes(playerId)) return;
          if (slot === 1) {
            setBalance1((prev) => { const next = [...prev]; next[index] = playerId; return next; });
          } else {
            setBalance2((prev) => { const next = [...prev]; next[index] = playerId; return next; });
          }
        }}
        onSwapInBalance={(slot, fromIndex, toIndex) => {
          if (slot === 1) {
            setBalance1((prev) => {
              const next = [...prev];
              const temp = next[fromIndex];
              next[fromIndex] = next[toIndex];
              next[toIndex] = temp;
              return next;
            });
          } else {
            setBalance2((prev) => {
              const next = [...prev];
              const temp = next[fromIndex];
              next[fromIndex] = next[toIndex];
              next[toIndex] = temp;
              return next;
            });
          }
        }}
        onSwapBetweenBalance={(fromSlot, fromIndex, toSlot, toIndex) => {
          // 밸1[fromIndex] ↔ 밸2[toIndex] 교체
          const fromList = fromSlot === 1 ? [...balance1] : [...balance2];
          const toList = toSlot === 1 ? [...balance1] : [...balance2];
          const fromId = fromList[fromIndex];
          const toId = toList[toIndex];
          fromList[fromIndex] = toId;
          toList[toIndex] = fromId;
          if (fromSlot === 1) {
            setBalance1(cleanBalance(fromList));
            setBalance2(cleanBalance(toList));
          } else {
            setBalance2(cleanBalance(fromList));
            setBalance1(cleanBalance(toList));
          }
        }}
      />

      {/* 팀 설정 */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-400">팀 수:</span>
        {[2, 3, 4].map((n) => (
          <button
            key={n}
            onClick={() => isAdmin && handleTeamCountChange(n)}
            className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
              teamCount === n
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {n}팀
          </button>
        ))}
        {isAdmin && (
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => {
                if (window.confirm("참가자 전체를 초기화할까요? (모든 참가자가 해제됩니다)")) {
                  clearAllParticipants();
                  setBalance1([]);
                  setBalance2([]);
                }
              }}
              className="px-3 py-1 rounded text-sm bg-orange-900/50 text-orange-300 hover:bg-orange-900 transition-colors"
            >
              참가자 초기화
            </button>
            <button
              onClick={() => {
                if (window.confirm("팀 배치를 초기화할까요? (모든 선수가 풀로 돌아갑니다)")) {
                  resetAllTeams();
                }
              }}
              className="px-3 py-1 rounded text-sm bg-red-900/50 text-red-300 hover:bg-red-900 transition-colors"
            >
              팀 초기화
            </button>
          </div>
        )}
      </div>

      {/* 팀 그리드 */}
      <TeamGrid
        players={players}
        participants={participants}
        teamCount={teamCount}
        isAdmin={isAdmin}
        onAssignTeam={assignTeamAndCleanBalance}
        onChangePosition={changePosition}
        getTeamStats={getTeamStats}
        onSwapInTeam={(teamNum, fromIdx, toIdx) => {
          setTeamOrders((prev) => {
            const teamPlayers = players.filter((p) => {
              const info = participants.get(p.id);
              return info && info.teamNumber === teamNum;
            });
            const currentOrder = prev[teamNum] || teamPlayers.map((p) => p.id);
            const next = [...currentOrder];
            const temp = next[fromIdx];
            next[fromIdx] = next[toIdx];
            next[toIdx] = temp;
            return { ...prev, [teamNum]: next };
          });
        }}
        teamOrders={teamOrders}
        snaSlotsByTeam={snaSlotsByTeam}
        teamSnaPlayers={teamSnaPlayers}
        onChangeSnaSlots={isAdmin ? (teamNum, count) => {
          setSnaSlotsByTeam((prev) => ({ ...prev, [teamNum]: count }));
          setTeamSnaPlayers((prev) => {
            const current = prev[teamNum] || [];
            if (count > current.length) {
              return { ...prev, [teamNum]: [...current, ...Array(count - current.length).fill(null)] };
            } else {
              return { ...prev, [teamNum]: current.slice(0, count) };
            }
          });
        } : undefined}
        onSortByTier={isAdmin ? (teamNum) => {
          // 라이플 선수만 티어순 정렬
          const snaIds = new Set((teamSnaPlayers[teamNum] || []).filter(Boolean) as string[]);
          const teamPlayersAll = players.filter((p) => {
            const info = participants.get(p.id);
            return info && info.teamNumber === teamNum && !snaIds.has(p.id);
          });
          const sorted = [...teamPlayersAll].sort((a, b) => b.tier_score - a.tier_score);
          setTeamOrders((prev) => ({ ...prev, [teamNum]: sorted.map((p) => p.id) }));
        } : undefined}
        onDropToSna={isAdmin ? (teamNum, slotIdx, playerId) => {
          // 참가 안 됐으면 참가시키고 팀 배치
          if (!participants.has(playerId)) {
            toggleParticipant(playerId).then(() => assignTeam(playerId, teamNum));
          } else {
            const info = participants.get(playerId);
            if (!info || info.teamNumber !== teamNum) {
              assignTeam(playerId, teamNum);
            }
          }
          // 스나 슬롯에 배치
          setTeamSnaPlayers((prev) => {
            const current = [...(prev[teamNum] || [null, null])];
            // 이미 다른 스나 슬롯에 있으면 제거
            const existingIdx = current.indexOf(playerId);
            if (existingIdx !== -1) current[existingIdx] = null;
            current[slotIdx] = playerId;
            return { ...prev, [teamNum]: current };
          });
        } : undefined}
        onDropToRifle={isAdmin ? async (teamNum, playerId) => {
          // 참가 안 됐으면 참가시키고 팀 배치
          if (!participants.has(playerId)) {
            await toggleParticipant(playerId);
          }
          await assignTeam(playerId, teamNum);
          // 스나에서 제거 (라이플로 이동)
          setTeamSnaPlayers((prev) => {
            const current = [...(prev[teamNum] || [null, null])];
            const idx = current.indexOf(playerId);
            if (idx !== -1) current[idx] = null;
            return { ...prev, [teamNum]: current };
          });
        } : undefined}
        onRemoveSna={isAdmin ? (teamNum, slotIdx) => {
          const snaList = teamSnaPlayers[teamNum] || [];
          const playerId = snaList[slotIdx];
          // 스나에서 빼서 풀로
          setTeamSnaPlayers((prev) => {
            const current = [...(prev[teamNum] || [null, null])];
            current[slotIdx] = null;
            return { ...prev, [teamNum]: current };
          });
          if (playerId) {
            assignTeamAndCleanBalance(playerId, 0);
          }
        } : undefined}
        onReorderRifle={isAdmin ? (teamNum, newOrder) => {
          setTeamOrders((prev) => ({ ...prev, [teamNum]: newOrder }));
        } : undefined}
      />

      {/* 맵 선택 */}
      <MapPicker />

      {/* 룰 */}
      <RulesBox isAdmin={isAdmin} />

      {/* 모달: 티어 수정 */}
      {showTierEdit && (
        <TierEditModal
          players={players}
          onClose={() => setShowTierEdit(false)}
          onUpdated={loadPlayers}
        />
      )}

      {/* 모달: 텍스트 파싱 */}
      {showTextParse && (
        <TextParseModal
          players={players}
          onClose={() => setShowTextParse(false)}
          onApply={applyParsedParticipants}
        />
      )}

      {/* 모달: 선수 등록 */}
      {showRegister && (
        <PlayerRegistration
          onClose={() => setShowRegister(false)}
          onRegistered={loadPlayers}
        />
      )}
    </div>
  );
}
