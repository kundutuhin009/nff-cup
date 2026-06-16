import type { GroupLabel } from "./types";

export interface FixturePairing {
  stage: "group";
  group_label: GroupLabel;
  home_team_id: string;
  away_team_id: string;
}

// Round-robin pairings for a group (4 teams -> 6 matches) using the
// circle method, so each "round" has non-overlapping fixtures.
export function roundRobinPairs(teamIds: string[]): [string, string][] {
  const ids = [...teamIds];
  if (ids.length < 2) return [];
  // For an odd count, add a bye placeholder.
  const hasBye = ids.length % 2 === 1;
  if (hasBye) ids.push("__BYE__");

  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const arr = [...ids];
  const pairs: [string, string][] = [];

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== "__BYE__" && b !== "__BYE__") {
        // Alternate home/away by round for fairness.
        if (r % 2 === 0) pairs.push([a, b]);
        else pairs.push([b, a]);
      }
    }
    // Rotate, keeping the first element fixed.
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop() as string);
    arr.splice(0, arr.length, fixed, ...rest);
  }

  return pairs;
}

// Build the 12 group fixtures (6 per group) given the two groups' team ids.
export function buildGroupFixtures(
  groupATeamIds: string[],
  groupBTeamIds: string[]
): FixturePairing[] {
  const a = roundRobinPairs(groupATeamIds).map(
    ([home, away]): FixturePairing => ({
      stage: "group",
      group_label: "A",
      home_team_id: home,
      away_team_id: away,
    })
  );
  const b = roundRobinPairs(groupBTeamIds).map(
    ([home, away]): FixturePairing => ({
      stage: "group",
      group_label: "B",
      home_team_id: home,
      away_team_id: away,
    })
  );
  return [...a, ...b];
}
