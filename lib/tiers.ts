export type TierInfo = {
  label: string;
  score: number;
};

export const TIERS: TierInfo[] = [
  { label: "별5", score: 22 },
  { label: "별4", score: 21 },
  { label: "별3", score: 20 },
  { label: "별2", score: 19 },
  { label: "별1", score: 18 },
  { label: "1티어", score: 17 },
  { label: "1.25티어", score: 16 },
  { label: "1.5티어", score: 15 },
  { label: "1.75티어", score: 14 },
  { label: "2티어", score: 13 },
  { label: "2.25티어", score: 12 },
  { label: "2.5티어", score: 11 },
  { label: "2.75티어", score: 10 },
  { label: "3티어", score: 9 },
  { label: "3.25티어", score: 8 },
  { label: "3.5티어", score: 7 },
  { label: "3.75티어", score: 6 },
  { label: "4티어", score: 5 },
  { label: "4.25티어", score: 4 },
  { label: "4.5티어", score: 3 },
  { label: "4.75티어", score: 2 },
  { label: "5티어", score: 1 },
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
