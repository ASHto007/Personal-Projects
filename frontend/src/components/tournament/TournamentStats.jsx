import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import TournamentEmptyState from "./TournamentEmptyState";

function createPlayerEntry(name, team) {
  return {
    id: `${team}::${name}`,
    name,
    team,
    innings: 0,
    runs: 0,
    balls: 0,
    dismissals: 0,
    highestScore: 0,
    strikeRate: 0,
    battingAverage: 0,
    fours: 0,
    sixes: 0,
    wickets: 0,
    bowlingRuns: 0,
    bowlingBalls: 0,
    economy: 0,
    bestBowling: "",
    catches: 0,
    stumpings: 0,
    runOuts: 0,
    fieldingDismissals: 0,
  };
}

function getPlayerMapKey(name, team) {
  return `${team}::${name}`;
}

function formatPlayerLabel(player) {
  return player ? `${player.name} (${player.team})` : "-";
}

function formatAverage(player) {
  return player ? player.battingAverage.toFixed(2) : "-";
}

function formatStrikeRate(player) {
  return player ? player.strikeRate.toFixed(2) : "-";
}

function formatBoundaryCount(player, type) {
  if (!player) {
    return "-";
  }

  return `${player[type]} (${player.name})`;
}

function formatBowlingValue(player) {
  if (!player) {
    return "-";
  }

  return `${player.wickets} wkts | ${player.economy.toFixed(2)} econ`;
}

function buildTournamentPlayerStats(tournament) {
  const playerMap = new Map();

  function getEntry(name, team) {
    const key = getPlayerMapKey(name, team);

    if (!playerMap.has(key)) {
      playerMap.set(key, createPlayerEntry(name, team));
    }

    return playerMap.get(key);
  }

  (tournament?.schedule || []).forEach((fixture) => {
    const matchData = fixture.matchRef?.matchData;

    if (!matchData?.innings?.length) {
      return;
    }

    matchData.innings.forEach((innings) => {
      const boundaryCounts = new Map();

      (innings.ballLog || []).forEach((ball) => {
        if (!ball?.batter || !innings.battingTeam) {
          return;
        }

        const boundaryEntry = boundaryCounts.get(ball.batter) || { fours: 0, sixes: 0 };

        if (ball.batRuns === 4) {
          boundaryEntry.fours += 1;
        }

        if (ball.batRuns === 6) {
          boundaryEntry.sixes += 1;
        }

        boundaryCounts.set(ball.batter, boundaryEntry);
      });

      innings.battingCard.forEach((player) => {
        const entry = getEntry(player.name, innings.battingTeam);
        const boundaryEntry = boundaryCounts.get(player.name) || { fours: 0, sixes: 0 };

        entry.innings += 1;
        entry.runs += player.runs || 0;
        entry.balls += player.balls || 0;
        entry.highestScore = Math.max(entry.highestScore, player.runs || 0);
        entry.fours += boundaryEntry.fours;
        entry.sixes += boundaryEntry.sixes;

        if (player.status === "out") {
          entry.dismissals += 1;
        }
      });

      innings.bowlingCard.forEach((player) => {
        const entry = getEntry(player.name, innings.bowlingTeam);
        const currentBest = entry.bestBowling
          ? entry.bestBowling.split("/").map((value) => Number(value))
          : [0, Number.MAX_SAFE_INTEGER];
        const nextBest = [player.wickets || 0, player.runs || 0];

        entry.wickets += player.wickets || 0;
        entry.bowlingRuns += player.runs || 0;
        entry.bowlingBalls += player.balls || 0;

        if (
          nextBest[0] > currentBest[0] ||
          (nextBest[0] === currentBest[0] && nextBest[1] < currentBest[1])
        ) {
          entry.bestBowling = `${nextBest[0]}/${nextBest[1]}`;
        }
      });

      (innings.wicketsLog || []).forEach((wicket) => {
        if (!wicket.fielder) {
          return;
        }

        const entry = getEntry(wicket.fielder, innings.bowlingTeam);
        entry.fieldingDismissals += 1;

        if (wicket.type === "caught") {
          entry.catches += 1;
        } else if (wicket.type === "stumped") {
          entry.stumpings += 1;
        } else if (wicket.type === "run_out" || wicket.type === "run_out_non_striker") {
          entry.runOuts += 1;
        }
      });
    });
  });

  return [...playerMap.values()]
    .map((player) => ({
      ...player,
      battingAverage:
        player.dismissals > 0 ? player.runs / player.dismissals : player.runs,
      strikeRate: player.balls > 0 ? (player.runs / player.balls) * 100 : 0,
      economy: player.bowlingBalls > 0 ? (player.bowlingRuns / player.bowlingBalls) * 6 : 0,
    }))
    .filter((player) => player.innings || player.wickets || player.fieldingDismissals);
}

function sortDescending(list, selector, secondarySelector = null) {
  return [...list].sort((left, right) => {
    const primaryDifference = selector(right) - selector(left);

    if (primaryDifference !== 0) {
      return primaryDifference;
    }

    if (secondarySelector) {
      const secondaryDifference = secondarySelector(right) - secondarySelector(left);

      if (secondaryDifference !== 0) {
        return secondaryDifference;
      }
    }

    return String(left.name || left.team || "").localeCompare(String(right.name || right.team || ""));
  });
}

function TournamentStats() {
  const {
    handleTournamentAwards,
    isAdmin,
    selectedTournament,
  } = useOutletContext();
  const [awardsForm, setAwardsForm] = useState({
    tournamentId: "",
    bestBowler: "",
    bestBatsman: "",
    bestFielder: "",
    manOfTheSeries: "",
  });

  const derivedStats = useMemo(() => {
    if (!selectedTournament) {
      return null;
    }

    const standings = selectedTournament.standings || [];
    const completedMatches = selectedTournament.results || [];
    const playerStats = buildTournamentPlayerStats(selectedTournament);
    const mostWins = sortDescending(standings, (team) => team.won)[0] || null;
    const bestPoints = sortDescending(standings, (team) => team.points, (team) => team.won)[0] || null;
    const activeGroup = selectedTournament.groupStandings?.find((group) =>
      group.standings.some((team) => team.played > 0),
    );
    const mostRuns = sortDescending(playerStats, (player) => player.runs, (player) => player.highestScore)[0] || null;
    const highestScore = sortDescending(playerStats, (player) => player.highestScore, (player) => player.runs)[0] || null;
    const bestBattingAverage =
      sortDescending(
        playerStats.filter((player) => player.innings > 0),
        (player) => player.battingAverage,
        (player) => player.runs,
      )[0] || null;
    const bestBattingStrikeRate =
      sortDescending(
        playerStats.filter((player) => player.balls > 0),
        (player) => player.strikeRate,
        (player) => player.runs,
      )[0] || null;
    const mostFours = sortDescending(playerStats, (player) => player.fours, (player) => player.runs)[0] || null;
    const mostSixes = sortDescending(playerStats, (player) => player.sixes, (player) => player.runs)[0] || null;
    const bestBowler =
      [...playerStats]
        .filter((player) => player.wickets > 0)
        .sort((left, right) => {
          if (right.wickets !== left.wickets) {
            return right.wickets - left.wickets;
          }

          if (left.economy !== right.economy) {
            return left.economy - right.economy;
          }

          return left.name.localeCompare(right.name);
        })[0] || null;
    const bestFielder =
      sortDescending(
        playerStats.filter((player) => player.fieldingDismissals > 0),
        (player) => player.fieldingDismissals,
        (player) => player.catches + player.runOuts + player.stumpings,
      )[0] || null;

    return {
      activeGroup: activeGroup?.groupName || "Group A",
      bestBattingAverage,
      bestBattingStrikeRate,
      bestBowler,
      bestFielder,
      bestPoints,
      completedMatches: completedMatches.length,
      highestScore,
      mostFours,
      mostRuns,
      mostSixes,
      mostWins,
      playerStats,
    };
  }, [selectedTournament]);

  if (!selectedTournament) {
    return <TournamentEmptyState isAdmin={isAdmin} />;
  }

  const resolvedAwardsForm =
    awardsForm.tournamentId === selectedTournament.id
      ? awardsForm
      : {
          tournamentId: selectedTournament.id,
          bestBowler: selectedTournament.awards?.bestBowler || "",
          bestBatsman: selectedTournament.awards?.bestBatsman || "",
          bestFielder: selectedTournament.awards?.bestFielder || "",
          manOfTheSeries: selectedTournament.awards?.manOfTheSeries || "",
        };

  async function handleAwardsSubmit(event) {
    event.preventDefault();
    await handleTournamentAwards(selectedTournament.id, resolvedAwardsForm);
  }

  return (
    <div className="match-center-stack">
      <section className="stats-grid">
        <section className="sidebar-card">
          <h3>Tournament Pulse</h3>
          <div className="progress-metrics">
            <div className="metric-pill">
              <span>Total Teams</span>
              <strong>{selectedTournament.stats.totalTeams}</strong>
            </div>
            <div className="metric-pill">
              <span>Groups</span>
              <strong>{selectedTournament.stats.groups}</strong>
            </div>
            <div className="metric-pill">
              <span>Matches Done</span>
              <strong>{derivedStats.completedMatches}</strong>
            </div>
            <div className="metric-pill highlight-pill">
              <span>Leading Team</span>
              <strong>{derivedStats.bestPoints?.team || "-"}</strong>
            </div>
          </div>
        </section>

        <section className="sidebar-card">
          <h3>Fast Facts</h3>
          <div className="table-list">
            <div className="table-row">
              <span>Most Wins</span>
              <span>{derivedStats.mostWins ? `${derivedStats.mostWins.team} (${derivedStats.mostWins.won})` : "-"}</span>
            </div>
            <div className="table-row">
              <span>Top Points</span>
              <span>{derivedStats.bestPoints ? `${derivedStats.bestPoints.team} (${derivedStats.bestPoints.points})` : "-"}</span>
            </div>
            <div className="table-row">
              <span>Most Active Group</span>
              <span>{derivedStats.activeGroup}</span>
            </div>
            <div className="table-row">
              <span>Official Status</span>
              <span>{selectedTournament.status}</span>
            </div>
          </div>
        </section>
      </section>

      <section className="stats-grid">
        <section className="sidebar-card">
          <h3>Batting Leaders</h3>
          <div className="table-list">
            <div className="table-row">
              <span>Most Runs</span>
              <span>{derivedStats.mostRuns ? `${formatPlayerLabel(derivedStats.mostRuns)} - ${derivedStats.mostRuns.runs}` : "-"}</span>
            </div>
            <div className="table-row">
              <span>Highest Score</span>
              <span>{derivedStats.highestScore ? `${formatPlayerLabel(derivedStats.highestScore)} - ${derivedStats.highestScore.highestScore}` : "-"}</span>
            </div>
            <div className="table-row">
              <span>Best Batting Average</span>
              <span>{derivedStats.bestBattingAverage ? `${formatPlayerLabel(derivedStats.bestBattingAverage)} - ${formatAverage(derivedStats.bestBattingAverage)}` : "-"}</span>
            </div>
            <div className="table-row">
              <span>Best Strike Rate</span>
              <span>{derivedStats.bestBattingStrikeRate ? `${formatPlayerLabel(derivedStats.bestBattingStrikeRate)} - ${formatStrikeRate(derivedStats.bestBattingStrikeRate)}` : "-"}</span>
            </div>
            <div className="table-row">
              <span>Most Fours</span>
              <span>{formatBoundaryCount(derivedStats.mostFours, "fours")}</span>
            </div>
            <div className="table-row">
              <span>Most Sixes</span>
              <span>{formatBoundaryCount(derivedStats.mostSixes, "sixes")}</span>
            </div>
          </div>
        </section>

        <section className="sidebar-card">
          <h3>Bowling & Fielding Leaders</h3>
          <div className="table-list">
            <div className="table-row">
              <span>Best Bowler</span>
              <span>{derivedStats.bestBowler ? `${formatPlayerLabel(derivedStats.bestBowler)} - ${formatBowlingValue(derivedStats.bestBowler)}` : "-"}</span>
            </div>
            <div className="table-row">
              <span>Best Bowling Spell</span>
              <span>{derivedStats.bestBowler ? `${formatPlayerLabel(derivedStats.bestBowler)} - ${derivedStats.bestBowler.bestBowling || "-"}` : "-"}</span>
            </div>
            <div className="table-row">
              <span>Best Fielder</span>
              <span>{derivedStats.bestFielder ? `${formatPlayerLabel(derivedStats.bestFielder)} - ${derivedStats.bestFielder.fieldingDismissals} dismissals` : "-"}</span>
            </div>
            <div className="table-row">
              <span>Catches</span>
              <span>{derivedStats.bestFielder ? derivedStats.bestFielder.catches : "-"}</span>
            </div>
            <div className="table-row">
              <span>Run Outs</span>
              <span>{derivedStats.bestFielder ? derivedStats.bestFielder.runOuts : "-"}</span>
            </div>
            <div className="table-row">
              <span>Stumpings</span>
              <span>{derivedStats.bestFielder ? derivedStats.bestFielder.stumpings : "-"}</span>
            </div>
          </div>
        </section>
      </section>

      <section className="sidebar-card">
        <h3>Overall Standings Snapshot</h3>
        <div className="points-table-wrap">
          <table className="points-table">
            <thead>
              <tr>
                <th>Pos</th>
                <th>Team</th>
                <th>Group</th>
                <th>P</th>
                <th>W</th>
                <th>L</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {selectedTournament.standings.map((team, index) => (
                <tr key={team.teamId}>
                  <td>{index + 1}</td>
                  <td>{team.team}</td>
                  <td>{team.groupName}</td>
                  <td>{team.played}</td>
                  <td>{team.won}</td>
                  <td>{team.lost}</td>
                  <td>{team.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="stats-grid">
        <section className="sidebar-card">
          <h3>Tournament Awards</h3>
          <div className="table-list">
            <div className="table-row">
              <span>Best Bowler</span>
              <span>{selectedTournament.awards?.bestBowler || "-"}</span>
            </div>
            <div className="table-row">
              <span>Best Batsman</span>
              <span>{selectedTournament.awards?.bestBatsman || "-"}</span>
            </div>
            <div className="table-row">
              <span>Best Fielder</span>
              <span>{selectedTournament.awards?.bestFielder || "-"}</span>
            </div>
            <div className="table-row">
              <span>Man Of The Series</span>
              <span>{selectedTournament.awards?.manOfTheSeries || "-"}</span>
            </div>
          </div>
        </section>

        {isAdmin && selectedTournament.status === "completed" ? (
          <form className="sidebar-card event-grid tournament-awards-form" onSubmit={handleAwardsSubmit}>
            <h3>Select Final Tournament Awards</h3>
            <label className="field-group">
              <span>Best Bowler</span>
              <select
                name="bestBowler"
                value={resolvedAwardsForm.bestBowler}
                onChange={(event) =>
                  setAwardsForm({
                    ...resolvedAwardsForm,
                    bestBowler: event.target.value,
                  })
                }
              >
                <option value="">Select player</option>
                {derivedStats.playerStats.map((player) => (
                  <option key={`bowler-${player.id}`} value={formatPlayerLabel(player)}>
                    {formatPlayerLabel(player)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-group">
              <span>Best Batsman</span>
              <select
                name="bestBatsman"
                value={resolvedAwardsForm.bestBatsman}
                onChange={(event) =>
                  setAwardsForm({
                    ...resolvedAwardsForm,
                    bestBatsman: event.target.value,
                  })
                }
              >
                <option value="">Select player</option>
                {derivedStats.playerStats.map((player) => (
                  <option key={`batsman-${player.id}`} value={formatPlayerLabel(player)}>
                    {formatPlayerLabel(player)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-group">
              <span>Best Fielder</span>
              <select
                name="bestFielder"
                value={resolvedAwardsForm.bestFielder}
                onChange={(event) =>
                  setAwardsForm({
                    ...resolvedAwardsForm,
                    bestFielder: event.target.value,
                  })
                }
              >
                <option value="">Select player</option>
                {derivedStats.playerStats.map((player) => (
                  <option key={`fielder-${player.id}`} value={formatPlayerLabel(player)}>
                    {formatPlayerLabel(player)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-group">
              <span>Man Of The Series</span>
              <select
                name="manOfTheSeries"
                value={resolvedAwardsForm.manOfTheSeries}
                onChange={(event) =>
                  setAwardsForm({
                    ...resolvedAwardsForm,
                    manOfTheSeries: event.target.value,
                  })
                }
              >
                <option value="">Select player</option>
                {derivedStats.playerStats.map((player) => (
                  <option key={`series-${player.id}`} value={formatPlayerLabel(player)}>
                    {formatPlayerLabel(player)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="primary-button">
              Save Tournament Awards
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}

export default TournamentStats;
