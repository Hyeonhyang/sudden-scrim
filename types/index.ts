import { Position } from "@/lib/tiers";
import type { Game } from "@/lib/tiers";

export type Player = {
  id: string;
  nickname: string;
  tier_score: number;
  tier_label: string;
  position: Position | null; // 배그는 포지션 없음
  sort_order: number;
  game: Game;
  created_at: string;
  updated_at: string;
};

export type Session = {
  id: string;
  name: string;
  team_count: number;
  status: "drafting" | "confirmed" | "completed";
  game: Game;
  created_at: string;
  updated_at: string;
};

export type SessionPlayer = {
  id: string;
  session_id: string;
  player_id: string;
  team_number: number; // 0 = pool, 1~4 = team
  session_position: Position | null;
  created_at: string;
  player?: Player; // joined
};
