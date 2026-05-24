// Damerau-Levenshtein based fuzzy player matching for roster reconciliation.

export interface RosterPlayer {
  playerId: string;
  displayName: string;
  jerseyNumber?: string;
}

export interface MatchResult {
  playerId: string | null;
  score: number; // 0..1
  ambiguous: boolean;
  candidates: Array<{ playerId: string; score: number }>;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]!;
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j]!, dp[j - 1]!);
      prev = tmp;
    }
  }
  return dp[n]!;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function similarity(a: string, b: string): number {
  const A = normalize(a);
  const B = normalize(b);
  if (!A || !B) return 0;
  const d = levenshtein(A, B);
  return 1 - d / Math.max(A.length, B.length);
}

export function matchPlayer(input: string, roster: RosterPlayer[], jersey?: string): MatchResult {
  const scored = roster.map((p) => {
    let score = similarity(input, p.displayName);
    if (jersey && p.jerseyNumber && jersey === p.jerseyNumber) score = Math.min(1, score + 0.25);
    return { playerId: p.playerId, score: Number(score.toFixed(3)) };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  const second = scored[1];

  if (!top || top.score < 0.6) return { playerId: null, score: top?.score ?? 0, ambiguous: false, candidates: scored.slice(0, 3) };
  if (second && top.score - second.score < 0.1) {
    return { playerId: null, score: top.score, ambiguous: true, candidates: scored.slice(0, 3) };
  }
  return { playerId: top.playerId, score: top.score, ambiguous: false, candidates: scored.slice(0, 3) };
}
