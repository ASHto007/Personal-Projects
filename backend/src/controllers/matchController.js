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
    battingCard.push({ name: nonStriker, runs: 0, balls: 0, status: "batting" });
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
    battingCard,
    bowlingCard,
    partnership: {
      batters: [striker, nonStriker],
      runs: 0,
      balls: 0,
    },
    commentary: [],
    score: createEmptyScore(),
  };
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
  return match.innings.find((innings) => innings.number === match.currentInnings);
}

function getCurrentInningsIndex(match) {
  return match.innings.findIndex((innings) => innings.number === match.currentInnings);
}

function ensureBowlerEntry(innings, bowlerName) {
  const existingBowler = innings.bowlingCard.find((player) => player.name === bowlerName);

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
  const existingBatter = innings.battingCard.find((player) => player.name === batterName);

  if (existingBatter) {
    existingBatter.status = status;
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

function buildCommentaryText({ innings, type, runs, previousOvers }) {
  const striker = innings.players.striker || "Batter";
  const bowler = innings.players.currentBowler || "Bowler";
  const ballLabel = ["wide", "noBall"].includes(type)
    ? `${previousOvers}`
    : `${innings.score.overs}`;
  const eventLabel = formatBallEvent(type, runs);

  if (type === "wicket") {
    return `${ballLabel} ${bowler} to ${striker}, OUT`;
  }

  if (type === "wide") {
    return `${ballLabel} ${bowler} to ${striker}, wide${runs > 1 ? ` + ${runs - 1}` : ""}`;
  }

  if (type === "noBall") {
    return `${ballLabel} ${bowler} to ${striker}, no ball${runs > 1 ? ` + ${runs - 1}` : ""}`;
  }

  if (type === "bye") {
    return `${ballLabel} ${bowler} to ${striker}, ${runs} bye`;
  }

  if (type === "legBye") {
    return `${ballLabel} ${bowler} to ${striker}, ${runs} leg bye`;
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
  }
}

function getCurrentBowlerDetails(innings) {
  return (
    innings.bowlingCard.find((player) => player.name === innings.players.currentBowler) || null
  );
}

function resetPartnership(innings, batterOne = "", batterTwo = "") {
  innings.partnership = {
    batters: [batterOne, batterTwo],
    runs: 0,
    balls: 0,
  };
}

function archiveIfCompleted(previousMatch, updatedMatch) {
  if (previousMatch?.status !== "completed" && updatedMatch?.status === "completed") {
    upsertRecentMatch(sanitizeMatch(updatedMatch));
    syncCompletedMatchWithTournament(updatedMatch);
  }
}

function buildTeamScoreLine(match, teamName) {
  const innings = (match?.innings || []).find((item) => item.battingTeam === teamName);

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
    return tournament.fixtures.find((fixture) => fixture.id === explicitFixtureId) || null;
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
    return;
  }

  updateTournament(activeTournament.id, (tournament) => {
    const nextTournament = {
      ...tournament,
      fixtures: tournament.fixtures.map((fixture) => ({
        ...fixture,
        result: fixture.result ? { ...fixture.result } : null,
        matchRef: fixture.matchRef ? { ...fixture.matchRef } : null,
      })),
    };

    const fixture = nextTournament.fixtures.find((item) => item.id === linkedFixture.id);

    if (!fixture) {
      return tournament;
    }

    fixture.status = "completed";
    fixture.result = {
      type: match.result?.toLowerCase().includes("tied") ? "tie" : "winner",
      winner:
        match.innings?.[1]?.score?.runs >= (match.target || Number.MAX_SAFE_INTEGER)
          ? match.innings?.[1]?.battingTeam || null
          : match.innings?.[0]?.battingTeam || null,
      teamAScore: buildTeamScoreLine(match, fixture.teamA),
      teamBScore: buildTeamScoreLine(match, fixture.teamB),
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
  } = req.body;

  const validationMessage = validateBaseMatchPayload(req.body);

  if (validationMessage) {
    return res.status(400).json({ message: validationMessage });
  }

  const normalizedOvers = Number(overs);
  const battingFirstTeam = getBattingFirstTeam(teamOne, teamTwo, tossWinner, tossDecision);
  const bowlingFirstTeam = getBowlingFirstTeam(teamOne, teamTwo, battingFirstTeam);

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
    innings: [firstInnings, secondInnings],
    history: [],
  };

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
  }

  if (
    innings.players.striker &&
    innings.players.nonStriker &&
    innings.partnership.batters.includes("")
  ) {
    innings.partnership.batters = [innings.players.striker, innings.players.nonStriker];
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

  if (currentMatch.currentInnings !== 2 || currentMatch.status !== "innings-break") {
    return res.status(400).json({
      message: "Second innings cannot be started right now.",
    });
  }

  const { striker, nonStriker, bowler } = req.body;

  if (!striker || !nonStriker || !bowler) {
    return res.status(400).json({
      message: "striker, nonStriker, and bowler are required to start the second innings.",
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

  const { type, runs = 0 } = req.body;

  if (!["run", "wicket", "wide", "noBall", "bye", "legBye"].includes(type)) {
    return res.status(400).json({
      message: "type must be run, wicket, wide, noBall, bye, or legBye.",
    });
  }

  const normalizedRuns = Number(runs);

  if (
    type !== "wicket" &&
    (Number.isNaN(normalizedRuns) || normalizedRuns < 0 || normalizedRuns > 6)
  ) {
    return res.status(400).json({
      message: "runs must be a number between 0 and 6.",
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

  if (!innings.players.striker || !innings.players.nonStriker || !innings.players.currentBowler) {
    return res.status(400).json({
      message: "Set striker, nonStriker, and currentBowler before updating the score.",
    });
  }

  const score = innings.score;
  const previousOvers = score.overs;
  const striker = ensureBatterEntry(innings, innings.players.striker, "batting");
  ensureBatterEntry(innings, innings.players.nonStriker, "batting");
  const currentBowler = ensureBowlerEntry(innings, innings.players.currentBowler);

  let totalRunsAdded = 0;
  let legalDelivery = true;

  if (type === "run") {
    totalRunsAdded = normalizedRuns;
    score.runs += totalRunsAdded;
    striker.runs += totalRunsAdded;
    striker.balls += 1;
    currentBowler.runs += totalRunsAdded;
  }

  if (type === "wide") {
    legalDelivery = false;
    totalRunsAdded = normalizedRuns || 1;
    score.runs += totalRunsAdded;
    score.extras.wides += totalRunsAdded;
    currentBowler.runs += totalRunsAdded;
  }

  if (type === "noBall") {
    legalDelivery = false;
    totalRunsAdded = normalizedRuns || 1;
    score.runs += totalRunsAdded;
    score.extras.noBalls += totalRunsAdded;
    currentBowler.runs += totalRunsAdded;
  }

  if (type === "bye") {
    totalRunsAdded = normalizedRuns;
    score.runs += totalRunsAdded;
    score.extras.byes += totalRunsAdded;
    striker.balls += 1;
  }

  if (type === "legBye") {
    totalRunsAdded = normalizedRuns;
    score.runs += totalRunsAdded;
    score.extras.legByes += totalRunsAdded;
    striker.balls += 1;
  }

  if (type === "wicket") {
    score.wickets += 1;
    striker.balls += 1;
    striker.status = "out";
    currentBowler.wickets += 1;
  }

  innings.partnership.runs += totalRunsAdded;

  if (legalDelivery) {
    score.balls += 1;
    score.overs = updateOversFromBalls(score.balls);
    currentBowler.balls += 1;
    currentBowler.overs = updateOversFromBalls(currentBowler.balls);
    innings.partnership.balls += 1;
  }

  score.recentBalls.push(formatBallEvent(type, totalRunsAdded));
  score.recentBalls = score.recentBalls.slice(-6);
  innings.commentary.unshift({
    id: `comm_${Date.now()}_${innings.number}_${score.balls}_${innings.commentary.length + 1}`,
    inningsNumber: innings.number,
    over: ["wide", "noBall"].includes(type) ? previousOvers : score.overs,
    event: formatBallEvent(type, totalRunsAdded),
    batter: striker.name,
    bowler: currentBowler.name,
    runsAdded: totalRunsAdded,
    totalRuns: score.runs,
    wickets: score.wickets,
    text: buildCommentaryText({
      innings,
      type,
      runs: totalRunsAdded,
      previousOvers,
    }),
    timestamp: new Date().toISOString(),
  });
  innings.commentary = innings.commentary.slice(0, MAX_COMMENTARY_ENTRIES);

  if (
    ["run", "bye", "legBye"].includes(type) &&
    totalRunsAdded % 2 === 1
  ) {
    const activeStriker = innings.players.striker;
    innings.players.striker = innings.players.nonStriker;
    innings.players.nonStriker = activeStriker;
  }

  if (legalDelivery && score.balls % 6 === 0) {
    const activeStriker = innings.players.striker;
    innings.players.striker = innings.players.nonStriker;
    innings.players.nonStriker = activeStriker;
  }

  if (type === "wicket") {
    resetPartnership(innings, innings.players.nonStriker, "");
  }

  finalizeInningsIfNeeded(updatedMatch, innings);
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
  updateCurrentMatchPlayers,
  updateCurrentMatchScore,
  getTotalExtras,
};
