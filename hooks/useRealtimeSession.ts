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
  const [balance1, setBalance1] = useState<(string | null)[]>([]);
  const [balance2, setBalance2] = useState<(string | null)[]>([]);

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

  const loadBalance = useCallback(async () => {
    if (!sessionId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("session_balance")
      .select("*")
      .eq("session_id", sessionId);

    if (data) {
      const b1 = data.find((d: { slot: number }) => d.slot === 1);
      const b2 = data.find((d: { slot: number }) => d.slot === 2);
      setBalance1((b1?.player_ids ?? []).map((id: string) => id === "__empty__" ? null : id));
      setBalance2((b2?.player_ids ?? []).map((id: string) => id === "__empty__" ? null : id));
    }
  }, [sessionId]);

  // Realtime 구독 + 폴링
  useEffect(() => {
    if (!sessionId) return;
    const supabase = createClient();

    loadSessionPlayers();
    loadBalance();

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
        () => { loadSessionPlayers(); }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_balance",
          filter: `session_id=eq.${sessionId}`,
        },
        () => { loadBalance(); }
      )
      .subscribe();

    // 폴링 백업
    const interval = setInterval(() => {
      loadSessionPlayers();
      loadBalance();
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [sessionId, loadSessionPlayers, loadBalance]);

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
    // 팀에 배치되면 밸런스에서 자동 제거
    if (teamNumber > 0) {
      const newB1 = balance1.filter((id) => id !== playerId);
      const newB2 = balance2.filter((id) => id !== playerId);
      if (newB1.length !== balance1.length) {
        const dbArray1 = newB1.map((id) => id ?? "__empty__");
        await supabase.from("session_balance").upsert(
          { session_id: sessionId, slot: 1, player_ids: dbArray1, updated_at: new Date().toISOString() },
          { onConflict: "session_id,slot" }
        );
        setBalance1(newB1);
      }
      if (newB2.length !== balance2.length) {
        const dbArray2 = newB2.map((id) => id ?? "__empty__");
        await supabase.from("session_balance").upsert(
          { session_id: sessionId, slot: 2, player_ids: dbArray2, updated_at: new Date().toISOString() },
          { onConflict: "session_id,slot" }
        );
        setBalance2(newB2);
      }
    }
  }, [sessionId, balance1, balance2]);

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

  const updateBalance = useCallback(async (slot: 1 | 2, playerIds: (string | null)[]) => {
    if (!sessionId) return;
    const supabase = createClient();
    // null을 "__empty__"로 대체해서 DB에 위치 보존
    const dbArray = playerIds.map((id) => id ?? "__empty__");
    const { error } = await supabase
      .from("session_balance")
      .upsert(
        { session_id: sessionId, slot, player_ids: dbArray, updated_at: new Date().toISOString() },
        { onConflict: "session_id,slot" }
      );
    if (!error) {
      if (slot === 1) setBalance1(playerIds);
      else setBalance2(playerIds);
    }
  }, [sessionId]);

  return {
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
  };
}
