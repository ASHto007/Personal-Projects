const {
  getActiveTournament,
  getTournamentById,
  getTournaments,
  setTournament,
  updateTournament,
} = require("../data/tournamentStore");
const {
  buildTournamentStats,
  buildViewerMatches,
  calculateGroupStandings,
  calculateOverallStandings,
  createGroups,
  createTournamentFixtures,
  sanitizeTeams,
} = require("../utils/tournamentUtils");

function buildTournamentResponse(tournament) {
  const groupStandings = calculateGroupStandings(tournament.groups, tournament.fixtures);
  const overallStandings = calculateOverallStandings(groupStandings);

  return {
    ...tournament,
    groupStandings,
    standings: overallStandings,
    stats: buildTournamentStats(tournament, groupStandings),
    matches: buildViewerMatches(tournament.fixtures),
    results: tournament.fixtures.filter((fixture) => fixture.status === "completed"),
    schedule: tournament.fixtures,
  };
}

function listTournaments(req, res) {
  const tournaments = getTournaments().map(buildTournamentResponse);

  return res.status(200).json({
    success: true,
    data: tournaments,
  });
}

function createTournament(req, res) {
  const { name, format, teams, venue, startDate, logoUrl, groupCount } = req.body;

  if (!name || !format || !Array.isArray(teams)) {
    return res.status(400).json({
      message: "name, format, and teams are required.",
    });
  }

  const existingActiveTournament = getActiveTournament();

  if (existingActiveTournament) {
    return res.status(400).json({
      message: "Only one active tournament is allowed at a time.",
    });
  }

  const sanitizedTeams = sanitizeTeams(teams);

  if (sanitizedTeams.length < 2) {
    return res.status(400).json({
      message: "At least two unique teams are required.",
    });
  }

  const groups = createGroups(sanitizedTeams, groupCount);
  const normalizedStartDate = startDate || new Date().toISOString().split("T")[0];
  const normalizedVenue = venue ? String(venue).trim() : "Venue TBA";

  const tournament = {
    id: `tournament_${Date.now()}`,
    name: String(name).trim(),
    format: String(format).trim(),
    venue: normalizedVenue,
    startDate: normalizedStartDate,
    logoUrl: logoUrl ? String(logoUrl).trim() : "",
    status: "active",
    tournamentType: "international",
    groups,
    teams: sanitizedTeams,
    fixtures: createTournamentFixtures(groups, normalizedVenue, normalizedStartDate),
    createdAt: new Date().toISOString(),
  };

  setTournament(tournament);

  return res.status(201).json({
    success: true,
    data: buildTournamentResponse(tournament),
  });
}

function getTournamentDetails(req, res) {
  const tournament = getTournamentById(req.params.tournamentId);

  if (!tournament) {
    return res.status(404).json({
      message: "Tournament not found.",
    });
  }

  return res.status(200).json({
    success: true,
    data: buildTournamentResponse(tournament),
  });
}

function updateFixtureResult(req, res) {
  const { tournamentId, fixtureId } = req.params;
  const {
    resultType,
    winner,
    teamAScore = "",
    teamBScore = "",
    summary = "",
    venue,
    date,
  } = req.body;

  if (!["winner", "tie", "no-result"].includes(resultType)) {
    return res.status(400).json({
      message: "resultType must be winner, tie, or no-result.",
    });
  }

  const existingTournament = getTournamentById(tournamentId);

  if (!existingTournament) {
    return res.status(404).json({
      message: "Tournament not found.",
    });
  }

  const updatedTournament = updateTournament(tournamentId, (tournament) => {
    const nextTournament = {
      ...tournament,
      fixtures: tournament.fixtures.map((fixture) => ({
        ...fixture,
        result: fixture.result ? { ...fixture.result } : null,
      })),
    };

    const fixture = nextTournament.fixtures.find((currentFixture) => currentFixture.id === fixtureId);

    if (!fixture) {
      return tournament;
    }

    if (resultType === "winner" && ![fixture.teamA, fixture.teamB].includes(winner)) {
      return tournament;
    }

    fixture.status = "completed";
    fixture.venue = venue || fixture.venue;
    fixture.date = date || fixture.date;
    fixture.result = {
      type: resultType,
      winner: resultType === "winner" ? winner : null,
      teamAScore,
      teamBScore,
      summary:
        summary ||
        (resultType === "winner"
          ? `${winner} beat ${winner === fixture.teamA ? fixture.teamB : fixture.teamA}`
          : resultType === "tie"
          ? "Match tied"
          : "No result"),
    };
    fixture.matchRef = {
      id: `match_${fixture.id}`,
      tournamentId: tournament.id,
      fixtureId: fixture.id,
      teams: `${fixture.teamA} vs ${fixture.teamB}`,
      venue: fixture.venue,
      date: fixture.date,
      result: fixture.result,
    };

    if (nextTournament.fixtures.every((item) => item.status === "completed")) {
      nextTournament.status = "completed";
    }

    return nextTournament;
  });

  const fixtureExists = existingTournament.fixtures.some((fixture) => fixture.id === fixtureId);

  if (!fixtureExists) {
    return res.status(404).json({
      message: "Fixture not found.",
    });
  }

  if (resultType === "winner" && updatedTournament === existingTournament) {
    return res.status(400).json({
      message: "winner must match one of the fixture teams.",
    });
  }

  return res.status(200).json({
    success: true,
    data: buildTournamentResponse(updatedTournament),
  });
}

module.exports = {
  createTournament,
  getTournamentDetails,
  listTournaments,
  updateFixtureResult,
};
