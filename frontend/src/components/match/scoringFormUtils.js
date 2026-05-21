export const WICKET_TYPE_OPTIONS = [
  { value: "bowled", label: "Bowled" },
  { value: "caught", label: "Caught" },
  { value: "lbw", label: "LBW" },
  { value: "run_out", label: "Run Out" },
  { value: "stumped", label: "Stumped" },
  { value: "hit_wicket", label: "Hit Wicket" },
  { value: "obstructing_the_field", label: "Obstructing The Field" },
  { value: "hit_the_ball_twice", label: "Hit The Ball Twice" },
  { value: "timed_out", label: "Timed Out" },
  { value: "retired_out", label: "Retired Out" },
  { value: "retired_hurt", label: "Retired Hurt" },
];

export function createDefaultEventForm() {
  return {
    type: "run",
    runs: 1,
    wicketType: "bowled",
    dismissedBatter: "striker",
    nextBatter: "",
    fielder: "",
    description: "",
  };
}

export function normalizeSquadOptions(teamSquads, battingTeam) {
  const squad = teamSquads?.[battingTeam];

  if (!Array.isArray(squad)) {
    return [];
  }

  return squad
    .map((player) => {
      if (typeof player === "string") {
        return player.trim();
      }

      return String(player?.name || "").trim();
    })
    .filter(Boolean);
}

export function buildUniquePlayerOptions(...groups) {
  return [...new Set(groups.flat().filter(Boolean))];
}

export function buildScorePayload(eventForm) {
  const payload = {
    type:
      eventForm.type === "wicket" && Number(eventForm.runs) > 0
        ? "run"
        : eventForm.type,
    runs: Number(eventForm.runs) || 0,
  };

  if (eventForm.type === "wicket") {
    payload.wicket = true;
    payload.wicketType = eventForm.wicketType;
    payload.dismissedBatter = eventForm.dismissedBatter;
    payload.nextBatter = eventForm.nextBatter.trim();
    payload.fielder = eventForm.fielder.trim();
    payload.description = eventForm.description.trim();
  }

  return payload;
}
