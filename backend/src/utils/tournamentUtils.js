const DEFAULT_SQUAD_SIZE = 15;
const POINTS = {
  win: 2,
  tie: 1,
  noResult: 1,
};

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildShortName(name) {
  const letters = String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return letters || "TM";
}

function createDefaultSquad(teamName) {
  return Array.from({ length: DEFAULT_SQUAD_SIZE }, (_, index) => ({
    id: `${slugify(teamName)}_player_${index + 1}`,
    name: `${teamName} Player ${index + 1}`,
    role: index < 6 ? "Batter" : index < 10 ? "Bowler" : index < 13 ? "All-Rounder" : "Wicketkeeper",
  }));
}

function normalizeTeamEntry(team) {
  if (typeof team === "string") {
    const trimmedName = team.trim();

    return {
      id: slugify(trimmedName),
      name: trimmedName,
      shortName: buildShortName(trimmedName),
      logoUrl: "",
      squad: createDefaultSquad(trimmedName),
    };
  }

  const name = String(team?.name || "").trim();

  return {
    id: slugify(name),
    name,
    shortName: team?.shortName?.trim() || buildShortName(name),
    logoUrl: team?.logoUrl?.trim() || "",
    squad:
      Array.isArray(team?.squad) && team.squad.length
        ? team.squad.map((player, index) => ({
            id: player?.id || `${slugify(name)}_player_${index + 1}`,
            name: String(player?.name || `${name} Player ${index + 1}`).trim(),
            role: String(player?.role || "Player").trim(),
          }))
        : createDefaultSquad(name),
  };
}

function sanitizeTeams(teams) {
  const normalizedTeams = teams
    .map(normalizeTeamEntry)
    .filter((team) => team.name)
    .filter((team, index, teamList) => teamList.findIndex((item) => item.name === team.name) === index);

  return normalizedTeams;
}

function getDefaultGroupCount(teamCount) {
  if (teamCount >= 8) {
    return 2;
  }

  return 1;
}

function createGroups(teams, requestedGroupCount) {
  const groupCount = Math.max(
    1,
    Math.min(Number(requestedGroupCount) || getDefaultGroupCount(teams.length), teams.length)
  );

  const groups = Array.from({ length: groupCount }, (_, index) => ({
    id: `group_${index + 1}`,
    name: `Group ${String.fromCharCode(65 + index)}`,
    teams: [],
  }));

  teams.forEach((team, index) => {
    groups[index % groupCount].teams.push(team);
  });

  return groups;
}

function createRoundRobinFixtures(teams, meta = {}) {
  const workingTeams = [...teams];
  const fixtures = [];

  if (workingTeams.length % 2 === 1) {
    workingTeams.push({ id: "__bye__", name: "__BYE__", shortName: "BYE" });
  }

  const rounds = workingTeams.length - 1;
  const matchesPerRound = workingTeams.length / 2;
  const rotatingTeams = [...workingTeams];

  for (let round = 0; round < rounds; round += 1) {
    for (let matchIndex = 0; matchIndex < matchesPerRound; matchIndex += 1) {
      const home = rotatingTeams[matchIndex];
      const away = rotatingTeams[rotatingTeams.length - 1 - matchIndex];

      if (home.name !== "__BYE__" && away.name !== "__BYE__") {
        fixtures.push({
          id: `fix_${meta.groupId || "main"}_${round + 1}_${matchIndex + 1}_${fixtures.length + 1}`,
          stage: meta.stage || "group",
          groupId: meta.groupId || null,
          groupName: meta.groupName || null,
          round: round + 1,
          matchNumber: fixtures.length + 1,
          teamA: home.name,
          teamB: away.name,
          teamAId: home.id,
          teamBId: away.id,
          venue: meta.venue || "Venue TBA",
          date: meta.startDate || new Date().toISOString().split("T")[0],
          status: "scheduled",
          result: null,
          matchRef: null,
        });
      }
    }

    const fixedTeam = rotatingTeams[0];
    const rotated = rotatingTeams.slice(1);
    rotated.unshift(rotated.pop());
    rotatingTeams.splice(0, rotatingTeams.length, fixedTeam, ...rotated);
  }

  return fixtures;
}

function addDays(dateString, daysToAdd) {
  const baseDate = new Date(dateString);
  baseDate.setDate(baseDate.getDate() + daysToAdd);

  return baseDate.toISOString().split("T")[0];
}

function createTournamentFixtures(groups, venue, startDate) {
  const fixtures = [];

  groups.forEach((group) => {
    const groupFixtures = createRoundRobinFixtures(group.teams, {
      groupId: group.id,
      groupName: group.name,
      venue,
      startDate,
    });

    groupFixtures.forEach((fixture) => {
      fixtures.push({
        ...fixture,
        matchNumber: fixtures.length + 1,
        date: addDays(startDate, fixtures.length),
      });
    });
  });

  return fixtures;
}

function createEmptyStanding(team) {
  return {
    team: team.name,
    teamId: team.id,
    shortName: team.shortName,
    played: 0,
    won: 0,
    lost: 0,
    tied: 0,
    noResult: 0,
    points: 0,
  };
}

function applyResultToStandings(teamAStanding, teamBStanding, result) {
  teamAStanding.played += 1;
  teamBStanding.played += 1;

  if (result.type === "winner") {
    const winnerStanding = result.winner === teamAStanding.team ? teamAStanding : teamBStanding;
    const loserStanding = winnerStanding === teamAStanding ? teamBStanding : teamAStanding;

    winnerStanding.won += 1;
    winnerStanding.points += POINTS.win;
    loserStanding.lost += 1;
    return;
  }

  if (result.type === "tie") {
    teamAStanding.tied += 1;
    teamBStanding.tied += 1;
    teamAStanding.points += POINTS.tie;
    teamBStanding.points += POINTS.tie;
    return;
  }

  if (result.type === "no-result") {
    teamAStanding.noResult += 1;
    teamBStanding.noResult += 1;
    teamAStanding.points += POINTS.noResult;
    teamBStanding.points += POINTS.noResult;
  }
}

function sortStandings(standings) {
  return standings.sort((left, right) => {
    if (right.points !== left.points) {
      return right.points - left.points;
    }

    if (right.won !== left.won) {
      return right.won - left.won;
    }

    return left.team.localeCompare(right.team);
  });
}

function calculateGroupStandings(groups, fixtures) {
  return groups.map((group) => {
    const standingsMap = new Map(group.teams.map((team) => [team.name, createEmptyStanding(team)]));
    const groupFixtures = fixtures.filter((fixture) => fixture.groupId === group.id);

    groupFixtures.forEach((fixture) => {
      if (fixture.status !== "completed" || !fixture.result) {
        return;
      }

      const teamAStanding = standingsMap.get(fixture.teamA);
      const teamBStanding = standingsMap.get(fixture.teamB);

      applyResultToStandings(teamAStanding, teamBStanding, fixture.result);
    });

    return {
      groupId: group.id,
      groupName: group.name,
      standings: sortStandings([...standingsMap.values()]),
    };
  });
}

function calculateOverallStandings(groupStandings) {
  return sortStandings(
    groupStandings.flatMap((group) =>
      group.standings.map((team) => ({
        ...team,
        groupName: group.groupName,
      }))
    )
  );
}

function buildMatchSummary(fixture) {
  if (!fixture.result) {
    return null;
  }

  if (fixture.result.type === "winner") {
    return fixture.result.summary || `${fixture.result.winner} won`;
  }

  if (fixture.result.type === "tie") {
    return fixture.result.summary || "Match tied";
  }

  return fixture.result.summary || "No result";
}

function buildViewerMatches(fixtures) {
  return fixtures.map((fixture) => ({
    id: fixture.id,
    stage: fixture.stage,
    groupName: fixture.groupName,
    matchNumber: fixture.matchNumber,
    teams: `${fixture.teamA} vs ${fixture.teamB}`,
    venue: fixture.venue,
    date: fixture.date,
    status: fixture.status,
    summary: buildMatchSummary(fixture),
    result: fixture.result,
  }));
}

function buildTournamentStats(tournament, groupStandings) {
  const totalMatches = tournament.fixtures.length;
  const completedMatches = tournament.fixtures.filter((fixture) => fixture.status === "completed").length;
  const upcomingMatches = totalMatches - completedMatches;
  const topTeam = calculateOverallStandings(groupStandings)[0] || null;

  return {
    totalMatches,
    completedMatches,
    upcomingMatches,
    totalTeams: tournament.teams.length,
    groups: tournament.groups.length,
    topTeam: topTeam ? topTeam.team : null,
  };
}

module.exports = {
  buildTournamentStats,
  buildViewerMatches,
  calculateGroupStandings,
  calculateOverallStandings,
  createGroups,
  createTournamentFixtures,
  sanitizeTeams,
};
