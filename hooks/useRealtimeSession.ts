"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Player, SessionPlayer } from "@/types";
import { Position } from "@/lib/tiers";

type ParticipantInfo = {
  teamNumber: number;
  sessionPosition: Position | null;
};

export function useRealtimeSession(sessionId: string | null, players: Player[]) {
  const [participants, setParticipants] = useState<Map<string, ParticipantInfo>>(new Map());

  // DB에서 초기 로드
  const loadSessionPlayers = useCallback(async () => {
    if (!sessionId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("session_players")
      .select("*")
      .eq("session_id", sessionId);

    if (data) {
      const map = new Map<string, ParticipantInfo>();
      for (const sp of data) {
        map.set(sp.player_id, {
          teamNumber: sp.team_number,
          sessionPosition: sp.session_position,
        });
      }
      setParticipants(map);
    }
  }, [sessionId]);

  // Realtime 구독 + 폴링 (5초마다 갱신)
  useEffect(() => {
    if (!sessionId) return;
    const supabase = createClient();

    loadSessionPlayers();

    // Realtime 시도
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_players",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          loadSessionPlayers();
        }
      )
      .subscribe();

    // 폴링 백업 (Realtime 안 될 경우 대비)
    const interval = setInterval(() => {
      loadSessionPlayers();
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [sessionId, loadSessionPlayers]);

  // --- 관리자 액션들 (DB에 직접 쓰기) ---

  const addParticipant = useCallback(async (playerId: string) => {
    if (!sessionId) { console.log("[add] no sessionId!"); return; }
    const supabase = createClient();
    const { error } = await supabase
      .from("session_players")
      .upsert(
        { session_id: sessionId, player_id: playerId, team_number: 0 },
        { onConflict: "session_id,player_id" }
      );
    if (error) { console.error("[add] error:", error); return; }
    // 즉시 로컬 state 업데이트
    setParticipants((prev) => {
      const next = new Map(prev);
      next.set(playerId, { teamNumber: 0, sessionPosition: null });
      return next;
    });
  }, [sessionId]);

  const removeParticipant = useCallback(async (playerId: string) => {
    if (!sessionId) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("session_players")
      .delete()
      .eq("session_id", sessionId)
      .eq("player_id", playerId);
    if (error) return;
    setParticipants((prev) => {
      const next = new Map(prev);
      next.delete(playerId);
      return next;
    });
  }, [sessionId]);

  const assignTeam = useCallback(async (playerId: string, teamNumber: number) => {
    if (!sessionId) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("session_players")
      .update({ team_number: teamNumber })
      .eq("session_id", sessionId)
      .eq("player_id", playerId);
    if (error) return;
    setParticipants((prev) => {
      const next = new Map(prev);
      const current = next.get(playerId);
      if (current) next.set(playerId, { ...current, teamNumber });
      return next;
    });
  }, [sessionId]);

  const changePosition = useCallback(async (playerId: string, position: Position) => {
    if (!sessionId) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("session_players")
      .update({ session_position: position })
      .eq("session_id", sessionId)
      .eq("player_id", playerId);
    if (error) return;
    setParticipants((prev) => {
      const next = new Map(prev);
      const current = next.get(playerId);
      if (current) next.set(playerId, { ...current, sessionPosition: position });
      return next;
    });
  }, [sessionId]);

  const resetAllTeams = useCallback(async () => {
    if (!sessionId) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("session_players")
      .update({ team_number: 0 })
      .eq("session_id", sessionId);
    if (error) return;
    setParticipants((prev) => {
      const next = new Map(prev);
      for (const [id, val] of next) {
        next.set(id, { ...val, teamNumber: 0 });
      }
      return next;
    });
  }, [sessionId]);

  const clearAllParticipants = useCallback(async () => {
    if (!sessionId) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("session_players")
      .delete()
      .eq("session_id", sessionId);
    if (error) return;
    setParticipants(new Map());
  }, [sessionId]);

  const toggleParticipant = useCallback(async (playerId: string) => {
    console.log("[toggle] playerId:", playerId, "has:", participants.has(playerId));
    if (participants.has(playerId)) {
      await removeParticipant(playerId);
    } else {
      await addParticipant(playerId);
    }
  }, [participants, addParticipant, removeParticipant]);

  const addMultipleParticipants = useCallback(async (playerIds: string[]) => {
    if (!sessionId) return;
    const supabase = createClient();
    const rows = playerIds
      .filter((id) => !participants.has(id))
      .map((id) => ({ session_id: sessionId, player_id: id, team_number: 0 }));
    if (rows.length > 0) {
      await supabase
        .from("session_players")
        .upsert(rows, { onConflict: "session_id,player_id" });
    }
  }, [sessionId, participants]);

  return {
    participants,
    toggleParticipant,
    assignTeam,
    changePosition,
    resetAllTeams,
    clearAllParticipants,
    addMultipleParticipants,
  };
}
