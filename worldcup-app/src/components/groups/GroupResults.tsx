interface GroupResultsProps {
  groupName: string;
  teams: { teamName: string; finalPosition: number }[];
  pick?: { firstPlace: string; secondPlace: string } | null;
  pointsGroupAdvance: number;
  pointsGroupExact: number;
}

export function GroupResults({ groupName, teams, pick, pointsGroupAdvance, pointsGroupExact }: GroupResultsProps) {
  const sorted = [...teams].sort((a, b) => a.finalPosition - b.finalPosition);
  const advancers = sorted.filter((t) => t.finalPosition <= 2).map((t) => t.teamName);

  let score = 0;
  if (pick) {
    if (advancers.includes(pick.firstPlace)) {
      score += pointsGroupAdvance;
      if (sorted[0]?.teamName === pick.firstPlace) score += pointsGroupExact;
    }
    if (advancers.includes(pick.secondPlace)) {
      score += pointsGroupAdvance;
      if (sorted[1]?.teamName === pick.secondPlace) score += pointsGroupExact;
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Group {groupName}</h3>
        <span className="text-sm font-semibold text-slate-700">{score} pts</span>
      </div>
      <div className="space-y-1">
        {sorted.map((team) => {
          const isPicked1st = pick?.firstPlace === team.teamName;
          const isPicked2nd = pick?.secondPlace === team.teamName;
          const advanced = team.finalPosition <= 2;
          const exactCorrect =
            (isPicked1st && team.finalPosition === 1) ||
            (isPicked2nd && team.finalPosition === 2);

          let bgColor = "";
          if (isPicked1st || isPicked2nd) {
            if (exactCorrect) bgColor = "bg-emerald-100 text-emerald-800";
            else if (advanced) bgColor = "bg-blue-50 text-blue-800";
            else bgColor = "bg-red-50 text-red-800 line-through";
          }

          return (
            <div
              key={team.teamName}
              className={`flex items-center justify-between rounded px-3 py-1.5 text-sm ${bgColor}`}
            >
              <span>
                {team.finalPosition}. {team.teamName}
              </span>
              {isPicked1st && <span className="text-xs font-bold">Picked 1st</span>}
              {isPicked2nd && <span className="text-xs font-bold">Picked 2nd</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
