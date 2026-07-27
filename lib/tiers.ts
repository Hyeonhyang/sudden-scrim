export type TierInfo = {
  label: string;
  score: number;
  display: string;
};

export const TIERS: TierInfo[] = [
  { label: "별5", score: 22, display: "⭐⭐⭐⭐⭐" },
  { label: "별4", score: 21, display: "⭐⭐⭐⭐" },
  { label: "별3", score: 20, display: "⭐⭐⭐" },
  { label: "별2", score: 19, display: "⭐⭐" },
  { label: "별1", score: 18, display: "⭐" },
  { label: "1티어", score: 17, display: "1티어" },
  { label: "1.25티어", score: 16, display: "1.25티어" },
  { label: "1.5티어", score: 15, display: "1.5티어" },
  { label: "1.75티어", score: 14, display: "1.75티어" },
  { label: "2티어", score: 13, display: "2티어" },
  { label: "2.25티어", score: 12, display: "2.25티어" },
  { label: "2.5티어", score: 11, display: "2.5티어" },
  { label: "2.75티어", score: 10, display: "2.75티어" },
  { label: "3티어", score: 9, display: "3티어" },
  { label: "3.25티어", score: 8, display: "3.25티어" },
  { label: "3.5티어", score: 7, display: "3.5티어" },
  { label: "3.75티어", score: 6, display: "3.75티어" },
  { label: "4티어", score: 5, display: "4티어" },
  { label: "4.25티어", score: 4, display: "4.25티어" },
  { label: "4.5티어", score: 3, display: "4.5티어" },
  { label: "4.75티어", score: 2, display: "4.75티어" },
  { label: "5티어", score: 1, display: "5티어" },
];

export const POSITIONS = ["S", "R", "M", "SM", "RM"] as const;
export type Position = (typeof POSITIONS)[number];

export const POSITION_LABELS: Record<Position, string> = {
  S: "스나",
  R: "라이플",
  M: "멀티",
  SM: "스나/멀티",
  RM: "라이플/멀티",
};

export function getTierByScore(score: number): TierInfo | undefined {
  return TIERS.find((t) => t.score === score);
}

export function getTierByLabel(label: string): TierInfo | undefined {
  return TIERS.find((t) => t.label === label);
}

export function getTierDisplay(tierLabel: string): string {
  const tier = TIERS.find((t) => t.label === tierLabel);
  return tier?.display ?? tierLabel;
}
