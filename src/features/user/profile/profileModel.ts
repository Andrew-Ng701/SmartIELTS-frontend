export type UserGoalBands = {
  reading: string;
  listening: string;
  writing: string;
  speaking: string;
};

export const scoreToBandValue = (score: number | null | undefined, fallback: string) =>
  score === null || score === undefined ? fallback : String(score);

export const bandValueToNumber = (value: string) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && value.trim() ? numericValue : undefined;
};

