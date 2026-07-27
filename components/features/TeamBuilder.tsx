"use client";

import { useCallback, useEffect, useState } from "react";
import { Player } from "@/types";
import { getPlayers } from "@/actions/players";
import { TIERS, POSITION_LABELS, Position } from "@/lib/tiers";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeSession } from "@/hooks/useRealtimeSession";
import PlayerPool from "./PlayerPool";
import TeamGrid from "./TeamGrid";
import PlayerRegistration from "./PlayerRegistration";
import TierEditModal from "./TierEditModal";
import TextParseModal from "./TextParseModal";

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

  // Realtime 훅
  const {
    participants,
    toggleParticipant,
    assignTeam,
    changePosition,
    resetAllTeams,
    clearAllParticipants,
    addMultipleParticipants,
  } = useRealtimeSession(sessionId, players);

  const loadPlayers = useCallback(async () => {
    const result = await getPlayers();
    if (result.data) setPlayers(result.data);
  }, []);

  // 세션 생성 또는 기존 세션 로드
  const initSession = useCallback(async () => {
    const supabase = createClient();
    // 가장 최근 drafting 세션 찾기
    const { data: existing, error: fetchErr } = await supabase
      .from("sessions")
      .select("*")
      .eq("status", "drafting")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("[initSession] existing:", existing, "error:", fetchErr);

    if (existing) {
      setSessionId(existing.id);
      setTeamCount(existing.team_count);
    } else if (isAdmin) {
      // 관리자만 새 세션 생성
      const { data: newSession, error: createErr } = await supabase
        .from("sessions")
        .insert({ name: "내전", team_count: 2 })
        .select()
        .single();
      console.log("[initSession] created:", newSession, "error:", createErr);
      if (newSession) {
        setSessionId(newSession.id);
      }
    }
  }, [isAdmin]);

  useEffect(() => {
    loadPlayers();
    initSession();
  }, [loadPlayers, initSession]);

  // 팀 수 변경 시 DB도 업데이트
  const handleTeamCountChange = async (count: number) => {
    setTeamCount(count);
    if (sessionId) {
      const supabase = createClient();
      await supabase
        .from("sessions")
        .update({ team_count: count })
        .eq("id", sessionId);
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
    <div className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-4">
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
                ✏️ 티어 수정
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
      <section className="border border-gray-800 rounded-xl p-4 bg-gray-900/50">
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
                {tier.label}
              </span>
              <div className="flex flex-wrap gap-1.5 flex-1">
              {tierPlayers.map((player) => {
                const isParticipant = participants.has(player.id);
                return (
                  <button
                    key={player.id}
                    onClick={() => isAdmin && toggleParticipant(player.id)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all ${
                      isParticipant
                        ? "bg-indigo-600 text-white border border-indigo-400"
                        : "bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-500"
                    } ${!isAdmin && "cursor-default"}`}
                  >
                    <span>{player.nickname}</span>
                    <span className="opacity-60">{player.position}</span>
                  </button>
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
      </section>

      {/* 참가자 풀 */}
      <PlayerPool
        players={poolPlayers}
        participants={participants}
        teamCount={teamCount}
        isAdmin={isAdmin}
        onAssignTeam={assignTeam}
      />

      {/* 팀 설정 */}
      <div className="flex items-center gap-3">
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
              onClick={clearAllParticipants}
              className="px-3 py-1 rounded text-sm bg-orange-900/50 text-orange-300 hover:bg-orange-900 transition-colors"
            >
              참가자 초기화
            </button>
            <button
              onClick={resetAllTeams}
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
        onAssignTeam={assignTeam}
        onChangePosition={changePosition}
        getTeamStats={getTeamStats}
      />

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
