export type TierInfo = {
  label: string;
  score: number;
  display: string;
  color: string;
};

export type Game = "suddenattack" | "pubg";

export const TIERS: TierInfo[] = [
  // 빨간별 (최상위)
  { label: "빨간별5", score: 28, display: "★ ★ ★ ★ ★", color: "text-red-400" },
  { label: "빨간별4", score: 27, display: "★ ★ ★ ★",   color: "text-red-400" },
  { label: "빨간별3", score: 26, display: "★ ★ ★",     color: "text-red-400" },
  { label: "빨간별2", score: 25, display: "★ ★",       color: "text-red-400" },
  { label: "빨간별1", score: 24, display: "★",         color: "text-red-400" },
  // 노란별
  { label: "별5", score: 23, display: "⭐⭐⭐⭐⭐", color: "text-yellow-400" },
  { label: "별4", score: 22, display: "⭐⭐⭐⭐",   color: "text-yellow-400" },
  { label: "별3", score: 21, display: "⭐⭐⭐",     color: "text-yellow-400" },
  { label: "별2", score: 20, display: "⭐⭐",       color: "text-yellow-400" },
  { label: "별1", score: 19, display: "⭐",         color: "text-yellow-400" },
  // 숫자 티어
  { label: "0티어",    score: 18, display: "0티어",    color: "text-purple-400" },
  { label: "1티어",    score: 17, display: "1티어",    color: "text-blue-400" },
  { label: "1.25티어", score: 16, display: "1.25티어", color: "text-blue-400" },
  { label: "1.5티어",  score: 15, display: "1.5티어",  color: "text-blue-400" },
  { label: "1.75티어", score: 14, display: "1.75티어", color: "text-blue-400" },
  { label: "2티어",    score: 13, display: "2티어",    color: "text-green-400" },
  { label: "2.25티어", score: 12, display: "2.25티어", color: "text-green-400" },
  { label: "2.5티어",  score: 11, display: "2.5티어",  color: "text-green-400" },
  { label: "2.75티어", score: 10, display: "2.75티어", color: "text-green-400" },
  { label: "3티어",    score: 9,  display: "3티어",    color: "text-gray-300" },
  { label: "3.25티어", score: 8,  display: "3.25티어", color: "text-gray-300" },
  { label: "3.5티어",  score: 7,  display: "3.5티어",  color: "text-gray-300" },
  { label: "3.75티어", score: 6,  display: "3.75티어", color: "text-gray-300" },
  { label: "4티어",    score: 5,  display: "4티어",    color: "text-gray-400" },
  { label: "4.25티어", score: 4,  display: "4.25티어", color: "text-gray-400" },
  { label: "4.5티어",  score: 3,  display: "4.5티어",  color: "text-gray-400" },
  { label: "4.75티어", score: 2,  display: "4.75티어", color: "text-gray-400" },
  { label: "5티어",    score: 1,  display: "5티어",    color: "text-gray-500" },
];

// 배그 전용 티어 (100번대 사용으로 서든과 충돌 방지)
export const PUBG_TIERS: TierInfo[] = [
  { label: "1티어", score: 109, display: "1티어", color: "text-yellow-400" },
  { label: "1.5티어", score: 108, display: "1.5티어", color: "text-yellow-300" },
  { label: "2티어", score: 107, display: "2티어", color: "text-blue-400" },
  { label: "2.5티어", score: 106, display: "2.5티어", color: "text-blue-300" },
  { label: "3티어", score: 105, display: "3티어", color: "text-green-400" },
  { label: "3.5티어", score: 104, display: "3.5티어", color: "text-green-300" },
  { label: "4티어", score: 103, display: "4티어", color: "text-gray-300" },
  { label: "4.5티어", score: 102, display: "4.5티어", color: "text-gray-400" },
  { label: "5티어", score: 101, display: "5티어", color: "text-gray-500" },
];

export function getTiersByGame(game: Game): TierInfo[] {
  return game === "pubg" ? PUBG_TIERS : TIERS;
}

export const POSITIONS = ["S", "R", "M", "SM", "RM"] as const;
export type Position = (typeof POSITIONS)[number];

export const POSITION_LABELS: Record<Position, string> = {
  S: "스나",
  R: "라이플",
  M: "멀티",
  SM: "스나/멀티",
  RM: "라이플/멀티",
};

export function getTierByScore(score: number, game: Game = "suddenattack"): TierInfo | undefined {
  const tiers = getTiersByGame(game);
  return tiers.find((t) => t.score === score);
}

export function getTierByLabel(label: string, game: Game = "suddenattack"): TierInfo | undefined {
  const tiers = getTiersByGame(game);
  return tiers.find((t) => t.label === label);
}

export function getTierDisplay(tierLabel: string, game: Game = "suddenattack"): string {
  const tiers = getTiersByGame(game);
  const tier = tiers.find((t) => t.label === tierLabel);
  return tier?.display ?? tierLabel;
}

export function getTierColor(tierLabel: string, game: Game = "suddenattack"): string {
  const tiers = getTiersByGame(game);
  const tier = tiers.find((t) => t.label === tierLabel);
  return tier?.color ?? "text-gray-400";
}
