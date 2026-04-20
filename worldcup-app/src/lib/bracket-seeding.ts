/**
 * Auto-seed R32 bracket from completed group stage results.
 *
 * Input: 12 group winners + 12 runners-up + 8 admin-selected 3rd-place advancers.
 * Output: 16 R32 matchups (teamA vs. teamB) in position order 1-16.
 *
 * Simple deterministic pairing rule (not FIFA-canonical — admin may override):
 *   1-6:  {A1 vs B2, C1 vs D2, E1 vs F2, G1 vs H2, I1 vs J2, K1 vs L2}
 *   7-12: {B1 vs A2, D1 vs C2, F1 vs E2, H1 vs G2, J1 vs I2, L1 vs K2}
 *   13-16: The 8 advancing 3rd-placers paired 1v8, 2v7, 3v6, 4v5 (by group order).
 *
 * Pure function — no database access, no side effects.
 */

export interface GroupSeedingInput {
  name: string;              // Group name (e.g. "A")
  first: string;             // Team that finished 1st
  second: string;            // Team that finished 2nd
  third: string;             // Team that finished 3rd
  thirdAdvances: boolean;    // Whether this group's 3rd-placer advances
}

export interface SeededMatch {
  position: number;
  teamA: string;
  teamB: string;
}

export class SeedingError extends Error {}

export function seedR32Matchups(groups: GroupSeedingInput[]): SeededMatch[] {
  if (groups.length !== 12) {
    throw new SeedingError(`Expected 12 groups, got ${groups.length}`);
  }

  // Group names must be unique and non-empty
  const names = new Set(groups.map((g) => g.name));
  if (names.size !== 12) {
    throw new SeedingError("Group names must be unique");
  }

  // Every group needs finalized 1st, 2nd, 3rd
  for (const g of groups) {
    if (!g.first || !g.second || !g.third) {
      throw new SeedingError(`Group ${g.name} is missing 1st/2nd/3rd placers`);
    }
  }

  // Exactly 8 groups must have thirdAdvances=true
  const advancingCount = groups.filter((g) => g.thirdAdvances).length;
  if (advancingCount !== 8) {
    throw new SeedingError(
      `Exactly 8 third-place advancers must be selected (got ${advancingCount})`
    );
  }

  // Sort groups alphabetically for deterministic pairing
  const sorted = [...groups].sort((a, b) => a.name.localeCompare(b.name));

  const matchups: SeededMatch[] = [];

  // Matches 1-6: groups paired (0,1), (2,3), (4,5), (6,7), (8,9), (10,11) — A1 vs B2 pattern
  for (let i = 0; i < 6; i++) {
    const g1 = sorted[i * 2];
    const g2 = sorted[i * 2 + 1];
    matchups.push({ position: i + 1, teamA: g1.first, teamB: g2.second });
  }

  // Matches 7-12: same group pairings reversed — B1 vs A2 pattern
  for (let i = 0; i < 6; i++) {
    const g1 = sorted[i * 2];
    const g2 = sorted[i * 2 + 1];
    matchups.push({ position: i + 7, teamA: g2.first, teamB: g1.second });
  }

  // Matches 13-16: 8 advancing 3rd-placers paired 1v8, 2v7, 3v6, 4v5
  const thirdPlacers = sorted.filter((g) => g.thirdAdvances).map((g) => g.third);
  if (thirdPlacers.length !== 8) {
    throw new SeedingError("Internal: expected 8 third-placers after filter");
  }

  for (let i = 0; i < 4; i++) {
    matchups.push({
      position: i + 13,
      teamA: thirdPlacers[i],
      teamB: thirdPlacers[7 - i],
    });
  }

  return matchups;
}
