import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import TournamentEmptyState from "./TournamentEmptyState";

function TournamentStats() {
  const { isAdmin, selectedTournament } = useOutletContext();

  const derivedStats = useMemo(() => {
    if (!selectedTournament) {
      return null;
    }

    const standings = selectedTournament.standings || [];
    const completedMatches = selectedTournament.results || [];
    const mostWins = [...standings].sort((left, right) => right.won - left.won)[0] || null;
    const bestPoints = [...standings].sort((left, right) => right.points - left.points)[0] || null;
    const activeGroup = selectedTournament.groupStandings?.find((group) =>
      group.standings.some((team) => team.played > 0)
    );

    return {
      bestPoints,
      completedMatches: completedMatches.length,
      mostWins,
      activeGroup: activeGroup?.groupName || "Group A",
    };
  }, [selectedTournament]);

  if (!selectedTournament) {
    return <TournamentEmptyState isAdmin={isAdmin} />;
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
    </div>
  );
}

export default TournamentStats;
