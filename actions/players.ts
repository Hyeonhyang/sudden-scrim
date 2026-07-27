"use server";

import { createClient } from "@/lib/supabase/server";
import { isAuthenticated } from "@/lib/auth";
import { Position } from "@/lib/tiers";
import { Player } from "@/types";

type ActionResult<T = null> =
  | { data: T; error: null }
  | { data: null; error: string };

export async function getPlayers(): Promise<ActionResult<Player[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("tier_score", { ascending: false })
    .order("sort_order", { ascending: true });

  if (error) return { data: null, error: "선수 목록을 불러올 수 없습니다." };
  return { data: data as Player[], error: null };
}

export async function createPlayer(
  nickname: string,
  tierScore: number,
  tierLabel: string,
  position: Position
): Promise<ActionResult<Player>> {
  if (!(await isAuthenticated())) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .insert({ nickname, tier_score: tierScore, tier_label: tierLabel, position })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { data: null, error: "이미 등록된 닉네임입니다." };
    }
    return { data: null, error: "선수 등록에 실패했습니다." };
  }
  return { data: data as Player, error: null };
}

export async function updatePlayerTier(
  playerId: string,
  tierScore: number,
  tierLabel: string
): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("players")
    .update({ tier_score: tierScore, tier_label: tierLabel, updated_at: new Date().toISOString() })
    .eq("id", playerId);

  if (error) return { data: null, error: "티어 수정에 실패했습니다." };
  return { data: null, error: null };
}

export async function updatePlayerPosition(
  playerId: string,
  position: Position
): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("players")
    .update({ position, updated_at: new Date().toISOString() })
    .eq("id", playerId);

  if (error) return { data: null, error: "포지션 수정에 실패했습니다." };
  return { data: null, error: null };
}

export async function deletePlayer(playerId: string): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("players").delete().eq("id", playerId);

  if (error) return { data: null, error: "선수 삭제에 실패했습니다." };
  return { data: null, error: null };
}

export async function reorderPlayers(
  updates: { id: string; sort_order: number }[]
): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  const supabase = await createClient();
  for (const { id, sort_order } of updates) {
    const { error } = await supabase
      .from("players")
      .update({ sort_order })
      .eq("id", id);
    if (error) return { data: null, error: "순서 변경에 실패했습니다." };
  }
  return { data: null, error: null };
}
