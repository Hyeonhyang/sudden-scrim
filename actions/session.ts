"use server";

import { createClient } from "@/lib/supabase/server";
import { isAuthenticated } from "@/lib/auth";
import { Position } from "@/lib/tiers";
import { Session, SessionPlayer } from "@/types";

type ActionResult<T = null> =
  | { data: T; error: null }
  | { data: null; error: string };

export async function createSession(
  name: string,
  teamCount: number
): Promise<ActionResult<Session>> {
  if (!(await isAuthenticated())) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .insert({ name, team_count: teamCount })
    .select()
    .single();

  if (error) return { data: null, error: "세션 생성에 실패했습니다." };
  return { data: data as Session, error: null };
}

export async function getActiveSession(): Promise<ActionResult<Session | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("status", "drafting")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: "세션 조회에 실패했습니다." };
  return { data: data as Session | null, error: null };
}

export async function getSessionPlayers(
  sessionId: string
): Promise<ActionResult<SessionPlayer[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("session_players")
    .select("*, player:players(*)")
    .eq("session_id", sessionId);

  if (error) return { data: null, error: "참가자 조회에 실패했습니다." };
  return { data: data as SessionPlayer[], error: null };
}

export async function addPlayerToSession(
  sessionId: string,
  playerId: string
): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("session_players")
    .insert({ session_id: sessionId, player_id: playerId, team_number: 0 });

  if (error) {
    if (error.code === "23505") {
      return { data: null, error: "이미 참가 중인 선수입니다." };
    }
    return { data: null, error: "참가자 추가에 실패했습니다." };
  }
  return { data: null, error: null };
}

export async function removePlayerFromSession(
  sessionId: string,
  playerId: string
): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("session_players")
    .delete()
    .eq("session_id", sessionId)
    .eq("player_id", playerId);

  if (error) return { data: null, error: "참가자 제거에 실패했습니다." };
  return { data: null, error: null };
}

export async function assignTeam(
  sessionId: string,
  playerId: string,
  teamNumber: number
): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("session_players")
    .update({ team_number: teamNumber })
    .eq("session_id", sessionId)
    .eq("player_id", playerId);

  if (error) return { data: null, error: "팀 배치에 실패했습니다." };
  return { data: null, error: null };
}

export async function updateSessionPosition(
  sessionId: string,
  playerId: string,
  position: Position
): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("session_players")
    .update({ session_position: position })
    .eq("session_id", sessionId)
    .eq("player_id", playerId);

  if (error) return { data: null, error: "포지션 변경에 실패했습니다." };
  return { data: null, error: null };
}

export async function updateTeamCount(
  sessionId: string,
  teamCount: number
): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ team_count: teamCount })
    .eq("id", sessionId);

  if (error) return { data: null, error: "팀 수 변경에 실패했습니다." };
  return { data: null, error: null };
}

export async function resetSession(sessionId: string): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("session_players")
    .update({ team_number: 0 })
    .eq("session_id", sessionId);

  if (error) return { data: null, error: "초기화에 실패했습니다." };
  return { data: null, error: null };
}

/** 텍스트 파싱으로 참가자 자동 체크 */
export async function parseParticipantsFromText(
  sessionId: string,
  text: string
): Promise<ActionResult<{ added: string[]; notFound: string[] }>> {
  if (!(await isAuthenticated())) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  const supabase = await createClient();

  // "ㅅ" 또는 "손" 키워드가 있는 줄에서 닉네임 추출
  const lines = text.split("\n");
  const participantKeywords = ["ㅅ", "손"];
  const nicknames: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const hasKeyword = participantKeywords.some((kw) => trimmed.includes(kw));
    if (hasKeyword) {
      // 첫 번째 단어를 닉네임으로 추정
      const parts = trimmed.split(/\s+/);
      if (parts.length > 0) {
        // 키워드 자체가 아닌 부분을 닉네임으로
        const nick = parts.find((p) => !participantKeywords.includes(p));
        if (nick) nicknames.push(nick);
      }
    }
  }

  // DB에서 닉네임 매칭
  const { data: players } = await supabase
    .from("players")
    .select("id, nickname")
    .in("nickname", nicknames);

  const added: string[] = [];
  const notFound: string[] = [];

  if (players) {
    const foundNicks = new Set(players.map((p) => p.nickname));
    for (const nick of nicknames) {
      if (foundNicks.has(nick)) {
        const player = players.find((p) => p.nickname === nick)!;
        const { error } = await supabase
          .from("session_players")
          .upsert(
            { session_id: sessionId, player_id: player.id, team_number: 0 },
            { onConflict: "session_id,player_id" }
          );
        if (!error) added.push(nick);
      } else {
        notFound.push(nick);
      }
    }
  }

  return { data: { added, notFound }, error: null };
}
