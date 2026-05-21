const {
  getCurrentMatch,
  getRecentMatches,
  setCurrentMatch,
  upsertRecentMatch,
} = require("../data/matchStore");
const {
  getActiveTournament,
  updateTournament,
} = require("../data/tournamentStore");
const { sanitizeMatch } = require("../utils/matchResponse");

const MAX_HISTORY_ENTRIES = 120;
const MAX_COMMENTARY_ENTRIES = 30;

function cloneMatch(match) {
  return JSON.parse(JSON.stringify(match));
}

function createHistorySnapshot(match) {
  const snapshot = cloneMatch(match);
  snapshot.history = [];
  return snapshot;
}

function updateOversFromBalls(balls) {
  return Number(`${Math.floor(balls / 6)}.${balls % 6}`);
}

function createEmptyScore() {
  return {
    runs: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    extras: {
      wides: 0,
      noBalls: 0,
      byes: 0,
      legByes: 0,
    },
    recentBalls: [],
  };
}

function createInnings({
  number,
  battingTeam,
  bowlingTeam,
  striker = "",
  nonStriker = "",
  bowler = "",
  status = "pending",
}) {
  const battingCard = [];
  const bowlingCard = [];

  if (striker) {
    battingCard.push({ name: striker, runs: 0, balls: 0, status: "batting" });
  }

  if (nonStriker) {
    battingCard.push({
      name: nonStriker,
      runs: 0,
      balls: 0,
      status: "batting",
    });
  }

  if (bowler) {
    bowlingCard.push({ name: bowler, balls: 0, overs: 0, runs: 0, wickets: 0 });
  }

  return {
    number,
    battingTeam,
    bowlingTeam,
    status,
    players: {
      striker,
      nonStriker,
      currentBowler: bowler,
    },
    requiresNewBowler: false,
    battingCard,
    bowlingCard,
    partnership: {
      batters: [striker, nonStriker],
      runs: 0,
      balls: 0,
    },
    isFreeHit: false,
    ballLog: [],
    wicketsLog: [],
    commentary: [],
    score: createEmptyScore(),
  };
}

function normalizeTeamPlayers(players) {
  if (!Array.isArray(players)) {
    return [];
  }

  return players
    .map((player) => (typeof player === "string" ? player.trim() : ""))
    .filter(Boolean);
}

function getTeamSquad(match, teamName) {
  if (!teamName || !match?.teamSquads) {
    return [];
  }

  return Array.isArray(match.teamSquads[teamName])
    ? match.teamSquads[teamName]
    : [];
}

function getNextBatterFromSquad(innings, squad = []) {
  const unavailableBatters = new Set(
    innings.battingCard
      .filter(
        (player) => player.status === "out" || player.status === "batting",
      )
      .map((player) => player.name),
  );

  return squad.find((player) => !unavailableBatters.has(player)) || "";
}

function getOtherTeam(teamOne, teamTwo, selectedTeam) {
  return selectedTeam === teamOne ? teamTwo : teamOne;
}

function getBattingFirstTeam(teamOne, teamTwo, tossWinner, tossDecision) {
  if (tossDecision === "bat") {
    return tossWinner;
  }

  return getOtherTeam(teamOne, teamTwo, tossWinner);
}

function getBowlingFirstTeam(teamOne, teamTwo, battingFirstTeam) {
  return getOtherTeam(teamOne, teamTwo, battingFirstTeam);
}

function getCurrentInnings(match) {
  return match.innings.find(
    (innings) => innings.number === match.currentInnings,
  );
}

function getCurrentInningsIndex(match) {
  return match.innings.findIndex(
    (innings) => innings.number === match.currentInnings,
  );
}

function ensureBowlerEntry(innings, bowlerName) {
  const existingBowler = innings.bowlingCard.find(
    (player) => player.name === bowlerName,
  );

  if (existingBowler) {
    return existingBowler;
  }

  const newBowler = {
    name: bowlerName,
    balls: 0,
    overs: 0,
    runs: 0,
    wickets: 0,
  };

  innings.bowlingCard.push(newBowler);
  return newBowler;
}

function ensureBatterEntry(innings, batterName, status = "batting") {
  const existingBatter = innings.battingCard.find(
    (player) => player.name === batterName,
  );

  if (existingBatter) {
    if (status === "batting" && existingBatter.status !== "out") {
      existingBatter.status = "batting";
    }

    return existingBatter;
  }

  const newBatter = {
    name: batterName,
    runs: 0,
    balls: 0,
    status,
  };

  innings.battingCard.push(newBatter);
  return newBatter;
}

const WICKET_TYPE_LABELS = {
  bowled: "Bowled",
  caught: "Caught",
  lbw: "LBW",
  run_out: "Run out",
  run_out_non_striker: "Run out",
  stumped: "Stumped",
  hit_wicket: "Hit wicket",
  obstructing_the_field: "Obstructing the field",
  hit_the_ball_twice: "Hit the ball twice",
  timed_out: "Timed out",
  retired_out: "Retired out",
  retired_hurt: "Retired hurt",
};

const BOWLER_CREDIT_WICKETS = new Set([
  "bowled",
  "caught",
  "lbw",
  "stumped",
  "hit_wicket",
]);

const ALLOWED_WICKET_TYPES = new Set(Object.keys(WICKET_TYPE_LABELS));

function formatBallEvent(type, runs) {
  if (type === "wicket") {
    return "W";
  }

  if (type === "wide") {
    return runs > 1 ? `${runs}Wd` : "Wd";
  }

  if (type === "noBall") {
    return runs > 1 ? `${runs}Nb` : "Nb";
  }

  if (type === "bye") {
    return `B${runs}`;
  }

  if (type === "legBye") {
    return `Lb${runs}`;
  }

  return String(runs);
}

function formatScoreEvent(type, runs, wicketDetail = null) {
  const baseEvent = formatBallEvent(type, runs);

  if (!wicketDetail) {
    return baseEvent;
  }

  return baseEvent === "W" ? "W" : `${baseEvent}+W`;
}

function normalizeNonNegativeNumber(value, fallback = 0) {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue) || numericValue < 0) {
    return fallback;
  }

  return numericValue;
}

function normalizeWicketType(wicketType, dismissedBatter) {
  if (!wicketType) {
    return "run_out";
  }

  const normalizedType = String(wicketType).trim().toLowerCase().replace(/\s+/g, "_");

  if (
    normalizedType === "run_out" &&
    dismissedBatter &&
    dismissedBatter === "non-striker"
  ) {
    return "run_out_non_striker";
  }

  return normalizedType;
}

function isWicketAllowedForDelivery({ wicketType, type, isFreeHit }) {
  if (!wicketType) {
    return false;
  }

  if (isFreeHit) {
    return ["run_out", "run_out_non_striker"].includes(wicketType);
  }

  if (type === "noBall") {
    return ["run_out", "run_out_non_striker"].includes(wicketType);
  }

  return true;
}

function getWicketOverLabel(score, previousOvers, legalDelivery) {
  return legalDelivery ? score.overs : previousOvers;
}

function buildWicketDescription({
  wicketType,
  batterName,
  bowlerName,
  fielder,
  description,
}) {
  if (description) {
    return description;
  }

  switch (wicketType) {
    case "bowled":
      return `${batterName} bowled by ${bowlerName}`;
    case "caught":
      return fielder
        ? `${batterName} caught by ${fielder}`
        : `${batterName} caught`;
    case "lbw":
      return `${batterName} lbw ${bowlerName}`;
    case "run_out":
    case "run_out_non_striker":
      return fielder
        ? `${batterName} run out by ${fielder}`
        : `${batterName} run out`;
    case "stumped":
      return fielder
        ? `${batterName} stumped by ${fielder}`
        : `${batterName} stumped`;
    case "hit_wicket":
      return `${batterName} hit wicket`;
    case "obstructing_the_field":
      return `${batterName} obstructing the field`;
    case "hit_the_ball_twice":
      return `${batterName} hit the ball twice`;
    case "timed_out":
      return `${batterName} timed out`;
    case "retired_out":
      return `${batterName} retired out`;
    case "retired_hurt":
      return `${batterName} retired hurt`;
    default:
      return `${batterName} out`;
  }
}

function buildCommentaryText({
  innings,
  type,
  runs,
  previousOvers,
  wicketDetail = null,
  isFreeHit = false,
  strikerName = "",
  bowlerName = "",
}) {
  const striker = strikerName || innings.players.striker || "Batter";
  const bowler = bowlerName || innings.players.currentBowler || "Bowler";
  const ballLabel = ["wide", "noBall"].includes(type)
    ? `${previousOvers}`
    : `${innings.score.overs}`;
  const eventLabel = formatBallEvent(type, runs);

  if (type === "wicket") {
    const wicketLabel =
      WICKET_TYPE_LABELS[wicketDetail?.type] || "Wicket";
    return `${ballLabel} ${bowler} to ${striker}, OUT! ${wicketLabel}${wicketDetail?.description ? ` - ${wicketDetail.description}` : ""}`;
  }

  if (type === "wide") {
    if (wicketDetail) {
      const wicketLabel =
        WICKET_TYPE_LABELS[wicketDetail.type] || "Wicket";
      return `${ballLabel} ${bowler} to ${striker}, wide${runs > 1 ? ` + ${runs - 1}` : ""}, ${wicketLabel.toUpperCase()}!`;
    }

    return `${ballLabel} ${bowler} to ${striker}, wide${runs > 1 ? ` + ${runs - 1}` : ""}`;
  }

  if (type === "noBall") {
    if (wicketDetail) {
      const wicketLabel =
        WICKET_TYPE_LABELS[wicketDetail.type] || "Wicket";
      return `${ballLabel} ${bowler} to ${striker}, no ball${runs > 1 ? ` + ${runs - 1}` : ""}, ${wicketLabel.toUpperCase()}!`;
    }

    return `${ballLabel} ${bowler} to ${striker}, no ball${runs > 1 ? ` + ${runs - 1}` : ""}${isFreeHit ? " and Free Hit coming up" : ""}`;
  }

  if (type === "bye") {
    return `${ballLabel} ${bowler} to ${striker}, ${runs} bye`;
  }

  if (type === "legBye") {
    return `${ballLabel} ${bowler} to ${striker}, ${runs} leg bye`;
  }

  if (wicketDetail) {
    const wicketLabel =
      WICKET_TYPE_LABELS[wicketDetail.type] || "Wicket";
    return `${ballLabel} ${bowler} to ${striker}, ${runs} run${runs === 1 ? "" : "s"} and OUT! ${wicketLabel} - ${wicketDetail.description}`;
  }

  if (runs === 0) {
    return `${ballLabel} ${bowler} to ${striker}, no run`;
  }

  if (runs === 4) {
    return `${ballLabel} ${bowler} to ${striker}, FOUR`;
  }

  if (runs === 6) {
    return `${ballLabel} ${bowler} to ${striker}, SIX`;
  }

  return `${ballLabel} ${bowler} to ${striker}, ${eventLabel} run${runs === 1 ? "" : "s"}`;
}

function getTotalExtras(score) {
  return (
    score.extras.wides +
    score.extras.noBalls +
    score.extras.byes +
    score.extras.legByes
  );
}

function buildResult(match) {
  const firstInnings = match.innings[0];
  const secondInnings = match.innings[1];

  if (!secondInnings || secondInnings.status !== "complete") {
    return null;
  }

  if (secondInnings.score.runs >= secondInnings.target) {
    const wicketsRemaining = 10 - secondInnings.score.wickets;
    return `${secondInnings.battingTeam} won by ${wicketsRemaining} wickets`;
  }

  const margin = firstInnings.score.runs - secondInnings.score.runs;
  return `${firstInnings.battingTeam} won by ${margin} runs`;
}

function getWinningTeam(match) {
  const firstInnings = match?.innings?.[0];
  const secondInnings = match?.innings?.[1];

  if (!firstInnings || !secondInnings || secondInnings.status !== "complete") {
    return null;
  }

  if (secondInnings.score.runs >= (secondInnings.target || Number.MAX_SAFE_INTEGER)) {
    return secondInnings.battingTeam;
  }

  if (firstInnings.score.runs > secondInnings.score.runs) {
    return firstInnings.battingTeam;
  }

  return null;
}

function getMatchImpactProfile(match) {
  const format = String(match?.format || "").trim().toUpperCase();
  const overs = Number(match?.overs || 0);

  if (overs > 0 && overs <= 6) {
    return {
      battingRunWeight: 1.55,
      battingShareWeight: 62,
      battingStrikeRateBaseline: 145,
      battingStrikeRateWeight: 0.14,
      battingFiftyBonus: 18,
      battingCenturyBonus: 34,
      battingThirtyBonus: 10,
      notOutBonus: 10,
      winningTeamBonus: 10,
      chaseShareWeight: 30,
      chaseNotOutBonus: 14,
      bowlingWicketWeight: 28,
      threeWicketBonus: 16,
      fourWicketBonus: 24,
      fiveWicketBonus: 32,
      economyTarget: 6.8,
      economyRewardWeight: 7.5,
      economyPenaltyStart: 9.2,
      economyPenaltyWeight: 4,
      fieldCatchBonus: 8,
      fieldStumpingBonus: 10,
      fieldRunOutBonus: 14,
      winnerPreferenceWindow: 1.18,
    };
  }

  if (overs > 6 && overs <= 10) {
    return {
      battingRunWeight: 1.45,
      battingShareWeight: 54,
      battingStrikeRateBaseline: 130,
      battingStrikeRateWeight: 0.11,
      battingFiftyBonus: 16,
      battingCenturyBonus: 32,
      battingThirtyBonus: 8,
      notOutBonus: 9,
      winningTeamBonus: 9,
      chaseShareWeight: 26,
      chaseNotOutBonus: 12,
      bowlingWicketWeight: 26,
      threeWicketBonus: 13,
      fourWicketBonus: 20,
      fiveWicketBonus: 28,
      economyTarget: 7.0,
      economyRewardWeight: 6.8,
      economyPenaltyStart: 8.8,
      economyPenaltyWeight: 3.5,
      fieldCatchBonus: 8,
      fieldStumpingBonus: 10,
      fieldRunOutBonus: 13,
      winnerPreferenceWindow: 1.16,
    };
  }

  if (format === "ODI") {
    return {
      battingRunWeight: 1.2,
      battingShareWeight: 52,
      battingStrikeRateBaseline: 90,
      battingStrikeRateWeight: 0.06,
      battingFiftyBonus: 12,
      battingCenturyBonus: 28,
      battingThirtyBonus: 4,
      notOutBonus: 7,
      winningTeamBonus: 7,
      chaseShareWeight: 18,
      chaseNotOutBonus: 8,
      bowlingWicketWeight: 25,
      threeWicketBonus: 9,
      fourWicketBonus: 16,
      fiveWicketBonus: 28,
      economyTarget: 5.4,
      economyRewardWeight: 4.5,
      economyPenaltyStart: 6.8,
      economyPenaltyWeight: 2.2,
      fieldCatchBonus: 8,
      fieldStumpingBonus: 10,
      fieldRunOutBonus: 12,
      winnerPreferenceWindow: 1.12,
    };
  }

  if (format === "TEST") {
    return {
      battingRunWeight: 1.05,
      battingShareWeight: 58,
      battingStrikeRateBaseline: 65,
      battingStrikeRateWeight: 0.02,
      battingFiftyBonus: 10,
      battingCenturyBonus: 32,
      battingThirtyBonus: 3,
      notOutBonus: 5,
      winningTeamBonus: 6,
      chaseShareWeight: 16,
      chaseNotOutBonus: 7,
      bowlingWicketWeight: 26,
      threeWicketBonus: 10,
      fourWicketBonus: 18,
      fiveWicketBonus: 30,
      economyTarget: 3.2,
      economyRewardWeight: 3,
      economyPenaltyStart: 4.2,
      economyPenaltyWeight: 1.5,
      fieldCatchBonus: 8,
      fieldStumpingBonus: 10,
      fieldRunOutBonus: 12,
      winnerPreferenceWindow: 1.1,
    };
  }

  return {
    battingRunWeight: 1.35,
    battingShareWeight: 45,
    battingStrikeRateBaseline: 100,
    battingStrikeRateWeight: 0.08,
    battingFiftyBonus: 14,
    battingCenturyBonus: 30,
    battingThirtyBonus: 5,
    notOutBonus: 8,
    winningTeamBonus: 8,
    chaseShareWeight: 22,
    chaseNotOutBonus: 10,
    bowlingWicketWeight: 24,
    threeWicketBonus: 10,
    fourWicketBonus: 16,
    fiveWicketBonus: 25,
    economyTarget: 7.2,
    economyRewardWeight: 6,
    economyPenaltyStart: 9,
    economyPenaltyWeight: 3,
    fieldCatchBonus: 8,
    fieldStumpingBonus: 10,
    fieldRunOutBonus: 12,
    winnerPreferenceWindow: 1.15,
  };
}

function createImpactEntry(name, team) {
  return {
    name,
    team,
    score: 0,
    battingRuns: 0,
    bowlingWickets: 0,
    fieldingCount: 0,
  };
}

function getImpactEntry(map, name, team) {
  const key = `${team}::${name}`;

  if (!map.has(key)) {
    map.set(key, createImpactEntry(name, team));
  }

  return map.get(key);
}

function calculateBattingImpact(player, innings, winnerTeam, isSuccessfulChase, profile) {
  const teamRuns = innings?.score?.runs || 0;
  const runs = player?.runs || 0;
  const balls = player?.balls || 0;
  const strikeRate = balls > 0 ? (runs / balls) * 100 : 0;
  const teamShare = teamRuns > 0 ? runs / teamRuns : 0;
  let impact = runs * profile.battingRunWeight;

  impact += teamShare * profile.battingShareWeight;
  impact += Math.max(0, strikeRate - profile.battingStrikeRateBaseline) * profile.battingStrikeRateWeight;

  if (runs >= 100) {
    impact += profile.battingCenturyBonus;
  } else if (runs >= 50) {
    impact += profile.battingFiftyBonus;
  } else if (runs >= 30) {
    impact += profile.battingThirtyBonus;
  }

  if (player?.status !== "out") {
    impact += profile.notOutBonus;
  }

  if (innings?.battingTeam === winnerTeam) {
    impact += profile.winningTeamBonus;
  }

  if (isSuccessfulChase && innings?.battingTeam === winnerTeam) {
    impact += teamShare * profile.chaseShareWeight;

    if (player?.status !== "out") {
      impact += profile.chaseNotOutBonus;
    }
  }

  return impact;
}

function calculateBowlingImpact(player, innings, winnerTeam, profile) {
  const wickets = player?.wickets || 0;
  const balls = player?.balls || 0;
  const runs = player?.runs || 0;
  const overs = balls / 6;
  const economy = overs > 0 ? runs / overs : 0;
  let impact = wickets * profile.bowlingWicketWeight;

  if (wickets >= 5) {
    impact += profile.fiveWicketBonus;
  } else if (wickets >= 4) {
    impact += profile.fourWicketBonus;
  } else if (wickets >= 3) {
    impact += profile.threeWicketBonus;
  }

  if (overs >= 2) {
    impact += Math.max(0, profile.economyTarget - economy) * profile.economyRewardWeight;
    impact -= Math.max(0, economy - profile.economyPenaltyStart) * profile.economyPenaltyWeight;
  }

  if (innings?.bowlingTeam === winnerTeam) {
    impact += profile.winningTeamBonus;
  }

  return impact;
}

function applyFieldingImpact(playerMap, innings, profile) {
  (innings?.wicketsLog || []).forEach((wicket) => {
    if (!wicket?.fielder || !innings?.bowlingTeam) {
      return;
    }

    const entry = getImpactEntry(playerMap, wicket.fielder, innings.bowlingTeam);
    entry.fieldingCount += 1;

    if (wicket.type === "run_out" || wicket.type === "run_out_non_striker") {
      entry.score += profile.fieldRunOutBonus;
      return;
    }

    if (wicket.type === "stumped") {
      entry.score += profile.fieldStumpingBonus;
      return;
    }

    entry.score += profile.fieldCatchBonus;
  });
}

function selectAutomaticManOfTheMatch(match) {
  const playerMap = new Map();
  const winnerTeam = getWinningTeam(match);
  const profile = getMatchImpactProfile(match);
  const secondInnings = match?.innings?.[1] || null;
  const isSuccessfulChase =
    Boolean(secondInnings?.target) &&
    secondInnings.score?.runs >= secondInnings.target;

  (match?.innings || []).forEach((innings) => {
    (innings?.battingCard || []).forEach((player) => {
      const entry = getImpactEntry(playerMap, player.name, innings.battingTeam);
      entry.battingRuns += player.runs || 0;
      entry.score += calculateBattingImpact(
        player,
        innings,
        winnerTeam,
        innings.number === 2 && isSuccessfulChase,
        profile,
      );
    });

    (innings?.bowlingCard || []).forEach((player) => {
      const entry = getImpactEntry(playerMap, player.name, innings.bowlingTeam);
      entry.bowlingWickets += player.wickets || 0;
      entry.score += calculateBowlingImpact(player, innings, winnerTeam, profile);
    });

    applyFieldingImpact(playerMap, innings, profile);
  });

  const rankedPlayers = [...playerMap.values()].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if (right.battingRuns !== left.battingRuns) {
      return right.battingRuns - left.battingRuns;
    }

    if (right.bowlingWickets !== left.bowlingWickets) {
      return right.bowlingWickets - left.bowlingWickets;
    }

    return left.name.localeCompare(right.name);
  });

  if (!rankedPlayers.length) {
    return null;
  }

  const bestOverall = rankedPlayers[0];
  const bestWinningPlayer = winnerTeam
    ? rankedPlayers.find((player) => player.team === winnerTeam) || null
    : null;

  const chosenPlayer =
    bestWinningPlayer &&
    bestOverall.team !== winnerTeam &&
    bestOverall.score <= bestWinningPlayer.score * profile.winnerPreferenceWindow
      ? bestWinningPlayer
      : bestOverall;

  return chosenPlayer ? `${chosenPlayer.name} (${chosenPlayer.team})` : null;
}

function finalizeInningsIfNeeded(match, innings) {
  const score = innings.score;

  if (innings.number === 1) {
    if (score.wickets >= 10 || score.balls >= match.overs * 6) {
      innings.status = "complete";
      match.status = "innings-break";
      match.currentInnings = 2;
      match.target = score.runs + 1;
      match.innings[1].target = match.target;
    }

    return;
  }

  if (
    score.runs >= innings.target ||
    score.wickets >= 10 ||
    score.balls >= match.overs * 6
  ) {
    innings.status = "complete";
    match.status = "completed";
    match.result = buildResult(match);
    if (!match.manOfTheMatch) {
      match.manOfTheMatch = selectAutomaticManOfTheMatch(match);
    }
  }
}

function getCurrentBowlerDetails(innings) {
  return (
    innings.bowlingCard.find(
      (player) => player.name === innings.players.currentBowler,
    ) || null
  );
}

function findBatterInCard(innings, batterName) {
  return innings.battingCard.find((player) => player.name === batterName) || null;
}

function swapStrike(innings) {
  const currentStriker = innings.players.striker;
  innings.players.striker = innings.players.nonStriker;
  innings.players.nonStriker = currentStriker;
}

function setPartnershipForCurrentBatters(innings) {
  resetPartnership(
    innings,
    innings.players.striker || "",
    innings.players.nonStriker || "",
  );
}

function resolveDismissedBatterName(innings, dismissedBatter) {
  if (!dismissedBatter || dismissedBatter === "striker") {
    return innings.players.striker;
  }

  if (dismissedBatter === "non-striker") {
    return innings.players.nonStriker;
  }

  return dismissedBatter;
}

function registerWicket({
  match,
  innings,
  score,
  currentBowler,
  type,
  previousOvers,
  totalRunsAdded,
  legalDelivery,
  wicketType,
  dismissedBatter,
  nextBatter,
  fielder,
  description,
}) {
  if (!isWicketAllowedForDelivery({ wicketType, type, isFreeHit: innings.isFreeHit })) {
    return null;
  }

  const dismissedBatterName = resolveDismissedBatterName(innings, dismissedBatter);
  const dismissedPlayer = findBatterInCard(innings, dismissedBatterName);

  if (!dismissedPlayer) {
    return null;
  }

  score.wickets += 1;
  dismissedPlayer.status = "out";
  dismissedPlayer.dismissal = {
    type: wicketType,
    bowler: currentBowler.name,
    fielder: fielder || null,
    over: getWicketOverLabel(score, previousOvers, legalDelivery),
    runs: totalRunsAdded,
    teamScore: `${score.runs}/${score.wickets}`,
    description: buildWicketDescription({
      wicketType,
      batterName: dismissedPlayer.name,
      bowlerName: currentBowler.name,
      fielder,
      description,
    }),
  };

  if (BOWLER_CREDIT_WICKETS.has(wicketType)) {
    currentBowler.wickets += 1;
  }

  const wicketDetail = {
    type: wicketType,
    batsman: dismissedPlayer.name,
    bowler: currentBowler.name,
    fielder: fielder || null,
    over: getWicketOverLabel(score, previousOvers, legalDelivery),
    runs: totalRunsAdded,
    teamScore: `${score.runs}/${score.wickets}`,
    description: dismissedPlayer.dismissal.description,
  };

  innings.wicketsLog.unshift(wicketDetail);

  if (score.wickets >= 10) {
    if (dismissedPlayer.name === innings.players.striker) {
      innings.players.striker = "";
    }

    if (dismissedPlayer.name === innings.players.nonStriker) {
      innings.players.nonStriker = "";
    }

    setPartnershipForCurrentBatters(innings);
    return wicketDetail;
  }

  const replacementBatter =
    nextBatter || getNextBatterFromSquad(innings, getTeamSquad(match, innings.battingTeam));

  if (dismissedPlayer.name === innings.players.striker) {
    innings.players.striker = replacementBatter || "";
  } else if (dismissedPlayer.name === innings.players.nonStriker) {
    innings.players.nonStriker = replacementBatter || "";
  }

  if (replacementBatter) {
    ensureBatterEntry(innings, replacementBatter, "batting");
  }

  setPartnershipForCurrentBatters(innings);
  return wicketDetail;
}

function resetPartnership(innings, batterOne = "", batterTwo = "") {
  innings.partnership = {
    batters: [batterOne, batterTwo],
    runs: 0,
    balls: 0,
  };
}

function archiveIfCompleted(previousMatch, updatedMatch) {
  if (
    previousMatch?.status !== "completed" &&
    updatedMatch?.status === "completed"
  ) {
    const syncedMatch = syncCompletedMatchWithTournament(updatedMatch) || updatedMatch;
    upsertRecentMatch(sanitizeMatch(syncedMatch));
  }
}

function buildTeamScoreLine(match, teamName) {
  const innings = (match?.innings || []).find(
    (item) => item.battingTeam === teamName,
  );

  if (!innings) {
    return "";
  }

  return `${innings.score.runs}/${innings.score.wickets} (${innings.score.overs})`;
}

function findLinkedFixture(tournament, match) {
  if (!tournament?.fixtures?.length || !match?.teamOne || !match?.teamTwo) {
    return null;
  }

  const explicitFixtureId = match?.tournamentContext?.fixtureId;

  if (explicitFixtureId) {
    return (
      tournament.fixtures.find((fixture) => fixture.id === explicitFixtureId) ||
      null
    );
  }

  const matchTeams = [match.teamOne, match.teamTwo].sort().join("|");

  const matchingFixtures = tournament.fixtures.filter((fixture) => {
    const fixtureTeams = [fixture.teamA, fixture.teamB].sort().join("|");
    return fixtureTeams === matchTeams;
  });

  return (
    matchingFixtures.find((fixture) => fixture.status !== "completed") ||
    matchingFixtures[matchingFixtures.length - 1] ||
    null
  );
}

function syncCompletedMatchWithTournament(match) {
  const activeTournament = getActiveTournament();

  if (!activeTournament) {
    return;
  }

  const linkedFixture = findLinkedFixture(activeTournament, match);

  if (!linkedFixture) {
    return match;
  }

  const selectedManOfTheMatch = linkedFixture.result?.manOfTheMatch || match.manOfTheMatch || null;

  updateTournament(activeTournament.id, (tournament) => {
    const nextTournament = {
      ...tournament,
      fixtures: tournament.fixtures.map((fixture) => ({
        ...fixture,
        result: fixture.result ? { ...fixture.result } : null,
        matchRef: fixture.matchRef ? { ...fixture.matchRef } : null,
      })),
    };

    const fixture = nextTournament.fixtures.find(
      (item) => item.id === linkedFixture.id,
    );

    if (!fixture) {
      return tournament;
    }

    fixture.status = "completed";
    fixture.result = {
      type: match.result?.toLowerCase().includes("tied") ? "tie" : "winner",
      winner:
        match.innings?.[1]?.score?.runs >=
        (match.target || Number.MAX_SAFE_INTEGER)
          ? match.innings?.[1]?.battingTeam || null
          : match.innings?.[0]?.battingTeam || null,
      teamAScore: buildTeamScoreLine(match, fixture.teamA),
      teamBScore: buildTeamScoreLine(match, fixture.teamB),
      manOfTheMatch: selectedManOfTheMatch,
      summary: match.result || fixture.result?.summary || "Match completed",
    };
    fixture.matchRef = {
      id: match.id,
      tournamentId: tournament.id,
      fixtureId: fixture.id,
      teams: `${fixture.teamA} vs ${fixture.teamB}`,
      venue: fixture.venue,
      date: fixture.date,
      result: fixture.result,
      matchData: sanitizeMatch(match),
    };

    if (nextTournament.fixtures.every((item) => item.status === "completed")) {
      nextTournament.status = "completed";
    }

    return nextTournament;
  });

  return {
    ...match,
    manOfTheMatch: selectedManOfTheMatch,
  };
}

function validateBaseMatchPayload({
  teamOne,
  teamTwo,
  format,
  overs,
  tossWinner,
  tossDecision,
  striker,
  nonStriker,
  bowler,
}) {
  if (
    !teamOne ||
    !teamTwo ||
    !format ||
    !overs ||
    !tossWinner ||
    !tossDecision ||
    !striker ||
    !nonStriker ||
    !bowler
  ) {
    return "teamOne, teamTwo, format, overs, tossWinner, tossDecision, striker, nonStriker, and bowler are required.";
  }

  const normalizedOvers = Number(overs);

  if (Number.isNaN(normalizedOvers) || normalizedOvers <= 0) {
    return "overs must be a valid positive number.";
  }

  if (![teamOne, teamTwo].includes(tossWinner)) {
    return "tossWinner must match either teamOne or teamTwo.";
  }

  if (!["bat", "bowl"].includes(tossDecision)) {
    return "tossDecision must be either bat or bowl.";
  }

  return null;
}

function createMatch(req, res) {
  const {
    teamOne,
    teamTwo,
    format,
    overs,
    tossWinner,
    tossDecision,
    striker,
    nonStriker,
    bowler,
    teamSquads = {},
    tournamentContext = null,
  } = req.body;

  const existingMatch = getCurrentMatch();

  if (
    existingMatch &&
    ["live", "innings-break"].includes(existingMatch.status)
  ) {
    return res.status(400).json({
      message: "A live match is already in progress.",
    });
  }

  const validationMessage = validateBaseMatchPayload(req.body);

  if (validationMessage) {
    return res.status(400).json({ message: validationMessage });
  }

  const normalizedOvers = Number(overs);
  const battingFirstTeam = getBattingFirstTeam(
    teamOne,
    teamTwo,
    tossWinner,
    tossDecision,
  );
  const bowlingFirstTeam = getBowlingFirstTeam(
    teamOne,
    teamTwo,
    battingFirstTeam,
  );

  const firstInnings = createInnings({
    number: 1,
    battingTeam: battingFirstTeam,
    bowlingTeam: bowlingFirstTeam,
    striker,
    nonStriker,
    bowler,
    status: "live",
  });

  const secondInnings = createInnings({
    number: 2,
    battingTeam: bowlingFirstTeam,
    bowlingTeam: battingFirstTeam,
  });

  const match = {
    id: Date.now().toString(),
    teamOne,
    teamTwo,
    format,
    overs: normalizedOvers,
    tossWinner,
    tossDecision,
    status: "live",
    currentInnings: 1,
    target: null,
    result: null,
    teamSquads,
    tournamentContext,
    innings: [firstInnings, secondInnings],
    history: [],
  };

  if (tournamentContext?.tournamentId && tournamentContext?.fixtureId) {
    updateTournament(tournamentContext.tournamentId, (tournament) => {
      if (!tournament) {
        return tournament;
      }

      return {
        ...tournament,
        fixtures: tournament.fixtures.map((fixture) =>
          fixture.id === tournamentContext.fixtureId
            ? {
                ...fixture,
                status: "live",
                matchRef: {
                  ...(fixture.matchRef || {}),
                  id: match.id,
                  tournamentId: tournamentContext.tournamentId,
                  fixtureId: tournamentContext.fixtureId,
                  teams: `${teamOne} vs ${teamTwo}`,
                  venue: fixture.venue,
                  date: fixture.date,
                  result: fixture.result,
                  matchData: sanitizeMatch(match),
                },
              }
            : fixture
        ),
      };
    });
  }

  setCurrentMatch(match);

  return res.status(201).json({
    success: true,
    data: sanitizeMatch(match),
  });
}

function getCurrentMatchDetails(req, res) {
  const match = getCurrentMatch();

  if (!match) {
    return res.status(404).json({
      message: "No match has been created yet.",
    });
  }

  return res.status(200).json({
    success: true,
    data: sanitizeMatch(match),
  });
}

function getRecentMatchResults(req, res) {
  return res.status(200).json({
    success: true,
    data: getRecentMatches().map(sanitizeMatch),
  });
}

function updateCurrentMatchPlayers(req, res) {
  const currentMatch = getCurrentMatch();

  if (!currentMatch) {
    return res.status(404).json({
      message: "No match has been created yet.",
    });
  }

  const { striker, nonStriker, currentBowler } = req.body;
  const updatedMatch = cloneMatch(currentMatch);
  const innings = getCurrentInnings(updatedMatch);

  if (!innings || innings.status === "complete") {
    return res.status(400).json({
      message: "No active innings available to update players.",
    });
  }

  const nextStriker = striker || innings.players.striker;
  const nextNonStriker = nonStriker || innings.players.nonStriker;

  if (nextStriker && nextNonStriker && nextStriker === nextNonStriker) {
    return res.status(400).json({
      message: "striker and nonStriker must be different players.",
    });
  }

  if (striker) {
    innings.players.striker = striker;
    ensureBatterEntry(innings, striker, "batting");
  }

  if (nonStriker) {
    innings.players.nonStriker = nonStriker;
    ensureBatterEntry(innings, nonStriker, "batting");
  }

  if (currentBowler) {
    innings.players.currentBowler = currentBowler;
    ensureBowlerEntry(innings, currentBowler);
    innings.requiresNewBowler = false;
  }

  if (
    innings.players.striker &&
    innings.players.nonStriker &&
    innings.partnership.batters.includes("")
  ) {
    innings.partnership.batters = [
      innings.players.striker,
      innings.players.nonStriker,
    ];
  }

  setCurrentMatch(updatedMatch);

  return res.status(200).json({
    success: true,
    data: sanitizeMatch(updatedMatch),
  });
}

function startSecondInnings(req, res) {
  const currentMatch = getCurrentMatch();

  if (!currentMatch) {
    return res.status(404).json({
      message: "No match has been created yet.",
    });
  }

  if (
    currentMatch.currentInnings !== 2 ||
    currentMatch.status !== "innings-break"
  ) {
    return res.status(400).json({
      message: "Second innings cannot be started right now.",
    });
  }

  const { striker, nonStriker, bowler } = req.body;

  if (!striker || !nonStriker || !bowler) {
    return res.status(400).json({
      message:
        "striker, nonStriker, and bowler are required to start the second innings.",
    });
  }

  if (striker === nonStriker) {
    return res.status(400).json({
      message: "striker and nonStriker must be different players.",
    });
  }

  const updatedMatch = cloneMatch(currentMatch);
  const innings = getCurrentInnings(updatedMatch);

  innings.status = "live";
  innings.players.striker = striker;
  innings.players.nonStriker = nonStriker;
  innings.players.currentBowler = bowler;
  innings.requiresNewBowler = false;
  innings.battingCard = [
    { name: striker, runs: 0, balls: 0, status: "batting" },
    { name: nonStriker, runs: 0, balls: 0, status: "batting" },
  ];
  innings.bowlingCard = [
    { name: bowler, balls: 0, overs: 0, runs: 0, wickets: 0 },
  ];
  resetPartnership(innings, striker, nonStriker);
  updatedMatch.status = "live";

  setCurrentMatch(updatedMatch);

  return res.status(200).json({
    success: true,
    data: sanitizeMatch(updatedMatch),
  });
}

function completeCurrentInnings(req, res) {
  const currentMatch = getCurrentMatch();

  if (!currentMatch) {
    return res.status(404).json({
      message: "No match has been created yet.",
    });
  }

  const updatedMatch = cloneMatch(currentMatch);
  const innings = getCurrentInnings(updatedMatch);

  if (!innings || innings.status === "complete") {
    return res.status(400).json({
      message: "No active innings available to complete.",
    });
  }

  innings.status = "complete";

  if (innings.number === 1) {
    updatedMatch.status = "innings-break";
    updatedMatch.currentInnings = 2;
    updatedMatch.target = innings.score.runs + 1;
    updatedMatch.innings[1].target = updatedMatch.target;
  } else {
    updatedMatch.status = "completed";
    updatedMatch.result = buildResult(updatedMatch);
  }

  archiveIfCompleted(currentMatch, updatedMatch);
  setCurrentMatch(updatedMatch);

  return res.status(200).json({
    success: true,
    data: sanitizeMatch(updatedMatch),
  });
}

function updateCurrentMatchAward(req, res) {
  const currentMatch = getCurrentMatch();

  if (!currentMatch) {
    return res.status(404).json({
      message: "No match has been created yet.",
    });
  }

  if (currentMatch.status !== "completed") {
    return res.status(400).json({
      message: "Man of the match can only be selected after the match is completed.",
    });
  }

  const updatedMatch = cloneMatch(currentMatch);
  updatedMatch.manOfTheMatch = req.body.manOfTheMatch
    ? String(req.body.manOfTheMatch).trim()
    : null;

  if (updatedMatch.tournamentContext?.fixtureId) {
    const activeTournament = getActiveTournament();

    if (activeTournament?.id === updatedMatch.tournamentContext.tournamentId) {
      updateTournament(activeTournament.id, (tournament) => ({
        ...tournament,
        fixtures: tournament.fixtures.map((fixture) => {
          if (fixture.id !== updatedMatch.tournamentContext.fixtureId) {
            return fixture;
          }

          const nextResult = fixture.result
            ? {
                ...fixture.result,
                manOfTheMatch: updatedMatch.manOfTheMatch,
              }
            : fixture.result;

          return {
            ...fixture,
            result: nextResult,
            matchRef: fixture.matchRef
              ? {
                  ...fixture.matchRef,
                  result: nextResult,
                  matchData: sanitizeMatch(updatedMatch),
                }
              : fixture.matchRef,
          };
        }),
      }));
    }
  }

  setCurrentMatch(updatedMatch);
  upsertRecentMatch(sanitizeMatch(updatedMatch));

  return res.status(200).json({
    success: true,
    data: sanitizeMatch(updatedMatch),
  });
}

function updateCurrentMatchScore(req, res) {
  const currentMatch = getCurrentMatch();

  if (!currentMatch) {
    return res.status(404).json({
      message: "No match has been created yet.",
    });
  }

  if (currentMatch.status === "completed") {
    return res.status(400).json({
      message: "The match is already completed.",
    });
  }

  const {
    type,
    extra = null,
    runs = 0,
    batRuns: inputBatRuns = null,
    extraRuns: inputExtraRuns = null,
    wicket = false,
    wicketType,
    dismissedBatter = "striker",
    nextBatter = "",
    fielder = "",
    description = "",
  } = req.body;

  const normalizedRuns = Number(runs);
  const normalizedBatRuns =
    inputBatRuns === null ? null : normalizeNonNegativeNumber(inputBatRuns, 0);
  const normalizedExtraRuns =
    inputExtraRuns === null ? null : normalizeNonNegativeNumber(inputExtraRuns, 0);
  const normalizedExtra = extra ? String(extra).trim().toUpperCase() : "";
  const resolvedType =
    type ||
    (normalizedExtra === "NB"
      ? "noBall"
      : normalizedExtra === "WD"
        ? "wide"
        : wicket
          ? normalizedRuns > 0
            ? "run"
            : "wicket"
          : "run");

  if (!["run", "wicket", "wide", "noBall", "bye", "legBye"].includes(resolvedType)) {
    return res.status(400).json({
      message: "type must be run, wicket, wide, noBall, bye, or legBye.",
    });
  }

  if (Number.isNaN(normalizedRuns) || normalizedRuns < 0 || normalizedRuns > 6) {
    return res.status(400).json({
      message: "runs must be a number between 0 and 6.",
    });
  }

  if (
    normalizedBatRuns !== null &&
    (Number.isNaN(normalizedBatRuns) || normalizedBatRuns < 0 || normalizedBatRuns > 6)
  ) {
    return res.status(400).json({
      message: "batRuns must be a number between 0 and 6.",
    });
  }

  if (
    normalizedExtraRuns !== null &&
    (Number.isNaN(normalizedExtraRuns) || normalizedExtraRuns < 0 || normalizedExtraRuns > 6)
  ) {
    return res.status(400).json({
      message: "extraRuns must be a number between 0 and 6.",
    });
  }

  const normalizedWicketType = wicketType
    ? normalizeWicketType(wicketType, dismissedBatter)
    : null;
  const isWicketEvent = type === "wicket" || wicket === true || Boolean(normalizedWicketType);

  if (normalizedWicketType && !ALLOWED_WICKET_TYPES.has(normalizedWicketType)) {
    return res.status(400).json({
      message: "Unsupported wicketType supplied.",
    });
  }

  if (resolvedType === "wicket" && !normalizedWicketType) {
    return res.status(400).json({
      message: "wicketType is required when type is wicket.",
    });
  }

  if (
    isWicketEvent &&
    normalizedRuns > 0 &&
    resolvedType === "run" &&
    !["run_out", "run_out_non_striker"].includes(normalizedWicketType || "")
  ) {
    return res.status(400).json({
      message: "Runs with wicket are only supported for run-out dismissals.",
    });
  }

  const updatedMatch = cloneMatch(currentMatch);
  updatedMatch.history.push(createHistorySnapshot(currentMatch));
  updatedMatch.history = updatedMatch.history.slice(-MAX_HISTORY_ENTRIES);

  const innings = getCurrentInnings(updatedMatch);

  if (!innings || innings.status !== "live") {
    return res.status(400).json({
      message: "No active live innings available for scoring.",
    });
  }

  if (innings.requiresNewBowler) {
    return res.status(400).json({
      message: "Select the next bowler before scoring the new over.",
    });
  }

  if (
    !innings.players.striker ||
    !innings.players.nonStriker ||
    !innings.players.currentBowler
  ) {
    return res.status(400).json({
      message:
        "Set striker, nonStriker, and currentBowler before updating the score.",
    });
  }

  const score = innings.score;
  const previousOvers = score.overs;
  const wasFreeHit = innings.isFreeHit === true;
  const deliveryStrikerName = innings.players.striker;
  const deliveryBowlerName = innings.players.currentBowler;
  const striker = ensureBatterEntry(
    innings,
    innings.players.striker,
    "batting",
  );
  ensureBatterEntry(innings, innings.players.nonStriker, "batting");
  const currentBowler = ensureBowlerEntry(
    innings,
    innings.players.currentBowler,
  );

  let totalRunsAdded = 0;
  let legalDelivery = true;
  let batRuns = 0;
  let wicketDetail = null;
  let runningRunsForStrike = 0;

  if (resolvedType === "run") {
    totalRunsAdded = normalizedRuns;
    batRuns = normalizedRuns;
    runningRunsForStrike = normalizedRuns;
    score.runs += totalRunsAdded;
    striker.runs += batRuns;
    striker.balls += 1;
    currentBowler.runs += totalRunsAdded;
  }

  if (resolvedType === "wide") {
    legalDelivery = false;
    const additionalWideRuns =
      normalizedExtraRuns !== null ? normalizedExtraRuns : normalizedRuns;
    runningRunsForStrike = additionalWideRuns;
    totalRunsAdded = 1 + additionalWideRuns;
    score.runs += totalRunsAdded;
    score.extras.wides += totalRunsAdded;
    currentBowler.runs += totalRunsAdded;
  }

  if (resolvedType === "noBall") {
    legalDelivery = false;
    const scoredBatRuns =
      normalizedBatRuns !== null
        ? normalizedBatRuns
        : normalizedExtraRuns !== null
          ? normalizedRuns
          : normalizedRuns;
    const scoredExtraRuns = normalizedExtraRuns !== null ? normalizedExtraRuns : 0;
    batRuns = scoredBatRuns;
    runningRunsForStrike = scoredBatRuns + scoredExtraRuns;
    totalRunsAdded = 1 + batRuns + scoredExtraRuns;
    score.runs += totalRunsAdded;
    score.extras.noBalls += 1 + scoredExtraRuns;
    striker.runs += batRuns;
    currentBowler.runs += totalRunsAdded;
  }

  if (resolvedType === "bye") {
    totalRunsAdded = normalizedRuns;
    runningRunsForStrike = normalizedRuns;
    score.runs += totalRunsAdded;
    score.extras.byes += totalRunsAdded;
    striker.balls += 1;
  }

  if (resolvedType === "legBye") {
    totalRunsAdded = normalizedRuns;
    runningRunsForStrike = normalizedRuns;
    score.runs += totalRunsAdded;
    score.extras.legByes += totalRunsAdded;
    striker.balls += 1;
  }

  if (resolvedType === "wicket") {
    totalRunsAdded = 0;
    runningRunsForStrike = 0;
    striker.balls += 1;
  }

  innings.partnership.runs += totalRunsAdded;

  if (legalDelivery) {
    score.balls += 1;
    score.overs = updateOversFromBalls(score.balls);
    currentBowler.balls += 1;
    currentBowler.overs = updateOversFromBalls(currentBowler.balls);
    innings.partnership.balls += 1;
  }

  if (isWicketEvent && normalizedWicketType) {
    wicketDetail = registerWicket({
      match: updatedMatch,
      innings,
      score,
      currentBowler,
      type: resolvedType,
      previousOvers,
      totalRunsAdded,
      legalDelivery,
      wicketType: normalizedWicketType,
      dismissedBatter,
      nextBatter,
      fielder,
      description,
    });
  }

  const effectiveType =
    wicketDetail ? resolvedType : resolvedType === "wicket" ? "run" : resolvedType;
  const scoreEvent = formatScoreEvent(
    effectiveType,
    totalRunsAdded,
    wicketDetail,
  );
  score.recentBalls.push(scoreEvent);
  score.recentBalls = score.recentBalls.slice(-6);
  innings.ballLog.unshift({
    id: `ball_${Date.now()}_${innings.number}_${score.balls}_${innings.ballLog.length + 1}`,
    over: ["wide", "noBall"].includes(resolvedType) ? previousOvers : score.overs,
    type: resolvedType,
    runs: totalRunsAdded,
    batRuns,
    legalDelivery,
    isFreeHit: wasFreeHit,
    wicket: Boolean(wicketDetail),
    wicketDetail,
    batter: deliveryStrikerName,
    bowler: deliveryBowlerName,
    timestamp: new Date().toISOString(),
  });
  innings.ballLog = innings.ballLog.slice(0, MAX_HISTORY_ENTRIES);
  innings.commentary.unshift({
    id: `comm_${Date.now()}_${innings.number}_${score.balls}_${innings.commentary.length + 1}`,
    inningsNumber: innings.number,
    over: ["wide", "noBall"].includes(resolvedType) ? previousOvers : score.overs,
    event: scoreEvent,
    batter: deliveryStrikerName,
    bowler: deliveryBowlerName,
    runsAdded: totalRunsAdded,
    totalRuns: score.runs,
    wickets: score.wickets,
    text: buildCommentaryText({
      innings,
      type: effectiveType,
      runs: totalRunsAdded,
      previousOvers,
      wicketDetail,
      isFreeHit: resolvedType === "noBall" || (wasFreeHit && !legalDelivery),
      strikerName: deliveryStrikerName,
      bowlerName: deliveryBowlerName,
    }),
    timestamp: new Date().toISOString(),
  });
  innings.commentary = innings.commentary.slice(0, MAX_COMMENTARY_ENTRIES);

  if (runningRunsForStrike % 2 === 1) {
    swapStrike(innings);
  }

  if (legalDelivery && score.balls % 6 === 0) {
    swapStrike(innings);
  }

  if (resolvedType === "noBall") {
    innings.isFreeHit = true;
  } else if (legalDelivery) {
    innings.isFreeHit = false;
  }

  if (wicketDetail && score.wickets < 10) {
    setPartnershipForCurrentBatters(innings);
  }

  finalizeInningsIfNeeded(updatedMatch, innings);
  const overCompleted = legalDelivery && score.balls % 6 === 0;

  if (overCompleted && innings.status === "live") {
    innings.players.currentBowler = "";
    innings.requiresNewBowler = true;
  }

  if (updatedMatch.status === "completed") {
    updatedMatch.result = buildResult(updatedMatch);
  }

  archiveIfCompleted(currentMatch, updatedMatch);
  setCurrentMatch(updatedMatch);

  return res.status(200).json({
    success: true,
    data: sanitizeMatch(updatedMatch),
  });
}

function undoLastBall(req, res) {
  const currentMatch = getCurrentMatch();

  if (!currentMatch) {
    return res.status(404).json({
      message: "No match has been created yet.",
    });
  }

  if (!currentMatch.history || currentMatch.history.length === 0) {
    return res.status(400).json({
      message: "No previous ball event available to undo.",
    });
  }

  const previousMatch = currentMatch.history[currentMatch.history.length - 1];
  const restoredMatch = {
    ...cloneMatch(previousMatch),
    history: currentMatch.history.slice(0, -1),
  };

  setCurrentMatch(restoredMatch);

  return res.status(200).json({
    success: true,
    data: sanitizeMatch(restoredMatch),
  });
}

module.exports = {
  completeCurrentInnings,
  createMatch,
  getCurrentMatchDetails,
  getCurrentBowlerDetails,
  getRecentMatchResults,
  startSecondInnings,
  undoLastBall,
  updateCurrentMatchAward,
  updateCurrentMatchPlayers,
  updateCurrentMatchScore,
  getTotalExtras,
};
