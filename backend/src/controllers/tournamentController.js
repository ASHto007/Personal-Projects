const {
  getActiveTournament,
  getTournamentById,
  getTournaments,
  setTournament,
  updateTournament,
} = require("../data/tournamentStore");
const {
  getCurrentMatch,
  getRecentMatches,
  setCurrentMatch,
  upsertRecentMatch,
} = require("../data/matchStore");
const {
  buildTournamentStats,
  buildViewerMatches,
  calculateGroupStandings,
  calculateOverallStandings,
  createGroups,
  createTournamentFixtures,
  slugify,
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
  const { name, format, overs, venue, startDate, endDate, logoUrl } = req.body;

  if (!name || !format || !overs) {
    return res.status(400).json({
      message: "name, format, and overs are required.",
    });
  }

  const existingActiveTournament = getActiveTournament();

  if (existingActiveTournament) {
    return res.status(400).json({
      message: "Only one active tournament is allowed at a time.",
    });
  }

  const normalizedOvers = Number(overs);

  if (Number.isNaN(normalizedOvers) || normalizedOvers <= 0) {
    return res.status(400).json({
      message: "overs must be a valid positive number.",
    });
  }

  const normalizedStartDate = startDate || new Date().toISOString().split("T")[0];
  const normalizedEndDate = endDate || "";
  const normalizedVenue = venue ? String(venue).trim() : "Venue TBA";

  const tournament = {
    id: `tournament_${Date.now()}`,
    name: String(name).trim(),
    format: String(format).trim(),
    overs: normalizedOvers,
    venue: normalizedVenue,
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
    logoUrl: logoUrl ? String(logoUrl).trim() : "",
    status: "active",
    tournamentType: "international",
    awards: {
      bestBowler: null,
      bestBatsman: null,
      bestFielder: null,
      manOfTheSeries: null,
    },
    groups: [],
    teams: [],
    fixtures: [],
    createdAt: new Date().toISOString(),
  };

  setTournament(tournament);

  return res.status(201).json({
    success: true,
    data: buildTournamentResponse(tournament),
  });
}

function addTournamentTeams(req, res) {
  const { tournamentId } = req.params;
  const { teams = [] } = req.body;
  const existingTournament = getTournamentById(tournamentId);

  if (!existingTournament) {
    return res.status(404).json({
      message: "Tournament not found.",
    });
  }

  if (!Array.isArray(teams) || !teams.length) {
    return res.status(400).json({
      message: "teams must be a non-empty array.",
    });
  }

  if (existingTournament.groups.length > 0 || existingTournament.fixtures.length > 0) {
    return res.status(400).json({
      message: "Add teams before creating groups or scheduling matches.",
    });
  }

  const updatedTournament = updateTournament(tournamentId, (tournament) => ({
    ...tournament,
    teams: sanitizeTeams([...tournament.teams, ...teams]),
  }));

  return res.status(200).json({
    success: true,
    data: buildTournamentResponse(updatedTournament),
  });
}

function createTournamentGroups(req, res) {
  const { tournamentId } = req.params;
  const { groupCount, groupNames = [] } = req.body;
  const existingTournament = getTournamentById(tournamentId);

  if (!existingTournament) {
    return res.status(404).json({
      message: "Tournament not found.",
    });
  }

  if (existingTournament.fixtures.length > 0) {
    return res.status(400).json({
      message: "Groups cannot be changed after match scheduling has started.",
    });
  }

  if (existingTournament.teams.length < 2) {
    return res.status(400).json({
      message: "Add at least two teams before creating groups.",
    });
  }

  const updatedTournament = updateTournament(tournamentId, (tournament) => ({
    ...tournament,
    groups: createGroups(tournament.teams, groupCount, groupNames),
  }));

  return res.status(200).json({
    success: true,
    data: buildTournamentResponse(updatedTournament),
  });
}

function updateTeamSquad(req, res) {
  const { tournamentId, teamId } = req.params;
  const { players = [] } = req.body;
  const existingTournament = getTournamentById(tournamentId);

  if (!existingTournament) {
    return res.status(404).json({
      message: "Tournament not found.",
    });
  }

  if (!existingTournament.groups.length) {
    return res.status(400).json({
      message: "Create groups before adding team players.",
    });
  }

  if (!Array.isArray(players) || !players.length) {
    return res.status(400).json({
      message: "players must be a non-empty array.",
    });
  }

  const normalizedPlayers = players
    .map((player, index) => {
      const rawName = typeof player === "string" ? player : player?.name;
      const name = String(rawName || "").trim();

      if (!name) {
        return null;
      }

      const role = typeof player === "string" ? "Player" : String(player?.role || "Player").trim();

      return {
        id: `${teamId}_player_${index + 1}_${slugify(name) || index + 1}`,
        name,
        role,
      };
    })
    .filter(Boolean);

  if (!normalizedPlayers.length) {
    return res.status(400).json({
      message: "At least one valid player is required.",
    });
  }

  const updatedTournament = updateTournament(tournamentId, (tournament) => {
    let teamFound = false;

    const nextTeams = tournament.teams.map((team) => {
      if (team.id !== teamId) {
        return team;
      }

      teamFound = true;
      return {
        ...team,
        squad: normalizedPlayers,
      };
    });

    if (!teamFound) {
      return tournament;
    }

    const nextGroups = tournament.groups.map((group) => ({
      ...group,
      teams: group.teams.map((team) =>
        team.id === teamId
          ? {
              ...team,
              squad: normalizedPlayers,
            }
          : team
      ),
    }));

    return {
      ...tournament,
      teams: nextTeams,
      groups: nextGroups,
    };
  });

  if (!updatedTournament || updatedTournament === existingTournament) {
    return res.status(404).json({
      message: "Team not found.",
    });
  }

  return res.status(200).json({
    success: true,
    data: buildTournamentResponse(updatedTournament),
  });
}

function startTournamentSchedule(req, res) {
  const { tournamentId } = req.params;
  const existingTournament = getTournamentById(tournamentId);

  if (!existingTournament) {
    return res.status(404).json({
      message: "Tournament not found.",
    });
  }

  if (!existingTournament.groups.length) {
    return res.status(400).json({
      message: "Create groups before scheduling matches.",
    });
  }

  const teamsWithFixtures = existingTournament.groups.reduce(
    (count, group) => count + (group.teams.length >= 2 ? group.teams.length : 0),
    0,
  );

  if (teamsWithFixtures < 2) {
    return res.status(400).json({
      message: "Add enough teams to generate the schedule.",
    });
  }

  if (existingTournament.fixtures.length > 0) {
    return res.status(400).json({
      message: "Match schedule has already been created.",
    });
  }

  const updatedTournament = updateTournament(tournamentId, (tournament) => ({
    ...tournament,
    fixtures: createTournamentFixtures(
      tournament.groups,
      tournament.venue,
      tournament.startDate,
      tournament.endDate,
    ),
  }));

  return res.status(200).json({
    success: true,
    data: buildTournamentResponse(updatedTournament),
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
    manOfTheMatch = "",
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
      manOfTheMatch: manOfTheMatch ? String(manOfTheMatch).trim() : null,
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

  const updatedFixture = updatedTournament.fixtures.find((fixture) => fixture.id === fixtureId) || null;
  const selectedManOfTheMatch = updatedFixture?.result?.manOfTheMatch || null;
  const currentMatch = getCurrentMatch();

  if (currentMatch?.tournamentContext?.fixtureId === fixtureId) {
    const nextCurrentMatch = {
      ...currentMatch,
      manOfTheMatch: selectedManOfTheMatch,
    };

    setCurrentMatch(nextCurrentMatch);
    upsertRecentMatch(nextCurrentMatch);
  }

  getRecentMatches()
    .filter((match) => match?.tournamentContext?.fixtureId === fixtureId)
    .forEach((match) => {
      upsertRecentMatch({
        ...match,
        manOfTheMatch: selectedManOfTheMatch,
      });
    });

  return res.status(200).json({
    success: true,
    data: buildTournamentResponse(updatedTournament),
  });
}

function updateTournamentAwards(req, res) {
  const { tournamentId } = req.params;
  const existingTournament = getTournamentById(tournamentId);

  if (!existingTournament) {
    return res.status(404).json({
      message: "Tournament not found.",
    });
  }

  if (existingTournament.status !== "completed") {
    return res.status(400).json({
      message: "Tournament awards can only be selected after the tournament is completed.",
    });
  }

  const updatedTournament = updateTournament(tournamentId, (tournament) => ({
    ...tournament,
    awards: {
      bestBowler: req.body.bestBowler ? String(req.body.bestBowler).trim() : null,
      bestBatsman: req.body.bestBatsman ? String(req.body.bestBatsman).trim() : null,
      bestFielder: req.body.bestFielder ? String(req.body.bestFielder).trim() : null,
      manOfTheSeries: req.body.manOfTheSeries ? String(req.body.manOfTheSeries).trim() : null,
    },
  }));

  return res.status(200).json({
    success: true,
    data: buildTournamentResponse(updatedTournament),
  });
}

module.exports = {
  addTournamentTeams,
  createTournament,
  createTournamentGroups,
  getTournamentDetails,
  listTournaments,
  startTournamentSchedule,
  updateTeamSquad,
  updateFixtureResult,
  updateTournamentAwards,
};
